const base = { S: 3, M: 2, H1: 9, H2: 12, H3: 15, H4: 17, L1: 22, L2: 23, L3: 27, L4: 29 };
const free = { ...base, M: 4, H1: 11, L4: 26 };

export default {
  id: 'taller-de-vidrio',
  name: 'Taller de Vidrio',
  engine: 'anywhere',
  tag: '5×5 · Multiplicadores del horno',
  blurb: 'Siete piezas iguales pagan en cualquier posición. Las brasas multiplican el premio y cuatro hornos abren ocho giros gratis.',
  cols: 5,
  rows: 5,
  theme: {
    bg1: '#221016', bg2: '#66321d', accent: '#ffb565', ink: '#fff1db', tile: '#372025', tile2: '#80462b', dark: true,
    scene: 'radial-gradient(ellipse at 47% 78%, #ffb152 0%, #b04120 14%, #501c19 28%, transparent 53%), repeating-linear-gradient(0deg, #170c11 0 3px, transparent 3px 38px), linear-gradient(150deg, #1c1019, #482721 61%, #160c11)',
    bonusScene: 'radial-gradient(ellipse at 50% 73%, #fff0a1 0%, #f28035 23%, #9c3221 42%, transparent 66%), linear-gradient(160deg, #1d1019, #64261d 62%, #1a0c12)',
    cue: 'El horno aviva las brasas',
    effect: 'glass',
  },
  cover: ['🔥', '🧱', '🍷', '🔮'],
  symbols: {
    S: { g: '♨️', n: 'Horno (scatter)', t: 'scatter' },
    M: { g: '☄️', n: 'Brasa multiplicadora', t: 'mult' },
    H1: { g: '🔮', n: 'Esfera de vidrio', t: 'high' },
    H2: { g: '🍷', n: 'Copa soplada', t: 'high' },
    H3: { g: '🔥', n: 'Soplete', t: 'high' },
    H4: { g: '🧱', n: 'Molde refractario', t: 'high' },
    L1: { g: '🏺', n: 'Jarrón', t: 'low' },
    L2: { g: '🫗', n: 'Jarra', t: 'low' },
    L3: { g: '🔷', n: 'Vidrio azul', t: 'low' },
    L4: { g: '🔶', n: 'Vidrio ámbar', t: 'low' },
  },
  pay: {
    H1: [4.8, 14.5, 43], H2: [2.9, 8.7, 23], H3: [1.75, 5.3, 15.5], H4: [1.25, 3.85, 11.6],
    L1: [0.77, 2.22, 6.75], L2: [0.58, 1.64, 4.8], L3: [0.385, 1.16, 3.38], L4: [0.29, 0.87, 2.6],
  },
  payDiv: 1,
  tiers: [7, 9, 11],
  reels: {
    base: Array.from({ length: 5 }, () => base),
    free: Array.from({ length: 5 }, () => free),
  },
  mult: {
    base: { 2: 56, 3: 28, 6: 11, 12: 4, 24: 1 },
    free: { 2: 37, 4: 35, 6: 18, 12: 8, 24: 2 },
  },
  scatter: { min: 4, spins: 8, reMin: 3, reSpins: 3, maxSpins: 45 },
  maxWin: 4000,
  targetRtp: 96,
};
