import { RaceTrack3D } from './race-track-3d.js';
import { RaceTrack as CanvasTrack } from './race-track-2d.js';
export class RaceTrack {
  constructor(canvas, onOrder) {
    this.canvas = canvas; this.onOrder = onOrder;
    try {
      this.impl = new RaceTrack3D(canvas, onOrder);
      this.ready = this.impl.ready.catch(() => this.fallback());
      canvas.addEventListener('webglcontextlost', () => { this.fallback(); if(this.result) this.impl.play(this.result, {reduced:true}); });
    } catch { this.fallback(); this.ready = Promise.resolve(); }
  }
  fallback() {
    this.impl?.stop(); this.impl?.observer?.disconnect(); this.impl?.renderer?.dispose();
    const replacement = this.canvas.cloneNode(false); this.canvas.replaceWith(replacement); this.canvas = replacement;
    replacement.dataset.renderer = 'canvas'; delete replacement.dataset.horses;
    this.impl = new CanvasTrack(replacement, this.onOrder);
    if(this.card) this.impl.setCard(this.card); this.impl.choose(this.selected);
    document.querySelectorAll('[data-camera], #cinema').forEach(b=>b.hidden=true);
  }
  setCard(card) { this.card=card; this.result=null; this.impl.setCard(card); }
  choose(id) { this.selected=id; this.impl.choose(id); }
  setCamera(mode) { this.impl.setCamera?.(mode); }
  async play(result, options) { this.result=result; await this.ready; return this.impl.play(result, options); }
  stop() { this.impl.stop(); }
  finish() { this.impl.finish(); }
}
