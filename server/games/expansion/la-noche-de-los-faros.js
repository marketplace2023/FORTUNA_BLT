const coast = { S: 4, M: 0, H1: 11, H2: 15, H3: 19, H4: 21, L1: 22, L2: 26, L3: 28, L4: 30 };
const beacon = { ...coast, M: 7, L4: 23 };
const nightWatch = { ...coast, S: 3, M: 2, H1: 12, L4: 28 };
const nightBeam = { ...beacon, S: 3, M: 8, H2: 17, L3: 26 };

export default {
  id: 'la-noche-de-los-faros',
  name: 'La Noche de los Faros',
  engine: 'anywhere',
  tag: '4×6 · Haz multiplicador',
  blurb: 'Siete símbolos iguales pagan. El haz multiplica el premio y cuatro campanas de guardia encienden nueve giros gratis.',
  cols: 4,
  rows: 6,
  theme: {
    bg1: '#0d192a', bg2: '#203d53', accent: '#ffe6a0', ink: '#f4f9fb', tile: '#1b3045', tile2: '#40617b', dark: true,
    scene: 'radial-gradient(circle at 16% 20%, #f2ebd7 0 2.6%, #98b1bd59 2.9%, transparent 9%), radial-gradient(circle at 76% 44%, #fff3c1 0 0.85%, transparent 1.15%), conic-gradient(from 253deg at 76% 44%, transparent, #ffe8ab5c 10deg, #fff0bf34 20deg, transparent 36deg), linear-gradient(#29435a, #142538) 77% 79% / 3% 38% no-repeat, radial-gradient(ellipse at 82% 108%, #152635 0 24%, transparent 25%), linear-gradient(175deg, #0b152c 0%, #28465b 64%, #16354e 65%, #091d30 100%)',
    bonusScene: 'radial-gradient(circle at 73% 43%, #fff7e0 0 1%, #ffdf8e85 2%, transparent 7%), conic-gradient(from 245deg at 73% 43%, transparent, #ffdc786d 9deg, #ffedb0a0 21deg, transparent 43deg), radial-gradient(ellipse at 43% 79%, #586d797f, transparent 57%), linear-gradient(160deg, #0e1b35, #29445a 67%, #101e31)',
    cue: 'El haz cruza la costa',
    effect: 'lighthouse',
  },
  cover: ['🗼', '📻', '🛟', '🗺️'],
  symbols: {
    S: { g: '🔔', n: 'Campana de guardia (scatter)', t: 'scatter' },
    M: { g: '🔦', n: 'Haz multiplicador', t: 'mult' },
    H1: { g: '🗼', n: 'Faro costero', t: 'high' },
    H2: { g: '📻', n: 'Radio de guardia', t: 'high' },
    H3: { g: '🗺️', n: 'Carta náutica', t: 'high' },
    H4: { g: '🛟', n: 'Boya salvavidas', t: 'high' },
    L1: { g: '⚓', n: 'Ancla', t: 'low' },
    L2: { g: '🛥️', n: 'Lancha de guardia', t: 'low' },
    L3: { g: '🌊', n: 'Ola de rompiente', t: 'low' },
    L4: { g: '🐚', n: 'Caracola', t: 'low' },
  },
  pay: {
    H1: [10.6, 40.3, 139], H2: [6.24, 23, 76.8], H3: [3.84, 13.4, 46.1], H4: [2.69, 9.6, 33.6],
    L1: [1.92, 6.72, 22.1], L2: [1.39, 4.99, 16.3], L3: [1.01, 3.65, 12.5], L4: [0.768, 2.69, 8.64],
  },
  payDiv: 1,
  tiers: [7, 10, 13],
  reels: {
    base: [coast, coast, coast, beacon],
    free: [nightBeam, nightWatch, nightWatch, nightBeam],
  },
  mult: {
    base: { 2: 70, 5: 21, 9: 7, 18: 2 },
    free: { 3: 58, 5: 25, 9: 13, 18: 3, 36: 1 },
  },
  scatter: { min: 4, spins: 9, reMin: 3, reSpins: 4, maxSpins: 55 },
  maxWin: 6000,
  targetRtp: 96,
};
