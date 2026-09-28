#!/usr/bin/env node
/**
 * Bakes the Z-Anatomy heart (assets/models/heart-zanatomy.glb) into
 * src/lib/cardio3d/heart.generated.ts — the compact, dependency-free form the
 * WebGL viewer draws.
 *
 *   • maps the Z-Anatomy structures onto the site's meshNames
 *     (content/anatomy/*.json), merging sub-parts (e.g. the four aortic
 *     segments become `vessels.aorta`)
 *   • moves the heart into the viewer's frame (+X patient left, +Y superior,
 *     +Z anterior), centred on the chambers and scaled to the same size as the
 *     old diagrammatic model, so camera framings keep working
 *   • simplifies each structure by vertex clustering to keep the page light
 *   • derives the septa (where the left and right chamber walls meet) and the
 *     conduction-system pathways from the real anatomy — Z-Anatomy has no
 *     separate septum or conduction meshes
 *   • quantises positions to 16 bits and inlines the result as base64, so the
 *     model works in the Next.js app AND the offline single-file build with no
 *     network request and no GLTF/Draco decoder.
 *
 * The source GLB must be exported from Blender WITHOUT Draco compression.
 *
 *   node scripts/bake-heart-model.mjs
 *
 * Model: "Z-Anatomy — The libre 3D atlas of anatomy" (CC BY-SA 4.0), derived
 * from "BodyParts3D, The Database Center for Life Science" (CC BY-SA 2.1 JP).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'assets', 'models', 'heart-zanatomy.glb');
const OUT = join(root, 'src', 'lib', 'cardio3d', 'heart.generated.ts');
const log = (...a) => console.log('[bake-heart]', ...a);

/* ------------------------------------------------ Structure mapping ---- */
// `cell` is the clustering size in metres (source units); `null` keeps the
// structure at full detail (clustering visibly crumples the chamber walls).
const PARTS = [
  { name: 'heart.left_ventricle', cell: null, from: ['Left ventricle', 'Inferior papillary muscle of left ventricle'] },
  { name: 'heart.right_ventricle', cell: null, from: ['Right ventricle', 'Anterior papillary muscle of right ventricle', 'Inferior papillary muscle of right ventricle', 'Septal papillary muscle of right ventricle'] },
  { name: 'heart.left_atrium', cell: null, from: ['Left atrium'] },
  { name: 'heart.right_atrium', cell: null, from: ['Right atrium'] },
  { name: 'heart.tricuspid_valve', cell: 0.0014, from: ['Inferior leaflet of right atrioventricular valve', 'Septal leaflet of right atrioventricular valve'] },
  { name: 'heart.mitral_valve', cell: 0.0014, from: ['Posterior leaflet of left atrioventricular valve'] },
  { name: 'heart.pulmonary_valve', cell: 0.0011, from: ['Anterior semilunar leaflet of pulmonary valve', 'Left semilunar leaflet of pulmonary valve', 'Right semilunar leaflet of pulmonary valve'] },
  { name: 'heart.aortic_valve', cell: 0.0009, from: ['Left coronary leaflet', 'Non-coronary leaflet', 'Right coronary leaflet'] },
  { name: 'heart.coronary_arteries', cell: 0.0011, from: ['Left coronary artery', 'Anterior interventricular artery', 'Septal branches of anterior interventricular artery', 'Circumflex artery of heart', 'Right coronary artery', 'Right inferolateral branch of right coronary artery'] },
  { name: 'heart.coronary_veins', cell: 0.0011, from: ['Coronary sinus', 'Great cardiac vein', 'Middle cardiac vein', 'Inferior vein of left ventricle', "Inferior vein of left ventricle (//Posterior '')"] },
  { name: 'vessels.aorta', cell: 0.0016, from: ['Ascending aorta', 'Aortic arch', 'Thoracic aorta'] },
  { name: 'vessels.pulmonary_trunk', cell: 0.0014, from: ['Pulmonary trunk', 'Bifurcation of pulmonary trunk'] },
  { name: 'vessels.pulmonary_arteries', cell: 0.0014, from: ['Left pulmonary artery', 'Right pulmonary artery'] },
  { name: 'vessels.pulmonary_veins', cell: 0.0011, from: ['Left inferior pulmonary vein', 'Left superior pulmonary vein', 'Right inferior pulmonary vein', 'Right superior pulmonary vein'] },
  { name: 'vessels.svc', cell: 0.0014, from: ['Superior vena cava'] },
  { name: 'vessels.ivc', cell: 0.0014, from: ['Inferior vena cava (thoracic part)'] },
];
// Deliberately left out: the abdominal aorta and abdominal IVC (the viewer is
// heart-centred) and the para-aortic lymph nodes that came along in the export.

