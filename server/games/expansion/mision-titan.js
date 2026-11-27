const baseWeights = { W: 2, S: 5, H1: 11, H2: 15, H3: 17, H4: 20, L1: 23, L2: 25, L3: 30, L4: 34 };
const freeWeights = { ...baseWeights, W: 4, H1: 15, H3: 19, L4: 28 };
const reels = (weights) => Array.from({ length: 6 }, (_, i) => ({ ...weights, W: i === 0 ? 0 : weights.W }));

export default {
  id: 'mision-titan',
  name: 'Misión Titán',
  engine: 'ways',
  tag: '6×3 · 729 ways · Cascadas',
  blurb: 'Cada cascada acerca el despegue. La cuenta regresiva lleva el multiplicador hasta ×10, o ×20 en giros gratis.',
  cols: 6, rows: 3,
  theme: {
    bg1: '#271524', bg2: '#7c3f37', accent: '#ffb35d', ink: '#fff2de',
    tile: '#2e1e2f', tile2: '#853b41', dark: true,
    scene: 'linear-gradient(169deg, transparent 73%, #482b35 73.5% 79%, #2c1d2b 79.5%), radial-gradient(ellipse at 72% 36%, #ffbb75 0 9%, #ce714e 9.5% 12%, transparent 12.5%), radial-gradient(ellipse at 70% 60%, #b86246, transparent 65%), linear-gradient(155deg, #25142c 15%, #71364b 58%, #e18b5e)',
    cue: 'Avanza la cuenta regresiva',
    effect: 'launch',
  },
  cover: ['🤖', '👨‍🚀', '🛰️', '⛽'],
  symbols: {
    W: { g: '🚀', n: 'Cohete de ascenso (comodín)', t: 'wild' },
    S: { g: '🪐', n: 'Saturno en el horizonte (scatter)', t: 'scatter' },
    H1: { g: '🤖', n: 'Rover de exploración', t: 'high' },
    H2: { g: '👨‍🚀', n: 'Casco de expedición', t: 'high' },
    H3: { g: '🛰️', n: 'Módulo orbital', t: 'high' },
    H4: { g: '⛽', n: 'Depósito de combustible', t: 'high' },
    L1: { g: '🦾', n: 'Brazo robótico', t: 'low' },
    L2: { g: '🔭', n: 'Telescopio de la colonia', t: 'low' },
    L3: { g: '🧪', n: 'Muestra de metano', t: 'low' },
    L4: { g: '🔌', n: 'Conector del hábitat', t: 'low' },
  },
  pay: { H1: [22.4, 51.2, 112, 256], H2: [16, 40, 86.4, 176], H3: [12.8, 28.8, 64, 134.4], H4: [9.6, 22.4, 48, 107.2], L1: [6.4, 14.4, 30.4, 64], L2: [4.8, 11.2, 24, 52.8], L3: [4, 8, 17.6, 40], L4: [3.2, 6.4, 14.4, 32] },
  payDiv: 20,
  stack: 1,
  ladder: { base: [1, 2, 3, 5, 10], free: [2, 4, 5, 10, 20] },
  reels: { base: reels(baseWeights), free: reels(freeWeights) },
  scatter: { min: 3, spins: 7, extra: 2, reMin: 3, reSpins: 3, maxSpins: 70 },
  maxWin: 6000,
  targetRtp: 96.4,
};
