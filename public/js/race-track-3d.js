import * as T from '/vendor/three/three.module.js';
import { GLTFLoader } from '/vendor/three/GLTFLoader.js';
import { clone } from '/vendor/three/SkeletonUtils.js';
import { prepareHorse, smoothGallop, styleHorse } from './race-horse.js';
import { mountJockey } from './race-jockey.js';

const mat = (color, roughness = .8) => new T.MeshStandardMaterial({ color, roughness, metalness: 0 });
const white = mat(0xe9e6d5, .55);
const racePlaybackMs = 22000;
const strideLength = 3.2;
const finishX = 80;
function mesh(g, m, parent, x = 0, y = 0, z = 0) { const o = new T.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; }
function box(parent, size, position, m) { return mesh(new T.BoxGeometry(...size), m, parent, ...position); }
function texture(c) { const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; }
function label(text, background, color = '#fff') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = background; x.fillRect(0, 0, 256, 128); x.fillStyle = color; x.font = 'bold 78px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 68); return texture(c);
}
function grassTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), data = x.createImageData(256, 256); let seed = 48271;
  for (let i = 0; i < data.data.length; i += 4) { seed = seed * 16807 % 2147483647; const n = seed % 35; data.data.set([63 + n, 86 + n, 31 + Math.floor(n * .5), 255], i); }
  x.putImageData(data, 0, 0); const t = texture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(100, 100); return t;
}

