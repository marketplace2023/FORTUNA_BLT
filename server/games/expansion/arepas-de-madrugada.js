const counterReels = (weights) => Array.from({ length: 5 }, () => ({ ...weights }));

export default {
  id: 'arepas-de-madrugada',
  name: 'Arepas de Madrugada',
  engine: 'anywhere',
  tag: '5×4 · Paga en cualquier lugar · Pedidos',
  blurb: 'Seis símbolos iguales completan un pedido. Tres comandas abren seis giros gratis. Cada campana que queda en un giro con premio suma ×2 al multiplicador.',
  cols: 5,
  rows: 4,
  theme: {
    bg1: '#181929', bg2: '#674045', accent: '#f5bd6e', ink: '#fff3dd', tile: '#fff1db', tile2: '#e5aa73',
    scene: 'radial-gradient(ellipse at 29% 10%, #ffc57c9c, transparent 38%), linear-gradient(0deg, #281b24 0 18%, #805444 18% 20%, transparent 21%), repeating-linear-gradient(90deg, #fff4da0e 0 1px, transparent 1px 62px), repeating-linear-gradient(0deg, #fff4da12 0 1px, transparent 1px 41px), linear-gradient(160deg, #594850, #241c2e 80%)',
    cue: '¡Pedido listo!',
    effect: 'kitchen',
  },
  cover: ['🫓', '🍳', '🧀', '🥤'],
  symbols: {
    S: { g: '🧾', n: 'Comanda (scatter)', t: 'scatter' },
    M: { g: '🛎️', n: 'Campana del mostrador', t: 'mult' },
    H1: { g: '🫓', n: 'Arepa recién hecha', t: 'high' },
    H2: { g: '🍳', n: 'Budare', t: 'high' },
    H3: { g: '🧀', n: 'Queso de mano', t: 'high' },
    H4: { g: '🥤', n: 'Papelón con limón', t: 'high' },
    L1: { g: '🧈', n: 'Mantequilla', t: 'low' },
    L2: { g: '🌽', n: 'Harina de maíz', t: 'low' },
    L3: { g: '🥑', n: 'Aguacate', t: 'low' },
    L4: { g: '☕', n: 'Café de madrugada', t: 'low' },
  },
  pay: {
    H1: [7.1, 21.8, 57.4], H2: [4.92, 15, 39.6], H3: [3.69, 10.2, 27.3], H4: [2.59, 7.1, 17.8],
    L1: [1.71, 4.37, 10.9], L2: [1.3, 3.28, 8.19], L3: [0.888, 2.46, 6.55], L4: [0.614, 1.78, 4.78],
  },
  payDiv: 1,
  tiers: [6, 8, 10],
  reels: {
    base: counterReels({ S: 5, M: 1, H1: 13, H2: 16, H3: 18, H4: 21, L1: 23, L2: 25, L3: 27, L4: 29 }),
    free: counterReels({ S: 4, M: 9, H1: 14, H2: 17, H3: 19, H4: 21, L1: 23, L2: 25, L3: 26, L4: 27 }),
  },
  mult: { base: { 2: 1 }, free: { 2: 1 } },
  scatter: { min: 3, spins: 6, reMin: 3, reSpins: 2, maxSpins: 42 },
  maxWin: 2500,
  targetRtp: 96,
};
