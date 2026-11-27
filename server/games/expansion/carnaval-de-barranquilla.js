const paradeReels = (weights) => Array.from({ length: 6 }, () => ({ ...weights }));

export default {
  id: 'carnaval-de-barranquilla',
  name: 'Carnaval de Barranquilla',
  engine: 'anywhere',
  tag: '6×5 · Caídas · Confeti multiplicador',
  blurb: 'Ocho símbolos iguales pagan en cualquier posición. El confeti suma multiplicadores de hasta ×20, y durante los giros gratis esa suma se acumula.',
  cols: 6,
  rows: 5,
  theme: {
    bg1: '#36153e', bg2: '#934964', accent: '#ffd24d', ink: '#fff5ce', tile: '#fff5cf', tile2: '#f5b86d',
    scene: 'radial-gradient(circle at 13% 20%, #ffc947 0 3px, transparent 4px) 0 0 / 63px 71px, radial-gradient(circle at 59% 78%, #52e3c1 0 2px, transparent 3px) 3px 7px / 77px 49px, repeating-linear-gradient(153deg, transparent 0 14%, #ffa63630 14% 15%, transparent 15% 24%, #49d4c34d 24% 26%), linear-gradient(165deg, #503169, #923957 62%, #4b2045)',
    bonusScene: 'radial-gradient(circle at 27% 25%, #ffd951 0 2px, transparent 3px) 0 0 / 37px 47px, radial-gradient(circle at 74% 72%, #5ff6cc 0 3px, transparent 4px) 0 0 / 53px 61px, repeating-conic-gradient(from 8deg at 50% 100%, #812450 0deg 15deg, #a34257 15deg 30deg)',
    cue: '¡Que llueva confeti!',
    effect: 'carnival',
  },
  cover: ['🎭', '🥁', '👒', '🎠'],
  symbols: {
    S: { g: '🎊', n: 'Remate del desfile (scatter)', t: 'scatter' },
    M: { g: '🎉', n: 'Confeti multiplicador', t: 'mult' },
    H1: { g: '🎭', n: 'Máscara de marimonda', t: 'high' },
    H2: { g: '🎠', n: 'Carroza del desfile', t: 'high' },
    H3: { g: '🥁', n: 'Tambor alegre', t: 'high' },
    H4: { g: '👒', n: 'Sombrero vueltiao', t: 'high' },
    L1: { g: '🪇', n: 'Maracas de cumbia', t: 'low' },
    L2: { g: '🪈', n: 'Flauta de millo', t: 'low' },
    L3: { g: '🪶', n: 'Pluma de comparsa', t: 'low' },
    L4: { g: '🌺', n: 'Flor de cumbiambera', t: 'low' },
    L5: { g: '💃', n: 'Bailarina de cumbia', t: 'low' },
  },
  pay: {
    H1: [7.48, 22.4, 67.3], H2: [5.98, 18, 53.9], H3: [3.74, 12, 35.9], H4: [2.69, 7.48, 20.9],
    L1: [1.8, 4.49, 12], L2: [1.35, 2.99, 8.98], L3: [0.898, 2.24, 5.98], L4: [0.673, 1.65, 4.49], L5: [0.449, 1.2, 3.74],
  },
  payDiv: 1,
  tiers: [8, 9, 12],
  reels: {
    base: paradeReels({ S: 4, M: 3, H1: 12, H2: 15, H3: 18, H4: 21, L1: 24, L2: 26, L3: 28, L4: 30, L5: 32 }),
    free: paradeReels({ S: 4, M: 7, H1: 12, H2: 15, H3: 18, H4: 22, L1: 24, L2: 25, L3: 27, L4: 29, L5: 30 }),
  },
  mult: {
    base: { 2: 54, 3: 24, 4: 12, 8: 8, 20: 2 },
    free: { 2: 39, 3: 29, 4: 17, 8: 11, 20: 4 },
  },
  scatter: { min: 4, spins: 8, reMin: 3, reSpins: 3, maxSpins: 56 },
  maxWin: 5000,
  targetRtp: 96,
};
