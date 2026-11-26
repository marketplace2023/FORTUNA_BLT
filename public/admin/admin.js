import { api, money, el, toast } from '/js/api.js';

const $ = (s) => document.querySelector(s);
const view = $('#view');
const modal = $('#modal');
let ME = null;
let GAMES = [];
const pct = (v, d = 2) => (v === null || v === undefined ? '—' : `${v.toFixed(d)}%`);
const dt = (s) => (s ? new Date(s).toLocaleString('es', { dateStyle: 'short', timeStyle: 'medium' }) : '—');
const gameName = (id) => GAMES.find((g) => g.id === id)?.name || id;
const short = (h, n = 10) => (h ? `${h.slice(0, n)}…` : '');

// ───────────── Sesión ─────────────
async function boot() {
  try { ME = await api('/admin/api/me'); } catch { ME = null; }
  if (!ME) { $('#login').hidden = false; $('#app').hidden = true; return; }
  document.querySelectorAll('[data-site]').forEach((n) => (n.textContent = ME.site));
  $('#login').hidden = true;
  $('#app').hidden = false;
  $('#who').textContent = ME.username;
  GAMES = await api('/admin/api/games');
  route();
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try { await api('/admin/api/login', { method: 'POST', body: { username: e.target.username.value, password: e.target.password.value } }); boot(); }
  catch (err) { $('#loginErr').textContent = err.message; }
});
$('#logout').addEventListener('click', async () => { await api('/admin/api/logout', { method: 'POST', body: {} }); location.hash = ''; boot(); });
$('#menuBtn').addEventListener('click', () => $('#side').classList.toggle('open'));
window.addEventListener('hashchange', route);

const VIEWS = { dashboard, players, rounds, games, par, audit, settings };
async function route() {
  if (!ME) return;
  const [v, arg] = (location.hash.slice(1) || 'dashboard').split('/');
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.v === v));
  $('#side').classList.remove('open');
  view.replaceChildren(el('div', { class: 'empty' }, 'Cargando…'));
  try { await (VIEWS[v] || dashboard)(arg && decodeURIComponent(arg)); }
  catch (e) { if (e.status === 401) return boot(); view.replaceChildren(el('div', { class: 'empty' }, e.message)); }
}

function card(title, sub, body, actions) {
  return el('section', { class: 'card' },
    el('div', { class: 'card-h' }, el('div', {}, el('h2', {}, title), sub ? el('div', { class: 'sub' }, sub) : null), actions || null),
    body);
}
function table(headers, rows, { onRow } = {}) {
  if (!rows.length) return el('div', { class: 'empty' }, 'Sin datos');
  return el('table', { class: 't' },
    el('thead', {}, el('tr', {}, headers.map((h) => el('th', { class: h.num ? 'num' : '' }, h.label ?? h)))),
    el('tbody', {}, rows.map((r) => {
      const tr = el('tr', { class: onRow ? 'click' : '' }, r.cells.map((c, i) => el('td', { class: headers[i]?.num ? 'num' : '' }, c)));
      if (onRow) tr.addEventListener('click', () => onRow(r.data));
      return tr;
    })));
}
function kpi(l, v, s) { return el('div', { class: 'kpi' }, el('div', { class: 'l' }, l), el('div', { class: 'v' }, v), s ? el('div', { class: 's' }, s) : null); }
function rtpChip(actual, theo) {
  if (actual === null || actual === undefined) return el('span', { class: 'mute' }, '—');
  const d = actual - theo;
  return el('span', { class: `chip ${Math.abs(d) < 3 ? 'good' : Math.abs(d) < 10 ? 'warn' : 'bad'}`, title: `Diferencia con el teórico: ${d >= 0 ? '+' : ''}${d.toFixed(2)} pp` }, pct(actual));
}

function openModal(title, ...body) {
  $('#modalBody').replaceChildren(
    el('div', { class: 'modal-h' }, el('h3', {}, title), el('button', { class: 'x', type: 'button', onclick: () => modal.close(), 'aria-label': 'Cerrar' }, '✕')),
    el('div', { class: 'modal-b' }, ...body));
  modal.showModal();
}

