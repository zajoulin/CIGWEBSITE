/* ==========================================================================
   cardio3d — procedural geometry builders
   --------------------------------------------------------------------------
   Everything the cardiovascular model is made of is generated here from
   parametric surfaces, swept tubes and lathes. No external model files, no
   licensing constraints — and the same builders can be replaced by a GLTF
   loader later without touching the renderer (see loader.ts).
   ========================================================================== */

import type { Vec3 } from './math';
import { add, cross, normalize, scale, sub } from './math';

export interface Geometry {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

interface Builder {
  positions: number[];
  indices: number[];
}

const finish = (b: Builder, flipNormals = false): Geometry => {
  const positions = new Float32Array(b.positions);
  const indices = new Uint32Array(b.indices);
  const normals = new Float32Array(positions.length);

  // Accumulate area-weighted face normals for smooth shading.
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const bb = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;
    const ax = positions[a], ay = positions[a + 1], az = positions[a + 2];
    const bx = positions[bb], by = positions[bb + 1], bz = positions[bb + 2];
    const cx = positions[c], cy = positions[c + 1], cz = positions[c + 2];
    const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
    const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;
    normals[a] += nx; normals[a + 1] += ny; normals[a + 2] += nz;
    normals[bb] += nx; normals[bb + 1] += ny; normals[bb + 2] += nz;
    normals[c] += nx; normals[c + 1] += ny; normals[c + 2] += nz;
  }

  const s = flipNormals ? -1 : 1;
  for (let i = 0; i < normals.length; i += 3) {
    const l = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] = (normals[i] / l) * s;
    normals[i + 1] = (normals[i + 1] / l) * s;
    normals[i + 2] = (normals[i + 2] / l) * s;
  }

  return { positions, normals, indices };
};

/* -------------------------------------------------- Parametric surfaces -- */

export interface ParametricOptions {
  /** Close the surface in u (wrap around, e.g. a full revolution). */
  closeU?: boolean;
  flipNormals?: boolean;
}

/**
 * Builds a triangle mesh from f(u, v) where u and v run 0..1.
 * This is the workhorse: chambers, atria, vessel walls and septa are all
 * expressed as parametric surfaces.
 */
export const parametric = (
  f: (u: number, v: number) => Vec3,
  uSegments: number,
  vSegments: number,
  options: ParametricOptions = {},
): Geometry => {
  const b: Builder = { positions: [], indices: [] };
  const uCount = options.closeU ? uSegments : uSegments + 1;

  for (let iv = 0; iv <= vSegments; iv++) {
    const v = iv / vSegments;
    for (let iu = 0; iu < uCount; iu++) {
      const u = iu / uSegments;
      const p = f(u, v);
      b.positions.push(p[0], p[1], p[2]);
    }
  }

  for (let iv = 0; iv < vSegments; iv++) {
    for (let iu = 0; iu < uCount; iu++) {
      const nextU = options.closeU ? (iu + 1) % uCount : iu + 1;
      if (!options.closeU && nextU >= uCount) continue;
      const a = iv * uCount + iu;
      const bb = iv * uCount + nextU;
      const c = (iv + 1) * uCount + nextU;
      const d = (iv + 1) * uCount + iu;
      b.indices.push(a, bb, c, a, c, d);
    }
  }

  return finish(b, options.flipNormals);
};

/* ------------------------------------------------------------ Primitives -- */

export const ellipsoid = (
  rx: number,
  ry: number,
  rz: number,
  center: Vec3 = [0, 0, 0],
  segments = 32,
): Geometry =>
  parametric(
    (u, v) => {
      const theta = u * Math.PI * 2;
      const phi = v * Math.PI;
      return [
        center[0] + rx * Math.sin(phi) * Math.cos(theta),
        center[1] + ry * Math.cos(phi),
        center[2] + rz * Math.sin(phi) * Math.sin(theta),
      ];
    },
    segments,
    Math.max(8, Math.round(segments / 2)),
    { closeU: true },
  );

