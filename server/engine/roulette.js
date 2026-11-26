import { table } from '../rng.js';
import { toUnits, toCredits } from '../util.js';

const BET_TYPES = {
  straight: 'Pleno',
  split: 'Caballo',
  street: 'Transversal',
  trio: 'Trío con cero',
  corner: 'Cuadro',
  six: 'Seisena',
  column: 'Columna',
  dozen: 'Docena',
  outside: 'Suerte sencilla',
};

export const EUROPEAN_WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const range = (start, count) => Array.from({ length: count }, (_, i) => start + i);
const insideId = (kind, numbers) => `${kind}:${numbers.join('-')}`;

function europeanBets(payouts) {
  const all = range(1, 36);
  const bets = {};
  const add = (kind, numbers, label = `${BET_TYPES[kind]} ${numbers.join('–')}`, id = insideId(kind, numbers)) => {
    bets[id] = { kind, label, numbers, payout: payouts[kind] };
  };
  for (const n of range(0, 37)) add('straight', [n], String(n));
  for (const n of range(1, 3)) add('split', [0, n]);
  add('trio', [0, 1, 2]);
  add('trio', [0, 2, 3]);
  add('corner', [0, 1, 2, 3]);
  for (const n of all) {
    if (n % 3) add('split', [n, n + 1]);
    if (n <= 33) add('split', [n, n + 3]);
    if (n % 3 === 1) {
      add('street', range(n, 3));
      if (n <= 31) add('six', range(n, 6));
    }
    if (n <= 33 && n % 3) add('corner', [n, n + 1, n + 3, n + 4]);
  }
  for (const i of range(1, 3)) {
    add('column', all.filter((n) => (n - i) % 3 === 0), `Columna ${i}`, `column:${i}`);
    add('dozen', range((i - 1) * 12 + 1, 12), `${i}.ª docena`, `dozen:${i}`);
  }
  add('outside', range(1, 18), '1 a 18', 'low');
  add('outside', all.filter((n) => n % 2 === 0), 'Par', 'even');
  add('outside', all.filter((n) => RED.has(n)), 'Rojo', 'red');
  add('outside', all.filter((n) => !RED.has(n)), 'Negro', 'black');
  add('outside', all.filter((n) => n % 2), 'Impar', 'odd');
  add('outside', range(19, 18), '19 a 36', 'high');
  return bets;
}

const CALLS = [
  { label: 'Voisins du Zéro', stakes: { 'trio:0-2-3': 2, 'split:4-7': 1, 'split:12-15': 1, 'split:18-21': 1, 'split:19-22': 1, 'corner:25-26-28-29': 2, 'split:32-35': 1 } },
  { label: 'Tiers du Cylindre', stakes: { 'split:5-8': 1, 'split:10-11': 1, 'split:13-16': 1, 'split:23-24': 1, 'split:27-30': 1, 'split:33-36': 1 } },
  { label: 'Orphelins', stakes: { 'straight:1': 1, 'split:6-9': 1, 'split:14-17': 1, 'split:17-20': 1, 'split:31-34': 1 } },
  { label: 'Jeu Zéro', stakes: { 'split:0-3': 1, 'split:12-15': 1, 'straight:26': 1, 'split:32-35': 1 } },
];

export const EUROPEAN_PAYOUTS = { straight: 36, split: 18, street: 12, trio: 12, corner: 9, six: 6, column: 3, dozen: 3, outside: 2 };

