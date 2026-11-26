import { api, el } from './api.js';
import { Sound } from './sound.js';
import { soundButton } from './skin-common.js';
import { createWheel } from './roulette-wheel.js';

const $ = (selector) => document.querySelector(selector);
const UNIT = 10000;
const units = (amount) => Math.round(amount * UNIT);
const totalOf = (bets) => [...bets.values()].reduce((sum, value) => sum + value, 0);
const formatter = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const money = (value) => formatter.format(value / UNIT);
const chipFormatter = new Intl.NumberFormat('es', { maximumFractionDigits: 4 });
const rtp = (value) => new Intl.NumberFormat('es', { maximumFractionDigits: 4 }).format(value) + ' %';
const COLORS = { red: 'rojo', black: 'negro', green: 'verde' };
const INSIDE = { split: 'Caballo', street: 'Transversal', trio: 'Trío con cero', corner: 'Cuadro', six: 'Seisena' };
const INSIDE_PAGE_SIZE = 24;
const gameId = location.pathname.split('/').filter(Boolean)[1];
const dlg = $('#dialog');
let info, rules, wheel, user, storageKey;
let selectedChip = 0;
let stakes = new Map();
let previous = new Map();
let undoStack = [];
let history = [];
let lastResult = null;
let pending = null;
let busy = false;
let mode = 'table';
let insidePage = 0;

function setMessage(message = '') { $('#message').textContent = message; }

function validateTotal(bets) {
  const total = totalOf(bets);
  if (total > units(info.maxBet)) return 'Se alcanzó el máximo de la mesa.';
  if (total > units(user.balance)) return 'Saldo insuficiente.';
  return '';
}

function edit(next) {
  if (busy || pending) return;
  const error = validateTotal(next);
  if (error) { setMessage(error); return; }
  undoStack.push(stakes);
  stakes = next;
  setMessage();
  Sound.init();
  Sound.pluck(587.33, 0, .018);
  sync();
}

function addStakes(positions) {
  const next = new Map(stakes);
  for (const [id, count] of Object.entries(positions)) {
    next.set(id, (next.get(id) || 0) + selectedChip * count);
  }
  edit(next);
}

function sync() {
  const locked = busy || Boolean(pending);
  for (const b of document.querySelectorAll('.bet')) {
    const { bet: id } = b.dataset;
    const value = stakes.get(id);
    const def = rules.bets[id];
    const boost = def.kind === 'straight' && lastResult?.boosts.find((x) => x.number === def.numbers[0]);
    b.disabled = locked;
    b.classList.toggle('has-stake', Boolean(value));
    b.classList.toggle('is-winner', Boolean(lastResult && def.numbers.includes(lastResult.number) && (value || def.kind === 'straight')));
    if (boost) b.dataset.mult = `×${boost.mult}`;
    else delete b.dataset.mult;
    b.lastElementChild.hidden = !value;
    b.lastElementChild.textContent = value ? chipFormatter.format(value / UNIT) : '';
    const label = def.kind === 'straight' ? `${def.label}, ${COLORS[rules.colors[def.numbers[0]]]}` : def.label;
    b.setAttribute('aria-label', `${label}${value ? `, apostado ${money(value)}` : ''}${boost ? `, multiplicador ${boost.mult}` : ''}`);
  }
  document.querySelectorAll('#chips button').forEach((b) => {
    b.disabled = locked;
    b.setAttribute('aria-pressed', String(Number(b.dataset.units) === selectedChip));
  });
  document.querySelectorAll('#calls button').forEach((b) => { b.disabled = locked; });
  const total = totalOf(stakes);
  $('#total').textContent = money(total);
  $('#balance').textContent = money(units(user.balance));
  $('#undo').disabled = locked || !undoStack.length;
  $('#double').disabled = locked || !stakes.size || total * 2 > Math.min(units(info.maxBet), units(user.balance));
  $('#repeat').disabled = locked || !previous.size;
  $('#clear').disabled = locked || !stakes.size;
  $('#spin').disabled = busy || (!pending && (!total || total < units(info.minBet) || Boolean(validateTotal(stakes))));
  $('#spin').textContent = busy ? 'Girando…' : pending ? 'Recuperar giro' : 'Girar';
}

