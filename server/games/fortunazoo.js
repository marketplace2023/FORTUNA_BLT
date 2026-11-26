import { canonical, sha256 } from '../util.js';

const names = ['León', 'Tigre', 'Jaguar', 'Leopardo', 'Pantera', 'Elefante', 'Jirafa', 'Cebra', 'Rinoceronte', 'Hipopótamo', 'Gorila', 'Chimpancé', 'Orangután', 'Capuchino', 'Lémur', 'Perezoso', 'Oso hormiguero', 'Tapir', 'Capibara', 'Armadillo', 'Tucán', 'Guacamayo', 'Loro', 'Águila harpía', 'Flamenco', 'Pavo real', 'Cálao', 'Ibis', 'Cocodrilo', 'Anaconda', 'Cobra', 'Iguana', 'Camaleón', 'Rana azul', 'Rana de ojos rojos', 'Tortuga', 'Murciélago', 'Mariposa', 'Ocelote', 'Coatí'];
export const ZOO_DEF = {
  id: 'fortunazoo', name: 'FortunaZoo', engine: 'roulette', tag: '40 animales · Ruleta de la selva',
  blurb: 'Elige tus animales, coloca tus fichas y deja que la selva revele tu fortuna.', cover: [],
  theme: { bg1: '#0c261c', bg2: '#285037', accent: '#e3bc70', ink: '#fff1d4', art: '/assets/zoo/sanctuary-v2.png' },
  zoo: { version: 1, animals: names.map((name, i) => ({ id: i + 1, name })),
    wheel: Array.from({ length: 20 }, (_, i) => [i * 2 + 1, (i * 2 + 20) % 40 + 2]).flat(),
    payoutNumerator: 192, payoutDenominator: 5 },
};

export function buildZoo(def) {
  const { animals, wheel, payoutNumerator: numerator, payoutDenominator: denominator } = def.zoo;
  if (animals.length !== 40 || new Set(animals.map(a => a.id)).size !== 40 || animals.some((a, i) => a.id !== i + 1)
    || wheel.length !== 40 || new Set(wheel).size !== 40 || wheel.some(n => !animals.some(a => a.id === n))) throw Error('FortunaZoo requiere exactamente 40 animales y 40 posiciones únicas');
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || numerator < 1 || denominator < 1) throw Error('Pago de animales inválido');
  const payout = numerator / denominator;
  const bets = Object.fromEntries(animals.map(a => [`animal:${a.id}`, { kind: 'animal', label: `${String(a.id).padStart(2, '0')} · ${a.name}`, numbers: [a.id], payout }]));
  const math = { id: def.id, engine: 'roulette', variant: 'animals', ...def.zoo, bets, colors: Object.fromEntries(animals.map(a => [a.id, a.id % 2 ? 'red' : 'black'])) };
  const par = { rows: [{ kind: 'animal', label: 'Animal exacto', payout, hitRate: 2.5, rtp: payout / 40 * 100 }], rtp: payout / 40 * 100, maxRtp: payout / 40 * 100, maxWin: payout };
  return { def, math, configHash: sha256(canonical(math)), scale: 1, par, play(rng, stakes) {
    const number = wheel[rng.int(40)], animal = animals.find(a => a.id === number);
    const bets = stakes.map(({ id, units }) => {
      if (!math.bets[id] || !Number.isSafeInteger(units) || units <= 0) throw Error('Apuesta animal inválida');
      const win = math.bets[id].numbers[0] === number ? Number(BigInt(units) * BigInt(numerator) / BigInt(denominator)) : 0;
      return { id, label: math.bets[id].label, units, win };
    });
    return { engine: 'roulette', variant: 'animals', number, animal, color: math.colors[number], boosts: [], bets, paid: bets.reduce((sum, b) => sum + b.win, 0), feature: null };
  } };
}

export function publicZoo(game, settings, bets) {
  const d = game.def, chips = bets.filter(b => b <= settings.maxBet);
  return { id: d.id, name: d.name, engine: d.engine, tag: d.tag, blurb: d.blurb, theme: d.theme, cover: d.cover,
    configHash: game.configHash, rtp: game.par.rtp, maxRtp: game.par.maxRtp, rtpSource: 'exact', maxWin: game.par.maxWin,
    minBet: settings.minBet, maxBet: settings.maxBet, chips, defaultChip: chips.includes(1) ? 1 : chips[0],
    zoo: { animals: game.math.animals, wheel: game.math.wheel, payout: game.par.maxWin, probability: 1 / 40 } };
}
