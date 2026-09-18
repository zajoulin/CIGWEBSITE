/* ==========================================================================
   cardio3d — the procedural cardiovascular model
   --------------------------------------------------------------------------
   Builds every anatomical structure as a separately named, individually
   selectable mesh. Mesh names match the `meshName` field in the anatomy
   content, so the viewer, the sidebar and the information panel all address
   the same identifiers.

   Coordinate frame (standard anatomical, anterior view):
     +X  patient's LEFT      (screen right)
     +Y  SUPERIOR            (screen up)
     +Z  ANTERIOR            (towards the viewer)

   This is a schematic, diagrammatic model built from parametric surfaces —
   it is anatomically arranged rather than photorealistic, and is labelled as
   such in the interface. See loader.ts for dropping in a licensed GLB/GLTF
   model instead, without changing anything else.
   ========================================================================== */

import type { Geometry } from './geometry';
import {
  ellipsoid,
  merge,
  parametric,
  rotate,
  spline,
  torus,
  translate,
  tube,
} from './geometry';
import type { Vec3 } from './math';
import { add, cross, lerp3, normalize, scale, sub } from './math';

export type PartGroup =
  | 'chambers'
  | 'valves'
  | 'septa'
  | 'coronary'
  | 'conduction'
  | 'great-vessels'
  | 'arteries'
  | 'veins'
  | 'peripheral';

export interface ModelPart {
  /** Matches AnatomicalStructure.meshName, e.g. "heart.left_ventricle". */
  name: string;
  geometry: Geometry;
  color: string;
  groups: PartGroup[];
  /** Base opacity; chambers are slightly translucent so internals read. */
  opacity: number;
  /** Larger values render later in the transparent pass. */
  order: number;
}

/* ---------------------------------------------------- Anatomical frame -- */

/** Left ventricular long axis: base of the heart down to the apex. */
const LV_BASE: Vec3 = [0.08, 0.60, -0.04];
const LV_APEX: Vec3 = [0.60, -1.12, 0.24];

const lvAxis = normalize(sub(LV_APEX, LV_BASE));
const lvSide = normalize(cross([0, 1, 0], lvAxis));
const lvUp = normalize(cross(lvAxis, lvSide));

/** A point on the LV long axis, v = 0 at the base, 1 at the apex. */
const lvCentre = (v: number): Vec3 => lerp3(LV_BASE, LV_APEX, v);

/** LV outer radius profile — widest in the upper third, tapering to the apex. */
const lvRadius = (v: number): number =>
  0.615 * Math.pow(Math.sin(Math.PI * Math.pow(Math.min(1, Math.max(0, v)), 0.55)), 0.8);

/** Converts (angle, radius, v) in the LV frame to world space. */
const lvPoint = (theta: number, radius: number, v: number, squashZ = 0.88): Vec3 => {
  const c = lvCentre(v);
  const a = scale(lvSide, Math.cos(theta) * radius);
  const b = scale(lvUp, Math.sin(theta) * radius * squashZ);
  return add(c, add(a, b));
};

/* ------------------------------------------------------ Chamber shapes -- */

const buildLeftVentricle = (): Geometry =>
  parametric(
    (u, v) => lvPoint(u * Math.PI * 2, lvRadius(v), v),
    44,
    36,
    { closeU: true },
  );

/**
 * A crescentic shell wrapping the left ventricle — the right ventricle, and
 * (with a much smaller bulge) the interventricular septum.
 */
const buildCrescent = (
  thetaCentre: number,
  thetaSpread: number,
  bulge: number,
  vStart: number,
  vEnd: number,
  gap: number,
): Geometry =>
  parametric(
    (u, v) => {
      const vv = vStart + (vEnd - vStart) * v;
      const inner = lvRadius(vv) + gap;
      // Taper the bulge to zero at both ends so the shell closes on itself.
      const ends = Math.sin(Math.PI * Math.min(1, Math.max(0, v))) ** 0.6;

      const onOuter = u < 0.5;
      const t = onOuter ? u * 2 : (1 - u) * 2;
      const theta = thetaCentre + (t - 0.5) * 2 * thetaSpread;
      // Bulge peaks at the middle of the arc and falls to zero at its edges.
      const across = Math.cos((t - 0.5) * Math.PI) ** 1.5;
      const r = inner + (onOuter ? bulge * across * ends : 0);
      return lvPoint(theta, r, vv);
    },
    56,
    30,
    { closeU: true },
  );

