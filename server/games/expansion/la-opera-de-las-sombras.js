const operaReels = (weights) =>
  Array.from({ length: 5 }, (_, reel) => (reel === 0 ? { ...weights, W: 0 } : { ...weights }));

export default {
  id: 'la-opera-de-las-sombras',
  name: 'La Ópera de las Sombras',
  engine: 'ways',
  tag: '5×4 · 1.024 ways · Segundo acto',
  blurb: 'El telón abre con cascadas de ×1 a ×6. Tres telones llevan al segundo acto, donde los giros gratis empiezan en ×3 y llegan a ×15.',
  cols: 5,
  rows: 4,
  theme: {
    bg1: '#1b0b16', bg2: '#661c32', accent: '#f0bc72', ink: '#fff5e5', tile: '#fbebda', tile2: '#d7998f',
    scene: 'radial-gradient(ellipse at 50% 9%, #f5c48160, transparent 47%), linear-gradient(0deg, #170913, transparent 48%), repeating-linear-gradient(90deg, #351126cf 0 3%, #771b39b3 8%, #9a3449a1 10%, #3a1027cc 16%), linear-gradient(135deg, #6b203c, #250e21)',
    bonusScene: 'radial-gradient(ellipse at 50% 78%, #efae5c82, transparent 36%), conic-gradient(from 153deg at 50% 0%, transparent 0deg, #fff2aa6b 26deg, transparent 54deg), repeating-linear-gradient(90deg, #330b22 0 7%, #721637 11%, #3c0d25 17%)',
    cue: '¡Se abre el telón!',
    bonusArt: '/assets/expansion/la-opera-de-las-sombras-bonus.webp',
    bonusTitle: 'Segundo acto',
    effect: 'opera',
  },
  cover: ['🎭', '📖', '🕎', '🎻'],
  symbols: {
    W: { g: '🌒', n: 'Sombra del escenario (comodín)', t: 'wild' },
    S: { g: '🎦', n: 'Telón del segundo acto (scatter)', t: 'scatter' },
    H1: { g: '🎭', n: 'Máscara de ópera', t: 'high' },
    H2: { g: '📖', n: 'Libreto', t: 'high' },
    H3: { g: '🕎', n: 'Candelabro', t: 'high' },
    H4: { g: '🎻', n: 'Violín', t: 'high' },
    L1: { g: '🪶', n: 'Pluma de la soprano', t: 'low' },
    L2: { g: '🪭', n: 'Abanico de palco', t: 'low' },
    L3: { g: '🎟️', n: 'Entrada de platea', t: 'low' },
    L4: { g: '🥀', n: 'Rosa marchita', t: 'low' },
  },
  pay: {
    H1: [2.6, 7.45, 23.8], H2: [2.23, 5.58, 17.1], H3: [1.86, 4.46, 12.3], H4: [1.49, 3.72, 10],
    L1: [1.12, 2.6, 6.32], L2: [0.744, 2.23, 5.21], L3: [0.558, 1.49, 3.72], L4: [0.372, 1.12, 2.98],
  },
  payDiv: 20,
  ladder: { base: [1, 1, 2, 4, 6], free: [3, 3, 6, 10, 15] },
  reels: {
    base: operaReels({ W: 2, S: 5, H1: 12, H2: 14, H3: 16, H4: 21, L1: 25, L2: 27, L3: 32, L4: 35 }),
    free: operaReels({ W: 4, S: 4, H1: 14, H2: 16, H3: 19, H4: 22, L1: 26, L2: 27, L3: 31, L4: 33 }),
  },
  scatter: { min: 3, spins: 8, extra: 2, reMin: 3, reSpins: 4, maxSpins: 60 },
  maxWin: 4000,
  targetRtp: 96,
};
