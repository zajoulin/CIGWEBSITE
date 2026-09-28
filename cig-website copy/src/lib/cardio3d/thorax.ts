/* ==========================================================================
   cardio3d — the procedural thorax
   --------------------------------------------------------------------------
   A second model for the same renderer. CardioViewer draws named parts and
   knows nothing about cardiology, so the clinical examination module reuses
   it unchanged: this file simply hands it a different set of parts — a chest
   wall, a rib cage, a sternum, clavicles, a heart silhouette, and one small
   marker mesh for every electrode position, auscultation area and surface
   landmark in the content layer.

   Coordinate frame, matching the cardiovascular model:
     +X  patient's LEFT      (screen right in the anterior view)
     +Y  SUPERIOR
     +Z  ANTERIOR            (towards the viewer)

   The chest wall is deliberately translucent: the learner needs to see that
   V1 sits over the right ventricle and the septum, and that the apex beat is
   where the left ventricle reaches the chest wall. Everything is diagrammatic
   and anatomically arranged rather than photorealistic, and the interface
   labels it as such.
   ========================================================================== */

import type { Geometry } from './geometry';
import { ellipsoid, merge, parametric, spline, translate, tube } from './geometry';
import type { Vec3 } from './math';
import type { ModelPart } from './model';

export type ThoraxSex = 'male' | 'female';

/* ------------------------------------------------------- Torso profile -- */

/**
 * The torso is defined by its silhouette: half-width and half-depth sampled
 * at a series of heights and interpolated smoothly between them. Written this
 * way because it is the shape a student recognises — narrow at the root of
 * the neck, broad across the shoulders, deepest at the mid-chest, drawn in at
 * the waist — and because each control point can be adjusted on its own.
 */
const PROFILE: { y: number; w: number; d: number }[] = [
  { y: 2.75, w: 0.5, d: 0.4 },
  { y: 2.52, w: 0.92, d: 0.6 },
  { y: 2.3, w: 1.42, d: 0.78 },
  { y: 2.0, w: 1.76, d: 0.9 },
  { y: 1.5, w: 1.9, d: 1.0 },
  { y: 0.7, w: 1.92, d: 1.06 },
  { y: -0.1, w: 1.8, d: 1.04 },
  { y: -0.9, w: 1.62, d: 0.96 },
  { y: -1.7, w: 1.46, d: 0.86 },
  { y: -2.35, w: 1.52, d: 0.88 },
  { y: -2.7, w: 1.42, d: 0.82 },
];

/** Smooth interpolation of the silhouette at any height. */
const profileAt = (y: number): { w: number; d: number } => {
  if (y >= PROFILE[0].y) return { w: PROFILE[0].w, d: PROFILE[0].d };
  const last = PROFILE[PROFILE.length - 1];
  if (y <= last.y) return { w: last.w, d: last.d };
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const a = PROFILE[i];
    const b = PROFILE[i + 1];
    if (y <= a.y && y >= b.y) {
      const t = (a.y - y) / (a.y - b.y);
      // Smoothstep, so the surface has no visible facets at the joins.
      const s = t * t * (3 - 2 * t);
      return { w: a.w + (b.w - a.w) * s, d: a.d + (b.d - a.d) * s };
    }
  }
  return { w: last.w, d: last.d };
};

const halfWidth = (y: number): number => profileAt(y).w;
const halfDepth = (y: number): number => profileAt(y).d;

/**
 * The cross-section is a superellipse rather than an ellipse: a human thorax
 * is flatter front and back and squarer at the sides than a true ellipse.
 */
const SUPER = 2.18;

const torsoPoint = (theta: number, y: number, inflate = 0): Vec3 => {
  const a = halfWidth(y) + inflate;
  const b = halfDepth(y) + inflate;
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / SUPER);
  const z = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / SUPER);
  return [x, y, z];
};

/** Breast contour added to the female chest wall, anterior surface only. */
const breastOffset = (x: number, y: number, z: number): number => {
  if (z <= 0) return 0;
  const cx = 0.98;
  const cy = 0.34;
  const dx = (Math.abs(x) - cx) / 0.86;
  const dy = (y - cy) / 0.74;
  const d = dx * dx + dy * dy;
  if (d > 1) return 0;
  // Smooth dome, tapering to nothing at its edge.
  return 0.42 * Math.pow(Math.cos((Math.PI / 2) * Math.sqrt(d)), 1.5);
};

/** Tapers the cross-section to a point at each end so the surface closes. */
const capFactor = (v: number): number => {
  const edge = 0.045;
  if (v < edge) return 0.12 + 0.88 * Math.sin((v / edge) * (Math.PI / 2));
  if (v > 1 - edge) return 0.12 + 0.88 * Math.sin(((1 - v) / edge) * (Math.PI / 2));
  return 1;
};