const buildRightVentricle = (): Geometry => {
  // Centred anteriorly and towards the patient's right of the LV.
  const dir = normalize([-0.62, 0, 0.78]);
  const theta = Math.atan2(
    dir[0] * lvUp[0] + dir[1] * lvUp[1] + dir[2] * lvUp[2],
    dir[0] * lvSide[0] + dir[1] * lvSide[1] + dir[2] * lvSide[2],
  );
  // The right ventricle wraps the left anteriorly but is thin-walled and much
  // smaller — roughly one third of the left ventricular wall thickness.
  const body = buildCrescent(theta, 1.10, 0.215, 0.04, 0.72, 0.045);
  // Infundibulum (right ventricular outflow tract) rising to the pulmonary valve.
  const outflow = tube(
    spline(
      [
        [-0.32, 0.36, 0.30],
        [-0.28, 0.56, 0.36],
        [-0.23, 0.72, 0.38],
        [-0.19, 0.84, 0.36],
      ],
      8,
    ),
    (t) => 0.205 - 0.055 * t,
    { radialSegments: 20 },
  );
  return merge([body, outflow]);
};

const buildInterventricularSeptum = (): Geometry => {
  const dir = normalize([-0.62, 0, 0.78]);
  const theta = Math.atan2(
    dir[0] * lvUp[0] + dir[1] * lvUp[1] + dir[2] * lvUp[2],
    dir[0] * lvSide[0] + dir[1] * lvSide[1] + dir[2] * lvSide[2],
  );
  return buildCrescent(theta, 0.96, 0.024, 0.06, 0.72, 0.010);
};

const buildRightAtrium = (): Geometry => {
  const body = ellipsoid(0.37, 0.32, 0.35, [-0.60, 0.80, 0.04], 30);
  // Right auricle projecting anteriorly.
  const auricle = ellipsoid(0.17, 0.12, 0.14, [-0.44, 0.71, 0.29], 20);
  return merge([body, auricle]);
};

const buildLeftAtrium = (): Geometry => {
  const body = ellipsoid(0.38, 0.30, 0.35, [0.30, 0.84, -0.44], 30);
  // Left atrial appendage, narrow-necked and projecting anteriorly.
  const appendage = tube(
    spline(
      [
        [0.44, 0.80, -0.22],
        [0.56, 0.72, -0.05],
        [0.60, 0.60, 0.08],
      ],
      8,
    ),
    (t) => 0.10 - 0.03 * t,
    { radialSegments: 14, capEnd: true },
  );
  return merge([body, appendage]);
};

const buildInteratrialSeptum = (): Geometry => {
  const slab = ellipsoid(0.30, 0.29, 0.028, [0, 0, 0], 26);
  // Oriented obliquely between the two atria.
  return translate(rotate(slab, 0.12, -0.62, 0), [-0.16, 0.80, -0.20]);
};

/* -------------------------------------------------------------- Valves -- */

/**
 * A valve: an annular ring plus `count` leaflets curving inwards and along the
 * flow direction. Built in a local frame then rotated and translated.
 */
const buildValve = (
  centre: Vec3,
  radius: number,
  count: number,
  rx: number,
  ry: number,
  rz: number,
  depth = 0.16,
): Geometry => {
  const ring = torus(radius, radius * 0.13, 32, 10);
  const leaflets: Geometry[] = [];
  const span = (Math.PI * 2) / count;

  for (let i = 0; i < count; i++) {
    const base = i * span;
    leaflets.push(
      parametric(
        (u, v) => {
          // u sweeps across the leaflet's arc, v runs from the annulus to the free edge.
          const a = base + span * (0.06 + u * 0.88);
          // Free edges converge towards the centre and drop along the flow axis.
          const r = radius * (1 - v * 0.86) * (1 - 0.1 * Math.sin(u * Math.PI));
          const y = -depth * v * (0.55 + 0.45 * Math.sin(u * Math.PI));
          return [r * Math.cos(a), y, r * Math.sin(a)];
        },
        14,
        10,
      ),
    );
  }
  return translate(rotate(merge([ring, ...leaflets]), rx, ry, rz), centre);
};

