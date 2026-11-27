/** UI + wallet regression check. npm install --no-save playwright, then node tools/test-koi.mjs.
 * Uses a temporary ledger; deterministic visual fixtures never enter the live server.
 */
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { loadGames } from '../server/games/index.js';
import { Drbg } from '../server/rng.js';
import { sha256 } from '../server/util.js';

const root = path.resolve(import.meta.dirname, '..');
const gameId = process.argv[2] || 'koi-dorado';
const neon = gameId === 'frutas-neon';
const dragon = gameId === 'dragon-jade';
const pharaoh = gameId === 'faraon-dorado';
const catrina = gameId === 'noche-catrinas';
const ocean = gameId === 'oceano-perlas';
const samurai = gameId === 'samurai-viento';
const jaguar = gameId === 'templo-jaguar';
const sweet = gameId === 'fiesta-dulce';
const panda = gameId === 'panda-zen';
const clients = {
  'koi-dorado': { prefix: 'koi', cells: 15 },
  'frutas-neon': { prefix: 'neon', cells: 12 },
  'dragon-jade': { prefix: 'dragon', cells: 20, active: '.dragon-rung.on' },
  'faraon-dorado': { prefix: 'pharaoh', cells: 30 },
  'noche-catrinas': { prefix: 'catrina', cells: 24, active: '.catrina-candle.on strong' },
  'oceano-perlas': { prefix: 'ocean', cells: 25, active: '.ocean-pearl.on strong' },
  'samurai-viento': { prefix: 'samurai', cells: 15, active: '.samurai-stroke.on strong' },
  'templo-jaguar': { prefix: 'jaguar', cells: 30, active: '.jaguar-stair.on strong' },
  'fiesta-dulce': { prefix: 'sweet', cells: 30 },
  'panda-zen': { prefix: 'panda', cells: 15 },
};
const client = clients[gameId];
assert(client);
const ways = dragon || catrina || ocean || samurai || jaguar;
const cascading = ways || pharaoh || sweet;
const cellCount = client.cells;
const reelSelector = `.${client.prefix}-reel-window`;
const activeRungSelector = client.active;
const temp = await mkdtemp(path.join(tmpdir(), 'vlt-koi-'));
const origin = 'http://127.0.0.1:4318';
const server = spawn(process.execPath, ['server/index.js'], { cwd: root, env: { ...process.env, PORT: '4318', DATA_DIR: temp }, stdio: 'ignore', windowsHide: true });
let browser;
const errors = [];
const output = path.join(root, 'output', `${client.prefix}-qa`);
await mkdir(output, { recursive: true });
try {
  for (let n = 0; n < 80; n++) {
    try { if ((await fetch(`${origin}/api/site`)).ok) break; } catch {}
    if (server.exitCode !== null) throw Error('Test server could not start');
    await delay(100);
  }
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && /\/assets\/(koi|neon|dragon|pharaoh|catrina|ocean|samurai|jaguar|sweet|panda)\//.test(r.url())) errors.push(`Asset ${r.status()}: ${r.url()}`); });
  await page.goto(`${origin}/play/${gameId}`);
  await page.getByRole('button', { name: 'Jugar demo', exact: true }).click();
  await page.waitForSelector('#overlay[hidden]', { state: 'attached' });
  await page.waitForFunction(() => document.querySelector('#balVal').textContent === '2000,00' || /2\D000,00/.test(document.querySelector('#balVal').textContent));
  await page.locator('.toast').waitFor({ state: 'detached' });
  if (ocean) assert.deepEqual(await page.locator('.ocean-pearl strong').allTextContents(), ['×1', '×1', '×2', '×3', '×5', '×8']);
  if (samurai) assert.deepEqual(await page.locator('.samurai-stroke strong').allTextContents(), ['×1', '×2', '×3']);
  if (jaguar) assert.deepEqual(await page.locator('.jaguar-stair strong').allTextContents(), Array.from({ length: 10 }, (_, i) => `×${i + 1}`));
  await page.screenshot({ path: path.join(output, 'desktop.png') });

  const sizes = [[390, 844], [320, 568], [768, 1024], [844, 390], [1366, 768]];
  if (gameId === 'koi-dorado') sizes.push([1024, 768], [1920, 927]);
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await delay(200);
    const geometry = await page.evaluate(() => {
      const rect = id => { const r = document.querySelector(id).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; };
      return { board: rect('#board'), wrap: rect('#boardWrap'), spin: rect('#spinBtn'), machine: rect('#machine'), scroll: document.documentElement.scrollWidth, width: innerWidth };
    });
    assert(geometry.scroll <= width, `Horizontal overflow at ${width}`);
    assert(geometry.board.width > 100, `Board too small at ${width}`);
    assert(geometry.board.right <= geometry.wrap.right + 1, `Board clipped at ${width}`);
    assert(geometry.board.bottom <= geometry.wrap.bottom + 1, `Board height clipped at ${width}`);
    assert(geometry.spin.bottom <= geometry.machine.bottom, `Spin clipped at ${width}`);
    if (height >= 540) assert(geometry.machine.bottom <= height + 1, `Machine clipped at ${width}`);
    if (gameId === 'koi-dorado') {
      const { board, spin } = geometry;
      const minBoardWidth = width >= 1024 ? Math.min(width * 0.8, 1600) : width * (width <= 420 ? 0.84 : 0.55);
      const minHeightShare = width >= 1000 ? 0.53 : 0.38;
      assert(Math.abs(board.x + board.width / 2 - width / 2) < 2, `Koi reels must stay centered at ${width}×${height}`);
      assert(board.width >= minBoardWidth && board.height >= height * minHeightShare, `Koi reels (${board.width}×${board.height}) must dominate the layout at ${width}×${height}`);
      assert(spin.y > board.bottom && spin.bottom <= height, `Koi controls must fit below the reels at ${width}×${height}`);
      const controlsFit = await page.locator('#turboBtn').evaluate(button => {
        const auto = button.previousElementSibling;
        const row = button.parentElement;
        return auto.id === 'autoBtn' && auto.offsetTop === button.offsetTop && row.scrollWidth <= row.clientWidth;
      });
      assert(controlsFit, `Turbo must fit alongside Auto at ${width}×${height}`);
    }
    if (jaguar) {
      const stairs = await page.locator('.jaguar-stair').evaluateAll(nodes => nodes.map(n => ({ height: n.getBoundingClientRect().height, bottom: n.getBoundingClientRect().bottom })));
      for (let i = 1; i < stairs.length; i++) assert(stairs[i].height > stairs[i - 1].height, 'Stair heights must visibly ascend');
      const bannerBottom = await page.locator('#banner').evaluate(n => n.getBoundingClientRect().bottom);
      assert(stairs.every(s => s.bottom <= bannerBottom + 1), 'Stairs must stay within the banner');
    }
    await page.screenshot({ path: path.join(output, `${width}x${height}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Pagos, reglas e historial' }).click();
  assert.equal(await page.locator('.pt-row').count(), (pharaoh || sweet) ? 11 : ways ? 10 : 7);
  if (gameId === 'koi-dorado') assert.equal(await page.locator('.pt-pays').filter({ hasText: '5 en línea' }).count(), 7);
  await page.getByRole('button', { name: 'Reglas', exact: true }).click();
  assert.match(await page.locator('#menuBody').textContent(), (pharaoh || sweet) ? /cualquier posición/ : ways ? /formas de ganar/ : /mismo símbolo/);
  await page.getByRole('button', { name: 'Cerrar', exact: true }).first().click();
  if (!samurai) {
    const turbo = page.getByRole('button', { name: 'Turbo', exact: true });
    await turbo.click();
    if (gameId === 'koi-dorado') assert.equal(await turbo.getAttribute('aria-pressed'), 'true');
  }
  if (samurai) {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => {
      window.__revealDurations = [];
      window.__originalAnimate = Element.prototype.animate;
      Element.prototype.animate = function(frames, options) {
        if (this.classList.contains('cell')) window.__revealDurations.push(options.duration);
        return window.__originalAnimate.call(this, frames, options);
      };
      window.__overlayDismiss = setInterval(() => { const o = document.querySelector('#overlay'); if (!o.hidden && !o.querySelector('.gate')) o.click(); }, 35);
    });
  }

  if (cascading && !samurai) await page.emulateMedia({ reducedMotion: 'reduce' });

  // A real round must debit exactly one bet, reconcile the balance and replay.
  const me = await (await context.request.get(`${origin}/api/me`)).json();
  const response = page.waitForResponse(r => r.url().endsWith('/api/spin') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Girar', exact: true }).dblclick();
  const round = await (await response).json();
  if (gameId === 'koi-dorado') {
    for (const frame of round.result.frames) assert.deepEqual(frame.grid.map(reel => reel.length), [3, 3, 3, 3, 3]);
  }
  await page.waitForSelector('#spinBtn[aria-busy="false"]', { timeout: 30000 });
  assert.equal(round.balance, Math.round((me.balance - round.bet + round.win) * 10000) / 10000);
  const history = await (await context.request.get(`${origin}/api/history?game=${gameId}`)).json();
  assert.equal(history.length, 1, 'Double click must create one round');
  const verification = await (await context.request.get(`${origin}/api/rounds/${round.roundId}/verify`)).json();
  assert(verification.ok);
  if (samurai) {
    const durations = await page.evaluate(() => {
      Element.prototype.animate = window.__originalAnimate;
      clearInterval(window.__overlayDismiss);
      return window.__revealDurations.slice(0, 15);
    });
    assert.equal(durations.length, 15);
    assert(durations.every(ms => ms === 230), 'Normal-mode reel reveal must use the shorter 230 ms animation');
    await page.getByRole('button', { name: 'Turbo', exact: true }).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
  }

  // Find real engine outputs, then intercept only in this browser for deterministic UI coverage.
  const game = loadGames().get(gameId);
  const cases = {};
  const required = sweet ? ['loss', 'win', 'chain', 'free', 'carry', 'retrigger', 'bonbons-no-win'] : jaguar ? ['loss', 'cascade', 'chain', 'power6', 'free', 'retrigger'] : samurai ? ['loss', 'cascade', 'chain', 'free', 'retrigger', 'power12'] : ocean ? ['loss', 'cascade', 'chain', 'power8', 'free', 'retrigger'] : catrina ? ['loss', 'cascade', 'chain', 'power16', 'free', 'retrigger'] : pharaoh ? ['loss', 'suns-no-win', 'win', 'chain', 'multiplier', 'free', 'carry', 'retrigger'] : dragon ? ['loss', 'cascade', 'chain', 'free', 'retrigger'] : neon ? ['loss', 'win', 'wild1', 'wild2', 'wild3'] : ['loss', 'win', 'respin', 'full'];
  for (let i = 0; i < 20000 && !required.every(k => cases[k]); i++) {
    const r = game.play(new Drbg(sha256(`${panda ? 'panda' : sweet ? 'sweet' : jaguar ? 'jaguar' : samurai ? 'samurai' : ocean ? 'ocean' : catrina ? 'catrina' : pharaoh ? 'pharaoh' : 'koi'}-ui-${i}`)));
    if (jaguar) {
      if (r.free) {
        if (r.free.spins.some(s => s.retrigger)) cases.retrigger ??= r;
        else cases.free ??= r;
      } else {
        cases[r.base.cascades >= 3 ? 'chain' : r.win > 0 ? 'cascade' : 'loss'] ??= r;
        if (r.base.frames.some(f => f.mult === 6 && f.wins.length)) cases.power6 ??= r;
      }
      continue;
    }
    if (samurai) {
      if (r.free) {
        cases.free ??= r;
        if (r.free.spins.some(s => s.retrigger)) cases.retrigger ??= r;
        if (r.free.spins.some(s => s.frames.some(f => f.mult === 12 && f.wins.length))) cases.power12 ??= r;
      } else cases[r.base.cascades >= 3 ? 'chain' : r.win > 0 ? 'cascade' : 'loss'] ??= r;
      continue;
    }
    if (catrina || ocean) {
      if (r.free) {
        cases.free ??= r;
        if (r.free.spins.some(s => s.retrigger)) cases.retrigger ??= r;
      } else {
        cases[r.base.cascades >= 3 ? 'chain' : r.win > 0 ? 'cascade' : 'loss'] ??= r;
        const power = ocean ? 8 : 16;
        if (r.base.frames.some(f => f.mult === power && f.wins.length)) cases[`power${power}`] ??= r;
      }
      continue;
    }
    if (sweet) {
      assert.equal(r.base.mSum, 0, 'Base must never contain multiplier bonbons');
      assert(r.base.frames.every(f => f.grid.flat().every(s => !/^M\d+$/.test(s))));
      if (r.free) {
        cases.free ??= r;
        if (r.free.spins.some(s => s.retrigger)) cases.retrigger ??= r;
        if (r.free.spins.some(s => s.raw > 0 && s.mSum === 0 && s.applied > 1)) cases.carry ??= r;
        if (r.free.spins.some(s => s.raw === 0 && s.mSum > 0)) cases['bonbons-no-win'] ??= r;
      } else cases[r.base.cascades >= 3 ? 'chain' : r.win > 0 ? 'win' : 'loss'] ??= r;
      continue;
    }
    if (pharaoh) {
      if (r.free) {
        cases.free ??= r;
        if (r.free.spins.some(s => s.retrigger)) cases.retrigger ??= r;
        if (r.free.spins.some(s => s.raw > 0 && s.mSum === 0 && s.applied > 1)) cases.carry ??= r;
      } else {
        const kind = !r.base.raw && r.base.mSum > 0 ? 'suns-no-win' : r.base.applied > 1 && r.base.mPos.length > 1 ? 'multiplier' : r.base.cascades >= 3 ? 'chain' : r.win > 0 ? 'win' : 'loss';
        cases[kind] ??= r;
      }
      continue;
    }
    const key = dragon ? (r.free ? r.free.spins.some(sp => sp.retrigger) ? 'retrigger' : 'free' : r.base.cascades >= 3 ? 'chain' : r.win > 0 ? 'cascade' : 'loss') : neon ? (r.feature ? `wild${r.feature.reels.length}` : r.win > 0 ? 'win' : 'loss') : r.frames.at(-1).full ? 'full' : r.feature ? 'respin' : r.win > 0 ? 'win' : 'loss';
    cases[key] ??= r;
  }
  assert(required.every(k => cases[k]));
  let fixture;
  if (panda) await page.evaluate(() => {
    window.__pandaStates = [];
    new MutationObserver(() => {
      const b = document.querySelector('.panda-status');
      const nodes = [...document.querySelectorAll('.cell')].sort((a,b) => parseFloat(a.style.left)-parseFloat(b.style.left) || parseFloat(a.style.top)-parseFloat(b.style.top));
      if (b && b.dataset.mode === 'respin') window.__pandaStates.push({step:Number(b.dataset.step), locked:Number(b.dataset.locked), dots:document.querySelectorAll('.panda-lock-map i.on').length, cells:nodes.filter(n=>n.classList.contains('locked')).length, grid:JSON.stringify(nodes.map(n=>n._sym))});
    }).observe(document.querySelector('#banner'), { childList:true, subtree:true });
  });
  if (pharaoh || sweet) await page.evaluate(selector => {
    window.__solarBanks = [];
    window.__solarFrames = [];
    new MutationObserver(() => {
      const bank = document.querySelector(selector);
      const cells = [...document.querySelectorAll('.cell')].sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left) || parseFloat(a.style.top) - parseFloat(b.style.top));
      const grid = cells.map(n => n._sym);
      if (bank) window.__solarBanks.push({ mode: bank.dataset.mode, phase: bank.dataset.phase, value: Number(bank.dataset.mult), grid: JSON.stringify(grid) });
      if (cells.length === 30) window.__solarFrames.push(grid);
    }).observe(document.querySelector('#banner'), { childList: true, subtree: true });
    window.__overlayDismiss = setInterval(() => { const o = document.querySelector('#overlay'); if (!o.hidden && !o.querySelector('.gate')) o.click(); }, 35);
  }, sweet ? '.sweet-bank' : '.pharaoh-bank');
  if (ways) await page.evaluate(({ selector, count }) => {
    window.__ladderSteps = [];
    window.__freeSteps = [];
    window.__dragonFrames = [];
    window.__oceanSteps = [];
    window.__samuraiSteps = [];
    window.__jaguarSteps = [];
    new MutationObserver(() => {
      const active = document.querySelector(selector);
      if (active) (document.querySelector('.machine.free') ? window.__freeSteps : window.__ladderSteps).push(active.textContent);
      const cells = [...document.querySelectorAll('.cell')].sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left) || parseFloat(a.style.top) - parseFloat(b.style.top));
      if (cells.length === count) {
        const grid = cells.map(n => n._sym);
        window.__dragonFrames.push(grid);
        const tide = document.querySelector('.ocean-tide');
        if (tide && active) window.__oceanSteps.push({ step: Number(tide.dataset.step), index: Number(active.parentElement.dataset.step), mult: Number(tide.dataset.mult), mode: tide.dataset.mode, grid });
        const wind = document.querySelector('.samurai-wind');
        if (wind && active) window.__samuraiSteps.push({ step: Number(wind.dataset.step), mult: Number(wind.dataset.mult), mode: wind.dataset.mode, grid });
        const ascent = document.querySelector('.jaguar-ascent');
        if (ascent && active) window.__jaguarSteps.push({ step: Number(ascent.dataset.step), index: Number(active.parentElement.dataset.step), mult: Number(ascent.dataset.mult), mode: ascent.dataset.mode, grid });
      }
    }).observe(document.querySelector('#banner'), { childList: true, subtree: true });
    window.__overlayDismiss = setInterval(() => { const o = document.querySelector('#overlay'); if (!o.hidden && !o.querySelector('.gate')) o.click(); }, 35);
  }, { selector: activeRungSelector, count: cellCount });
  await page.route('**/api/spin', route => route.fulfill({ json: { ...round, result: fixture, win: fixture.win * round.bet, balance: 2000 } }));
  for (const kind of required) {
    fixture = cases[kind];
    if (panda) await page.evaluate(() => { window.__pandaStates = []; });
    if (ways) await page.evaluate(() => { window.__dragonFrames = []; window.__oceanSteps = []; window.__samuraiSteps = []; window.__jaguarSteps = []; });
    if (pharaoh || sweet) await page.evaluate(selector => { window.__solarBanks = []; window.__solarFrames = []; });
    await page.getByRole('button', { name: 'Girar', exact: true }).click();
    await page.waitForSelector('#spinBtn[aria-busy="true"]');
    if (gameId === 'koi-dorado' && kind === 'win') {
      const line = page.locator('#paylines polyline').first();
      await line.waitFor({ state: 'attached' });
      const offsets = await line.evaluate((polyline, positions) => {
        const cells = [...document.querySelectorAll('#board .cell')];
        const board = polyline.ownerSVGElement.getBoundingClientRect();
        const matrix = polyline.getScreenCTM();
        return positions.map(([col, row], i) => {
          const cell = cells[col * 3 + row];
          const center = polyline.points.getItem(i + 1).matrixTransform(matrix);
          return [
            center.x - board.x - cell.offsetLeft - cell.offsetWidth / 2,
            center.y - board.y - cell.offsetTop - cell.offsetHeight / 2,
          ];
        });
      }, fixture.frames[0].wins[0].pos);
      assert(offsets.every(([x, y]) => Math.abs(x) < 1 && Math.abs(y) < 1), `Winning line must cross the centers of the reel cells (offsets: ${JSON.stringify(offsets)})`);
    }
    if (!neon && !cascading && (kind === 'respin' || kind === 'full')) {
      await page.waitForSelector('#overlay:not([hidden])');
      await page.locator('#overlay').click();
    }
    if (cascading && kind === 'free') {
      await page.waitForSelector('.machine.free');
      if (catrina) assert((await page.locator('.catrina-candle strong').allTextContents()).includes('×64'), 'Bonus must expose the ×64 top rung');
      if (ocean) assert.deepEqual(await page.locator('.ocean-pearl strong').allTextContents(), ['×2', '×3', '×5', '×8', '×13', '×21', '×34']);
      if (samurai) assert.deepEqual(await page.locator('.samurai-stroke strong').allTextContents(), ['×3', '×6', '×9', '×12']);
      if (jaguar) assert.deepEqual(await page.locator('.jaguar-stair strong').allTextContents(), Array.from({ length: 10 }, (_, i) => `×${(i + 1) * 2}`));
      await page.screenshot({ path: path.join(output, 'free-active.png') });
    }
    await page.waitForSelector('#spinBtn[aria-busy="false"]', { timeout: 90000 });
    assert.equal(await page.locator('.cell').count(), cellCount);
    assert.equal(await page.locator(reelSelector).count(), 0);
    assert.equal(await page.locator('#winVal').textContent(), new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(fixture.win * round.bet));
    // Respins replace individual DOM nodes, so append order is not board order.
    const visibleGrid = await page.locator('.cell').evaluateAll(nodes => nodes.sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left) || parseFloat(a.style.top) - parseFloat(b.style.top)).map(n => n._sym));
    const finalSpin = cascading ? fixture.free?.spins.at(-1) || fixture.base : null;
    assert.deepEqual(visibleGrid, (cascading ? finalSpin.frames.at(-1) : fixture.frames.at(-1)).grid.flat(), 'Visible symbols must match server frame');
    if (pharaoh) {
      assert.equal(await page.locator('.machine.free').count(), 0);
      assert.equal(await page.locator('.pharaoh-sun-flight').count(), 0);
      const observed = await page.evaluate(() => ({ banks: window.__solarBanks, frames: window.__solarFrames.map(f => JSON.stringify(f)) }));
      if (kind === 'chain') for (const frame of fixture.base.frames) assert(observed.frames.includes(JSON.stringify(frame.grid.flat())), 'Each tumble must match server symbols');
      if (kind === 'suns-no-win') assert.equal(await page.locator('.pharaoh-bank').getAttribute('data-mult'), '0', 'Suns without a win must not be applied');
      if (kind === 'multiplier') assert.equal(Number(await page.locator('.pharaoh-bank').getAttribute('data-mult')), fixture.base.applied, 'Base suns must sum exactly');
      if (fixture.free) {
        const banks = observed.banks.filter(b => b.mode === 'free');
        for (let j = 1; j < banks.length; j++) assert(banks[j].value >= banks[j - 1].value, 'Free bank must never decrease');
        const applied = banks.filter(b => b.phase === 'applied').map(b => b.value);
        for (const sp of fixture.free.spins.filter(sp => sp.applied > 1)) assert(applied.includes(sp.applied), 'Applied bank must match server global multiplier');
        assert.equal(await page.locator('.pharaoh-bank').getAttribute('data-mult'), '0', 'Bonus bank must reset on exit');
      }
    }
    if (sweet) {
      assert.equal(await page.locator('.machine.free').count(), 0);
      assert.equal(await page.locator('.sweet-flight').count(), 0);
      assert.equal(await page.locator('.sweet-bank').getAttribute('data-mode'), 'base');
      assert.equal(await page.locator('.sweet-bank').getAttribute('data-mult'), '0');
      assert.equal(await page.locator('.sweet-total').textContent(), 'BONUS');
      const observed = await page.evaluate(() => ({ banks: window.__solarBanks, frames: window.__solarFrames.map(f => JSON.stringify(f)) }));
      assert(observed.banks.filter(b => b.mode === 'base').every(b => b.value === 0), 'Base accumulator must stay inactive');
      if (kind === 'chain') for (const fr of fixture.base.frames) assert(observed.frames.includes(JSON.stringify(fr.grid.flat())));
      if (fixture.free) {
        const banks = observed.banks.filter(b => b.mode === 'free');
        for (let j = 1; j < banks.length; j++) assert(banks[j].value >= banks[j - 1].value, 'Bonus accumulator must never decrease');
        for (const sp of fixture.free.spins.filter(s => s.applied > 1)) assert(banks.some(b => b.phase === 'applied' && b.value === sp.applied && b.grid === JSON.stringify(sp.frames.at(-1).grid.flat())), 'Applied accumulator must match the server and its grid');
        let previous = 0;
        for (const sp of fixture.free.spins) {
          assert.equal(sp.globalMult, previous + (sp.raw > 0 ? sp.mSum : 0));
          if (!sp.raw && sp.mSum > 0) assert(banks.some(b => b.phase === 'settled' && b.value === previous && b.grid === JSON.stringify(sp.frames.at(-1).grid.flat())), 'Bonbons without a win must not increase the bonus accumulator');
          previous = sp.globalMult;
        }
      }
    }
    if (ways) {
      assert.equal(await page.locator('.machine.free').count(), 0, 'Must leave free-spin state');
      assert.equal(await page.locator(activeRungSelector).textContent(), '×1', 'Base ladder must reset');
      if (kind === 'chain') {
        const frames = await page.evaluate(() => window.__dragonFrames.map(grid => JSON.stringify(grid)));
        for (const frame of fixture.base.frames) assert(frames.includes(JSON.stringify(frame.grid.flat())), 'Each cascade grid must match a server frame');
      }
      if (ocean && (kind === 'chain' || kind === 'power8')) {
        const steps = await page.evaluate(() => window.__oceanSteps);
        for (const fr of fixture.base.frames) assert(steps.some(s => s.mode === 'base' && s.step === fr.step && s.mult === fr.mult && s.index === Math.min(fr.step, 5) && JSON.stringify(s.grid) === JSON.stringify(fr.grid.flat())), 'Each Fibonacci index and multiplier must match its server frame');
        assert(steps.some(s => s.step === 0 && s.index === 0 && s.mult === 1));
        assert(steps.some(s => s.step === 1 && s.index === 1 && s.mult === 1), 'First cascade must advance to the second ×1 pearl');
      }
      if (samurai && kind === 'power12') {
        const states = await page.evaluate(() => window.__samuraiSteps);
        const winningFrames = fixture.free.spins.flatMap(s => s.frames).filter(f => f.mult === 12 && f.wins.length);
        assert(winningFrames.length > 0);
        for (const fr of winningFrames) assert(states.some(s => s.mode === 'free' && s.mult === 12 && s.step === fr.step && JSON.stringify(s.grid) === JSON.stringify(fr.grid.flat())), 'A winning ×12 frame must be presented with its actual multiplier');
      }
      if (jaguar) {
        const states = await page.evaluate(() => window.__jaguarSteps);
        const check = (fr, mode) => assert(states.some(s => s.mode === mode && s.step === fr.step && s.index === Math.min(fr.step, 9) && s.mult === fr.mult && JSON.stringify(s.grid) === JSON.stringify(fr.grid.flat())), 'Linear step, index, multiplier and grid must match the server frame');
        if (kind === 'chain' || kind === 'power6') fixture.base.frames.forEach(fr => check(fr, 'base'));
        if (fixture.free) fixture.free.spins.forEach(sp => sp.frames.forEach(fr => check(fr, 'free')));
      }
    }
    if (panda && fixture.feature) {
      const states = await page.evaluate(() => window.__pandaStates);
      for (const fr of fixture.frames) assert(states.some(s=>s.step===fr.respin && s.locked===fr.locked.length && s.dots===fr.locked.length && s.cells===fr.locked.length && s.grid===JSON.stringify(fr.grid.flat())), 'Every respin grid, locked cell and map position count must match the server');
      assert.equal(await page.locator('.panda-status').getAttribute('data-mode'),'base');
      assert.equal(await page.locator('.cell.locked').count(),0);
    }
    if (neon) {
      assert.equal(await page.locator('.neon-wild-column').count(), fixture.feature?.reels.length || 0);
      assert.equal(await page.locator('[data-reel].on').count(), fixture.feature?.reels.length || 0);
    }
    await page.screenshot({ path: path.join(output, `${kind}.png`) });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (ways) {
    const observed = await page.evaluate(() => ({ base: window.__ladderSteps, free: window.__freeSteps }));
    assert(observed.base.includes(ocean || samurai ? '×3' : '×4'), 'Cascade ladder must progress');
    assert(observed.free.includes(samurai ? '×3' : '×2'), 'Free-spin ladder must start at its configured multiplier');
    assert(observed.free.some(v => (samurai ? ['×6', '×9', '×12'] : ocean ? ['×3', '×5', '×8', '×13', '×21', '×34'] : ['×4', '×6', '×8', '×10']).includes(v)), 'Free multiplier must increase');
    if (catrina) assert(observed.base.includes('×16'), 'Base chain must reach an actual ×16 winning frame');
    if (ocean) assert(observed.base.includes('×8'), 'Base chain must reach an actual ×8 winning frame');
  }
  fixture = cascading ? cases.free : neon ? cases.wild2 : cases.respin;
  await page.getByRole('button', { name: 'Juego automático', exact: true }).click();
  await page.locator('#autoGrid button').getByText('10', { exact: true }).click();
  await page.waitForSelector('#spinBtn[aria-busy="true"]');
  await page.waitForSelector('#spinBtn[aria-busy="false"]', { timeout: cascading ? 90000 : 15000 });
  assert.equal(await page.locator('#autoBtn.on').count(), 0, 'Autoplay must stop on a feature');
  await page.getByRole('button', { name: 'Activar o desactivar sonido' }).click();
  assert.equal(await page.locator('#soundBtn').getAttribute('aria-pressed'), 'false');
  await page.reload();
  await page.waitForSelector('.cell');
  assert.equal(await page.locator('#soundBtn').getAttribute('aria-pressed'), 'false', 'Sound preference persists');
  await page.unroute('**/api/spin');
  await page.route('**/api/spin', route => route.fulfill({ status: 503, json: { error: 'Conexión de prueba interrumpida' } }));
  await page.getByRole('button', { name: 'Girar', exact: true }).click();
  await page.waitForSelector('#spinBtn[aria-busy="false"]');
  assert.equal(await page.locator('.cell').count(), cellCount);
  assert.equal(await page.locator(reelSelector).count(), 0);
  await page.unroute('**/api/spin');
  // Simulate losing the HTTP response AFTER the server has recorded the round.
  await page.route('**/api/spin', async route => { await route.fetch(); await route.abort('connectionfailed'); });
  await page.getByRole('button', { name: 'Girar', exact: true }).click();
  await page.waitForSelector('#spinBtn[aria-busy="true"]');
  await page.waitForSelector('#spinBtn[aria-busy="false"]');
  const reconciled = await (await context.request.get(`${origin}/api/me`)).json();
  assert.equal(await page.locator('#balVal').textContent(), new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(reconciled.balance));
  await page.unroute('**/api/spin');

  // Another illustrated client must remain functional.
  const alternateId = panda ? 'koi-dorado' : 'panda-zen';
  await page.goto(`${origin}/play/${alternateId}`);
  await page.waitForFunction(count => document.querySelectorAll('.cell').length === count, clients[alternateId].cells);
  assert.equal(await page.locator(panda ? '.koi-game' : '.panda-game').count(), 1);
  assert.equal(await page.locator('.tile .g').count(), 0);
  assert.deepEqual(errors, []);
  console.log(`PASS ${gameId}: responsive layouts, art loading, rules, live wallet, single debit, replay, ${required.join('/')}, exact final grid, autoplay stop, reduced motion, sound persistence, error recovery, lost-response wallet reconciliation and alternate-client regression.`);
  console.log(`QA screenshots: ${output}`);
} finally {
  await browser?.close();
  server.kill();
  await delay(300);
  await rm(temp, { recursive: true, force: true });
}