/** Geometry and cameras only. Arrival times and order always come from the recorded server result. */
export class RaceTrack3D {
  constructor(canvas, onOrder) {
    this.canvas = canvas; this.onOrder = onOrder; this.horses = []; this.actors = []; this.time = 0; this.selected = null; this.running = false; this.cameraMode = 'auto';
    this.photoPoint = new T.Vector3();
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6)); this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace; this.renderer.toneMapping = T.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.25;
    this.scene = new T.Scene(); this.scene.background = new T.Color(0xb6c9c7); this.scene.fog = new T.Fog(0xb6c9c7, 90, 260);
    this.camera = new T.PerspectiveCamera(35, 2, .15, 420); this.scene.add(new T.HemisphereLight(0xe8f0ff, 0x525631, 2.5));
    this.sun = new T.DirectionalLight(0xffe7bd, 3); this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -28, right: 28, top: 25, bottom: -25, near: 1, far: 130 }); this.sun.shadow.bias = -.00035; this.sun.shadow.normalBias = .06;
    this.scene.add(this.sun, this.sun.target); this.environment(); this.trackGroup = new T.Group(); this.scene.add(this.trackGroup);
    this.ready = this.loadHorse().then(() => { this.buildHorses(); this.draw(); });
    this.ready.catch(() => { this.canvas.dataset.assetError = 'horse'; });
    this.canvas.dataset.renderer = 'webgl';
    this.canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.stop(); this.canvas.dataset.contextLost = 'true'; });
    this.canvas.addEventListener('webglcontextrestored', () => { delete this.canvas.dataset.contextLost; this.draw(); });
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas.parentElement); this.resize();
  }
  environment() {
    const ground = new T.MeshStandardMaterial({ color: 0xa5ad74, roughness: 1, map: grassTexture() });
    const plane = mesh(new T.PlaneGeometry(650, 500), ground, this.scene); plane.rotation.x = -Math.PI / 2;
    const turf = ground.map.clone(); turf.repeat.set(65, 1); turf.needsUpdate = true;
    for (let i = 0; i < 12; i++) { const m = new T.MeshStandardMaterial({ color: i % 2 ? 0xaab877 : 0xb5bf80, map: turf, roughness: 1 }); const strip = mesh(new T.PlaneGeometry(340, 2), m, this.scene, 0, .012, -11 + i * 2); strip.rotation.x = -Math.PI / 2; }
    const rail = mat(0xf0eee0, .6), post = new T.BoxGeometry(.10, 1.3, .12);
    for (const z of [-13, 13]) {
      const posts = new T.InstancedMesh(post, rail, 114), matrix = new T.Matrix4();
      for (let i = 0; i < 114; i++) { matrix.makeTranslation(-169 + i * 3, .65, z); posts.setMatrixAt(i, matrix); }
      posts.castShadow = true; this.scene.add(posts); box(this.scene, [340, .10, .13], [0, .95, z], rail); box(this.scene, [340, .12, .16], [0, 1.3, z], rail);
    }
    const finish = new T.Group(); finish.position.x = finishX; this.scene.add(finish);
    for (const z of [-13.2, 13.2]) { box(finish, [.45, 5, .45], [0, 2.5, z], white); box(finish, [.5, .65, .5], [0, 4.6, z], mat(0x294c35)); }
    this.finishBeam = box(finish, [.4, .25, 27], [0, 5, 0], white);
    const banner = new T.MeshBasicMaterial({ map: label('META', '#eee9d8', '#20412e'), side: T.DoubleSide });
    mesh(new T.PlaneGeometry(3.5, 1.2), banner, finish, 0, 4.2, 13.2).rotation.y = Math.PI / 2;
    mesh(new T.PlaneGeometry(.14, 26), mat(0xf1ead0), this.scene, finishX, .025, 0).rotation.x = -Math.PI / 2;
    this.gates = new T.Group(); this.gates.position.x = -75; this.scene.add(this.gates);
    for (let i = 0; i <= 8; i++) { const z = -9.6 + i * 2.4; box(this.gates, [3.3, .12, .1], [-1, 2.6, z], white); box(this.gates, [.1, 2.6, .1], [-2.6, 1.3, z], white); }
    box(this.gates, [.16, .2, 19.2], [-2.6, 2.7, 0], white);
    const stand = new T.Group(); stand.position.set(0, 0, -40); this.scene.add(stand);
    const stone = mat(0xc3b99b), roof = mat(0xc9c3b0, .45), glass = mat(0x304f4b, .2);
    for (let i = 0; i < 7; i++) box(stand, [170, .55, 1.65], [0, 1 + i * .55, -i * 1.5], stone);
    const seats = new T.InstancedMesh(new T.BoxGeometry(.55, .45, .6), mat(0x344d3c), 1400), m = new T.Matrix4();
    for (let row = 0; row < 7; row++) for (let i = 0; i < 200; i++) { m.makeTranslation(-82 + i * .82, 1.55 + row * .55, -.4 - row * 1.5); seats.setMatrixAt(row * 200 + i, m); } stand.add(seats);
    box(stand, [172, .3, 17], [0, 9, -4], roof); for (let i = 0; i < 12; i++) box(stand, [.25, 8.8, .25], [-82 + i * 15, 4.4, -11], white);
    box(stand, [62, 8, 8], [0, 4, -18], stone); box(stand, [60, 3, .1], [0, 6, -13.8], glass);
    const woodland = new T.TextureLoader().load('/assets/racing/woodland.png', () => this.draw()); woodland.colorSpace = T.SRGBColorSpace;
    woodland.wrapS = T.MirroredRepeatWrapping; woodland.repeat.set(8, .78); woodland.offset.y = .22;
    const backdrop = new T.MeshBasicMaterial({ map: woodland, side: T.BackSide, fog: false });
    const horizon = mesh(new T.CylinderGeometry(230, 230, 90, 96, 1, true), backdrop, this.scene, 0, 40, 0); horizon.castShadow = false; horizon.receiveShadow = false;
    const board = new T.MeshBasicMaterial({ map: label('ROYALE', '#1b3828', '#e5d9ac'), side: T.DoubleSide });
    for (let i = 0; i < 14; i++) mesh(new T.PlaneGeometry(7, 1.6), board, this.scene, -143 + i * 22, .9, -16);
  }
  async loadHorse() {
    const gltf = await new GLTFLoader().loadAsync('/assets/racing/horse.glb'); this.template = gltf.scene;
    prepareHorse(this.template);
    const bounds = new T.Box3().setFromObject(this.template), size = bounds.getSize(new T.Vector3());
    this.modelScale = 2.7 / Math.max(size.x, size.z); this.modelFloor = bounds.min.y * this.modelScale;
    this.gallop = smoothGallop(gltf.animations.find(a => /Gallop$/.test(a.name)));
    const head = this.template.getObjectByName('Head')?.getWorldPosition(new T.Vector3());
    this.modelAngle = head && Math.abs(head.x) > Math.abs(head.z) ? (head.x >= 0 ? 0 : Math.PI) : head && head.z < 0 ? -Math.PI / 2 : Math.PI / 2;
  }
  buildHorses() {
    if (!this.template) return;
    for (const actor of this.actors) {
      actor.mixer.stopAllAction();
      actor.mixer.uncacheRoot(actor.model);
      const materials = new Set(), skeletons = new Set();
      actor.root.traverse(node => {
        if (node.isSkinnedMesh) skeletons.add(node.skeleton);
        else if (node.geometry && !node.isSprite) node.geometry.dispose();
        if (node.material) materials.add(node.material);
      });
      for (const skeleton of skeletons) skeleton.dispose();
      for (const material of materials) {
        material.map?.dispose();
        material.dispose();
      }
    }
    this.trackGroup.clear(); this.actors = [];
    this.horses.forEach((horse, index) => {
      const root = new T.Group(); this.trackGroup.add(root); const model = clone(this.template); model.scale.setScalar(this.modelScale); model.rotation.y = this.modelAngle; model.position.y = -this.modelFloor;
      root.add(model);
      const bit = styleHorse(model, root, index);
      const poseJockey = mountJockey(root, model, horse, bit);
      const mixer = new T.AnimationMixer(model);
      mixer.clipAction(this.gallop).play();
      const icon = new T.Sprite(new T.SpriteMaterial({ map: label(String(horse.id), horse.color), depthTest: false, toneMapped: false })); icon.scale.set(.55, .28, 1); icon.position.set(.1, 2.75, 0); icon.renderOrder = 10; root.add(icon);
      this.actors.push({ root, model, poseJockey, mixer, icon, horse, bit: bit[0] });
    }); this.canvas.dataset.horses = String(this.actors.length); this.draw();
  }
  resize() { const r = this.canvas.getBoundingClientRect(); if (!r.width || !r.height) return; this.renderer.setSize(r.width, r.height, false); this.camera.aspect = r.width / r.height; this.camera.updateProjectionMatrix(); this.draw(); }
  setCard(card) { this.stop(); this.result = null; this.photo = null; this.time = 0; this.horses = card.horses; this.buildHorses(); this.draw(); }
  choose(id) { this.selected = id; this.draw(); }
  setCamera(mode) { this.cameraMode = ['auto', 'side', 'front', 'finish'].includes(mode) ? mode : 'auto'; this.draw(); }
  progress(runner, time) { const t = Math.max(0, Math.min(1, time / runner.finishMs)); return t + Math.sin(Math.PI * t) * runner.pace + Math.sin(2 * Math.PI * t) * runner.surge; }
  async play(result, { onProgress, reduced = false } = {}) {
    this.stop(); await this.ready; this.result = result; this.horses = result.card.horses; this.selected = result.selected; this.time = 0; this.duration = Math.max(...result.runners.map(r => r.finishMs));
    this.photo = null;
    if (this.actors.length !== this.horses.length || this.horses.some((horse, i) => {
      const previous = this.actors[i].horse;
      return horse.id !== previous.id || horse.color !== previous.color;
    })) this.buildHorses();
    if (reduced) { this.time = this.duration; this.draw(); onProgress?.(1); return; }
    this.running = true;
    return new Promise(resolve => { this.resolve = resolve; const start = performance.now(); const tick = now => {
      const p = Math.min(1, (now - start) / racePlaybackMs); this.time = this.duration * p; this.draw(); onProgress?.(p);
      if (p < 1 && this.running) this.raf = requestAnimationFrame(tick); else { this.running = false; this.resolve = null; resolve(); }
    }; this.raf = requestAnimationFrame(tick); });
  }
  stop() { cancelAnimationFrame(this.raf); this.running = false; if (this.resolve) { this.resolve(); this.resolve = null; } }
  photoFrame(time, id) {
    this.photo = { id };
    this.time = time;
    this.draw();
  }
  finish() { this.stop(); this.photo = null; if (this.result) this.time = this.duration; this.draw(); }
  draw() {
    if (!this.renderer || !this.camera) return;
    const states = this.horses.map((horse, index) => {
      const runner = this.result?.runners.find(r => r.id === horse.id), p = runner ? this.progress(runner, this.time) : 0;
      const after = runner ? Math.max(0, (this.time - runner.finishMs) / this.duration) * 160 : 0;
      const gathering = 1 - .48 * T.MathUtils.smoothstep(p, 0, .18);
      const distance = p * 160 + after;
      const x = !this.result && horse.id === this.selected ? -65 : -finishX + distance;
      return { horse, index, p, distance, x, z: (-8.4 + index * 2.4) * gathering, finished: runner && this.time >= runner.finishMs };
    });
    const ordered = [...states].sort((a, b) => a.finished && b.finished ? this.result.order.indexOf(a.horse.id) - this.result.order.indexOf(b.horse.id) : b.p - a.p);
    if (!this.photo) this.onOrder?.(ordered.map(r => r.horse.id));
    const lead = ordered[0]?.x || -80, phase = this.result ? this.time / this.duration : 0;
    let shot = this.photo ? 'photo' : this.cameraMode;
    if (shot === 'auto') shot = !this.result ? 'paddock' : phase < .16 ? 'start' : phase < .43 ? 'side' : phase < .62 ? 'front' : phase < .86 ? 'side' : 'finish';
    this.finishBeam.visible = shot !== 'photo';
    for (const s of states) {
      const actor = this.actors[s.index];
      if (!actor) continue;
      actor.root.position.set(s.x, 0, s.z);
      const stridePhase = (s.distance / strideLength + s.index * .27) % 1;
      actor.mixer.setTime(stridePhase * this.gallop.duration);
      // For the photo finish, the recorded distance refers to the muzzle crossing the line.
      if (this.photo) actor.root.position.x += s.x - actor.bit.getWorldPosition(this.photoPoint).x - .08;
      actor.poseJockey();
      actor.icon.visible = this.photo ? s.horse.id === this.photo.id : s.horse.id === this.selected || shot === 'front';
    }
    const narrow = this.camera.aspect < 1.5;
    if (shot === 'photo') {
      this.camera.position.set(finishX, 4.6, 12.3);
      this.camera.lookAt(finishX, 1.05, 0);
      this.camera.fov = narrow ? 58 : 37;
    }
    else if (shot === 'paddock' && this.selected) { const chosen = states.find(s => s.horse.id === this.selected); this.camera.position.set(chosen.x + 4.8, 2.8, chosen.z + 8); this.camera.lookAt(chosen.x + .1, 1.4, chosen.z); this.camera.fov = narrow ? 47 : 34; }
    else if (shot === 'paddock' || shot === 'start') { this.camera.position.set(lead + 12, narrow ? 5.5 : 4.8, narrow ? 22 : 20); this.camera.lookAt(lead - .3, 1.4, 0); this.camera.fov = narrow ? 49 : 42; }
    else if (shot === 'front') { this.camera.position.set(lead + (this.result ? 21 : 29), 3.4, 3); this.camera.lookAt(lead - 2, 1.3, 0); this.camera.fov = narrow ? 48 : 34; }
    else if (shot === 'finish' && phase > .83) {
      // Shoot from inside the rail so the near finish post does not hide the pack.
      this.camera.position.set(87, 4.2, 11.8);
      this.camera.lookAt(78, 1.2, 0);
      this.camera.fov = narrow ? 58 : 48;
    }
    else if (shot === 'finish') { this.camera.position.set(lead + 5, 4.8, narrow ? 29 : 27); this.camera.lookAt(lead, 1.1, 0); this.camera.fov = narrow ? 48 : 38; }
    else { this.camera.position.set(lead - 1.5, 3.2, narrow ? 21 : 18.5); this.camera.lookAt(lead - 2.5, 1.4, 1); this.camera.fov = narrow ? 50 : 33; }
    this.camera.updateProjectionMatrix(); this.canvas.dataset.shot = shot; this.sun.position.set(lead - 20, 45, 25); this.sun.target.position.set(lead, 0, 0); this.renderer.render(this.scene, this.camera);
  }
}
