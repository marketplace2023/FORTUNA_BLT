/** Ejecutar con Playwright y Microsoft Edge. Usa un libro mayor temporal. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const probe = createServer().listen(0, '127.0.0.1');
await once(probe, 'listening');
const { port } = probe.address();
await new Promise((resolve) => probe.close(resolve));

const origin = `http://127.0.0.1:${port}`;
const dataDir = await mkdtemp(path.join(tmpdir(), 'fortuna-slots-'));
const server = spawn(process.execPath, ['server/index.js'], {
  cwd: path.resolve(import.meta.dirname, '..'),
  env: { ...process.env, PORT: String(port), DATA_DIR: dataDir },
  stdio: ['ignore', 'ignore', 'inherit'],
  windowsHide: true,
});
let browser;

try {
  for (let attempt = 0; attempt < 100; attempt++) {
    if ((await fetch(`${origin}/api/site`).catch(() => null))?.ok) break;
    if (server.exitCode !== null || attempt === 99) throw new Error('El servidor de prueba no arrancó');
    await delay(100);
  }
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ baseURL: origin, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  // Evita que las fuentes externas retrasen las pruebas del servidor local.
  await context.route(/^https:\/\/fonts\./, (route) => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const get = async (url) => {
    const response = await context.request.get(url);
    assert.equal(response.status(), 200, url);
    return response.json();
  };
  const games = (await get('/api/games')).filter(({ theme }) => theme.effect);
  assert.equal(games.length, 30);
  assert.equal(new Set(games.map(({ id }) => id)).size, 30);
  assert.deepEqual(Object.fromEntries(['lines', 'ways', 'anywhere'].map((engine) =>
    [engine, games.filter((game) => game.engine === engine).length])), { lines: 8, ways: 12, anywhere: 10 });

  await page.goto('/');
  await page.waitForSelector('.themed-card');
  assert.equal(await page.locator('.themed-card').count(), 30);
  assert.equal(await page.locator('.themed-card .slot-cover-art').count(), 30);
  await page.locator('.slot-cover-art').first().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('.slot-cover-art').naturalWidth > 0);
  assert.equal(await page.locator('.themed-card .cover').evaluateAll((covers) =>
    covers.filter((cover) => getComputedStyle(cover).backgroundImage === 'none').length), 0);

  let balance = 2000;
  for (const [index, { id, name, engine, theme }] of games.entries()) {
    const config = await get(`/api/games/${id}`);
    if (engine === 'lines') {
      assert.equal(config.cols, 4, id);
      assert.ok(config.lines.every((line) => line.length === config.cols), id);
    }
    assert.ok(config.paytable.every(({ sym, pays }) => config.symbols[sym] && pays.length > 0), id);
    assert.equal(config.cover.length, 4, id);
    if (theme.art) assert.equal((await context.request.get(theme.art)).status(), 200, id);
    if (theme.bonusArt) assert.equal((await context.request.get(theme.bonusArt)).status(), 200, id);
    for (const [key, symbol] of Object.entries(config.symbols)) {
      if (symbol.t === 'blank') continue;
      const art = await context.request.get(`${theme.symbolArt}/${key}.webp`);
      assert.equal(art.status(), 200, `${id} · ${key}`);
      assert.equal(art.headers()['content-type'], 'image/webp', `${id} · ${key}`);
    }
    await page.goto(`/play/${id}`, { waitUntil: 'domcontentloaded' });
    await page.locator('.themed-machine').waitFor();
    assert.equal(await page.locator('h1').textContent(), name);
    assert.equal(await page.locator('#board .cell').count(), config.cols * config.rows, id);
    assert.equal(await page.locator('#board .cell img.slot-symbol').count(), config.cols * config.rows, id);
    await page.waitForFunction(() => [...document.querySelectorAll('#board .slot-symbol')].every((img) => img.naturalWidth > 0));
    assert.ok(await page.locator('.themed-stage').evaluate((stage) =>
      getComputedStyle(stage).backgroundImage !== 'none'), id);

    if (!index) await page.getByRole('button', { name: 'Jugar demo', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#creditMode').textContent.includes('DEMO'));
    await page.getByRole('button', { name: 'Pagos, reglas e historial', exact: true }).click();
    assert.ok(await page.locator('#menuBody .pt-row').count() >= config.paytable.length, id);
    assert.equal(await page.locator('#menuBody .pt-row .slot-symbol').count(), await page.locator('#menuBody .pt-row').count(), id);
    await page.getByRole('button', { name: 'Reglas', exact: true }).click();
    assert.match(await page.locator('#menuBody').textContent(), /RTP teórico/);
    await page.getByRole('button', { name: 'Cerrar', exact: true }).first().click();

    const receipt = page.waitForResponse((response) => response.url().endsWith('/api/spin'));
    await page.getByRole('button', { name: 'Girar', exact: true }).click();
    const spinResponse = await receipt;
    assert.equal(spinResponse.status(), 200, id);
    const round = await spinResponse.json();
    assert.equal(round.result.engine, engine);
    assert.equal(round.configHash, config.configHash);
    assert.ok(round.win >= 0 && round.win <= round.bet * config.maxWin, id);
    balance += round.win - round.bet;
    assert.ok(Math.abs(round.balance - balance) < 1e-6, id);
    const replay = await get(`/api/rounds/${round.roundId}/verify`);
    assert.equal(replay.ok, true, id);
    assert.deepEqual(replay.result, round.result, id);
    await page.waitForFunction(() => document.querySelector('#spinBtn').getAttribute('aria-busy') === 'false', null, { timeout: 60_000 });
    const sizes = [0, 13, 28, 29].includes(index)
      ? [[320, 568], [390, 844], [844, 390], [768, 1024], [1024, 900], [1440, 900], [1920, 918]]
      : [[390, 844], [1440, 900]];
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await page.waitForFunction((rows) => {
        const board = document.querySelector('#board').getBoundingClientRect();
        const wrap = document.querySelector('#boardWrap').getBoundingClientRect();
        const title = document.querySelector('h1').getBoundingClientRect();
        const meters = document.querySelector('.m-info').getBoundingClientRect();
        const controls = document.querySelector('.m-controls').getBoundingClientRect();
        const buttons = [...document.querySelectorAll('.m-controls button')].map((button) => button.getBoundingClientRect());
        const controlsFit = buttons.every((a, index) => a.height >= 44 && a.width >= 44 &&
          buttons.slice(index + 1).every((b) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top));
        return board.height >= rows * 23 && board.width >= Math.min(innerWidth * .55, 1080) &&
          Math.abs(board.x + board.width / 2 - innerWidth / 2) <= 2 &&
          title.bottom < board.top && board.bottom < meters.top && meters.bottom <= controls.top &&
          board.top >= wrap.top - 1 && board.bottom <= wrap.bottom + 1 &&
          board.left >= wrap.left - 1 && board.right <= wrap.right + 1 &&
          controlsFit && controls.right <= innerWidth + 1 && controls.bottom <= innerHeight + 1;
      }, config.rows, { timeout: 5000 }).catch((error) => {
        return page.locator('#board, #boardWrap, h1, .m-info, .m-controls').evaluateAll((nodes) =>
          Object.fromEntries(nodes.map((node) => [node.id || node.className, node.getBoundingClientRect().toJSON()])))
          .then((bounds) => { throw new Error(`Disposición de ${id} a ${width}×${height}: ${JSON.stringify(bounds)}`, { cause: error }); });
      });
    }
    await page.setViewportSize({ width: 390, height: 844 });
  }
  assert.deepEqual(errors, []);
  console.log('30 slots comprobados en el lobby, escritorio, móvil, tabla de pagos y libro mayor');
} finally {
  try {
    await browser?.close();
  } finally {
    if (server.exitCode === null && server.signalCode === null) {
      const exit = once(server, 'exit');
      server.kill();
      await exit;
    }
    await rm(dataDir, { recursive: true, force: true });
  }
}
