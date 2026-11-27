const straight = { S: 4, M: 2, H1: 10, H2: 12, H3: 14, H4: 16, L1: 18, L2: 20, L3: 22, L4: 24, L5: 26, L6: 27 };
const chicane = { ...straight, H1: 14, H3: 17, L6: 20 };
const grid = { ...straight, S: 5, M: 5, L6: 23 };
const finalLap = { ...chicane, M: 7, L6: 15 };

export default {
  id: 'gran-premio-de-karts',
  name: 'Gran Premio de Karts',
  engine: 'anywhere',
  tag: '7×3 · Tablero luminoso',
  blurb: 'Seis piezas iguales pagan. El tablero luminoso multiplica premios y tres semáforos dan cuatro giros gratis.',
  cols: 7,
  rows: 3,
  theme: {
    bg1: '#171d32', bg2: '#383453', accent: '#f7ee56', ink: '#f9f5fa', tile: '#282843', tile2: '#575076', dark: true,
    scene: 'radial-gradient(ellipse at 50% 9%, #fff49a70, transparent 37%), linear-gradient(180deg, #251d43 0%, #3d3757 34%, #666286 35%, transparent 39%), repeating-conic-gradient(from 90deg at 50% 103%, #0e1528 0deg 5deg, #505371 5deg 6deg, #181f35 6deg 13deg)',
    bonusScene: 'repeating-linear-gradient(118deg, #9cf6ff31 0 2px, transparent 2px 30px), radial-gradient(ellipse at 49% 15%, #ffff68a8, transparent 61%), linear-gradient(154deg, #252750, #422847 48%, #111d34)',
    cue: '¡El tablero marca vuelta rápida!',
    effect: 'kart',
  },
  cover: ['🪖', '🕹️', '🛞', '🏁'],
  symbols: {
    S: { g: '🚦', n: 'Semáforo de salida (scatter)', t: 'scatter' },
    M: { g: '💡', n: 'Tablero multiplicador', t: 'mult' },
    H1: { g: '🏁', n: 'Bandera a cuadros', t: 'high' },
    H2: { g: '🕹️', n: 'Volante de competición', t: 'high' },
    H3: { g: '🪖', n: 'Casco de piloto', t: 'high' },
    H4: { g: '🛞', n: 'Neumático de kart', t: 'high' },
    L1: { g: '⏱️', n: 'Cronómetro', t: 'low' },
    L2: { g: '🧤', n: 'Guante de piloto', t: 'low' },
    L3: { g: '🔧', n: 'Llave de boxes', t: 'low' },
    L4: { g: '📣', n: 'Megáfono', t: 'low' },
    L5: { g: '🏆', n: 'Trofeo', t: 'low' },
    L6: { g: '🎟️', n: 'Pase de paddock', t: 'low' },
  },
  pay: {
    H1: [16.7, 33.4, 92.8, 325], H2: [11.1, 22.3, 63, 208], H3: [7.42, 14.8, 44.5, 148],
    H4: [5.19, 10.2, 31.5, 102], L1: [3.34, 6.68, 20.4, 66.8], L2: [2.78, 5.57, 16.7, 51.9],
    L3: [2.23, 4.45, 13, 40.8], L4: [1.76, 3.52, 10.4, 31.5], L5: [1.39, 2.78, 8.35, 26],
    L6: [1.11, 2.23, 6.49, 20.4],
  },
  payDiv: 1,
  tiers: [6, 7, 9, 12],
  reels: {
    base: [straight, chicane, straight, chicane, straight, chicane, straight],
    free: [grid, finalLap, grid, finalLap, grid, finalLap, grid],
  },
  mult: {
    base: { 2: 82, 3: 12, 4: 5, 8: 1 },
    free: { 2: 51, 3: 30, 4: 13, 8: 5, 16: 1 },
  },
  scatter: { min: 3, spins: 4, reMin: 2, reSpins: 1, maxSpins: 32 },
  maxWin: 3000,
  targetRtp: 96,
};
