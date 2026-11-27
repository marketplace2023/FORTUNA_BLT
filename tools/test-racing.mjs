import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { RACING_DEF, RACING_PLACES, buildRacing, raceCard } from '../server/games/racing.js';
import { Drbg } from '../server/rng.js';
import { canonical, sha256 } from '../server/util.js';
import { Store } from '../server/store.js';
import { loadGames } from '../server/games/index.js';

const root = path.resolve(import.meta.dirname, '..'), game = buildRacing(RACING_DEF);
const legacy = buildRacing({ ...RACING_DEF, model: { ...RACING_DEF.model, version: 1 } });
assert.equal(legacy.configHash, '6298daa131754e671f4c51dfc3f48881e7099a14b54008e2b92c76855eb65078');
const legacyResult = legacy.play(new Drbg(sha256('legacy-race')), { offerSeed: sha256('legacy-card'), horseId: 4 });
assert.equal(sha256(canonical(legacyResult)), '214e64d4b377ab37ae86849df0371cd47983b03751bb15a7cca4c2c5facedf03');
let minRtp = 100, maxOdds = 0;
for (let i = 0; i < 500; i++) {
  const offerSeed = sha256(`race-card-${i}`), card = raceCard(RACING_DEF, offerSeed);
  assert(Math.abs(card.horses.reduce((s,h)=>s+h.probability,0)-1) < 1e-12);
  for (const h of card.horses) {
    assert.equal(h.oddsCents, Math.floor(.96 / h.probability * 100 + 1e-9));
    assert(h.returnPct <= 96 + 1e-10 && h.returnPct > 95.7);
    minRtp = Math.min(minRtp,h.returnPct); maxOdds = Math.max(maxOdds,h.odds);
  }
  const input = { offerSeed, horseId: i % 8 + 1 };
  const seed = sha256(`race-${i}`), r = game.play(new Drbg(seed), input);
  assert.deepEqual(r, game.play(new Drbg(seed), input));
  assert.equal(new Set(r.order).size,8);
  assert.equal(r.win, r.order[0] === input.horseId ? card.horses[input.horseId-1].odds : 0);
  assert(r.win <= RACING_DEF.maxWin);
  assert.deepEqual([...r.runners].sort((a,b)=>a.finishMs-b.finishMs).map(h=>h.id),r.order);
  for (const [betType, places] of Object.entries(RACING_PLACES)) {
    let probabilitySum = 0;
    for (const { markets } of card.horses) {
      const { probability, oddsCents } = markets[betType];
      assert.equal(oddsCents, Math.floor(.96 / probability * 100 + 1e-9));
      assert(oddsCents >= 100 && probability * oddsCents <= 96 + 1e-10);
      probabilitySum += probability;
    }
    assert(Math.abs(probabilitySum - places) < 1e-12);
    const result = game.play(new Drbg(seed), { ...input, betType });
    assert.equal(result.betType, betType);
    assert.deepEqual(result.order, r.order);
    assert.equal(result.win, r.order.indexOf(input.horseId) < places ? card.horses[input.horseId - 1].markets[betType].oddsCents / 100 : 0);
  }
}
// The arrival order is independent of the selected market.
const offerSeed = sha256('distribution-card'), card = raceCard(RACING_DEF, offerSeed);
const counts = Array.from({ length: 3 }, () => Array(8).fill(0)), rng = new Drbg(sha256('distribution-outcomes'));
for (let i = 0; i < 30000; i++) {
  const { order } = game.play(rng, { offerSeed, horseId: 1 });
  counts.forEach((bucket, rank) => order.slice(0, rank + 1).forEach(id => bucket[id - 1]++));
}
for (const [betType, places] of Object.entries(RACING_PLACES)) {
  card.horses.forEach((horse, i) => assert(Math.abs(counts[places - 1][i] / 30000 - horse.markets[betType].probability) < .012));
}
console.log(`PASS model: deterministic replay, 500 programs, exact probabilities and quotes, 30,000 sampled races. Sample minimum RTP ${minRtp.toFixed(4)}%, max quote ${maxOdds}.`);

