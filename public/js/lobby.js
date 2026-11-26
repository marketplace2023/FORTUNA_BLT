import { api, money, el, toast } from './api.js';

let me = null;
let games = [];
let filter = 'all';
let mode = 'login';
const illustratedCovers = {
  'panda-zen': { className: 'panda-card', background: "linear-gradient(0deg, #1c382b, transparent 75%), url('/assets/panda/garden.png') left top / cover" },
  'koi-dorado': { className: 'koi-card', background: "linear-gradient(0deg, #052a27 0%, transparent 60%), url('/assets/koi/scene.png') center 15% / cover" },
  'frutas-neon': { className: 'neon-card', background: "linear-gradient(0deg, #0c1723, transparent 70%), url('/assets/neon/arcade.png') center / cover" },
  'dragon-jade': { className: 'dragon-card', background: "linear-gradient(0deg, #203d2e, transparent 75%), url('/assets/dragon/sanctuary.png') 85% top / cover" },
  'faraon-dorado': { className: 'pharaoh-card', background: "linear-gradient(0deg, #102238, transparent 75%), url('/assets/pharaoh/temple.png') left top / cover" },
  'noche-catrinas': { className: 'catrina-card', background: "linear-gradient(0deg, #341e32, transparent 75%), url('/assets/catrina/plaza.png') 10% top / cover" },
  'oceano-perlas': { className: 'ocean-card', background: "linear-gradient(0deg, #12394f, transparent 75%), url('/assets/ocean/kingdom.png') right top / cover" },
  'samurai-viento': { className: 'samurai-card', background: "linear-gradient(0deg, #2b372a, transparent 75%), url('/assets/samurai/pass.png') 10% top / cover" },
  'templo-jaguar': { className: 'jaguar-card', background: "linear-gradient(0deg, #1d3525, transparent 75%), url('/assets/jaguar/temple.png') 10% top / cover" },
  'fiesta-dulce': { className: 'sweet-card', background: "linear-gradient(0deg, #f4e3d1, transparent 70%), url('/assets/sweet/patisserie.png') right top / cover" },
};

const $ = (s) => document.querySelector(s);
const dlg = $('#authDlg');

async function init() {
  const [site, user, list] = await Promise.all([api('/api/site'), api('/api/me'), api('/api/games')]);
  document.querySelectorAll('[data-site]').forEach((n) => (n.textContent = site.name));
  document.title = site.name;
  me = user;
  games = list;
  renderAccount();
  renderGrid();
  if (new URLSearchParams(location.search).has('login')) openAuth('login');
}

function renderAccount() {
  const box = $('#account');
  box.replaceChildren();
  if (me) {
    box.append(
      el('span', { class: 'user' }, me.username),
      me.demo ? el('span', { class: 'tag-demo' }, 'Demo') : null,
      el('span', { class: 'balance' }, el('span', { class: 'coin' }, '$'), money(me.balance)),
      el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: logout }, 'Salir'),
    );
  } else {
    box.append(
      el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => openAuth('login') }, 'Entrar'),
      el('button', { class: 'btn btn-gold btn-sm', type: 'button', onclick: () => openAuth('register') }, 'Registrarse'),
    );
  }
}

function renderGrid() {
  const grid = $('#grid');
  grid.replaceChildren();
  for (const g of games.filter((x) => filter === 'all' || x.engine === filter)) {
    const t = g.theme;
    const [a, b, c, d] = g.cover;
    const cover = g.engine === 'roulette' && t.art
      ? { className: 'roulette-card', background: `linear-gradient(0deg, ${t.bg1}, transparent 75%), url("${t.art}") center / cover` }
      : illustratedCovers[g.id];
    const coverBackground = cover?.background || `radial-gradient(120% 90% at 50% 20%, ${t.bg2}, ${t.bg1})`;
    grid.append(
      el('a', { class: `card${cover ? ` ${cover.className}` : ''}`, href: `/play/${g.id}`, onclick: (e) => go(e, g) },
        el('div', { class: 'cover', style: { background: coverBackground } },
          el('span', { class: 'play-pill' }, 'Jugar'),
          el('span', { class: 'mini m1' }, b),
          el('span', { class: 'mini m2' }, c),
          d ? el('span', { class: 'mini m3' }, d) : null,
          el('span', { class: 'big' }, a),
          g.id === 'frutas-neon' ? el('span', { class: 'neon-cover-star', 'aria-hidden': 'true' }) : null,
          el('span', { class: 'title' }, g.name),
        ),
        el('div', { class: 'card-body' },
          el('span', { class: 'card-tag' }, g.tag),
          el('div', { class: 'badges' },
            el('span', { class: 'badge rtp' }, `RTP ${g.rtp.toFixed(2)}${g.maxRtp > g.rtp + 1e-9 ? `–${g.maxRtp.toFixed(2)}` : ''}%`),
            g.volatility ? el('span', { class: 'badge' }, `Vol. ${g.volatility}`) : null,
            el('span', { class: 'badge' }, `Máx ${g.maxWin.toLocaleString('es')}x`),
          ),
        ),
      ),
    );
  }
}

function go(e, g) {
  if (me) return;
  e.preventDefault();
  sessionStorage.setItem('after-login', `/play/${g.id}`);
  openAuth('login');
}

function openAuth(m) {
  setMode(m);
  $('#authErr').textContent = '';
  dlg.showModal();
}

function setMode(m) {
  mode = m;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === m));
  $('#authSubmit').textContent = m === 'login' ? 'Entrar' : 'Crear cuenta';
  $('#authForm').password.autocomplete = m === 'login' ? 'current-password' : 'new-password';
}

function afterAuth(user) {
  me = user;
  dlg.close();
  renderAccount();
  const next = sessionStorage.getItem('after-login');
  sessionStorage.removeItem('after-login');
  if (next) location.href = next;
}

async function logout() {
  await api('/api/auth/logout', { method: 'POST', body: {} });
  me = null;
  renderAccount();
}

async function demo() {
  try { afterAuth(await api('/api/auth/demo', { method: 'POST', body: {} })); toast('Cuenta demo creada con 2.000 créditos'); }
  catch (e) { toast(e.message, 'error'); }
}

document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => setMode(t.dataset.tab)));
$('#authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  try {
    const user = await api(mode === 'login' ? '/api/auth/login' : '/api/auth/register', { method: 'POST', body: { username: f.username.value, password: f.password.value } });
    afterAuth(user);
  } catch (err) { $('#authErr').textContent = err.message; }
});
$('#demoBtn').addEventListener('click', demo);
$('#heroDemo').addEventListener('click', () => (me ? document.getElementById('juegos').scrollIntoView() : demo()));
$('#chips').addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (!b) return;
  filter = b.dataset.f;
  document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === b));
  renderGrid();
});

init().catch((e) => toast(e.message, 'error'));
