import { Drbg } from '../rng.js';
import { canonical, sha256 } from '../util.js';

export const RACING_ID = 'hipodromo-royale';
export const RACING_PLACES = Object.freeze({ win: 1, place: 2, show: 3 });
export const RACING_DEF = {
  id: RACING_ID, name: 'Hipódromo Royale', engine: 'race', tag: '8 caballos · Ganador, Place y Show',
  blurb: 'Elige tu caballo. Estudia la pista, compara sus cualidades y vive tu propia carrera.',
  theme: { bg1: '#101f1b', bg2: '#284437', accent: '#d7b77b', ink: '#f5efdf' },
  symbols: { H1: { g: '', n: 'Carrera', t: 'high' } }, maxWin: 100, targetRtp: 96,
  model: {
    version: 2, returnBps: 9600, distances: [1200, 1600, 2000], surfaces: ['Seca', 'Húmeda', 'Pesada'],
    horses: [
      { id: 1, name: 'Relámpago', color: '#d8483e', speed: 94, stamina: 68, start: 92, jockey: 78, ground: 0, distance: 1200 },
      { id: 2, name: 'Bruma Real', color: '#527dd8', speed: 80, stamina: 91, start: 70, jockey: 90, ground: 2, distance: 2000 },
      { id: 3, name: 'Oro Negro', color: '#dbad43', speed: 88, stamina: 81, start: 80, jockey: 86, ground: 1, distance: 1600 },
      { id: 4, name: 'Esmeralda', color: '#45916c', speed: 82, stamina: 86, start: 85, jockey: 82, ground: 0, distance: 1600 },
      { id: 5, name: 'Viento Sur', color: '#a473c5', speed: 91, stamina: 73, start: 86, jockey: 76, ground: 1, distance: 1200 },
      { id: 6, name: 'Centella', color: '#dc8253', speed: 85, stamina: 80, start: 94, jockey: 80, ground: 0, distance: 1200 },
      { id: 7, name: 'Gran Cacique', color: '#73a9b2', speed: 77, stamina: 95, start: 66, jockey: 92, ground: 2, distance: 2000 },
      { id: 8, name: 'Luna de Plata', color: '#c28c9f', speed: 86, stamina: 85, start: 78, jockey: 84, ground: 1, distance: 1600 },
    ],
    // Integers keep the winner draw exact; these coefficients are versioned.
    weights: { speedShort: 40, speedLong: 18, staminaShort: 16, staminaLong: 38, start: 12, jockey: 20, form: 12, surfacePenalty: 8, distancePenalty: 4, baseline: 20 },
    visual: { baseMs: 70000, per400Ms: 23000, startRange: 1200, gapMin: 160, gapRange: 500, paceAmplitude: 0.055 },
  },
};

function placementMarkets(horse, horses, total, returnBps) {
  let second = 0, third = 0;
  for (const first of horses) {
    if (first === horse) continue;
    const firstProbability = first.weight / total;
    const afterFirst = total - first.weight;
    second += firstProbability * horse.weight / afterFirst;
    for (const next of horses) {
      if (next === first || next === horse) continue;
      third += firstProbability * (next.weight / afterFirst) * (horse.weight / (afterFirst - next.weight));
    }
  }
  const market = probability => ({ probability, oddsCents: Math.floor(returnBps / (100 * probability)) });
  return {
    win: { probability: horse.probability, oddsCents: horse.oddsCents },
    place: market(horse.probability + second),
    show: market(horse.probability + second + third),
  };
}

export function raceCard(def, seed) {
  const m = def.model, rng = new Drbg(seed);
  const distance = m.distances[rng.int(m.distances.length)];
  const surface = rng.int(m.surfaces.length);
  const w = m.weights;
  const long = distance === Math.max(...m.distances);
  const horses = m.horses.map(h => {
    const form = 65 + rng.int(31);
    const adaptation = 100 - Math.abs(h.ground - surface) * w.surfacePenalty - Math.abs(h.distance - distance) / 400 * w.distancePenalty;
    const rating = Math.round((h.speed * (long ? w.speedLong : w.speedShort) + h.stamina * (long ? w.staminaLong : w.staminaShort) + h.start * w.start + h.jockey * w.jockey + form * w.form) / 100 + adaptation - 100);
    const weight = Math.max(1, rating - w.baseline) ** 2;
    return { ...h, form, adaptation, rating, weight };
  });
  const total = horses.reduce((n, h) => n + h.weight, 0);
  for (const h of horses) {
    h.probability = h.weight / total;
    h.oddsCents = Math.floor(m.returnBps * total / (100 * h.weight));
    h.odds = h.oddsCents / 100;
    h.returnPct = h.probability * h.odds * 100;
    if (m.version >= 2) h.markets = placementMarkets(h, horses, total, m.returnBps);
  }
  return { distance, surface: m.surfaces[surface], horses };
}

export function buildRacing(def) {
  const math = { id: def.id, engine: def.engine, model: def.model, maxWin: def.maxWin };
  const configHash = sha256(canonical(math));
  return { def, math, configHash, scale: 1, play(rng, input) {
    if (!input || !/^[a-f0-9]{64}$/.test(input.offerSeed)) throw Error('Programa de carrera inválido');
    const card = raceCard(def, input.offerSeed);
    const chosen = card.horses.find(h => h.id === input.horseId);
    if (!chosen) throw Error('Caballo inválido');
    const betType = input.betType === undefined ? 'win' : input.betType;
    if (typeof betType !== 'string' || !Object.hasOwn(RACING_PLACES, betType) || (!chosen.markets && betType !== 'win')) throw Error('Tipo de apuesta inválido');
    // Plackett–Luce: first-place probability is exactly weight / total.
    const remaining = [...card.horses], order = [];
    while (remaining.length) {
      let draw = rng.int(remaining.reduce((n, h) => n + h.weight, 0));
      let i = 0;
      while (draw >= remaining[i].weight) draw -= remaining[i++].weight;
      order.push(remaining.splice(i, 1)[0].id);
    }
    const v = def.model.visual;
    let finish = v.baseMs + (card.distance - 1200) / 400 * v.per400Ms + rng.int(v.startRange);
    const runners = order.map((id, rank) => {
      if (rank) finish += v.gapMin + rng.int(v.gapRange);
      const h = card.horses.find(h => h.id === id);
      return { id, finishMs: finish, pace: (h.start - h.stamina) / 100 * v.paceAmplitude, surge: (rng.int(101) - 50) / 100 * v.paceAmplitude };
    });
    const odds = chosen.markets ? chosen.markets[betType].oddsCents / 100 : chosen.odds;
    const win = order.indexOf(chosen.id) < RACING_PLACES[betType] ? odds : 0;
    return { engine: 'race', card, selected: chosen.id, order, runners, win, ...(chosen.markets && { betType }) };
  } };
}

export function racingInfo(game, settings, bets) {
  const d = game.def;
  return { id: d.id, name: d.name, engine: d.engine, tag: d.tag, blurb: d.blurb, theme: d.theme, symbols: d.symbols,
    maxWin: d.maxWin, rtp: d.targetRtp, rtpSource: 'model', volatility: null, configHash: game.configHash,
    bets: bets.filter(b => b >= settings.minBet && b <= settings.maxBet), returnBps: d.model.returnBps,
  };
}