// ───────────── Dashboard ─────────────
async function dashboard() {
  const d = await api('/admin/api/dashboard');
  $('#barStats').replaceChildren(
    el('div', {}, 'GGR (real)', el('b', {}, money(d.real.ggr))),
    el('div', {}, 'RTP real', el('b', {}, pct(d.real.rtp))),
    el('div', {}, 'Saldos jugadores', el('b', {}, money(d.liability))),
    el('div', {}, 'Libro mayor', el('b', { class: 'mono' }, `#${d.ledger.entries} · ${short(d.ledger.head, 8)}`)),
  );
  view.replaceChildren(
    el('h1', { class: 'vt' }, 'Dashboard', el('button', { class: 'btn sm', type: 'button', onclick: route }, '↻ Recargar')),
    el('div', { class: 'kpis' },
      kpi('Rondas reales', d.real.rounds.toLocaleString('es'), d.today ? `Hoy: ${d.today.rounds.toLocaleString('es')}` : 'Hoy: 0'),
      kpi('Apostado (coin in)', money(d.real.coinIn), d.today ? `Hoy: ${money(d.today.coinIn)}` : null),
      kpi('Pagado (coin out)', money(d.real.coinOut), d.today ? `Hoy: ${money(d.today.coinOut)}` : null),
      kpi('GGR', money(d.real.ggr), d.today ? `Hoy: ${money(d.today.ggr)}` : null),
      kpi('RTP real', pct(d.real.rtp), `Frecuencia de premio ${pct(d.real.hitRate, 1)}`),
      kpi('Jugadores', d.players.total.toLocaleString('es'), `${d.players.demo} demo · ${d.players.blocked} bloqueados`),
      kpi('Saldo de jugadores', money(d.liability), 'Pasivo con jugadores reales'),
      kpi('Rondas demo', d.demo.rounds.toLocaleString('es'), `RTP demo ${pct(d.demo.rtp)}`),
    ),
    card('GGR diario', 'Últimos 14 días · créditos reales (apostado − pagado)', el('div', { class: 'card-b' }, barChart(d.days))),
    card('Rendimiento por juego', 'RTP teórico (hoja PAR) frente al RTP observado en dinero real. Con pocas rondas la diferencia es normal.', el('div', { class: 'card-b flush' }, table(
      ['Juego', 'Estado', { label: 'Rondas', num: true }, { label: 'Apostado', num: true }, { label: 'Pagado', num: true }, { label: 'GGR', num: true }, { label: 'RTP teórico', num: true }, { label: 'RTP real', num: true }, { label: 'Premio máx.', num: true }],
      d.perGame.map((g) => ({ data: g, cells: [g.name, el('span', { class: `chip ${g.enabled ? 'good' : 'neutral'}` }, g.enabled ? 'activo' : 'apagado'), (g.real?.rounds || 0).toLocaleString('es'), money(g.real?.coinIn), money(g.real?.coinOut), money(g.real?.ggr), pct(g.theoreticalRtp), rtpChip(g.real?.rtp ?? null, g.theoreticalRtp), money(g.real?.maxWin)] })),
      { onRow: (g) => { location.hash = `rounds/${g.id}`; } },
    ))),
    card('Últimas rondas', null, el('div', { class: 'card-b flush' }, roundsTable(d.recent))),
  );
}

