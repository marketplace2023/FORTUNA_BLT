import * as T from '/vendor/three/three.module.js';
import { mergeGeometries } from '/vendor/three/BufferGeometryUtils.js';
import { paintSilks, silksFor } from './racing-silks.js';

const lateral = new T.Vector3(0, 0, 1);
const hand = new T.Vector3(.78, 1.79, .21);
const reinSteps = 8;

function surface(rows, columns, point) {
  const vertices = [], uv = [], indices = [];
  for (let row = 0; row <= rows; row++) {
    for (let column = 0; column <= columns; column++) {
      const u = column / columns, v = row / rows;
      vertices.push(...point(u, v));
      uv.push(u, v);
      if (row === rows || column === columns) continue;
      const i = row * (columns + 1) + column, next = i + columns + 1;
      indices.push(i, next, i + 1, i + 1, next, next + 1);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Elliptical sections follow the cut of the garment around the shoulders and joints.
function garment(sections) {
  const spine = new T.CatmullRomCurve3(sections.map(([x, y, z]) => new T.Vector3(x, y, z)));
  const crossSections = new T.CatmullRomCurve3(sections.map(([, , , width, depth], i) => new T.Vector3(width, depth, i)));
  return surface(sections.length * 3, 24, (u, v) => {
    const angle = u * Math.PI * 2 - Math.PI / 2;
    const { x: width, y: depth } = crossSections.getPoint(v);
    const tangent = spine.getTangent(v);
    const normal = new T.Vector3().crossVectors(lateral, tangent).normalize();
    const across = new T.Vector3().crossVectors(tangent, normal).normalize();
    return spine.getPoint(v)
      .addScaledVector(across, Math.cos(angle) * Math.max(.001, width))
      .addScaledVector(normal, Math.sin(angle) * Math.max(.001, depth));
  });
}

function fabric(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function curvedTube(points, radius) {
  return new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p))), points.length * 3, radius, 6);
}

function createJockey(horse) {
  const { primary, accent, pattern } = silksFor(horse);
  const cloth = new T.MeshPhysicalMaterial({
    map: fabric(256, 192, ctx => {
      paintSilks(ctx, { primary, accent, pattern }, 0, 0, 128, 192);
      paintSilks(ctx, { primary, accent, pattern }, 128, 0, 128, 192);
      ctx.fillStyle = '#17192324';
      ctx.fillRect(0, 175, 256, 17);
      ctx.fillStyle = '#fff2da26';
      for (let x = 0; x < 256; x += 128) ctx.fillRect(x, 0, 2, 192);
    }),
    roughness: .57, sheen: .45, sheenRoughness: .65,
  });
  const material = (color, roughness = .68) => new T.MeshStandardMaterial({ color, roughness });
  const sleeve = material(accent, .58), trim = material(primary, .56), breeches = material(0xe8e5d9);
  const helmet = material(primary, .34), skin = material(0xbb835f), leather = material(0x291e1a, .53);
  const boots = material(0x1c2226, .42), lens = material(0x213645, .22), steel = material(0xa3a9ac, .42);
  const clothNumber = new T.MeshStandardMaterial({
    map: fabric(192, 128, ctx => {
      ctx.fillStyle = primary;
      ctx.fillRect(0, 0, 192, 128);
      ctx.strokeStyle = '#222127';
      ctx.lineWidth = 9;
      ctx.strokeRect(4, 4, 184, 120);
      ctx.strokeStyle = '#fff0d0';
      ctx.lineWidth = 2;
      ctx.strokeRect(9, 9, 174, 110);
      ctx.font = '900 100px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#16191e';
      ctx.lineWidth = 10;
      ctx.strokeText(horse.id, 96, 70);
      ctx.fillStyle = '#fff8ec';
      ctx.fillText(horse.id, 96, 70);
    }),
    roughness: .78, side: T.DoubleSide,
  });

  const rider = new T.Group(), parts = new Map();
  function add(m, geometry) {
    if (!parts.has(m)) parts.set(m, []);
    parts.get(m).push(geometry);
  }
  function oval(m, [x, y, z], [a, b, c], tilt = 0) {
    add(m, new T.SphereGeometry(1, 16, 12).scale(a, b, c).rotateZ(tilt).translate(x, y, z));
  }

  // A short racing seat, bent knees and low hands keep the body over the withers.
  add(cloth, garment([
    [-.39, 1.70, 0, .07, .06], [-.28, 1.79, 0, .16, .13],
    [-.10, 1.91, 0, .18, .14], [.11, 2.00, 0, .20, .135],
    [.29, 2.01, 0, .185, .12], [.42, 2.01, 0, .09, .075],
  ]));
  oval(breeches, [-.36, 1.71, 0], [.20, .13, .19], .18);
  oval(skin, [.43, 2.06, 0], [.13, .09, .08], .28);
  oval(skin, [.55, 2.10, 0], [.117, .132, .101], -.20);
  oval(skin, [.60, 2.046, 0], [.097, .075, .079], -.24);
  oval(skin, [.666, 2.086, 0], [.040, .035, .036], -.38);
  oval(helmet, [.527, 2.184, 0], [.147, .113, .125], -.14);
  oval(boots, [.607, 2.163, 0], [.144, .020, .116], -.16);
  oval(sleeve, [.519, 2.266, 0], [.089, .026, .034], -.22);
  oval(boots, [.551, 2.139, 0], [.128, .024, .109], -.14);
  oval(leather, [-.21, 1.614, 0], [.34, .066, .235], .04);
  oval(leather, [-.42, 1.645, 0], [.13, .046, .17], -.10);

  // The girth crosses the front of the saddlecloth and wraps under the barrel.
  const girthProfile = [
    [.06, 1.63, .16], [.10, 1.49, .295], [.12, 1.31, .32],
    [.14, 1.13, .284], [.16, .985, .189], [.16, .935, 0],
  ];
  const girth = new T.CatmullRomCurve3([
    ...girthProfile.map(([x, y, z]) => new T.Vector3(x, y, z)),
    ...girthProfile.slice(0, -1).reverse().map(([x, y, z]) => new T.Vector3(x, y, -z)),
  ]);
  const girthLeather = new T.MeshStandardMaterial({ color: 0x241f1c, roughness: .75, side: T.DoubleSide });
  add(girthLeather, surface(32, 2, (u, v) => {
    const point = girth.getPoint(v);
    point.x += (u - .5) * .084;
    return point;
  }));

  for (const side of [-1, 1]) {
    const z = value => side * value;
    oval(skin, [.516, 2.09, z(.094)], [.035, .050, .021], -.17);
    oval(lens, [.615, 2.129, z(.085)], [.069, .032, .027], -.14);
    add(boots, curvedTube([[.48, 2.151, z(.098)], [.509, 2.079, z(.103)], [.578, 2.012, z(.059)]], .008));

    add(sleeve, garment([
      [.22, 2.014, z(.129), .062, .067], [.30, 1.984, z(.193), .088, .095],
      [.405, 1.873, z(.243), .074, .073], [.478, 1.783, z(.267), .061, .061],
      [.568, 1.766, z(.247), .058, .057], [.712, 1.786, z(.213), .044, .038],
    ]));
    oval(trim, [.709, 1.786, z(.217)], [.050, .046, .050], .10);
    oval(boots, [hand.x, hand.y, z(hand.z)], [.065, .041, .044], .11);
    add(breeches, garment([
      [-.40, 1.714, z(.085), .08, .08], [-.29, 1.626, z(.197), .106, .106],
      [-.115, 1.498, z(.30), .105, .108], [.083, 1.359, z(.349), .084, .089],
      [.078, 1.293, z(.371), .071, .073], [.047, 1.244, z(.38), .065, .066],
    ]));
    add(boots, garment([
      [.059, 1.27, z(.381), .067, .074], [.035, 1.208, z(.399), .069, .069],
      [-.032, 1.103, z(.421), .060, .062], [-.096, .997, z(.430), .049, .050],
      [-.097, .960, z(.432), .047, .044],
    ]));
    oval(boots, [-.049, .957, z(.432)], [.114, .045, .057], .08);
    add(leather, curvedTube([[-.23, 1.562, z(.224)], [-.155, 1.327, z(.337)], [-.09, 1.109, z(.374)], [-.054, 1.015, z(.392)]], .015));
    add(steel, curvedTube([[-.057, 1.032, z(.406)], [-.041, .989, z(.487)], [-.031, .927, z(.465)], [-.031, .925, z(.392)]], .012));
    add(clothNumber, surface(8, 10, (u, v) => {
      const along = side === 1 ? u : 1 - u;
      const edge = (2 * along - 1) ** 2;
      return [
        -.56 + along ** 1.7 * (.71 - .065 * (1 - v)) + .025 * (1 - v),
        1.12 + .48 * v + .025 * edge,
        z(.269 + .033 * Math.sin(v * Math.PI) - .048 * v ** 5 + .056 * (1 - along) ** 2),
      ];
    }));
  }
  for (const [m, geometries] of parts) {
    const mesh = new T.Mesh(mergeGeometries(geometries), m);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rider.add(mesh);
    for (const geometry of geometries) geometry.dispose();
  }
  return rider;
}