/* ------------------------------------------------------- Great vessels -- */

const buildAorta = (): Geometry => {
  const path = spline(
    [
      [0.02, 0.62, 0.02],
      [-0.08, 0.95, 0.12],
      [-0.15, 1.44, 0.06],
      [-0.06, 1.90, -0.08],
      [0.20, 1.96, -0.28],
      [0.29, 1.62, -0.44],
      [0.25, 1.05, -0.50],
      [0.22, 0.20, -0.53],
      [0.19, -0.80, -0.55],
      [0.16, -2.05, -0.56],
    ],
    9,
  );
  return tube(
    path,
    (t) => {
      // Sinuses of Valsalva at the root, then a gentle taper along the arch.
      const sinus = 0.055 * Math.exp(-Math.pow((t - 0.035) / 0.045, 2));
      return 0.135 - 0.035 * Math.min(1, t * 1.4) + sinus;
    },
    { radialSegments: 22, capStart: true },
  );
};

const buildPulmonaryTrunk = (): Geometry =>
  tube(
    spline(
      [
        [-0.19, 0.86, 0.35],
        [-0.14, 1.10, 0.28],
        [-0.02, 1.34, 0.12],
        [0.07, 1.44, 0.00],
      ],
      9,
    ),
    (t) => 0.135 - 0.012 * t,
    { radialSegments: 20, capStart: true },
  );

const buildPulmonaryArteries = (): Geometry => {
  const right = tube(
    spline(
      [
        [0.05, 1.44, 0.02],
        [-0.30, 1.42, -0.06],
        [-0.78, 1.34, -0.16],
        [-1.24, 1.22, -0.24],
      ],
      8,
    ),
    (t) => 0.095 - 0.038 * t,
    { radialSegments: 14, capEnd: true },
  );
  const left = tube(
    spline(
      [
        [0.09, 1.45, -0.02],
        [0.44, 1.48, -0.12],
        [0.92, 1.40, -0.22],
        [1.30, 1.28, -0.30],
      ],
      8,
    ),
    (t) => 0.092 - 0.036 * t,
    { radialSegments: 14, capEnd: true },
  );
  return merge([right, left]);
};

const buildPulmonaryVeins = (): Geometry => {
  const targets: Vec3[][] = [
    [[0.02, 1.02, -0.56], [-0.45, 1.10, -0.66], [-0.92, 1.12, -0.72]],
    [[0.04, 0.66, -0.62], [-0.42, 0.60, -0.72], [-0.88, 0.55, -0.78]],
    [[0.62, 1.00, -0.56], [1.05, 1.08, -0.64], [1.42, 1.10, -0.70]],
    [[0.62, 0.64, -0.62], [1.04, 0.58, -0.70], [1.40, 0.54, -0.76]],
  ];
  return merge(
    targets.map((pts) =>
      tube(spline(pts, 8), (t) => 0.068 - 0.012 * t, { radialSegments: 12, capEnd: true }),
    ),
  );
};

const buildSvc = (): Geometry =>
  tube(
    spline(
      [
        [-0.62, 0.86, 0.02],
        [-0.62, 1.20, 0.00],
        [-0.60, 1.80, -0.02],
        [-0.58, 2.45, -0.04],
      ],
      8,
    ),
    0.112,
    { radialSegments: 16, capEnd: true },
  );

const buildIvc = (): Geometry =>
  tube(
    spline(
      [
        [-0.58, 0.56, -0.02],
        [-0.54, 0.10, -0.08],
        [-0.47, -0.70, -0.14],
        [-0.42, -2.05, -0.18],
      ],
      8,
    ),
    (t) => 0.108 + 0.022 * t,
    { radialSegments: 16, capEnd: true },
  );

