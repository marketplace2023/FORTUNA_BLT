import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { loadGames, settleRound, buildGame } from '../server/games/index.js';
import { Drbg } from '../server/rng.js';
import { sha256, canonical } from '../server/util.js';
import { normalizeRouletteBets } from '../server/engine/roulette.js';

const root=path.resolve(import.meta.dirname,'..'), games=loadGames(), game=games.get('fortunazoo');
assert.equal(game.math.wheel.length,40);assert.equal(new Set(game.math.wheel).size,40);assert.equal(game.par.rtp,96);
for(let i=0;i<40;i++){
  const number=game.math.wheel[i],stakes=[{id:`animal:${number}`,units:10000},{id:`animal:${number===40?1:number+1}`,units:2000}];
  const {result,win}=settleRound(game,{int:()=>i},12000,stakes);assert.equal(result.number,number);assert.equal(win,384000);assert.equal(result.bets[1].win,0);assert.equal(result.animal.id,number);
  assert.equal(settleRound(game,{int:()=>i},1,[{id:`animal:${number}`,units:1}]).win,38);
}
assert.throws(()=>normalizeRouletteBets(game.math,[{id:'animal:41',amount:1}]));
assert.throws(()=>normalizeRouletteBets(game.math,[{id:'animal:1',amount:1},{id:'animal:1',amount:1}]));
assert.throws(()=>buildGame({...game.def,zoo:{...game.def.zoo,wheel:Array(40).fill(1)}}));
for(let i=0;i<100;i++){const seed=sha256(`zoo-${i}`),stakes=[{id:'animal:1',units:10000}];assert.equal(canonical(game.play(new Drbg(seed),stakes)),canonical(game.play(new Drbg(seed),stakes)));}
const all=game.math.animals.map(a=>({id:`animal:${a.id}`,units:10000}));for(let i=0;i<40;i++)assert.equal(settleRound(game,{int:()=>i},400000,all).win,384000);
console.log('PASS model: forty unique animals, every winning pocket, 96% exact theoretical return, fractional-unit rounding, multi-animal settlement and deterministic replay.');

