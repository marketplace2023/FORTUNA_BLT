import { api, el, money } from './api.js';
import { Sound } from './sound.js';
import { ZooWheel } from './zoo-wheel.js';
const $ = s => document.querySelector(s), ID = 'fortunazoo', pendingKey = 'fortunazoo-pending', lastKey = 'fortunazoo-last';
const S = { info:null, me:null, stakes:new Map(), chip:1, busy:true, art:false, result:null, recents:[] };
const requestId=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
const storage = { get(k){try{return JSON.parse(sessionStorage.getItem(k));}catch{return null;}},set(k,v){try{sessionStorage.setItem(k,JSON.stringify(v));}catch{}},remove(k){try{sessionStorage.removeItem(k);}catch{}} };
try { Sound.on=localStorage.getItem('zoo-sound')==='1'; } catch { Sound.on=false; }
let lastTick=0;
const wheel=new ZooWheel($('#wheel'),()=>{if(Sound.on && performance.now()-lastTick>70){lastTick=performance.now();Sound.tone(900,.025,{type:'triangle',vol:.016,slide:-300});}});
wheel.ready.then(()=>{S.art=true;controls();}).catch(e=>{message(e.message);});
function animal(id) { return S.info.zoo.animals.find(a=>a.id===Number(id)); }
function icon(a) { const i=a.id-1,n=i%20;return el('span',{class:'animal-icon','aria-hidden':'true',style:{backgroundImage:`url('/assets/zoo/animals-${i<20?'a':'b'}-v2.png')`,backgroundPosition:`${n%5*25}% ${Math.floor(n/5)*100/3}%`}}); }
function totalUnits() { return [...S.stakes.values()].reduce((sum,units)=>sum+units,0); }
function payout(units) { return Math.floor(units*192/5)/10000; }
function message(text='') { $('#message').textContent=text; }
function balance() { $('#balance').textContent=S.me?money(S.me.balance):'—';$('#mode').textContent=S.me?S.me.demo?'DEMO':S.me.username:'INVITADO'; }
function controls() {
  const pending=!!storage.get(pendingKey), total=totalUnits()/10000;
  $('#spin').hidden=!S.me;$('#demo').hidden=!!S.me;$('#login').hidden=!!S.me;
  $('#spin').disabled=S.busy||pending||!S.art||!S.info||!total||total<S.info.minBet||total>S.info.maxBet;
  $('#spin').textContent=S.busy?'Giro en curso…':!S.art?'Preparando la selva…':total?'Girar ruleta →':'Coloca tus fichas';
  $('#demo').disabled=S.busy;$('#clear').disabled=S.busy||pending||!total;
  $('#mobileTicket').hidden=!total||S.busy;
  document.querySelectorAll('.animal-pick,.animal-minus,.chip,.remove-stake').forEach(b=>b.disabled=S.busy||pending);
}
function renderBasket() {
  const rows=[...S.stakes].sort((a,b)=>a[0]-b[0]);
  $('#basket').replaceChildren(...(rows.length?rows.map(([id,units])=>{
    const a=animal(id);return el('div',{class:'basket-item'},icon(a),el('div',{class:'basket-copy'},el('strong',{},`${String(id).padStart(2,'0')} · ${a.name}`),el('small',{},`Si sale: ${money(payout(units))}`)),el('span',{class:'basket-value'},money(units/10000)),el('button',{class:'remove-stake','aria-label':`Retirar apuesta de ${a.name}`,onclick:()=>{if(S.busy||storage.get(pendingKey))return;S.stakes.delete(id);updateStakes();}},'×'));
  }):[el('p',{class:'empty'},'Añade una ficha a tu animal favorito.')]));
  $('#total').textContent=money(totalUnits()/10000);$('#mobileTotal').textContent=money(totalUnits()/10000);
}
function updateStakes() {
  document.querySelectorAll('.animal-cell').forEach(cell=>{
    const units=S.stakes.get(Number(cell.dataset.id))||0;cell.classList.toggle('active',units>0);
    cell.querySelector('.animal-pick').setAttribute('aria-pressed',String(units>0));const badge=cell.querySelector('.animal-stake');badge.textContent=money(units/10000);badge.hidden=!units;cell.querySelector('.animal-minus').hidden=!units;
  });
  renderBasket();controls();
}
function place(id,subtract=false) {
  if(S.busy||storage.get(pendingKey))return;
  const before=S.stakes.get(id)||0, step=Math.round(S.chip*10000), after=subtract?Math.max(0,before-step):before+step;
  if(totalUnits()-before+after>Math.round(S.info.maxBet*10000)){message(`El máximo por giro es ${money(S.info.maxBet)} créditos.`);return;}
  if(after)S.stakes.set(id,after);else S.stakes.delete(id);
  message();updateStakes();
}
function renderBoard() {
  $('#animals').replaceChildren(...S.info.zoo.animals.map(a=>el('article',{class:'animal-cell','data-id':a.id},
    el('button',{class:'animal-pick',type:'button','aria-pressed':'false','aria-label':`Apostar a ${a.name}`,onclick:()=>place(a.id)},el('span',{class:'animal-id'},String(a.id).padStart(2,'0')),icon(a),el('span',{class:'animal-name'},a.name)),
    el('span',{class:'animal-stake',hidden:true}),el('button',{class:'animal-minus',type:'button',hidden:true,'aria-label':`Quitar ficha de ${a.name}`,onclick:()=>place(a.id,true)},'−'))));
  $('#chips').replaceChildren(el('span',{},'VALOR DE FICHA'),...S.info.chips.map(value=>el('button',{class:`chip${value===S.chip?' on':''}`,type:'button','aria-label':`Ficha de ${value} créditos`,'aria-pressed':String(value===S.chip),onclick:e=>{S.chip=value;document.querySelectorAll('.chip').forEach(b=>{const chosen=b===e.currentTarget;b.classList.toggle('on',chosen);b.setAttribute('aria-pressed',String(chosen));});}},String(value))));
  $('#limits').textContent=`Mín. ${money(S.info.minBet)} · Máx. ${money(S.info.maxBet)}`;
  $('#hubArt').replaceChildren(icon(animal(1)));updateStakes();
}
function recent() { $('#recent').replaceChildren(...(S.recents.length?S.recents.slice(0,8).map(id=>el('span',{class:'recent-animal',title:animal(id).name},icon(animal(id)),el('b',{},String(id).padStart(2,'0')))):[el('small',{},'Aquí aparecerán tus animales ganadores')])); }
function hub(a) { $('#hub').classList.add('revealed');$('#hubArt').replaceChildren(icon(a));$('#hubTitle').textContent=a.name;$('#hubDetail').textContent=`${String(a.id).padStart(2,'0')} · RESULTADO OFICIAL`; }
async function showReceipt(receipt,animate=true) {
  S.busy=true;S.result=receipt;controls();
  if(S.me){S.me.balance=receipt.balance;balance();}
  $('#result').hidden=true;document.querySelectorAll('.animal-cell.won').forEach(n=>n.classList.remove('won'));
  $('#hub').classList.remove('revealed');$('#hubTitle').textContent='La selva gira…';$('#hubDetail').textContent='Tu fortuna está en camino';$('#hubArt').replaceChildren(icon(animal(1)));$('#wheelStatus').textContent='GIRANDO LA RULETA';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(animate&&innerWidth<=800)$('.jungle-stage').scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
  $('#skip').hidden=!animate||reduced;message();
  await wheel.spin(receipt.result.number,{reduced:!animate||reduced});$('#skip').hidden=true;
  const a=animal(receipt.result.number);hub(a);$('#wheelStatus').textContent=`${String(a.id).padStart(2,'0')} · ${a.name.toLocaleUpperCase('es')}`;
  document.querySelector(`.animal-cell[data-id="${a.id}"]`)?.classList.add('won');
  if(Sound.on&&animate){Sound.init();[392,523.25,659.25,783.99].forEach((f,i)=>Sound.pluck(f,i*.11,.025));}
  S.busy=false;resultPanel(receipt);controls();
}
function resultPanel(receipt) {
  const a=animal(receipt.result.number), box=$('#result'), verified=el('p',{class:'verification',role:'status'});
  box.replaceChildren(el('div',{class:'result-head'},icon(a),el('div',{},el('p',{class:'eyebrow'},`ANIMAL GANADOR · ${String(a.id).padStart(2,'0')}`),el('h2',{},a.name)),el('strong',{class:'result-amount'},money(receipt.win))),
    el('p',{},`Apostaste ${money(receipt.bet)} · Retorno total ${money(receipt.win)} · Beneficio neto ${money(receipt.win-receipt.bet)}`),
    el('div',{class:'result-actions'},el('button',{onclick:()=>{if(S.busy)return;S.stakes.clear();updateStakes();box.hidden=true;message('Elige tus animales para un nuevo giro.');storage.remove(lastKey);}},'Nueva jugada →'),el('button',{class:'secondary',onclick:()=>{if(!S.busy)showReceipt(receipt,true).catch(e=>{S.busy=false;message(e.message);controls();});}},'Ver repetición'),el('button',{class:'secondary',onclick:async e=>{
      const button=e.currentTarget;button.disabled=true;try{const v=await api(`/api/rounds/${receipt.roundId}/verify`);verified.textContent=v.ok?`Verificado · ${receipt.roundId} · Animal y premio idénticos al registro.`:'La verificación detectó una diferencia.';}catch(error){verified.textContent=error.message;}finally{button.disabled=false;}
    }},'Verificar giro')),verified);box.hidden=false;
}
async function submit(payload,recovered=false) {
  if(S.busy&&!recovered)return;
  S.busy=true;controls();message(recovered?'Recuperando tu giro…':'Registrando tu jugada…');
  storage.set(pendingKey,{playerId:S.me.id,payload});
  try {
    let receipt;
    try{receipt=await api('/api/spin',{method:'POST',body:payload});}
    catch(e){if(!e.status||e.status>=500)receipt=await api('/api/spin',{method:'POST',body:payload});else throw e;}
    storage.remove(pendingKey);storage.set(lastKey,{playerId:S.me.id,roundId:receipt.roundId});
    S.recents.unshift(receipt.result.number);recent();
    await showReceipt(receipt,!recovered);
  }catch(e){
    if(e.status&&e.status<500)storage.remove(pendingKey);
    try{S.me=await api('/api/me');balance();}catch{}
    S.busy=false;controls();message(e.message+(!e.status||e.status>=500?' Recarga para recuperar el giro sin duplicar el cargo.':''));
  }
}
$('#spin').addEventListener('click',()=>{if(S.busy||!S.me||!totalUnits()||storage.get(pendingKey))return;Sound.init();submit({gameId:ID,requestId:requestId(),bets:[...S.stakes].map(([id,units])=>({id:`animal:${id}`,amount:units/10000}))});});
$('#clear').addEventListener('click',()=>{if(S.busy||storage.get(pendingKey))return;S.stakes.clear();message();updateStakes();});
$('#skip').addEventListener('click',()=>wheel.finish());
$('#demo').addEventListener('click',async()=>{if(S.busy)return;S.busy=true;controls();try{S.me=await api('/api/auth/demo',{method:'POST',body:{}});balance();message();}catch(e){message(e.message);}finally{S.busy=false;controls();}});
$('#mobileTicket').addEventListener('click',()=>$('#ticket').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'}));
function soundButton(){ $('#sound').textContent=Sound.on?'Sonido activado':'Sonido apagado';$('#sound').setAttribute('aria-pressed',String(Sound.on));$('#sound').setAttribute('aria-label',Sound.on?'Desactivar sonido':'Activar sonido'); }
$('#sound').addEventListener('click',()=>{Sound.on=!Sound.on;Sound.init();try{localStorage.setItem('zoo-sound',Sound.on?'1':'0');}catch{}soundButton();});
$('#rulesBtn').addEventListener('click',()=>$('#rules').showModal());
async function restore(row,animate=false) {
  const v=await api(`/api/rounds/${row.roundId}/verify`);if(!v.ok)throw Error('No se pudo verificar este giro');
  S.me=await api('/api/me');balance();S.stakes=new Map(v.result.bets.map(b=>[Number(b.id.split(':')[1]),b.units]));updateStakes();
  await showReceipt({...v.round,result:v.result,balance:S.me.balance},animate);
}
$('#historyBtn').addEventListener('click',async()=>{
  $('#history').showModal();const list=$('#historyList');list.textContent='Cargando tus giros…';
  if(!S.me){list.textContent='Entra con tu cuenta o juega en demo para ver tus giros.';return;}
  try{const rows=await api(`/api/history?game=${ID}`);list.replaceChildren();if(!rows.length)list.textContent='Aún no has girado la ruleta.';
    for(const row of rows)list.append(el('div',{class:'history-row'},el('div',{},`${String(row.number).padStart(2,'0')} · ${animal(row.number).name}`,el('small',{},`Apuesta ${money(row.bet)} · Retorno ${money(row.win)}`)),el('button',{disabled:S.busy,onclick:async e=>{
      if(S.busy||storage.get(pendingKey))return;const button=e.currentTarget;button.disabled=true;try{$('#history').close();await restore(row,false);}catch(error){message(error.message);}finally{button.disabled=false;}
    }},'Ver giro')));
  }catch(e){list.textContent=e.message;}
});
async function init() {
  soundButton();[S.info,S.me]=await Promise.all([api(`/api/games/${ID}`),api('/api/me')]);balance();S.chip=S.info.defaultChip;wheel.setOrder(S.info.zoo.wheel);renderBoard();
  await wheel.ready;S.art=true;
  if(S.me){try{const rows=await api(`/api/history?game=${ID}`);S.recents=rows.map(r=>r.number);recent();}catch{}}
  const pending=storage.get(pendingKey),last=storage.get(lastKey);
  if(pending&&S.me&&pending.playerId===S.me.id){S.stakes=new Map(pending.payload.bets.map(b=>[Number(b.id.split(':')[1]),Math.round(b.amount*10000)]));updateStakes();await submit(pending.payload,true);return;}
  if(pending)storage.remove(pendingKey);
  if(last&&S.me&&last.playerId===S.me.id){try{await restore(last,false);return;}catch{storage.remove(lastKey);}}
  S.busy=false;controls();
}
init().catch(e=>{S.busy=false;message(e.message);controls();});
