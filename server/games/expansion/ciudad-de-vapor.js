const baseWeights = { W: 2, S: 6, H1: 12, H2: 16, H3: 18, H4: 24, L1: 30, L2: 34, L3: 36, L4: 40 };
const freeWeights = { ...baseWeights, W: 6, H3: 22, H4: 26, L3: 32, L4: 34 };
const reels = (weights) => Array.from({ length: 6 }, (_, i) => ({ ...weights, W: i === 0 ? 0 : weights.W }));

export default {
  id: 'ciudad-de-vapor',
  name: 'Ciudad de Vapor',
  engine: 'ways',
  tag: '6×4 · 4.096 ways · Cascadas',
  blurb: 'Las cascadas suben la presión de las calderas hasta ×8. En giros gratis, el manómetro llega a ×16.',
  cols: 6, rows: 4,
  theme: {
    bg1: '#241914', bg2: '#634235', accent: '#f6bb79', ink: '#fff4dc',
    tile: '#f5e7d2', tile2: '#d59b69',
    scene: 'linear-gradient(0deg, #291b17 0 15%, transparent 15%), repeating-linear-gradient(90deg, #34231e 0 6%, transparent 6% 14%) left bottom / 100% 24% no-repeat, radial-gradient(ellipse at 64% 61%, #efc39399, transparent 57%), radial-gradient(ellipse at 25% 36%, #c2a48b88, transparent 41%), linear-gradient(145deg, #221d22 10%, #815645 57%, #9e744f)',
    cue: 'El manómetro sube',
    effect: 'steam',
  },
  cover: ['🌀', '🎛️', '♨️', '🎈'],
  symbols: {
    W: { g: '⚙️', n: 'Engranaje maestro (comodín)', t: 'wild' },
    S: { g: '🏭', n: 'Estación de vapor (scatter)', t: 'scatter' },
    H1: { g: '🎈', n: 'Dirigible de cobre', t: 'high' },
    H2: { g: '♨️', n: 'Caldera industrial', t: 'high' },
    H3: { g: '🎛️', n: 'Manómetro', t: 'high' },
    H4: { g: '🌀', n: 'Hélice de latón', t: 'high' },
    L1: { g: '🔩', n: 'Perno de acero', t: 'low' },
    L2: { g: '🛢️', n: 'Barril de lubricante', t: 'low' },
    L3: { g: '🔧', n: 'Llave de taller', t: 'low' },
    L4: { g: '⛓️', n: 'Cadena de transmisión', t: 'low' },
  },
  pay: { H1: [4.803, 10.978, 27.446, 58.323], H2: [3.431, 8.234, 19.212, 43.914], H3: [2.745, 6.175, 15.095, 32.935], H4: [2.058, 4.803, 10.978, 24.702], L1: [1.235, 3.431, 7.548, 16.468], L2: [1.029, 2.745, 6.175, 13.037], L3: [0.824, 2.058, 4.803, 10.978], L4: [0.686, 1.715, 3.774, 8.234] },
  payDiv: 20,
  stack: 2,
  ladder: { base: [1, 2, 4, 6, 8], free: [3, 5, 8, 12, 16] },
  reels: { base: reels(baseWeights), free: reels(freeWeights) },
  scatter: { min: 4, spins: 11, extra: 2, reMin: 3, reSpins: 4, maxSpins: 90 },
  maxWin: 8000,
  targetRtp: 96.2,
};