const buildChestWall = (sex: ThoraxSex): Geometry =>
  parametric(
    (u, v) => {
      const theta = u * Math.PI * 2;
      const y = 2.72 - v * 5.42; // from the root of the neck to the waist
      const cap = capFactor(v);
      const base = torsoPoint(theta, y);
      const p: Vec3 = [base[0] * cap, y, base[2] * cap];
      if (sex === 'female') {
        const off = breastOffset(p[0], p[1], p[2]);
        if (off > 0) {
          const len = Math.hypot(p[0], p[2]) || 1;
          return [p[0] + (p[0] / len) * off * 0.35, p[1] - off * 0.12, p[2] + off];
        }
      }
      return p;
    },
    64,
    56,
    { closeU: true },
  );

/** Neck and the suggestion of shoulders, so the chest reads as a body. */
const buildNeckAndShoulders = (): Geometry => {
  const neck = parametric(
    (u, v) => {
      const theta = u * Math.PI * 2;
      const y = 2.36 + v * 0.72;
      // Widest where it meets the chest, narrowing towards the throat.
      const r = 0.52 - v * 0.14;
      return [r * Math.cos(theta) * 1.02, y, r * Math.sin(theta) * 0.9 - 0.03];
    },
    28,
    12,
    { closeU: true },
  );

  // Deltoid caps: the rounded shoulders the arm electrodes sit just below.
  const shoulder = (side: 1 | -1): Geometry =>
    translate(ellipsoid(0.66, 0.58, 0.62, [0, 0, 0], 22), [side * 1.72, 1.86, 0.02]);

  return merge([neck, shoulder(1), shoulder(-1)]);
};

/* ----------------------------------------------------------- Skeleton -- */

/**
 * One rib, swept from the vertebral end round to the costal cartilage. Ribs
 * slope downwards and forwards, which is exactly why intercostal spaces are
 * counted from the sternal angle rather than from the clavicle.
 */
const buildRib = (index: number, side: 1 | -1): Geometry => {
  const yBack = 1.72 - index * 0.34;
  const yFront = yBack - 0.34 - index * 0.03;
  const spread = 0.84 + index * 0.028;
  const path: Vec3[] = spline(
    [
      [side * 0.18, yBack, -0.86],
      [side * 0.86 * spread, yBack - 0.05, -0.86],
      [side * 1.62 * spread, yBack - 0.16, -0.24],
      [side * 1.66 * spread, yFront + 0.06, 0.5],
      [side * 1.16, yFront - 0.02, 0.9],
      [side * 0.42, yFront - 0.04, 0.96],
    ],
    9,
  );
  return tube(path, 0.062, { radialSegments: 8, capStart: true, capEnd: true });
};

const buildRibCage = (): Geometry => {
  const parts: Geometry[] = [];
  for (let i = 0; i < 7; i++) {
    parts.push(buildRib(i, 1));
    parts.push(buildRib(i, -1));
  }
  return merge(parts);
};

/** Manubrium, body and xiphoid process, with the sternal angle between the first two. */
const buildSternum = (): Geometry => {
  const slab = (
    yTop: number,
    yBottom: number,
    wTop: number,
    wBottom: number,
    zTop: number,
    zBottom: number,
  ): Geometry =>
    parametric(
      (u, v) => {
        const theta = u * Math.PI * 2;
        const t = v;
        const y = yTop + (yBottom - yTop) * t;
        const w = wTop + (wBottom - wTop) * t;
        const z = zTop + (zBottom - zTop) * t;
        return [w * Math.cos(theta), y, z + 0.075 * Math.sin(theta)];
      },
      20,
      10,
      { closeU: true },
    );

  return merge([
    slab(1.95, 1.36, 0.34, 0.3, 0.97, 1.0), // manubrium
    slab(1.34, -0.3, 0.28, 0.24, 1.0, 0.93), // body
    slab(-0.3, -0.56, 0.16, 0.08, 0.93, 0.88), // xiphoid process
  ]);
};

const buildClavicles = (): Geometry => {
  const one = (side: 1 | -1): Geometry =>
    tube(
      spline(
        [
          [side * 0.2, 1.98, 0.9],
          [side * 0.8, 2.08, 0.78],
          [side * 1.4, 2.06, 0.42],
          [side * 1.86, 1.94, 0.04],
        ],
        8,
      ),
      0.085,
      { radialSegments: 8, capStart: true, capEnd: true },
    );
  return merge([one(1), one(-1)]);
};

/* ------------------------------------------------------------- Organs -- */

