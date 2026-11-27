import { el } from './api.js';

/** Cosmetic reel motion shared by skins. Final symbols always come from the server. */
export function createReelPresentation({ tile, prefix, symbols, speed = 460, padding = 32, maxCell = 145, spinPause = 380 }) {
  let reels = [];
  function dispose() { reels.forEach(r => { r.animation.cancel(); r.window.remove(); }); reels = []; }
  function stopReel(c) { if (reels[c]) { reels[c].animation.cancel(); reels[c].window.remove(); } }
  async function rollOut(state, board, timing) {
    dispose();
    state.cells.flat().forEach(n => { n.style.visibility = 'hidden'; });
    for (let c = 0; c < state.info.cols; c++) {
      const reelWidth = 'var(--reel-width, var(--cell))';
      const window = el('div', { class: `${prefix}-reel-window`, style: { left: `calc(${c} * ${reelWidth})`, width: reelWidth }, 'aria-hidden': 'true' });
      const belt = el('div', { class: `${prefix}-reel-belt` });
      for (let r = 0; r < symbols.length + state.info.rows; r++) {
        belt.append(el('div', { class: `${prefix}-reel-symbol`, style: { height: 'var(--cell)' } }, tile(symbols[(r + c * 3) % symbols.length])));
      }
      window.append(belt); board.append(window);
      const animation = belt.animate([{ transform: `translateY(calc(${-symbols.length} * var(--cell)))` }, { transform: 'translateY(0)' }], { duration: timing(speed), iterations: Infinity, easing: 'linear' });
      reels.push({ window, animation });
    }
    await new Promise(resolve => setTimeout(resolve, timing(spinPause)));
  }
  function resize(board, state, place) {
    dispose();
    const wrap = document.querySelector('#boardWrap');
    const { cols, rows } = state.info;
    state.cell = Math.max(20, Math.floor(Math.min((wrap.clientWidth - padding) / cols, (wrap.clientHeight - 24) / rows, maxCell)));
    board.style.width = `${state.cell * cols}px`; board.style.height = `${state.cell * rows}px`;
    document.documentElement.style.setProperty('--cell', `${state.cell}px`);
    state.cells.forEach((col, c) => col.forEach((n, r) => place(n, c, r)));
  }
  return { rollOut, stopReel, dispose, resize };
}

export function soundButton(on, button = document.querySelector('#soundBtn')) {
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="${on ? 'M15 8q5 4 0 8M18 5q8 7 0 14' : 'm16 9 6 6m0-6-6 6'}"/></svg>`;
  button.setAttribute('aria-pressed', String(on));
}
