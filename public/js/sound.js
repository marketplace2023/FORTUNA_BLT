/** Sonidos sintetizados con Web Audio: sin archivos externos. */
export const Sound = {
  on: true,
  ctx: null,
  koi: false,
  neon: false,
  dragon: false,
  pharaoh: false,
  catrina: false,
  ocean: false,
  samurai: false,
  jaguar: false,
  sweet: false,
  panda: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { this.ctx = null; }
  },
  tone(freq, dur = 0.1, { type = 'sine', vol = 0.06, at = 0, slide = 0 } = {}) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  },
  pluck(freq, at = 0, vol = .035) {
    this.tone(freq, .65, { type: 'sine', vol, at });
    this.tone(freq * 2.005, .22, { type: 'sine', vol: vol * .32, at });
    this.tone(freq * 3, .12, { type: 'triangle', vol: vol * .09, at });
  },
  arp(notes, speed = .08) { notes.forEach((f, i) => { this.tone(f, .15, { type: 'square', vol: .015, at: i * speed }); this.tone(f / 2, .2, { type: 'triangle', vol: .025, at: i * speed }); }); },
  jade(event, mult = 1) {
    if (event === 'spin') { this.tone(82.41, .35, { type: 'triangle', vol: .035, slide: 82 }); this.pluck(329.63, .1, .022); return; }
    if (event === 'stop') { this.tone(98, .18, { type: 'sine', vol: .045, slide: -35 }); return; }
    if (event === 'click') { this.pluck(659.25, 0, .018); return; }
    if (event === 'pop') { this.pluck(493.88, 0, .025); this.pluck(739.99, .055, .018); return; }
    if (event === 'rise') { this.pluck(329.63 * 2 ** (Math.min(mult, 10) / 12), 0, .025); return; }
    const notes = event === 'feature' || event === 'big' ? [164.81, 246.94, 329.63, 369.99, 493.88, 659.25] : event === 'coins' ? [739.99, 987.77] : [329.63, 369.99, 493.88];
    notes.forEach((f, i) => this.pluck(f, i * .13, .03));
  },
  rise(mult) { if (this.dragon) this.jade('rise', mult); },
  solar(event) {
    if (event === 'spin' || event === 'stop') {
      this.tone(event === 'spin' ? 73.42 : 98, .18, { type: 'triangle', vol: .055, slide: -30 });
      if (event === 'spin') this.tone(146.83, .3, { type: 'sine', vol: .025, at: .08 });
      return;
    }
    const notes = event === 'click' ? [587.33] : event === 'pop' ? [293.66, 440] : event === 'feature' || event === 'big' ? [146.83, 155.56, 185, 220, 293.66, 369.99] : event === 'coins' ? [880, 1174.66] : [293.66, 369.99, 440];
    notes.forEach((f, i) => {
      const at = i * .12;
      this.tone(f, .45, { type: 'sine', vol: .035, at });
      this.tone(f * 2.76, .2, { type: 'sine', vol: .009, at });
      this.tone(f * 4.07, .12, { type: 'sine', vol: .004, at });
    });
  },
  fiesta(event, mult = 1) {
    if (event === 'spin' || event === 'stop') { this.tone(event === 'spin' ? 130.81 : 196, .12, { type: 'triangle', vol: .045, slide: -45 }); return; }
    const notes = event === 'click' ? [659.25] : event === 'rise' ? [261.63 * 2 ** (Math.log2(mult) / 6)] : event === 'pop' ? [523.25, 659.25] : event === 'coins' ? [783.99, 1046.5] : event === 'feature' || event === 'big' ? [261.63, 329.63, 392, 523.25, 659.25, 783.99] : [261.63, 329.63, 392, 523.25];
    notes.forEach((f, i) => {
      const at = i * .085;
      this.tone(f, .35, { type: 'triangle', vol: .026, at });
      this.tone(f * 2, .15, { type: 'sine', vol: .009, at });
      if (event === 'feature' || event === 'big') this.tone(f / 2, .3, { type: 'sawtooth', vol: .008, at: at + .02 });
    });
  },
  catrinaRise(mult) { if (this.catrina) this.fiesta('rise', mult); },
  marine(event, step = 0) {
    if (event === 'spin') { this.tone(180, .3, { type: 'sine', vol: .035, slide: 160 }); this.tone(392, .4, { type: 'sine', vol: .012, at: .1 }); return; }
    if (event === 'stop') { this.tone(620, .11, { type: 'sine', vol: .035, slide: -360 }); return; }
    const notes = event === 'click' ? [880] : event === 'step' ? [392 * 2 ** (Math.min(step, 6) / 6)] : event === 'pop' ? [523.25, 783.99] : event === 'feature' || event === 'big' ? [196, 293.66, 392, 587.33, 783.99] : event === 'coins' ? [1046.5, 1174.66] : [392, 523.25, 587.33];
    notes.forEach((f, i) => {
      const at = i * .14;
      this.tone(f, .5, { type: 'sine', vol: .03, at });
      this.tone(f * 2.01, .2, { type: 'sine', vol: .007, at });
    });
  },
  oceanStep(step) { if (this.ocean) this.marine('step', step); },
  noise(dur = .16, vol = .025, cutoff = 1100) {
    if (!this.on || !this.ctx) return;
    const buffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Sound texture only; never used to select game results.
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource(); source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = cutoff; filter.Q.value = .7;
    const gain = this.ctx.createGain(); const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(.0001, t); gain.gain.exponentialRampToValueAtTime(vol, t + .025); gain.gain.exponentialRampToValueAtTime(.0001, t + dur);
    source.connect(filter).connect(gain).connect(this.ctx.destination); source.start(t);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  },
  wind(event, step = 0) {
    if (event === 'spin') { this.noise(.2, .04, 900); this.tone(98, .14, { type: 'triangle', vol: .025, slide: -25 }); return; }
    if (event === 'stop') { this.tone(196, .065, { type: 'triangle', vol: .035, slide: -70 }); return; }
    if (event === 'pop') { this.noise(.12, .035, 1600); return; }
    const notes = event === 'click' ? [587.33] : event === 'step' ? [[293.66, 349.23, 440, 587.33][Math.min(step, 3)]] : event === 'feature' || event === 'big' ? [146.83, 220, 293.66, 349.23, 440, 587.33] : event === 'coins' ? [880, 1174.66] : [293.66, 349.23, 440];
    notes.forEach((f, i) => { this.tone(f, .25, { type: 'triangle', vol: .025, at: i * .08 }); this.tone(f * 2.005, .1, { type: 'sine', vol: .008, at: i * .08 }); });
  },
  samuraiStep(step) { if (this.samurai) this.wind('step', step); },
  jungle(event, step = 0) {
    if (event === 'spin' || event === 'stop') { this.tone(event === 'spin' ? 73.42 : 110, .16, { type: 'triangle', vol: .05, slide: -28 }); if (event === 'spin') this.noise(.14, .018, 1700); return; }
    if (event === 'pop') { this.tone(196, .1, { type: 'triangle', vol: .035 }); this.tone(293.66, .14, { type: 'sine', vol: .02, at: .035 }); return; }
    const ascent = [196, 220, 246.94, 293.66, 329.63, 349.23, 392, 440, 493.88, 587.33];
    const notes = event === 'click' ? [587.33] : event === 'step' ? [ascent[Math.min(step, 9)]] : event === 'feature' || event === 'big' ? [98, 146.83, 196, 293.66, 392, 587.33] : event === 'coins' ? [880, 1174.66] : [196, 293.66, 392];
    notes.forEach((f, i) => { this.tone(f, .3, { type: 'triangle', vol: .027, at: i * .11 }); this.tone(f * 2.02, .13, { type: 'sine', vol: .007, at: i * .11 }); });
  },
  jaguarStep(step) { if (this.jaguar) this.jungle('step', step); },
  bamboo(event) {
    if (event === 'spin') { this.noise(.35, .012, 700); this.tone(146.83, .3, { type: 'sine', vol: .025 }); return; }
    if (event === 'stop') { this.tone(220, .09, { type: 'triangle', vol: .025, slide: -45 }); return; }
    const notes = event === 'click' ? [659.25] : event === 'lock' ? [440, 659.25] : event === 'pop' ? [293.66] : event === 'feature' || event === 'big' ? [220, 293.66, 329.63, 440, 587.33] : [329.63, 440, 587.33];
    notes.forEach((f,i) => this.pluck(f, i * .16, .023));
  },
  confection(event) {
    if (event === 'spin') { this.pluck(523.25, 0, .024); this.pluck(659.25, .065, .022); return; }
    if (event === 'stop') { this.tone(392, .075, { type: 'triangle', vol: .026, slide: -90 }); return; }
    const notes = event === 'click' ? [1046.5] : event === 'pop' ? [783.99, 987.77] : event === 'coins' ? [1318.51, 1567.98] : event === 'feature' || event === 'big' ? [523.25, 659.25, 783.99, 1046.5, 1318.51] : [659.25, 783.99, 1046.5];
    notes.forEach((f, i) => { this.pluck(f, i * .09, .025); this.tone(f * 4.03, .08, { vol: .003, at: i * .09 }); });
  },
  click() { if (this.panda) return this.bamboo('click'); if (this.sweet) return this.confection('click'); if (this.jaguar) return this.jungle('click'); if (this.samurai) return this.wind('click'); if (this.ocean) return this.marine('click'); if (this.catrina) return this.fiesta('click'); if (this.pharaoh) return this.solar('click'); if (this.dragon) return this.jade('click'); if (this.neon) return this.tone(740, .045, { type: 'triangle', vol: .04, slide: -240 }); if (this.koi) return this.pluck(880, 0, .018); this.tone(900, 0.04, { type: 'square', vol: 0.025 }); },
  spin() { if (this.panda) return this.bamboo('spin'); if (this.sweet) return this.confection('spin'); if (this.jaguar) return this.jungle('spin'); if (this.samurai) return this.wind('spin'); if (this.ocean) return this.marine('spin'); if (this.catrina) return this.fiesta('spin'); if (this.pharaoh) return this.solar('spin'); if (this.dragon) return this.jade('spin'); if (this.neon) { this.arp([130.81, 196, 261.63], .045); return; } if (this.koi) { this.pluck(293.66); this.pluck(440, .09, .02); return; } this.tone(260, 0.18, { type: 'triangle', vol: 0.05, slide: 240 }); },
  stop() { if (this.panda) return this.bamboo('stop'); if (this.sweet) return this.confection('stop'); if (this.jaguar) return this.jungle('stop'); if (this.samurai) return this.wind('stop'); if (this.ocean) return this.marine('stop'); if (this.catrina) return this.fiesta('stop'); if (this.pharaoh) return this.solar('stop'); if (this.dragon) return this.jade('stop'); if (this.neon) return this.tone(110, .09, { type: 'triangle', vol: .07, slide: -55 }); if (this.koi) return this.tone(180, .1, { type: 'sine', vol: .035, slide: -70 }); this.tone(160, 0.07, { type: 'square', vol: 0.03 }); },
  pop() { if (this.panda) return this.bamboo('pop'); if (this.sweet) return this.confection('pop'); if (this.jaguar) return this.jungle('pop'); if (this.samurai) return this.wind('pop'); if (this.ocean) return this.marine('pop'); if (this.catrina) return this.fiesta('pop'); if (this.pharaoh) return this.solar('pop'); if (this.dragon) return this.jade('pop'); this.tone(620, 0.12, { type: 'triangle', vol: 0.05, slide: -380 }); },
  lock() { if (this.panda) { this.bamboo('lock'); return; } if (this.koi) { this.pluck(587.33); this.pluck(880, .08); return; } this.tone(980, 0.1, { type: 'sine', vol: 0.05 }); this.tone(1470, 0.12, { vol: 0.04, at: 0.06 }); },
  win(n = 1) { if (this.panda) return this.bamboo('win'); if (this.sweet) return this.confection('win'); if (this.jaguar) return this.jungle('win'); if (this.samurai) return this.wind('win'); if (this.ocean) return this.marine('win'); if (this.catrina) return this.fiesta('win'); if (this.pharaoh) return this.solar('win'); if (this.dragon) return this.jade('win');
    if (this.neon) { this.arp([261.63, 311.13, 392, 523.25], .095); return; }
    if (this.koi) { [440, 587.33, 659.25].slice(0, Math.min(3, 1 + n)).forEach((f, i) => this.pluck(f, i * .12)); return; }
    const notes = [523, 659, 784, 1046];
    for (let i = 0; i < Math.min(4, 1 + n); i++) this.tone(notes[i], 0.16, { type: 'triangle', vol: 0.06, at: i * 0.07 });
  },
  coins() { if (this.panda) return this.bamboo('coins'); if (this.sweet) return this.confection('coins'); if (this.jaguar) return this.jungle('coins'); if (this.samurai) return this.wind('coins'); if (this.ocean) return this.marine('coins'); if (this.catrina) return this.fiesta('coins'); if (this.pharaoh) return this.solar('coins'); if (this.dragon) return this.jade('coins'); if (this.neon) return this.arp([783.99, 1046.5], .07); if (this.koi) { [880, 1174.66, 1318.51].forEach((f, i) => this.pluck(f, i * .09, .018)); return; } for (let i = 0; i < 5; i++) this.tone(1400 + i * 120, 0.06, { type: 'square', vol: 0.02, at: i * 0.05 }); },
  feature() { if (this.panda) return this.bamboo('feature'); if (this.sweet) return this.confection('feature'); if (this.jaguar) return this.jungle('feature'); if (this.samurai) return this.wind('feature'); if (this.ocean) return this.marine('feature'); if (this.catrina) return this.fiesta('feature'); if (this.pharaoh) return this.solar('feature'); if (this.dragon) return this.jade('feature'); if (this.neon) { this.tone(80, .6, { type: 'sawtooth', vol: .025, slide: 480 }); this.arp([261.63, 392, 523.25, 783.99], .12); return; } if (this.koi) { [293.66, 440, 587.33, 659.25, 880].forEach((f, i) => this.pluck(f, i * .14)); return; } [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, { type: 'sawtooth', vol: 0.035, at: i * 0.08 })); },
  big() { if (this.panda) return this.bamboo('big'); if (this.sweet) return this.confection('big'); if (this.jaguar) return this.jungle('big'); if (this.samurai) return this.wind('big'); if (this.ocean) return this.marine('big'); if (this.catrina) return this.fiesta('big'); if (this.pharaoh) return this.solar('big'); if (this.dragon) return this.jade('big'); if (this.neon) return this.arp([261.63, 311.13, 392, 523.25, 622.25, 783.99, 1046.5], .16); if (this.koi) { [293.66, 440, 587.33, 659.25, 880, 1174.66].forEach((f, i) => this.pluck(f, i * .18, .045)); return; } [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.07, at: i * 0.11 })); },
};
