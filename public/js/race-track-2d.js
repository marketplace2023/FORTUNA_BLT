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
  setCard(card) { this.stop(); this.result = null; this.horses = card.horses; this.time = 0; this.draw(); }
  choose(id) { this.selected = id; this.draw(); }
  progress(runner, time) {
    const t = Math.max(0, Math.min(1, time / runner.finishMs));
    // Small smooth pace offsets allow overtakes without backwards motion or a changed arrival.
    return t + Math.sin(Math.PI * t) * runner.pace + Math.sin(2 * Math.PI * t) * runner.surge;
  }
  async play(result, { onProgress, reduced = false } = {}) {
    this.stop(); this.result = result; this.horses = result.card.horses; this.selected = result.selected;
    this.duration = Math.max(...result.runners.map(r => r.finishMs));
    if (reduced) { this.time = this.duration; this.draw(); onProgress?.(1); return; }
    this.running = true;
    return new Promise(resolve => {
      this.resolve = resolve;
      const start = performance.now();
      const tick = now => {
        const p = Math.min(1, (now - start) / 14000);
        this.time = this.duration * p; this.draw(); onProgress?.(p);
        if (p < 1 && this.running) this.raf = requestAnimationFrame(tick);
        else { this.running = false; this.resolve = null; resolve(); }
      };
      this.raf = requestAnimationFrame(tick);
    });
  }
  stop() { cancelAnimationFrame(this.raf); this.running = false; if (this.resolve) { this.resolve(); this.resolve = null; } }
  finish() { this.stop(); if (this.result) this.time = Math.max(...this.result.runners.map(r => r.finishMs)); this.draw(); }
  draw() {
    const ctx = this.ctx, w = this.width, h = this.height;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    if (this.background.complete && this.background.naturalWidth) {
      const scale = Math.max(w / this.background.width, h / this.background.height);
      ctx.drawImage(this.background, (w - this.background.width * scale) / 2, (h - this.background.height * scale) / 2, this.background.width * scale, this.background.height * scale);
    }
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
