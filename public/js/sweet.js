import { el } from './api.js';
import { createReelPresentation } from './skin-common.js';
export { soundButton } from './skin-common.js';

export const theme = { bg1: '#f5e7d6', bg2: '#eac5bf', accent: '#aa4664', ink: '#533b37', dark: false };
const atlas = { S: 0, M: 1, H1: 2, H2: 3, H3: 4, H4: 5, L1: 6, L2: 7, L3: 8, L4: 9, L5: 10 };
let accumulated = 0;
let visibleBonbons = [];
let phase = 'idle';
let cascade = 0;

export function tile(sym, def = {}) {
  const mult = /^M\d+$/.test(sym);
  const value = mult ? Number(sym.slice(1)) : def.val;
  const i = atlas[mult ? 'M' : sym] ?? 11;
  const t = el('div', { class: `tile sweet-tile t-${mult ? 'mult' : def.t || 'high'}`, role: 'img', 'aria-label': mult ? `Bombón multiplicador por ${value}` : def.n || sym });
  t.append(el('span', { class: 'sweet-symbol', style: { backgroundPosition: `${(i % 4) * 100 / 3}% ${Math.floor(i / 4) * 50}%` }, 'aria-hidden': 'true' }));
  if (mult) t.append(el('span', { class: 'mv' }, `×${value}`));
  if (sym === 'S') t.append(el('span', { class: 'lab' }, 'SCATTER'));
  return t;
}
const reels = createReelPresentation({ tile, prefix: 'sweet', symbols: ['H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4', 'L5', 'S'], speed: 450 });
export const { stopReel, dispose, resize } = reels;
export function roundStart() { accumulated = 0; visibleBonbons = []; phase = 'idle'; cascade = 0; }
export async function rollOut(state, board, timing) {
  visibleBonbons = []; phase = 'idle'; cascade = 0;
  refresh(state);
  return reels.rollOut(state, board, timing);
}
function refresh(state) { document.querySelector('#banner').replaceChildren(banner(phase, {}, state.info, state)); }

export function banner(kind, data, info, state) {
  const active = state.free;
  const bank = active ? accumulated : 0;
  const box = el('div', { class: `sweet-bank${active ? ' active' : ''}`, 'data-mult': bank, 'data-mode': active ? 'free' : 'base', 'data-phase': phase });
  const title = active ? 'LA RECETA DEL BONUS' : '8+ IGUALES EN CUALQUIER POSICIÓN';
  const detail = !active ? 'Bombones multiplicadores solo en giros gratis' : phase === 'collecting' ? 'Los bombones se suman antes de multiplicar' : cascade ? `Caída ${cascade} · el acumulador se conserva` : 'El acumulador se conserva entre giros gratis';
  const text = el('div', { class: 'sweet-bank-text' }, el('strong', {}, title), el('span', {}, detail));
  if (active && visibleBonbons.length) {
    const chips = el('div', { class: 'sweet-values', 'aria-label': 'Bombones visibles' });
    visibleBonbons.forEach((v, i) => { if (i) chips.append(el('small', {}, '+')); chips.append(el('span', {}, `×${v}`)); });
    text.append(chips);
  }
  box.append(text, el('div', { class: `sweet-total${String(bank).length > 3 ? ' wide' : ''}`, 'aria-label': active ? `Multiplicador ${bank ? 'por ' + bank : 'sin activar'}` : 'Acumulador disponible en giros gratis' }, el('span', {}, active ? bank ? `×${bank}` : '—' : 'BONUS')));
  return box;
}
export function tumbleFrame(frame, state) {
  cascade = frame.step;
  visibleBonbons = frame.grid.flat().filter(s => /^M\d+$/.test(s)).map(s => Number(s.slice(1)));
  phase = 'tumbling'; refresh(state);
}
export function tumbleEnd(spin, state) { phase = 'settled'; refresh(state); }
export async function collectMultipliers(spin, state, { anim, wait, T }) {
  if (!state.free) return;
  phase = 'collecting'; refresh(state);
  const target = document.querySelector('.sweet-total').getBoundingClientRect();
  const end = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
  const flights = (spin.mPos || []).map(([c, r], i) => {
    const rect = state.cells[c][r].getBoundingClientRect();
    const start = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    const token = el('span', { class: 'sweet-flight', style: { left: `${start.x}px`, top: `${start.y}px` }, 'aria-hidden': 'true' }, `×${Number(state.cells[c][r]._sym.slice(1))}`);
    document.body.append(token);
    return anim(token, [{ transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${end.x - start.x}px), calc(-50% + ${end.y - start.y}px)) scale(.6)`, opacity: 0 }], { duration: T(520), delay: T(i * 60), easing: 'cubic-bezier(.3,.1,.3,1)' }).finally(() => token.remove());
  });
  await Promise.all(flights);
  accumulated = spin.applied;
  phase = 'applied'; refresh(state);
  await wait(T(180));
}
export function freeState() {
  accumulated = 0; visibleBonbons = []; phase = 'idle'; cascade = 0;
}
export function glyph(g, info) {
  const entry = Object.entries(info.symbols).find(([, d]) => d.g === g);
  return tile(entry?.[0] || 'H1', entry?.[1] || info.symbols.H1);
}
