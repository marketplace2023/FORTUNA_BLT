/**
 * Simulador / hoja PAR.
 *
 *   node tools/simulate.js                      → PAR de todos los juegos (1M giros c/u)
 *   node tools/simulate.js --game koi-dorado     → uno o más juegos (repetir --game)
 *   node tools/simulate.js --spins 5000000
 *   node tools/simulate.js --calibrate           → ajusta la escala de pagos al RTP objetivo y luego hace la PAR
 *
 * La calibración usa una secuencia de semillas fija: como todas las ganancias son
 * lineales en la tabla de pagos, escalar la tabla escala el RTP casi exactamente.
 * La PAR final se mide con OTRA secuencia de semillas e informa su intervalo de confianza.
 */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const self = fileURLToPath(import.meta.url);

if (isMainThread) await main();
else await worker();

async function main() {
  const args = process.argv.slice(2);
  const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
  const calibrate = args.includes('--calibrate');
  const spins = Number(opt('--spins', 1_000_000));
  const only = new Set(args.flatMap((arg, i) => arg === '--game' ? [args[i + 1]] : []));

  const { CATALOG } = await import('../server/games/catalog.js');
  const { buildGame, readCalibration, CALIBRATION_FILE, PAR_DIR } = await import('../server/games/index.js');
  const cal = readCalibration();
  if (only.has('hipodromo-royale')) { console.error('Usa node tools/test-racing.mjs para validar el modelo de carreras. Las cuotas se derivan de probabilidades exactas.'); process.exit(1); }
  const knownIds = new Set(CATALOG.map(({ id }) => id));
  const unknown = [...only].filter((id) => !knownIds.has(id));
  if (unknown.length) { console.error('Juego no encontrado:', unknown.map((id) => id ?? '(falta id)').join(', ')); process.exit(1); }
  if (!Number.isSafeInteger(spins) || spins <= 0) {
    console.error('--spins requiere un entero positivo');
    process.exit(1);
  }
  const selected = CATALOG.filter((d) => !only.size || only.has(d.id));
  for (const d of selected.filter((d) => d.engine === 'roulette')) {
    const { par } = buildGame(d);
    console.log(`✓ ${d.id} · PAR exacta, calculada por tipo de apuesta`);
    console.table(par.rows.map(({ label, payout, rtp }) => ({ Apuesta: label, Pago: `×${payout}`, RTP: `${rtp.toFixed(4)}%` })));
  }
  const defs = selected.filter((d) => d.engine !== 'roulette' && d.engine !== 'race');
  if (!defs.length) return;

  fs.mkdirSync(PAR_DIR, { recursive: true });
  const queue = [...defs];
  const nWorkers = Math.max(1, Math.min(os.cpus().length - 1, defs.length));
  console.log(`Simulando ${defs.length} juego(s), ${spins.toLocaleString('es')} giros c/u, ${nWorkers} hilos${calibrate ? ', con calibración' : ''}…\n`);
  const t0 = Date.now();
  const results = [];

  await Promise.all(Array.from({ length: nWorkers }, () => new Promise((resolve, reject) => {
    const next = () => {
      const d = queue.shift();
      if (!d) { w.terminate(); resolve(); return; }
      w.postMessage({ id: d.id, scale: cal[d.id]?.scale ?? 1, spins, calibrate, target: d.targetRtp });
    };
    const w = new Worker(self);
    w.on('message', (msg) => {
      if (msg.log) { console.log(msg.log); return; }
      results.push(msg);
      if (calibrate) cal[msg.id] = { scale: msg.scale, target: msg.target, calibratedAt: new Date().toISOString() };
      fs.writeFileSync(path.join(PAR_DIR, `${msg.id}.json`), JSON.stringify(msg.par, null, 2));
      const p = msg.par;
      console.log(`✓ ${msg.id.padEnd(16)} RTP ${p.rtp.toFixed(2)}% ±${p.ci95.toFixed(2)}  hit ${p.hitRate.toFixed(1)}%  feat 1/${p.featureEvery ?? '—'}  max ${p.maxWinX.toFixed(0)}x  vol ${p.volatility}  (${(p.elapsedMs / 1000).toFixed(1)} s)`);
      next();
    });
    w.on('error', reject);
    next();
  })));

  if (calibrate) {
    const sorted = Object.fromEntries(Object.keys(cal).sort().map((k) => [k, cal[k]]));
    fs.writeFileSync(CALIBRATION_FILE, JSON.stringify(sorted, null, 2) + '\n');
    console.log(`\nEscalas guardadas en ${path.relative(process.cwd(), CALIBRATION_FILE)}`);
  }
  console.log(`\nHojas PAR en ${path.relative(process.cwd(), PAR_DIR)}/  ·  ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

async function worker() {
  const { CATALOG } = await import('../server/games/catalog.js');
  const { buildGame } = await import('../server/games/index.js');
  const { Drbg } = await import('../server/rng.js');
  const { sha256 } = await import('../server/util.js');

  parentPort.on('message', ({ id, scale, spins, calibrate, target }) => {
    const def = CATALOG.find((d) => d.id === id);
    let s = scale;
    if (calibrate) {
      for (let it = 0; it < 5; it++) {
        const st = run(buildGame(def, s), spins, sha256(`cal|${id}`));
        const rtp = (st.total / st.n) * 100;
        parentPort.postMessage({ log: `  · ${id} iter ${it + 1}: escala ${s.toFixed(5)} → RTP ${rtp.toFixed(3)}%` });
        if (Math.abs(rtp - target) < 0.05) break;
        s = s * (target / rtp);
      }
    }
    const game = buildGame(def, s);
    const t0 = Date.now();
    const st = run(game, spins, sha256(`par|${id}|${spins}`));
    parentPort.postMessage({ id, scale: s, target, par: summarize(def, game, st, Date.now() - t0) });
  });

  function run(game, n, seed) {
    const rng = new Drbg(seed);
    const st = { n, total: 0, sq: 0, hits: 0, feat: 0, featWin: 0, max: 0, capped: 0, cascades: 0, buckets: new Array(BUCKETS.length).fill(0) };
    for (let i = 0; i < n; i++) {
      const r = game.play(rng);
      const w = r.win;
      st.total += w;
      st.sq += w * w;
      if (w > 0) st.hits++;
      if (w > st.max) st.max = w;
      if (r.capped) st.capped++;
      const fw = featureWin(r);
      if (fw !== null) { st.feat++; st.featWin += fw; }
      if (r.base) st.cascades += r.base.cascades;
      let b = 0;
      while (b + 1 < BUCKETS.length && w >= BUCKETS[b + 1][0]) b++;
      st.buckets[b]++;
    }
    return st;
  }
}

const BUCKETS = [[0, '0x'], [1e-9, '0–1x'], [1, '1–2x'], [2, '2–5x'], [5, '5–10x'], [10, '10–20x'], [20, '20–50x'], [50, '50–100x'], [100, '100–500x'], [500, '500–1000x'], [1000, '1000x+']];

function featureWin(r) {
  if (r.engine === 'lines') return r.feature ? r.win : null;
  return r.free ? r.free.win : null;
}

function summarize(def, game, st, ms) {
  const mean = st.total / st.n;
  const sd = Math.sqrt(Math.max(0, st.sq / st.n - mean * mean));
  const vol = sd < 3 ? 'Baja' : sd < 7 ? 'Media' : sd < 14 ? 'Alta' : 'Muy alta';
  return {
    id: def.id,
    name: def.name,
    engine: def.engine,
    configHash: game.configHash,
    scale: game.scale,
    targetRtp: def.targetRtp,
    spins: st.n,
    rtp: mean * 100,
    ci95: (1.96 * sd / Math.sqrt(st.n)) * 100,
    sd,
    volatility: vol,
    hitRate: (st.hits / st.n) * 100,
    featureEvery: st.feat ? Math.round(st.n / st.feat) : null,
    featureRtp: (st.featWin / st.n) * 100,
    baseRtp: ((st.total - st.featWin) / st.n) * 100,
    avgFeatureWin: st.feat ? st.featWin / st.feat : 0,
    avgCascades: st.cascades / st.n,
    maxWinX: st.max,
    maxWinCap: def.maxWin,
    cappedRounds: st.capped,
    distribution: BUCKETS.map(([, label], i) => ({ label, count: st.buckets[i], pct: (st.buckets[i] / st.n) * 100 })),
    paytable: game.math.pay,
    generatedAt: new Date().toISOString(),
    elapsedMs: ms,
  };
}