/* ---------------------------------------------------------- Coronaries -- */

const buildCoronaryArteries = (): Geometry => {
  const lad = tube(
    spline(
      [
        [0.09, 0.66, 0.13],
        [0.10, 0.48, 0.32],
        [0.16, 0.08, 0.44],
        [0.30, -0.36, 0.42],
        [0.48, -0.84, 0.32],
        [0.58, -1.04, 0.23],
      ],
      9,
    ),
    (t) => 0.032 - 0.016 * t,
    { radialSegments: 10, capStart: true, capEnd: true },
  );
  const circumflex = tube(
    spline(
      [
        [0.11, 0.66, 0.10],
        [0.36, 0.58, 0.00],
        [0.62, 0.36, -0.26],
        [0.70, 0.02, -0.46],
        [0.60, -0.32, -0.50],
      ],
      9,
    ),
    (t) => 0.028 - 0.013 * t,
    { radialSegments: 10, capEnd: true },
  );
  const rca = tube(
    spline(
      [
        [-0.08, 0.64, 0.14],
        [-0.40, 0.50, 0.30],
        [-0.63, 0.16, 0.16],
        [-0.62, -0.14, -0.16],
        [-0.40, -0.36, -0.44],
        [-0.04, -0.58, -0.46],
        [0.24, -0.88, -0.32],
      ],
      9,
    ),
    (t) => 0.032 - 0.015 * t,
    { radialSegments: 10, capStart: true, capEnd: true },
  );
  const diagonal = tube(
    spline([[0.15, 0.05, 0.43], [0.42, -0.10, 0.28], [0.63, -0.28, 0.06]], 7),
    (t) => 0.019 - 0.008 * t,
    { radialSegments: 8, capEnd: true },
  );
  const marginal = tube(
    spline([[-0.62, -0.05, -0.02], [-0.52, -0.42, 0.16], [-0.30, -0.68, 0.22]], 7),
    (t) => 0.019 - 0.008 * t,
    { radialSegments: 8, capEnd: true },
  );
  return merge([lad, circumflex, rca, diagonal, marginal]);
};

const buildCoronaryVeins = (): Geometry => {
  const greatCardiac = tube(
    spline(
      [
        [0.52, -0.94, 0.28],
        [0.36, -0.44, 0.44],
        [0.22, 0.02, 0.42],
        [0.19, 0.42, 0.28],
        [0.30, 0.54, 0.04],
      ],
      8,
    ),
    (t) => 0.020 + 0.018 * t,
    { radialSegments: 10, capStart: true },
  );
  const coronarySinus = tube(
    spline(
      [
        [0.34, 0.52, 0.00],
        [0.44, 0.42, -0.36],
        [0.10, 0.44, -0.58],
        [-0.26, 0.48, -0.44],
        [-0.50, 0.52, -0.18],
      ],
      9,
    ),
    (t) => 0.040 + 0.014 * t,
    { radialSegments: 12, capEnd: true },
  );
  const middleCardiac = tube(
    spline([[0.30, -0.92, -0.28], [0.10, -0.50, -0.46], [0.02, -0.06, -0.56], [0.06, 0.34, -0.58]], 8),
    (t) => 0.018 + 0.016 * t,
    { radialSegments: 10, capStart: true },
  );
  return merge([greatCardiac, coronarySinus, middleCardiac]);
};

/* ---------------------------------------------------- Conduction system -- */

const buildSaNode = (): Geometry =>
  translate(rotate(ellipsoid(0.105, 0.045, 0.055, [0, 0, 0], 18), 0, 0, 0.35), [-0.60, 1.02, 0.10]);

const buildAvNode = (): Geometry => ellipsoid(0.062, 0.048, 0.055, [-0.22, 0.50, -0.06], 18);

