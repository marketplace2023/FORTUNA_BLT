import { api, money, el, toast } from './api.js';
import { Sound } from './sound.js';
import { playSlotEffect, playSlotWin, setSlotTheme } from './slot-theme.js';
import { createReelPresentation, soundButton } from './skin-common.js';

const $ = (s) => document.querySelector(s);
const gameId = location.pathname.split('/').filter(Boolean).pop();
const skinModules = { 'koi-dorado': './koi.js', 'frutas-neon': './neon.js', 'dragon-jade': './dragon.js', 'faraon-dorado': './pharaoh.js', 'noche-catrinas': './catrina.js', 'oceano-perlas': './ocean.js', 'samurai-viento': './samurai.js', 'templo-jaguar': './jaguar.js', 'fiesta-dulce': './sweet.js', 'panda-zen': './panda.js' };
const Skin = skinModules[gameId] ? await import(skinModules[gameId]) : null;
Sound.koi = gameId === 'koi-dorado';
Sound.neon = gameId === 'frutas-neon';
Sound.dragon = gameId === 'dragon-jade';
Sound.pharaoh = gameId === 'faraon-dorado';
Sound.catrina = gameId === 'noche-catrinas';
Sound.ocean = gameId === 'oceano-perlas';
Sound.samurai = gameId === 'samurai-viento';
Sound.jaguar = gameId === 'templo-jaguar';
Sound.sweet = gameId === 'fiesta-dulce';
Sound.panda = gameId === 'panda-zen';

const S = {
  info: null, me: null, betIdx: 0, busy: false, turbo: false, auto: 0, stopOnFeature: true,
  cell: 80, cells: [], grid: null, free: false, roundWin: 0,
};

const board = $('#board');
const machine = $('#machine');
const boardWrap = $('#boardWrap');
const arcadeCabinet = machine.classList.contains('slot-machine');
let illustratedReels;
const T = (ms) => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? Math.min(ms, 70) : S.turbo ? ms * 0.45 : ms);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const bet = () => S.info.bets[S.betIdx];

// ───────────────────────────── Inicio ─────────────────────────────
async function init() {
  try {
    S.info = await api(`/api/games/${gameId}`);
  } catch (e) {
    document.body.innerHTML = `<p style="padding:40px;font-family:sans-serif;color:#fff">${e.message}. <a style="color:#ffcf3f" href="/">Volver</a></p>`;
    return;
  }
  const t = { ...S.info.theme, ...Skin?.theme };
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries({ bg1: t.bg1, bg2: t.bg2, accent: t.accent, ink: t.ink, tile: t.tile, tile2: t.tile2 })) root.setProperty(`--${k}`, v);
  setSlotTheme(t, $('#stage'), machine, boardWrap);
  if (t.dark) machine.classList.add('dark');
  document.title = S.info.name;
  document.querySelector('meta[name=theme-color]').content = t.bg1;
  $('#title').textContent = S.info.name;
  const { cols, rows } = S.info;
  machine.style.setProperty('--cabinet-ratio', cols / rows);
  boardWrap.setAttribute('aria-label', `${cols} carretes de ${rows} filas`);
  if (t.symbolArt) {
    machine.dataset.engine = S.info.engine;
    const paying = Object.entries(S.info.symbols)
      .filter(([, symbol]) => symbol.t === 'high' || symbol.t === 'low')
      .map(([key]) => key);
    illustratedReels = createReelPresentation({ tile: makeTile, prefix: 'slot', symbols: paying });
  }
  const rtpNote = $('#rtpNote');
  if (rtpNote) rtpNote.textContent = `RTP ${S.info.rtp.toFixed(2)}% · máx ${S.info.maxWin.toLocaleString('es')}x`;
  S.betIdx = Math.max(0, S.info.bets.indexOf(S.info.defaultBet));
  try { const saved = Number(localStorage.getItem(`bet:${gameId}`)); if (S.info.bets.includes(saved)) S.betIdx = S.info.bets.indexOf(saved); } catch {}
  try { S.turbo = localStorage.getItem('turbo') === '1'; Sound.on = localStorage.getItem('sound') !== '0'; } catch {}
  $('#turboBtn').classList.toggle('on', S.turbo);
  if (Skin) Skin.soundButton(Sound.on);
  else soundButton(Sound.on);
  $('#turboBtn').setAttribute('aria-pressed', String(S.turbo));

  layout();
  if (arcadeCabinet) new ResizeObserver(layout).observe(boardWrap);
  S.grid = idleGrid();
  renderInstant(S.grid);
  setBanner('idle');
  updateBet();

  S.me = await api('/api/me');
  if (!S.me) return gate();
  if (S.me.demo) $('#creditMode').textContent = '· DEMO';
  setBalance(S.me.balance);
}

function idleGrid() {
  const syms = Object.entries(S.info.symbols).filter(([, v]) => v.t === 'high' || v.t === 'low').map(([k]) => k);
  const g = [];
  for (let c = 0; c < S.info.cols; c++) { const col = []; for (let r = 0; r < S.info.rows; r++) col.push(syms[(c * 3 + r * 5 + c * r) % syms.length]); g.push(col); }
  return g;
}

function gate() {
  overlay(el('div', { class: 'gate' },
    el('div', { class: 'ov-glyph' }, Skin ? Skin.tile(S.info.symbols.W ? 'W' : 'H1', S.info.symbols.W || S.info.symbols.H1) : overlaySymbol(S.info.symbols.W ? 'W' : Object.keys(S.info.symbols)[0])),
    el('div', { class: 'ov-title' }, S.info.name),
    el('p', {}, 'Inicia sesión o prueba con créditos demo.'),
    el('div', { class: 'row' },
      el('button', { class: 'ov-btn', type: 'button', onclick: async () => {
        try { S.me = await api('/api/auth/demo', { method: 'POST', body: {} }); $('#creditMode').textContent = '· DEMO'; setBalance(S.me.balance); closeOverlay(); toast('2.000 créditos demo'); } catch (e) { toast(e.message, 'error'); }
      } }, 'Jugar demo'),
      el('a', { class: 'ghost-btn', href: '/?login' }, 'Entrar'),
    ),
  ), { sticky: true });
}

