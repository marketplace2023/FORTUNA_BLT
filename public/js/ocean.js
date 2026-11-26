import { el } from './api.js';
import { Sound } from './sound.js';
import { createReelPresentation } from './skin-common.js';
export { soundButton } from './skin-common.js';

export const theme = { bg1: '#0c2e48', bg2: '#1e6b7b', accent: '#b1eeeb', ink: '#f0ffff', dark: false };
const atlas = { W: 0, S: 1, H1: 2, H2: 3, H3: 4, H4: 5, L1: 6, L2: 7, L3: 8, L4: 9 };
let lastStep = 0;
let wasFree = false;

export function tile(sym, def = {}) {
  const i = atlas[sym] ?? 10;
  const t = el('div', { class: `tile ocean-tile t-${def.t || (sym === 'W' ? 'wild' : sym === 'S' ? 'scatter' : 'high')}`, role: 'img', 'aria-label': def.n || sym });
  t.append(el('span', { class: 'ocean-symbol', style: { backgroundPosition: `${(i % 4) * 100 / 3}% ${Math.floor(i / 4) * 50}%` }, 'aria-hidden': 'true' }));
  if (sym === 'W' || sym === 'S') t.append(el('span', { class: 'lab' }, sym === 'W' ? 'WILD' : 'SCATTER'));
  return t;
}
export const { rollOut, stopReel, dispose, resize } = createReelPresentation({ tile, prefix: 'ocean', symbols: Object.keys(atlas), speed: 540 });

export function banner(kind, data, info, state) {
  const ladder = state.free ? info.ladder.free : info.ladder.base;
  const rawStep = data.step || 0;
  const step = Math.min(rawStep, ladder.length - 1);
  const mult = ladder[step];
  if (state.busy && state.free === wasFree && rawStep > lastStep) Sound.oceanStep(step);
  lastStep = rawStep; wasFree = state.free;
  document.querySelector('#oceanCurrent').textContent = `×${mult}`;
  document.querySelector('#oceanStep').textContent = rawStep ? `Cascada ${rawStep}` : 'La marea comienza';
  const box = el('div', { class: 'ocean-tide', 'data-step': rawStep, 'data-mult': mult, 'data-mode': state.free ? 'free' : 'base' });
  box.append(el('span', { class: 'ocean-tide-label' }, state.free ? 'LA MAREA DE LAS PERLAS · HASTA ×34' : 'LA SECUENCIA DE LAS PERLAS'));
  box.append(el('div', { class: 'ocean-strand', 'aria-label': `Escalón ${step + 1}, multiplicador por ${mult}` }, ladder.map((m, i) => el('span', { class: `ocean-pearl${i === step ? ' on' : ''}${i < step ? ' passed' : ''}`, 'data-step': i, 'aria-current': i === step ? 'step' : null }, el('strong', {}, `×${m}`)))));
  box.append(el('span', { class: 'ocean-tide-hint' }, state.free ? 'Cada giro gratis comienza de nuevo en ×2' : 'La primera cascada conserva ×1; después, el multiplicador crece'));
  return box;
}
export function freeState(active) {
  lastStep = 0; wasFree = active;
  document.querySelector('#oceanMode').textContent = active ? 'LA MAREA DE LAS PERLAS' : 'EL SECRETO DE LA MAREA';
}
export function glyph(g, info) {
  const entry = Object.entries(info.symbols).find(([, d]) => d.g === g);
  return tile(entry?.[0] || 'W', entry?.[1] || info.symbols.W);
}
