const designs = [
  ['chevron', '#fff3dc'],
  ['sash', '#f9e5a6'],
  ['diamonds', '#17263d'],
  ['hoops', '#f2ffdf'],
  ['quarters', '#f8da63'],
  ['stripe', '#24202c'],
  ['cross', '#143a61'],
  ['checks', '#491b40'],
];

export function silksFor(horse) {
  const [pattern, accent] = designs[horse.id - 1] ?? designs[0];
  return { primary: horse.color, accent, pattern };
}

// Paint the same racing colors on the 3D jersey and the position strip.
export function paintSilks(ctx, { primary, accent, pattern }, x, y, width, height) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(width, height);
  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = accent;
  switch (pattern) {
    case 'chevron':
      ctx.beginPath();
      ctx.moveTo(0, .26); ctx.lineTo(.5, .48); ctx.lineTo(1, .26);
      ctx.lineTo(1, .47); ctx.lineTo(.5, .69); ctx.lineTo(0, .47);
      ctx.fill();
      break;
    case 'sash':
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(.29, 0); ctx.lineTo(1, 1); ctx.lineTo(.71, 1);
      ctx.fill();
      break;
    case 'diamonds':
      for (const center of [.23, .77]) {
        ctx.beginPath();
        ctx.moveTo(center, .2); ctx.lineTo(center + .23, .5);
        ctx.lineTo(center, .8); ctx.lineTo(center - .23, .5);
        ctx.fill();
      }
      break;
    case 'hoops':
      ctx.fillRect(0, .22, 1, .19);
      ctx.fillRect(0, .58, 1, .19);
      break;
    case 'quarters':
      ctx.fillRect(0, 0, .5, .5);
      ctx.fillRect(.5, .5, .5, .5);
      break;
    case 'stripe':
      ctx.fillRect(.31, 0, .38, 1);
      break;
    case 'cross':
      ctx.fillRect(.39, 0, .22, 1);
      ctx.fillRect(0, .33, 1, .25);
      break;
    case 'checks':
      for (let i = 0; i < 9; i += 2) ctx.fillRect(i % 3 / 3, Math.floor(i / 3) / 3, 1 / 3, 1 / 3);
      break;
  }
  ctx.restore();
}

const emblems = new Map();
export function silkEmblem(horse) {
  const key = horse.id + horse.color;
  if (emblems.has(key)) return emblems.get(key);

  const colors = silksFor(horse);
  const canvas = document.createElement('canvas');
  canvas.width = 72;
  canvas.height = 60;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.moveTo(29, 5); ctx.quadraticCurveTo(36, 12, 43, 5);
  ctx.lineTo(55, 9); ctx.lineTo(69, 40); ctx.lineTo(57, 46);
  ctx.lineTo(51, 28); ctx.lineTo(51, 56); ctx.lineTo(21, 56);
  ctx.lineTo(21, 28); ctx.lineTo(15, 46); ctx.lineTo(3, 40); ctx.lineTo(17, 9);
  ctx.closePath();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = colors.accent;
  ctx.fillRect(0, 0, 72, 60);
  paintSilks(ctx, colors, 21, 0, 30, 60);
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#f5efe18c';
  ctx.stroke();
  const url = canvas.toDataURL();
  emblems.set(key, url);
  return url;
}
