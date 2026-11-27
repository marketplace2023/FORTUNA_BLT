function mirrorReels(outer, middle, inner) {
  return [{ ...outer, W: 0 }, middle, inner, inner, middle, outer];
}

export default {
  id: 'la-mansion-de-los-espejos',
  name: 'La Mansión de los Espejos',
  engine: 'ways',
  tag: '6×3 · 729 ways · Cascadas de reflejos',
  blurb: 'Los rodillos se emparejan desde los extremos hacia el centro. Las cascadas base alternan ×1 y ×2 antes de subir a ×5. Tres espejos abren siete giros gratis.',
  cols: 6,
  rows: 3,
  theme: {
    bg1: '#0c1526', bg2: '#304255', accent: '#a8e9e7', ink: '#f2fbff', tile: '#e9f4f8', tile2: '#a0c4d5',
    scene: 'radial-gradient(ellipse at 50% 35%, #a0d6db65, transparent 44%), linear-gradient(180deg, #0c15263d, #0c1526db 91%), repeating-linear-gradient(90deg, #202c44 0 4%, #9bbcc94f 4% 5%, #324b62 5% 15%, #0e1e33 15% 20%), linear-gradient(145deg, #27354c, #11172b)',
    bonusScene: 'radial-gradient(ellipse at 50% 35%, #c7f8f5a1, transparent 45%), repeating-linear-gradient(125deg, transparent 0 15%, #b7f8f32b 16% 17%, transparent 18% 24%), linear-gradient(90deg, #1e243e, #426379 50%, #1e243e)',
    cue: '¡La sala se refleja!',
    effect: 'mirror',
  },
  cover: ['🪞', '🗝️', '🖼️', '🕰️'],
  symbols: {
    W: { g: '👤', n: 'Silueta reflejada (comodín)', t: 'wild' },
    S: { g: '🪞', n: 'Espejo de salón (scatter)', t: 'scatter' },
    H1: { g: '🗝️', n: 'Llave de la mansión', t: 'high' },
    H2: { g: '🖼️', n: 'Retrato familiar', t: 'high' },
    H3: { g: '🕰️', n: 'Reloj de sobremesa', t: 'high' },
    H4: { g: '💍', n: 'Anillo de plata', t: 'high' },
    L1: { g: '🚪', n: 'Puerta del pasillo', t: 'low' },
    L2: { g: '🕯️', n: 'Vela del vestíbulo', t: 'low' },
    L3: { g: '🪟', n: 'Ventana empañada', t: 'low' },
    L4: { g: '🪑', n: 'Silla del salón', t: 'low' },
  },
  pay: {
    H1: [19.4, 48.6, 146, 304], H2: [14.6, 38.9, 109, 231], H3: [12.1, 31.6, 82.6, 170], H4: [9.71, 26.7, 60.7, 131],
    L1: [7.28, 17, 38.9, 77.7], L2: [4.86, 14.6, 31.6, 65.6], L3: [4.37, 9.71, 24.3, 48.6], L4: [2.91, 7.28, 19.4, 38.9],
  },
  payDiv: 20,
  stack: 2,
  ladder: { base: [1, 2, 1, 2, 3, 5], free: [2, 4, 2, 4, 6, 10] },
  reels: {
    base: mirrorReels(
      { W: 2, S: 4, H1: 14, H2: 14, H3: 18, H4: 20, L1: 26, L2: 30, L3: 34, L4: 38 },
      { W: 3, S: 5, H1: 12, H2: 18, H3: 18, H4: 22, L1: 24, L2: 30, L3: 34, L4: 36 },
      { W: 4, S: 6, H1: 10, H2: 18, H3: 22, H4: 22, L1: 26, L2: 28, L3: 32, L4: 36 },
    ),
    free: mirrorReels(
      { W: 5, S: 4, H1: 14, H2: 16, H3: 18, H4: 20, L1: 26, L2: 30, L3: 34, L4: 38 },
      { W: 6, S: 4, H1: 12, H2: 18, H3: 20, H4: 22, L1: 24, L2: 30, L3: 34, L4: 36 },
      { W: 8, S: 5, H1: 12, H2: 18, H3: 22, H4: 24, L1: 26, L2: 28, L3: 32, L4: 34 },
    ),
  },
  scatter: { min: 3, spins: 7, extra: 1, reMin: 4, reSpins: 5, maxSpins: 54 },
  maxWin: 5500,
  targetRtp: 96,
};
