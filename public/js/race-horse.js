import * as T from '/vendor/three/three.module.js';
import { mergeGeometries, mergeVertices } from '/vendor/three/BufferGeometryUtils.js';

const coats = [
  0x67371f, 0xbab5ad, 0x292521, 0x79432a,
  0xa56d3f, 0x503024, 0xcdc7bd, 0x60412c,
];
const coatPart = name => name.startsWith('Main') || name === 'Muzzle';

export function smoothGallop(clip) {
  const subdivisions = 6;
  const firstTrack = clip.tracks[0];
  const frameStep = clip.duration / (firstTrack.times.length - 1);
  const duration = Math.fround(clip.duration + frameStep);
  const tracks = clip.tracks.map(track => {
    const count = track.times.length;
    const size = track.getValueSize();
    const frames = count * subdivisions;
    const times = new Float32Array(frames + 1);
    const values = new Float32Array((frames + 1) * size);
    const source = track.values;
    const quaternion = track instanceof T.QuaternionKeyframeTrack;
    const sign = (a, b) => {
      if (!quaternion) return 1;
      let dot = 0;
      for (let i = 0; i < size; i++) dot += source[a + i] * source[b + i];
      return dot < 0 ? -1 : 1;
    };

    // The original clip ends one frame before returning to its starting pose.
    // Use cyclic Catmull–Rom tangents and add that closing interval explicitly.
    for (let key = 0; key < count; key++) {
      const a = (key + count - 1) % count * size;
      const b = key * size;
      const c = (key + 1) % count * size;
      const d = (key + 2) % count * size;
      const signA = sign(b, a), signC = sign(b, c), signD = signC * sign(c, d);
      const start = track.times[key], end = track.times[key + 1] ?? duration;
      for (let sub = 0; sub < subdivisions; sub++) {
        const frame = key * subdivisions + sub;
        const t = sub / subdivisions;
        times[frame] = T.MathUtils.lerp(start, end, t);
        let lengthSquared = 0;
        for (let i = 0; i < size; i++) {
          const p0 = source[a + i] * signA, p1 = source[b + i];
          const p2 = source[c + i] * signC, p3 = source[d + i] * signD;
          const startTangent = (p2 - p0) / 2, endTangent = (p3 - p1) / 2;
          const quadratic = 3 * (p2 - p1) - 2 * startTangent - endTangent;
          const cubic = 2 * (p1 - p2) + startTangent + endTangent;
          const value = p1 + t * (startTangent + t * (quadratic + t * cubic));
          values[frame * size + i] = value;
          lengthSquared += value * value;
        }
        if (quaternion) {
          const length = Math.sqrt(lengthSquared);
          for (let i = 0; i < size; i++) values[frame * size + i] /= length;
        }
      }
    }
    times[frames] = duration;
    values.set(values.subarray(0, size), frames * size);
    return new track.constructor(track.name, times, values);
  });
  return new T.AnimationClip(clip.name, duration, tracks);
}

// The glTF separates the head and body by material. Match their normals at the shared edges.
export function prepareHorse(template) {
  const normals = new Map();
  const coat = [];
  const key = (x, y, z) => [x, y, z].map(n => Math.round(n * 1e6)).join('/');
  template.traverse(node => {
    if (!node.isSkinnedMesh) return;
    const source = node.geometry.clone();
    source.deleteAttribute('normal');
    const geometry = mergeVertices(source, .0001);
    source.dispose();
    geometry.computeVertexNormals();
    node.geometry = geometry;
    if (!coatPart(node.material.name)) return;

    const { position, normal } = geometry.attributes;
    const keys = [];
    const colors = new Float32Array(position.count * 3);
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
      const id = key(x, y, z);
      const n = normals.get(id) ?? new T.Vector3();
      n.add(new T.Vector3().fromBufferAttribute(normal, i));
      normals.set(id, n);
      keys.push(id);

      // Coordinates are in the asset's bind pose, with Z up and -Y forward.
      const stockings = 1 - T.MathUtils.smoothstep(z, .003, .018);
      const muzzle = 1 - T.MathUtils.smoothstep(y, -.034, -.026);
      const light = 1 - .53 * stockings - .23 * muzzle;
      const variation = .045 * Math.sin(950 * x + 110 * z) * Math.cos(620 * y - 760 * z);
      colors.set([light + variation, light + variation, light + variation], i * 3);
    }
    geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
    coat.push({ normal, keys });
  });
  for (const n of normals.values()) n.normalize();
  for (const { normal, keys } of coat) {
    keys.forEach((id, i) => {
      const { x, y, z } = normals.get(id);
      normal.setXYZ(i, x, y, z);
    });
  }
}