/** Barras de GGR por día: una sola serie, eje cero visible, tooltip por barra. */
function niceStep(span, ticks) {
  const raw = span / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

function barChart(days) {
  if (!days.some((d) => d.rounds > 0)) return el('div', { class: 'empty' }, 'Aún no hay rondas con dinero real en los últimos 14 días.');
  const W = 840, H = 220, padL = 56, padB = 26, padT = 10;
  const vals = days.map((d) => d.ggr);
  const step = niceStep(Math.max(1e-9, Math.max(0, ...vals) - Math.min(0, ...vals)), 4);
  const max = Math.ceil(Math.max(0, ...vals) / step) * step || step;
  const min = Math.floor(Math.min(0, ...vals) / step) * step;
  const span = max - min;
  const y = (v) => padT + (H - padT - padB) * (1 - (v - min) / span);
  const bw = (W - padL) / days.length;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'GGR diario de los últimos 14 días');
  const mk = (tag, attrs, text) => { const n = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); if (text !== undefined) n.textContent = text; svg.append(n); return n; };
  const ax = mk('g', { class: 'axis' });
  const dec = step < 1 ? Math.ceil(-Math.log10(step)) : 0;
  for (let v = min; v <= max + step / 2; v += step) {
    const yy = y(v);
    mk('line', { class: 'gridline', x1: padL, x2: W, y1: yy, y2: yy });
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('x', padL - 8); t.setAttribute('y', yy + 4); t.setAttribute('text-anchor', 'end');
    t.textContent = Math.abs(v) >= 10000 ? `${(v / 1000).toLocaleString('es', { maximumFractionDigits: 1 })}k` : v.toLocaleString('es', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    ax.append(t);
  }
  mk('line', { class: 'zero', x1: padL, x2: W, y1: y(0), y2: y(0) });
  const wrap = el('div', { class: 'chart' });
  const tip = el('div', { class: 'tip' });
  days.forEach((d, i) => {
    const x = padL + i * bw;
    const barW = Math.max(6, Math.min(28, bw * 0.55));
    const bx = x + (bw - barW) / 2;
    const y0 = y(0), y1 = y(d.ggr);
    const top = Math.min(y0, y1), h = Math.max(d.ggr === 0 ? 0 : 1, Math.abs(y1 - y0));
    const r = Math.min(4, h / 2, barW / 2);
    const neg = d.ggr < 0;
    // Extremo de datos redondeado (4px), base recta sobre el eje cero.
    const path = neg
      ? `M${bx},${top} h${barW} v${h - r} q0,${r} -${r},${r} h-${barW - 2 * r} q-${r},0 -${r},-${r} z`
      : `M${bx},${top + h} v-${h - r} q0,-${r} ${r},-${r} h${barW - 2 * r} q${r},0 ${r},${r} v${h - r} z`;
    const hit = mk('rect', { class: 'hit', x, y: padT, width: bw, height: H - padT - padB });
    const bar = mk('path', { class: 'barm', d: h ? path : '', fill: neg ? 'var(--bar-neg)' : 'var(--bar)' });
    if (i % 2 === 0 || days.length <= 8) mk('text', { x: x + bw / 2, y: H - 6, 'text-anchor': 'middle', class: 'axis-l', fill: 'var(--mute)', 'font-size': 11 }, d.day.slice(5).replace('-', '/'));
    hit.addEventListener('mouseenter', () => {
      bar.classList.add('hl');
      tip.replaceChildren(el('strong', {}, d.day), el('br'), `GGR ${money(d.ggr)}`, el('br'), `Apostado ${money(d.coinIn)} · Pagado ${money(d.coinOut)}`, el('br'), `${d.rounds.toLocaleString('es')} rondas · RTP ${pct(d.rtp)}`);
      const rect = svg.getBoundingClientRect();
      tip.style.left = `${((x + bw / 2) / W) * rect.width}px`;
      tip.style.top = `${(top / H) * rect.height}px`;
      tip.classList.add('on');
    });
    hit.addEventListener('mouseleave', () => { bar.classList.remove('hl'); tip.classList.remove('on'); });
  });
  wrap.append(svg, tip);
  return wrap;
}

function roundsTable(list) {
  return table(
    ['Ronda', 'Fecha', 'Jugador', 'Juego', { label: 'Apuesta', num: true }, { label: 'Ganancia', num: true }, { label: 'Saldo', num: true }, 'Función', 'Asiento'],
    list.map((r) => ({ data: r, cells: [el('span', { class: 'mono' }, r.roundId), dt(r.ts), [r.username || r.playerId, r.demo ? ' ' : '', r.demo ? el('span', { class: 'chip neutral' }, 'demo') : ''], gameName(r.gameId), money(r.bet), r.win > 0 ? el('strong', {}, money(r.win)) : money(r.win), money(r.balance), r.feat ? el('span', { class: 'chip warn' }, featName(r.feat)) : '', el('span', { class: 'mono mute' }, `#${r.seq}`)] })),
    { onRow: (r) => roundDetail(r.roundId) },
  );
}
const featName = (f) => ({ free: 'giros gratis', respinLock: 'respin', wildReels: 'rodillos wild', rouletteBoost: 'número multiplicado' }[f] || f);

// ───────────── Detalle de ronda (game recall) ─────────────
async function roundDetail(id) {
  const d = await api(`/admin/api/rounds/${id}`);
  const r = d.round, rp = d.replay;
  const body = [
    el('div', { class: `verify ${rp.ok ? 'ok' : 'bad'}` }, rp.ok ? '✓ ' : '✗ ', rp.reason),
    el('div', { class: 'kv' },
      el('span', {}, 'Jugador'), el('span', {}, `${r.username} (${r.playerId})${r.demo ? ' · demo' : ''}`),
      el('span', {}, 'Juego'), el('span', {}, gameName(r.gameId)),
      el('span', {}, 'Fecha'), el('span', {}, dt(r.ts)),
      el('span', {}, 'Apuesta / Ganancia'), el('span', {}, `${money(r.bet)} / ${money(r.win)} (${(r.win / r.bet).toFixed(2)}x)`),
      el('span', {}, 'Saldo tras la ronda'), el('span', {}, money(r.balance)),
      el('span', {}, 'Asiento del libro'), el('span', {}, `#${r.seq}`),
    ),
  ];
  if (rp.result && d.game) body.push(el('div', {}, el('strong', {}, 'Reproducción'), el('div', { class: 'frames', style: { marginTop: '8px' } }, framesOf(rp.result, d.game))));
  body.push(el('div', { class: 'kv' },
    el('span', {}, 'Semilla'), el('span', { class: 'mono' }, r.seed),
    el('span', {}, 'Versión matemática'), el('span', { class: 'mono' }, r.cfg),
    el('span', {}, 'Hash del resultado'), el('span', { class: 'mono' }, r.rh),
    el('span', {}, 'Hash recalculado'), el('span', { class: 'mono' }, rp.resultHash || '—'),
    el('span', {}, 'Hash del asiento'), el('span', { class: 'mono' }, r.hash),
    el('span', {}, 'Asiento anterior'), el('span', { class: 'mono' }, r.prev),
  ));
  openModal(`Ronda ${r.roundId}`, ...body);
}