const CHAMBERS = ['Left ventricle', 'Right ventricle', 'Left atrium', 'Right atrium'];
/** Chamber height in viewer units — matches the old diagrammatic heart. */
const TARGET_HEIGHT = 2.05;

/* ---------------------------------------------------------- GLB read ---- */
const readGlb = (path) => {
  const f = readFileSync(path);
  if (f.readUInt32LE(0) !== 0x46546c67) throw new Error('Not a GLB file: ' + path);
  const jl = f.readUInt32LE(12);
  const j = JSON.parse(f.subarray(20, 20 + jl).toString());
  if ((j.extensionsUsed || []).includes('KHR_draco_mesh_compression')) {
    throw new Error('The GLB is Draco-compressed. Re-export from Blender with Compression off.');
  }
  const bin = f.subarray(20 + jl + 8);
  const acc = (i) => {
    const a = j.accessors[i], bv = j.bufferViews[a.bufferView];
    const off = bin.byteOffset + (bv.byteOffset || 0) + (a.byteOffset || 0);
    const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type] * a.count;
    const C = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array }[a.componentType];
    return new C(bin.buffer.slice(off, off + n * C.BYTES_PER_ELEMENT));
  };
  const mul = (a, b) => {
    const o = new Array(16).fill(0);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    return o;
  };
  const trs = (n) => {
    if (n.matrix) return n.matrix;
    const [x, y, z, w] = n.rotation || [0, 0, 0, 1];
    const [sx, sy, sz] = n.scale || [1, 1, 1];
    const [tx, ty, tz] = n.translation || [0, 0, 0];
    return [
      (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
      2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
      2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
      tx, ty, tz, 1,
    ];
  };
  const meshes = new Map();
  const visit = (i, parent) => {
    const n = j.nodes[i];
    const m = mul(parent, trs(n));
    if (n.mesh !== undefined) {
      const P = [], I = [];
      for (const p of j.meshes[n.mesh].primitives) {
        if ((p.mode ?? 4) !== 4) continue;
        const pos = acc(p.attributes.POSITION);
        const base = P.length / 3;
        for (let k = 0; k < pos.length; k += 3) {
          const x = pos[k], y = pos[k + 1], z = pos[k + 2];
          P.push(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]);
        }
        const idx = p.indices !== undefined ? acc(p.indices) : Array.from({ length: pos.length / 3 }, (_, q) => q);
        // A negative-determinant transform flips winding.
        const det = m[0] * (m[5] * m[10] - m[6] * m[9]) - m[4] * (m[1] * m[10] - m[2] * m[9]) + m[8] * (m[1] * m[6] - m[2] * m[5]);
        for (let t = 0; t < idx.length; t += 3) {
          if (det < 0) I.push(idx[t] + base, idx[t + 2] + base, idx[t + 1] + base);
          else I.push(idx[t] + base, idx[t + 1] + base, idx[t + 2] + base);
        }
      }
      meshes.set(n.name, { P, I });
    }
    for (const c of n.children || []) visit(c, m);
  };
  for (const r of j.scenes[j.scene || 0].nodes) visit(r, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  return meshes;
};

/* ------------------------------------------------------- Mesh helpers ---- */
const concat = (list) => {
  const P = [], I = [];
  for (const m of list) {
    const base = P.length / 3;
    for (const v of m.P) P.push(v);
    for (const i of m.I) I.push(i + base);
  }
  return { P, I };
};

