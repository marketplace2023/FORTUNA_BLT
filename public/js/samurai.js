import { el } from './api.js';
import { Sound } from './sound.js';
import { createReelPresentation } from './skin-common.js';
export { soundButton } from './skin-common.js';

export const theme = { bg1: '#252626', bg2: '#545650', accent: '#d46957', ink: '#f4efdf', dark: false };
export const reveal = { delay: 70, stagger: 90, duration: 230, travel: .95 };
export const winPause = 620;
const atlas = { W: 0, S: 1, H1: 2, H2: 3, H3: 4, H4: 5, L1: 6, L2: 7, L3: 8, L4: 9 };
let lastStep = 0;
let wasFree = false;

export function tile(sym, def = {}) {
  const i = atlas[sym] ?? 10;
  const t = el('div', { class: `tile samurai-tile t-${def.t || (sym === 'W' ? 'wild' : sym === 'S' ? 'scatter' : 'high')}`, role: 'img', 'aria-label': def.n || sym });
  t.append(el('span', { class: 'samurai-symbol', style: { backgroundPosition: `${(i % 4) * 100 / 3}% ${Math.floor(i / 4) * 50}%` }, 'aria-hidden': 'true' }));
  if (sym === 'W' || sym === 'S') t.append(el('span', { class: 'lab' }, sym === 'W' ? 'WILD' : 'SCATTER'));
  return t;
}
export const { rollOut, stopReel, dispose, resize } = createReelPresentation({ tile, prefix: 'samurai', symbols: Object.keys(atlas), speed: 330, spinPause: 220, maxCell: 165 });

export function banner(kind, data, info, state) {
  const ladder = state.free ? info.ladder.free : info.ladder.base;
  const rawStep = data.step || 0;
  const step = Math.min(rawStep, ladder.length - 1);
  const mult = ladder[step];
  if (state.busy && state.free === wasFree && rawStep > lastStep) Sound.samuraiStep(step);
  lastStep = rawStep; wasFree = state.free;
  const box = el('div', { class: 'samurai-wind', 'data-step': rawStep, 'data-mult': mult, 'data-mode': state.free ? 'free' : 'base' });
  box.append(el('span', { class: 'samurai-wind-label' }, state.free ? 'VIENTO DE SAKURA · GIROS GRATIS' : 'CADA CASCADA IMPULSA EL PREMIO'));
  box.append(el('div', { class: 'samurai-strokes', 'aria-label': `Multiplicador actual por ${mult}` }, ladder.map((m, i) => el('span', { class: `samurai-stroke${i === step ? ' on' : ''}${i < step ? ' passed' : ''}`, 'data-step': i, 'aria-current': i === step ? 'step' : null }, el('small', {}, `0${i + 1}`), el('strong', {}, `×${m}`)))));
  return box;
}
export function freeState(active) {
  lastStep = 0; wasFree = active;
}
export function glyph(g, info) {
  const entry = Object.entries(info.symbols).find(([, d]) => d.g === g);
  return tile(entry?.[0] || 'W', entry?.[1] || info.symbols.W);
}