export const sphere = (r: number, center: Vec3 = [0, 0, 0], segments = 24): Geometry =>
  ellipsoid(r, r, r, center, segments);

/** A torus in the XZ plane, centred at the origin, before transformation. */
export const torus = (majorR: number, minorR: number, majorSeg = 40, minorSeg = 12): Geometry =>
  parametric(
    (u, v) => {
      const a = u * Math.PI * 2;
      const b = v * Math.PI * 2;
      const r = majorR + minorR * Math.cos(b);
      return [r * Math.cos(a), minorR * Math.sin(b), r * Math.sin(a)];
    },
    majorSeg,
    minorSeg,
    { closeU: true },
  );

/* ------------------------------------------------------------ Curves -- */

export const cubicBezier = (p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, steps = 24): Vec3[] => {
  const out: Vec3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const a = mt * mt * mt;
    const b = 3 * mt * mt * t;
    const c = 3 * mt * t * t;
    const d = t * t * t;
    out.push([
      a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
      a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
      a * p0[2] + b * p1[2] + c * p2[2] + d * p3[2],
    ]);
  }
  return out;
};

/** Catmull–Rom spline through the given control points. */
export const spline = (points: Vec3[], stepsPerSegment = 10): Vec3[] => {
  if (points.length < 2) return points.slice();
  const pts = [points[0], ...points, points[points.length - 1]];
  const out: Vec3[] = [];
  for (let i = 1; i < pts.length - 2; i++) {
    const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2];
    for (let s = 0; s < stepsPerSegment; s++) {
      const t = s / stepsPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([0, 1, 2].map((k) =>
        0.5 *
        ((2 * p1[k]) +
          (-p0[k] + p2[k]) * t +
          (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 +
          (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3),
      ) as Vec3);
    }
  }
  out.push(points[points.length - 1]);
  return out;
};

/* ------------------------------------------------------------- Tubes -- */

export interface TubeOptions {
  radialSegments?: number;
  capStart?: boolean;
  capEnd?: boolean;
}

/**
 * Sweeps a circular cross-section along a path using parallel-transport
 * frames, which avoids the twisting that a naive Frenet frame produces on
 * curves like the aortic arch.
 */
export const tube = (
  path: Vec3[],
  radius: number | ((t: number) => number),
  options: TubeOptions = {},
): Geometry => {
  const radial = options.radialSegments ?? 16;
  const n = path.length;
  const b: Builder = { positions: [], indices: [] };
  const radiusAt = typeof radius === 'function' ? radius : () => radius;

  // Tangents
  const tangents: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const prev = path[Math.max(0, i - 1)];
    const next = path[Math.min(n - 1, i + 1)];
    tangents.push(normalize(sub(next, prev)));
  }

  // Initial normal, perpendicular to the first tangent
  let normal: Vec3 = Math.abs(tangents[0][1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  normal = normalize(cross(tangents[0], normal));

  const frames: { n: Vec3; bn: Vec3 }[] = [];
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      // Parallel transport: rotate the previous normal onto the new tangent plane
      const t = tangents[i];
      normal = normalize(sub(normal, scale(t, (normal[0] * t[0] + normal[1] * t[1] + normal[2] * t[2]))));
      if (Math.hypot(...normal) < 1e-6) {
        normal = normalize(cross(t, Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
      }
    }
    frames.push({ n: normal, bn: normalize(cross(tangents[i], normal)) });
  }

  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const r = radiusAt(t);
    const { n: nn, bn } = frames[i];
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const ca = Math.cos(a) * r;
      const sa = Math.sin(a) * r;
      b.positions.push(
        path[i][0] + nn[0] * ca + bn[0] * sa,
        path[i][1] + nn[1] * ca + bn[1] * sa,
        path[i][2] + nn[2] * ca + bn[2] * sa,
      );
    }
  }

  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const j2 = (j + 1) % radial;
      const a = i * radial + j;
      const bb = i * radial + j2;
      const c = (i + 1) * radial + j2;
      const d = (i + 1) * radial + j;
      b.indices.push(a, bb, c, a, c, d);
    }
  }

  if (options.capStart) {
    const centre = b.positions.length / 3;
    b.positions.push(path[0][0], path[0][1], path[0][2]);
    for (let j = 0; j < radial; j++) b.indices.push(centre, (j + 1) % radial, j);
  }
  if (options.capEnd) {
    const base = (n - 1) * radial;
    const centre = b.positions.length / 3;
    const last = path[n - 1];
    b.positions.push(last[0], last[1], last[2]);
    for (let j = 0; j < radial; j++) b.indices.push(centre, base + j, base + ((j + 1) % radial));
  }

  return finish(b);
};

