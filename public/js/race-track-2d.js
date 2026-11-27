/** Presentation only: finish times and order always come from the server. */
export class RaceTrack {
  constructor(canvas, onOrder) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.onOrder = onOrder;
    this.horses = []; this.selected = null; this.time = 0; this.running = false;
    this.sprite = new Image(); this.sprite.src = '/assets/racing/gallop.png'; this.sprite.onload = () => this.draw();
    this.background = new Image(); this.background.src = '/assets/racing/grounds.png'; this.background.onload = () => this.draw();
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    this.resize();
  }
  resize() {
    const r = this.canvas.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1, 2);
    this.width = r.width; this.height = r.height; this.canvas.width = Math.round(r.width * ratio); this.canvas.height = Math.round(r.height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0); this.draw();
  }
  setCard(card) { this.stop(); this.result = null; this.photo = null; this.horses = card.horses; this.time = 0; this.draw(); }
  choose(id) { this.selected = id; this.draw(); }
  progress(runner, time) {
    const t = Math.max(0, Math.min(1, time / runner.finishMs));
    // Small smooth pace offsets allow overtakes without backwards motion or a changed arrival.
    return t + Math.sin(Math.PI * t) * runner.pace + Math.sin(2 * Math.PI * t) * runner.surge;
  }
  async play(result, { onProgress, reduced = false } = {}) {
    this.stop(); this.result = result; this.photo = null; this.horses = result.card.horses; this.selected = result.selected;
    this.duration = Math.max(...result.runners.map(r => r.finishMs));
    if (reduced) { this.time = this.duration; this.draw(); onProgress?.(1); return; }
    this.running = true;
    return new Promise(resolve => {
      this.resolve = resolve;
      const start = performance.now();
      const tick = now => {
        const p = Math.min(1, (now - start) / 13000);
        this.time = this.duration * p; this.draw(); onProgress?.(p);
        if (p < 1 && this.running) this.raf = requestAnimationFrame(tick);
        else { this.running = false; this.resolve = null; resolve(); }
      };
      this.raf = requestAnimationFrame(tick);
    });
  }
  stop() { cancelAnimationFrame(this.raf); this.running = false; if (this.resolve) { this.resolve(); this.resolve = null; } }
  finish() { this.stop(); this.photo = null; if (this.result) this.time = Math.max(...this.result.runners.map(r => r.finishMs)); this.draw(); }
  photoFrame(time, horseId) {
    this.time = time;
    this.photo = { horseId };
    this.draw();
  }
  drawBackdrop() {
    const { ctx, width: w, height: h, background } = this;
    if (!background.complete || !background.naturalWidth) return;
    const scale = Math.max(w / background.width, h / background.height);
    const width = background.width * scale, height = background.height * scale;
    ctx.drawImage(background, (w - width) / 2, (h - height) / 2, width, height);
  }
  drawPhotoFinish() {
    const { ctx, width: w, height: h, time, sprite } = this;
    ctx.fillStyle = '#4e6743'; ctx.fillRect(0, 0, w, h);
    this.drawBackdrop();
    const turf = ctx.createLinearGradient(0, h * .38, 0, h * .83);
    turf.addColorStop(0, '#57734600');
    turf.addColorStop(.45, '#617f4e35');
    turf.addColorStop(1, '#3a5837a0');
    ctx.fillStyle = turf; ctx.fillRect(0, h * .38, w, h * .62);
    const lineX = w / 2;
    ctx.fillStyle = '#f4ead0'; ctx.fillRect(lineX - 2, h * .45, 4, h * .44);

    const size = Math.min(w * .36, h * .47), spriteHeight = size * .74;
    const speed = w * .00031;
    let marked;
    for (const [lane, horse] of this.horses.entries()) {
      const runner = this.result.runners.find(runner => runner.id === horse.id);
      const nose = lineX + (time - runner.finishMs) * speed;
      const y = h * (.52 + lane * .032);
      const x = nose - size * .955;
      if (nose < 0 || x > w) continue;
      ctx.fillStyle = '#10291955';
      ctx.beginPath(); ctx.ellipse(x + size * .52, y, size * .32, size * .022, 0, 0, Math.PI * 2); ctx.fill();
      if (sprite.complete && sprite.naturalWidth) {
        const frame = Math.floor(time / 380 + horse.id) % 8;
        const sw = sprite.naturalWidth / 4, sh = sprite.naturalHeight / 2;
        // Crop the atlas padding so the finish stripe is aligned with the muzzle.
        ctx.drawImage(sprite, frame % 4 * sw, (Math.floor(frame / 4) + .24) * sh, sw, sh * .55,
          x, y - spriteHeight, size, spriteHeight);
      }
      if (horse.id === this.photo.horseId || !sprite.naturalWidth) {
        const marker = { horse, x: x + size * .66, y: y - spriteHeight };
        if (horse.id === this.photo.horseId) marked = marker;
        else this.drawPhotoNumber(marker);
      }
    }
    if (marked) this.drawPhotoNumber(marked);
  }
  drawPhotoNumber({ horse, x, y }) {
    const ctx = this.ctx;
    ctx.fillStyle = horse.color; ctx.strokeStyle = '#fff3d6'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(horse.id, x, y);
  }
  draw() {
    const ctx = this.ctx, w = this.width, h = this.height;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    if (this.photo) { this.drawPhotoFinish(); return; }
    this.drawBackdrop();
    ctx.fillStyle = '#14261822'; ctx.fillRect(0, 0, w, h);
    const cx = w * .5, cy = h * .57, rx = w * .43, ry = h * .29, band = h * .105;
    const ellipse = (x, y, color) => { ctx.beginPath(); ctx.ellipse(cx, cy, x, y, 0, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); };
    ellipse(rx + 4, ry + 4, '#ede5cc'); ellipse(rx, ry, '#aa916e');
    ctx.strokeStyle = '#ddc6a04d'; ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.ellipse(cx, cy, rx - i * band / 8, ry - i * band / 8, 0, 0, Math.PI * 2); ctx.stroke(); }
    ellipse(rx - band, ry - band, '#638357');
    ctx.beginPath(); ctx.ellipse(cx, cy, rx - band, ry - band, 0, 0, Math.PI * 2); ctx.strokeStyle = '#e8e1c7'; ctx.lineWidth = 2; ctx.stroke();
    // Finish stripe crosses every lane at the bottom of the oval.
    for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? '#f2e8d2' : '#3f493d'; ctx.fillRect(cx, cy + ry - band + i * band / 10, 4, band / 10); }
    ctx.fillStyle = '#e9e3c9'; ctx.font = `${Math.max(8, w * .012)}px Georgia`; ctx.textAlign = 'center'; ctx.fillText('ROYAL PARK', cx, cy - 3);
    ctx.fillStyle = '#c9d3b7'; ctx.font = `${Math.max(5, w * .006)}px sans-serif`; ctx.fillText('HIPÓDROMO ROYALE', cx, cy + 11);
    const runners = this.horses.map((horse, i) => {
      const runner = this.result?.runners.find(r => r.id === horse.id);
      const p = runner ? this.progress(runner, this.time) : i / 8;
      const lane = (i + .5) * band / 8;
      const theta = Math.PI / 2 - p * Math.PI * 2;
      return { horse, x: cx + (rx - lane) * Math.cos(theta), y: cy + (ry - lane) * Math.sin(theta), face: Math.sin(theta) >= 0 ? 1 : -1, p, finished: runner && this.time >= runner.finishMs };
    });
    const ordered = [...runners].sort((a, b) => {
      if (a.finished && b.finished) return this.result.order.indexOf(a.horse.id) - this.result.order.indexOf(b.horse.id);
      return b.p - a.p;
    });
    this.onOrder?.(ordered.map(r => r.horse.id));
    runners.sort((a, b) => a.y - b.y);
    for (const r of runners) {
      const size = Math.max(34, Math.min(100, w * .105));
      const ph = size * .66;
      ctx.save(); ctx.translate(r.x, r.y);
      ctx.fillStyle = '#152b1c33'; ctx.beginPath(); ctx.ellipse(0, 2, size * .28, 3, 0, 0, Math.PI * 2); ctx.fill();
      if (this.sprite.complete && this.sprite.naturalWidth) {
        const f = this.running && !r.finished ? Math.floor(this.time / 380 + r.horse.id) % 8 : 0;
        const sw = this.sprite.naturalWidth / 4, sh = this.sprite.naturalHeight / 2;
        ctx.save(); ctx.scale(r.face, 1); ctx.drawImage(this.sprite, f % 4 * sw, Math.floor(f / 4) * sh, sw, sh, -size / 2, -ph + 7, size, ph); ctx.restore();
      }
      const badge = Math.max(6, Math.min(10, w * .01));
      ctx.beginPath(); ctx.arc(0, -ph + 5, badge, 0, Math.PI * 2); ctx.fillStyle = r.horse.color; ctx.fill();
      ctx.strokeStyle = r.horse.id === this.selected ? '#f5e2ad' : '#fff8'; ctx.lineWidth = r.horse.id === this.selected ? 2 : .7; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `bold ${badge + 2}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(r.horse.id, 0, -ph + 5); ctx.restore();
    }
  }
}
