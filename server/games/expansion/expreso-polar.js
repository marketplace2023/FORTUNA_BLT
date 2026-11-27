const baseWeights = { W: 2, S: 4, H1: 12, H2: 14, H3: 18, H4: 20, L1: 24, L2: 28, L3: 30, L4: 32 };
const freeWeights = { ...baseWeights, W: 5, H1: 16, H2: 18, L3: 28, L4: 28 };
const reels = (weights) => Array.from({ length: 5 }, (_, i) => ({ ...weights, W: i === 0 ? 0 : weights.W }));

export default {
  id: 'expreso-polar',
  name: 'Expreso Polar',
  engine: 'ways',
  tag: '5×4 · 1.024 ways · Cascadas',
  blurb: 'Cada cascada hace avanzar el paisaje nevado y eleva el multiplicador hasta ×6. En giros gratis, el expreso llega a ×12.',
  cols: 5, rows: 4,
  theme: {
    bg1: '#09182d', bg2: '#213c53', accent: '#ffc477', ink: '#f3f7ff',
    tile: '#e3eef8', tile2: '#8ea7bf',
    scene: 'linear-gradient(165deg, transparent 69%, #162a3d 69.5% 73%, transparent 73.5%), linear-gradient(155deg, transparent 56%, #a3b7cb 56.5% 62%, #54708d 62.5% 82%, #21364e 82.5%), linear-gradient(207deg, transparent 50%, #c7dae6 50.5% 55%, #47627b 55.5%), radial-gradient(circle at 80% 26%, #fbe5af 0 3%, #e0cc9a55 3.5%, transparent 13%), linear-gradient(#0a1229, #3c5877)',
    cue: 'El expreso gana velocidad',
    effect: 'train',
  },
  cover: ['🚂', '🕰️', '🎫', '🏮'],
  symbols: {
    W: { g: '🚆', n: 'Expreso plateado (comodín)', t: 'wild' },
    S: { g: '🚉', n: 'Andén de montaña (scatter)', t: 'scatter' },
    H1: { g: '🚂', n: 'Locomotora nocturna', t: 'high' },
    H2: { g: '🕰️', n: 'Reloj de estación', t: 'high' },
    H3: { g: '🎫', n: 'Billete perforado', t: 'high' },
    H4: { g: '🏮', n: 'Farol del guardavía', t: 'high' },
    L1: { g: '🧳', n: 'Maleta de cuero', t: 'low' },
    L2: { g: '🧣', n: 'Bufanda de viaje', t: 'low' },
    L3: { g: '🔔', n: 'Campana del andén', t: 'low' },
    L4: { g: '🌲', n: 'Pino nevado', t: 'low' },
  },
  pay: { H1: [4.644, 12.384, 28.896], H2: [3.612, 9.288, 22.188], H3: [2.58, 6.708, 15.48], H4: [2.064, 5.16, 12.384], L1: [1.29, 3.096, 6.708], L2: [1.032, 2.322, 5.676], L3: [0.774, 1.806, 4.128], L4: [0.516, 1.548, 3.612] },
  payDiv: 20,
  stack: 1,
  ladder: { base: [1, 2, 3, 5, 6], free: [2, 4, 6, 9, 12] },
  reels: { base: reels(baseWeights), free: reels(freeWeights) },
  scatter: { min: 3, spins: 8, extra: 3, reMin: 3, reSpins: 4, maxSpins: 80 },
  maxWin: 4500,
  targetRtp: 96.2,
};