const address=createServer();address.listen(0,'127.0.0.1');await once(address,'listening');const port=address.address().port;await new Promise(r=>address.close(r));
const origin=`http://127.0.0.1:${port}`,dir=await mkdtemp(path.join(tmpdir(),'vlt-zoo-')),output=path.join(root,'output/zoo-qa');await mkdir(output,{recursive:true});
let server,browser;
async function start(){server=spawn(process.execPath,['server/index.js'],{cwd:root,env:{...process.env,PORT:String(port),DATA_DIR:dir,ADMIN_PASSWORD:'zoo-test-admin-only'},stdio:'ignore',windowsHide:true});for(let i=0;i<80;i++){try{if((await fetch(origin+'/api/site')).ok)return;}catch{}await delay(100);}throw Error('Test server unavailable');}
async function stop(){const exited=once(server,'exit');server.kill();await exited;}
try{
  await start();browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/assets/zoo/')&&r.status()>=400)errors.push(r.url());});
  const get=async url=>(await context.request.get(origin+url)).json(),post=(url,data)=>context.request.post(origin+url,{data});
  await page.goto(origin+'/play/fortunazoo');await page.waitForSelector('.animal-cell');await page.waitForFunction(()=>!document.querySelector('#demo').disabled);
  assert.equal(await page.locator('.animal-cell').count(),40);assert(await page.locator('#demo').isVisible());
  await page.screenshot({path:path.join(output,'desktop.png'),fullPage:true});
  for(const [width,height] of [[390,844],[320,568],[768,1024],[844,390],[1366,768]]){await page.setViewportSize({width,height});await delay(120);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No horizontal overflow at ${width}`);const dimensions=await page.locator('#wheel').evaluate(n=>{const r=n.getBoundingClientRect();return{width:r.width,height:r.height};});assert(Math.abs(dimensions.width-dimensions.height)<1,'The wheel must stay circular');await page.screenshot({path:path.join(output,`${width}x${height}.png`),fullPage:true});}
  const player=await (await post('/api/auth/register',{username:'zoo_tester',password:'zoo-test-player-only'})).json();await post('/admin/api/login',{username:'admin',password:'zoo-test-admin-only'});await post(`/admin/api/players/${player.id}/credit`,{amount:2000,note:'Test balance'});
  await page.reload();await page.waitForFunction(()=>document.querySelector('#balance').textContent.includes('000'));await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'Apostar a León',exact:true}).click();await page.getByRole('button',{name:'Apostar a León',exact:true}).click();await page.getByRole('button',{name:'Apostar a Tigre',exact:true}).click();assert.equal(await page.locator('#total').textContent(),'3,00');assert((await page.locator('#basket').textContent()).includes('76,80'));
  await page.getByRole('button',{name:'Quitar ficha de León',exact:true}).click();assert.equal(await page.locator('#total').textContent(),'2,00');await page.getByRole('button',{name:'Apostar a León',exact:true}).click();
  const firstResponse=page.waitForResponse(r=>r.url().endsWith('/api/spin')&&r.request().method()==='POST');await page.getByRole('button',{name:'Girar ruleta →',exact:true}).dblclick();const raw=await firstResponse,first=await raw.json(),firstPayload=raw.request().postDataJSON();await page.waitForSelector('#result:not([hidden])');
  assert.equal(first.bet,3);assert.equal(first.balance,2000-first.bet+first.win);assert.equal(await page.locator('#wheel').getAttribute('data-pocket'),String(first.result.number));assert.equal((await get('/api/history?game=fortunazoo')).length,1);
  await page.getByRole('button',{name:'Verificar giro',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.verification').textContent.includes('Verificado'));
  await page.getByRole('button',{name:'Ver repetición',exact:true}).click();await page.waitForSelector('#result:not([hidden])');assert.equal((await get('/api/history?game=fortunazoo')).length,1);
  await page.screenshot({path:path.join(output,'result.png'),fullPage:true});await page.reload();await page.waitForSelector('#result:not([hidden])');assert.equal(await page.locator('#wheel').getAttribute('data-pocket'),String(first.result.number));
  await page.getByRole('button',{name:'Nueva jugada →',exact:true}).click();await page.getByRole('button',{name:'Apostar a Guacamayo',exact:true}).click();
  let intercepted=0;await page.route('**/api/spin',async route=>{intercepted++;if(intercepted===1){await route.fetch();await route.abort('connectionfailed');}else await route.continue();});
  await page.getByRole('button',{name:'Girar ruleta →',exact:true}).click();await page.waitForSelector('#result:not([hidden])');assert.equal(intercepted,2);await page.unroute('**/api/spin');assert.equal((await get('/api/history?game=fortunazoo')).length,2);
  await page.getByRole('button',{name:'Nueva jugada →',exact:true}).click();await page.getByRole('button',{name:'Apostar a Cocodrilo',exact:true}).click();
  await page.route('**/api/spin',async route=>{await route.fetch();await route.abort('connectionfailed');});await page.getByRole('button',{name:'Girar ruleta →',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('Recarga'));
  assert(await page.locator('#spin').isDisabled());assert(await page.locator('#clear').isDisabled());await page.unroute('**/api/spin');await page.reload();await page.waitForSelector('#result:not([hidden])');assert.equal((await get('/api/history?game=fortunazoo')).length,3);
  await page.getByRole('button',{name:'Nueva jugada →',exact:true}).click();await page.emulateMedia({reducedMotion:'no-preference'});await page.getByRole('button',{name:'Apostar a Mariposa',exact:true}).click();await page.getByRole('button',{name:'Girar ruleta →',exact:true}).click();await page.waitForSelector('#skip:not([hidden])');await delay(300);await page.getByRole('button',{name:'Ver resultado →',exact:true}).click();await page.waitForSelector('#result:not([hidden])');
  assert.equal((await get('/api/history?game=fortunazoo')).length,4);
  // The same rendering formula must stop under the fixed pointer for every animal.
  const wheelPage=await context.newPage();await wheelPage.route('**/__wheel-test',r=>r.fulfill({contentType:'text/html',body:'<canvas id="testWheel" style="width:500px;height:500px"></canvas>'}));await wheelPage.goto(origin+'/__wheel-test');
  const pockets=await wheelPage.evaluate(async order=>{const {ZooWheel}=await import('/js/zoo-wheel.js');const wheel=new ZooWheel(document.querySelector('canvas'));wheel.setOrder(order);await wheel.ready;const out=[];for(let n=1;n<=40;n++){await wheel.spin(n,{reduced:true});out.push(Number(wheel.canvas.dataset.pocket));}return out;},game.math.wheel);assert.deepEqual(pockets,Array.from({length:40},(_,i)=>i+1));
  const alphas=await wheelPage.evaluate(async()=>{const values=[];for(const suffix of ['a','b']){const i=new Image();i.src=`/assets/zoo/animals-${suffix}-v2.png`;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);values.push(x.getImageData(0,0,1,1).data[3]);}return values;});assert.deepEqual(alphas,[0,0]);await wheelPage.close();
  // A complete forty-pocket result list also supplies deterministic winning UI fixtures.
  await page.getByRole('button',{name:'Nueva jugada →',exact:true}).click();await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Apostar a León',exact:true}).click();
  const winResult=settleRound(game,{int:()=>game.math.wheel.indexOf(1)},10000,[{id:'animal:1',units:10000}]).result;
  await page.route('**/api/spin',r=>r.fulfill({json:{roundId:'UI-ZOO',bet:1,win:38.4,balance:2037.4,result:winResult}}));await page.getByRole('button',{name:'Girar ruleta →',exact:true}).click();await page.waitForSelector('#result:not([hidden])');assert.equal(await page.locator('#hubTitle').textContent(),'León');assert((await page.locator('#result').textContent()).includes('38,40'));await page.screenshot({path:path.join(output,'winning-ticket.png'),fullPage:true});await page.unroute('**/api/spin');
  await page.goto(origin+'/');await page.waitForSelector('a[href="/play/fortunazoo"]');assert.equal(await page.locator('#grid .card').count(),games.size);
  await page.goto(origin+'/play/ruleta-eclipse');await page.waitForSelector('canvas');
  await page.goto(origin+'/play/panda-zen');await page.waitForFunction(()=>document.querySelectorAll('.cell').length===9);
  const beforeRestart=(await get('/api/me')).balance;
  await stop();await start();await post('/api/auth/login',{username:'zoo_tester',password:'zoo-test-player-only'});const duplicate=await (await post('/api/spin',firstPayload)).json();assert.deepEqual(duplicate,first);assert.equal((await get('/api/me')).balance,beforeRestart);
  assert.equal((await post('/api/spin',{...firstPayload,bets:[{id:'animal:1',amount:1}]})).status(),409);
  const audit=spawnSync(process.execPath,['tools/verify-ledger.js',path.join(dir,'ledger.jsonl'),path.join(dir,'state.json')],{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(audit.status,0,audit.stdout+audit.stderr);console.log(audit.stdout.trim());assert.deepEqual(errors,[]);
  console.log('PASS FortunaZoo: 40 animal choices, responsive art, betting chips, exact pointer on all 40 pockets, replay without charge, wallet, double click, lost responses, reload/restart recovery, audit, alpha and existing-game regression.');
}finally{await browser?.close();if(server?.exitCode===null)await stop();await rm(dir,{recursive:true,force:true});}
