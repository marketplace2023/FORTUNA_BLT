/**
 * Verificación independiente del libro mayor.
 *
 *   node tools/verify-ledger.js [ruta/ledger.jsonl] [ruta/state.json]
 *
 * 1. Recalcula la cadena de hashes de todos los asientos.
 * 2. Reproduce CADA ronda desde su semilla con la versión de matemática registrada
 *    y compara el hash del resultado y la ganancia.
 * 3. Recalcula los saldos y comprueba que coinciden con el saldo escrito en cada ronda.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Ledger } from '../server/ledger.js';
import { buildGame, ROOT } from '../server/games/index.js';
import { Drbg } from '../server/rng.js';
import { canonical, sha256, toCredits } from '../server/util.js';

const ledgerFile = process.argv[2] || path.join(ROOT, 'data', 'ledger.jsonl');
const stateFile = process.argv[3] || path.join(ROOT, 'data', 'state.json');
if (!fs.existsSync(ledgerFile)) { console.error('No existe', ledgerFile); process.exit(1); }
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

const ledger = new Ledger(ledgerFile);
const chain = ledger.verify();
console.log(chain.ok ? `✓ Cadena íntegra (${chain.count} asientos)` : `✗ Cadena rota en #${chain.badSeq}: ${chain.reason}`);

const builds = new Map();
const gameFor = (hash) => {
  if (!builds.has(hash)) { const a = state.configs?.[hash]; builds.set(hash, a ? buildGame(a.def, a.scale) : null); }
  return builds.get(hash);
};

const bal = new Map();
let rounds = 0, bad = 0, balBad = 0;
for (const e of ledger.entries) {
  if (e.type === 'credit') bal.set(e.playerId, (bal.get(e.playerId) || 0) + e.amount);
  if (e.type !== 'round') continue;
  rounds++;
  const g = gameFor(e.cfg);
  if (!g || g.configHash !== e.cfg) { bad++; console.log(`✗ ${e.roundId}: versión de matemática ${e.cfg.slice(0, 12)} no archivada`); continue; }
  const res = g.play(new Drbg(e.seed), e.input);
  const win = Math.floor(res.win * e.bet + 1e-6);
  if (sha256(canonical(res)) !== e.rh || win !== e.win) { bad++; console.log(`✗ ${e.roundId}: el resultado reproducido no coincide`); }
  const b = (bal.get(e.playerId) || 0) - e.bet + e.win;
  bal.set(e.playerId, b);
  if (b !== e.bal) { balBad++; console.log(`✗ ${e.roundId}: saldo ${toCredits(b)} ≠ registrado ${toCredits(e.bal)}`); }
}
console.log(`${bad ? '✗' : '✓'} Rondas reproducidas: ${rounds}, discrepancias: ${bad}`);
console.log(`${balBad ? '✗' : '✓'} Saldos coherentes con el libro: ${balBad} discrepancias`);
process.exit(chain.ok && !bad && !balBad ? 0 : 1);
