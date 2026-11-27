import { el } from './api.js';
import { createReelPresentation } from './skin-common.js';
export { soundButton } from './skin-common.js';

export const theme = { bg1: '#11151c', bg2: '#24313b', accent: '#ff675f', ink: '#f1f5f7' };
const atlas = { W: 0, H1: 1, H2: 2, H3: 3, L1: 4, L2: 5, L3: 6 };
const charged = new Set();

export function tile(sym, def = {}) {
  const i = atlas[sym] ?? 0;
  const t = el('div', { class: `tile neon-tile t-${def.t || (sym === 'W' ? 'wild' : 'high')}`, role: 'img', 'aria-label': def.n || sym });
  t.append(el('span', { class: 'neon-symbol', style: { backgroundPosition: `${(i % 3) * 50}% ${Math.floor(i / 3) * 50}%` }, 'aria-hidden': 'true' }));
  if (sym === 'W') t.append(el('span', { class: 'lab' }, 'WILD'));
  return t;
}

const reels = createReelPresentation({ tile, prefix: 'neon', symbols: Object.keys(atlas), speed: 360, padding: 40, maxCell: 170, spinPause: 360 });
export const { rollOut, stopReel, dispose, resize } = reels;

export function roundStart() {
  charged.clear();
  document.querySelectorAll('#board .neon-wild-column').forEach(n => n.remove());
  document.querySelector('#machine').classList.remove('neon-charged', 'neon-full');
  document.querySelectorAll('.neon-meter .on').forEach(n => n.classList.remove('on'));
}

export function banner(kind, data, info) {
  const machine = document.querySelector('#machine');
  machine.classList.toggle('neon-full', kind === 'full');
  let label = `${info.lines.length} líneas`;
  let detail = 'Hasta 3 rodillos WILD';
  if (kind === 'wild') {
    machine.classList.add('neon-charged');
    label = 'Descarga WILD';
    detail = `${data.reels.length} ${data.reels.length === 1 ? 'rodillo se transforma' : 'rodillos se transforman'}`;
  } else if (kind === 'full') {
    label = `Pantalla completa · ×${info.fullScreenMult}`;
    detail = 'Se multiplica el premio';
  }
  const meter = el('div', { class: 'neon-meter', 'aria-hidden': 'true' });
  for (let c = 0; c < info.cols; c++) meter.append(el('span', { 'data-reel': c, class: charged.has(c) ? 'on' : '' }, c + 1));
  return el('div', { class: 'neon-status' }, el('strong', {}, label), el('span', {}, detail), meter);
}

export async function wildReels(state, columns, frame, { anim, wait, T, makeTile }) {
  const board = document.querySelector('#board');
  await wait(T(250));
  for (const c of columns) {
    const width = `var(--reel-width, ${100 / state.info.cols}%)`;
    const panel = el('div', { class: 'neon-wild-column', style: { left: `calc(${c} * ${width})`, width }, 'aria-hidden': 'true' }, el('span', {}, 'WILD'));
    board.append(panel);
    charged.add(c);
    document.querySelector(`.neon-meter [data-reel="${c}"]`)?.classList.add('on');
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
