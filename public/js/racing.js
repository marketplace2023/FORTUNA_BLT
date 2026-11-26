import { api, el, money } from './api.js';
import { RaceTrack } from './race-track.js';
import { Sound } from './sound.js';
const $ = s => document.querySelector(s), ID = 'hipodromo-royale';
const state = { card: null, selected: null, me: null, busy: false, result: null, stake: 1, order: '' };
const pendingKey = 'royale-race-pending', lastKey = 'royale-race-last';
const storage = { get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} }, remove(k) { try { sessionStorage.removeItem(k); } catch {} } };
try { Sound.on = localStorage.getItem('racing-sound') === '1'; } catch { Sound.on = false; }
const track = new RaceTrack($('#track'), ids => {
  const key = ids.join() + '|' + state.selected;
  if (key === state.order || !state.card) return;
  state.order = key;
  $('#runningOrder').replaceChildren(el('span', { class: 'order-label' }, state.busy ? 'POSICIONES' : 'DORSALES'), ...ids.map(id => number(state.card.horses.find(h => h.id === id))));
});
function number(h) {
  const n = el('span', { class: `runner-number${h.id === state.selected ? ' selected' : ''}`, 'aria-label': `Dorsal ${h.id}` }, h.id);
  n.style.setProperty('--horse-color', h.color); return n;
}
function balance() { $('#balance').textContent = state.me ? money(state.me.balance) : '—'; $('#mode').textContent = state.me ? state.me.demo ? 'DEMO' : state.me.username : 'INVITADO'; }
function status(message = '') { $('#ticketStatus').textContent = message; }
function controls() {
  const expired = !state.card || Date.now() > state.card.expiresAt;
  const uncertain = !!storage.get(pendingKey);
  $('#bet').hidden = !state.me; $('#demo').hidden = !!state.me; $('#login').hidden = !!state.me;
  $('#bet').disabled = state.busy || uncertain || !!state.result || !state.selected || expired || !state.card.bets.length;
  $('#bet').textContent = state.busy ? 'Carrera en curso…' : state.result ? 'Carrera finalizada' : expired ? 'Actualiza el programa' : state.selected ? 'Confirmar apuesta →' : 'Elige un caballo';
  $('#stake').disabled = state.busy || !!state.result || !state.card;
  $('#refresh').disabled = state.busy || uncertain; $('#demo').disabled = state.busy;
  $('#mobileTicket').hidden = !state.selected || state.busy || !!state.result;
  document.querySelectorAll('.pick-horse').forEach(b => b.disabled = state.busy || !!state.result);
}
function ticket() {
  const h = state.card?.horses.find(h => h.id === state.selected);
  $('#selection').classList.toggle('empty', !h);
  $('#selection').replaceChildren(h ? number(h) : 'Selecciona un caballo del programa.', ...(h ? [el('div', {}, el('strong', {}, h.name), el('small', {}, 'Primer lugar · apuesta a ganador'))] : []));
  $('#ticketOdds').textContent = h ? h.odds.toFixed(2) : '—';
  const units = Math.floor(state.stake * 10000 * (h?.oddsCents || 0) / 100);
  $('#potential').textContent = h ? money(units / 10000) : '—'; $('#profit').textContent = h ? money(units / 10000 - state.stake) : '—';
  controls();
}
function choose(id) {
  if (state.busy || state.result) return;
  state.selected = id; status();
  document.querySelectorAll('.horse').forEach(n => { const selected = Number(n.dataset.id) === id; n.classList.toggle('chosen', selected); n.querySelector('.pick-horse').setAttribute('aria-pressed', String(selected)); });
  track.choose(id); ticket();
}
function program() {
  $('#conditions').textContent = `${state.card.distance.toLocaleString('es')} m · Pista ${state.card.surface.toLowerCase()}`;
  $('#horses').replaceChildren(...state.card.horses.map(h => {
    const details = el('div', { class: 'horse-details', id: `horse-${h.id}-details`, hidden: true });
    const traits = el('div', { class: 'traits' });
    for (const [label, key] of [['Velocidad', 'speed'], ['Resistencia', 'stamina'], ['Salida', 'start'], ['Jinete', 'jockey'], ['Forma del día', 'form'], ['Adaptación', 'adaptation']]) traits.append(el('div', { class: 'trait' }, el('label', {}, label, el('span', {}, `${h[key]}/100`)), el('meter', { min: 0, max: 100, value: h[key], 'aria-label': `${label}: ${h[key]} de 100` })));
    details.append(traits, el('p', { class: 'preference' }, `Prefiere ${h.distance.toLocaleString('es')} m y pista ${['seca', 'húmeda', 'pesada'][h.ground]}. Valoración de hoy: ${h.rating}.`));
    const toggle = el('button', { class: 'details-btn', type: 'button', 'aria-label': `Ver ficha de ${h.name}`, 'aria-expanded': 'false', 'aria-controls': details.id, onclick: () => { details.hidden = !details.hidden; toggle.setAttribute('aria-expanded', String(!details.hidden)); toggle.textContent = details.hidden ? '+' : '−'; } }, '+');
    return el('article', { class: 'horse', 'data-id': h.id }, el('div', { class: 'horse-row' }, el('button', { type: 'button', class: 'pick-horse', 'aria-pressed': 'false', 'aria-label': `Elegir ${h.name}`, onclick: () => choose(h.id) }, number(h), el('span', {}, el('span', { class: 'horse-name' }, h.name), el('span', { class: 'horse-sub' }, h.stamina > h.speed ? 'Resistencia y remate' : 'Velocidad y salida'))), el('span', { class: 'probability' }, `${(h.probability * 100).toFixed(1)}%`), el('strong', { class: 'odds' }, h.odds.toFixed(2)), toggle), details);
  }));
  const select = $('#stake'); select.replaceChildren(...state.card.bets.map(n => el('option', { value: n }, money(n))));
  if (!state.card.bets.includes(state.stake)) state.stake = state.card.bets.includes(1) ? 1 : state.card.bets[0];
  select.value = String(state.stake); state.order = ''; track.setCard(state.card); track.choose(state.selected); ticket();
}
async function newCard() {
  if (state.busy || storage.get(pendingKey)) return;
  state.busy = true; controls(); status('Cargando el programa…');
  try {
    const card = await api('/api/racing/card'); state.card = card; state.selected = null; state.result = null;
    storage.remove(lastKey); $('#result').hidden = true; $('#raceState').textContent = 'ELIGE TU CABALLO'; $('#progress').style.width = '0%'; $('#distanceLeft').textContent = 'ESPERANDO TU APUESTA';
    program(); status();
  } catch (e) { status(e.message); }
  finally { state.busy = false; controls(); }
}
function setSound() { $('#sound').textContent = Sound.on ? 'Sonido activado' : 'Sonido apagado'; $('#sound').setAttribute('aria-pressed', String(Sound.on)); $('#sound').setAttribute('aria-label', Sound.on ? 'Desactivar sonido' : 'Activar sonido'); }
async function present(receipt, animate = true) {
  const result = receipt.result;
  state.busy = true; state.result = receipt; state.card = { ...result.card, bets: state.card?.bets || [receipt.bet], expiresAt: 0 }; state.selected = result.selected; state.stake = receipt.bet;
  state.me.balance = receipt.balance; balance(); program();
  document.querySelector(`.horse[data-id="${state.selected}"]`)?.classList.add('chosen');
  document.querySelector(`.horse[data-id="${state.selected}"] .pick-horse`)?.setAttribute('aria-pressed', 'true');
  controls(); status('Apuesta registrada. El premio ya está guardado en tu saldo.');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (animate && innerWidth <= 800) $('.broadcast').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  $('#result').hidden = true;
  if (animate && !reduced) {
    $('#raceState').textContent = 'APUESTA REGISTRADA';
    for (let n = 3; n > 0; n--) { $('#countdown').hidden = false; $('#countdown').textContent = n; await new Promise(r => setTimeout(r, 600)); }
  }
  $('#countdown').hidden = true; $('#raceState').textContent = 'EN CARRERA'; $('#skip').hidden = !animate || reduced;
  if (Sound.on && animate) { Sound.init(); Sound.tone(440, .3, { type: 'triangle', vol: .035 }); Sound.tone(659.25, .4, { at: .12, vol: .025 }); }
  await track.play(result, { reduced: !animate || reduced, onProgress: p => { $('#progress').style.width = `${p * 100}%`; $('#distanceLeft').textContent = p >= 1 ? 'LLEGADA OFICIAL' : `${Math.ceil(result.card.distance * (1 - p))} m POR RECORRER`; } });
  track.finish(); $('#progress').style.width = '100%'; $('#distanceLeft').textContent = 'LLEGADA OFICIAL'; $('#skip').hidden = true; $('#raceState').textContent = 'LLEGADA OFICIAL';
  state.busy = false; showResult(receipt); controls(); status();
}
function showResult(receipt) {
  const r = receipt.result, winner = r.card.horses.find(h => h.id === r.order[0]), chosen = r.card.horses.find(h => h.id === r.selected), place = r.order.indexOf(r.selected) + 1;
  const box = $('#result'), verification = el('p', { class: 'verification', role: 'status' });
  box.replaceChildren(el('div', { class: 'result-top' }, el('div', {}, el('p', { class: 'eyebrow' }, receipt.win > 0 ? 'TU CABALLO GANÓ' : 'RESULTADO OFICIAL'), el('h2', {}, `${winner.name}, primer lugar.`)), el('div', {}, el('span', { class: 'eyebrow' }, 'RETORNO TOTAL'), el('h2', {}, money(receipt.win)))), el('p', {}, `${chosen.name} terminó ${place}.º · Apuesta ${money(receipt.bet)} · Cuota ${chosen.odds.toFixed(2)} · Beneficio neto ${money(receipt.win - receipt.bet)}`), el('div', { class: 'finish-order', 'aria-label': 'Clasificación final' }, ...r.order.map((id, i) => el('span', { class: 'finish-place' }, el('small', {}, `${i + 1}º`), number(r.card.horses.find(h => h.id === id)) ))), el('div', { class: 'result-actions' }, el('button', { type: 'button', onclick: newCard }, 'Preparar otra carrera →'), el('button', { type: 'button', class: 'verify', onclick: async e => {
    const button = e.currentTarget; button.disabled = true;
    try { const v = await api(`/api/rounds/${receipt.roundId}/verify`); verification.textContent = v.ok ? `Verificada · ${receipt.roundId} · Resultado y premio idénticos al registro.` : 'La verificación detectó una diferencia.'; }
    catch (error) { verification.textContent = error.message; } finally { button.disabled = false; }
  } }, 'Verificar carrera')), verification);
  const replay = el('button', { type: 'button', class: 'verify', onclick: () => { if (!state.busy) present(receipt, true).catch(e => { state.busy = false; status(e.message); controls(); }); } }, 'Ver repetición');
  box.querySelector('.result-actions').append(replay);
  box.hidden = false;
}
async function submit(payload, recovered = false) {
  if (state.busy && !recovered) return;
  state.busy = true; controls(); status(recovered ? 'Recuperando tu apuesta…' : 'Registrando tu apuesta…');
  storage.set(pendingKey, { ...payload, playerId: state.me.id });
  try {
    let receipt;
    try { receipt = await api('/api/racing/bet', { method: 'POST', body: payload }); }
    catch (e) {
      // Same token retries are idempotent, including after a lost HTTP response.
      if (!e.status || e.status >= 500) receipt = await api('/api/racing/bet', { method: 'POST', body: payload });
      else throw e;
    }
    storage.remove(pendingKey); storage.set(lastKey, { roundId: receipt.roundId, playerId: state.me.id });
    await present(receipt, !recovered);
  } catch (e) {
    if (e.status && e.status < 500) storage.remove(pendingKey);
    status(e.message + ((!e.status || e.status >= 500) ? ' Recarga para recuperar la apuesta sin duplicar el cargo.' : ''));
    try { state.me = await api('/api/me'); balance(); } catch {}
    state.busy = false; controls();
    // An uncertain request stays blocked until recovered with that same token.
    if (storage.get(pendingKey)) { $('#bet').disabled = true; $('#refresh').disabled = true; }
  }
}
$('#bet').addEventListener('click', () => { if (!state.busy && state.selected && !state.result) submit({ token: state.card.token, horseId: state.selected, bet: state.stake }); });
$('#stake').addEventListener('change', () => { state.stake = Number($('#stake').value); ticket(); });
$('#refresh').addEventListener('click', newCard);
$('#skip').addEventListener('click', () => track.finish());
document.querySelectorAll('[data-camera]').forEach(button => button.addEventListener('click', () => {
  track.setCamera?.(button.dataset.camera);
  document.querySelectorAll('[data-camera]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
}));
$('#cinema').addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('.broadcast').requestFullscreen(); }
  catch { $('.broadcast').classList.toggle('cinema-expanded'); }
});
$('#mobileTicket').addEventListener('click', () => $('.ticket').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }));
$('#sound').addEventListener('click', () => { Sound.on = !Sound.on; Sound.init(); try { localStorage.setItem('racing-sound', Sound.on ? '1' : '0'); } catch {} setSound(); });
$('#demo').addEventListener('click', async () => { if (state.busy) return; state.busy = true; controls(); try { state.me = await api('/api/auth/demo', { method: 'POST', body: {} }); balance(); status(); } catch (e) { status(e.message); } finally { state.busy = false; controls(); } });
$('#rulesBtn').addEventListener('click', () => $('#rules').showModal());
$('#historyBtn').addEventListener('click', async () => {
  $('#history').showModal(); const box = $('#historyList'); box.textContent = 'Cargando tus carreras…';
  if (!state.me) { box.textContent = 'Entra con tu cuenta o juega en demo para ver tus carreras.'; return; }
  try {
    const rows = await api(`/api/history?game=${ID}`); box.replaceChildren();
    if (!rows.length) box.textContent = 'Todavía no has disputado una carrera.';
    for (const row of rows) box.append(el('div', { class: 'history-row' }, el('div', {}, row.roundId, el('small', {}, `Apuesta ${money(row.bet)} · Retorno ${money(row.win)}`)), el('button', { disabled: state.busy, onclick: async e => { if (state.busy) return; const button = e.currentTarget; button.disabled = true; try { const receipt = await api(`/api/racing/rounds/${row.roundId}`); $('#history').close(); await present(receipt, false); } catch (error) { box.append(el('p', {}, error.message)); } finally { button.disabled = false; } } }, 'Ver resultado')));
  } catch (e) { box.textContent = e.message; }
});
setInterval(() => {
  if (state.card && !state.result && !state.busy) {
    const left = Math.max(0, Math.ceil((state.card.expiresAt - Date.now()) / 1000));
    $('#expiry').textContent = left ? `Cuotas válidas durante ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} · El retorno potencial incluye la apuesta.` : 'El programa venció. Cambia la carrera para obtener nuevas cuotas.';
    controls();
  }
}, 1000);
async function init() {
  setSound(); state.me = await api('/api/me'); balance();
  const pending = storage.get(pendingKey), last = storage.get(lastKey);
  if (pending && state.me && pending.playerId === state.me.id) { await submit(pending, true); return; }
  if (pending) storage.remove(pendingKey);
  if (last && state.me && last.playerId === state.me.id) {
    try { const receipt = await api(`/api/racing/rounds/${last.roundId}`); await present(receipt, false); return; } catch { storage.remove(lastKey); }
  }
  await newCard();
}
init().catch(e => { status(e.message); $('#refresh').disabled = false; });
