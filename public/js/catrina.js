import { el } from './api.js';
import { Sound } from './sound.js';
import { createReelPresentation } from './skin-common.js';
export { soundButton } from './skin-common.js';

export const theme = { bg1: '#291928', bg2: '#56313f', accent: '#f4bd70', ink: '#fff1da', dark: false };
const atlas = { W: 0, S: 1, H1: 2, H2: 3, H3: 4, H4: 5, L1: 6, L2: 7, L3: 8, L4: 9 };
let lastMult = 1;

export function tile(sym, def = {}) {
  const i = atlas[sym] ?? 10;
  const t = el('div', { class: `tile catrina-tile t-${def.t || (sym === 'W' ? 'wild' : sym === 'S' ? 'scatter' : 'high')}`, role: 'img', 'aria-label': def.n || sym });
  t.append(el('span', { class: 'catrina-symbol', style: { backgroundPosition: `${(i % 4) * 100 / 3}% ${Math.floor(i / 4) * 50}%` }, 'aria-hidden': 'true' }));
  if (sym === 'W' || sym === 'S') t.append(el('span', { class: 'lab' }, sym === 'W' ? 'WILD' : 'SCATTER'));
  return t;
}

export const { rollOut, stopReel, dispose, resize } = createReelPresentation({ tile, prefix: 'catrina', symbols: Object.keys(atlas), speed: 490 });

export function banner(kind, data, info, state) {
  const ladder = state.free ? info.ladder.free : info.ladder.base;
  const step = Math.min(data.step || 0, ladder.length - 1);
  const mult = ladder[step];
  if (state.busy && mult > lastMult) Sound.catrinaRise(mult);
  lastMult = mult;
  document.querySelector('#catrinaPower').textContent = `×${mult}`;
  document.querySelector('#catrinaMoment').textContent = data.step ? `Cascada ${data.step}` : 'Cada cascada duplica el multiplicador';
  const box = el('div', { class: 'catrina-procession', 'data-mult': mult, 'data-mode': state.free ? 'free' : 'base' });
  box.append(el('span', { class: 'catrina-procession-label' }, state.free ? 'LA VELADA · HASTA ×64' : 'CADA CASCADA · EL DOBLE'));
  box.append(el('div', { class: 'catrina-candles', 'aria-label': `Multiplicador actual por ${mult}` }, ladder.map((m, i) => el('span', { class: `catrina-candle${i === step ? ' on' : ''}${i < step ? ' passed' : ''}`, 'aria-current': i === step ? 'step' : null }, el('span', { class: 'candle-art', 'aria-hidden': 'true' }), el('strong', {}, `×${m}`)))));
  return box;
}
export function freeState(active) { document.querySelector('#catrinaMode').textContent = active ? 'LA VELADA DE LA FORTUNA' : 'UNA NOCHE PARA CELEBRAR'; }
export function glyph(g, info) {
  const entry = Object.entries(info.symbols).find(([, d]) => d.g === g);
  return tile(entry?.[0] || 'W', entry?.[1] || info.symbols.W);
}