const dir=await mkdtemp(path.join(tmpdir(),'vlt-racing-')), origin='http://127.0.0.1:4319', output=path.join(root,'output/racing-qa');
await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['server/index.js'],{cwd:root,env:{...process.env,PORT:'4319',DATA_DIR:dir,ADMIN_PASSWORD:'racing-test-only-password'},stdio:'ignore',windowsHide:true});
let browser;
try {
  for (let i=0;i<80;i++) { try { if ((await fetch(`${origin}/api/site`)).ok) break; } catch {} await delay(100); }
  browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}}), page=await context.newPage(), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().includes('/assets/racing/')&&r.status()>=400) errors.push(r.url());});
  const post = (endpoint, data) => context.request.post(`${origin}${endpoint}`,{data});
  assert.equal((await post('/api/racing/bet',{token:'bad',bet:1,horseId:1})).status(),401);
  await page.goto(`${origin}/play/hipodromo-royale`);await page.waitForSelector('.horse');
  assert.equal(await page.locator('.horse').count(),8);
  await page.screenshot({path:path.join(output,'desktop.png'),fullPage:true});
  assert.equal(await page.locator('select').count(), 0);
  for(const [width,height] of [[390,844],[320,568],[768,1024],[844,390],[568,320],[480,320],[1366,768]]) {
    await page.setViewportSize({width,height});await delay(150);
    const fits = () => page.evaluate(() => {
      const viewport = document.querySelector('.viewport').getBoundingClientRect();
      const within = n => {
        const r = n.getBoundingClientRect();
        return r.width && r.height && r.left >= 0 && r.right <= innerWidth + 1 && r.top >= viewport.top && r.bottom <= viewport.bottom;
      };
      return document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight &&
        [...document.querySelectorAll('.panel')].filter(n => n.getClientRects().length).every(within);
    });
    assert(await fits(), `No overflow at ${width}×${height}`);
    assert(await page.locator('#track').evaluate(n=>n.width>0&&n.height>0));
    await page.screenshot({path:path.join(output,`${width}x${height}.png`),fullPage:true});
    if (await page.locator('#showTicket').isVisible()) {
      await page.locator('#showTicket').click();
      assert(await fits(), `Ticket fits at ${width}×${height}`);
      await page.screenshot({path:path.join(output,`ticket-${width}x${height}.png`),fullPage:true});
      await page.locator('#showHorses').click();
    }
  }
  await page.getByRole('button',{name:'Ver ficha de Relámpago',exact:true}).click();
  assert.equal(await page.locator('#horseDetails meter').count(),6);
  await page.getByRole('button',{name:'Cerrar ficha',exact:true}).click();
  await page.getByRole('button',{name:'Elegir Relámpago',exact:true}).click();
  const originalOdds = await page.locator('#ticketOdds').textContent();
  await page.locator('[data-bet-type=place]').click();
  assert.notEqual(await page.locator('#ticketOdds').textContent(), originalOdds);
  await page.locator('#stakeUp').click();
  assert.equal(await page.locator('#stake').textContent(), '2,00');
  await page.locator('#stakeDown').click();
  assert.equal(await page.locator('#stake').textContent(), '1,00');
  const format = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const placeOdds = Number((await page.locator('#ticketOdds').textContent()).slice(1));
  assert.equal(await page.locator('#potential').textContent(), format.format(placeOdds));
  assert.equal(await page.locator('#profit').textContent(), format.format(placeOdds - 1));
  await page.getByRole('button',{name:'Jugar demo · 2.000 créditos',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#balance').textContent.includes('000'));
  await page.emulateMedia({reducedMotion:'reduce'});
  const before=(await (await context.request.get(`${origin}/api/me`)).json()).balance;
  const response=page.waitForResponse(r=>r.url().endsWith('/api/racing/bet')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Iniciar carrera',exact:true}).dblclick();
  const receipt=await (await response).json();await page.waitForSelector('#result:not([hidden])');
  assert(receipt.result&&receipt.roundId,JSON.stringify(receipt));
  assert.equal(receipt.result.betType, 'place');
  assert.equal(receipt.result.card.horses[0].markets.place.oddsCents / 100, placeOdds);
  assert.equal(receipt.balance,Math.round((before-receipt.bet+receipt.win)*10000)/10000);
  let history=await (await context.request.get(`${origin}/api/history?game=hipodromo-royale`)).json();assert.equal(history.length,1);
  assert.deepEqual(await page.locator('#runningOrder .runner-number').allTextContents(),receipt.result.order.map(String));
  assert((await page.locator('#result').textContent()).includes(receipt.result.card.horses.find(h=>h.id===receipt.result.order[0]).name));
  await page.getByRole('button',{name:'Verificar carrera',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.verification').textContent.includes('Verificada'));
  await page.getByRole('button',{name:'Ver repetición',exact:true}).click();await page.waitForSelector('#result:not([hidden])');
  assert.equal((await (await context.request.get(`${origin}/api/history?game=hipodromo-royale`)).json()).length,1,'Visual replay must never charge another wager');
  await page.screenshot({path:path.join(output,'result.png'),fullPage:true});
  await page.reload();await page.waitForSelector('#result:not([hidden])');assert.equal((await (await context.request.get(`${origin}/api/history?game=hipodromo-royale`)).json()).length,1);
  await page.getByRole('button',{name:'Preparar otra carrera →',exact:true}).click();await page.waitForSelector('#result[hidden]',{state:'attached'});
  const q=await (await context.request.get(`${origin}/api/racing/card`)).json();
  assert.equal((await post('/api/racing/bet',{token:q.token+'x',bet:1,horseId:1})).status(),409);
  assert.equal((await post('/api/racing/bet',{token:q.token,bet:-1,horseId:1})).status(),400);
  assert.equal((await post('/api/racing/bet',{token:q.token,bet:1,horseId:9})).status(),400);
  assert.equal((await post('/api/racing/bet',{token:q.token,bet:1,horseId:1,betType:'toString'})).status(),400);
  assert.equal((await post('/api/spin',{gameId:'hipodromo-royale',bet:1})).status(),400);
  const payload={token:q.token,horseId:2,bet:.2,betType:'show'};
  const duplicates=await Promise.all([post('/api/racing/bet',payload),post('/api/racing/bet',payload)]);
  const packets=await Promise.all(duplicates.map(r=>r.json()));assert.equal(packets[0].roundId,packets[1].roundId);
  assert.equal(packets[0].result.betType, 'show');
  assert.equal((await post('/api/racing/bet',{...payload,betType:'place'})).status(),409);
  assert.equal((await post('/api/racing/bet',{...payload,horseId:3})).status(),409);
  const other=await browser.newContext();await other.request.post(`${origin}/api/auth/demo`,{data:{}});
  assert.equal((await other.request.get(`${origin}/api/racing/rounds/${receipt.roundId}`)).status(),404);await other.close();
  // A response lost after the debit must be retried using the same offer.
  await page.getByRole('button',{name:'Elegir Bruma Real',exact:true}).click();
  let intercepted=0;
  await page.route('**/api/racing/bet',async route=>{intercepted++;if(intercepted===1){await route.fetch();await route.abort('connectionfailed');}else await route.continue();});
  await page.getByRole('button',{name:'Iniciar carrera',exact:true}).click();await page.waitForSelector('#result:not([hidden])');
  assert.equal(intercepted,2);await page.unroute('**/api/racing/bet');
  history=await (await context.request.get(`${origin}/api/history?game=hipodromo-royale`)).json();assert.equal(history.length,3);
  // Keep the unresolved token through repeated network errors, then recover on reload.
  await page.getByRole('button',{name:'Preparar otra carrera →',exact:true}).click();await page.waitForSelector('#result[hidden]',{state:'attached'});
  await page.getByRole('button',{name:'Elegir Oro Negro',exact:true}).click();
  await page.route('**/api/racing/bet',async route=>{await route.fetch();await route.abort('connectionfailed');});
  await page.getByRole('button',{name:'Iniciar carrera',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#ticketStatus').textContent.includes('Recarga'));
  await delay(1200);assert(await page.locator('#bet').isDisabled());assert(await page.locator('#refresh').isDisabled());
  await page.unroute('**/api/racing/bet');await page.reload();await page.waitForSelector('#result:not([hidden])');
  assert.equal((await (await context.request.get(`${origin}/api/history?game=hipodromo-royale`)).json()).length,4);
  // Normal motion: skip the actual animation without creating a second wager.
  await page.getByRole('button',{name:'Preparar otra carrera →',exact:true}).click();await page.waitForSelector('#result[hidden]',{state:'attached'});
  await page.emulateMedia({reducedMotion:'no-preference'});await page.getByRole('button',{name:'Elegir Esmeralda',exact:true}).click();
  await page.getByRole('button',{name:'Iniciar carrera',exact:true}).click();await page.waitForSelector('#skip:not([hidden])');
  await delay(1200);await page.screenshot({path:path.join(output,'racing.png'),fullPage:true});
  await page.getByRole('button',{name:'Ver llegada',exact:true}).click();await page.waitForSelector('#result:not([hidden])');
  // Deterministic win/loss presentation from real engine fixtures, without writing them to the ledger.
  const uiContext=await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}});
  await uiContext.request.post(`${origin}/api/auth/demo`,{data:{}});
  const fixturePage=await uiContext.newPage();fixturePage.on('pageerror',e=>errors.push(e.message));
  await fixturePage.goto(`${origin}/play/hipodromo-royale`);await fixturePage.waitForSelector('.horse');
  for (const won of [true,false]) {
    let expected;
    await fixturePage.route('**/api/racing/bet', async route=>{
      const body=route.request().postDataJSON(), offer=JSON.parse(Buffer.from(body.token.split('.')[0],'base64url').toString());
      let result;
      for(let i=0;i<1000;i++){
        result=game.play(new Drbg(sha256(`ui-${i}`)),{offerSeed:offer.offerSeed,horseId:body.horseId,betType:body.betType});
        if (won ? result.order.indexOf(body.horseId) === 2 : result.win === 0) break;
      }
      assert.equal(result.win>0,won);expected=result.win*body.bet;
      await route.fulfill({json:{roundId:'UI-FIXTURE',result,win:expected,bet:body.bet,balance:2000-body.bet+expected}});
    });
    await fixturePage.getByRole('button',{name:'Elegir Relámpago',exact:true}).click();
    await fixturePage.locator('[data-bet-type=show]').click();
    await fixturePage.getByRole('button',{name:'Iniciar carrera',exact:true}).click();await fixturePage.waitForSelector('#result:not([hidden])');
    assert.equal((await fixturePage.locator('#result').textContent()).includes('Apuesta acertada'),won);
    assert((await fixturePage.locator('#result').textContent()).includes(new Intl.NumberFormat('es',{minimumFractionDigits:2,maximumFractionDigits:2}).format(expected)));
    await fixturePage.screenshot({path:path.join(output,won?'winning-ticket.png':'losing-ticket.png'),fullPage:true});
    await fixturePage.unroute('**/api/racing/bet');
    await fixturePage.getByRole('button',{name:'Preparar otra carrera →',exact:true}).click();await fixturePage.waitForSelector('#result[hidden]',{state:'attached'});
  }
  await uiContext.close();
  const alpha=await page.evaluate(async()=>{const i=new Image();i.src='/assets/racing/gallop.png';await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);return x.getImageData(0,0,1,1).data[3];});assert.equal(alpha,0);
  const rebuilt=new Store(dir);assert.equal(rebuilt.raceOffers.size,5);assert(rebuilt.ledger.verify().ok);
  const audit=spawnSync(process.execPath,['tools/verify-ledger.js',path.join(dir,'ledger.jsonl'),path.join(dir,'state.json')],{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(audit.status,0,audit.stdout+audit.stderr);
  console.log(audit.stdout.trim());
  await post('/admin/api/login',{username:'admin',password:'racing-test-only-password'});
  await page.goto(`${origin}/admin#rounds`);await page.locator('.filters label').filter({hasText:/^Tipo/}).locator('select').selectOption('1');await page.waitForSelector('tbody tr');
  await page.locator('tbody tr').filter({hasText:receipt.roundId}).click();
  await page.waitForSelector('#modal[open]');assert.equal(await page.locator('#modal ol li').count(),8);
  await page.goto(origin);await page.waitForSelector('.racing-card');assert.equal(await page.locator('#grid .card').count(),loadGames().size);
  await page.getByRole('button',{name:'Ruletas',exact:true}).click();assert.equal(await page.locator('#grid .roulette-card').count(),[...loadGames().values()].filter(g=>g.def.engine==='roulette').length);
  await page.getByRole('button',{name:'Hipódromo',exact:true}).click();assert.equal(await page.locator('#grid .card').count(),1);
  for (const [id,count] of [['koi-dorado',9],['panda-zen',9],['fiesta-dulce',30]]) {await page.goto(`${origin}/play/${id}`);await page.waitForFunction(n=>document.querySelectorAll('.cell').length===n,count);}
  assert.deepEqual(errors,[]);
  console.log('PASS racing UI/API: responsive, selection, gross/net quote, single debit, duplicate token, invalid wager, player isolation, lost response, reload recovery, skip, exact arrival, audit, rebuilt store, lobby filters and slot regression.');
} finally {await browser?.close();server.kill();await delay(300);await rm(dir,{recursive:true,force:true});}
