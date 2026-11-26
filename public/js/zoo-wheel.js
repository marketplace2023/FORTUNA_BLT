const TAU = Math.PI * 2;
const mod = n => (n % TAU + TAU) % TAU;
export class ZooWheel {
  constructor(canvas, onTick) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.onTick = onTick; this.angle = 0; this.cache = document.createElement('canvas'); this.order = []; this.images = [];
    this.ready = Promise.all(['a','b'].map(letter => new Promise((resolve,reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(Error('No se pudo cargar el arte de los animales. Recarga la página.')); image.src = `/assets/zoo/animals-${letter}-v2.png`; }))).then(images => { this.images = images; this.resize(); });
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas.parentElement);
  }
  setOrder(order) { this.order = order; this.resize(); }
  resize() { const size = Math.max(1,Math.round(this.canvas.getBoundingClientRect().width * Math.min(devicePixelRatio || 1,2))); this.canvas.width = this.canvas.height = size; this.cache.width = this.cache.height = size; this.paint(); this.draw(); }
  paint() {
    if (!this.order.length) return;
    const c = this.cache.getContext('2d'), s = this.cache.width, r = s*.485, cx = s/2, step = TAU/40;
    c.clearRect(0,0,s,s); c.save(); c.translate(cx,cx);
    const rim = c.createRadialGradient(0,-r*.2,r*.55,0,0,r); rim.addColorStop(0,'#a37128');rim.addColorStop(.88,'#f0c774');rim.addColorStop(.94,'#755526');rim.addColorStop(.975,'#ffe4a2');rim.addColorStop(1,'#88642c');
    c.beginPath();c.arc(0,0,r,0,TAU);c.fillStyle=rim;c.fill();
    for (let i=0;i<40;i++) {
      const start=-Math.PI/2+i*step, end=start+step, center=start+step/2;
      c.beginPath();c.arc(0,0,r*.956,start,end);c.arc(0,0,r*.445,end,start,true);c.closePath();
      c.fillStyle=i%2?'#124a34':'#b9442b';c.fill();c.strokeStyle='#dbb66b';c.lineWidth=Math.max(1,s/900);c.stroke();
      c.save();c.clip();c.rotate(center+Math.PI/2);c.fillStyle='#fff3d7';c.font=`700 ${s*.027}px Arial`;c.textAlign='center';c.textBaseline='middle';c.fillText(String(this.order[i]).padStart(2,'0'),0,-r*.884);
      const id=this.order[i]-1, image=this.images[Math.floor(id/20)], local=id%20;
      if(image){const width=s*.064,height=width*.9,cw=image.naturalWidth/5,ch=image.naturalHeight/4;c.drawImage(image,local%5*cw+cw*.07,Math.floor(local/5)*ch+ch*.04,cw*.86,ch*.92,-width/2,-r*.716-height/2,width,height);}
      c.restore();
      c.beginPath();c.arc(Math.cos(center)*r*.986,Math.sin(center)*r*.986,s*.0022,0,TAU);c.fillStyle='#fff2c0';c.fill();
    }
    c.beginPath();c.arc(0,0,r*.455,0,TAU);c.fillStyle='#174d30';c.fill();c.strokeStyle='#e8c67c';c.lineWidth=s*.006;c.stroke();c.restore();
  }
  draw() { const s=this.canvas.width;this.ctx.clearRect(0,0,s,s);this.ctx.save();this.ctx.translate(s/2,s/2);this.ctx.rotate(this.angle);this.ctx.drawImage(this.cache,-s/2,-s/2);this.ctx.restore();if(this.order.length)this.canvas.dataset.pocket=String(this.order[Math.floor(mod(-this.angle)/(TAU/40))%40]); }
  async spin(number,{reduced=false}={}) {
    await this.ready;this.finish();const index=this.order.indexOf(number);if(index<0)throw Error('Animal fuera de la rueda');
    const landing=mod(-(index+.5)*TAU/40), from=this.angle;this.target=from+7*TAU+mod(landing-from);
    if(reduced){this.angle=this.target;this.draw();this.target=null;return;}
    return new Promise(resolve=>{this.resolve=resolve;const start=performance.now();let lastTick=-1;const tick=now=>{const t=Math.min(1,(now-start)/7800), ease=1-(1-t)**5;this.angle=from+(this.target-from)*ease;this.draw();const pocket=this.canvas.dataset.pocket;if(pocket!==lastTick){lastTick=pocket;this.onTick?.();}if(t<1)this.raf=requestAnimationFrame(tick);else{this.angle=this.target;this.target=null;this.resolve=null;this.draw();resolve();}};this.raf=requestAnimationFrame(tick);});
  }
  finish() { cancelAnimationFrame(this.raf);if(this.target!==null&&this.target!==undefined){this.angle=this.target;this.target=null;this.draw();}if(this.resolve){this.resolve();this.resolve=null;} }
}
