import { spinStrips } from './common.js';

/**
 * Motor de líneas (3×3). Todos los pagos se expresan en múltiplos de la apuesta total.
 *
 * Funciones:
 *  - Pantalla llena (un solo símbolo + comodines): multiplica la ganancia por `fullScreenMult`.
 *  - respinLock: se elige un símbolo objetivo; solo caen objetivo, comodín o vacío.
 *    Lo que cae se bloquea y se repite el giro mientras aparezcan símbolos nuevos.
 *  - wildReels: tras el giro, 1..3 rodillos se convierten enteros en comodín.
 */
export function playLines(m, rng) {
  const res = { engine: 'lines', frames: [], feature: null, win: 0, capped: false };
  const f = m.feature;
  const triggered = f && rng.int(10000) < f.per10k;

  if (triggered && f.type === 'respinLock') respinLock(m, rng, res);
  else if (triggered && f.type === 'wildReels') wildReels(m, rng, res);
  else {
    const { grid } = spinStrips(m.strips.base, m.rows, rng);
    res.frames.push(evaluate(m, grid));
  }

  res.win = res.frames.reduce((a, fr) => a + fr.win, 0);
  if (res.win > m.maxWin) { res.win = m.maxWin; res.capped = true; }
  return res;
}

function evaluate(m, grid) {
  const wins = [];
  let sum = 0;
  for (let li = 0; li < m.lines.length; li++) {
    const line = m.lines[li];
    let base = null;
    let ok = true;
    for (let c = 0; c < line.length; c++) {
      const s = grid[c][line[c]];
      if (s === 'X') { ok = false; break; }
      if (s === 'W') continue;
      if (base === null) base = s;
      else if (s !== base) { ok = false; break; }
    }
    if (!ok) continue;
    if (base === null) base = 'W';
    const pay = (m.pay[base]?.[0] || 0) / m.payDiv;
    if (!pay) continue;
    wins.push({ line: li, sym: base, len: line.length, pay, pos: line.map((r, c) => [c, r]) });
    sum += pay;
  }
  let mult = 1;
  let full = false;
  if (wins.length && m.fullScreenMult > 1) {
    let base = null;
    full = true;
    for (const col of grid) for (const s of col) {
      if (s === 'X') full = false;
      else if (s !== 'W') { if (base === null) base = s; else if (s !== base) full = false; }
    }
    if (full) mult = m.fullScreenMult;
  }
  return { grid, wins, mult, win: sum * mult, full };
}

function respinLock(m, rng, res) {
  const f = m.feature;
  const target = rng.pick(f.targetTable);
  res.feature = { type: 'respinLock', target };
  const draw = () => {
    const k = rng.pick(f.cellTable);
    return k === 'T' ? target : k;
  };
  const C = m.cols, R = m.rows;
  let grid = [];
  for (let c = 0; c < C; c++) { const col = []; for (let r = 0; r < R; r++) col.push(draw()); grid.push(col); }
  res.frames.push({ grid, wins: [], mult: 1, win: 0, respin: 0, locked: lockedPos(grid) });

  for (let n = 1; n <= f.maxRespins; n++) {
    const open = [];
    for (let c = 0; c < C; c++) for (let r = 0; r < R; r++) if (grid[c][r] === 'X') open.push([c, r]);
    if (!open.length) break;
    const next = grid.map((col) => col.slice());
    let fresh = 0;
    for (const [c, r] of open) { const s = draw(); next[c][r] = s; if (s !== 'X') fresh++; }
    grid = next;
    res.frames.push({ grid, wins: [], mult: 1, win: 0, respin: n, changed: open, locked: lockedPos(grid) });
    if (!fresh) break;
  }
  const last = res.frames.at(-1);
  Object.assign(last, evaluate(m, last.grid));
}

function lockedPos(grid) {
  const out = [];
  for (let c = 0; c < grid.length; c++) for (let r = 0; r < grid[c].length; r++) if (grid[c][r] !== 'X') out.push([c, r]);
  return out;
}

function wildReels(m, rng, res) {
  const f = m.feature;
  const { grid } = spinStrips(m.strips.base, m.rows, rng);
  const n = Number(rng.pick(f.countTable));
  const reels = [];
  const pool = [...Array(m.cols).keys()];
  for (let i = 0; i < n && pool.length; i++) reels.push(pool.splice(rng.int(pool.length), 1)[0]);
  reels.sort((a, b) => a - b);
  res.feature = { type: 'wildReels', reels };
  res.frames.push({ grid, wins: [], mult: 1, win: 0 });
  const wild = grid.map((col, c) => (reels.includes(c) ? col.map(() => 'W') : col.slice()));
  res.frames.push({ ...evaluate(m, wild), wildReels: reels });
}