/**
 * The heart in its true position: two-thirds to the left of the midline,
 * base at the level of the second costal cartilage, apex at the fifth
 * intercostal space in the midclavicular line — which is the whole reason
 * V4 and the mitral area are where they are.
 */
const buildHeartSilhouette = (): Geometry => {
  const body = parametric(
    (u, v) => {
      const theta = u * Math.PI * 2;
      const t = v;
      // Long axis from the base (upper right) to the apex (lower left).
      const cx = 0.16 + t * 0.92;
      const cy = 1.06 - t * 1.02;
      const cz = 0.32 + t * 0.2;
      const r = 0.74 * Math.pow(Math.sin(Math.PI * Math.pow(Math.min(1, t + 0.06), 0.62)), 0.85);
      return [cx + r * Math.cos(theta), cy + r * Math.sin(theta) * 0.92, cz + r * Math.sin(theta) * 0.42];
    },
    36,
    26,
    { closeU: true },
  );
  const rightBorder = translate(ellipsoid(0.42, 0.6, 0.36, [0, 0, 0], 20), [-0.34, 0.72, 0.34]);
  const outflow = tube(
    spline(
      [
        [0.12, 0.98, 0.42],
        [0.02, 1.34, 0.4],
        [-0.12, 1.62, 0.24],
      ],
      6,
    ),
    0.24,
    { radialSegments: 10, capStart: true, capEnd: true },
  );
  return merge([body, rightBorder, outflow]);
};

const buildLungs = (): Geometry => {
  const one = (side: 1 | -1): Geometry =>
    parametric(
      (u, v) => {
        const theta = u * Math.PI * 2;
        const y = 1.86 - v * 3.1;
        const w = 0.72 * Math.sin(Math.PI * Math.pow(Math.min(1, v + 0.12), 0.5)) + 0.12;
        const notch = side > 0 ? Math.max(0, 1 - Math.abs(y - 0.2) / 1.1) * 0.3 : 0;
        return [
          side * (0.52 + w * 0.9 - notch) + side * w * Math.cos(theta) * 0.62,
          y,
          w * Math.sin(theta) * 0.86 - 0.02,
        ];
      },
      26,
      22,
      { closeU: true },
    );
  return merge([one(1), one(-1)]);
};

/* ------------------------------------------------------------ Markers -- */

/**
 * The point on the anterior chest wall at a given lateral offset and height,
 * pushed a little proud of the skin so a marker sits on it rather than in it.
 *
 * The lateral coordinate is honoured exactly — inverting the superellipse for
 * the angle rather than guessing it from a nominal depth — because the whole
 * teaching point of this module is that V4 is *at* the midclavicular line and
 * V6 is *at* the mid-axillary line. The z in the content files is advisory;
 * the chest wall decides the depth.
 */
export const surfacePoint = (p: Vec3, sex: ThoraxSex, lift = 0.055): Vec3 => {
  const [x, y] = p;
  const a = halfWidth(y);
  const b = halfDepth(y);
  // Solve x = a·sign(cosθ)·|cosθ|^(2/SUPER) for θ, keeping to the front half.
  const u = Math.max(-0.985, Math.min(0.985, x / a));
  const cosTheta = Math.sign(u) * Math.pow(Math.abs(u), SUPER / 2);
  const theta = Math.acos(Math.max(-1, Math.min(1, cosTheta)));
  const base = torsoPoint(theta, y);
  const extra = sex === 'female' ? breastOffset(base[0], base[1], base[2]) : 0;

  // Outward normal of the superellipse in the transverse plane.
  const nx = base[0] / (a * a);
  const nz = Math.max(0.05, base[2]) / (b * b);
  const len = Math.hypot(nx, nz) || 1;

  return [
    base[0] + (nx / len) * (lift + extra * 0.35),
    base[1] - extra * 0.12,
    base[2] + (nz / len) * lift + extra,
  ];
};

/** A flat disc lying on the chest wall — an electrode or an auscultation point. */
const buildDisc = (
  centre: Vec3,
  radius: number,
  thickness = 0.035,
  uSegments = 18,
  vSegments = 8,
): Geometry => {
  const nx = centre[0];
  const nz = centre[2];
  const len = Math.hypot(nx, nz) || 1;
  const n: Vec3 = [nx / len, 0, nz / len];
  // Two tangent vectors to the surface normal.
  const t1: Vec3 = [-n[2], 0, n[0]];
  const t2: Vec3 = [0, 1, 0];
  return parametric(
    (u, v) => {
      const theta = u * Math.PI * 2;
      const depth = (v - 0.5) * thickness * 2;
      const r = radius * Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(v * 2 - 1), 6)));
      return [
        centre[0] + t1[0] * Math.cos(theta) * r + t2[0] * Math.sin(theta) * r + n[0] * depth,
        centre[1] + t1[1] * Math.cos(theta) * r + t2[1] * Math.sin(theta) * r + n[1] * depth,
        centre[2] + t1[2] * Math.cos(theta) * r + t2[2] * Math.sin(theta) * r + n[2] * depth,
      ];
    },
    uSegments,
    vSegments,
    { closeU: true },
  );
};

