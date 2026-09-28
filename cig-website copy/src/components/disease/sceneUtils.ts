/* ==========================================================================
   CIG — Shared helpers for the pathophysiology animations
   --------------------------------------------------------------------------
   Every scene is a pure function of (global progress, clock). That keeps the
   animations scrubbable: dragging the timeline produces exactly the same frame
   as playing to that point, and pausing freezes everything deterministically.
   ========================================================================== */

export interface SceneContext {
  /** Global progress across the whole animation, 0–1. */
  g: number;
  /** Index of the current step. */
  step: number;
  /** Progress within the current step, 0–1. */
  t: number;
  /** Total number of steps. */
  n: number;
  /** Milliseconds of playback elapsed; frozen while paused. Drives flow motion. */
  clock: number;
  /** True when the user prefers reduced motion — suppresses continuous loops. */
  reduced: boolean;
}

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

export const smoothstep = (x: number): number => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};

/**
 * Progress of a visual element that appears between step `from` and step `to`.
 * Returns 0 before, 1 after, and an eased ramp in between.
 */
export const phase = (ctx: SceneContext, from: number, to: number): number =>
  smoothstep((ctx.g * ctx.n - from) / Math.max(0.0001, to - from));

/** A value that ramps in and then back out across a step range. */
export const pulseRange = (ctx: SceneContext, from: number, to: number): number => {
  const x = (ctx.g * ctx.n - from) / Math.max(0.0001, to - from);
  if (x <= 0 || x >= 1) return 0;
  return Math.sin(x * Math.PI);
};

/** Evenly spaced particles travelling along a length, wrapping at the end. */
export const flowOffsets = (
  count: number,
  speed: number,
  clock: number,
  reduced: boolean,
): number[] => {
  const base = reduced ? 0.5 : ((clock * speed) / 1000) % 1;
  return Array.from({ length: count }, (_, i) => (base + i / count) % 1);
};

/** Point on a quadratic Bézier, used to run particles along curved vessels. */
export const quadAt = (
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  t: number,
): [number, number] => {
  const mt = 1 - t;
  return [
    mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
    mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1],
  ];
};

/** Deterministic pseudo-random in [0, 1) from an integer seed. */
export const rand = (seed: number): number => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Mixes two hex colours. */
export const mixHex = (a: string, b: string, t: number): string => {
  const parse = (h: string): [number, number, number] => {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const c = clamp01(t);
  const to = (x: number) => Math.round(x).toString(16).padStart(2, '0');
  return `#${to(r1 + (r2 - r1) * c)}${to(g1 + (g2 - g1) * c)}${to(b1 + (b2 - b1) * c)}`;
};

export const PALETTE = {
  wall: '#3b4a63',
  wallDeep: '#2a374c',
  intima: '#7d92b3',
  lumen: '#0b1424',
  blood: '#e0455f',
  bloodDim: '#8d3247',
  lipid: '#f0c860',
  foam: '#e8b83c',
  necrotic: '#c9a34a',
  cap: '#c8d4e6',
  thrombus: '#7a1b2c',
  platelet: '#f5f0e6',
  muscle: '#c8506a',
  muscleDim: '#6d4a58',
  ischaemic: '#5b6f8f',
  infarct: '#4a4550',
  calcium: '#e8eef6',
  cyan: '#3ccfe6',
  amber: '#f2b544',
  grid: 'rgba(120,158,208,0.08)',
  label: '#a9bad2',
} as const;