export function rouletteMath(def) {
  const { wheel, payouts, boost = null } = def.roulette;
  if (wheel.length !== 37 || new Set(wheel).size !== 37 || range(0, 37).some((n) => !wheel.includes(n))) {
    throw new Error(`${def.id}: la rueda debe contener exactamente los números del 0 al 36`);
  }
  if (Object.keys(BET_TYPES).some((kind) => !Number.isSafeInteger(payouts[kind]) || payouts[kind] < 1)) {
    throw new Error(`${def.id}: pagos de ruleta inválidos`);
  }
  if (boost && (!Number.isInteger(boost.count) || boost.count < 1 || boost.count > wheel.length
    || !Object.keys(boost.weights).length
    || Object.entries(boost.weights).some(([x, w]) => !Number.isSafeInteger(Number(x)) || Number(x) <= payouts.straight || !Number.isSafeInteger(w) || w <= 0)
    || Object.values(boost.weights).reduce((sum, w) => sum + w, 0) > 0x100000000)) {
    throw new Error(`${def.id}: multiplicadores de ruleta inválidos`);
  }
  return {
    id: def.id, engine: 'roulette', version: 1, wheel,
    colors: Object.fromEntries(wheel.map((n) => [n, n === 0 ? 'green' : RED.has(n) ? 'red' : 'black'])),
    bets: europeanBets(payouts),
    boost,
  };
}

export function normalizeRouletteBets(math, bets) {
  if (!Array.isArray(bets) || !bets.length || bets.length > Object.keys(math.bets).length) throw new Error('Coloca al menos una ficha en la mesa');
  const seen = new Set();
  const stakes = bets.map((bet) => {
    const { id, amount } = bet ?? {};
    if (typeof id !== 'string' || !Object.hasOwn(math.bets, id) || seen.has(id)) throw new Error('Hay una posición de apuesta inválida o repetida');
    if (typeof amount !== 'number') throw new Error('Importe de ficha inválido');
    const units = toUnits(amount);
    if (!Number.isSafeInteger(units) || units <= 0 || toCredits(units) !== amount) {
      throw new Error('Importe de ficha inválido');
    }
    seen.add(id);
    return { id, units };
  });
  return stakes.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export function createRoulettePlay(math) {
  const weights = math.boost ? table(math.boost.weights) : null;
  return (rng, stakes) => {
    const number = math.wheel[rng.int(math.wheel.length)];
    const boosts = [];
    if (weights) {
      const available = [...math.wheel];
      for (let i = 0; i < math.boost.count; i++) {
        const [pocket] = available.splice(rng.int(available.length), 1);
        boosts.push({ number: pocket, mult: Number(rng.pick(weights)) });
      }
    }
    const landedBoost = boosts.find((b) => b.number === number);
    let paid = 0;
    const bets = stakes.map(({ id, units }) => {
      const bet = math.bets[id];
      const payout = bet.kind === 'straight' && landedBoost ? landedBoost.mult : bet.payout;
      const win = bet.numbers.includes(number) ? units * payout : 0;
      paid += win;
      return { id, label: bet.label, units, win };
    });
    return { engine: 'roulette', number, color: math.colors[number], boosts, bets, paid, feature: landedBoost ? { type: 'rouletteBoost' } : null };
  };
}

export function roulettePar(math) {
  const rows = Object.entries(BET_TYPES).map(([kind, label]) => {
    const bet = Object.values(math.bets).find((b) => b.kind === kind);
    const hitRate = bet.numbers.length / math.wheel.length;
    const boostRate = kind === 'straight' && math.boost ? math.boost.count / math.wheel.length : 0;
    const weights = Object.entries(math.boost?.weights ?? {});
    const totalWeight = weights.reduce((sum, [, w]) => sum + w, 0);
    const boostedReturn = weights.reduce((sum, [x, w]) => sum + Number(x) * w, 0) / (totalWeight || 1);
    return { kind, label, payout: bet.payout, hitRate: hitRate * 100, rtp: hitRate * ((1 - boostRate) * bet.payout + boostRate * boostedReturn) * 100 };
  });
  const rtps = rows.map((row) => row.rtp);
  return { rows, rtp: Math.min(...rtps), maxRtp: Math.max(...rtps), maxWin: Math.max(...rows.map((row) => row.payout), ...Object.keys(math.boost?.weights ?? {}).map(Number)) };
}

export function publicRoulette(math) {
  return {
    wheel: math.wheel,
    colors: math.colors,
    bets: math.bets,
    calls: CALLS,
    boost: math.boost ? { count: math.boost.count, values: Object.keys(math.boost.weights).map(Number) } : null,
  };
}