/** Vertex clustering: snaps vertices to a grid, averages each cell, drops collapsed triangles. */
const simplify = (mesh, cell) => {
  const { P, I } = mesh;
  const cells = new Map();
  const remap = new Int32Array(P.length / 3);
  const sum = [];
  for (let v = 0; v < P.length / 3; v++) {
    const key = `${Math.floor(P[v * 3] / cell)},${Math.floor(P[v * 3 + 1] / cell)},${Math.floor(P[v * 3 + 2] / cell)}`;
    let id = cells.get(key);
    if (id === undefined) { id = sum.length / 4; cells.set(key, id); sum.push(0, 0, 0, 0); }
    remap[v] = id;
    sum[id * 4] += P[v * 3]; sum[id * 4 + 1] += P[v * 3 + 1]; sum[id * 4 + 2] += P[v * 3 + 2]; sum[id * 4 + 3]++;
  }
  const outI = [], seen = new Set();
  for (let t = 0; t < I.length; t += 3) {
    const a = remap[I[t]], b = remap[I[t + 1]], c = remap[I[t + 2]];
    if (a === b || b === c || a === c) continue;
    const k = [a, b, c].sort((x, y) => x - y).join(',');
    if (seen.has(k)) continue;
    seen.add(k);
    outI.push(a, b, c);
  }
  // Compact: drop vertices no triangle uses.
  const used = new Int32Array(sum.length / 4).fill(-1);
  const outP = [];
  const finalI = outI.map((id) => {
    if (used[id] < 0) {
      used[id] = outP.length / 3;
      outP.push(sum[id * 4] / sum[id * 4 + 3], sum[id * 4 + 1] / sum[id * 4 + 3], sum[id * 4 + 2] / sum[id * 4 + 3]);
    }
    return used[id];
  });
  return { P: outP, I: finalI };
};

/**
 * Makes triangle winding consistent across each connected surface, flipping
 * neighbours so shared edges run in opposite directions. The Z-Anatomy source
 * is already consistent; this repairs the folds vertex clustering introduces
 * in the simplified vessels and valve leaflets. (It deliberately does not
 * force surfaces "outward": a chamber's inner wall must face its cavity.)
 */
const orient = (mesh) => {
  const { P } = mesh;
  const I = mesh.I.slice();
  const T = I.length / 3;
  const edges = new Map();
  const ek = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  for (let t = 0; t < T; t++) {
    for (let e = 0; e < 3; e++) {
      const k = ek(I[t * 3 + e], I[t * 3 + ((e + 1) % 3)]);
      if (!edges.has(k)) edges.set(k, []);
      edges.get(k).push(t);
    }
  }
  const has = (t, a, b) => {
    for (let e = 0; e < 3; e++) if (I[t * 3 + e] === a && I[t * 3 + ((e + 1) % 3)] === b) return true;
    return false;
  };
  const flip = (t) => { const x = I[t * 3 + 1]; I[t * 3 + 1] = I[t * 3 + 2]; I[t * 3 + 2] = x; };
  const seen = new Uint8Array(T);
  let flipped = 0;
  for (let seed = 0; seed < T; seed++) {
    if (seen[seed]) continue;
    const comp = [seed];
    seen[seed] = 1;
    for (let q = 0; q < comp.length; q++) {
      const t = comp[q];
      for (let e = 0; e < 3; e++) {
        const a = I[t * 3 + e], b = I[t * 3 + ((e + 1) % 3)];
        const list = edges.get(ek(a, b));
        if (list.length !== 2) continue; // boundary or non-manifold: don't propagate
        const n = list[0] === t ? list[1] : list[0];
        if (seen[n]) continue;
        // Consistent neighbours traverse the shared edge in the opposite direction.
        if (has(n, a, b)) { flip(n); flipped++; }
        seen[n] = 1;
        comp.push(n);
      }
    }
  }
  return { P, I, flipped };
};

