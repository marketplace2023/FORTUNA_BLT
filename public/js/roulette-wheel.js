const TAU = Math.PI * 2;
const TOP = -Math.PI / 2;
const CENTER = 300;
const PALETTE = {
  red: ['#d45d52', '#682026'],
  black: ['#3a4b4c', '#102026'],
  green: ['#62b389', '#174b3c'],
};

export function createWheel(canvas, { wheel, colors }) {
  const ctx = canvas.getContext('2d');
  const step = TAU / wheel.length;
  let angle = 0;
  let savedBall;
  let marked = new Map();
  let landed = null;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mod = (n) => (n % TAU + TAU) % TAU;

  function gradient(stops, x = 0, y = 0, r = 292) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    stops.forEach(([p, color]) => g.addColorStop(p, color));
    return g;
  }
  function disc(radius, fill, stroke, width = 1) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }
  function sector(start, end, inner, outer, fill, stroke) {
    ctx.beginPath();
    ctx.arc(0, 0, outer, start, end);
    ctx.arc(0, 0, inner, end, start, true);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function draw(ball = savedBall) {
    ctx.setTransform(canvas.width / 600, 0, 0, canvas.height / 600, 0, 0);
    ctx.clearRect(0, 0, 600, 600);
    ctx.translate(CENTER, CENTER);
    disc(292, gradient([[.85, '#1b2020'], [.93, '#412b22'], [.97, '#eac27c'], [1, '#56361f']]), '#f1cf8a', 1.4);
    disc(280, null, '#271811', 3);
    disc(275, gradient([[.82, '#081216'], [.94, '#284044'], [.98, '#0d1719'], [1, '#6f694d']]), '#ffda96');
    disc(256, null, '#e2b06a65', 2);
    disc(243, null, '#a47d43');
    for (let i = 0; i < 12; i++) {
      ctx.save();
      ctx.rotate(i * TAU / 12);
      ctx.fillStyle = '#c99852';
      ctx.beginPath();
      ctx.moveTo(264, 0); ctx.lineTo(269, -4); ctx.lineTo(273, 0); ctx.lineTo(269, 4);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.rotate(angle);
    wheel.forEach((n, i) => {
      const mid = TOP + i * step;
      const [bright, dark] = PALETTE[colors[n]];
      const fill = marked.has(n) ? '#a66823' : bright;
      sector(mid - step / 2, mid + step / 2, 178, 238, gradient([[.61, dark], [.74, fill], [.84, dark]], 0, 0, 280), '#f0c580a8');
      if (n === landed) sector(mid - step / 2 + .014, mid + step / 2 - .014, 178, 238, '#ffe1a196', '#fff0c1');
      ctx.save();
      ctx.rotate(mid + Math.PI / 2);
      ctx.fillStyle = n === landed ? '#281303' : '#fff6e1';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 21px system-ui';
      ctx.fillText(n, 0, -221);
      if (marked.has(n)) {
        ctx.font = '700 10px system-ui';
        ctx.fillText(`×${marked.get(n)}`, 0, -187);
      }
      ctx.restore();
    });
    disc(239, null, '#ecc688', 3);
    disc(177, gradient([[0, '#427171'], [.62, '#193a3f'], [.92, '#0a1b20'], [1, '#516264']], 0, 0, 177), '#eac182', 3);
    for (let i = 0; i < 24; i++) {
      const mid = i * TAU / 24;
      sector(mid - .04, mid + .04, 130, 164, i % 2 ? '#cf9b54' : '#6a533a', '#745736');
    }
    disc(148, null, '#e1ab576e');
    disc(126, null, '#c99751');
    ctx.restore();

    disc(102, gradient([[0, '#264347'], [.76, '#0a181d'], [1, '#254247']], 0, 0, 102), '#c39352', 2);
    disc(77, gradient([[.52, '#2d1c17'], [.75, '#aa602f'], [.9, '#ffd57d'], [1, '#6c3b21']], -10, -12, 93), '#be8a44', 2);
    disc(61, gradient([[0, '#142c32'], [.85, '#0b191f'], [1, '#030b0d']], 0, 0, 61), '#f1b75f', 2);
    disc(16, gradient([[0, '#fff1b4'], [.57, '#c28b47'], [1, '#563624']], -5, -4, 20), '#edc379');

    if (ball) {
      const x = Math.cos(ball.angle) * ball.radius;
      const y = Math.sin(ball.angle) * ball.radius;
      ctx.save(); ctx.translate(x, y);
      ctx.shadowColor = '#000'; ctx.shadowBlur = 7;
      disc(7.8, gradient([[0, '#fff'], [.5, '#fff1d2'], [1, '#948b75']], -2, -2, 10), '#fff8dd');
      ctx.restore();
    }
  }

  function resize() {
    const pixels = Math.max(1, Math.ceil(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2)));
    canvas.width = pixels;
    canvas.height = pixels;
    draw();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  return {
    async spin({ number, boosts }) {
      const initial = angle;
      const target = mod(-wheel.indexOf(number) * step);
      const travel = 3 * TAU + mod(target - initial);
      marked = new Map(boosts.map((b) => [b.number, b.mult]));
      landed = null;
      const duration = reduced.matches || document.hidden ? 0 : 2700;
      if (duration) {
        const start = performance.now();
        await new Promise((resolve) => {
          const frame = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const wheelEase = 1 - (1 - t) ** 3;
            const ballEase = 1 - (1 - t) ** 2.2;
            angle = initial + travel * wheelEase;
            savedBall = { angle: TOP - 6 * TAU * ballEase, radius: 258 - 56 * Math.max(0, (t - .72) / .28) ** 1.25 };
            if (t < 1) { draw(); requestAnimationFrame(frame); }
            else resolve();
          };
          requestAnimationFrame(frame);
        });
      }
      landed = number;
      angle = target;
      savedBall = { angle: TOP, radius: 201 };
      draw();
    },
  };
}