function betButton(id, text, style = {}) {
  const b = rules.bets[id];
  const color = b.kind === 'straight' ? rules.colors[b.numbers[0]] : id === 'red' || id === 'black' ? id : '';
  const label = id === 'red' || id === 'black' ? el('span', { class: 'diamond', 'aria-hidden': 'true' }) : el('span', {}, text);
  return el('button', {
    class: `bet ${b.kind} ${color} ${id === 'straight:0' ? 'zero' : ''}`,
    type: 'button', 'data-bet': id, title: `${b.label} · paga ×${b.payout}`,
    style, onclick: () => addStakes({ [id]: 1 }),
  }, label, el('span', { class: 'stake-chip', hidden: true, 'aria-hidden': 'true' }));
}

function position(col, row, smallCol, smallRow) {
  return { cssText: `--col:${col};--row:${row};--small-col:${smallCol};--small-row:${smallRow}` };
}

function buildTable() {
  const numbers = $('#numbers');
  numbers.append(betButton('straight:0', '0'));
  for (let col = 0; col < 12; col++) {
    for (let row = 0; row < 3; row++) {
      const n = col * 3 + 3 - row;
      numbers.append(betButton(`straight:${n}`, String(n), position(col + 2, row + 1, col % 6 + 1, row + (col < 6 ? 2 : 5))));
    }
  }
  for (let i = 1; i <= 3; i++) {
    const column = betButton(`column:${i}`, '2:1', position(14, 4 - i, i + 3, 1));
    column.firstElementChild.replaceChildren(el('span', { class: 'wide-column' }, '2:1'), el('span', { class: 'small-column' }, `Col. ${i}`));
    numbers.append(column);
    $('#dozens').append(betButton(`dozen:${i}`, `${i}.ª docena`));
  }
  for (const id of ['low', 'even', 'red', 'black', 'odd', 'high']) $('#outsides').append(betButton(id, rules.bets[id].label));
  for (const [kind, name] of Object.entries(INSIDE)) $('#insideType').append(el('option', { value: kind }, name));
  for (const n of rules.wheel) $('#trackPockets').append(betButton(`straight:${n}`, String(n)));
  for (const call of rules.calls) {
    const count = Object.values(call.stakes).reduce((sum, n) => sum + n, 0);
    $('#calls').append(el('button', {
      type: 'button', onclick: () => addStakes(call.stakes),
      title: Object.entries(call.stakes).map(([id, qty]) => `${qty} × ${rules.bets[id].label}`).join(', '),
    }, call.label, el('small', {}, `${count} fichas`)));
  }
  for (const value of info.chips) $('#chips').append(el('button', {
    type: 'button', 'data-units': units(value), 'aria-label': `Ficha de ${value} créditos`,
    onclick: () => { selectedChip = units(value); sync(); },
  }, String(value).replace('.', ',')));
  $('#chips').style.setProperty('--chip-count', info.chips.length);
  $('#limits').textContent = `${money(units(info.minBet))}–${money(units(info.maxBet))}`;
  renderInside();
}

function renderInside() {
  const kind = $('#insideType').value;
  const bets = Object.entries(rules.bets).filter(([, b]) => b.kind === kind);
  const pageCount = Math.ceil(bets.length / INSIDE_PAGE_SIZE);
  const first = insidePage * INSIDE_PAGE_SIZE;
  $('#groups').replaceChildren(...bets.slice(first, first + INSIDE_PAGE_SIZE).map(([id, b]) => betButton(id, b.numbers.join('–'))));
  $('#insidePayout').textContent = `Pago ×${bets[0][1].payout}`;
  $('#insidePages').hidden = pageCount === 1;
  $('#insidePage').textContent = `${insidePage + 1} de ${pageCount}`;
  $('#insidePrev').disabled = insidePage === 0;
  $('#insideNext').disabled = insidePage + 1 >= pageCount;
}