const bbox = (P) => {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[i + k]); mx[k] = Math.max(mx[k], P[i + k]); }
  return { mn, mx };
};
const pts = (P) => { const o = []; for (let i = 0; i < P.length; i += 3) o.push([P[i], P[i + 1], P[i + 2]]); return o; };
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mulS = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => mulS(a, 1 / (len(a) || 1));
const lerp = (a, b, t) => add(a, mulS(sub(b, a), t));
const centroid = (ps) => mulS(ps.reduce(add, [0, 0, 0]), 1 / ps.length);
const nearest = (ps, q) => ps.reduce((best, p) => (len(sub(p, q)) < len(sub(best, q)) ? p : best), ps[0]);

/** For each vertex of A, the distance to the closest vertex of B (grid accelerated). */
const proximity = (A, B, reach) => {
  const g = new Map();
  const key = (x, y, z) => `${Math.floor(x / reach)},${Math.floor(y / reach)},${Math.floor(z / reach)}`;
  for (let i = 0; i < B.P.length; i += 3) {
    const k = key(B.P[i], B.P[i + 1], B.P[i + 2]);
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(i);
  }
  const out = [];
  for (let i = 0; i < A.P.length; i += 3) {
    let best = Infinity, bj = -1;
    const cx = Math.floor(A.P[i] / reach), cy = Math.floor(A.P[i + 1] / reach), cz = Math.floor(A.P[i + 2] / reach);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      for (const j of g.get(`${cx + a},${cy + b},${cz + c}`) || []) {
        const d = Math.hypot(A.P[i] - B.P[j], A.P[i + 1] - B.P[j + 1], A.P[i + 2] - B.P[j + 2]);
        if (d < best) { best = d; bj = j; }
      }
    }
    out.push({ d: best, j: bj });
  }
  return out;
};

/**
 * A septum as the mid-surface between two chamber walls: the triangles of A
 * whose vertices all lie within `reach` of B, each vertex moved halfway to B.
 */
const septum = (A, B, reach) => {
  const prox = proximity(A, B, reach);
  const P = A.P.slice();
  const keep = prox.map((p) => p.d < reach);
  prox.forEach((p, v) => {
    if (!keep[v]) return;
    for (let k = 0; k < 3; k++) P[v * 3 + k] = (A.P[v * 3 + k] + B.P[p.j + k]) / 2;
  });
  const I = [];
  for (let t = 0; t < A.I.length; t += 3) {
    if (keep[A.I[t]] && keep[A.I[t + 1]] && keep[A.I[t + 2]]) I.push(A.I[t], A.I[t + 1], A.I[t + 2]);
  }
  return { P, I };
};

/* ------------------------------------------------------------- Bake ---- */
const src = readGlb(SRC);
const get = (name) => {
  const m = src.get(name);
  if (!m) throw new Error(`Structure "${name}" not found in ${SRC}`);
  return m;
};

// Frame: centre on the chambers, scale to the viewer's size.
const ch = bbox(concat(CHAMBERS.map(get)).P);
const centre = ch.mn.map((v, k) => (v + ch.mx[k]) / 2);
const S = TARGET_HEIGHT / (ch.mx[1] - ch.mn[1]);
const toView = (m) => {
  const P = new Array(m.P.length);
  for (let i = 0; i < m.P.length; i += 3) for (let k = 0; k < 3; k++) P[i + k] = (m.P[i + k] - centre[k]) * S;
  return { P, I: m.I.slice() };
};
log(`scale ×${S.toFixed(2)}, chambers centred at [${centre.map((v) => v.toFixed(4))}]`);

const baked = [];
for (const part of PARTS) {
  const merged = concat(part.from.map(get));
  const { flipped, ...simple } = orient(toView(part.cell ? simplify(merged, part.cell) : simplify(merged, 0.00001)));
  baked.push({ name: part.name, ...simple });
  log(`${part.name.padEnd(30)} ${String(merged.I.length / 3).padStart(6)} → ${String(simple.I.length / 3).padStart(6)} triangles, ${flipped} re-oriented`);
}

