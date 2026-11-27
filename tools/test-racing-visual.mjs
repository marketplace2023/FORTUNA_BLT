import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { buildRacing, RACING_DEF } from '../server/games/racing.js';
import { Drbg } from '../server/rng.js';
import { sha256 } from '../server/util.js';

const root=path.resolve(import.meta.dirname,'..'), dir=await mkdtemp(path.join(tmpdir(),'racing-visual-')), origin='http://127.0.0.1:4320';
const output=path.join(root,'output/racing-3d');await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['server/index.js'],{cwd:root,env:{...process.env,PORT:'4320',DATA_DIR:dir},stdio:'ignore',windowsHide:true});
const result=buildRacing(RACING_DEF).play(new Drbg(sha256('visual-race')),{offerSeed:sha256('visual-card'),horseId:4});
let browser;
try {
  for(let i=0;i<80;i++){try{if((await fetch(origin+'/api/site')).ok)break;}catch{}await delay(100);}
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/play/hipodromo-royale');await page.waitForSelector('#track[data-horses="8"]');
  assert.equal(await page.locator('#track').getAttribute('data-renderer'),'webgl');
  await page.getByRole('button',{name:'Elegir Esmeralda',exact:true}).click();
  await page.locator('.broadcast').screenshot({path:path.join(output,'selected-horse.png')});
  for(const name of ['Lateral','Frontal','Meta','Auto']){const button=page.getByRole('button',{name,exact:true});await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');}
  await page.setViewportSize({width:390,height:844});await page.locator('.broadcast').screenshot({path:path.join(output,'mobile.png')});
  for(const [width,height] of [[320,568],[844,390],[768,1024]]){await page.setViewportSize({width,height});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  // Drive only the visual engine with a real deterministic result, never a live wager.
  await page.route('**/__visual-test',r=>r.fulfill({contentType:'text/html',body:'<body style="margin:0"><div style="width:100vw;height:100vh"><canvas id="scene" style="width:100%;height:100%"></canvas></div></body>'}));
  await page.setViewportSize({width:1280,height:720});await page.goto(origin+'/__visual-test');
  await page.evaluate(async result=>{const {RaceTrack3D}=await import('/js/race-track-3d.js');window.qa=new RaceTrack3D(document.querySelector('#scene'),ids=>window.qaOrder=ids);qa.setCard(result.card);qa.choose(result.selected);await qa.ready;qa.result=result;qa.duration=Math.max(...result.runners.map(r=>r.finishMs));},result);
  for(const [name,phase] of [['start',.03],['side',.27],['front',.52],['finish',.95],['official',1]]){
    const metrics=await page.evaluate(phase=>{qa.time=qa.duration*phase;qa.draw();const chosen=qa.actors.find(a=>a.horse.id===qa.selected), base=chosen.root.position.clone();const top=base.clone().add({x:0,y:2.5,z:0});base.project(qa.camera);top.project(qa.camera);return {shot:qa.canvas.dataset.shot,height:Math.abs(top.y-base.y)*innerHeight/2,order:qaOrder,actors:qa.actors.length};},phase);
    assert.equal(metrics.actors,8);assert(metrics.height>40,`Horse must be visible in ${name}`);
    if(phase===1)assert.deepEqual(metrics.order,result.order);
    await page.screenshot({path:path.join(output,name+'.png')});
  }
  const poses=await page.evaluate(()=>{const snapshots=[];for(const phase of [.34,.35]){qa.time=qa.duration*phase;qa.draw();const model=qa.actors[0].model;let skeleton;model.traverse(n=>{if(n.isSkinnedMesh)skeleton=Array.from(n.skeleton.boneMatrices);});snapshots.push(skeleton);}return snapshots;});assert.notDeepEqual(poses[0],poses[1],'Gallop skeleton must actually animate');
  const seam = await page.evaluate(() => {
    const track = qa.gallop.tracks.find(track => track.name === 'Tail7.quaternion');
    const sample = track.createInterpolant();
    const before = Array.from(sample.evaluate(qa.gallop.duration - .001));
    const after = sample.evaluate(.001);
    const dot = before.reduce((sum, component, i) => sum + component * after[i], 0);
    return 2 * Math.acos(Math.min(1, Math.abs(dot)));
  });
  assert(seam < .04, 'Gallop must wrap smoothly through the clip boundary');
  const photo = await page.evaluate(async () => {
    const { Box3 } = await import('/vendor/three/three.module.js');
    qa.setCamera('front');
    const frames = qa.result.order.slice(0, 3).map(id => {
      qa.photoFrame(qa.result.runners.find(runner => runner.id === id).finishMs, id);
      const highlighted = qa.actors.filter(actor => actor.icon.visible).map(actor => actor.horse.id);
      const muzzle = qa.actors.find(actor => actor.horse.id === id).bit.getWorldPosition(qa.photoPoint);
      muzzle.x += .08;
      return { shot: qa.canvas.dataset.shot, highlighted, center: muzzle.project(qa.camera).x };
    });
    qa.photoFrame(qa.duration * 1.025);
    const bounds = new Box3();
    const rearEdges = qa.actors.map(actor => bounds.setFromObject(actor.model, true).min.x);
    qa.finish();
    return { frames, rearEdges, restoredShot: qa.canvas.dataset.shot };
  });
  assert.deepEqual(photo.frames.map(frame => frame.highlighted), result.order.slice(0, 3).map(id => [id]));
  assert(photo.frames.every(frame => frame.shot === 'photo' && Math.abs(frame.center) < .001));
  assert(photo.rearEdges.every(x => x > 80.07), 'Every horse, including its tail, must clear the finish stripe');
  assert.equal(photo.restoredShot, 'front');
  const fallback=await browser.newContext();await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(String(kind).startsWith('webgl'))return null;return original.call(this,kind,...args);};});
  const p2=await fallback.newPage();p2.on('pageerror',e=>errors.push(e.message));await p2.goto(origin+'/play/hipodromo-royale');await p2.waitForSelector('#track[data-renderer="canvas"]');await p2.waitForSelector('.horse');assert.equal(await p2.locator('.horse').count(),8);await fallback.close();
  const failedAsset=await browser.newContext(), p3=await failedAsset.newPage();p3.on('pageerror',e=>errors.push(e.message));await p3.route('**/assets/racing/horse.glb',r=>r.abort());await p3.goto(origin+'/play/hipodromo-royale');await p3.waitForSelector('#track[data-renderer="canvas"]');await p3.waitForSelector('.horse');await failedAsset.close();
  assert.deepEqual(errors,[]);console.log('PASS 3D: eight rigged horses, camera controls, visible framing, all automatic shots, exact final order, skeletal gallop, mobile widths, WebGL fallback and failed-model fallback. No live wagers.');
} finally {await browser?.close();server.kill();await delay(300);await rm(dir,{recursive:true,force:true});}