function miniGrid(grid, game, wins) {
  const hit = new Set();
  for (const w of wins || []) for (const [c, r] of w.pos) hit.add(`${c},${r}`);
  const g = el('div', { class: 'mini-grid', style: { gridTemplateColumns: `repeat(${grid.length}, 34px)` } });
  for (let r = 0; r < grid[0].length; r++) for (let c = 0; c < grid.length; c++) {
    const s = grid[c][r];
    const isM = s[0] === 'M' && s.length > 1;
    g.append(el('span', { class: `${hit.has(`${c},${r}`) ? 'w' : ''} ${isM ? 'm' : ''}`, title: isM ? `Multiplicador x${s.slice(1)}` : game.symbols[s]?.n }, isM ? `x${s.slice(1)}` : game.symbols[s]?.g || ''));
  }
  return g;
}
function framesOf(res, game) {
  if (res.engine === 'roulette') {
    const color = { red: 'rojo', black: 'negro', green: 'verde' }[res.color];
    return [el('div', { style: { width: '100%' } },
      el('p', {}, el('strong', {}, `${res.number} · ${color}`),
        res.boosts.length ? ` · Multiplicadores: ${res.boosts.map(({ number, mult }) => `${number} ×${mult}`).join(' / ')}` : ''),
      table(['Posición', 'Apuesta', 'Pago'], res.bets.map((b) => ({ cells: [b.label, money(b.units / 10000), money(b.win / 10000)] }))),
    )];
  }
  if (res.engine === 'race') {
    return el('div', { class: 'note' },
      el('strong', {}, `${res.card.distance} m · Pista ${res.card.surface}`),
      el('p', {}, `Caballo elegido: ${res.card.horses.find(h => h.id === res.selected).name}`),
      el('ol', {}, res.order.map(id => {
        const h = res.card.horses.find(h => h.id === id);
        return el('li', {}, `#${id} ${h.name} · cuota ${h.odds.toFixed(2)} · ${(res.runners.find(r => r.id === id).finishMs / 1000).toFixed(3)} s`);
      })),
    );
  }
  const out = [];
  const add = (fr, cap) => out.push(el('div', {}, miniGrid(fr.grid, game, fr.wins), el('div', { class: 'frame-cap' }, cap)));
  const capOf = (fr, i) => `${i === 0 ? 'Giro' : `Cascada ${i}`}${fr.mult ? ` · x${fr.mult}` : ''}${fr.win ? ` · ${fr.win.toFixed(2)}x` : ''}`;
  if (res.engine === 'lines') res.frames.forEach((fr, i) => add(fr, fr.respin !== undefined ? `Respin ${fr.respin}${fr.win ? ` · ${fr.win.toFixed(2)}x` : ''}` : fr.wildReels ? 'Rodillos wild' : `Giro${fr.win ? ` · ${fr.win.toFixed(2)}x` : ''}`));
  else {
    res.base.frames.slice(0, 8).forEach((fr, i) => add(fr, capOf(fr, i)));
    if (res.free) out.push(el('div', { class: 'note' }, `Giros gratis: ${res.free.spins.length} jugados, ${res.free.retriggers} reactivaciones, total ${res.free.win.toFixed(2)}x la apuesta.`));
  }
  if (res.capped) out.push(el('div', { class: 'note' }, 'Ronda limitada por el premio máximo del juego.'));
  return out;
}