// Septa — derived from where the left and right walls meet.
const SEPTUM_REACH = 0.007; // metres
const ivs = orient(toView(simplify(septum(get('Left ventricle'), get('Right ventricle'), SEPTUM_REACH), 0.0024)));
const ias = orient(toView(simplify(septum(get('Left atrium'), get('Right atrium'), SEPTUM_REACH), 0.002)));
baked.push({ name: 'heart.interventricular_septum', P: ivs.P, I: ivs.I });
baked.push({ name: 'heart.interatrial_septum', P: ias.P, I: ias.I });
log(`septa: interventricular ${ivs.I.length / 3}, interatrial ${ias.I.length / 3} triangles`);

/* ------------------------------------------- Conduction-system paths ---- */
const V = (name) => pts(toView(get(name)).P);
const lv = V('Left ventricle'), rv = V('Right ventricle'), ra = V('Right atrium');
const svc = V('Superior vena cava'), cs = V('Coronary sinus');
const mitral = centroid(V('Posterior leaflet of left atrioventricular valve'));
const tricuspidSeptal = centroid(V('Septal leaflet of right atrioventricular valve'));
const rvAntPap = centroid(V('Anterior papillary muscle of right ventricle'));
const lvPap = centroid(V('Inferior papillary muscle of left ventricle'));
const lvC = centroid(lv), rvC = centroid(rv);
const apex = lv.reduce((b, p) => (len(sub(p, mitral)) > len(sub(b, mitral)) ? p : b), lv[0]);
const axis = norm(sub(apex, mitral));
const toLeft = norm(sub(lvC, rvC));

// SA node: at the junction of the SVC with the right atrium, on its lateral side.
const svcLow = svc.filter((p) => p[1] < Math.min(...svc.map((q) => q[1])) + 0.12);
const svcFoot = centroid(svcLow);
const saNode = nearest(ra, add(svcFoot, [-0.12, -0.05, 0.08]));

// AV node: apex of the triangle of Koch — between the coronary sinus ostium
// and the septal tricuspid leaflet, on the atrial septum.
const csOst = centroid(cs.filter((p) => p[0] < Math.min(...cs.map((q) => q[0])) + 0.06));
const avNode = lerp(csOst, tricuspidSeptal, 0.55);

// Septal centre-line from the interventricular septum, base to apex.
const septPts = pts(ivs.P);
const tOf = (p) => dot(sub(p, mitral), axis);
const tMin = Math.min(...septPts.map(tOf)), tMax = Math.max(...septPts.map(tOf));
const bins = [];
for (let b = 0; b < 7; b++) {
  const lo = tMin + ((tMax - tMin) * b) / 7, hi = tMin + ((tMax - tMin) * (b + 1)) / 7;
  const inBin = septPts.filter((p) => tOf(p) >= lo && tOf(p) <= hi);
  if (inBin.length) bins.push(centroid(inBin));
}
const off = 0.045;
const hisEnd = bins[0];
const his = [avNode, lerp(avNode, hisEnd, 0.5), hisEnd];
const leftBundle = [hisEnd, ...bins.slice(1, 6).map((p) => add(p, mulS(toLeft, off))), lerp(lvPap, apex, 0.3)];
const rightBundle = [hisEnd, ...bins.slice(1, 4).map((p) => sub(p, mulS(toLeft, off))), rvAntPap];

// Purkinje network: branches from the bundle branches over the inner walls.
let seed = 20260928;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const spread = (verts, count, from, chamberC, minT) => {
  const cand = verts.filter((p) => tOf(p) > minT);
  const chosen = [cand[Math.floor(rnd() * cand.length)]];
  while (chosen.length < count) {
    // Farthest-point sampling for an even spread.
    let best = null, bestD = -1;
    for (let s = 0; s < 400; s++) {
      const p = cand[Math.floor(rnd() * cand.length)];
      const d = Math.min(...chosen.map((c) => len(sub(c, p))));
      if (d > bestD) { bestD = d; best = p; }
    }
    chosen.push(best);
  }
  // Each fibre runs from a point on the bundle branch to its target, hugging
  // the chamber wall: sample the straight line, snap each sample to the wall,
  // then pull it slightly inwards so it sits just under the endocardium.
  const onWall = (q) => lerp(nearest(verts, q), chamberC, 0.14);
  return chosen.map((target) => {
    // Fibres leave the distal part of the bundle branch.
    const start = from[from.length - 1 - Math.floor(rnd() * 2)];
    const path = [start];
    for (let s = 1; s <= 5; s++) path.push(onWall(lerp(start, target, s / 5)));
    return path;
  });
};
const lvLen = len(sub(apex, mitral));
const purkinje = [
  ...spread(lv, 10, leftBundle, lvC, lvLen * 0.5),
  ...spread(rv, 6, rightBundle, rvC, lvLen * 0.45),
];


