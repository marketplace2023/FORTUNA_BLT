import { el } from './api.js';
export const theme = { bg1: '#082b28', bg2: '#1b5142', accent: '#f3d38c', ink: '#fff4d7' };

const atlas = { W: 0, H1: 1, H2: 2, H3: 3, L1: 4, L2: 5, L3: 6 };
const symbols = Object.keys(atlas);
export function tile(sym, def = {}) {
  const t = el('div', { class: `tile koi-tile t-${def.t || 'high'}`, role: 'img', 'aria-label': def.n || sym });
  if (sym !== 'X') {
    const i = atlas[sym] ?? 7;
    t.append(el('span', { class: 'koi-symbol', style: { backgroundPosition: `${(i % 3) * 50}% ${Math.floor(i / 3) * 50}%` }, 'aria-hidden': 'true' }));
  }
  if (sym === 'W') t.append(el('span', { class: 'lab' }, 'WILD'));
  return t;
}

let reels = [];
export async function rollOut(state, board, timing) {
  dispose();
  state.cells.flat().forEach(n => { n.style.visibility = 'hidden'; });
  for (let c = 0; c < 3; c++) {
    const window = el('div', { class: 'koi-reel-window', style: { left: `${c * state.cell}px`, width: `${state.cell}px` }, 'aria-hidden': 'true' });
    const belt = el('div', { class: 'koi-reel-belt' });
    // Cosmetic animation only. The server's grid is never derived from this belt.
    for (let r = 0; r < 12; r++) belt.append(el('div', { class: 'koi-reel-symbol', style: { height: `${state.cell}px` } }, tile(symbols[(r + c * 2) % symbols.length])));
    window.append(belt); board.append(window);
    const animation = belt.animate([{ transform: `translateY(${-7 * state.cell}px)` }, { transform: 'translateY(0)' }], { duration: timing(440), iterations: Infinity, easing: 'linear' });
    reels.push({ window, animation });
  }
  await new Promise(resolve => setTimeout(resolve, timing(420)));
}

export function stopReel(c) {
  if (!reels[c]) return;
  reels[c].animation.cancel(); reels[c].window.remove();
}
export function dispose() { reels.forEach(r => { r.animation.cancel(); r.window.remove(); }); reels = []; }

export function banner(kind, data, info) {
  const feature = kind === 'respin';
  document.querySelector('#machine').classList.toggle('koi-feature', feature);
  document.querySelector('#machine').classList.toggle('koi-full', kind === 'full');
  if (feature) return el('div', { class: 'koi-status' }, el('span', { class: 'status-light' }), el('strong', {}, 'Respin de la fortuna'), el('span', {}, data.n ? `Giro ${data.n} · los símbolos se quedan` : 'Lo que cae, se queda'));
  if (kind === 'full') return el('div', { class: 'koi-status' }, el('strong', {}, `Fortuna completa · ×${info.fullScreenMult}`), el('span', {}, 'Tu premio se multiplica'));
  return el('div', { class: 'koi-status' }, el('span', { class: 'status-light' }), el('strong', {}, '5 líneas de fortuna'), el('span', {}, 'Un mismo símbolo en toda la pantalla: ×10'));
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

export function resize(board, state, place) {
  // A resize during a spin changes cell size; remove old-size cosmetic belts.
  dispose();
  const wrap = document.querySelector('#boardWrap');
  state.cell = Math.max(20, Math.floor(Math.min((wrap.clientWidth - 32) / 3, (wrap.clientHeight - 16) / 3, 160)));
  board.style.width = `${state.cell * 3}px`; board.style.height = `${state.cell * 3}px`;
  document.documentElement.style.setProperty('--cell', `${state.cell}px`);
  state.cells.forEach((col, c) => col.forEach((n, r) => place(n, c, r)));
}
