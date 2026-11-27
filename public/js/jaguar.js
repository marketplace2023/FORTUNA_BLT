import { el } from './api.js';
import { Sound } from './sound.js';
import { createReelPresentation } from './skin-common.js';
export { soundButton } from './skin-common.js';

export const theme = { bg1: '#1d3326', bg2: '#496344', accent: '#e6c175', ink: '#fff0cf', dark: false };
const atlas = { W: 0, S: 1, H1: 2, H2: 3, H3: 4, H4: 5, L1: 6, L2: 7, L3: 8, L4: 9 };
let lastStep = 0;
let wasFree = false;

export function tile(sym, def = {}) {
  const i = atlas[sym] ?? 10;
  const t = el('div', { class: `tile jaguar-tile t-${def.t || (sym === 'W' ? 'wild' : sym === 'S' ? 'scatter' : 'high')}`, role: 'img', 'aria-label': def.n || sym });
  t.append(el('span', { class: 'jaguar-symbol', style: { backgroundPosition: `${(i % 4) * 100 / 3}% ${Math.floor(i / 4) * 50}%` }, 'aria-hidden': 'true' }));
  if (sym === 'W' || sym === 'S') t.append(el('span', { class: 'lab' }, sym === 'W' ? 'WILD' : 'SCATTER'));
  return t;
}
export const { rollOut, stopReel, dispose, resize } = createReelPresentation({ tile, prefix: 'jaguar', symbols: Object.keys(atlas), speed: 500 });

export function banner(kind, data, info, state) {
  const ladder = state.free ? info.ladder.free : info.ladder.base;
  const rawStep = data.step || 0;
  const step = Math.min(rawStep, ladder.length - 1);
  const mult = ladder[step];
  if (state.busy && state.free === wasFree && rawStep > lastStep) Sound.jaguarStep(step);
  lastStep = rawStep; wasFree = state.free;
  const box = el('div', { class: 'jaguar-ascent', 'data-step': rawStep, 'data-mult': mult, 'data-mode': state.free ? 'free' : 'base' });
  box.append(el('span', { class: 'jaguar-ascent-label' }, state.free ? 'EL TEMPLO DESPIERTA · +2 POR CASCADA' : 'LA ESCALINATA DEL JAGUAR · +1 POR CASCADA'));
  box.append(el('div', { class: 'jaguar-stairs', 'aria-label': `Escalón ${step + 1}, multiplicador por ${mult}` }, ladder.map((m, i) => {
    const stair = el('span', { class: `jaguar-stair${i === step ? ' on' : ''}${i < step ? ' passed' : ''}`, 'data-step': i, 'aria-current': i === step ? 'step' : null }, el('strong', {}, `×${m}`));
    stair.style.setProperty('--level', String(i));
    return stair;
  })));
  return box;
}
export function freeState(active) {
  lastStep = 0; wasFree = active;
}
export function glyph(g, info) {
  const entry = Object.entries(info.symbols).find(([, d]) => d.g === g);
  return tile(entry?.[0] || 'W', entry?.[1] || info.symbols.W);
}