/* ------------------------------------------------ Four-chamber section ---- */
// The four-chamber plane contains the long axis (mitral valve → apex) and the
// line joining the two ventricles, so it opens all four chambers side by side.
const la = V('Left atrium');
const tricuspid = centroid([...V('Inferior leaflet of right atrioventricular valve'), ...V('Septal leaflet of right atrioventricular valve')]);
const across = sub(lvC, rvC);
let sn = norm(cross(axis, sub(across, mulS(axis, dot(across, axis)))));
if (sn[2] < 0) sn = mulS(sn, -1); // cut away the anterior side
const sc = centroid([lvC, rvC, mitral, tricuspid, centroid(la), centroid(ra)]);
const sd = -dot(sn, sc);
const sdist = (p) => dot(sn, p) + sd;
log(`section plane n=[${sn.map((v) => v.toFixed(3))}] d=${sd.toFixed(3)}`);

/** A label anchor: the part of a structure lying on the cut (or just behind it). */
const onCut = (verts, slab = 0.3) => {
  const kept = verts.filter((p) => sdist(p) <= 0.02);
  if (!kept.length) return null;
  const near = kept.filter((p) => sdist(p) > -slab);
  return centroid(near.length >= 3 ? near : kept.sort((a, b) => sdist(b) - sdist(a)).slice(0, 20));
};
/** Moves a point onto the cut plane. */
const toPlane = (p) => sub(p, mulS(sn, sdist(p)));
/** The vertex of `verts` lying on the cut that is closest to `q`. */
const cutNearest = (verts, q) => {
  const slab = verts.filter((p) => Math.abs(sdist(p)) < 0.1);
  return slab.length ? nearest(slab, toPlane(q)) : null;
};
/** Only for structures the plane actually passes through. */
const cutThrough = (verts) => (verts.some((p) => sdist(p) > 0.02) && verts.some((p) => sdist(p) < -0.02) ? onCut(verts, 0.2) : null);
const lvPapV = V('Inferior papillary muscle of left ventricle');
const mitralV = V('Posterior leaflet of left atrioventricular valve');
const lvSlab = lv.filter((p) => Math.abs(sdist(p)) < 0.08);
const lvWall = lvSlab.length ? lvSlab.reduce((b, p) => (dot(sub(p, lvC), toLeft) > dot(sub(b, lvC), toLeft) ? p : b), lvSlab[0]) : null;
const cand = [
  ['Right atrium', onCut(ra, 0.35)],
  ['Left atrium', onCut(la, 0.35)],
  ['Right ventricle', onCut(rv, 0.35)],
  ['Left ventricle', onCut(lv, 0.35)],
  ['Interventricular septum', cutNearest(pts(ivs.P), lerp(lerp(lvC, rvC, 0.5), apex, 0.25))],
  ['Interatrial septum', cutNearest(pts(ias.P), lerp(centroid(la), centroid(ra), 0.5))],
  ['Tricuspid valve', onCut([...V('Inferior leaflet of right atrioventricular valve'), ...V('Septal leaflet of right atrioventricular valve')], 0.4)],
  ['Mitral valve', onCut(mitralV, 0.4)],
  ['Chordae tendineae', (() => { const a = onCut(mitralV, 0.4), b = onCut(lvPapV, 0.5); return a && b ? lerp(a, b, 0.5) : null; })()],
  ['Papillary muscle (LV)', onCut(lvPapV, 0.5)],
  ['Anterior papillary muscle (RV)', onCut(V('Anterior papillary muscle of right ventricle'), 0.5)],
  ['Septal papillary muscle (RV)', onCut(V('Septal papillary muscle of right ventricle'), 0.5)],
  ['Apex', sdist(apex) <= 0.05 ? apex : onCut(lv.filter((p) => len(sub(p, apex)) < 0.25))],
  ['Myocardium (LV wall)', lvWall],
  ['Coronary sinus', sdist(csOst) <= 0.05 ? csOst : onCut(cs, 0.4)],
  ['Sinuatrial node', sdist(saNode) <= 0.05 ? saNode : null],
  ['Atrioventricular node', sdist(avNode) <= 0.05 ? avNode : null],
  ['Superior vena cava', cutThrough(svc)],
  ['Inferior vena cava', cutThrough(V('Inferior vena cava (thoracic part)'))],
  ['Descending aorta', cutThrough(V('Thoracic aorta'))],
  ['Pulmonary veins', onCut([...V('Left inferior pulmonary vein'), ...V('Right inferior pulmonary vein'), ...V('Left superior pulmonary vein'), ...V('Right superior pulmonary vein')], 0.4)],
];
const sectionLabels = cand.filter(([, p]) => p).map(([text, p]) => ({ text, point: p }));
log(`section labels: ${sectionLabels.map((l) => l.text).join(', ')}`);

