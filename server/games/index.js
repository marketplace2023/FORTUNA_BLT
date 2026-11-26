import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG, BETS } from './catalog.js';
import { Drbg, table } from '../rng.js';
import { canonical, sha256, sig3 } from '../util.js';
import { playLines } from '../engine/lines.js';
import { playWays } from '../engine/ways.js';
import { playAnywhere } from '../engine/anywhere.js';
import { createRoulettePlay, publicRoulette, rouletteMath, roulettePar } from '../engine/roulette.js';
import { buildRacing, racingInfo } from './racing.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..', '..');
export const CALIBRATION_FILE = path.join(here, 'calibration.json');
export const PAR_DIR = path.join(ROOT, 'par');

const ENGINES = { lines: playLines, ways: playWays, anywhere: playAnywhere };

const SINGLE = new Set(['W', 'S', 'M']);

/**
 * Tira determinista: los pesos se expanden en bloques ("stacks") de `stack`
 * símbolos iguales y los bloques se barajan con una semilla fija derivada del id.
 * Comodín, scatter y multiplicador nunca van apilados.
 */
export function buildStrip(gameId, label, weights, stack = 1) {
  const blocks = [];
  for (const [sym, w] of Object.entries(weights)) {
    const size = SINGLE.has(sym) ? 1 : stack;
    for (let left = w; left > 0; left -= size) blocks.push(new Array(Math.min(size, left)).fill(sym));
  }
  const rng = new Drbg(sha256(`strip|${gameId}|${label}`));
  for (let i = blocks.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
  }
  return blocks.flat();
}

export function readCalibration() {
  try { return JSON.parse(fs.readFileSync(CALIBRATION_FILE, 'utf8')); } catch { return {}; }
}

export function readPar(id) {
  try { return JSON.parse(fs.readFileSync(path.join(PAR_DIR, `${id}.json`), 'utf8')); } catch { return null; }
}

/**
 * Construye la matemática ejecutable de un juego.
 * `math` es exactamente lo que define el resultado; su hash identifica la versión.
 */
export function buildGame(def, scale = 1) {
  if (def.engine === 'roulette') {
    const math = rouletteMath(def);
    return { def, math, configHash: sha256(canonical(math)), scale: 1, play: createRoulettePlay(math), par: roulettePar(math) };
  }
  if (def.engine === 'race') return buildRacing(def);
  const strips = {};
  for (const [mode, reels] of Object.entries(def.reels)) {
    strips[mode] = reels.map((w, i) => buildStrip(def.id, `${mode}${i}`, w, def.stack || 1));
  }
  const pay = {};
  for (const [k, arr] of Object.entries(def.pay)) pay[k] = arr.map((v) => (v ? sig3(v * scale) : 0));

  const math = {
    id: def.id,
    engine: def.engine,
    cols: def.cols,
    rows: def.rows,
    payDiv: def.payDiv,
    pay,
    strips,
    maxWin: def.maxWin,
    lines: def.lines,
    fullScreenMult: def.fullScreenMult,
    feature: def.feature,
    ladder: def.ladder,
    scatter: def.scatter,
    tiers: def.tiers,
    mult: def.mult,
  };
  const configHash = sha256(canonical(math));

  // Tiempo de ejecución: tablas precalculadas (derivadas de `math`, no cambian el hash).
  const rt = { ...math, payingSymbols: Object.keys(pay).filter((k) => k !== 'W' || def.engine === 'lines') };
  if (def.engine === 'ways' || def.engine === 'anywhere') rt.payingSymbols = Object.keys(pay);
  if (def.feature?.type === 'respinLock') {
    rt.feature = { ...def.feature, targetTable: table(def.feature.targets), cellTable: table(def.feature.cells) };
  } else if (def.feature?.type === 'wildReels') {
    rt.feature = { ...def.feature, countTable: table(def.feature.counts) };
  }
  if (def.mult) rt.multTable = { base: table(def.mult.base), free: table(def.mult.free) };

  const engine = ENGINES[def.engine];
  return {
    def,
    math,
    configHash,
    scale,
    play: (rng) => engine(rt, rng),
  };
}

export function loadGames() {
  const cal = readCalibration();
  const map = new Map();
  for (const def of CATALOG) map.set(def.id, buildGame(def, cal[def.id]?.scale ?? 1));
  return map;
}

/** Ways totales del tablero (informativo). */
const waysCount = (d) => (d.engine === 'ways' ? d.rows ** d.cols : null);

/** Información pública que necesita el cliente: nada de tiras ni pesos. */
export function publicInfo(game, settings) {
  if (game.def.engine === 'race') return racingInfo(game, settings, BETS);
  const d = game.def;
  if (d.engine === 'roulette') {
    const chips = BETS.filter((b) => b <= settings.maxBet);
    return {
      id: d.id, name: d.name, engine: d.engine, tag: d.tag, blurb: d.blurb, theme: d.theme, cover: d.cover,
      configHash: game.configHash, rtp: game.par.rtp, maxRtp: game.par.maxRtp, rtpSource: 'exact',
      maxWin: game.par.maxWin, minBet: settings.minBet, maxBet: settings.maxBet,
      chips, defaultChip: chips.includes(1) ? 1 : chips[0],
      roulette: publicRoulette(game.math),
    };
  }
  const par = readPar(d.id);
  const unit = 1 / d.payDiv;
  const paytable = Object.entries(game.math.pay).map(([sym, arr]) => {
    let labels;
    if (d.engine === 'lines') labels = ['3 en línea'];
    else if (d.engine === 'ways') labels = arr.map((_, i) => `${i + 3}`);
    else labels = d.tiers.map((t, i) => (i + 1 < d.tiers.length ? `${t}-${d.tiers[i + 1] - 1}` : `${t}+`));
    return { sym, pays: arr.map((v, i) => ({ label: labels[i], x: v * unit })) };
  });
  return {
    id: d.id,
    name: d.name,
    engine: d.engine,
    tag: d.tag,
    blurb: d.blurb,
    cols: d.cols,
    rows: d.rows,
    ways: waysCount(d),
    lines: d.lines || null,
    theme: d.theme,
    symbols: d.symbols,
    paytable,
    ladder: d.ladder || null,
    scatter: d.scatter || null,
    feature: d.feature ? { type: d.feature.type, per10k: d.feature.per10k } : null,
    fullScreenMult: d.fullScreenMult || null,
    tiers: d.tiers || null,
    multValues: d.mult ? { base: Object.keys(d.mult.base).map(Number), free: Object.keys(d.mult.free).map(Number) } : null,
    maxWin: d.maxWin,
    rtp: par ? par.rtp : d.targetRtp,
    rtpSource: par ? 'par' : 'target',
    volatility: par?.volatility || null,
    hitRate: par?.hitRate || null,
    configHash: game.configHash,
    bets: BETS.filter((b) => b >= settings.minBet && b <= settings.maxBet),
    defaultBet: BETS.filter((b) => b >= settings.minBet && b <= settings.maxBet).find((b) => b >= 1) ?? settings.minBet,
  };
}

/** Liquida una ronda o reproduce un asiento registrado, en unidades del libro. */
export function settleRound(game, rng, bet, input) {
  if (game.def.engine === 'roulette') {
    const stakes = input;
    if (!stakes?.length || stakes.reduce((total, s) => total + s.units, 0) !== bet) throw new Error('Apuesta de ruleta incoherente');
    const result = game.play(rng, stakes);
    return { result, win: result.paid };
  }
  const result = game.play(rng, input);
  return { result, win: Math.floor(result.win * bet + 1e-6) };
}
