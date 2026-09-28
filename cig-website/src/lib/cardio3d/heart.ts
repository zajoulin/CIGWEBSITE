/* ==========================================================================
   cardio3d — the anatomical heart (Z-Anatomy)
   --------------------------------------------------------------------------
   Decodes the baked Z-Anatomy heart (heart.generated.ts, produced by
   scripts/bake-heart-model.mjs) into the same `ModelPart[]` the procedural
   model produced, so the renderer, sidebar, search and information panel are
   unchanged.

   Z-Anatomy has no separate conduction-system meshes, so the SA and AV nodes,
   the bundle of His with its branches and the Purkinje network are drawn here
   as schematic tubes along pathways the bake script derived from the real
   chamber, septum and valve geometry.

   Model: "Z-Anatomy — The libre 3D atlas of anatomy" (CC BY-SA 4.0), derived
   from "BodyParts3D, The Database Center for Life Science" (CC BY-SA 2.1 JP).
   ========================================================================== */

import type { Geometry } from './geometry';
import { ellipsoid, merge, spline, tube } from './geometry';
import type { Vec3 } from './math';
import type { ModelPart } from './model';
import { BAKED_HEART } from './heart.generated';
import { CONDUCTION_STYLE, HEART_STYLE } from './heart-meta';

export interface BakedPart {
  name: string;
  vertices: number;
  indices: number;
  posOffset: number;
  idxOffset: number;
  idx32: boolean;
}

export interface BakedHeart {
  quantMin: number[];
  quantSpan: number[];
  parts: BakedPart[];
  conduction: {
    saNode: number[];
    avNode: number[];
    his: number[][];
    leftBundle: number[][];
    rightBundle: number[][];
    purkinje: number[][][];
  };
  /** Four-chamber cross-section: the cut plane and labelled internal landmarks. */
  section: {
    plane: number[];
    labels: { text: string; point: number[] }[];
  };
  data: string;
}

const decodeBase64 = (b64: string): ArrayBuffer => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
};

/** Smooth, area-weighted vertex normals. */
const withNormals = (positions: Float32Array, indices: Uint32Array): Geometry => {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
    const e1x = positions[b] - positions[a], e1y = positions[b + 1] - positions[a + 1], e1z = positions[b + 2] - positions[a + 2];
    const e2x = positions[c] - positions[a], e2y = positions[c + 1] - positions[a + 1], e2z = positions[c + 2] - positions[a + 2];
    const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    for (const v of [a, b, c]) {
      normals[v] += nx; normals[v + 1] += ny; normals[v + 2] += nz;
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const l = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= l; normals[i + 1] /= l; normals[i + 2] /= l;
  }
  return { positions, normals, indices };
};

const decodePart = (buffer: ArrayBuffer, p: BakedPart): Geometry => {
  const { quantMin: min, quantSpan: span } = BAKED_HEART;
  const q = new Uint16Array(buffer, p.posOffset, p.vertices * 3);
  const positions = new Float32Array(q.length);
  for (let i = 0; i < q.length; i++) positions[i] = min[i % 3] + (q[i] / 65535) * span[i % 3];
  const raw = p.idx32
    ? new Uint32Array(buffer, p.idxOffset, p.indices)
    : new Uint16Array(buffer, p.idxOffset, p.indices);
  return withNormals(positions, Uint32Array.from(raw));
};

const v = (p: number[]): Vec3 => [p[0], p[1], p[2]];

const buildConduction = (): Record<string, Geometry> => {
  const c = BAKED_HEART.conduction;
  const path = (pts: number[][], steps = 8): Vec3[] => spline(pts.map(v), steps);
  return {
    'heart.sa_node': ellipsoid(0.085, 0.05, 0.05, v(c.saNode), 18),
    'heart.av_node': ellipsoid(0.055, 0.042, 0.048, v(c.avNode), 18),
    'heart.bundle_of_his': merge([
      tube(path(c.his, 6), 0.022, { radialSegments: 8, capStart: true }),
      tube(path(c.leftBundle), (t) => 0.02 - 0.008 * t, { radialSegments: 8, capEnd: true }),
      tube(path(c.rightBundle), (t) => 0.018 - 0.007 * t, { radialSegments: 8, capEnd: true }),
    ]),
    'heart.purkinje_fibers': merge(
      c.purkinje.map((fibre) =>
        tube(path(fibre, 6), (t) => 0.011 - 0.006 * t, { radialSegments: 6, capEnd: true }),
      ),
    ),
  };
};

export interface SectionData {
  plane: [number, number, number, number];
  labels: { text: string; point: Vec3 }[];
}

/** The baked four-chamber section. */
export const heartSection = (): SectionData => ({
  plane: BAKED_HEART.section.plane.slice(0, 4) as [number, number, number, number],
  labels: BAKED_HEART.section.labels.map((l) => ({ text: l.text, point: v(l.point) })),
});

let cached: ModelPart[] | null = null;

/** Builds (and memoises) the anatomical heart. */
export const buildAnatomicalHeart = (): ModelPart[] => {
  if (cached) return cached;
  const buffer = decodeBase64(BAKED_HEART.data);
  const parts: ModelPart[] = BAKED_HEART.parts.map((p) => ({
    name: p.name,
    geometry: decodePart(buffer, p),
    ...(HEART_STYLE[p.name] ?? { color: '#9aa8bd', groups: ['chambers'], opacity: 1, order: 0 }),
  }));
  const conduction = buildConduction();
  for (const [name, geometry] of Object.entries(conduction)) {
    parts.push({ name, geometry, ...CONDUCTION_STYLE[name] });
  }
  cached = parts;
  return parts;
};