/* ------------------------------------------------- Transform and merge -- */

export const transform = (
  g: Geometry,
  fn: (p: Vec3) => Vec3,
  normalFn?: (n: Vec3) => Vec3,
): Geometry => {
  const positions = new Float32Array(g.positions.length);
  const normals = new Float32Array(g.normals.length);
  for (let i = 0; i < g.positions.length; i += 3) {
    const p = fn([g.positions[i], g.positions[i + 1], g.positions[i + 2]]);
    positions[i] = p[0]; positions[i + 1] = p[1]; positions[i + 2] = p[2];
    const nv = normalFn
      ? normalize(normalFn([g.normals[i], g.normals[i + 1], g.normals[i + 2]]))
      : [g.normals[i], g.normals[i + 1], g.normals[i + 2]];
    normals[i] = nv[0]; normals[i + 1] = nv[1]; normals[i + 2] = nv[2];
  }
  return { positions, normals, indices: g.indices };
};

export const translate = (g: Geometry, t: Vec3): Geometry => transform(g, (p) => add(p, t));

/** Rotates about the X axis (pitch), then Y (yaw), then Z (roll), in radians. */
export const rotate = (g: Geometry, rx: number, ry: number, rz: number): Geometry => {
  const rot = (p: Vec3): Vec3 => {
    let [x, y, z] = p;
    if (rx) { const c = Math.cos(rx), s = Math.sin(rx); [y, z] = [y * c - z * s, y * s + z * c]; }
    if (ry) { const c = Math.cos(ry), s = Math.sin(ry); [x, z] = [x * c + z * s, -x * s + z * c]; }
    if (rz) { const c = Math.cos(rz), s = Math.sin(rz); [x, y] = [x * c - y * s, x * s + y * c]; }
    return [x, y, z];
  };
  return transform(g, rot, rot);
};

export const merge = (parts: Geometry[]): Geometry => {
  let vCount = 0;
  let iCount = 0;
  for (const p of parts) { vCount += p.positions.length; iCount += p.indices.length; }
  const positions = new Float32Array(vCount);
  const normals = new Float32Array(vCount);
  const indices = new Uint32Array(iCount);
  let vo = 0, io = 0, base = 0;
  for (const p of parts) {
    positions.set(p.positions, vo);
    normals.set(p.normals, vo);
    for (let i = 0; i < p.indices.length; i++) indices[io + i] = p.indices[i] + base;
    base += p.positions.length / 3;
    vo += p.positions.length;
    io += p.indices.length;
  }
  return { positions, normals, indices };
};

/* ---------------------------------------------------------- Analysis -- */

export interface Bounds {
  min: Vec3;
  max: Vec3;
  centre: Vec3;
  radius: number;
}

export const bounds = (g: Geometry): Bounds => {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < g.positions.length; i += 3) {
    const x = g.positions[i], y = g.positions[i + 1], z = g.positions[i + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  const centre: Vec3 = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
  const radius = Math.max(maxX - minX, maxY - minY, maxZ - minZ) / 2 || 0.2;
  return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ], centre, radius };
};