const buildBundleOfHis = (): Geometry => {
  const penetrating = tube(
    spline([[-0.22, 0.48, -0.06], [-0.13, 0.38, -0.02], [-0.03, 0.28, 0.02]], 7),
    0.028,
    { radialSegments: 8, capStart: true },
  );
  const rightBundle = tube(
    spline([[-0.03, 0.27, 0.03], [-0.14, 0.02, 0.20], [-0.26, -0.28, 0.30], [-0.30, -0.58, 0.28]], 8),
    (t) => 0.024 - 0.008 * t,
    { radialSegments: 8, capEnd: true },
  );
  const leftAnterior = tube(
    spline([[-0.02, 0.26, 0.01], [0.14, 0.02, 0.06], [0.30, -0.28, 0.14], [0.42, -0.56, 0.16]], 8),
    (t) => 0.024 - 0.008 * t,
    { radialSegments: 8, capEnd: true },
  );
  const leftPosterior = tube(
    spline([[-0.02, 0.26, -0.02], [0.12, 0.00, -0.14], [0.28, -0.32, -0.22], [0.40, -0.60, -0.20]], 8),
    (t) => 0.024 - 0.008 * t,
    { radialSegments: 8, capEnd: true },
  );
  return merge([penetrating, rightBundle, leftAnterior, leftPosterior]);
};

/**
 * The subendocardial Purkinje network.
 *
 * Branches are grown in the left ventricle's own (angle, depth) surface
 * coordinates and only then mapped into world space, so every fibre stays on
 * the endocardial surface where it belongs instead of drifting outside the
 * ventricular silhouette. Deterministic pseudo-random, so the model is
 * identical on every load.
 */
const buildPurkinjeFibres = (): Geometry => {
  let seed = 20260907;
  const rnd = (): number => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const parts: Geometry[] = [];
  /** Just inside the endocardial surface. */
  const surfaceAt = (theta: number, v: number): Vec3 =>
    lvPoint(theta, lvRadius(Math.min(0.985, Math.max(0.04, v))) * 0.9, Math.min(0.985, Math.max(0.04, v)));

  const grow = (
    theta: number,
    v: number,
    dTheta: number,
    dV: number,
    radius: number,
    depth: number,
  ): void => {
    if (depth > 3 || radius < 0.005 || v > 0.97) return;
    const t1 = theta + dTheta;
    const v1 = Math.min(0.97, v + dV);
    const tMid = theta + dTheta * 0.5 + (rnd() - 0.5) * 0.12;
    const vMid = v + dV * 0.5;

    const path = [0, 0.25, 0.5, 0.75, 1].map((s) =>
      surfaceAt(theta + (t1 - theta) * s + Math.sin(s * Math.PI) * (tMid - (theta + (t1 - theta) * 0.5)), v + (v1 - v) * s + Math.sin(s * Math.PI) * (vMid - (v + (v1 - v) * 0.5))),
    );
    parts.push(
      tube(spline(path, 4), (t) => radius * (1 - 0.32 * t), { radialSegments: 6, capEnd: true }),
    );

    if (depth === 3) return;
    for (let i = 0; i < 2; i++) {
      grow(
        t1,
        v1,
        dTheta * (0.55 + rnd() * 0.5) + (i === 0 ? -0.22 : 0.22) - 0.02,
        dV * (0.6 + rnd() * 0.45),
        radius * 0.74,
        depth + 1,
      );
    }
  };

  // Seeded where the bundle branches reach the endocardium, then fanning
  // towards the apex across both septal and free-wall surfaces.
  const seeds: { theta: number; v: number }[] = [
    { theta: 2.05, v: 0.42 },
    { theta: 2.55, v: 0.40 },
    { theta: -2.35, v: 0.44 },
    { theta: -1.85, v: 0.40 },
    { theta: 0.35, v: 0.46 },
    { theta: -0.55, v: 0.45 },
  ];

  for (const s of seeds) {
    grow(s.theta, s.v, (rnd() - 0.5) * 0.55, 0.20 + rnd() * 0.08, 0.014, 1);
  }

  return merge(parts);
};

/* ------------------------------------------------ Peripheral vasculature -- */

