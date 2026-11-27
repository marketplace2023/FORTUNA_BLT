import { el } from './api.js';

export const theme = { bg1: '#122033', bg2: '#263b52', accent: '#e6bf70', ink: '#fff1ce', dark: false };
const atlas = { S: 0, M: 1, H1: 2, H2: 3, H3: 4, H4: 5, L1: 6, L2: 7, L3: 8, L4: 9, L5: 10 };
const symbols = ['H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4', 'L5', 'S'];
let reels = [];
let accumulated = 0;
let visibleSuns = [];
let mode = 'idle';
let cascade = 0;

export function tile(sym, def = {}) {
  const mult = /^M\d+$/.test(sym);
  const i = atlas[mult ? 'M' : sym] ?? 11;
  const value = mult ? Number(sym.slice(1)) : def.val;
  const t = el('div', { class: `tile pharaoh-tile t-${mult ? 'mult' : def.t || 'high'}`, role: 'img', 'aria-label': mult ? `Sol multiplicador por ${value}` : def.n || sym });
  t.append(el('span', { class: 'pharaoh-symbol', style: { backgroundPosition: `${(i % 4) * 100 / 3}% ${Math.floor(i / 4) * 50}%` }, 'aria-hidden': 'true' }));
  if (mult) t.append(el('span', { class: 'mv' }, `×${value}`));
  if (sym === 'S') t.append(el('span', { class: 'lab' }, 'SCATTER'));
  return t;
}
export function roundStart() { accumulated = 0; visibleSuns = []; mode = 'idle'; cascade = 0; }

export async function rollOut(state, board, timing) {
  dispose(); visibleSuns = []; cascade = 0;
  document.querySelector('#machine').classList.remove('pharaoh-collecting');
  refresh(state);
  state.cells.flat().forEach(n => { n.style.visibility = 'hidden'; });
  for (let c = 0; c < state.info.cols; c++) {
    const window = el('div', { class: 'pharaoh-reel-window', style: { left: `calc(${c} * var(--reel-width, var(--cell)))`, width: 'var(--reel-width, var(--cell))' }, 'aria-hidden': 'true' });
    const belt = el('div', { class: 'pharaoh-reel-belt' });
    // Cosmetic symbols only; no result is selected by this animation.
    for (let r = 0; r < 15; r++) belt.append(el('div', { class: 'pharaoh-reel-symbol', style: { height: 'var(--cell)' } }, tile(symbols[(r + c * 3) % symbols.length])));
    window.append(belt); board.append(window);
    const animation = belt.animate([{ transform: 'translateY(calc(-8 * var(--cell)))' }, { transform: 'translateY(0)' }], { duration: timing(460), iterations: Infinity, easing: 'linear' });
    reels.push({ window, animation });
  }
  await new Promise(resolve => setTimeout(resolve, timing(380)));
}
export function stopReel(c) { if (reels[c]) { reels[c].animation.cancel(); reels[c].window.remove(); } }
export function dispose() { reels.forEach(r => { r.animation.cancel(); r.window.remove(); }); reels = []; }
export function resize(board, state, place) {
  dispose();
  const wrap = document.querySelector('#boardWrap');
  const { cols, rows } = state.info;
  state.cell = Math.max(20, Math.floor(Math.min((wrap.clientWidth - 32) / cols, (wrap.clientHeight - 24) / rows, 145)));
  board.style.width = `${state.cell * cols}px`; board.style.height = `${state.cell * rows}px`;
  document.documentElement.style.setProperty('--cell', `${state.cell}px`);
  state.cells.forEach((col, c) => col.forEach((n, r) => place(n, c, r)));
}

function refresh(state) {
  document.querySelector('#banner').replaceChildren(banner(mode, {}, state.info, state));
}
export function banner(kind, data, info, state) {
  const bank = state.free ? accumulated : mode === 'applied' ? accumulated : 0;
  const box = el('div', { class: 'pharaoh-bank', 'data-mult': bank, 'data-mode': state.free ? 'free' : 'base', 'data-phase': mode });
  const title = state.free ? 'PODER SOLAR ACUMULADO' : mode === 'applied' ? 'PODER SOLAR APLICADO' : '8+ IGUALES EN CUALQUIER POSICIÓN';
  const detail = mode === 'collecting' ? 'Los soles se suman antes de multiplicar' : cascade ? `Caída ${cascade} · las ganancias se suman` : state.free ? 'Se conserva durante los giros gratis' : 'Los soles multiplican el premio del giro';
  const text = el('div', { class: 'pharaoh-bank-text' }, el('strong', {}, title), el('span', {}, detail));
  const chips = el('div', { class: 'pharaoh-sun-values', 'aria-label': 'Soles visibles' });
  visibleSuns.forEach((v, i) => { if (i) chips.append(el('small', {}, '+')); chips.append(el('span', {}, `×${v}`)); });
  if (visibleSuns.length) text.append(chips);
  box.append(text, el('div', { class: 'pharaoh-bank-total', 'aria-label': `Multiplicador ${bank ? 'por ' + bank : 'sin activar'}` }, el('span', {}, bank ? `×${bank}` : '—')));
  return box;
}
export function tumbleFrame(frame, state) {
  cascade = frame.step;
  visibleSuns = frame.grid.flat().filter(s => /^M\d+$/.test(s)).map(s => Number(s.slice(1)));
  mode = 'tumbling';
  refresh(state);
}
export function tumbleEnd(spin, state) {
  mode = 'settled';
  // Retain the prior bank until collectMultipliers finishes the visible transfer.
  refresh(state);
}
export async function collectMultipliers(spin, state, { anim, wait, T }) {
  mode = 'collecting';
  document.querySelector('#machine').classList.add('pharaoh-collecting');
  refresh(state);
  const target = document.querySelector('.pharaoh-bank-total');
  const bounds = target.getBoundingClientRect();
  const total = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const flights = (spin.mPos || []).map(([c, r], i) => {
    const source = state.cells[c][r].getBoundingClientRect();
    const spark = el('span', { class: 'pharaoh-sun-flight', style: { left: `${source.x + source.width / 2}px`, top: `${source.y + source.height / 2}px` }, 'aria-hidden': 'true' }, `×${Number(state.cells[c][r]._sym.slice(1))}`);
    document.body.append(spark);
    return anim(spark, [{ transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${total.x - source.x - source.width / 2}px), calc(-50% + ${total.y - source.y - source.height / 2}px)) scale(.6)`, opacity: 0 }], { duration: T(550), delay: T(i * 65), easing: 'cubic-bezier(.3,.1,.3,1)' }).finally(() => spark.remove());
  });
  await Promise.all(flights);
  accumulated = spin.applied;
  mode = 'applied'; refresh(state);
  await wait(T(200));
  document.querySelector('#machine').classList.remove('pharaoh-collecting');
}
export function freeState(active) { if (active) accumulated = 0; visibleSuns = []; mode = 'idle'; cascade = 0; }
export function glyph(g, info) {
  const entry = Object.entries(info.symbols).find(([, d]) => d.g === g);
  return tile(entry?.[0] || 'H1', entry?.[1] || info.symbols.H1);
}
export function soundButton(on) {
  const b = document.querySelector('#soundBtn');
  b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="${on ? 'M15 8q5 4 0 8M18 5q8 7 0 14' : 'm16 9 6 6m0-6-6 6'}"/></svg>`;
  b.setAttribute('aria-pressed', String(on));
}
