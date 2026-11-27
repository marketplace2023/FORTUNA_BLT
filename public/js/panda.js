import { el } from './api.js';
import { createReelPresentation } from './skin-common.js';
export { soundButton } from './skin-common.js';
export const theme = { bg1: '#142d24', bg2: '#3c6650', accent: '#dbbc85', ink: '#f4eedb' };
const atlas = { W: 0, H1: 1, H2: 2, H3: 3, L1: 4, L2: 5, L3: 6 };
let frame = null;
let target = null;
export function tile(sym, def = {}) {
  const t = el('div', { class: `tile panda-tile t-${sym === 'X' ? 'blank' : def.t || 'high'}`, role: 'img', 'aria-label': def.n || sym });
  if (sym !== 'X') {
    const i = atlas[sym] ?? 7;
    t.append(el('span', { class: 'panda-symbol', style: { backgroundPosition: `${i % 3 * 50}% ${Math.floor(i / 3) * 50}%` }, 'aria-hidden': 'true' }));
  }
  if (sym === 'W') t.append(el('span', { class: 'lab' }, 'WILD'));
  return t;
}
const reels = createReelPresentation({ tile, prefix: 'panda', symbols: Object.keys(atlas), speed: 560, maxCell: 170, spinPause: 440 });
export const { rollOut, stopReel, dispose, resize } = reels;
export function roundStart() { frame = null; target = null; }
export async function respinFrame(fr, state, feature, { wait, T }) {
  frame = fr; target = feature.target;
  document.querySelector('#banner').replaceChildren(banner('respin', {}, state.info));
  await wait(T(180));
}
export function banner(kind, data, info) {
  const active = kind === 'respin';
  const full = kind === 'full';
  document.querySelector('#machine').classList.toggle('panda-feature', active);
  document.querySelector('#machine').classList.toggle('panda-full', full);
  const locked = active ? frame?.locked || [] : [];
  const cols = active ? frame?.grid.length ?? info.cols : info.cols;
  const rows = active ? frame?.grid[0].length ?? info.rows : info.rows;
  const step = active ? frame?.respin ?? 0 : 0;
  const total = cols * rows;
  const box = el('div', { class: 'panda-status', 'data-mode': active ? 'respin' : full ? 'full' : 'base', 'data-step': step, 'data-locked': locked.length });
  const label = full ? `Jardín completo · ×${info.fullScreenMult}` : active ? 'Respin con bloqueo' : `${info.lines.length} líneas`;
  const detail = active ? `${locked.length}/${total} bloqueados · respin ${step}` : full ? 'Se multiplica el premio de las líneas' : `Pantalla llena ×${info.fullScreenMult}`;
  const copy = el('div', { class: 'panda-status-copy' }, el('strong', {}, label), el('span', {}, detail));
  const meter = el('div', { class: 'panda-lock-map', style: { gridTemplateColumns: `repeat(${cols}, 1fr)` }, 'aria-hidden': 'true' });
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) meter.append(el('i', { class: locked.some(([x, y]) => x === c && y === r) ? 'on' : '' }));
  if (active && target) {
    const icon = el('div', { class: 'panda-target', 'aria-label': `Símbolo elegido: ${info.symbols[target].n}` }, tile(target, info.symbols[target]));
    box.append(icon);
  }
  box.append(copy, meter);
  return box;
}
export function glyph(g, info) {
  const entry = Object.entries(info.symbols).find(([, d]) => d.g === g);
  return tile(entry?.[0] || 'W', entry?.[1] || info.symbols.W);
}
