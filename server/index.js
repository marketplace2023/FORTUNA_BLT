import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Store } from './store.js';
import { Sessions, RateLimit, hashPassword, checkPassword } from './auth.js';
import { loadGames, buildGame, publicInfo, readPar, settleRound, ROOT } from './games/index.js';
import { CATALOG, BETS } from './games/catalog.js';
import { normalizeRouletteBets } from './engine/roulette.js';
import { Drbg, newSeed } from './rng.js';
import { UNIT, toUnits, toCredits, canonical, sha256, randomId } from './util.js';
import { RACING_ID, raceCard } from './games/racing.js';

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SITE_NAME = process.env.SITE_NAME || 'VLT Royale';
const DEMO_CREDITS = 2000;

const store = new Store(DATA_DIR);
let games = loadGames();
const sessions = new Sessions(12 * 3600e3);
const adminSessions = new Sessions(4 * 3600e3);
const loginLimit = new RateLimit(10, 10 * 60e3);
const demoLimit = new RateLimit(20, 60 * 60e3);
const raceCardLimit = new RateLimit(120, 60e3);
const offerSecret = crypto.randomBytes(32);

// ───────────── Arranque: archivo de versiones de matemática y administrador inicial ─────────────
function archiveConfigs() {
  let changed = false;
  for (const g of games.values()) {
    if (!store.state.configs[g.configHash]) {
      store.state.configs[g.configHash] = { id: g.def.id, scale: g.scale, def: JSON.parse(JSON.stringify(g.def)), since: new Date().toISOString() };
      changed = true;
    }
  }
  if (changed) store.save();
}
archiveConfigs();

if (!Object.keys(store.state.admins).length) {
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  store.state.admins.admin = { username: 'admin', role: 'owner', ...hashPassword(password), createdAt: new Date().toISOString() };
  store.save();
  fs.writeFileSync(path.join(DATA_DIR, 'admin-credentials.txt'), `usuario: admin\ncontraseña: ${password}\n\nCambia la contraseña desde el panel y borra este archivo.\n`);
  console.log(`\n  Administrador creado → usuario: admin  contraseña: ${password}\n  (guardado también en data/admin-credentials.txt)\n`);
}

// ───────────── Utilidades HTTP ─────────────
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webp': 'image/webp', '.woff2': 'font/woff2' };

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };

function send(res, status, body, headers = {}) {
  const isBuf = Buffer.isBuffer(body) || typeof body === 'string';
  const data = isBuf ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': isBuf ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    ...headers,
  });
  res.end(data);
}

function cookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
const setCookie = (name, value, maxAge) => `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;

async function readJson(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return {};
  if (!(req.headers['content-type'] || '').includes('application/json')) fail(415, 'Se espera JSON');
  let size = 0;
  const chunks = [];
  for await (const c of req) { size += c.length; if (size > 64 * 1024) fail(413, 'Cuerpo demasiado grande'); chunks.push(c); }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail(400, 'JSON inválido'); }
}

const ip = (req) => req.socket.remoteAddress || '?';

// ───────────── Router ─────────────
const routes = [];
function route(method, pattern, handler) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, re, keys, handler });
}

// ───────────── Helpers de dominio ─────────────
function currentPlayer(req) {
  const id = sessions.get(cookies(req).sid);
  const p = id && store.state.players[id];
  return p || null;
}
function requirePlayer(req) {
  const p = currentPlayer(req);
  if (!p) fail(401, 'Inicia sesión para jugar');
  if (p.blocked) fail(403, 'Cuenta bloqueada. Contacta con soporte.');
  return p;
}
function requireAdmin(req) {
  const u = adminSessions.get(cookies(req).asid);
  const a = u && store.state.admins[u];
  if (!a) fail(401, 'Sesión de administrador requerida');
  return a;
}
const playerView = (p) => ({ id: p.id, username: p.username, demo: !!p.demo, blocked: !!p.blocked, balance: toCredits(store.balance(p.id)) });

function adminLog(admin, action, target, detail) {
  store.append({ type: 'admin', by: admin.username, action, target, detail });
}

const archivedBuilds = new Map();
function gameForHash(gameId, hash) {
  const cur = games.get(gameId);
  if (cur && cur.configHash === hash) return cur;
  if (archivedBuilds.has(hash)) return archivedBuilds.get(hash);
  const a = store.state.configs[hash];
  if (!a) return null;
  const g = buildGame(a.def, a.scale);
  archivedBuilds.set(hash, g);
  return g;
}

/** Reproduce una ronda desde su semilla y comprueba resultado y ganancia. */
function replay(e) {
  const g = gameForHash(e.gameId, e.cfg);
  if (!g) return { ok: false, reason: 'No se encontró la versión de matemática de esta ronda' };
  let settled;
  try { settled = settleRound(g, new Drbg(e.seed), e.bet, e.stakes ?? e.input); }
  catch { return { ok: false, reason: 'No se pudieron reproducir las apuestas registradas' }; }
  const { result, win } = settled;
  const rh = sha256(canonical(result));
  const ok = rh === e.rh && win === e.win && g.configHash === e.cfg && result.number === e.number;
  return { ok, reason: ok ? 'Resultado idéntico al registrado' : 'El resultado NO coincide', resultHash: rh, recordedHash: e.rh, win, recordedWin: e.win, result };
}

const roundView = (e) => ({
  roundId: e.roundId, seq: e.seq, ts: e.ts, playerId: e.playerId, username: store.state.players[e.playerId]?.username,
  demo: !!e.demo, gameId: e.gameId, bet: toCredits(e.bet), win: toCredits(e.win), balance: toCredits(e.bal),
  feat: e.feat || null, cfg: e.cfg, seed: e.seed, rh: e.rh, hash: e.hash, prev: e.prev, number: e.number, stakes: e.stakes,
});

const spinView = (e, result) => ({
  roundId: e.roundId, seq: e.seq, hash: e.hash, configHash: e.cfg, seed: e.seed, resultHash: e.rh,
  bet: toCredits(e.bet), win: toCredits(e.win), balance: toCredits(e.bal), result, ts: e.stakes ? e.ts : undefined,
});

// ───────────── API pública ─────────────
route('GET', '/api/site', () => ({ name: SITE_NAME }));

route('GET', '/api/games', () => {
  const list = [];
  for (const def of CATALOG) {
    const s = store.gameSettings(def.id);
    if (!s.enabled) continue;
    const info = publicInfo(games.get(def.id), s);
    list.push({ id: info.id, name: info.name, engine: info.engine, tag: info.tag, blurb: info.blurb, theme: info.theme, rtp: info.rtp, maxRtp: info.maxRtp, volatility: info.volatility, maxWin: info.maxWin, cover: info.cover ?? Object.values(info.symbols).filter((x) => x.t !== 'blank' && x.t !== 'mult').slice(0, 4).map((x) => x.g) });
  }
  return list;
});

route('GET', '/api/games/:id', (req, { id }) => {
  const g = games.get(id);
  if (!g) fail(404, 'Juego no encontrado');
  const s = store.gameSettings(id);
  if (!s.enabled) fail(403, 'Juego deshabilitado');
  return publicInfo(g, s);
});

route('POST', '/api/auth/register', async (req, _p, body, res) => {
  if (!loginLimit.allow('reg|' + ip(req))) fail(429, 'Demasiados intentos, espera unos minutos');
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!/^[a-z0-9_]{3,20}$/.test(username)) fail(400, 'Usuario: 3-20 caracteres (letras, números, _)');
  if (password.length < 8) fail(400, 'La contraseña debe tener al menos 8 caracteres');
  if (Object.values(store.state.players).some((p) => p.username === username)) fail(409, 'Ese usuario ya existe');
  const id = 'p_' + randomId(6);
  store.state.players[id] = { id, username, ...hashPassword(password), createdAt: new Date().toISOString() };
  store.save();
  store.append({ type: 'player', action: 'register', playerId: id, username });
  res.setHeader('Set-Cookie', setCookie('sid', sessions.create(id), 12 * 3600));
  return playerView(store.state.players[id]);
});

route('POST', '/api/auth/login', async (req, _p, body, res) => {
  if (!loginLimit.allow('login|' + ip(req))) fail(429, 'Demasiados intentos, espera unos minutos');
  const username = String(body.username || '').trim().toLowerCase();
  const p = Object.values(store.state.players).find((x) => x.username === username && !x.demo);
  if (!p || !checkPassword(String(body.password || ''), p)) fail(401, 'Usuario o contraseña incorrectos');
  if (p.blocked) fail(403, 'Cuenta bloqueada. Contacta con soporte.');
  res.setHeader('Set-Cookie', setCookie('sid', sessions.create(p.id), 12 * 3600));
  return playerView(p);
});

route('POST', '/api/auth/demo', async (req, _p, _b, res) => {
  if (!demoLimit.allow('demo|' + ip(req))) fail(429, 'Demasiadas cuentas demo desde esta red');
  const id = 'd_' + randomId(6);
  store.state.players[id] = { id, username: 'demo_' + id.slice(2, 8), demo: true, createdAt: new Date().toISOString() };
  store.save();
  store.append({ type: 'player', action: 'demo', playerId: id, username: store.state.players[id].username });
  store.append({ type: 'credit', playerId: id, amount: toUnits(DEMO_CREDITS), demo: true, by: 'system', note: 'Saldo demo inicial' });
  res.setHeader('Set-Cookie', setCookie('sid', sessions.create(id), 12 * 3600));
  return playerView(store.state.players[id]);
});

route('POST', '/api/auth/logout', (req, _p, _b, res) => {
  sessions.destroy(cookies(req).sid);
  res.setHeader('Set-Cookie', setCookie('sid', '', 0));
  return { ok: true };
});

route('GET', '/api/me', (req) => {
  const p = currentPlayer(req);
  return p ? playerView(p) : null;
});

route('POST', '/api/spin', async (req, _p, body) => {
  const p = requirePlayer(req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Apuesta inválida');
  const g = games.get(String(body.gameId));
  if (!g) fail(404, 'Juego no encontrado');
  if (g.def.engine === 'race') fail(400, 'Elige un caballo desde el hipódromo');
  const s = store.gameSettings(g.def.id);
  let stakes, requestId, bet;
  if (g.def.engine === 'roulette') {
    requestId = body.requestId;
    if (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(requestId)) fail(400, 'Identificador de giro inválido');
    const previous = store.rouletteRequests.get(`${p.id}:${requestId}`);
    if (previous && previous.gameId !== g.def.id) fail(409, 'El identificador ya corresponde a otro giro');
    const version = previous ? gameForHash(previous.gameId, previous.cfg) : g;
    if (!version) fail(500, 'No se pudo recuperar la versión de la ronda');
    try { stakes = normalizeRouletteBets(version.math, body.bets); }
    catch (err) { fail(400, err.message); }
    if (previous) {
      if (canonical(previous.stakes) !== canonical(stakes)) fail(409, 'El identificador ya corresponde a otra apuesta');
      const r = replay(previous);
      if (!r.ok) fail(500, 'No se pudo recuperar la ronda');
      return spinView(previous, r.result);
    }
    bet = stakes.reduce((total, stake) => total + stake.units, 0);
    if (bet < toUnits(s.minBet) || bet > toUnits(s.maxBet)) fail(400, 'El total supera los límites de la mesa');
  } else {
    const betC = Number(body.bet);
    if (!BETS.includes(betC) || betC < s.minBet || betC > s.maxBet) fail(400, 'Apuesta no permitida');
    bet = toUnits(betC);
  }
  if (!s.enabled) fail(403, 'Juego deshabilitado');
  const before = store.balance(p.id);
  if (before < bet) fail(402, 'Saldo insuficiente');

  const seed = newSeed();
  const { result, win } = settleRound(g, new Drbg(seed), bet, stakes);
  const rh = sha256(canonical(result));
  const feat = result.free ? 'free' : result.feature ? result.feature.type : undefined;
  const roundId = 'R' + Date.now().toString(36).toUpperCase() + randomId(3).toUpperCase();
  const e = store.append({
    type: 'round', roundId, playerId: p.id, demo: p.demo ? true : undefined, gameId: g.def.id, cfg: g.configHash,
    bet, win, bal: before - bet + win, seed, rh, feat, stakes, requestId, number: result.number,
  });
  return spinView(e, result);
});

function raceReceipt(e) {
  const g = gameForHash(e.gameId, e.cfg);
  return { roundId: e.roundId, configHash: e.cfg, seed: e.seed, resultHash: e.rh, bet: toCredits(e.bet), win: toCredits(e.win), balance: toCredits(store.balance(e.playerId)), result: g.play(new Drbg(e.seed), e.input) };
}

route('GET', '/api/racing/card', (req) => {
  if (!raceCardLimit.allow(ip(req))) fail(429, 'Espera un momento antes de pedir otro programa');
  const g = games.get(RACING_ID), s = store.gameSettings(RACING_ID);
  if (!s.enabled) fail(403, 'Hipódromo deshabilitado');
  const payload = { offerSeed: newSeed(), expiresAt: Date.now() + 300000, cfg: g.configHash };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const token = data + '.' + crypto.createHmac('sha256', offerSecret).update(data).digest('hex');
  return { token, expiresAt: payload.expiresAt, configHash: g.configHash, ...raceCard(g.def, payload.offerSeed), bets: BETS.filter(b => b >= s.minBet && b <= s.maxBet) };
});

route('POST', '/api/racing/bet', (req, _params, body) => {
  const p = requirePlayer(req);
  const token = body.token;
  if (typeof token !== 'string' || token.length > 2048) fail(400, 'Programa inválido');
  const offerId = sha256(token);
  const betC = Number(body.bet), horseId = Number(body.horseId);
  const previous = store.raceOffers.get(`${p.id}|${offerId}`);
  if (previous) {
    if (betC !== toCredits(previous.bet) || horseId !== previous.input.horseId) fail(409, 'Este programa ya tiene una apuesta registrada');
    return raceReceipt(previous);
  }
  const [data, signature, extra] = token.split('.');
  const expected = crypto.createHmac('sha256', offerSecret).update(data).digest('hex');
  if (extra || !signature || !/^[a-f0-9]{64}$/.test(signature) || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) fail(409, 'El programa venció. Actualiza la carrera');
  let offer;
  try { offer = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')); } catch { fail(400, 'Programa inválido'); }
  const g = games.get(RACING_ID), s = store.gameSettings(RACING_ID);
  if (offer.expiresAt < Date.now() || offer.cfg !== g.configHash) fail(409, 'El programa venció. Actualiza la carrera');
  if (!s.enabled) fail(403, 'Hipódromo deshabilitado');
  if (typeof body.horseId !== 'number' || !Number.isInteger(horseId) || !g.def.model.horses.some(h => h.id === horseId)) fail(400, 'Caballo inválido');
  if (typeof body.bet !== 'number' || !BETS.includes(betC) || betC < s.minBet || betC > s.maxBet) fail(400, 'Apuesta no permitida');
  const bet = toUnits(betC), before = store.balance(p.id);
  if (before < bet) fail(402, 'Saldo insuficiente');
  const seed = newSeed(), input = { offerSeed: offer.offerSeed, offerId, horseId };
  const result = g.play(new Drbg(seed), input);
  const win = Math.floor(result.win * bet + 1e-6);
  const e = store.append({ type: 'round', roundId: 'H' + Date.now().toString(36).toUpperCase() + randomId(3).toUpperCase(), playerId: p.id, demo: p.demo || undefined, gameId: RACING_ID, cfg: g.configHash, bet, win, bal: before - bet + win, seed, input, rh: sha256(canonical(result)) });
  return raceReceipt(e);
});

route('GET', '/api/racing/rounds/:id', (req, { id }) => {
  const p = requirePlayer(req), e = store.rounds.get(id);
  if (!e || e.playerId !== p.id || e.gameId !== RACING_ID) fail(404, 'Carrera no encontrada');
  return raceReceipt(e);
});

route('GET', '/api/history', (req) => {
  const p = requirePlayer(req);
  const url = new URL(req.url, 'http://x');
  const gameId = url.searchParams.get('game');
  const out = [];
  const entries = store.ledger.entries;
  for (let i = entries.length - 1; i >= 0 && out.length < 50; i--) {
    const e = entries[i];
    if (e.type === 'round' && e.playerId === p.id && (!gameId || e.gameId === gameId)) out.push(roundView(e));
  }
  return out;
});

route('GET', '/api/rounds/:id/verify', (req, { id }) => {
  const p = requirePlayer(req);
  const e = store.rounds.get(id);
  if (!e || e.playerId !== p.id) fail(404, 'Ronda no encontrada');
  const r = replay(e);
  return { round: roundView(e), ok: r.ok, reason: r.reason, resultHash: r.resultHash, recordedHash: r.recordedHash, result: r.result };
});

// ───────────── API de administración ─────────────
route('POST', '/admin/api/login', async (req, _p, body, res) => {
  if (!loginLimit.allow('admin|' + ip(req))) fail(429, 'Demasiados intentos, espera unos minutos');
  const a = store.state.admins[String(body.username || '').trim().toLowerCase()];
  if (!a || !checkPassword(String(body.password || ''), a)) fail(401, 'Credenciales incorrectas');
  res.setHeader('Set-Cookie', setCookie('asid', adminSessions.create(a.username), 4 * 3600));
  store.append({ type: 'admin', by: a.username, action: 'login', target: ip(req) });
  return { username: a.username, role: a.role };
});

route('POST', '/admin/api/logout', (req, _p, _b, res) => {
  adminSessions.destroy(cookies(req).asid);
  res.setHeader('Set-Cookie', setCookie('asid', '', 0));
  return { ok: true };
});

route('GET', '/admin/api/me', (req) => {
  const u = adminSessions.get(cookies(req).asid);
  const a = u && store.state.admins[u];
  return a ? { username: a.username, role: a.role, site: SITE_NAME } : null;
});

route('POST', '/admin/api/password', async (req, _p, body) => {
  const a = requireAdmin(req);
  if (!checkPassword(String(body.current || ''), a)) fail(400, 'La contraseña actual no es correcta');
  const pw = String(body.next || '');
  if (pw.length < 10) fail(400, 'Mínimo 10 caracteres');
  Object.assign(a, hashPassword(pw));
  store.save();
  adminLog(a, 'password_change', a.username);
  return { ok: true };
});

const meterView = (m) => ({ rounds: m.rounds, coinIn: toCredits(m.coinIn), coinOut: toCredits(m.coinOut), ggr: toCredits(m.coinIn - m.coinOut), rtp: m.coinIn ? (m.coinOut / m.coinIn) * 100 : null, hitRate: m.rounds ? (m.hits / m.rounds) * 100 : null, features: m.features, maxWin: toCredits(m.maxWin), lastAt: m.lastAt });

route('GET', '/admin/api/dashboard', (req) => {
  requireAdmin(req);
  const players = Object.values(store.state.players);
  const real = players.filter((p) => !p.demo);
  const today = new Date().toISOString().slice(0, 10);
  let liability = 0;
  for (const p of real) liability += store.balance(p.id);
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400e3).toISOString().slice(0, 10);
    const m = store.meters.days[d];
    days.push({ day: d, ...(m ? meterView(m) : meterView({ rounds: 0, coinIn: 0, coinOut: 0, hits: 0, features: 0, maxWin: 0 })) });
  }
  const perGame = CATALOG.map((d) => {
    const m = store.meters.games[d.id];
    const par = readPar(d.id);
    return { id: d.id, name: d.name, enabled: store.gameSettings(d.id).enabled, theoreticalRtp: games.get(d.id).par?.rtp ?? par?.rtp ?? d.targetRtp, real: m ? meterView(m.real) : null, demo: m ? meterView(m.demo) : null };
  });
  const recent = [];
  for (let i = store.ledger.entries.length - 1; i >= 0 && recent.length < 12; i--) {
    const e = store.ledger.entries[i];
    if (e.type === 'round') recent.push(roundView(e));
  }
  return {
    real: meterView(store.meters.real),
    demo: meterView(store.meters.demo),
    today: store.meters.days[today] ? meterView(store.meters.days[today]) : null,
    players: { total: real.length, demo: players.length - real.length, blocked: real.filter((p) => p.blocked).length },
    liability: toCredits(liability),
    ledger: { entries: store.ledger.seq, head: store.ledger.lastHash },
    days, perGame, recent,
  };
});

route('GET', '/admin/api/players', (req) => {
  requireAdmin(req);
  const url = new URL(req.url, 'http://x');
  const q = (url.searchParams.get('q') || '').toLowerCase();
  const demo = url.searchParams.get('demo') === '1';
  return Object.values(store.state.players)
    .filter((p) => !!p.demo === demo && (!q || p.username.includes(q) || p.id.includes(q)))
    .map((p) => ({ ...playerView(p), createdAt: p.createdAt, meters: store.meters.players[p.id] ? meterView(store.meters.players[p.id]) : null }))
    .sort((a, b) => (b.meters?.lastAt || b.createdAt).localeCompare(a.meters?.lastAt || a.createdAt))
    .slice(0, 500);
});

route('POST', '/admin/api/players', async (req, _p, body) => {
  const a = requireAdmin(req);
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!/^[a-z0-9_]{3,20}$/.test(username)) fail(400, 'Usuario: 3-20 caracteres (letras, números, _)');
  if (password.length < 8) fail(400, 'La contraseña debe tener al menos 8 caracteres');
  if (Object.values(store.state.players).some((p) => p.username === username)) fail(409, 'Ese usuario ya existe');
  const id = 'p_' + randomId(6);
  store.state.players[id] = { id, username, ...hashPassword(password), createdAt: new Date().toISOString() };
  store.save();
  store.append({ type: 'player', action: 'create', playerId: id, username, by: a.username });
  const credits = Number(body.credits || 0);
  if (credits > 0) store.append({ type: 'credit', playerId: id, amount: toUnits(credits), by: a.username, note: 'Saldo inicial' });
  return playerView(store.state.players[id]);
});

route('POST', '/admin/api/players/:id/credit', async (req, { id }, body) => {
  const a = requireAdmin(req);
  const p = store.state.players[id];
  if (!p) fail(404, 'Jugador no encontrado');
  if (p.demo) fail(400, 'No se acredita saldo real a cuentas demo');
  const amount = toUnits(body.amount);
  const note = String(body.note || '').trim().slice(0, 200);
  if (!Number.isFinite(amount) || amount === 0) fail(400, 'Importe inválido');
  if (Math.abs(amount) > toUnits(1_000_000)) fail(400, 'Importe fuera de rango');
  if (!note) fail(400, 'Indica el motivo (queda en el libro mayor)');
  if (store.balance(id) + amount < 0) fail(400, 'El saldo no puede quedar negativo');
  const e = store.append({ type: 'credit', playerId: id, amount, by: a.username, note });
  return { ok: true, seq: e.seq, balance: toCredits(store.balance(id)) };
});

route('POST', '/admin/api/players/:id/block', async (req, { id }, body) => {
  const a = requireAdmin(req);
  const p = store.state.players[id];
  if (!p) fail(404, 'Jugador no encontrado');
  p.blocked = !!body.blocked;
  store.save();
  if (p.blocked) sessions.destroyWhere((s) => s === id);
  adminLog(a, p.blocked ? 'player_block' : 'player_unblock', id, { username: p.username });
  return playerView(p);
});

route('GET', '/admin/api/rounds', (req) => {
  requireAdmin(req);
  const url = new URL(req.url, 'http://x');
  const player = url.searchParams.get('player');
  const game = url.searchParams.get('game');
  const q = (url.searchParams.get('q') || '').trim();
  const demo = url.searchParams.get('demo');
  const minWin = Number(url.searchParams.get('minWin') || 0);
  const limit = Math.min(500, Number(url.searchParams.get('limit') || 100));
  const out = [];
  const E = store.ledger.entries;
  for (let i = E.length - 1; i >= 0 && out.length < limit; i--) {
    const e = E[i];
    if (e.type !== 'round') continue;
    if (player && e.playerId !== player) continue;
    if (game && e.gameId !== game) continue;
    if (demo === '0' && e.demo) continue;
    if (demo === '1' && !e.demo) continue;
    if (minWin && e.win < toUnits(minWin)) continue;
    if (q && !(e.roundId.includes(q.toUpperCase()) || store.state.players[e.playerId]?.username.includes(q.toLowerCase()))) continue;
    out.push(roundView(e));
  }
  return out;
});

route('GET', '/admin/api/rounds/:id', (req, { id }) => {
  requireAdmin(req);
  const e = store.rounds.get(id);
  if (!e) fail(404, 'Ronda no encontrada');
  const g = games.get(e.gameId);
  return { round: roundView(e), replay: replay(e), game: g ? { name: g.def.name, symbols: g.def.symbols, cols: g.def.cols, rows: g.def.rows } : null };
});

route('GET', '/admin/api/games', (req) => {
  requireAdmin(req);
  return CATALOG.map((d) => {
    const g = games.get(d.id);
    const s = store.gameSettings(d.id);
    const par = readPar(d.id);
    return {
      id: d.id, name: d.name, engine: d.engine, tag: d.tag, theme: d.theme, ...s,
      configHash: g.configHash, scale: g.scale, targetRtp: g.par?.rtp ?? d.targetRtp, maxWin: g.par?.maxWin ?? d.maxWin,
      par: g.par ? { exact: true, rtp: g.par.rtp, maxRtp: g.par.maxRtp, matches: true } : par ? { rtp: par.rtp, ci95: par.ci95, hitRate: par.hitRate, featureEvery: par.featureEvery, volatility: par.volatility, spins: par.spins, generatedAt: par.generatedAt, matches: par.configHash === g.configHash } : null,
      cover: d.cover ?? Object.values(d.symbols).filter((x) => x.t !== 'blank').slice(0, 3).map((x) => x.g),
    };
  });
});

route('POST', '/admin/api/games/:id', async (req, { id }, body) => {
  const a = requireAdmin(req);
  if (!games.has(id)) fail(404, 'Juego no encontrado');
  const s = store.gameSettings(id);
  const before = { ...s };
  const next = { ...s };
  if (body.enabled !== undefined) next.enabled = !!body.enabled;
  if (body.minBet !== undefined) { if (!BETS.includes(Number(body.minBet))) fail(400, 'Apuesta mínima inválida'); next.minBet = Number(body.minBet); }
  if (body.maxBet !== undefined) { if (!BETS.includes(Number(body.maxBet))) fail(400, 'Apuesta máxima inválida'); next.maxBet = Number(body.maxBet); }
  if (next.minBet > next.maxBet) fail(400, 'La mínima no puede superar la máxima');
  Object.assign(s, next);
  store.save();
  adminLog(a, 'game_settings', id, { before, after: { ...s } });
  return s;
});

route('GET', '/admin/api/par/:id', (req, { id }) => {
  requireAdmin(req);
  const g = games.get(id);
  if (g?.par) return { ...g.par, exact: true, name: g.def.name, configHash: g.configHash, matches: true, boost: g.math.boost };
  const par = readPar(id);
  if (!par) fail(404, 'Sin hoja PAR. Ejecuta: npm run sim');
  return { ...par, currentConfigHash: g?.configHash, matches: par.configHash === g?.configHash, bets: BETS };
});

route('GET', '/admin/api/ledger', (req) => {
  requireAdmin(req);
  const url = new URL(req.url, 'http://x');
  const type = url.searchParams.get('type');
  const limit = Math.min(500, Number(url.searchParams.get('limit') || 100));
  const out = [];
  const E = store.ledger.entries;
  for (let i = E.length - 1; i >= 0 && out.length < limit; i--) {
    const e = E[i];
    if (type && e.type !== type) continue;
    if (!type && e.type === 'round') continue; // por defecto: todo menos rondas
    out.push({ ...e, username: e.playerId ? store.state.players[e.playerId]?.username : undefined, amount: e.amount !== undefined ? toCredits(e.amount) : undefined, bet: e.bet !== undefined ? toCredits(e.bet) : undefined, win: e.win !== undefined ? toCredits(e.win) : undefined, bal: e.bal !== undefined ? toCredits(e.bal) : undefined });
  }
  return out;
});

route('GET', '/admin/api/ledger/verify', (req) => {
  const a = requireAdmin(req);
  const r = store.ledger.verify();
  // Además reproducimos las últimas 200 rondas desde su semilla.
  let replayed = 0, mismatches = [];
  const E = store.ledger.entries;
  for (let i = E.length - 1; i >= 0 && replayed < 200; i--) {
    if (E[i].type !== 'round') continue;
    replayed++;
    if (!replay(E[i]).ok) mismatches.push(E[i].roundId);
  }
  adminLog(a, 'ledger_verify', 'ledger', { ok: r.ok, count: r.count, replayed, mismatches: mismatches.length });
  return { ...r, replayed, mismatches };
});

route('GET', '/admin/api/ledger/export', (req, _p, _b, res) => {
  const a = requireAdmin(req);
  adminLog(a, 'ledger_export', 'ledger', { entries: store.ledger.seq });
  res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Content-Disposition': `attachment; filename="ledger-${new Date().toISOString().slice(0, 10)}.jsonl"`, 'Cache-Control': 'no-store' });
  fs.createReadStream(store.ledger.file).pipe(res);
  return undefined;
});

// ───────────── Estáticos ─────────────
function serveStatic(req, res, pathname) {
  let file;
  if (pathname === '/') file = 'index.html';
  else if (/^\/play\/koi-dorado\/?$/.test(pathname)) file = 'koi.html';
  else if (/^\/play\/frutas-neon\/?$/.test(pathname)) file = 'neon.html';
  else if (/^\/play\/dragon-jade\/?$/.test(pathname)) file = 'dragon.html';
  else if (/^\/play\/faraon-dorado\/?$/.test(pathname)) file = 'pharaoh.html';
  else if (/^\/play\/noche-catrinas\/?$/.test(pathname)) file = 'catrina.html';
  else if (/^\/play\/oceano-perlas\/?$/.test(pathname)) file = 'ocean.html';
  else if (/^\/play\/samurai-viento\/?$/.test(pathname)) file = 'samurai.html';
  else if (/^\/play\/templo-jaguar\/?$/.test(pathname)) file = 'jaguar.html';
  else if (/^\/play\/fiesta-dulce\/?$/.test(pathname)) file = 'sweet.html';
  else if (/^\/play\/panda-zen\/?$/.test(pathname)) file = 'panda.html';
  else if (games.get(pathname.match(/^\/play\/([\w-]+)\/?$/)?.[1])?.def.engine === 'roulette') file = 'roulette.html';
  else if (/^\/play\/hipodromo-royale\/?$/.test(pathname)) file = 'racing.html';
  else if (/^\/play\/[\w-]+\/?$/.test(pathname)) file = 'play.html';
  else if (pathname === '/admin' || pathname === '/admin/') file = 'admin/index.html';
  else file = decodeURIComponent(pathname).replace(/^\/+/, '');
  const full = path.resolve(PUBLIC_DIR, file);
  if (!full.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, 'Prohibido');
  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'No encontrado');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    fs.createReadStream(full).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;
  try {
    if (pathname.startsWith('/api/') || pathname.startsWith('/admin/api/')) {
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = r.re.exec(pathname);
        if (!m) continue;
        const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
        const body = await readJson(req);
        const out = await r.handler(req, params, body, res);
        if (out !== undefined && !res.headersSent) send(res, 200, out ?? null);
        else if (out === undefined && !res.headersSent) send(res, 200, null);
        return;
      }
      return send(res, 404, { error: 'Ruta no encontrada' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Método no permitido');
    serveStatic(req, res, pathname);
  } catch (err) {
    if (err instanceof HttpError) return send(res, err.status, { error: err.message });
    console.error(err);
    send(res, 500, { error: 'Error interno' });
  }
});

server.listen(PORT, () => {
  console.log(`${SITE_NAME} en http://localhost:${PORT}`);
  console.log(`  Panel:   http://localhost:${PORT}/admin`);
  console.log(`  Libro:   ${store.ledger.seq} asientos · cabeza ${store.ledger.lastHash.slice(0, 16)}…`);
});

export { UNIT };