// ───────────── Jugadores ─────────────
async function players() {
  let demo = false, q = '';
  const body = el('div', { class: 'card-b flush' });
  const load = async () => {
    const list = await api(`/admin/api/players?demo=${demo ? 1 : 0}&q=${encodeURIComponent(q)}`);
    body.replaceChildren(table(
      ['Usuario', 'ID', { label: 'Saldo', num: true }, { label: 'Rondas', num: true }, { label: 'Apostado', num: true }, { label: 'Ganado', num: true }, { label: 'RTP', num: true }, 'Última actividad', 'Estado', ''],
      list.map((p) => ({ data: p, cells: [
        el('strong', {}, p.username), el('span', { class: 'mono mute' }, p.id), money(p.balance), (p.meters?.rounds || 0).toLocaleString('es'), money(p.meters?.coinIn), money(p.meters?.coinOut), pct(p.meters?.rtp), dt(p.meters?.lastAt || p.createdAt),
        el('span', { class: `chip ${p.blocked ? 'bad' : 'good'}` }, p.blocked ? 'bloqueado' : 'activo'),
        el('div', { class: 'row' },
          !p.demo ? el('button', { class: 'btn sm', type: 'button', onclick: (e) => { e.stopPropagation(); creditDialog(p, load); } }, 'Saldo') : null,
          el('button', { class: `btn sm ${p.blocked ? '' : 'danger'}`, type: 'button', onclick: async (e) => { e.stopPropagation(); await api(`/admin/api/players/${p.id}/block`, { method: 'POST', body: { blocked: !p.blocked } }); toast(p.blocked ? 'Desbloqueado' : 'Bloqueado'); load(); } }, p.blocked ? 'Desbloquear' : 'Bloquear'),
        ),
      ] })),
      { onRow: (p) => { location.hash = `rounds/player:${p.id}`; } },
    ));
  };
  const tabs = el('div', { class: 'tabs' },
    el('button', { class: 'on', type: 'button', onclick: (e) => { demo = false; tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.target)); load(); } }, 'Reales'),
    el('button', { type: 'button', onclick: (e) => { demo = true; tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.target)); load(); } }, 'Demo'));
  const search = el('input', { type: 'text', placeholder: 'Buscar usuario o ID', oninput: (e) => { q = e.target.value; clearTimeout(search._t); search._t = setTimeout(load, 250); } });
  view.replaceChildren(
    el('h1', { class: 'vt' }, 'Jugadores', el('button', { class: 'btn primary', type: 'button', onclick: () => createPlayer(load) }, '+ Crear jugador')),
    card('Cuentas', 'Haz clic en una fila para ver sus rondas.', body, el('div', { class: 'row' }, tabs, search)),
  );
  await load();
}

function creditDialog(p, done) {
  const f = el('form', { class: 'form' },
    el('div', { class: 'kv' }, el('span', {}, 'Jugador'), el('span', {}, p.username), el('span', {}, 'Saldo actual'), el('span', {}, money(p.balance))),
    el('label', {}, 'Importe (positivo para abonar, negativo para retirar)', el('input', { name: 'amount', type: 'number', step: '0.01', required: true })),
    el('label', {}, 'Motivo (queda en el libro mayor)', el('input', { name: 'note', type: 'text', required: true, maxlength: 200, placeholder: 'Depósito en caja, retiro, corrección…' })),
    el('button', { class: 'btn primary', type: 'submit' }, 'Registrar movimiento'));
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    try { const r = await api(`/admin/api/players/${p.id}/credit`, { method: 'POST', body: { amount: Number(f.amount.value), note: f.note.value } }); toast(`Asiento #${r.seq} · nuevo saldo ${money(r.balance)}`); modal.close(); done(); }
    catch (err) { toast(err.message, 'error'); }
  });
  openModal('Movimiento de saldo', f);
}

function createPlayer(done) {
  const f = el('form', { class: 'form' },
    el('label', {}, 'Usuario', el('input', { name: 'username', required: true, pattern: '[a-zA-Z0-9_]{3,20}' })),
    el('label', {}, 'Contraseña (mín. 8)', el('input', { name: 'password', type: 'password', required: true, minlength: 8 })),
    el('label', {}, 'Saldo inicial', el('input', { name: 'credits', type: 'number', step: '0.01', min: 0, value: 0 })),
    el('button', { class: 'btn primary', type: 'submit' }, 'Crear'));
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await api('/admin/api/players', { method: 'POST', body: { username: f.username.value, password: f.password.value, credits: Number(f.credits.value) } }); toast('Jugador creado'); modal.close(); done(); }
    catch (err) { toast(err.message, 'error'); }
  });
  openModal('Crear jugador', f);
}