function strip(points, crosswise, width) {
  const path = new T.CatmullRomCurve3(points.map(point => new T.Vector3(...point)));
  const vertices = [];
  const indices = [];
  const segments = 16;
  for (let i = 0; i <= segments; i++) {
    const point = path.getPoint(i / segments);
    const edge = crosswise(path.getTangent(i / segments)).normalize().multiplyScalar(width / 2);
    vertices.push(...point.clone().sub(edge).toArray(), ...point.add(edge).toArray());
    if (i < segments) {
      const a = 2 * i;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function bridle(model, root) {
  model.updateWorldMatrix(true, true);
  const head = model.getObjectByName('Head');
  const tack = new T.Group();
  tack.name = 'Bridle';
  // Fit the leather in normalized race coordinates, then let the Head bone carry it.
  tack.matrixAutoUpdate = false;
  tack.matrix.copy(head.matrixWorld).invert().multiply(root.matrixWorld);
  head.add(tack);
  const straps = [
    strip([
      [1.49, 1.752, -.077], [1.491, 1.82, -.077], [1.491, 1.904, -.043],
      [1.493, 1.927, .013], [1.496, 1.905, .073], [1.498, 1.816, .105], [1.50, 1.746, .088],
    ], () => new T.Vector3(1, -1.45, 0), .032),
    strip([
      [1.232, 2.065, -.12], [1.307, 2.102, -.105], [1.336, 2.147, -.053],
      [1.335, 2.154, .013], [1.332, 2.146, .071], [1.30, 2.104, .133], [1.235, 2.065, .147],
    ], () => new T.Vector3(1, -.3, 0), .035),
  ];
  const anchors = [];
  const metal = new T.MeshStandardMaterial({ color: 0xb5ada3, roughness: .34, metalness: .45 });
  for (const side of [-1, 1]) {
    const point = (x, y, width) => [x, y, .014 + side * width];
    const end = point(1.549, 1.725, .089);
    straps.push(strip([
      point(1.186, 2.144, .107), point(1.230, 2.067, .139),
      point(1.255, 1.961, .155), point(1.325, 1.855, .151),
      point(1.438, 1.779, .092), end,
    ], tangent => new T.Vector3(0, 0, side).cross(tangent), .036));
    const ring = new T.Mesh(new T.TorusGeometry(.022, .0055, 5, 12), metal);
    ring.name = 'Bit';
    ring.position.set(...end);
    tack.add(ring);
    anchors.push(ring);
  }
  const leather = new T.MeshStandardMaterial({ color: 0x271b16, roughness: .62, side: T.DoubleSide });
  const rigging = new T.Mesh(mergeGeometries(straps), leather);
  rigging.castShadow = true;
  tack.add(rigging);
  for (const strap of straps) strap.dispose();
  return anchors;
}

// Apply race colors to this clone and return the two animated bit anchors, left then right.
export function styleHorse(model, root, index) {
  model.traverse(node => {
    if (!node.isSkinnedMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    node.frustumCulled = false;
    const material = node.material.clone();
    const name = material.name;
    material.metalness = 0;
    material.roughness = .72;
    if (coatPart(name)) {
      material.color.setHex(coats[index]);
      material.vertexColors = true;
      material.roughness = .55;
      if (name === 'Muzzle') material.color.lerp(new T.Color(0x362c2a), .60);
    } else if (name === 'Hair') {
      material.color.setHex(index === 6 ? 0x68625c : 0x2e2723);
    } else if (name === 'Eye_Black') {
      material.roughness = .21;
    }
    node.material = material;
  });
  return bridle(model, root);
}
