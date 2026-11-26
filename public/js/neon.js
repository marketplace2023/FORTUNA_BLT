import { el } from './api.js';

export const theme = { bg1: '#11151c', bg2: '#24313b', accent: '#ff675f', ink: '#f1f5f7' };
const atlas = { W: 0, H1: 1, H2: 2, H3: 3, L1: 4, L2: 5, L3: 6 };
const symbols = Object.keys(atlas);
let reels = [];

export function tile(sym, def = {}) {
  const i = atlas[sym] ?? 0;
  const t = el('div', { class: `tile neon-tile t-${def.t || (sym === 'W' ? 'wild' : 'high')}`, role: 'img', 'aria-label': def.n || sym });
  t.append(el('span', { class: 'neon-symbol', style: { backgroundPosition: `${(i % 3) * 50}% ${Math.floor(i / 3) * 50}%` }, 'aria-hidden': 'true' }));
  if (sym === 'W') t.append(el('span', { class: 'lab' }, 'WILD'));
  return t;
}

export async function rollOut(state, board, timing) {
  dispose();
  board.querySelectorAll('.neon-wild-column').forEach(n => n.remove());
  document.querySelector('#machine').classList.remove('neon-charged', 'neon-full');
  document.querySelectorAll('[data-reel]').forEach(n => n.classList.remove('on'));
  state.cells.flat().forEach(n => { n.style.visibility = 'hidden'; });
  for (let c = 0; c < 3; c++) {
    const window = el('div', { class: 'neon-reel-window', style: { left: `${c * state.cell}px`, width: `${state.cell}px` }, 'aria-hidden': 'true' });
    const belt = el('div', { class: 'neon-reel-belt' });
    // Cosmetic reel strip. The server supplies every final symbol.
    for (let r = 0; r < 15; r++) belt.append(el('div', { class: 'neon-reel-symbol', style: { height: `${state.cell}px` } }, tile(symbols[(r * 3 + c) % symbols.length])));
    window.append(belt); board.append(window);
    const animation = belt.animate([{ transform: `translateY(${-7 * state.cell}px)` }, { transform: 'translateY(0)' }], { duration: timing(310 + c * 20), iterations: Infinity, easing: 'linear' });
    reels.push({ window, animation });
  }
  await new Promise(resolve => setTimeout(resolve, timing(360)));
}
export function stopReel(c) { if (reels[c]) { reels[c].animation.cancel(); reels[c].window.remove(); } }
export function dispose() { reels.forEach(r => { r.animation.cancel(); r.window.remove(); }); reels = []; }

export function resize(board, state, place) {
  dispose();
  const wrap = document.querySelector('#boardWrap');
  state.cell = Math.max(20, Math.floor(Math.min((wrap.clientWidth - 40) / 3, (wrap.clientHeight - 24) / 3, 170)));
  board.style.width = `${state.cell * 3}px`; board.style.height = `${state.cell * 3}px`;
  document.documentElement.style.setProperty('--cell', `${state.cell}px`);
  state.cells.forEach((col, c) => col.forEach((n, r) => place(n, c, r)));
  // Percentages keep the feature columns aligned during a resize.
}

export function banner(kind, data, info) {
  const machine = document.querySelector('#machine');
  machine.classList.toggle('neon-full', kind === 'full');
  if (kind === 'wild') {
    machine.classList.add('neon-charged');
    return el('div', { class: 'neon-status' }, el('strong', {}, 'DESCARGA WILD'), el('span', {}, `${data.reels.length} ${data.reels.length === 1 ? 'rodillo se transforma' : 'rodillos se transforman'}`));
  }
  if (kind === 'full') return el('div', { class: 'neon-status' }, el('strong', {}, `PANTALLA COMPLETA · ×${info.fullScreenMult}`), el('span', {}, 'El premio se multiplica'));
  return el('div', { class: 'neon-status' }, el('strong', {}, '5 LÍNEAS. UNA DESCARGA.'), el('span', {}, 'Hasta 3 rodillos completos WILD'));
}

export async function wildReels(state, columns, frame, { anim, wait, T, makeTile }) {
  const board = document.querySelector('#board');
  await wait(T(250));
  for (const c of columns) {
    const panel = el('div', { class: 'neon-wild-column', style: { left: `${c * 100 / 3}%`, width: `${100 / 3}%` }, 'aria-hidden': 'true' }, el('span', {}, 'WILD'));
    board.append(panel);
    document.querySelector(`[data-reel="${c}"]`).classList.add('on');
    await anim(panel, [{ opacity: 0, transform: 'scaleY(.05)' }, { opacity: 1, transform: 'scaleY(1)' }], { duration: T(300), easing: 'cubic-bezier(.2,.8,.3,1)' });
    await Promise.all(state.cells[c].map(async (n, r) => {
      n.getAnimations().forEach(a => a.cancel());
      await anim(n, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.3)', opacity: 0 }], { duration: T(120), delay: T(r * 55) });
      n.replaceChildren(makeTile('W'));
      n._sym = 'W';
      await anim(n, [{ transform: 'scale(1.35)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: T(220), easing: 'ease-out' });
    }));
  }
  state.grid = frame.grid;
  await wait(T(300));
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
