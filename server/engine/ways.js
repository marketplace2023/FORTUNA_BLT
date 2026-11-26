import { spinStrips, refill, countSym } from './common.js';

/**
 * Motor "ways" con cascadas.
 *  - Paga símbolos iguales en rodillos consecutivos desde la izquierda (mínimo 3).
 *    Ganancia = pago × nº de combinaciones (producto de coincidencias por rodillo).
 *  - El comodín (W) sustituye a todo salvo al scatter y no aparece en el rodillo 1.
 *  - Cada cascada avanza la escalera de multiplicadores; se reinicia en cada giro pagado.
 *  - Scatters (S) en la pantalla final >= scatter.min activan giros gratis
 *    con tiras y escalera propias; se pueden reactivar.
 */
export function playWays(m, rng) {
  const res = { engine: 'ways', base: null, free: null, win: 0, capped: false };
  const base = cascadeSpin(m, rng, m.strips.base, m.ladder.base);
  res.base = base;
  let total = base.win;
  const sc = m.scatter;
  if (base.scatters >= sc.min) {
    let left = sc.spins + (base.scatters - sc.min) * sc.extra;
    const free = { awarded: left, spins: [], win: 0, retriggers: 0 };
    while (left > 0 && free.spins.length < sc.maxSpins && total < m.maxWin) {
      left--;
      const s = cascadeSpin(m, rng, m.strips.free, m.ladder.free);
      if (s.scatters >= sc.reMin) {
        const add = sc.reSpins + (s.scatters - sc.reMin) * sc.extra;
        left += add;
        s.retrigger = add;
        free.retriggers++;
      }
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

function cascadeSpin(m, rng, strips, ladder) {
  const R = m.rows;
  let { grid, ptr } = spinStrips(strips, R, rng);
  const frames = [];
  let win = 0;
  for (let i = 0; ; i++) {
    const mult = ladder[Math.min(i, ladder.length - 1)];
    const wins = i < 80 ? evalWays(m, grid) : [];
    if (!wins.length) { frames.push({ grid, wins, mult, win: 0, step: i }); break; }
    let w = 0;
    const rm = new Set();
    for (const x of wins) { w += x.pay; for (const [c, r] of x.pos) rm.add(c * R + r); }
    w *= mult;
    win += w;
    const remove = [...rm].sort((a, b) => a - b).map((k) => [Math.floor(k / R), k % R]);
    frames.push({ grid, wins, mult, win: w, step: i, remove });
    grid = refill(grid, rm, strips, ptr, R);
  }
  return { frames, win, scatters: countSym(grid, 'S'), cascades: frames.length - 1 };
}

function evalWays(m, grid) {
  const wins = [];
  const C = m.cols;
  for (const s of m.payingSymbols) {
    let ways = 1;
    let len = 0;
    const pos = [];
    for (let c = 0; c < C; c++) {
      const col = grid[c];
      let n = 0;
      for (let r = 0; r < col.length; r++) {
        const v = col[r];
        if (v === s || (v === 'W' && c > 0)) { n++; pos.push([c, r]); }
      }
      if (!n) break;
      ways *= n;
      len++;
    }
    if (len < 3) continue;
    const p = m.pay[s][len - 3];
    if (!p) continue;
    wins.push({ sym: s, len, ways, pay: (p * ways) / m.payDiv, pos });
  }
  return wins;
}