function changeInsidePage(page) {
  insidePage = page;
  renderInside();
  sync();
}

function switchMode(next) {
  mode = next;
  $('#classic').hidden = mode !== 'table';
  $('#inside').hidden = mode !== 'inside';
  $('#track').hidden = mode !== 'track';
  document.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
}

function refreshRecent() {
  $('#recentNumbers').replaceChildren(...history.slice(0, 9).map(({ number }) =>
    el('span', { class: `pocket ${rules.colors[number]}`, 'aria-label': `${number}, ${COLORS[rules.colors[number]]}` }, number)));
  $('#recent').hidden = !history.length;
}

function presentation(round) {
  const { result } = round;
  const pocket = $('#resultNumber');
  pocket.hidden = false;
  pocket.className = `pocket ${result.color}`;
  pocket.textContent = result.number;
  pocket.setAttribute('aria-label', `${result.number}, ${COLORS[result.color]}`);
  const payout = units(round.win) - units(round.bet);
  $('#resultTitle').textContent = payout > 0 ? `+${money(payout)} créditos netos` : payout === 0 ? 'Apuesta recuperada' : 'Giro finalizado';
  $('#resultDetail').textContent = `${result.number} · ${COLORS[result.color]} · Pago ${money(units(round.win))}`;
  const boosts = $('#boosts');
  boosts.hidden = !result.boosts.length;
  boosts.replaceChildren(...result.boosts.map(({ number, mult }) =>
    el('span', { class: number === result.number ? 'landed' : '' }, `${number} · ×${mult}`)));
}

function savePending(value) {
  pending = value;
  try {
    if (pending) sessionStorage.setItem(storageKey, JSON.stringify(pending));
    else sessionStorage.removeItem(storageKey);
  } catch { /* La mesa conserva el giro en memoria si el navegador bloquea almacenamiento. */ }
}

function newRequestId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) => n.toString(16).padStart(2, '0')).join('');
}

async function spin() {
  if (busy || $('#spin').disabled) return;
  const recovering = Boolean(pending);
  if (!pending) savePending({
    gameId, requestId: newRequestId(),
    bets: [...stakes.entries()].map(([id, value]) => ({ id, amount: value / UNIT })),
  });
  busy = true;
  const request = pending;
  setMessage();
  sync();
  Sound.init();
  let round;
  try {
    round = await api('/api/spin', { method: 'POST', body: request });
  } catch (err) {
    if (err.status && err.status < 500 && err.status !== 401) savePending(null);
    setMessage(err.status === 401 ? 'La sesión venció. Entra de nuevo para recuperar el giro.' :
      pending ? 'No se pudo confirmar el giro. Usa «Recuperar giro» para consultar la misma ronda.' : err.message);
  }
  if (round) {
    previous = new Map(request.bets.map(({ id, amount }) => [id, units(amount)]));
    stakes = new Map();
    undoStack = [];
    lastResult = round.result;
    user.balance = round.balance;
    if (recovering) {
      const current = await api('/api/me').catch(() => null);
      if (current?.id === user.id) user.balance = current.balance;
    }
    savePending(null);
    $('#resultTitle').textContent = 'La rueda está girando';
    $('#resultDetail').textContent = '';
    $('#resultNumber').hidden = true;
    $('#boosts').hidden = true;
    Sound.tone(110, .32, { type: 'triangle', vol: .032, slide: 100 });
    try { await wheel.spin(round.result); }
    finally {
      presentation(round);
      history = [{ roundId: round.roundId, ts: round.ts, number: round.result.number, bet: round.bet, win: round.win },
        ...history.filter((h) => h.roundId !== round.roundId)].slice(0, 50);
      refreshRecent();
      if (round.win > 0) [329.63, 440, 587.33].forEach((f, i) => Sound.pluck(f, .11 * i, .028));
    }
  }
  busy = false;
  sync();
}

function showDialog(title, ...content) {
  $('#dialogTitle').textContent = title;
  $('#dialogBody').replaceChildren(...content);
  if (!dlg.open) dlg.showModal();
}

