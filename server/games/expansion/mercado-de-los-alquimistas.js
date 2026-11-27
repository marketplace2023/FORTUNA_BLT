const base = { S: 5, M: 3, H1: 10, H2: 12, H3: 14, H4: 16, L1: 18, L2: 20, L3: 22, L4: 24, L5: 26 };
const free = { ...base, M: 6, H1: 12, L5: 23 };

export default {
  id: 'mercado-de-los-alquimistas',
  name: 'Mercado de los Alquimistas',
  engine: 'anywhere',
  tag: '6×4 · Pociones multiplicadoras',
  blurb: 'Ocho símbolos iguales pagan. Las pociones suman sus multiplicadores y cuatro sellos conceden cinco giros gratis.',
  cols: 6,
  rows: 4,
  theme: {
    bg1: '#201132', bg2: '#583052', accent: '#e1f28b', ink: '#fff3e6', tile: '#382249', tile2: '#723765', dark: true,
    scene: 'radial-gradient(ellipse at 11% 67%, #9ab75d68, transparent 44%), radial-gradient(ellipse at 87% 52%, #cd7e9b5c, transparent 46%), repeating-linear-gradient(0deg, transparent 0 57px, #211330 57px 62px), linear-gradient(153deg, #231631, #50314a 55%, #20172f)',
    bonusScene: 'radial-gradient(ellipse at 42% 73%, #c7ee71a8, transparent 39%), radial-gradient(ellipse at 67% 38%, #9c5bc4a0, transparent 55%), linear-gradient(135deg, #321b4d, #421f4d 66%, #243c3c)',
    cue: 'La poción empieza a burbujear',
    effect: 'alchemy',
  },
  cover: ['⚗️', '🍲', '⚖️', '📕'],
  symbols: {
    S: { g: '🔏', n: 'Sello del gremio (scatter)', t: 'scatter' },
    M: { g: '🧪', n: 'Poción multiplicadora', t: 'mult' },
    H1: { g: '📕', n: 'Grimorio', t: 'high' },
    H2: { g: '⚗️', n: 'Frasco de destilación', t: 'high' },
    H3: { g: '⚖️', n: 'Balanza del mercado', t: 'high' },
    H4: { g: '🍲', n: 'Caldero', t: 'high' },
    L1: { g: '🧂', n: 'Sal de roca', t: 'low' },
    L2: { g: '🍄', n: 'Seta lunar', t: 'low' },
    L3: { g: '🧄', n: 'Raíz blanca', t: 'low' },
    L4: { g: '🧿', n: 'Amuleto de la suerte', t: 'low' },
    L5: { g: '🪙', n: 'Moneda del gremio', t: 'low' },
  },
  pay: {
    H1: [6.9, 24, 80], H2: [4.6, 16.1, 48], H3: [3.1, 10.35, 31], H4: [2.07, 6.9, 22],
    L1: [1.27, 4.37, 13.8], L2: [0.98, 3.45, 10.35], L3: [0.75, 2.65, 8.05],
    L4: [0.575, 2.01, 6.33], L5: [0.46, 1.61, 4.83],
  },
  payDiv: 1,
  stack: 2,
  tiers: [8, 10, 13],
  reels: {
    base: Array.from({ length: 6 }, () => base),
    free: Array.from({ length: 6 }, () => free),
  },
  mult: {
    base: { 2: 64, 4: 24, 8: 9, 16: 3 },
    free: { 3: 50, 6: 32, 12: 14, 24: 3, 48: 1 },
  },
  scatter: { min: 4, spins: 5, reMin: 3, reSpins: 2, maxSpins: 35 },
  maxWin: 5500,
  targetRtp: 96,
};
