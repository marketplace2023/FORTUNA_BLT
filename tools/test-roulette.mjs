import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { buildGame, loadGames, settleRound } from '../server/games/index.js';
import { EUROPEAN_PAYOUTS } from '../server/engine/roulette.js';

const gameId = 'ruleta-eclipse';
const game = loadGames().get(gameId);

test('ruleta con y sin multiplicadores liquida fichas en unidades enteras', () => {
  const bets = [{ id: 'straight:0', units: 2000 }, { id: 'even', units: 7000 }, { id: 'split:0-3', units: 1000 }];
  const boostedRng = { int: () => 0, pick: () => '500' };
  const { result, win } = settleRound(game, boostedRng, 10000, bets);
  assert.equal(result.number, 0);
  assert.equal(result.color, 'green');
  assert.equal(new Set(result.boosts.map((b) => b.number)).size, 3);
  assert.equal(win, 2000 * 500 + 1000 * 18);
  assert.equal(result.bets[1].win, 0);
  const plain = buildGame({ ...game.def, roulette: { wheel: game.math.wheel, payouts: EUROPEAN_PAYOUTS } });
  assert.notEqual(plain.configHash, game.configHash);
  const regular = settleRound(plain, { int: () => 0 }, 10000, bets);
  assert.deepEqual(regular.result.boosts, []);
  assert.equal(regular.win, 2000 * 36 + 1000 * 18);
  for (const { rtp } of [...plain.par.rows, ...game.par.rows]) assert.ok(Math.abs(rtp - 3600 / 37) < 1e-10);
});

test('la API registra y reproduce un giro, incluso después de reiniciar', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'fortuna-roulette-'));
  const address = createServer();
  address.listen(0, '127.0.0.1');
  await once(address, 'listening');
  const port = address.address().port;
  await new Promise((resolve) => address.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  let server, stderr = '';
  const cookies = new Map();

  async function start() {
    server = spawn(process.execPath, ['server/index.js'], {
      env: { ...process.env, PORT: String(port), DATA_DIR: dir, ADMIN_PASSWORD: 'roulette-test-password' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    server.stdout.resume();
    server.stderr.on('data', (chunk) => { stderr += chunk; });
    for (let i = 0; i < 100; i++) {
      if ((await fetch(`${base}/api/site`).catch(() => null))?.ok) return;
      if (server.exitCode !== null) break;
      await delay(50);
    }
    throw new Error(`El servidor no arrancó: ${stderr}`);
  }

  async function stop() {
    if (!server || server.exitCode !== null || server.signalCode !== null) return;
    const exit = once(server, 'exit');
    server.kill();
    await exit;
  }

  async function request(url, body, status = 200) {
    const headers = { Cookie: [...cookies.values()].join('; ') };
    if (body) headers['Content-Type'] = 'application/json';
    const response = await fetch(base + url, { method: body ? 'POST' : 'GET', headers, body: JSON.stringify(body) });
    const result = await response.json();
    assert.equal(response.status, status, JSON.stringify(result));
    if (response.headers.has('set-cookie')) {
      const cookie = response.headers.get('set-cookie').split(';')[0];
      cookies.set(cookie.split('=')[0], cookie);
    }
    return result;
  }

  try {
    await start();
    const config = await request(`/api/games/${gameId}`);
    assert.equal(config.maxWin, 500);
    assert.deepEqual(config.roulette.boost, { count: 3, values: [50, 100, 250, 500] });
    const keys = new Set(Object.keys(config.roulette.bets));
    assert.ok(config.roulette.calls.every((c) => Object.keys(c.stakes).every((id) => keys.has(id))));
    assert.match(await (await fetch(`${base}/play/${gameId}`)).text(), /roulette\.js/);
    const player = await request('/api/auth/register', { username: 'roulette_test', password: 'roulette-player-test' });
    const requestBody = { gameId, requestId: 'test-roulette-round-1', bets: [{ id: 'straight:0', amount: 1 }, { id: 'red', amount: 2 }] };
    await request('/api/spin', requestBody, 402);
    await request('/admin/api/login', { username: 'admin', password: 'roulette-test-password' });
    await request(`/admin/api/players/${player.id}/credit`, { amount: 2000, note: 'Saldo de prueba' });
    await request('/api/spin', { ...requestBody, bets: [{ id: 'invalid', amount: 1 }] }, 400);
    await request('/api/spin', { ...requestBody, bets: [{ id: 'red', amount: 101 }] }, 400);
    await request('/api/spin', { ...requestBody, bets: [{ id: 'red', amount: 0.00001 }] }, 400);
    await request('/api/spin', { ...requestBody, bets: [{ id: 'red', amount: 1 }, { id: 'red', amount: 1 }] }, 400);
    const [round, retry] = await Promise.all([
      request('/api/spin', requestBody),
      request('/api/spin', { ...requestBody, bets: [...requestBody.bets].reverse() }),
    ]);
    assert.deepEqual(retry, round);
    assert.equal(round.bet, 3);
    assert.equal(round.balance, 2000 - round.bet + round.win);
    await request('/api/spin', { ...requestBody, bets: [{ id: 'red', amount: 1 }] }, 409);
    const verified = await request(`/api/rounds/${round.roundId}/verify`);
    assert.equal(verified.ok, true);
    assert.deepEqual(verified.result, round.result);
    const history = await request(`/api/history?game=${gameId}`);
    assert.equal(history.length, 1);
    assert.equal(history[0].number, round.result.number);
    const slot = await request('/api/spin', { gameId: 'koi-dorado', bet: 1 });
    assert.equal(slot.result.engine, 'lines');
    assert.equal((await request(`/api/rounds/${slot.roundId}/verify`)).ok, true);

    // El índice de idempotencia se reconstruye desde los asientos, como los saldos.
    await stop();
    await start();
    await request('/api/auth/login', { username: 'roulette_test', password: 'roulette-player-test' });
    assert.equal((await request('/admin/api/login', { username: 'admin', password: 'roulette-test-password' })).username, 'admin');
    await request(`/admin/api/games/${gameId}`, { enabled: false });
    assert.deepEqual(await request('/api/spin', requestBody), round);
    assert.equal((await request('/api/me')).balance, slot.balance);
    await request('/api/spin', { ...requestBody, requestId: 'test-roulette-round-2' }, 403);
    const exact = await request(`/admin/api/par/${gameId}`);
    assert.equal(exact.exact, true);
    assert.equal((await request(`/admin/api/rounds/${round.roundId}`)).replay.ok, true);
    const audit = execFileSync(process.execPath, ['tools/verify-ledger.js', path.join(dir, 'ledger.jsonl'), path.join(dir, 'state.json')], { encoding: 'utf8' });
    assert.match(audit, /Rondas reproducidas: 2, discrepancias: 0/);
  } finally {
    await stop();
    await rm(dir, { recursive: true, force: true });
  }
});