export function mountJockey(root, model, horse, bit) {
  const rider = createJockey(horse), back = model.getObjectByName('Torso2');
  root.add(rider);
  const saddle = new T.Vector3(-.32, 1.60, 0);
  const rest = back.worldToLocal(root.localToWorld(saddle.clone()));
  const restForward = back.worldToLocal(root.localToWorld(saddle.clone().add(new T.Vector3(.5, 0, 0))));
  const origin = new T.Vector3(), forward = new T.Vector3();
  const reins = new T.BufferGeometry();
  const positions = new T.BufferAttribute(new Float32Array(2 * reinSteps * 2 * 3), 3).setUsage(T.DynamicDrawUsage);
  reins.setAttribute('position', positions);
  const lines = new T.LineSegments(reins, new T.LineBasicMaterial({ color: 0x211b17 }));
  lines.frustumCulled = false;
  rider.add(lines);

  const end = new T.Vector3(), start = new T.Vector3(), point = new T.Vector3();
  return () => {
    root.worldToLocal(back.localToWorld(origin.copy(rest)));
    root.worldToLocal(back.localToWorld(forward.copy(restForward)));
    const pitch = Math.atan2(forward.y - origin.y, forward.x - origin.x);
    rider.rotation.z = T.MathUtils.clamp(pitch, -.17, .17);
    rider.position.copy(origin).sub(point.copy(saddle).applyAxisAngle(lateral, rider.rotation.z));
    for (let i = 0; i < bit.length; i++) {
      rider.worldToLocal(bit[i].getWorldPosition(end));
      start.copy(hand);
      start.z *= i === 0 ? -1 : 1;
      for (let j = 0; j < reinSteps * 2; j++) {
        const t = Math.floor((j + 1) / 2) / reinSteps;
        point.lerpVectors(start, end, t);
        point.y -= .20 * t * (1 - t);
        point.z += (i === 0 ? -1 : 1) * .32 * t * (1 - t);
        positions.setXYZ(i * reinSteps * 2 + j, point.x, point.y, point.z);
      }
    }
    positions.needsUpdate = true;
  };
}