// ───────────── Rondas ─────────────
async function rounds(arg) {
  const st = { game: '', player: '', q: '', demo: '0', minWin: '' };
  if (arg?.startsWith('player:')) st.player = arg.slice(7);
  else if (arg) st.game = arg;
  const body = el('div', { class: 'card-b flush' });
  const load = async () => {
    const qs = new URLSearchParams(Object.entries({ ...st, limit: 200 }).filter(([, v]) => v !== ''));
    body.replaceChildren(roundsTable(await api(`/admin/api/rounds?${qs}`)));
  };
  const gameSel = el('select', { onchange: (e) => { st.game = e.target.value; load(); } }, el('option', { value: '' }, 'Todos'), GAMES.map((g) => el('option', { value: g.id, selected: g.id === st.game }, g.name)));
  const filters = el('div', { class: 'filters' },
    el('label', {}, 'Juego', gameSel),
    el('label', {}, 'Tipo', el('select', { onchange: (e) => { st.demo = e.target.value; load(); } }, el('option', { value: '0' }, 'Reales'), el('option', { value: '1' }, 'Demo'), el('option', { value: '' }, 'Todas'))),
    el('label', {}, 'Ganancia mínima', el('input', { type: 'number', min: 0, step: '1', style: { width: '110px' }, onchange: (e) => { st.minWin = e.target.value; load(); } })),
    el('label', {}, 'Buscar', el('input', { type: 'text', placeholder: 'ID de ronda o usuario', onchange: (e) => { st.q = e.target.value; load(); } })),
    st.player ? el('button', { class: 'btn sm', type: 'button', onclick: () => { location.hash = 'rounds'; } }, `Jugador ${st.player} ✕`) : null,
  );
  view.replaceChildren(el('h1', { class: 'vt' }, 'Rondas'), card('Historial de jugadas', 'Haz clic en una ronda para reproducirla desde su semilla.', body, filters));
  await load();
}

// ───────────── Juegos ─────────────
async function games() {
  GAMES = await api('/admin/api/games');
  const BET_OPTS = [0.2, 0.4, 1, 2, 4, 10, 20, 40, 100];
  const sel = (g, key) => el('select', { onchange: async (e) => { try { await api(`/admin/api/games/${g.id}`, { method: 'POST', body: { [key]: Number(e.target.value) } }); toast('Guardado'); } catch (err) { toast(err.message, 'error'); games(); } } },
    BET_OPTS.map((b) => el('option', { value: b, selected: g[key] === b }, money(b))));
  view.replaceChildren(
    el('h1', { class: 'vt' }, 'Juegos'),
    el('div', { class: 'note', style: { marginBottom: '18px' } }, 'El RTP de cada juego es fijo y está definido por su matemática (hoja PAR). Este panel no permite alterar resultados ni el RTP por jugador o por día: es lo que hace los juegos auditables. Para cambiar la matemática hay que recalibrar, lo que genera una nueva versión con otro hash.'),
    el('div', { class: 'games' }, GAMES.map((g) => {
      const sw = el('button', { class: `switch ${g.enabled ? 'on' : ''}`, type: 'button', 'aria-label': 'Activar juego', onclick: async () => {
        try { const s = await api(`/admin/api/games/${g.id}`, { method: 'POST', body: { enabled: !g.enabled } }); g.enabled = s.enabled; sw.classList.toggle('on', s.enabled); toast(s.enabled ? `${g.name} activado` : `${g.name} apagado`); } catch (err) { toast(err.message, 'error'); }
      } });
      return el('div', { class: 'game' },
        el('div', { class: 'game-top', style: { background: `linear-gradient(135deg, ${g.theme.bg2}, ${g.theme.bg1})` } }, el('span', { class: 'gl' }, g.cover[0]), el('div', {}, el('h3', {}, g.name), el('small', {}, g.tag)), sw),
        el('div', { class: 'game-b' },
          el('div', { class: 'kv' },
            g.par?.exact ? null : [el('span', {}, 'RTP objetivo'), el('span', {}, pct(g.targetRtp))],
            el('span', {}, g.par?.exact ? 'RTP exacto (PAR)' : 'RTP medido (PAR)'), el('span', {}, g.par?.exact ? (g.par.maxRtp > g.par.rtp + 1e-9 ? `${pct(g.par.rtp)}–${pct(g.par.maxRtp)}` : pct(g.par.rtp)) : g.par ? `${pct(g.par.rtp)} ± ${g.par.ci95.toFixed(2)}` : 'sin PAR'),
            el('span', {}, 'Frecuencia de premio'), el('span', {}, g.par ? pct(g.par.hitRate, 1) : '—'),
            el('span', {}, 'Función cada'), el('span', {}, g.par?.featureEvery ? `1 / ${g.par.featureEvery.toLocaleString('es')}` : '—'),
            el('span', {}, 'Volatilidad'), el('span', {}, g.par?.volatility || '—'),
            el('span', {}, 'Premio máximo'), el('span', {}, `${g.maxWin.toLocaleString('es')}x`),
            el('span', {}, 'Versión'), el('span', { class: 'mono', title: g.configHash }, short(g.configHash, 12)),
          ),
          g.par && !g.par.matches ? el('div', { class: 'note' }, 'La hoja PAR es de otra versión. Ejecuta npm run sim.') : null,
          el('div', { class: 'row' }, el('label', { class: 'mute' }, 'Mín. ', sel(g, 'minBet')), el('label', { class: 'mute' }, 'Máx. ', sel(g, 'maxBet')),
            el('a', { class: 'btn sm', href: `#par/${g.id}` }, 'Hoja PAR'), el('a', { class: 'btn sm', href: `/play/${g.id}`, target: '_blank', rel: 'noopener' }, 'Abrir ↗')),
        ));
    })),
  );
}