const buildSystemicArteries = (): Geometry => {
  const t = (pts: Vec3[], r0: number, r1: number, seg = 12): Geometry =>
    tube(spline(pts, 8), (x) => r0 + (r1 - r0) * x, { radialSegments: seg, capEnd: true });

  return merge([
    // Brachiocephalic trunk and its branches
    t([[-0.14, 1.82, -0.04], [-0.30, 2.06, -0.02], [-0.38, 2.20, 0.00]], 0.075, 0.062),
    t([[-0.38, 2.18, 0.00], [-0.34, 2.44, 0.02], [-0.30, 2.72, 0.04]], 0.052, 0.040),
    t([[-0.38, 2.18, 0.00], [-0.60, 2.26, 0.04], [-0.92, 2.30, 0.06]], 0.050, 0.036),
    // Left common carotid and left subclavian
    t([[-0.01, 1.93, -0.12], [0.06, 2.32, -0.08], [0.12, 2.72, -0.04]], 0.050, 0.038),
    t([[0.12, 1.94, -0.20], [0.46, 2.14, -0.12], [0.86, 2.24, -0.04]], 0.050, 0.036),
    // Abdominal aorta bifurcation into common iliac and femoral arteries
    t([[0.16, -2.02, -0.56], [0.32, -2.34, -0.52], [0.48, -2.62, -0.44]], 0.070, 0.052),
    t([[0.48, -2.62, -0.44], [0.56, -2.90, -0.36], [0.60, -3.16, -0.30]], 0.048, 0.038),
    t([[0.16, -2.02, -0.56], [-0.02, -2.34, -0.52], [-0.16, -2.62, -0.44]], 0.070, 0.052),
    t([[-0.16, -2.62, -0.44], [-0.26, -2.90, -0.36], [-0.30, -3.16, -0.30]], 0.048, 0.038),
  ]);
};

const buildSystemicVeins = (): Geometry => {
  const t = (pts: Vec3[], r0: number, r1: number, seg = 12): Geometry =>
    tube(spline(pts, 8), (x) => r0 + (r1 - r0) * x, { radialSegments: seg, capEnd: true });

  return merge([
    // Right internal jugular and subclavian veins into the SVC
    t([[-0.52, 2.72, 0.14], [-0.56, 2.52, 0.10], [-0.58, 2.32, 0.06]], 0.045, 0.062),
    t([[-0.98, 2.40, 0.12], [-0.76, 2.36, 0.10], [-0.60, 2.34, 0.06]], 0.042, 0.058),
    // Left internal jugular and subclavian veins crossing to the SVC
    t([[0.10, 2.72, 0.10], [0.02, 2.56, 0.10], [-0.06, 2.44, 0.08]], 0.045, 0.058),
    t([[0.90, 2.36, 0.06], [0.42, 2.42, 0.10], [-0.06, 2.44, 0.08]], 0.042, 0.056),
    t([[-0.06, 2.44, 0.08], [-0.36, 2.40, 0.06], [-0.57, 2.42, 0.02]], 0.058, 0.070),
    // Common iliac and femoral veins into the IVC
    t([[-0.42, -2.02, -0.18], [-0.58, -2.34, -0.20], [-0.72, -2.62, -0.18]], 0.072, 0.054),
    t([[-0.72, -2.62, -0.18], [-0.80, -2.90, -0.14], [-0.84, -3.16, -0.10]], 0.050, 0.040),
    t([[-0.42, -2.02, -0.18], [-0.24, -2.34, -0.20], [-0.10, -2.62, -0.18]], 0.072, 0.054),
    t([[-0.10, -2.62, -0.18], [0.00, -2.90, -0.14], [0.04, -3.16, -0.10]], 0.050, 0.040),
  ]);
};

/* ------------------------------------------------------- Model assembly -- */

let cached: ModelPart[] | null = null;

