const base = { S: 5, M: 1, H1: 12, H2: 14, H3: 16, H4: 18, L1: 21, L2: 23, L3: 25, L4: 27, L5: 29 };
const free = { ...base, S: 4, M: 6, H2: 17, L5: 25 };

export default {
  id: 'dinosaurios-de-bolsillo',
  name: 'Dinosaurios de Bolsillo',
  engine: 'anywhere',
  tag: '5×4 · Expedición prehistórica',
  blurb: 'Seis hallazgos iguales pagan. Tres lupas te llevan del laboratorio a la prehistoria en seis giros gratis.',
  cols: 5,
  rows: 4,
  theme: {
    bg1: '#102b2b', bg2: '#30534a', accent: '#c6ec81', ink: '#f1fbe6', tile: '#d7e9cf', tile2: '#8cb89d',
    scene: 'radial-gradient(ellipse at 50% 3%, #b3e8a780, transparent 48%), repeating-linear-gradient(90deg, transparent 0 71px, #9bd8b124 71px 73px), repeating-linear-gradient(0deg, transparent 0 42px, #9bd8b120 42px 44px), linear-gradient(155deg, #133e3d, #2f5144 47%, #142b26)',
    bonusScene: 'radial-gradient(ellipse at 73% 18%, #e6f0a8 0%, #8cb87e 16%, transparent 48%), radial-gradient(ellipse at 0% 108%, #102e20 0 39%, transparent 40%), radial-gradient(ellipse at 100% 109%, #234831 0 44%, transparent 45%), linear-gradient(160deg, #537647, #32593c 65%, #192e22)',
    cue: '¡La prehistoria cobra vida!',
    bonusArt: '/assets/expansion/dinosaurios-de-bolsillo-bonus.webp',
    bonusTitle: 'Viaje a la prehistoria',
    effect: 'fossil',
  },
  cover: ['🥚', '🦴', '🟠', '🐾'],
  symbols: {
    S: { g: '🔍', n: 'Lupa (scatter)', t: 'scatter' },
    M: { g: '🧬', n: 'ADN multiplicador', t: 'mult' },
    H1: { g: '🥚', n: 'Huevo de dinosaurio', t: 'high' },
    H2: { g: '🦴', n: 'Hueso fósil', t: 'high' },
    H3: { g: '🟠', n: 'Ámbar', t: 'high' },
    H4: { g: '🐾', n: 'Huella fósil', t: 'high' },
    L1: { g: '🦕', n: 'Saurópodo', t: 'low' },
    L2: { g: '🦖', n: 'Tiranosaurio', t: 'low' },
    L3: { g: '🌿', n: 'Helecho', t: 'low' },
    L4: { g: '🪨', n: 'Roca sedimentaria', t: 'low' },
    L5: { g: '🪶', n: 'Pluma fósil', t: 'low' },
  },
  pay: {
    H1: [19.4, 44.3, 97, 277], H2: [12.5, 27.7, 66.5, 166], H3: [8.3, 19.4, 44.3, 111],
    H4: [5.54, 13.9, 33.2, 88.6], L1: [3.19, 6.93, 16.6, 44.3], L2: [2.49, 5.54, 13.9, 33.2],
    L3: [1.94, 4.71, 11.1, 27.7], L4: [1.52, 3.6, 8.59, 22.2], L5: [1.11, 2.91, 6.93, 16.6],
  },
  payDiv: 1,
  tiers: [6, 8, 9, 11],
  reels: {
    base: Array.from({ length: 5 }, () => base),
    free: Array.from({ length: 5 }, () => free),
  },
  mult: {
    base: { 2: 75, 3: 22, 5: 3 },
    free: { 2: 58, 3: 27, 5: 12, 10: 3 },
  },
  scatter: { min: 3, spins: 6, reMin: 3, reSpins: 4, maxSpins: 48 },
  maxWin: 3500,
  targetRtp: 96,
};