export interface ThoraxMarker {
  /** Mesh name, e.g. "lead.v4", "site.mitral" or "landmark.sternal-angle". */
  name: string;
  position: Vec3;
  color: string;
  radius: number;
}

export interface ThoraxModel {
  parts: ModelPart[];
  /** Every marker, so the workspace can map a picked mesh back to content. */
  markers: ThoraxMarker[];
}

export interface ThoraxOptions {
  sex: ThoraxSex;
  /** Electrode positions from content/exam/leads.json. */
  leads: { id: string; position: Vec3; color: string }[];
  /** Auscultation areas from content/exam/auscultation.json. */
  sites: { id: string; position: Vec3 }[];
  /** Surface landmarks from content/exam/landmarks.json. */
  landmarks: { id: string; position: Vec3 }[];
}

export const buildThoraxModel = (options: ThoraxOptions): ThoraxModel => {
  const { sex, leads, sites, landmarks } = options;
  const markers: ThoraxMarker[] = [];
  const parts: ModelPart[] = [];

  parts.push({
    name: 'thorax.chest_wall',
    geometry: buildChestWall(sex),
    color: '#eab694',
    groups: [],
    opacity: 0.44,
    order: 40,
  });
  parts.push({
    name: 'thorax.neck',
    geometry: buildNeckAndShoulders(),
    color: '#eab694',
    groups: [],
    opacity: 0.44,
    order: 41,
  });
  parts.push({
    name: 'thorax.lungs',
    geometry: buildLungs(),
    color: '#9fb6c9',
    groups: [],
    opacity: 0.16,
    order: 30,
  });
  parts.push({
    name: 'thorax.ribs',
    geometry: buildRibCage(),
    color: '#efe6d2',
    groups: [],
    opacity: 0.3,
    order: 20,
  });
  parts.push({
    name: 'thorax.sternum',
    geometry: buildSternum(),
    color: '#f2ecdc',
    groups: [],
    opacity: 0.66,
    order: 21,
  });
  parts.push({
    name: 'thorax.clavicles',
    geometry: buildClavicles(),
    color: '#f2ecdc',
    groups: [],
    opacity: 0.62,
    order: 22,
  });
  parts.push({
    name: 'thorax.heart',
    geometry: buildHeartSilhouette(),
    color: '#d04a60',
    groups: [],
    opacity: 0.62,
    order: 10,
  });

  /* surface landmarks */
  for (const l of landmarks) {
    const p = surfacePoint(l.position, sex, 0.09);
    const name = `landmark.${l.id}`;
    parts.push({
      name,
      geometry: buildDisc(p, 0.075, 0.02),
      color: '#7fd0f0',
      groups: [],
      opacity: 0.55,
      order: 55,
    });
    markers.push({ name, position: p, color: '#7fd0f0', radius: 0.075 });
  }

  /* auscultation areas */
  for (const s of sites) {
    const p = surfacePoint(s.position, sex, 0.12);
    const name = `site.${s.id}`;
    parts.push({
      name,
      geometry: buildDisc(p, 0.19, 0.03),
      color: '#f0c65a',
      groups: [],
      opacity: 0.92,
      order: 60,
    });
    markers.push({ name, position: p, color: '#f0c65a', radius: 0.19 });
  }

  /* ECG electrodes */
  for (const lead of leads) {
    const p = surfacePoint(lead.position, sex, 0.12);
    const name = `lead.${lead.id}`;
    parts.push({
      name,
      geometry: merge([buildDisc(p, 0.16, 0.045), buildDisc(p, 0.07, 0.075)]),
      color: lead.color,
      groups: [],
      opacity: 0.95,
      order: 61,
    });
    markers.push({ name, position: p, color: lead.color, radius: 0.16 });
  }

  return { parts, markers };
};

/** Camera framing that puts the whole chest comfortably in view. */
export const THORAX_CAMERA = {
  radius: 13.4,
  target: [0, 0.25, 0] as Vec3,
};

/** A permissive view mode: the thorax controls visibility through hiding. */
export const THORAX_VIEW = {
  id: 'full' as const,
  label: 'Thorax',
  description: 'The chest wall, thoracic skeleton and heart.',
  emphasise: 'all' as const,
  context: [],
  camera: THORAX_CAMERA,
};
