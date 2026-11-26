import * as T from '/vendor/three/three.module.js';
import { GLTFLoader } from '/vendor/three/GLTFLoader.js';
import { clone } from '/vendor/three/SkeletonUtils.js';
import { mergeVertices } from '/vendor/three/BufferGeometryUtils.js';

const Y = new T.Vector3(0, 1, 0), coats = [0x5c2b16, 0xb0a79a, 0x201b18, 0x6b3219, 0x97603c, 0x3b2117, 0xd5cbbb, 0x51301b];
const mat = (color, roughness = .8) => new T.MeshStandardMaterial({ color, roughness, metalness: 0 });
const white = mat(0xe9e6d5, .55), dark = mat(0x282b26), leather = mat(0x281b13, .65);
function mesh(g, m, parent, x = 0, y = 0, z = 0) { const o = new T.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; }
function box(parent, size, position, m) { return mesh(new T.BoxGeometry(...size), m, parent, ...position); }
function ball(parent, size, position, m) { const o = mesh(new T.SphereGeometry(1, 20, 14), m, parent, ...position); o.scale.set(...size); return o; }
function limb(parent, a, b, radius, m) {
  const start = new T.Vector3(...a), end = new T.Vector3(...b), direction = end.clone().sub(start);
  const o = mesh(new T.CapsuleGeometry(radius, Math.max(.001, direction.length() - radius * 2), 4, 10), m, parent);
  o.position.copy(start.add(end).multiplyScalar(.5)); o.quaternion.setFromUnitVectors(Y, direction.normalize()); return o;
}
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
    this.canvas = canvas; this.onOrder = onOrder; this.horses = []; this.actors = []; this.time = 0; this.visualSeconds = 0; this.selected = null; this.running = false; this.cameraMode = 'auto';
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
    const finish = new T.Group(); finish.position.x = 80; this.scene.add(finish);
    for (const z of [-13.2, 13.2]) { box(finish, [.45, 5, .45], [0, 2.5, z], white); box(finish, [.5, .65, .5], [0, 4.6, z], mat(0x294c35)); }
    box(finish, [.4, .25, 27], [0, 5, 0], white);
    const banner = new T.MeshBasicMaterial({ map: label('META', '#eee9d8', '#20412e'), side: T.DoubleSide });
    mesh(new T.PlaneGeometry(3.5, 1.2), banner, finish, 0, 4.2, 13.2).rotation.y = Math.PI / 2;
    mesh(new T.PlaneGeometry(.14, 26), mat(0xf1ead0), this.scene, 80, .025, 0).rotation.x = -Math.PI / 2;
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
    this.template.traverse(n => { if (n.isMesh) { const g = n.geometry.clone(); g.deleteAttribute('normal'); n.geometry = mergeVertices(g, .0001); n.geometry.computeVertexNormals(); } });
    const bounds = new T.Box3().setFromObject(this.template), size = bounds.getSize(new T.Vector3());
    this.modelScale = 2.7 / Math.max(size.x, size.z); this.modelFloor = bounds.min.y * this.modelScale;
    this.gallop = gltf.animations.find(a => /Gallop$/.test(a.name));
    const head = this.template.getObjectByName('Head')?.getWorldPosition(new T.Vector3());
    this.modelAngle = head && Math.abs(head.x) > Math.abs(head.z) ? (head.x >= 0 ? 0 : Math.PI) : head && head.z < 0 ? -Math.PI / 2 : Math.PI / 2;
  }
  buildHorses() {
    if (!this.template) return;
    for (const a of this.actors) { a.mixer.stopAllAction(); a.mixer.uncacheRoot(a.model); a.root.traverse(n => {
      if (n.isMesh && !n.isSkinnedMesh) n.geometry.dispose();
      for (const m of [n.material].flat().filter(Boolean)) if (![white, dark, leather].includes(m)) { m.map?.dispose(); m.dispose(); }
    }); }
    this.trackGroup.clear(); this.actors = [];
    this.horses.forEach((horse, index) => {
      const root = new T.Group(); this.trackGroup.add(root); const model = clone(this.template); model.scale.setScalar(this.modelScale); model.rotation.y = this.modelAngle; model.position.y = -this.modelFloor;
      model.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; n.frustumCulled = false;
        const adjust = old => { const m = old.clone(); m.metalness = 0; m.roughness = .6; m.flatShading = false; if (/Main|Body/i.test(old.name)) m.color.setHex(coats[index]); return m; };
        n.material = Array.isArray(n.material) ? n.material.map(adjust) : adjust(n.material);
      } }); root.add(model); const rider = this.rider(horse); root.add(rider);
      const mixer = new T.AnimationMixer(model), action = mixer.clipAction(this.gallop); action.play();
      const icon = new T.Sprite(new T.SpriteMaterial({ map: label(String(horse.id), horse.color), depthTest: false })); icon.scale.set(.55, .28, 1); icon.position.set(.1, 3.1, 0); icon.renderOrder = 10; root.add(icon);
      this.actors.push({ root, model, rider, mixer, action, icon, horse, index });
    }); this.canvas.dataset.horses = String(this.actors.length); this.draw();
  }
  rider(horse) {
    const r = new T.Group(), silk = mat(horse.color, .4), skin = mat(0xc88f67, .7), boots = mat(0x1a201a, .45);
    limb(r, [-.25, 1.73, 0], [.30, 2.13, 0], .18, silk); ball(r, [.13, .16, .13], [.43, 2.23, 0], skin); ball(r, [.16, .12, .16], [.42, 2.36, 0], silk); box(r, [.18, .025, .31], [.53, 2.31, 0], dark);
    for (const s of [-1, 1]) {
      limb(r, [-.25, 1.73, s * .12], [.18, 1.22, s * .40], .10, white); limb(r, [.18, 1.22, s * .40], [-.18, .99, s * .43], .075, boots); ball(r, [.15, .07, .07], [-.10, .96, s * .43], boots);
      limb(r, [.25, 2.10, s * .15], [.55, 1.84, s * .25], .065, silk); limb(r, [.55, 1.84, s * .25], [.85, 1.76, s * .18], .05, skin);
      const rein = new T.CatmullRomCurve3([new T.Vector3(.85, 1.76, s * .18), new T.Vector3(1.12, 1.65, s * .15), new T.Vector3(1.40, 1.62, s * .13)]);
      mesh(new T.TubeGeometry(rein, 12, .008, 4, false), leather, r);
      const cloth = mesh(new T.PlaneGeometry(.72, .43), new T.MeshStandardMaterial({ map: label(String(horse.id), horse.color), roughness: .85, side: T.DoubleSide }), r, -.20, 1.35, s * .39); if (s < 0) cloth.rotation.y = Math.PI;
    } ball(r, [.45, .10, .32], [-.20, 1.60, 0], leather); return r;
  }
  resize() { const r = this.canvas.getBoundingClientRect(); if (!r.width || !r.height) return; this.renderer.setSize(r.width, r.height, false); this.camera.aspect = r.width / r.height; this.camera.updateProjectionMatrix(); this.draw(); }
  setCard(card) { this.stop(); this.result = null; this.time = 0; this.visualSeconds = 0; this.horses = card.horses; this.buildHorses(); this.draw(); }
  choose(id) { this.selected = id; this.draw(); }
  setCamera(mode) { this.cameraMode = ['auto', 'side', 'front', 'finish'].includes(mode) ? mode : 'auto'; this.draw(); }
  progress(runner, time) { const t = Math.max(0, Math.min(1, time / runner.finishMs)); return t + Math.sin(Math.PI * t) * runner.pace + Math.sin(2 * Math.PI * t) * runner.surge; }
  async play(result, { onProgress, reduced = false } = {}) {
    this.stop(); await this.ready; this.result = result; this.horses = result.card.horses; this.selected = result.selected; this.time = 0; this.visualSeconds = 0; this.duration = Math.max(...result.runners.map(r => r.finishMs));
    if (reduced) { this.time = this.duration; this.draw(); onProgress?.(1); return; }
    this.running = true;
    return new Promise(resolve => { this.resolve = resolve; const start = performance.now(); const tick = now => {
      const p = Math.min(1, (now - start) / 24000); this.time = this.duration * p; this.visualSeconds = (now - start) / 1000; this.draw(); onProgress?.(p);
      if (p < 1 && this.running) this.raf = requestAnimationFrame(tick); else { this.running = false; this.resolve = null; resolve(); }
    }; this.raf = requestAnimationFrame(tick); });
  }
  stop() { cancelAnimationFrame(this.raf); this.running = false; if (this.resolve) { this.resolve(); this.resolve = null; } }
  finish() { this.stop(); if (this.result) this.time = Math.max(...this.result.runners.map(r => r.finishMs)); this.draw(); }
  draw() {
    if (!this.renderer || !this.camera) return;
    const states = this.horses.map((horse, index) => {
      const runner = this.result?.runners.find(r => r.id === horse.id), p = runner ? this.progress(runner, this.time) : 0;
      const after = runner ? Math.max(0, (this.time - runner.finishMs) / this.duration) * 160 : 0;
      const gathering = this.result ? 1 - .48 * Math.min(1, p / .18) : 1;
      const x = !this.result && horse.id === this.selected ? -65 : -80 + p * 160 + after;
      return { horse, index, p, x, z: (-8.4 + index * 2.4) * gathering, finished: runner && this.time >= runner.finishMs };
    });
    const ordered = [...states].sort((a, b) => a.finished && b.finished ? this.result.order.indexOf(a.horse.id) - this.result.order.indexOf(b.horse.id) : b.p - a.p); this.onOrder?.(ordered.map(r => r.horse.id));
    for (const s of states) { const a = this.actors[s.index]; if (!a) continue; a.root.position.set(s.x, 0, s.z); a.mixer.setTime(this.visualSeconds * 1.25 + s.index * .14); a.rider.position.y = this.running ? Math.sin(this.visualSeconds * 13 + s.index * .9) * .028 : 0; a.icon.visible = s.horse.id === this.selected || this.cameraMode === 'front'; }
    const lead = ordered[0]?.x || -80, phase = this.result ? this.time / this.duration : 0; let shot = this.cameraMode;
    if (shot === 'auto') shot = !this.result ? 'paddock' : phase < .16 ? 'start' : phase < .43 ? 'side' : phase < .62 ? 'front' : phase < .86 ? 'side' : 'finish';
    const narrow = this.camera.aspect < 1.5;
    if (shot === 'paddock' && this.selected) { const chosen = states.find(s => s.horse.id === this.selected); this.camera.position.set(chosen.x + 4.8, 2.8, chosen.z + 8); this.camera.lookAt(chosen.x + .1, 1.4, chosen.z); this.camera.fov = narrow ? 47 : 34; }
    else if (shot === 'paddock' || shot === 'start') { this.camera.position.set(lead + 12, narrow ? 5.5 : 4.8, narrow ? 22 : 20); this.camera.lookAt(lead - .3, 1.4, 0); this.camera.fov = narrow ? 49 : 42; }
    else if (shot === 'front') { this.camera.position.set(lead + (this.result ? 21 : 29), 3.4, 3); this.camera.lookAt(lead - 2, 1.3, 0); this.camera.fov = narrow ? 48 : 34; }
    else if (shot === 'finish') { const focus = this.result && phase > .83 ? 79 : lead; this.camera.position.set(focus + 5, 4.8, narrow ? 29 : 27); this.camera.lookAt(focus, 1.1, 0); this.camera.fov = narrow ? 48 : 38; }
    else { this.camera.position.set(lead - 1.5, 2.9, 21); this.camera.lookAt(lead - 2.5, 1.4, 1); this.camera.fov = narrow ? 50 : 34; }
    this.camera.updateProjectionMatrix(); this.canvas.dataset.shot = shot; this.sun.position.set(lead - 20, 45, 25); this.sun.target.position.set(lead, 0, 0); this.renderer.render(this.scene, this.camera);
  }
}