/** Builds (and memoises) the full cardiovascular model. */
export const buildCardiovascularModel = (): ModelPart[] => {
  if (cached) return cached;

  const parts: ModelPart[] = [
    // --- Chambers
    {
      name: 'heart.left_ventricle',
      geometry: buildLeftVentricle(),
      color: '#d84a63',
      groups: ['chambers'],
      opacity: 0.9,
      order: 1,
    },
    {
      name: 'heart.right_ventricle',
      geometry: buildRightVentricle(),
      color: '#5b8fd6',
      groups: ['chambers'],
      opacity: 0.86,
      order: 2,
    },
    {
      name: 'heart.left_atrium',
      geometry: buildLeftAtrium(),
      color: '#d4576f',
      groups: ['chambers'],
      opacity: 0.86,
      order: 1,
    },
    {
      name: 'heart.right_atrium',
      geometry: buildRightAtrium(),
      color: '#4f7fc4',
      groups: ['chambers'],
      opacity: 0.86,
      order: 2,
    },

    // --- Septa
    {
      name: 'heart.interventricular_septum',
      geometry: buildInterventricularSeptum(),
      color: '#9aa8bd',
      groups: ['septa'],
      opacity: 1,
      order: 0,
    },
    {
      name: 'heart.interatrial_septum',
      geometry: buildInteratrialSeptum(),
      color: '#8f9db2',
      groups: ['septa'],
      opacity: 1,
      order: 0,
    },

    // --- Valves
    {
      name: 'heart.tricuspid_valve',
      geometry: buildValve([-0.33, 0.44, 0.14], 0.235, 3, 0.30, 0.5, 0.30),
      color: '#a8dbe8',
      groups: ['valves'],
      opacity: 1,
      order: 0,
    },
    {
      name: 'heart.mitral_valve',
      geometry: buildValve([0.24, 0.50, -0.20], 0.205, 2, 0.26, -0.4, -0.26),
      color: '#8fd0e0',
      groups: ['valves'],
      opacity: 1,
      order: 0,
    },
    {
      name: 'heart.pulmonary_valve',
      geometry: buildValve([-0.19, 0.86, 0.35], 0.135, 3, -0.42, 0.2, 0.1, 0.11),
      color: '#7cc3d8',
      groups: ['valves'],
      opacity: 1,
      order: 0,
    },
    {
      name: 'heart.aortic_valve',
      geometry: buildValve([0.02, 0.63, 0.02], 0.13, 3, -0.16, 0.1, 0.14, 0.11),
      color: '#9ad8e6',
      groups: ['valves'],
      opacity: 1,
      order: 0,
    },

    // --- Coronary circulation
    {
      name: 'heart.coronary_arteries',
      geometry: buildCoronaryArteries(),
      color: '#ef5350',
      groups: ['coronary', 'arteries'],
      opacity: 1,
      order: 0,
    },
    {
      name: 'heart.coronary_veins',
      geometry: buildCoronaryVeins(),
      color: '#5f86c9',
      groups: ['coronary', 'veins'],
      opacity: 1,
      order: 0,
    },

    // --- Conduction system
    {
      name: 'heart.sa_node',
      geometry: buildSaNode(),
      color: '#f2b544',
      groups: ['conduction'],
      opacity: 1,
      order: 0,
    },
    {
      name: 'heart.av_node',
      geometry: buildAvNode(),
      color: '#f2b544',
      groups: ['conduction'],
      opacity: 1,
      order: 0,
    },
    {
      name: 'heart.bundle_of_his',
      geometry: buildBundleOfHis(),
      color: '#f5c65f',
      groups: ['conduction'],
      opacity: 1,
      order: 0,
    },
    {
      name: 'heart.purkinje_fibers',
      geometry: buildPurkinjeFibres(),
      color: '#f8d98a',
      groups: ['conduction'],
      opacity: 1,
      order: 0,
    },

    // --- Great vessels
    {
      name: 'vessels.aorta',
      geometry: buildAorta(),
      color: '#e05a70',
      groups: ['great-vessels', 'arteries'],
      opacity: 1,
      order: 0,
    },
    {
      name: 'vessels.pulmonary_trunk',
      geometry: buildPulmonaryTrunk(),
      color: '#6d8fd6',
      groups: ['great-vessels', 'arteries'],
      opacity: 1,
      order: 0,
    },
    {
      name: 'vessels.pulmonary_arteries',
      geometry: buildPulmonaryArteries(),
      color: '#6d8fd6',
      groups: ['great-vessels', 'arteries'],
      opacity: 1,
      order: 0,
    },
    {
      name: 'vessels.pulmonary_veins',
      geometry: buildPulmonaryVeins(),
      color: '#e0697c',
      groups: ['great-vessels', 'veins'],
      opacity: 1,
      order: 0,
    },
    {
      name: 'vessels.svc',
      geometry: buildSvc(),
      color: '#4a70b0',
      groups: ['great-vessels', 'veins'],
      opacity: 1,
      order: 0,
    },
    {
      name: 'vessels.ivc',
      geometry: buildIvc(),
      color: '#4a70b0',
      groups: ['great-vessels', 'veins'],
      opacity: 1,
      order: 0,
    },

    // --- Peripheral vasculature
    {
      name: 'vessels.systemic_arteries',
      geometry: buildSystemicArteries(),
      color: '#d94f68',
      groups: ['peripheral', 'arteries'],
      opacity: 1,
      order: 0,
    },
    {
      name: 'vessels.systemic_veins',
      geometry: buildSystemicVeins(),
      color: '#5d84c8',
      groups: ['peripheral', 'veins'],
      opacity: 1,
      order: 0,
    },
  ];

  cached = parts;
  return parts;
};

