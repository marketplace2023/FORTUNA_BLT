import { el } from './api.js';
import { Sound } from './sound.js';

export const theme = { bg1: '#152d2a', bg2: '#35574b', accent: '#dfc68c', ink: '#f7f1df', dark: false };
const atlas = { W: 0, S: 1, H1: 2, H2: 3, H3: 4, H4: 5, L1: 6, L2: 7, L3: 8, L4: 9 };
const symbols = Object.keys(atlas);
let reels = [];
let lastMult = 1;

export function tile(sym, def = {}) {
  const i = atlas[sym] ?? 10;
  const t = el('div', { class: `tile dragon-tile t-${def.t || (sym === 'W' ? 'wild' : sym === 'S' ? 'scatter' : 'high')}`, role: 'img', 'aria-label': def.n || sym });
  t.append(el('span', { class: 'dragon-symbol', style: { backgroundPosition: `${(i % 4) * 100 / 3}% ${Math.floor(i / 4) * 50}%` }, 'aria-hidden': 'true' }));
  if (sym === 'W' || sym === 'S') t.append(el('span', { class: 'lab' }, sym === 'W' ? 'WILD' : 'SCATTER'));
  return t;
}

export async function rollOut(state, board, timing) {
  dispose();
  state.cells.flat().forEach(n => { n.style.visibility = 'hidden'; });
  for (let c = 0; c < state.info.cols; c++) {
    const window = el('div', { class: 'dragon-reel-window', style: { left: `${c * state.cell}px`, width: `${state.cell}px` }, 'aria-hidden': 'true' });
    const belt = el('div', { class: 'dragon-reel-belt' });
    // This strip is cosmetic; all final results come from the server.
    for (let r = 0; r < 14; r++) belt.append(el('div', { class: 'dragon-reel-symbol', style: { height: `${state.cell}px` } }, tile(symbols[(r + c * 3) % symbols.length])));
    window.append(belt); board.append(window);
    const animation = belt.animate([{ transform: `translateY(${-8 * state.cell}px)` }, { transform: 'translateY(0)' }], { duration: timing(520), iterations: Infinity, easing: 'linear' });
    reels.push({ window, animation });
  }
  await new Promise(resolve => setTimeout(resolve, timing(400)));
}
export function stopReel(c) { if (reels[c]) { reels[c].animation.cancel(); reels[c].window.remove(); } }
export function dispose() { reels.forEach(r => { r.animation.cancel(); r.window.remove(); }); reels = []; }

export function resize(board, state, place) {
  dispose();
  const wrap = document.querySelector('#boardWrap');
  const { cols, rows } = state.info;
  state.cell = Math.max(20, Math.floor(Math.min((wrap.clientWidth - 30) / cols, (wrap.clientHeight - 24) / rows, 145)));
  board.style.width = `${state.cell * cols}px`; board.style.height = `${state.cell * rows}px`;
  document.documentElement.style.setProperty('--cell', `${state.cell}px`);
  state.cells.forEach((col, c) => col.forEach((n, r) => place(n, c, r)));
}

export function banner(kind, data, info, state) {
  const ladder = state.free ? info.ladder.free : info.ladder.base;
  const step = Math.min(data.step || 0, ladder.length - 1);
  const mult = ladder[step];
  const changed = mult !== lastMult;
  document.querySelector('#dragonMult').textContent = `×${mult}`;
  document.querySelector('#dragonStep').textContent = step ? `Cascada ${data.step}` : 'Comienza cada giro';
  if (changed && state.busy && mult > lastMult) Sound.rise(mult);
  lastMult = mult;
  const box = el('div', { class: 'dragon-ladder-wrap' });
  box.append(el('span', { class: 'dragon-ladder-label' }, state.free ? 'PODER DEL DRAGÓN · GIROS GRATIS' : 'CADA CASCADA AUMENTA EL MULTIPLICADOR'));
  box.append(el('div', { class: 'dragon-ladder', 'aria-label': `Multiplicador actual por ${mult}` }, ladder.map((m, i) => el('span', { class: `dragon-rung${i === step ? ' on' : ''}${i < step ? ' passed' : ''}`, 'aria-current': i === step ? 'step' : null }, el('small', {}, '×'), String(m)))));
  return box;
}
export function freeState(active) {
  document.querySelector('#dragonMode').textContent = active ? 'EL DRAGÓN HA DESPERTADO' : 'EL SANTUARIO';
}
export function glyph(g, info) {
  const entry = Object.entries(info.symbols).find(([, d]) => d.g === g);
  return tile(entry?.[0] || 'W', entry?.[1] || info.symbols.W);
}
export function soundButton(on) {
  const b = document.querySelector('#soundBtn');
  b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="${on ? 'M15 8q5 4 0 8M18 5q8 7 0 14' : 'm16 9 6 6m0-6-6 6'}"/></svg>`;
  b.setAttribute('aria-pressed', String(on));
}
