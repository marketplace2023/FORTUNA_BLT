/** Ventana visible de cada rodillo a partir de una parada aleatoria. */
export function spinStrips(strips, rows, rng) {
  const ptr = new Array(strips.length);
  const grid = new Array(strips.length);
  for (let c = 0; c < strips.length; c++) {
    const s = strips[c];
    const p = rng.int(s.length);
    ptr[c] = p;
    const col = new Array(rows);
    for (let r = 0; r < rows; r++) col[r] = s[(p + r) % s.length];
    grid[c] = col;
  }
  return { grid, ptr };
}

/**
 * Cascada: quita las posiciones ganadoras, los supervivientes caen y entran
 * símbolos nuevos desde la tira, justo encima de la ventana (sin RNG extra).
 * `onNew(sym)` permite transformar el símbolo entrante (p. ej. asignar multiplicador).
 */
export function refill(grid, removeSet, strips, ptr, rows, onNew) {
  const next = new Array(grid.length);
  for (let c = 0; c < grid.length; c++) {
    const col = grid[c];
    const survivors = [];
    for (let r = 0; r < rows; r++) if (!removeSet.has(c * rows + r)) survivors.push(col[r]);
    const k = rows - survivors.length;
    if (k === 0) { next[c] = col; continue; }
    const s = strips[c];
    const fresh = new Array(k);
    for (let j = k - 1; j >= 0; j--) {
      ptr[c] = (ptr[c] - 1 + s.length) % s.length;
      fresh[j] = onNew ? onNew(s[ptr[c]]) : s[ptr[c]];
    }
    next[c] = fresh.concat(survivors);
  }
  return next;
}

export function countSym(grid, sym) {
  let n = 0;
  for (const col of grid) for (const v of col) if (v === sym) n++;
  return n;
}

export function posOf(grid, pred) {
  const out = [];
  for (let c = 0; c < grid.length; c++) for (let r = 0; r < grid[c].length; r++) if (pred(grid[c][r])) out.push([c, r]);
  return out;
}