/* ---------------------------------------------------------- View modes -- */

export type ViewModeId =
  | 'full'
  | 'heart'
  | 'arteries'
  | 'veins'
  | 'coronary'
  | 'conduction';

export interface ViewMode {
  id: ViewModeId;
  label: string;
  description: string;
  /** Parts in these groups are shown at full opacity. */
  emphasise: PartGroup[] | 'all';
  /** Parts in these groups are shown faded, for spatial context. */
  context: PartGroup[];
  /** Camera framing applied when the mode is selected. */
  camera: { radius: number; target: Vec3 };
}

export const VIEW_MODES: ViewMode[] = [
  {
    id: 'full',
    label: 'Full System',
    description: 'Heart, great vessels and the major systemic arteries and veins.',
    emphasise: 'all',
    context: [],
      camera: { radius: 9.6, target: [0, 0.12, 0] } as ViewMode['camera'],
  },
  {
    id: 'heart',
    label: 'Heart Only',
    description: 'The four chambers, valves, septa, coronary circulation and conduction system.',
    emphasise: ['chambers', 'valves', 'septa', 'coronary', 'conduction'],
    context: [],
      camera: { radius: 4.5, target: [0.02, 0.0, 0] } as ViewMode['camera'],
  },
  {
    id: 'arteries',
    label: 'Arteries',
    description: 'The arterial tree, with the heart shown faintly for orientation.',
    emphasise: ['arteries'],
    context: ['chambers'],
      camera: { radius: 9.2, target: [0.05, 0.3, -0.1] } as ViewMode['camera'],
  },
  {
    id: 'veins',
    label: 'Veins',
    description: 'The venous return, with the heart shown faintly for orientation.',
    emphasise: ['veins'],
    context: ['chambers'],
      camera: { radius: 9.2, target: [-0.2, 0.18, -0.1] } as ViewMode['camera'],
  },
  {
    id: 'coronary',
    label: 'Coronary Circulation',
    description: 'Coronary arteries and veins over a translucent heart.',
    emphasise: ['coronary'],
    context: ['chambers', 'septa'],
      camera: { radius: 4.3, target: [0.08, -0.1, 0] } as ViewMode['camera'],
  },
  {
    id: 'conduction',
    label: 'Conduction System',
    description: 'Sinuatrial and atrioventricular nodes, bundle branches and Purkinje network.',
    emphasise: ['conduction'],
    context: ['chambers', 'septa'],
      camera: { radius: 4.2, target: [0.0, 0.05, 0] } as ViewMode['camera'],
  },
];