/* ----------------------------------------------------------- Encode ---- */
const all = bbox(baked.flatMap((b) => b.P));
const qMin = all.mn, qSpan = all.mx.map((v, k) => v - qMin[k]);
const chunks = [];
let offset = 0;
const push = (typed) => {
  const bytes = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
  const pad = (4 - (bytes.length % 4)) % 4;
  const at = offset;
  chunks.push(bytes, new Uint8Array(pad));
  offset += bytes.length + pad;
  return at;
};
const meta = baked.map((b) => {
  const q = new Uint16Array(b.P.length);
  for (let i = 0; i < b.P.length; i++) q[i] = Math.round(((b.P[i] - qMin[i % 3]) / qSpan[i % 3]) * 65535);
  const vertices = b.P.length / 3;
  const idx32 = vertices > 65535;
  const posOffset = push(q);
  const idxOffset = push(idx32 ? new Uint32Array(b.I) : new Uint16Array(b.I));
  return { name: b.name, vertices, indices: b.I.length, posOffset, idxOffset, idx32 };
});
const data = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('base64');
const r = (p) => p.map((v) => +v.toFixed(4));

const file = `/* eslint-disable */
// AUTO-GENERATED by scripts/bake-heart-model.mjs — do not edit by hand.
// Source: assets/models/heart-zanatomy.glb
// Model: Z-Anatomy — The libre 3D atlas of anatomy (CC BY-SA 4.0), derived from
// BodyParts3D, The Database Center for Life Science (CC BY-SA 2.1 Japan).
// Septa and conduction pathways are derived from the Z-Anatomy geometry.

import type { BakedHeart } from './heart';

export const BAKED_HEART: BakedHeart = {
  quantMin: ${JSON.stringify(r(qMin))},
  quantSpan: ${JSON.stringify(r(qSpan))},
  parts: ${JSON.stringify(meta)},
  conduction: {
    saNode: ${JSON.stringify(r(saNode))},
    avNode: ${JSON.stringify(r(avNode))},
    his: ${JSON.stringify(his.map(r))},
    leftBundle: ${JSON.stringify(leftBundle.map(r))},
    rightBundle: ${JSON.stringify(rightBundle.map(r))},
    purkinje: ${JSON.stringify(purkinje.map((p) => p.map(r)))},
  },
  section: {
    plane: ${JSON.stringify(r([...sn, sd]))},
    labels: ${JSON.stringify(sectionLabels.map((l) => ({ text: l.text, point: r(l.point) })))},
  },
  data: '${data}',
};
`;
writeFileSync(OUT, file);
const tris = meta.reduce((s, m) => s + m.indices / 3, 0);
log(`wrote ${OUT.replace(root + '/', '')} — ${tris} triangles, ${(file.length / 1024).toFixed(0)} KB`);