function showRules() {
  const types = new Map();
  for (const b of Object.values(rules.bets)) if (!types.has(b.kind)) types.set(b.kind, b.payout);
  const names = { straight: 'Pleno', ...INSIDE, column: 'Columna', dozen: 'Docena', outside: 'Suerte sencilla' };
  showDialog('Reglas y pagos',
    el('p', {}, 'Elige una ficha y colócala en la mesa. Combinadas cubre varios números con una ficha. En Pista, las apuestas de vecindad colocan varias fichas en una sola acción.'),
    el('p', {}, 'Los pagos incluyen la ficha ganadora. El 0 pierde en rojo, negro, par, impar, bajo y alto.'),
    rules.boost ? el('p', {}, `En cada giro se marcan ${rules.boost.count} números con pagos de ${rules.boost.values.map((x) => `×${x}`).join(', ')}. El multiplicador reemplaza el pago base si aciertas ese número con un pleno.`) : null,
    el('table', {}, el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Apuesta'), el('th', { scope: 'col' }, 'Pago base'))),
      el('tbody', {}, [...types].map(([kind, payout]) => el('tr', {}, el('td', {}, names[kind]), el('td', {}, `×${payout}`))))),
  );
}

function showStats() {
  const count = Math.min(50, history.length);
  if (!count) { showDialog('Estadísticas', el('p', {}, 'Todavía no tienes resultados en esta mesa.')); return; }
  const content = el('div');
  const range = el('select', { id: 'statRange', onchange: render }, [...new Set([Math.min(10, count), Math.min(25, count), count])]
    .map((n) => el('option', { value: n, selected: n === count }, `${n} giros`)));
  function render() {
    const frequency = Array(37).fill(0);
    history.slice(0, Number(range.value)).forEach(({ number }) => { frequency[number]++; });
    const max = Math.max(...frequency);
    const order = rules.wheel.map((number) => ({ number, hits: frequency[number] })).sort((a, b) => b.hits - a.hits);
    content.replaceChildren(el('div', { class: 'frequency' }, order.map(({ number, hits }) =>
      el('div', {}, el('b', { class: `pocket ${rules.colors[number]}` }, number),
        el('meter', { min: 0, max, value: hits, 'aria-label': `Frecuencia del ${number}` }), el('small', {}, `${hits} ${hits === 1 ? 'salida' : 'salidas'}`)))));
  }
  render();
  showDialog('Estadísticas', el('p', {}, el('label', { for: 'statRange' }, 'Tus últimos '), range), content);
}

function showHistory() {
  const list = el('div', { class: 'history-list' }, history.length ? history.map((r) => el('button', {
    type: 'button', onclick: () => verify(r.roundId),
  }, el('b', { class: `pocket ${rules.colors[r.number]}` }, r.number),
  el('span', {}, new Date(r.ts).toLocaleString('es'), el('br'), `Apuesta ${money(units(r.bet))} · Pago ${money(units(r.win))}`), el('span', {}, 'Verificar ›')))
    : el('p', {}, 'Aún no hay rondas en esta mesa.'));
  showDialog('Historial', list);
}

async function verify(roundId) {
  const out = el('div', {}, 'Reproduciendo ronda…');
  showDialog('Verificación', el('button', { type: 'button', onclick: showHistory }, '‹ Historial'), out);
  try {
    const { round, ok, reason, result } = await api(`/api/rounds/${roundId}/verify`);
    out.replaceChildren(
      el('p', {}, el('strong', {}, ok ? `✓ ${reason}` : reason)),
      result ? el('p', {}, `${result.number} · ${COLORS[result.color]} · Pago ${money(result.paid)}`) : null,
      result ? el('ul', {}, result.bets.map((b) => el('li', {}, `${b.label} · Fichas ${money(b.units)} · Pago ${money(b.win)}`))) : null,
      el('dl', { class: 'verify-meta' },
        el('dt', {}, 'Ronda'), el('dd', {}, round.roundId),
        el('dt', {}, 'Semilla'), el('dd', {}, round.seed),
        el('dt', {}, 'Versión de matemática'), el('dd', {}, round.cfg),
        el('dt', {}, 'Hash del resultado'), el('dd', {}, round.rh)),
    );
  } catch (err) { out.textContent = err.message; }
}