// ───────────── Hoja PAR ─────────────
async function par(id) {
  if (!id) {
    view.replaceChildren(el('h1', { class: 'vt' }, 'Matemática (PAR)'), card('Hojas PAR', 'Simulaciones de slots y cálculo exacto de ruletas', el('div', { class: 'card-b flush' }, table(
      ['Juego', 'Motor', { label: 'Giros simulados', num: true }, { label: 'RTP', num: true }, { label: 'IC 95%', num: true }, { label: 'Frec. premio', num: true }, { label: 'Función cada', num: true }, 'Volatilidad', 'Versión'],
      GAMES.map((g) => ({ data: g, cells: [g.name, g.engine, g.par?.exact ? 'Exacta' : g.par?.spins.toLocaleString('es') ?? '—', g.par?.maxRtp > g.par?.rtp + 1e-9 ? `${pct(g.par.rtp, 3)}–${pct(g.par.maxRtp, 3)}` : pct(g.par?.rtp, 3), g.par?.ci95 == null ? '—' : `±${g.par.ci95.toFixed(2)}`, pct(g.par?.hitRate, 1), g.par?.featureEvery ? `1/${g.par.featureEvery}` : '—', g.par?.volatility || '—', g.par ? el('span', { class: `chip ${g.par.matches ? 'good' : 'bad'}` }, g.par.matches ? 'vigente' : 'desactualizada') : '—'] })),
      { onRow: (g) => { location.hash = `par/${g.id}`; } },
    ))));
    return;
  }
  const p = await api(`/admin/api/par/${id}`);
  if (p.exact) {
    view.replaceChildren(
      el('h1', { class: 'vt' }, `Hoja PAR · ${p.name}`, el('a', { class: 'btn sm', href: '#par' }, '← Todas')),
      card('RTP exacto por apuesta', 'Pagos brutos con devolución de la ficha incluida', el('div', { class: 'card-b flush' }, table(
        ['Apuesta', 'Pago base', 'Frecuencia de premio', 'RTP'],
        p.rows.map((row) => ({ cells: [row.label, `×${row.payout}`, pct(row.hitRate, 3), pct(row.rtp, 4)] })),
      ))),
      p.boost ? card('Multiplicadores del pleno', `${p.boost.count} números distintos por giro`, el('div', { class: 'card-b flush' }, table(
        ['Pago bruto', 'Peso'],
        Object.entries(p.boost.weights).map(([x, weight]) => ({ cells: [`×${x}`, weight] })),
      ))) : null,
      card('Identidad', null, el('div', { class: 'card-b kv' }, 'Hash de configuración', el('span', { class: 'mono' }, p.configHash))),
    );
    return;
  }
  const maxPct = Math.max(...p.distribution.map((d) => d.pct));
  view.replaceChildren(
    el('h1', { class: 'vt' }, `Hoja PAR · ${p.name}`, el('a', { class: 'btn sm', href: '#par' }, '← Todas')),
    p.matches ? null : el('div', { class: 'note', style: { marginBottom: '18px' } }, 'Esta hoja corresponde a otra versión de la matemática. Regénerala con npm run sim.'),
    el('div', { class: 'kpis' },
      kpi('RTP total', pct(p.rtp, 3), `IC 95%: ±${p.ci95.toFixed(3)} pp`),
      kpi('RTP juego base', pct(p.baseRtp), null),
      kpi('RTP funciones', pct(p.featureRtp), p.featureEvery ? `1 cada ${p.featureEvery.toLocaleString('es')} giros` : null),
      kpi('Frecuencia de premio', pct(p.hitRate, 2), `Desv. típica ${p.sd.toFixed(2)}x`),
      kpi('Volatilidad', p.volatility, `Premio máx. observado ${p.maxWinX.toFixed(0)}x`),
      kpi('Giros simulados', p.spins.toLocaleString('es'), `${dt(p.generatedAt)}`),
    ),
    card('Distribución de premios', 'Porcentaje de giros por tramo de ganancia (múltiplos de la apuesta)', el('div', { class: 'card-b dist' }, p.distribution.map((d) => el('div', { class: 'dist-row' }, el('span', {}, d.label), el('div', {}, el('div', { class: 'dist-bar', style: { width: `${Math.max(0.3, (d.pct / maxPct) * 100)}%` }, title: `${d.count.toLocaleString('es')} giros` })), el('span', { class: 'num' }, `${d.pct < 0.01 ? d.pct.toExponential(1) : d.pct.toFixed(2)}%`))))),
    card('Tabla de pagos vigente', `Escala de calibración ${p.scale.toFixed(6)} · pagos en unidades del motor`, el('div', { class: 'card-b flush' }, table(['Símbolo', 'Pagos'], Object.entries(p.paytable).map(([k, v]) => ({ cells: [k, v.join(' · ')] }))))),
    card('Identidad', null, el('div', { class: 'card-b kv' }, el('span', {}, 'Hash de configuración'), el('span', { class: 'mono' }, p.configHash), el('span', {}, 'Versión en servidor'), el('span', { class: 'mono' }, p.currentConfigHash))),
  );
}