// ───────────────────────────── Disposición ─────────────────────────────
function layout() {
  if (!S.info) return;
  if (arcadeCabinet) {
    const { cols, rows } = S.info;
    const style = getComputedStyle(boardWrap);
    const width = boardWrap.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const height = boardWrap.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    S.cellWidth = Math.max(1, width / cols);
    S.cell = Math.max(1, height / rows);
    board.style.width = `${S.cellWidth * cols}px`;
    board.style.height = `${S.cell * rows}px`;
    board.style.setProperty('--reel-width', `${S.cellWidth}px`);
    document.documentElement.style.setProperty('--cell', `${S.cell}px`);
    S.cells.forEach((col, c) => col.forEach((node, r) => place(node, c, r)));
    return;
  }
  if (Skin) return Skin.resize(board, S, place);
  const wrap = boardWrap;
  const style = getComputedStyle(wrap);
  const w = wrap.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const h = wrap.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  const { cols, rows } = S.info;
  const cell = Math.max(S.info.theme.effect ? 16 : 36, Math.floor(Math.min(w / cols, h / rows, S.info.theme.symbolArt ? 170 : 150)));
  S.cell = cell;
  board.style.width = `${cols * cell}px`;
  board.style.height = `${rows * cell}px`;
  document.documentElement.style.setProperty('--cell', `${cell}px`);
  for (let c = 0; c < S.cells.length; c++) for (let r = 0; r < S.cells[c].length; r++) place(S.cells[c][r], c, r);
}
let rz;
if (!arcadeCabinet) window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layout, 80); });

// ───────────────────────────── Celdas ─────────────────────────────
function symDef(sym) {
  if (sym && sym[0] === 'M' && sym.length > 1 && /^\d+$/.test(sym.slice(1))) return { ...S.info.symbols.M, t: 'mult', val: Number(sym.slice(1)) };
  return S.info.symbols[sym] || { g: '?', t: 'low' };
}

function symbolImage(sym, label = '') {
  const key = /^M\d+$/.test(sym) ? 'M' : sym;
  return el('img', { class: 'slot-symbol', src: `${S.info.theme.symbolArt}/${key}.webp`, alt: label, draggable: 'false' });
}

function overlaySymbol(sym) {
  const d = symDef(sym);
  if (Skin) return Skin.glyph(d.g, S.info);
  return S.info.theme.symbolArt ? symbolImage(sym, d.n) : d.g;
}

function makeTile(sym) {
  const d = symDef(sym);
  if (Skin) return Skin.tile(sym, d);
  const tile = el('div', { class: `tile t-${d.t}` });
  if (S.info.theme.symbolArt && d.t !== 'blank') tile.append(symbolImage(sym, d.n));
  else if (d.g && d.t !== 'mult') tile.append(el('span', { class: 'g' }, d.g));
  if (d.t === 'mult') tile.append(el('span', { class: 'mv' }, `${S.info.theme.symbolArt ? '×' : 'x'}${d.val}`));
  if (d.t === 'wild') tile.append(el('span', { class: 'lab' }, 'WILD'));
  if (d.t === 'scatter') tile.append(el('span', { class: 'lab' }, 'SCATTER'));
  return tile;
}

function place(node, c, r) {
  node.style.left = `${c * (S.cellWidth ?? S.cell)}px`;
  node.style.top = `${r * S.cell}px`;
}

function makeCell(sym, c, r) {
  const node = el('div', { class: 'cell' }, makeTile(sym));
  node._sym = sym;
  place(node, c, r);
  board.append(node);
  return node;
}

function clearBoard() {
  for (const col of S.cells) for (const n of col) n.remove();
  S.cells = [];
}

function renderInstant(grid) {
  clearBoard();
  S.cells = grid.map((col, c) => col.map((sym, r) => makeCell(sym, c, r)));
}

const anim = (node, frames, opts) => node.animate(frames, { fill: 'both', ...opts }).finished.catch(() => {});