async function init() {
  [info, user] = await Promise.all([api(`/api/games/${encodeURIComponent(gameId)}`), api('/api/me')]);
  if (!user) {
    sessionStorage.setItem('after-login', location.pathname);
    location.replace('/?login');
    return;
  }
  if (info.engine !== 'roulette') throw new Error('Mesa no disponible');
  rules = info.roulette;
  storageKey = `roulette:${gameId}:${user.id}:pending`;
  try { pending = JSON.parse(sessionStorage.getItem(storageKey)); } catch { pending = null; }
  if (pending) stakes = new Map(pending.bets.map(({ id, amount }) => [id, units(amount)]));
  $('#title').textContent = info.name;
  document.title = `${info.name} · VLT Royale`;
  const varies = info.maxRtp - info.rtp > 1e-9;
  $('#rtp').textContent = `RTP ${rtp(info.rtp)}${varies ? `–${rtp(info.maxRtp)}` : ''}`;
  $('#maxWin').textContent = `Hasta ×${info.maxWin}`;
  $('#creditLabel').textContent = user.demo ? 'Créditos demo' : 'Créditos';
  const root = document.documentElement.style;
  for (const [key, property] of Object.entries({ bg1: '--deep', bg2: '--felt', accent: '--gold', ink: '--ink' })) {
    if (info.theme[key]) root.setProperty(property, info.theme[key]);
  }
  if (info.theme.art) root.setProperty('--art', `url("${info.theme.art}")`);
  wheel = createWheel($('#wheel'), rules);
  selectedChip = units(info.defaultChip);
  buildTable();
  if (pending) setMessage('Hay un giro pendiente de confirmar.');
  history = await api(`/api/history?game=${encodeURIComponent(gameId)}`).catch(() => []);
  if (history[0]?.stakes) previous = new Map(history[0].stakes.map(({ id, units: value }) => [id, value]));
  refreshRecent();
  sync();
  $('#menuBtn').disabled = false;
  $('#menuBtn').onclick = () => showDialog('Menú de la ruleta', el('div', { class: 'game-menu' },
    el('button', { type: 'button', onclick: showHistory }, 'Historial'),
    el('button', { type: 'button', onclick: showStats }, 'Estadísticas'),
    el('button', { type: 'button', onclick: showRules }, 'Reglas y pagos'),
  ));
  $('#insideType').onchange = () => changeInsidePage(0);
  $('#insidePrev').onclick = () => changeInsidePage(insidePage - 1);
  $('#insideNext').onclick = () => changeInsidePage(insidePage + 1);
  document.querySelectorAll('[data-mode]').forEach((b) => { b.onclick = () => switchMode(b.dataset.mode); });
  $('#undo').onclick = () => { stakes = undoStack.pop(); setMessage(); sync(); };
  $('#double').onclick = () => edit(new Map([...stakes].map(([id, value]) => [id, value * 2])));
  $('#repeat').onclick = () => edit(new Map(previous));
  $('#clear').onclick = () => edit(new Map());
  $('#spin').onclick = () => spin().catch((err) => { busy = false; setMessage(err.message); sync(); });
}

try { Sound.on = localStorage.getItem('roulette-sound') !== 'off'; } catch { /* Valor de la sesión. */ }
soundButton(Sound.on);
$('#soundBtn').onclick = () => {
  Sound.on = !Sound.on;
  try { localStorage.setItem('roulette-sound', Sound.on ? 'on' : 'off'); } catch { /* Valor de la sesión. */ }
  soundButton(Sound.on);
  if (Sound.on) { Sound.init(); Sound.pluck(440); }
};
init().catch((err) => {
  $('#resultTitle').textContent = 'Mesa no disponible';
  $('#resultDetail').textContent = err.message;
});
