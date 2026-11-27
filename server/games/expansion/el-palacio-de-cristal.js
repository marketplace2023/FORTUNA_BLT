const baseWeights = { W: 2, S: 4, H1: 12, H2: 16, H3: 20, H4: 24, L1: 26, L2: 28, L3: 32, L4: 34 };
const freeWeights = { ...baseWeights, W: 4, H1: 16, H2: 18, H4: 22, L4: 30 };
const reels = (weights) => Array.from({ length: 5 }, (_, i) => ({ ...weights, W: i === 0 ? 0 : weights.W }));

export default {
  id: 'el-palacio-de-cristal',
  name: 'El Palacio de Cristal',
  engine: 'ways',
  tag: '5×5 · 3.125 ways · Cascadas',
  blurb: 'Cada cascada ilumina el vitral del palacio. El multiplicador llega a ×7 en el salón y a ×21 durante los giros gratis.',
  cols: 5, rows: 5,
  theme: {
    bg1: '#1c2041', bg2: '#454170', accent: '#aaf3ff', ink: '#f9f2ff',
    tile: '#f1edff', tile2: '#a5bde9',
    scene: 'repeating-linear-gradient(135deg, transparent 0 16%, #14172eaa 16.3% 16.8%, transparent 17.1% 32%), repeating-linear-gradient(45deg, transparent 0 16%, #14172e99 16.3% 16.8%, transparent 17.1% 32%), conic-gradient(from 45deg at 50% 42%, #4b7fa4, #71639b, #77bacc, #33436c, #ae76b8, #4b7fa4)',
    cue: 'El vitral se ilumina',
    effect: 'crystal',
  },
  cover: ['👑', '🪄', '🌹', '🪞'],
  symbols: {
    W: { g: '💠', n: 'Roseta de cristal (comodín)', t: 'wild' },
    S: { g: '🏰', n: 'Palacio invernal (scatter)', t: 'scatter' },
    H1: { g: '👑', n: 'Corona helada', t: 'high' },
    H2: { g: '🪄', n: 'Cetro de cristal', t: 'high' },
    H3: { g: '🪞', n: 'Espejo de la corte', t: 'high' },
    H4: { g: '🌹', n: 'Rosa de hielo', t: 'high' },
    L1: { g: '🕯️', n: 'Vela del salón', t: 'low' },
    L2: { g: '💍', n: 'Anillo de plata', t: 'low' },
    L3: { g: '🦢', n: 'Cisne tallado', t: 'low' },
    L4: { g: '🔷', n: 'Fragmento de vitral', t: 'low' },
  },
  pay: { H1: [2.618, 7.201, 22.911], H2: [1.964, 5.564, 16.038], H3: [1.473, 3.928, 11.128], H4: [1.146, 2.946, 7.855], L1: [0.72, 1.964, 4.909], L2: [0.589, 1.473, 3.6], L3: [0.458, 1.146, 2.618], L4: [0.327, 0.818, 1.964] },
  payDiv: 20,
  stack: 2,
  ladder: { base: [1, 2, 3, 4, 7], free: [3, 5, 8, 13, 21] },
  reels: { base: reels(baseWeights), free: reels(freeWeights) },
  scatter: { min: 3, spins: 6, extra: 2, reMin: 4, reSpins: 6, maxSpins: 72 },
  maxWin: 6500,
  targetRtp: 96.4,
};