async function dropOut() {
  if (Skin) return Skin.rollOut(S, board, T);
  if (illustratedReels && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return illustratedReels.rollOut(S, board, T);
  }
  const H = S.info.rows * S.cell + S.cell;
  const jobs = [];
  S.cells.forEach((col, c) => col.forEach((n) => {
    jobs.push(anim(n, [{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${H}px)`, opacity: 0.2 }], { duration: T(260), delay: T(c * 45), easing: 'cubic-bezier(.5,0,.9,.6)' }));
  }));
  await Promise.all(jobs);
  clearBoard();
}

async function dropIn(grid, { locked } = {}) {
  const presentation = Skin ?? illustratedReels;
  if (presentation) return reelDropIn(grid, locked, presentation);
  clearBoard();
  const H = S.info.rows * S.cell + 30;
  const jobs = [];
  const lockSet = new Set((locked || []).map(([c, r]) => `${c},${r}`));
  S.cells = grid.map((col, c) => col.map((sym, r) => {
    const n = makeCell(sym, c, r);
    if (lockSet.has(`${c},${r}`)) n.classList.add('locked');
    jobs.push(anim(n, [{ transform: `translateY(${-H}px)` }, { transform: 'translateY(0)' }], { duration: T(380), delay: T(c * 75 + (S.info.rows - r) * 18), easing: 'cubic-bezier(.3,1.35,.55,1)' }));
    return n;
  }));
  setTimeout(() => Sound.stop(), T(380));
  for (let c = 1; c < grid.length; c++) setTimeout(() => Sound.stop(), T(380 + c * 75));
  await Promise.all(jobs);
  S.grid = grid;
}

async function reelDropIn(grid, locked, presentation) {
  clearBoard();
  const reveal = { delay: 120, stagger: 135, duration: 330, travel: 1.4, ...presentation.reveal };
  const lockSet = new Set((locked || []).map(([c, r]) => `${c},${r}`));
  S.cells = grid.map((col, c) => col.map((sym, r) => {
    const n = makeCell(sym, c, r);
    n.style.visibility = 'hidden';
    if (lockSet.has(`${c},${r}`)) n.classList.add('locked');
    return n;
  }));
  await Promise.all(S.cells.map(async (col, c) => {
    await wait(T(reveal.delay + c * reveal.stagger));
    presentation.stopReel(c);
    Sound.stop();
    await Promise.all(col.map(n => {
      n.style.visibility = '';
      return anim(n, [{ transform: `translateY(${-S.cell * reveal.travel}px)`, filter: 'blur(3px)' }, { transform: 'translateY(5px)', filter: 'blur(0)', offset: .8 }, { transform: 'translateY(0)', filter: 'blur(0)' }], { duration: T(reveal.duration), easing: 'cubic-bezier(.18,.7,.3,1)' });
    }));
  }));
  presentation.dispose();
  S.grid = grid;
}

function clearMarks() {
  for (const col of S.cells) for (const n of col) n.classList.remove('hit', 'dim', 'sc');
  $('#paylines').replaceChildren();
}

async function showWins(frame, amount) {
  const hit = new Set();
  for (const w of frame.wins) for (const [c, r] of w.pos) hit.add(`${c},${r}`);
  S.cells.forEach((col, c) => col.forEach((n, r) => n.classList.add(hit.has(`${c},${r}`) ? 'hit' : 'dim')));
  if (S.info.engine === 'lines') drawLines(frame.wins);
  if (amount > 0) floatWin(amount);
  playSlotEffect(T(790));
  if (!playSlotWin(frame.wins, Sound)) Sound.win(frame.wins.length);
  await wait(T(Skin?.winPause ?? 950));
  clearMarks();
}

function drawLines(wins) {
  const svg = $('#paylines');
  svg.replaceChildren();
  svg.setAttribute('viewBox', `0 0 ${S.info.cols} ${S.info.rows}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  const ns = 'http://www.w3.org/2000/svg';
  for (const w of wins) {
    const pl = document.createElementNS(ns, 'polyline');
    const pts = w.pos.map(([c, r]) => `${c + 0.5},${r + 0.5}`);
    const [c0, r0] = w.pos[0];
    const [c1, r1] = w.pos.at(-1);
    pts.unshift(`${c0 + 0.08},${r0 + 0.5}`);
    pts.push(`${c1 + 0.92},${r1 + 0.5}`);
    pl.setAttribute('vector-effect', 'non-scaling-stroke');
    pl.setAttribute('points', pts.join(' '));
    svg.append(pl);
  }
}

function floatWin(amount) {
  const f = $('#floatWin');
  f.textContent = `+${money(amount)}`;
  f.classList.remove('show');
  void f.offsetWidth;
  f.classList.add('show');
}

/** Cascada: explotan las ganadoras, caen las supervivientes y entran nuevas desde arriba. */
async function cascade(remove, nextGrid) {
  const R = S.info.rows;
  const rm = new Set(remove.map(([c, r]) => c * R + r));
  const boom = [];
  S.cells.forEach((col, c) => col.forEach((n, r) => {
    if (rm.has(c * R + r)) boom.push(anim(n, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.25) rotate(8deg)', opacity: 1, offset: 0.35 }, { transform: 'scale(0)', opacity: 0 }], { duration: T(320), easing: 'ease-in' }));
  }));
  Sound.pop();
  await Promise.all(boom);

  const jobs = [];
  const next = [];
  for (let c = 0; c < S.cells.length; c++) {
    const survivors = [];
    S.cells[c].forEach((n, r) => { if (rm.has(c * R + r)) n.remove(); else survivors.push({ n, r }); });
    const k = R - survivors.length;
    const col = new Array(R);
    for (let r = 0; r < k; r++) {
      const n = makeCell(nextGrid[c][r], c, r);
      col[r] = n;
      jobs.push(anim(n, [{ transform: `translateY(${-(k + 0.6) * S.cell}px)` }, { transform: 'translateY(0)' }], { duration: T(360), delay: T(c * 30), easing: 'cubic-bezier(.3,1.3,.55,1)' }));
    }
    survivors.forEach(({ n, r: oldR }, i) => {
      const newR = k + i;
      col[newR] = n;
      if (newR !== oldR) {
        n.getAnimations().forEach((a) => a.cancel());
        place(n, c, newR);
        jobs.push(anim(n, [{ transform: `translateY(${(oldR - newR) * S.cell}px)` }, { transform: 'translateY(0)' }], { duration: T(300), delay: T(c * 30), easing: 'cubic-bezier(.4,1.25,.6,1)' }));
      }
    });
    next.push(col);
  }
  S.cells = next;
  await Promise.all(jobs);
  S.grid = nextGrid;
}

// ───────────────────────────── Banner ─────────────────────────────
function setBanner(kind, data = {}) {
  const b = $('#banner');
  b.replaceChildren();
  const i = S.info;
  if (Skin) { b.append(Skin.banner(kind, data, i, S)); return; }
  const cue = i.theme.cue;
  if (i.engine === 'ways') {
    const ladder = S.free ? i.ladder.free : i.ladder.base;
    const at = Math.min(data.step || 0, ladder.length - 1);
    const show = ladder.length > 6 ? ladder.slice(Math.max(0, Math.min(at - 2, ladder.length - 6)), Math.max(0, Math.min(at - 2, ladder.length - 6)) + 6) : ladder;
    const offset = ladder.indexOf(show[0]);
    b.append(el('div', { class: 'ladder' }, show.map((m, j) => el('span', { class: `rung ${offset + j === at ? 'on' : ''}` }, `x${m}`))));
    if (cue && (kind === 'ladder' || S.free)) {
      let label = cue;
      if (i.theme.effect === 'launch') label += ` · T−${ladder.length - at - 1}`;
      if (i.theme.effect === 'altitude') label += ` · ${(at + 1) * 500} m`;
      b.append(el('span', { class: 'slot-cue' }, label));
    }
  } else if (i.engine === 'anywhere') {
    if (S.free) b.append(el('div', { class: 'banner-text' }, 'Multiplicador acumulado ', el('span', { class: 'gmult' }, `x${data.gmult || 0}`)));
    else if (kind === 'mult') b.append(el('div', { class: 'banner-text' }, cue || 'Multiplicadores', ' ', el('span', { class: 'gmult' }, `x${data.mult}`)));
    else if (kind === 'order') b.append(el('div', { class: 'banner-text' }, `En el pase · ${data.count} ${data.count === 1 ? 'pedido' : 'pedidos'}`));
    else b.append(el('div', { class: 'banner-text' }, el('b', {}, `${i.tiers[0]}+ iguales`), ' en cualquier lugar pagan'));
  } else {
    if (kind === 'respin') b.append(el('div', { class: 'banner-text' }, el('b', {}, cue || 'RESPIN DE LA SUERTE'), data.n ? ` · ${data.n}` : ''));
    else if (kind === 'wild') b.append(el('div', { class: 'banner-text' }, el('b', {}, cue || '¡RODILLOS SALVAJES!')));
    else if (kind === 'full') b.append(el('div', { class: 'banner-text' }, el('b', {}, `¡PANTALLA LLENA x${i.fullScreenMult}!`)));
    else b.append(el('div', { class: 'banner-text' }, `${i.lines.length} líneas · pantalla llena `, el('b', {}, `x${i.fullScreenMult}`)));
  }
}

// ───────────────────────────── Saldo / apuesta ─────────────────────────────
function setBalance(v) { $('#balVal').textContent = money(v); }
function setWin(v, pop = true) {
  $('#winVal').textContent = money(v);
  if (pop) { const w = $('#winbar'); w.classList.remove('pop'); void w.offsetWidth; w.classList.add('pop'); }
}
function updateBet() {
  $('#betVal').textContent = money(bet());
  $('#betDown').disabled = S.betIdx === 0 || S.busy;
  $('#betUp').disabled = S.betIdx === S.info.bets.length - 1 || S.busy;
}
function changeBet(d) {
  if (S.busy) return;
  S.betIdx = Math.min(S.info.bets.length - 1, Math.max(0, S.betIdx + d));
  try { localStorage.setItem(`bet:${gameId}`, String(bet())); } catch {}
  updateBet();
  Sound.click();
}
function setBusy(v) {
  S.busy = v;
  $('#spinBtn').classList.toggle('busy', v && !S.auto);
  updateBet();
  $('#menuBtn').disabled = v;
  $('#spinBtn').setAttribute('aria-busy', String(v));
}

// ───────────────────────────── Giro ─────────────────────────────
async function spin() {
  if (S.busy || !S.me) return;
  Sound.init();
  const b = bet();
  if (S.me.balance < b) { toast('Saldo insuficiente', 'error'); stopAuto(); return; }
  setBusy(true);
  Skin?.roundStart?.(S);
  clearMarks();
  S.roundWin = 0;
  setWin(0, false);
  setBalance(S.me.balance - b);
  Sound.spin();
  const req = api('/api/spin', { method: 'POST', body: { gameId, bet: b } });
  const out = dropOut();
  let data;
  try {
    [data] = await Promise.all([req, out]);
  } catch (e) {
    await out;
    await dropIn(S.grid);
    // A response can be lost after the server committed a round. Reconcile wallet.
    try { S.me = await api('/api/me') || S.me; } catch {}
    setBalance(S.me.balance);
    toast(e.message, 'error');
    stopAuto();
    setBusy(false);
    return;
  }
  const r = data.result;
  let feature = false;
  if (r.engine === 'lines') feature = await playLines(r, b);
  else if (r.engine === 'ways') feature = await playWays(r, b);
  else feature = await playAnywhere(r, b);

  S.roundWin = data.win;
  setWin(data.win);
  if (data.win / b >= 15) await bigWin(data.win, data.win / b);
  else if (data.win > 0) Sound.coins();
  S.me.balance = data.balance;
  setBalance(data.balance);
  setBanner('idle');
  setBusy(false);

  if (S.auto > 0) {
    if (feature && S.stopOnFeature) return stopAuto();
    S.auto--;
    renderAuto();
    if (S.auto > 0) { await wait(T(250)); spin(); } else stopAuto();
  }
}

/** Giro por líneas, respin con bloqueo o rodillos salvajes. */
async function playLines(r, b) {
  const f = r.feature;
  if (!f) {
    const fr = r.frames[0];
    await dropIn(fr.grid);
    if (fr.wins.length) {
      if (fr.full) { setBanner('full'); Sound.feature(); }
      S.roundWin += fr.win * b; setWin(S.roundWin);
      await showWins(fr, fr.win * b);
    }
    return false;
  }
  if (f.type === 'respinLock') {
    const tgt = symDef(f.target);
    Sound.feature();
    await intro('Respin de la suerte', f.target, `Solo caen ${tgt.n} y comodines. Lo que cae, se queda.`, 1400);
    setBanner('respin');
    await dropIn(r.frames[0].grid, { locked: r.frames[0].locked });
    if (Skin?.respinFrame) await Skin.respinFrame(r.frames[0], S, f, { wait, T });
    for (let i = 1; i < r.frames.length; i++) {
      const fr = r.frames[i];
      setBanner('respin', { n: i });
      await wait(T(260));
      const jobs = [];
      for (const [c, rr] of fr.changed) {
        const old = S.cells[c][rr];
        old.remove();
        const n = makeCell(fr.grid[c][rr], c, rr);
        S.cells[c][rr] = n;
        jobs.push(anim(n, [{ transform: `translateY(${-S.cell * 0.8}px)`, opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: T(320), delay: T((c * S.info.rows + rr) * 25), easing: 'cubic-bezier(.3,1.4,.55,1)' }));
      }
      Sound.stop();
      await Promise.all(jobs);
      const lock = new Set(fr.locked.map(([c, rr]) => `${c},${rr}`));
      S.cells.forEach((col, c) => col.forEach((n, rr) => n.classList.toggle('locked', lock.has(`${c},${rr}`))));
      if (Skin?.respinFrame) await Skin.respinFrame(fr, S, f, { wait, T });
      if (fr.changed.some(([c, rr]) => fr.grid[c][rr] !== 'X')) {
        playSlotEffect(T(550));
        Sound.lock();
      }
    }
    S.grid = r.frames.at(-1).grid;
    const last = r.frames.at(-1);
    S.cells.forEach((col) => col.forEach((n) => n.classList.remove('locked')));
    if (last.full) { setBanner('full'); Sound.feature(); await wait(T(500)); }
    if (last.wins.length) { S.roundWin += last.win * b; setWin(S.roundWin); await showWins(last, last.win * b); }
    return true;
  }
  if (f.type === 'wildReels') {
    await dropIn(r.frames[0].grid);
    setBanner('wild', { reels: f.reels });
    playSlotEffect(T(850));
    Sound.feature();
    if (Skin?.wildReels) {
      const fr = r.frames[1];
      await Skin.wildReels(S, f.reels, fr, { anim, wait, T, makeTile });
      S.grid = fr.grid;
      if (fr.full) { setBanner('full'); await wait(T(500)); }
      if (fr.wins.length) { S.roundWin += fr.win * b; setWin(S.roundWin); await showWins(fr, fr.win * b); }
      return true;
    }
    const jobs = [];
    for (const c of f.reels) {
      S.cells[c].forEach((n, rr) => {
        jobs.push(anim(n, [{ transform: 'rotateY(0)' }, { transform: 'rotateY(90deg)' }], { duration: T(220), delay: T(rr * 60) }).then(() => {
          n._sym = 'W';
          n.replaceChildren(makeTile('W'));
          return anim(n, [{ transform: 'rotateY(90deg)' }, { transform: 'rotateY(0)' }], { duration: T(220) });
        }));
      });
    }
    await Promise.all(jobs);
    const fr = r.frames[1];
    S.grid = fr.grid;
    if (fr.full) { setBanner('full'); await wait(T(500)); }
    if (fr.wins.length) { S.roundWin += fr.win * b; setWin(S.roundWin); await showWins(fr, fr.win * b); }
    return true;
  }
  return false;
}

/** Ways: cascadas con escalera de multiplicadores y giros gratis. */
async function playCascadeSpin(spin, b, onFrame) {
  await dropIn(spin.frames[0].grid);
  for (let i = 0; i < spin.frames.length; i++) {
    const fr = spin.frames[i];
    onFrame?.(fr, i);
    if (!fr.wins.length) break;
    const amount = (fr.win ?? 0) * b;
    S.roundWin += amount;
    setWin(S.roundWin);
    await showWins(fr, amount);
    await cascade(fr.remove, spin.frames[i + 1].grid);
  }
}

async function highlightScatters() {
  S.cells.forEach((col) => col.forEach((n) => { if (n._sym === 'S') n.classList.add('sc'); else n.classList.add('dim'); }));
  Sound.feature();
  await wait(T(1300));
  clearMarks();
}

async function playWays(r, b) {
  await playCascadeSpin(r.base, b, (fr) => setBanner('ladder', { step: fr.step }));
  if (!r.free) return false;
  await highlightScatters();
  await intro(S.info.theme.bonusTitle || 'Giros gratis', 'S', `${r.free.awarded} giros gratis con la escalera x${S.info.ladder.free.join(' → x')}`, 2000, r.free.awarded);
  enterFree();
  let total = r.free.awarded;
  const startWin = S.roundWin;
  for (let i = 0; i < r.free.spins.length; i++) {
    const sp = r.free.spins[i];
    setCounter(i + 1, total);
    await dropOut();
    await playCascadeSpin(sp, b, (fr) => setBanner('ladder', { step: fr.step }));
    if (sp.retrigger) { total += sp.retrigger; await highlightScatters(); await intro('¡Más giros!', 'S', `+${sp.retrigger} giros gratis`, 1300); setCounter(i + 1, total); }
  }
  exitFree();
  await summary(S.roundWin - startWin, r.free.spins.length);
  return true;
}

/** Paga en cualquier lugar: caídas, multiplicadores al final, multiplicador global en giros gratis. */
async function playAnywhere(r, b) {
  const base = r.base;
  await playTumble(base, b, false);
  if (base.applied > 1) await applyMult(base, b, base.applied);
  if (!r.free) return false;
  await highlightScatters();
  await intro(S.info.theme.bonusTitle || 'Giros gratis', 'S', `${r.free.awarded} giros gratis. Los multiplicadores se acumulan.`, 2000, r.free.awarded);
  enterFree();
  setBanner('free', { gmult: 0 });
  let total = r.free.awarded;
  const startWin = S.roundWin;
  for (let i = 0; i < r.free.spins.length; i++) {
    const sp = r.free.spins[i];
    setCounter(i + 1, total);
    await dropOut();
    await playTumble(sp, b, true);
    if (sp.raw > 0 && sp.mSum > 0) { setBanner('free', { gmult: sp.globalMult }); }
    if (sp.applied > 1) await applyMult(sp, b, sp.applied);
    if (sp.retrigger) { total += sp.retrigger; await highlightScatters(); await intro('¡Más giros!', 'S', `+${sp.retrigger} giros gratis`, 1300); setCounter(i + 1, total); }
  }
  exitFree();
  await summary(S.roundWin - startWin, r.free.spins.length);
  return true;
}

async function playTumble(spin, b) {
  spin._rawShown = 0;
  await dropIn(spin.frames[0].grid);
  for (let i = 0; i < spin.frames.length; i++) {
    const fr = spin.frames[i];
    Skin?.tumbleFrame?.(fr, S);
    if (!fr.wins.length) break;
    if (!S.free && S.info.theme.effect === 'kitchen') setBanner('order', { count: fr.wins.length });
    const amount = fr.win * b;
    spin._rawShown += amount;
    S.roundWin += amount;
    setWin(S.roundWin);
    await showWins(fr, amount);
    await cascade(fr.remove, spin.frames[i + 1].grid);
  }
  Skin?.tumbleEnd?.(spin, S);
}

async function applyMult(spin, b, mult) {
  await Skin?.collectMultipliers?.(spin, S, { anim, wait, T });
  S.cells.forEach((col) => col.forEach((n) => { if (n._sym[0] === 'M' && n._sym.length > 1) n.classList.add('hit'); else n.classList.add('dim'); }));
  if (!S.free) setBanner('mult', { mult });
  playSlotEffect(T(950));
  Sound.feature();
  await wait(T(800));
  const extra = spin.raw * b * (mult - 1);
  S.roundWin += extra;
  setWin(S.roundWin);
  floatWin(spin.raw * b * mult);
  await wait(T(900));
  clearMarks();
}

function enterFree() {
  S.free = true;
  machine.classList.add('free');
  Skin?.freeState?.(true);
  if (Skin) setBanner('ladder', { step: 0 });
}
function exitFree() { S.free = false; machine.classList.remove('free'); $('#fsCounter').hidden = true; Skin?.freeState?.(false); }
function setCounter(i, total) { const c = $('#fsCounter'); c.hidden = false; c.textContent = `Giro ${i} / ${total}`; }

// ───────────────────────────── Superposiciones ─────────────────────────────
let ovResolve = null;
function overlay(content, { sticky = false } = {}) {
  const o = $('#overlay');
  o.replaceChildren(content);
  o.hidden = false;
  o.onclick = sticky ? null : () => closeOverlay();
}
function closeOverlay() {
  const o = $('#overlay');
  o.hidden = true;
  o.replaceChildren();
  if (ovResolve) { const r = ovResolve; ovResolve = null; r(); }
}
function timedOverlay(content, ms) {
  return new Promise((resolve) => {
    ovResolve = resolve;
    overlay(content);
    setTimeout(() => { if (ovResolve === resolve) closeOverlay(); }, S.auto ? T(ms) : ms + 1500);
  });
}

function intro(title, symbol, sub, ms, num) {
  return timedOverlay(el('div', { class: 'ov-card' },
    el('div', { class: 'ov-glyph' }, overlaySymbol(symbol)),
    el('div', { class: 'ov-title' }, title),
    num ? el('div', { class: 'ov-num' }, num) : null,
    el('div', { class: 'ov-sub' }, sub),
    el('div', { class: 'ov-hint' }, 'Toca para continuar'),
  ), ms);
}

function summary(amount, spins) {
  Sound.big();
  return timedOverlay(el('div', { class: 'ov-card' },
    el('div', { class: 'ov-kicker' }, `${spins} giros gratis`),
    el('div', { class: 'ov-title' }, 'Total ganado'),
    el('div', { class: 'ov-num' }, money(amount)),
    el('div', { class: 'ov-hint' }, 'Toca para continuar'),
  ), 2200);
}

async function bigWin(amount, x) {
  const label = x >= 100 ? '¡SÚPER PREMIO!' : x >= 40 ? '¡MEGA PREMIO!' : '¡GRAN PREMIO!';
  const num = el('div', { class: 'ov-num' }, money(0));
  const parts = el('div', { class: 'particles' });
  const glyphs = ['💰', '✨', '⭐', '💎'];
  for (let i = 0; i < 36; i++) {
    parts.append(el('span', { class: 'particle', style: { left: `${Math.random() * 100}%`, fontSize: `${18 + Math.random() * 22}px`, animationDuration: `${1.6 + Math.random() * 1.8}s`, animationDelay: `${Math.random() * 1.2}s` } }, Skin || S.info.theme.symbolArt ? '' : glyphs[i % glyphs.length]));
  }
  Sound.big();
  const dur = S.turbo ? 1200 : 2600;
  const t0 = performance.now();
  let raf;
  const tick = (t) => { const p = Math.min(1, (t - t0) / dur); num.textContent = money(amount * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  await timedOverlay(el('div', { class: 'ov-card' }, parts, el('div', { class: 'ov-title' }, label), num, el('div', { class: 'ov-kicker' }, `${x.toFixed(1)}x la apuesta`)), dur + 800);
  cancelAnimationFrame(raf);
}

// ───────────────────────────── Auto ─────────────────────────────
function renderAuto() {
  const btn = $('#spinBtn');
  btn.classList.toggle('auto', S.auto > 0);
  if (btn.dataset.stopLabel) btn.setAttribute('aria-label', S.auto > 0 ? btn.dataset.stopLabel : 'Girar');
  $('#spinAuto').textContent = S.auto > 0 ? S.auto : '';
  $('#autoBtn').classList.toggle('on', S.auto > 0);
}
function stopAuto() { S.auto = 0; renderAuto(); }
function startAuto(n) {
  S.auto = n;
  S.stopOnFeature = $('#autoStopFeature').checked;
  $('#autoDlg').close();
  renderAuto();
  spin();
}

// ───────────────────────────── Menú ─────────────────────────────
function openMenu(tab = 'pay') {
  $('#menuDlg').showModal();
  showTab(tab);
}
function showTab(tab) {
  document.querySelectorAll('.stab').forEach((s) => s.classList.toggle('on', s.dataset.tab === tab));
  const body = $('#menuBody');
  body.replaceChildren();
  if (tab === 'pay') body.append(paytable());
  if (tab === 'rules') body.append(rules());
  if (tab === 'hist') history(body);
}

function paytable() {
  const i = S.info;
  const b = bet();
  const box = el('div', {});
  box.append(el('p', { class: 'rules' }, el('span', {}, `Importes para la apuesta actual de ${money(b)}.`)));
  const rows = i.paytable.slice().sort((a, b2) => Math.max(...b2.pays.map((p) => p.x)) - Math.max(...a.pays.map((p) => p.x)));
  for (const row of rows) {
    const d = i.symbols[row.sym];
    const tile = el('div', { class: 'pt-tile' }, makeTile(row.sym));
    box.append(el('div', { class: 'pt-row' }, tile, el('div', { class: 'pt-name' }, d.n),
      el('div', { class: 'pt-pays' }, row.pays.filter((p) => p.x > 0).reverse().map((p) => el('span', {}, `${p.label} · `, el('b', {}, money(p.x * b)), i.engine === 'ways' ? ' /comb.' : '')))));
  }
  for (const [k, d] of Object.entries(i.symbols)) {
    if (d.t === 'wild' && i.engine !== 'lines') box.append(el('div', { class: 'pt-row' }, el('div', { class: 'pt-tile' }, makeTile(k)), el('div', { class: 'pt-name' }, d.n), el('div', { class: 'pt-pays' }, 'Sustituye a todos menos al scatter')));
    if (d.t === 'scatter') box.append(el('div', { class: 'pt-row' }, el('div', { class: 'pt-tile' }, makeTile(k)), el('div', { class: 'pt-name' }, d.n), el('div', { class: 'pt-pays' }, `${i.scatter.min}+ activan ${i.scatter.spins} giros gratis`)));
    if (d.t === 'mult') box.append(el('div', { class: 'pt-row' }, el('div', { class: 'pt-tile' }, makeTile('M5')), el('div', { class: 'pt-name' }, d.n), el('div', { class: 'pt-pays' }, `x${i.multValues.free[0]} a x${Math.max(...i.multValues.free)}`)));
  }
  return box;
}

function rules() {
  const i = S.info;
  const list = [];
  if (i.engine === 'lines') {
    list.push(['Cómo se gana', [`Tablero de ${i.cols}×${i.rows} con ${i.lines.length} líneas fijas. Una línea paga cuando tiene ${i.cols} símbolos iguales de izquierda a derecha.`, `El comodín sustituye a cualquier símbolo. ${i.cols} comodines en línea pagan el premio mayor de la tabla.`, `Si toda la pantalla es un mismo símbolo (o comodines), la ganancia se multiplica x${i.fullScreenMult}.`]]);
    if (i.feature?.type === 'respinLock') list.push(['Respin de la suerte', ['Puede activarse al azar en cualquier giro.', 'Se elige un símbolo; solo pueden caer ese símbolo, comodines o casillas vacías.', `Los símbolos se bloquean y las casillas vacías giran mientras aparezcan símbolos nuevos, con un máximo de ${i.feature.maxRespins} respins.`]]);
    if (i.feature?.type === 'wildReels') list.push(['Rodillos salvajes', ['Puede activarse al azar en cualquier giro.', 'Uno, dos o tres rodillos completos se convierten en comodín antes de pagar.']]);
  } else if (i.engine === 'ways') {
    list.push(['Cómo se gana', [`${i.ways.toLocaleString('es')} formas de ganar: símbolos iguales en rodillos consecutivos desde la izquierda, en cualquier posición (mínimo 3).`, 'El premio se multiplica por el número de combinaciones.', 'El comodín no aparece en el primer rodillo y sustituye a todo menos al scatter.']]);
    list.push(['Cascadas', ['Los símbolos ganadores desaparecen y caen nuevos. Se repite mientras haya premio.', `Multiplicador del juego base: x${i.ladder.base.join(', x')}. Vuelve a x${i.ladder.base[0]} en cada giro.`]]);
    list.push(['Giros gratis', [`${i.scatter.min} o más scatters al terminar las cascadas dan ${i.scatter.spins} giros (+${i.scatter.extra} por cada scatter extra).`, `Multiplicador en giros gratis: x${i.ladder.free.join(', x')}.`, `${i.scatter.reMin}+ scatters durante los giros gratis dan +${i.scatter.reSpins} giros. Máximo ${i.scatter.maxSpins} giros por ronda.`]]);
  } else {
    list.push(['Cómo se gana', [`${i.tiers[0]} o más símbolos iguales en cualquier posición pagan. El premio depende de la cantidad (${i.tiers.join(', ')}+).`, 'Los ganadores desaparecen y caen nuevos símbolos mientras haya premio.']]);
    list.push(['Multiplicadores', [i.multValues.baseEnabled ? 'Los símbolos multiplicador pueden caer en cualquier giro: si hay premio, se suman al final y multiplican la ganancia del giro.' : 'Los símbolos multiplicador solo aparecen en los giros gratis.', `En giros gratis se suman a un multiplicador acumulado que se aplica a cada giro con premio (x${i.multValues.free[0]} a x${Math.max(...i.multValues.free)}).`]]);
    list.push(['Giros gratis', [`${i.scatter.min}+ scatters activan ${i.scatter.spins} giros gratis.`, `${i.scatter.reMin}+ scatters durante los giros gratis dan +${i.scatter.reSpins} giros.`]]);
  }
  list.push(['Datos del juego', [`RTP teórico: ${i.rtp.toFixed(2)}% (${i.rtpSource === 'par' ? 'medido en simulación' : 'objetivo'}).`, i.volatility ? `Volatilidad: ${i.volatility}. Frecuencia de premio: ${i.hitRate.toFixed(1)}%.` : null, `Premio máximo por ronda: ${i.maxWin.toLocaleString('es')}x la apuesta.`, 'El resultado lo decide el servidor antes de la animación. Un fallo de conexión no cambia el resultado: la ronda queda registrada y el saldo actualizado.', 'Un mal funcionamiento anula todas las jugadas y pagos.'].filter(Boolean)]);
  const box = el('div', { class: 'rules' });
  for (const [h, items] of list) box.append(el('h3', {}, h), el('ul', {}, items.map((t) => el('li', {}, t))));
  box.append(el('h3', {}, 'Versión de la matemática'), el('p', { class: 'mono' }, i.configHash));
  return box;
}

async function history(body) {
  body.append(el('p', { class: 'rules' }, 'Cargando…'));
  try {
    const rows = await api(`/api/history?game=${gameId}`);
    body.replaceChildren();
    if (!rows.length) { body.append(el('p', { class: 'rules' }, 'Aún no hay jugadas en este juego.')); return; }
    const detail = el('div', {});
    const t = el('table', { class: 'hist' }, el('thead', {}, el('tr', {}, el('th', {}, 'Hora'), el('th', {}, 'Apuesta'), el('th', {}, 'Ganancia'), el('th', {}, ''))));
    const tb = el('tbody');
    for (const r of rows) {
      tb.append(el('tr', {},
        el('td', {}, new Date(r.ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })),
        el('td', {}, money(r.bet)),
        el('td', { class: r.win > 0 ? 'w' : '' }, money(r.win)),
        el('td', {}, el('button', { class: 'vbtn', type: 'button', onclick: () => verify(r.roundId, detail) }, 'Verificar')),
      ));
    }
    t.append(tb);
    body.append(detail, t);
  } catch (e) { body.replaceChildren(el('p', { class: 'rules' }, e.message)); }
}

async function verify(id, box) {
  box.replaceChildren(el('div', { class: 'verify-box' }, 'Reproduciendo ronda desde su semilla…'));
  try {
    const v = await api(`/api/rounds/${id}/verify`);
    box.replaceChildren(el('div', { class: `verify-box ${v.ok ? 'ok' : 'bad'}` },
      el('strong', {}, v.ok ? '✓ ' : '✗ ', v.reason), el('br'),
      `Ronda ${v.round.roundId} · asiento #${v.round.seq}`, el('br'),
      `Apuesta ${money(v.round.bet)} · ganancia ${money(v.round.win)}`,
      el('div', { class: 'mono' }, `semilla: ${v.round.seed}`),
      el('div', { class: 'mono' }, `hash resultado: ${v.resultHash}`),
      el('div', { class: 'mono' }, `hash asiento: ${v.round.hash}`),
    ));
  } catch (e) { box.replaceChildren(el('div', { class: 'verify-box bad' }, e.message)); }
}

// ───────────────────────────── Eventos ─────────────────────────────
$('#spinBtn').addEventListener('click', () => { if (S.auto > 0) stopAuto(); else spin(); });
$('#betUp').addEventListener('click', () => changeBet(1));
$('#betDown').addEventListener('click', () => changeBet(-1));
$('#menuBtn').addEventListener('click', () => openMenu('pay'));
$('#autoBtn').addEventListener('click', () => { if (S.auto > 0) return stopAuto(); if (!S.busy) $('#autoDlg').showModal(); });
$('#turboBtn').addEventListener('click', () => { S.turbo = !S.turbo; $('#turboBtn').classList.toggle('on', S.turbo); $('#turboBtn').setAttribute('aria-pressed', String(S.turbo)); try { localStorage.setItem('turbo', S.turbo ? '1' : '0'); } catch {} });
$('#soundBtn').addEventListener('click', () => { Sound.on = !Sound.on; Sound.init(); (Skin?.soundButton || soundButton)(Sound.on); try { localStorage.setItem('sound', Sound.on ? '1' : '0'); } catch {} });
document.querySelectorAll('.stab').forEach((s) => s.addEventListener('click', () => showTab(s.dataset.tab)));
for (const n of [10, 25, 50, 100, 250, 500]) $('#autoGrid').append(el('button', { type: 'button', onclick: () => startAuto(n) }, n));
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat && !e.target.closest('button, a, input, select, textarea, [contenteditable="true"]') && !document.querySelector('dialog[open]')) {
    e.preventDefault();
    if (!$('#overlay').hidden && ovResolve) closeOverlay();
    else if (S.auto > 0) stopAuto();
    else spin();
  }
});

init().catch(e => { toast(e.message || 'No se pudo cargar el juego. Recarga para volver a intentar.', 'error'); });
