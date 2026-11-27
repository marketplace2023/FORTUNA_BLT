const terrain = { S: 5, M: 0, H1: 10, H2: 13, H3: 16, H4: 18, L1: 21, L2: 23, L3: 25, L4: 27, L5: 29 };
const radar = { ...terrain, M: 6, L5: 23 };
const rescue = { ...terrain, S: 4, M: 3, H1: 13, L5: 24 };
const rescueRadar = { ...rescue, M: 9, L5: 18 };

export default {
  id: 'rescate-en-marte',
  name: 'Rescate en Marte',
  engine: 'anywhere',
  tag: '5×5 · Radar de rescate',
  blurb: 'Siete equipos iguales pagan. El radar multiplica el premio y cuatro señales de auxilio activan siete giros gratis.',
  cols: 5,
  rows: 5,
  theme: {
    bg1: '#2c1519', bg2: '#653625', accent: '#91f3da', ink: '#fff0e4', tile: '#402028', tile2: '#965032', dark: true,
    scene: 'radial-gradient(circle at 79% 17%, #ffe2af 0 0.9%, transparent 1%), radial-gradient(ellipse at 50% 125%, #b9673b 0 29%, #763723 43%, transparent 44%), radial-gradient(ellipse at 85% 110%, #5a292b 0 38%, transparent 39%), linear-gradient(164deg, #211628, #753d43 66%, #91482c)',
    bonusScene: 'repeating-radial-gradient(circle at 50% 80%, transparent 0 44px, #86ffce31 45px 46px, transparent 47px 76px), conic-gradient(from 294deg at 50% 80%, #53e5aa53, transparent 67deg 360deg), linear-gradient(150deg, #0d252e, #263530 56%, #513225)',
    cue: 'El radar detecta una señal',
    effect: 'radar',
  },
  cover: ['🛸', '☀️', '🚨', '🚙'],
  symbols: {
    S: { g: '🆘', n: 'Señal de auxilio (scatter)', t: 'scatter' },
    M: { g: '📡', n: 'Radar multiplicador', t: 'mult' },
    H1: { g: '🚙', n: 'Vehículo de rescate', t: 'high' },
    H2: { g: '🛸', n: 'Dron explorador', t: 'high' },
    H3: { g: '🚨', n: 'Baliza de emergencia', t: 'high' },
    H4: { g: '☀️', n: 'Panel solar', t: 'high' },
    L1: { g: '🔋', n: 'Batería', t: 'low' },
    L2: { g: '🧭', n: 'Navegador', t: 'low' },
    L3: { g: '⛑️', n: 'Casco de rescate', t: 'low' },
    L4: { g: '🛰️', n: 'Satélite de enlace', t: 'low' },
    L5: { g: '🪨', n: 'Roca marciana', t: 'low' },
  },
  pay: {
    H1: [10.1, 20.2, 82], H2: [6.3, 12.6, 53], H3: [3.79, 8.2, 35.3], H4: [3.15, 6.3, 24],
    L1: [1.89, 4.04, 16.4], L2: [1.51, 3.15, 12.6], L3: [1.2, 2.52, 10.1],
    L4: [0.946, 2.02, 8.2], L5: [0.757, 1.64, 6.3],
  },
  payDiv: 1,
  tiers: [7, 8, 11],
  reels: {
    base: [terrain, radar, terrain, radar, terrain],
    free: [rescue, rescueRadar, rescue, rescueRadar, rescue],
  },
  mult: {
    base: { 2: 54, 4: 32, 5: 12, 10: 2 },
    free: { 2: 46, 4: 31, 8: 17, 10: 6 },
  },
  scatter: { min: 4, spins: 7, reMin: 3, reSpins: 3, maxSpins: 50 },
  maxWin: 4500,
  targetRtp: 96,
};
