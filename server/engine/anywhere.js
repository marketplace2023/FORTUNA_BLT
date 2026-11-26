import { spinStrips, refill, countSym } from './common.js';

/**
 * Motor "pago en cualquier posición" con caídas.
 *  - Un símbolo paga si aparece >= minCount veces en cualquier lugar; el pago depende del tramo.
 *  - Los ganadores desaparecen y caen símbolos nuevos (caída) hasta que no hay premio.
 *  - Símbolos multiplicador (M) llevan un valor sorteado al caer. Al final de la
 *    secuencia, si hubo premio, se suman y multiplican la ganancia de ese giro.
 *  - En giros gratis los multiplicadores se acumulan en un multiplicador global.
 */
export function playAnywhere(m, rng) {
  const res = { engine: 'anywhere', base: null, free: null, win: 0, capped: false };
  const base = tumble(m, rng, m.strips.base, m.multTable.base);
  base.win = base.raw > 0 && base.mSum > 0 ? base.raw * base.mSum : base.raw;
  base.applied = base.raw > 0 && base.mSum > 0 ? base.mSum : 1;
  res.base = base;
  let total = base.win;
  const sc = m.scatter;
  if (base.scatters >= sc.min) {
    let left = sc.spins;
    let gmult = 0;
    const free = { awarded: left, spins: [], win: 0, retriggers: 0 };
    while (left > 0 && free.spins.length < sc.maxSpins && total < m.maxWin) {
      left--;
      const s = tumble(m, rng, m.strips.free, m.multTable.free);
      if (s.raw > 0 && s.mSum > 0) gmult += s.mSum;
      s.globalMult = gmult;
      s.applied = s.raw > 0 && gmult > 0 ? gmult : 1;
      s.win = s.raw * s.applied;
      if (s.scatters >= sc.reMin) { left += sc.reSpins; s.retrigger = sc.reSpins; free.retriggers++; }
      free.spins.push(s);
      free.win += s.win;
      total += s.win;
    }
    res.free = free;
  }
  if (total > m.maxWin) { total = m.maxWin; res.capped = true; }
  res.win = total;
  return res;
}

function tumble(m, rng, strips, multTable) {
  const R = m.rows;
  const onNew = (sym) => (sym === 'M' ? 'M' + rng.pick(multTable) : sym);
  let { grid, ptr } = spinStrips(strips, R, rng);
  grid = grid.map((col) => col.map(onNew));
  const frames = [];
  let raw = 0;
  for (let i = 0; ; i++) {
    const wins = i < 80 ? evalAnywhere(m, grid) : [];
    if (!wins.length) { frames.push({ grid, wins, win: 0, step: i }); break; }
    let w = 0;
    const rm = new Set();
    for (const x of wins) { w += x.pay; for (const [c, r] of x.pos) rm.add(c * R + r); }
    raw += w;
    const remove = [...rm].sort((a, b) => a - b).map((k) => [Math.floor(k / R), k % R]);
    frames.push({ grid, wins, win: w, step: i, remove });
    grid = refill(grid, rm, strips, ptr, R, onNew);
  }
  let mSum = 0;
  const mPos = [];
  for (let c = 0; c < grid.length; c++) for (let r = 0; r < R; r++) {
    const v = grid[c][r];
    if (v[0] === 'M') { mSum += Number(v.slice(1)); mPos.push([c, r]); }
  }
  return { frames, raw, mSum, mPos, scatters: countSym(grid, 'S'), cascades: frames.length - 1 };
}

function evalAnywhere(m, grid) {
  const counts = new Map();
  for (const col of grid) for (const v of col) counts.set(v, (counts.get(v) || 0) + 1);
  const wins = [];
  for (const s of m.payingSymbols) {
    const n = counts.get(s) || 0;
    if (n < m.tiers[0]) continue;
    let t = 0;
    while (t + 1 < m.tiers.length && n >= m.tiers[t + 1]) t++;
    const p = m.pay[s][t];
    if (!p) continue;
    const pos = [];
    for (let c = 0; c < grid.length; c++) for (let r = 0; r < grid[c].length; r++) if (grid[c][r] === s) pos.push([c, r]);
    wins.push({ sym: s, count: n, pay: p / m.payDiv, pos });
  }
  return wins;
}
