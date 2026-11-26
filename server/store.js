import fs from 'node:fs';
import path from 'node:path';
import { Ledger } from './ledger.js';

const newMeter = () => ({ rounds: 0, coinIn: 0, coinOut: 0, hits: 0, features: 0, maxWin: 0, lastAt: null });

function addRound(m, e) {
  m.rounds++;
  m.coinIn += e.bet;
  m.coinOut += e.win;
  if (e.win > 0) m.hits++;
  if (e.feat) m.features++;
  if (e.win > m.maxWin) m.maxWin = e.win;
  m.lastAt = e.ts;
}

/**
 * Estado del sistema.
 *  - state.json: cuentas, ajustes de juego y del sitio (datos que no son dinero).
 *  - ledger.jsonl: TODO movimiento de dinero y toda acción de administración.
 * Saldos y contadores no se guardan: se reconstruyen leyendo el libro mayor al arrancar,
 * así nunca pueden divergir de él.
 */
export class Store {
  constructor(dataDir) {
    this.dir = dataDir;
    fs.mkdirSync(dataDir, { recursive: true });
    this.file = path.join(dataDir, 'state.json');
    this.state = fs.existsSync(this.file)
      ? JSON.parse(fs.readFileSync(this.file, 'utf8'))
      : { players: {}, admins: {}, games: {}, configs: {} };
    this.state.configs ||= {};
    this.ledger = new Ledger(path.join(dataDir, 'ledger.jsonl'));
    this.rebuild();
  }

  rebuild() {
    this.balances = new Map();
    this.meters = { real: newMeter(), demo: newMeter(), games: {}, players: {}, days: {} };
    this.rounds = new Map();
    this.rouletteRequests = new Map();
    for (const e of this.ledger.entries) this.apply(e);
  }

  apply(e) {
    if (e.type === 'round') {
      this.balances.set(e.playerId, (this.balances.get(e.playerId) || 0) - e.bet + e.win);
      const mode = e.demo ? 'demo' : 'real';
      addRound(this.meters[mode], e);
      const g = (this.meters.games[e.gameId] ||= { real: newMeter(), demo: newMeter() });
      addRound(g[mode], e);
      addRound((this.meters.players[e.playerId] ||= newMeter()), e);
      if (!e.demo) addRound((this.meters.days[e.ts.slice(0, 10)] ||= newMeter()), e);
      this.rounds.set(e.roundId, e);
      if (e.requestId) this.rouletteRequests.set(`${e.playerId}:${e.requestId}`, e);
    } else if (e.type === 'credit') {
      this.balances.set(e.playerId, (this.balances.get(e.playerId) || 0) + e.amount);
    }
  }

  append(entry) {
    const e = this.ledger.append(entry);
    this.apply(e);
    return e;
  }

  balance(playerId) { return this.balances.get(playerId) || 0; }

  save() {
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2));
    fs.renameSync(tmp, this.file);
  }

  gameSettings(id) {
    return (this.state.games[id] ||= { enabled: true, minBet: 0.2, maxBet: 100 });
  }
}