// ───────────── Auditoría ─────────────
async function audit() {
  let type = '';
  const body = el('div', { class: 'card-b flush' });
  const status = el('div', { class: 'card-b' }, el('span', { class: 'mute' }, 'Pulsa «Verificar ahora» para recalcular toda la cadena de hashes y reproducir las últimas 200 rondas.'));
  const load = async () => {
    const list = await api(`/admin/api/ledger?limit=200${type ? `&type=${type}` : ''}`);
    body.replaceChildren(table(['#', 'Fecha', 'Tipo', 'Detalle', 'Por', 'Hash'], list.map((e) => ({ cells: [
      el('span', { class: 'mono' }, e.seq), dt(e.ts), el('span', { class: 'chip neutral' }, e.type), describe(e), e.by || '—', el('span', { class: 'mono mute', title: e.hash }, short(e.hash, 12)),
    ] }))));
  };
  const verify = async () => {
    status.replaceChildren(el('span', { class: 'mute' }, 'Verificando…'));
    const r = await api('/admin/api/ledger/verify');
    status.replaceChildren(el('div', { class: `verify ${r.ok && !r.mismatches.length ? 'ok' : 'bad'}` },
      r.ok ? `✓ Cadena íntegra: ${r.count.toLocaleString('es')} asientos. ` : `✗ Cadena rota en el asiento #${r.badSeq}: ${r.reason}. `,
      `Rondas reproducidas: ${r.replayed}, discrepancias: ${r.mismatches.length}.`),
      r.head ? el('div', { class: 'mono mute', style: { marginTop: '8px' } }, `Cabeza: ${r.head}`) : null);
  };
  const sel = el('select', { onchange: (e) => { type = e.target.value; load(); } },
    el('option', { value: '' }, 'Todo salvo rondas'), el('option', { value: 'credit' }, 'Movimientos de saldo'), el('option', { value: 'admin' }, 'Acciones de administración'), el('option', { value: 'player' }, 'Altas de jugadores'), el('option', { value: 'round' }, 'Rondas'));
  view.replaceChildren(
    el('h1', { class: 'vt' }, 'Auditoría', el('div', { class: 'row' }, el('button', { class: 'btn primary', type: 'button', onclick: verify }, 'Verificar ahora'), el('a', { class: 'btn', href: '/admin/api/ledger/export' }, 'Exportar libro (.jsonl)'))),
    card('Integridad del libro mayor', 'Cada asiento incluye el hash del anterior: alterar uno rompe la cadena.', status),
    card('Asientos', null, body, sel),
  );
  await load();
}
function describe(e) {
  if (e.type === 'credit') return `${e.username || e.playerId}: ${e.amount >= 0 ? '+' : ''}${money(e.amount)}${e.note ? ` · ${e.note}` : ''}`;
  if (e.type === 'admin') return `${e.action}${e.target ? ` → ${e.target}` : ''}${e.detail ? ` ${JSON.stringify(e.detail)}` : ''}`;
  if (e.type === 'player') return `${e.action}: ${e.username}`;
  if (e.type === 'round') return `${e.roundId} · ${gameName(e.gameId)} · ${money(e.bet)} → ${money(e.win)}`;
  return '';
}

// ───────────── Configuración ─────────────
async function settings() {
  const f = el('form', { class: 'form', style: { maxWidth: '380px' } },
    el('label', {}, 'Contraseña actual', el('input', { name: 'current', type: 'password', required: true, autocomplete: 'current-password' })),
    el('label', {}, 'Nueva contraseña (mín. 10)', el('input', { name: 'next', type: 'password', required: true, minlength: 10, autocomplete: 'new-password' })),
    el('button', { class: 'btn primary', type: 'submit' }, 'Cambiar contraseña'));
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await api('/admin/api/password', { method: 'POST', body: { current: f.current.value, next: f.next.value } }); toast('Contraseña cambiada'); f.reset(); }
    catch (err) { toast(err.message, 'error'); }
  });
  view.replaceChildren(el('h1', { class: 'vt' }, 'Configuración'), card('Seguridad', `Sesión: ${ME.username} (${ME.role})`, el('div', { class: 'card-b' }, f)));
}

boot();
