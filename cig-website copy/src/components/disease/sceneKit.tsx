/* ==========================================================================
   CIG — Shared drawing kit for the pathophysiology animations
   --------------------------------------------------------------------------
   The scenes are diagrammatic teaching illustrations drawn as pure functions
   of animation progress. This module holds the pieces every scene reuses —
   the stage backdrop, labels and leader lines, the instrument panels, meters
   and readouts down the right-hand side, arrows, jets and the ECG strip — so
   that a scene file only has to describe the anatomy it is actually about.

   Everything here is deterministic: given the same SceneContext it draws the
   same frame, which is what keeps the timeline scrubbable.
   ========================================================================== */

import type { ReactNode } from 'react';
import { ecgPath, type EcgOptions } from './ecg';
import { PALETTE as C, clamp01, rand, type SceneContext } from './sceneUtils';

/** Stage geometry. Every scene draws into this box. */
export const W = 800;
export const H = 450;

/* ------------------------------------------------------------- Type notes -- */

export type Anchor = 'start' | 'middle' | 'end';

/* ------------------------------------------------------------------ Text -- */

export const Label = ({
  x,
  y,
  text,
  opacity = 1,
  anchor = 'start',
  tone = C.label,
  size = 11,
}: {
  x: number;
  y: number;
  text: string;
  opacity?: number;
  anchor?: Anchor;
  tone?: string;
  size?: number;
}): ReactNode =>
  opacity <= 0.01 ? null : (
    <text
      x={x}
      y={y}
      fill={tone}
      opacity={opacity}
      textAnchor={anchor}
      style={{
        font: `500 ${size}px ui-monospace, "IBM Plex Mono", monospace`,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}
    >
      {text}
    </text>
  );

/** A number set in the display face used for instrument readouts. */
export const Numeral = ({
  x,
  y,
  text,
  tone = C.cyan,
  size = 26,
  anchor = 'start',
  opacity = 1,
}: {
  x: number;
  y: number;
  text: string;
  tone?: string;
  size?: number;
  anchor?: Anchor;
  opacity?: number;
}): ReactNode =>
  opacity <= 0.01 ? null : (
    <text
      x={x}
      y={y}
      fill={tone}
      opacity={opacity}
      textAnchor={anchor}
      style={{
        font: `600 ${size}px ui-monospace, "IBM Plex Mono", monospace`,
        letterSpacing: '-0.02em',
      }}
    >
      {text}
    </text>
  );

export const Leader = ({
  x1,
  y1,
  x2,
  y2,
  opacity = 1,
  tone = 'rgba(140,180,230,0.4)',
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity?: number;
  tone?: string;
}): ReactNode =>
  opacity <= 0.01 ? null : (
    <path d={`M${x1} ${y1} L${x2} ${y2}`} stroke={tone} strokeWidth={1} opacity={opacity} strokeDasharray="3 3" />
  );

/* -------------------------------------------------------------- Backdrop -- */

export const Backdrop = (): ReactNode => (
  <g aria-hidden="true">
    <defs>
      <pattern id="sceneGrid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M40 0H0V40" fill="none" stroke={C.grid} strokeWidth="1" />
      </pattern>
      <radialGradient id="sceneGlow" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stopColor="rgba(60,120,200,0.16)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0)" />
      </radialGradient>
    </defs>
    <rect width={W} height={H} fill="url(#sceneGrid)" />
    <rect width={W} height={H} fill="url(#sceneGlow)" />
  </g>
);

/* ---------------------------------------------------------------- Panels -- */

/** The recessed instrument card the readouts sit on. */
export const Panel = ({
  x,
  y,
  w,
  h,
  title,
  opacity = 1,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title?: string;
  opacity?: number;
  children?: ReactNode;
}): ReactNode =>
  opacity <= 0.01 ? null : (
    <g opacity={opacity}>
      <rect x={x} y={y} width={w} height={h} rx={14} fill="rgba(11,17,32,0.72)" stroke="rgba(140,180,230,0.22)" />
      {title ? <Label x={x + 16} y={y + 22} text={title} opacity={0.72} /> : null}
      {children}
    </g>
  );

/** A red consequence banner — used for the clinical endpoint of a sequence. */
export const Banner = ({
  x,
  y,
  w,
  text,
  opacity,
  h = 26,
  tone = '#ff9bab',
}: {
  x: number;
  y: number;
  w: number;
  text: string;
  opacity: number;
  h?: number;
  tone?: string;
}): ReactNode =>
  opacity <= 0.01 ? null : (
    <g opacity={opacity}>
      <rect x={x} y={y} width={w} height={h} rx={8} fill="rgba(122,27,44,0.35)" stroke="rgba(224,58,92,0.4)" />
      <Label x={x + w / 2} y={y + h / 2 + 4} text={text} anchor="middle" tone={tone} />
    </g>
  );

/** A horizontal bar meter with an optional caption underneath. */
export const Meter = ({
  x,
  y,
  w,
  value,
  label,
  caption,
  tone = C.cyan,
  h = 10,
  opacity = 1,
}: {
  x: number;
  y: number;
  w: number;
  /** 0–1 fill fraction. */
  value: number;
  label?: string;
  caption?: string;
  tone?: string;
  h?: number;
  opacity?: number;
}): ReactNode =>
  opacity <= 0.01 ? null : (
    <g opacity={opacity}>
      {label ? <Label x={x} y={y - 8} text={label} opacity={0.7} /> : null}
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill="rgba(255,255,255,0.08)" />
      <rect x={x} y={y} width={Math.max(4, w * clamp01(value))} height={h} rx={h / 2} fill={tone} />
      {caption ? <Label x={x} y={y + h + 16} text={caption} opacity={0.7} tone={tone} /> : null}
    </g>
  );

/** A labelled row that lights up as a process switches on — e.g. a cascade. */
export const CascadeRow = ({
  x,
  y,
  w,
  label,
  on,
  h = 26,
  tone = '224,58,92',
}: {
  x: number;
  y: number;
  w: number;
  label: string;
  /** 0–1 activation. */
  on: number;
  h?: number;
  tone?: string;
}): ReactNode => (
  <g>
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={8}
      fill={`rgba(${tone},${0.08 + 0.22 * on})`}
      stroke={`rgba(${tone},${0.15 + 0.4 * on})`}
    />
    <Label x={x + 14} y={y + h / 2 + 4} text={label} opacity={0.4 + 0.6 * on} tone={on > 0.5 ? '#ffb3c0' : C.label} />
    <rect x={x + w - 58} y={y + h / 2 - 4} width={44} height={8} rx={4} fill="rgba(255,255,255,0.08)" />
    <rect x={x + w - 58} y={y + h / 2 - 4} width={Math.max(3, 44 * clamp01(on))} height={8} rx={4} fill={`rgb(${tone})`} />
  </g>
);

/**
 * A panel of cascade rows that lays itself out: the caller gives the rows and
 * the panel works out its own height, so the header can never collide with the
 * first row. Returns the panel's height through `rowsHeight` for callers that
 * need to stack something underneath.
 */
export const ROW_PITCH = 32;
export const rowsHeight = (count: number, footer = false): number =>
  36 + count * ROW_PITCH + (footer ? 26 : 4);

export const RowsPanel = ({
  x,
  y,
  w,
  title,
  rows,
  footer,
  footerTone,
  opacity = 1,
}: {
  x: number;
  y: number;
  w: number;
  title?: string;
  rows: { label: string; on: number; tone?: string }[];
  footer?: string;
  footerTone?: string;
  opacity?: number;
}): ReactNode => {
  const h = rowsHeight(rows.length, Boolean(footer));
  return (
    <Panel x={x} y={y} w={w} h={h} title={title} opacity={opacity}>
      {rows.map((r, i) => (
        <CascadeRow
          key={r.label}
          x={x + 16}
          y={y + 36 + i * ROW_PITCH}
          w={w - 32}
          label={r.label}
          on={r.on}
          tone={r.tone}
        />
      ))}
      {footer ? (
        <Label x={x + 16} y={y + h - 12} text={footer} opacity={0.85} tone={footerTone ?? C.label} />
      ) : null}
    </Panel>
  );
};

/**
 * A single headline number with a bar under it — the shape most of the
 * instrument readouts take. Fixed height so panels line up between scenes.
 */
export const STAT_HEIGHT = 112;

export const StatPanel = ({
  x,
  y,
  w,
  title,
  value,
  meter,
  tone = C.cyan,
  caption,
  captionTone,
  aside,
  opacity = 1,
}: {
  x: number;
  y: number;
  w: number;
  title: string;
  value: string;
  /** 0–1 bar fill. */
  meter: number;
  tone?: string;
  caption?: string;
  captionTone?: string;
  /** Short right-aligned note on the value line. */
  aside?: string;
  opacity?: number;
}): ReactNode => (
  <Panel x={x} y={y} w={w} h={STAT_HEIGHT} title={title} opacity={opacity}>
    <Numeral x={x + 16} y={y + 60} text={value} size={26} tone={tone} />
    {aside ? <Label x={x + w - 16} y={y + 60} text={aside} anchor="end" opacity={0.7} /> : null}
    <Meter x={x + 16} y={y + 72} w={w - 32} value={meter} tone={tone} />
    {caption ? (
      <Label x={x + 16} y={y + STAT_HEIGHT - 12} text={caption} opacity={0.85} tone={captionTone ?? C.label} />
    ) : null}
  </Panel>
);

/* ---------------------------------------------------------------- Arrows -- */

/** A straight tapered arrow, used for flow, pressure and shunt direction. */
export const Arrow = ({
  x1,
  y1,
  x2,
  y2,
  tone = C.blood,
  width = 8,
  opacity = 1,
  head = 1,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tone?: string;
  width?: number;
  opacity?: number;
  head?: number;
}): ReactNode => {
  if (opacity <= 0.01) return null;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const hl = width * 1.9 * head;
  const bx = x2 - ux * hl;
  const by = y2 - uy * hl;
  const px = -uy;
  const py = ux;
  const hw = width * 1.2 * head;
  return (
    <g opacity={opacity}>
      <path d={`M${x1} ${y1} L${bx} ${by}`} stroke={tone} strokeWidth={width} strokeLinecap="round" />
      <path
        d={`M${bx + px * hw} ${by + py * hw} L${x2} ${y2} L${bx - px * hw} ${by - py * hw} Z`}
        fill={tone}
      />
    </g>
  );
};

/** A curved arrow along a quadratic, for circulating or recirculating flow. */
export const CurvedArrow = ({
  p0,
  p1,
  p2,
  tone = C.blood,
  width = 5,
  opacity = 1,
  dash,
}: {
  p0: [number, number];
  p1: [number, number];
  p2: [number, number];
  tone?: string;
  width?: number;
  opacity?: number;
  dash?: string;
}): ReactNode => {
  if (opacity <= 0.01) return null;
  const tip = p2;
  const before = quad(p0, p1, p2, 0.94);
  const dx = tip[0] - before[0];
  const dy = tip[1] - before[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const hw = width * 1.3;
  return (
    <g opacity={opacity}>
      <path
        d={`M${p0[0]} ${p0[1]} Q${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`}
        fill="none"
        stroke={tone}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dash}
      />
      <path
        d={`M${tip[0] - ux * width * 2 + -uy * hw} ${tip[1] - uy * width * 2 + ux * hw} L${tip[0]} ${tip[1]} L${
          tip[0] - ux * width * 2 + uy * hw
        } ${tip[1] - uy * width * 2 - ux * hw} Z`}
        fill={tone}
      />
    </g>
  );
};

/* ----------------------------------------------------------------- Maths -- */

export const quad = (
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

export const cubic = (
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  t: number,
): [number, number] => {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ];
};

/** Point on a polyline, parameterised 0–1 by vertex index (not arc length). */
export const along = (pts: [number, number][], t: number): [number, number] => {
  if (pts.length === 0) return [0, 0];
  if (pts.length === 1) return pts[0];
  const x = clamp01(t) * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(x));
  const f = x - i;
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
};

/** A cardiac cycle phase, 0–1, at the given rate. Frozen when reduced motion. */
export const cycle = (ctx: SceneContext, perMinute = 66, offset = 0): number =>
  ctx.reduced ? 0.35 : (((ctx.clock / 1000) * (perMinute / 60) + offset) % 1 + 1) % 1;

/** Smooth 0→1→0 systolic excursion from a cycle phase. */
export const systole = (p: number): number => {
  if (p < 0.36) return Math.sin((p / 0.36) * Math.PI);
  return 0;
};

/* -------------------------------------------------------- Blood particles -- */

/** Particles travelling along an arbitrary polyline path. */
export const FlowPath = ({
  pts,
  count = 8,
  speed = 0.5,
  clock,
  reduced,
  tone = C.blood,
  r = 3.4,
  opacity = 0.7,
  from = 0,
  to = 1,
}: {
  pts: [number, number][];
  count?: number;
  speed?: number;
  clock: number;
  reduced: boolean;
  tone?: string;
  r?: number;
  opacity?: number;
  /** Restrict the particles to a sub-range of the path. */
  from?: number;
  to?: number;
}): ReactNode => {
  if (opacity <= 0.01 || to <= from) return null;
  const base = reduced ? 0.5 : ((clock * speed) / 1000) % 1;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const u = (base + i / count) % 1;
        const [x, y] = along(pts, from + u * (to - from));
        return <circle key={i} cx={x} cy={y} r={r} fill={tone} opacity={opacity} />;
      })}
    </>
  );
};

/** A turbulent jet: particles fanning out and scattering past an orifice. */
export const Jet = ({
  x,
  y,
  angle,
  length,
  clock,
  reduced,
  count = 10,
  tone = '#ffd4d9',
  spread = 16,
  opacity = 1,
  speed = 1.1,
  r = 3,
}: {
  x: number;
  y: number;
  /** Radians; 0 points right. */
  angle: number;
  length: number;
  clock: number;
  reduced: boolean;
  count?: number;
  tone?: string;
  spread?: number;
  opacity?: number;
  speed?: number;
  r?: number;
}): ReactNode => {
  if (opacity <= 0.01 || length <= 0) return null;
  const base = reduced ? 0.5 : ((clock * speed) / 1000) % 1;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  return (
    <g opacity={opacity}>
      {Array.from({ length: count }, (_, i) => {
        const u = (base + i / count) % 1;
        const d = u * length;
        const off = Math.sin(u * 9 + i) * spread * (0.25 + u);
        return (
          <circle
            key={i}
            cx={x + ux * d - uy * off}
            cy={y + uy * d + ux * off}
            r={r * (1 - 0.35 * u)}
            fill={tone}
            opacity={0.85 * (1 - 0.5 * u)}
          />
        );
      })}
    </g>
  );
};

/** Scattered dots inside a shape — fibrosis, calcium, inflammatory cells. */
export const Speckle = ({
  cx,
  cy,
  rx,
  ry,
  count = 20,
  seed = 0,
  tone = '#cbd5e4',
  r = 2,
  opacity = 0.5,
  ring = 0,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  count?: number;
  seed?: number;
  tone?: string;
  r?: number;
  opacity?: number;
  /** 0 = fill the ellipse, 1 = hug its edge. */
  ring?: number;
}): ReactNode => {
  if (opacity <= 0.01) return null;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const a = rand(i + seed) * Math.PI * 2;
        const u = rand(i + seed + 97);
        const rr = ring + (1 - ring) * Math.sqrt(u);
        return (
          <circle
            key={i}
            cx={cx + Math.cos(a) * rx * rr}
            cy={cy + Math.sin(a) * ry * rr}
            r={r * (0.6 + rand(i + seed + 41) * 0.8)}
            fill={tone}
            opacity={opacity}
          />
        );
      })}
    </>
  );
};

/* -------------------------------------------------------------- ECG strip -- */

/** A framed rhythm strip with a caption that tracks the morphology. */
export const EcgPanel = ({
  x,
  y,
  w,
  h,
  title,
  caption,
  captionTone,
  tone = C.cyan,
  ctx,
  options,
  opacity = 1,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title?: string;
  caption?: string;
  captionTone?: string;
  tone?: string;
  ctx: SceneContext;
  options: Omit<EcgOptions, 'x0' | 'x1' | 'yBase' | 'amplitude' | 'offset'> & {
    amplitude?: number;
    offset?: number;
  };
  opacity?: number;
}): ReactNode => {
  if (opacity <= 0.01) return null;
  const { amplitude = Math.min(40, h * 0.32), offset, ...rest } = options;
  return (
    <g opacity={opacity}>
      <rect x={x} y={y} width={w} height={h} rx={14} fill="rgba(11,17,32,0.72)" stroke="rgba(140,180,230,0.22)" />
      {title ? <Label x={x + 16} y={y + 22} text={title} opacity={0.7} /> : null}
      <path
        d={ecgPath({
          ...rest,
          x0: x + 16,
          x1: x + w - 16,
          yBase: y + h * 0.62,
          amplitude,
          offset: offset ?? (ctx.reduced ? 0 : (ctx.clock / 1000) * 0.7),
        })}
        fill="none"
        stroke={tone}
        strokeWidth={1.9}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {caption ? (
        <Label x={x + 16} y={y + h - 12} text={caption} opacity={0.88} tone={captionTone ?? C.label} />
      ) : null}
    </g>
  );
};

/* ------------------------------------------------------- Pressure tracing -- */

/**
 * A generic waveform panel: the caller supplies a function of time (0–1 across
 * the strip) and the panel draws it. Used for arterial, atrial and ventricular
 * pressure tracings, and for the calf-pump venous pressure curve.
 */
export const Trace = ({
  x,
  y,
  w,
  h,
  fn,
  tone = C.cyan,
  title,
  caption,
  captionTone,
  samples = 220,
  opacity = 1,
  fill = false,
  gridLines = 0,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Returns 0 (bottom) to 1 (top) for a normalised position across the panel. */
  fn: (u: number) => number;
  tone?: string;
  title?: string;
  caption?: string;
  captionTone?: string;
  samples?: number;
  opacity?: number;
  fill?: boolean;
  gridLines?: number;
}): ReactNode => {
  if (opacity <= 0.01) return null;
  const x0 = x + 16;
  const x1 = x + w - 16;
  const top = y + (title ? 30 : 14);
  const bottom = y + h - (caption ? 26 : 12);
  let d = '';
  for (let s = 0; s <= samples; s++) {
    const u = s / samples;
    const v = clamp01(fn(u));
    const px = x0 + u * (x1 - x0);
    const py = bottom - v * (bottom - top);
    d += (s === 0 ? 'M' : 'L') + px.toFixed(1) + ' ' + py.toFixed(1);
  }
  return (
    <g opacity={opacity}>
      <rect x={x} y={y} width={w} height={h} rx={14} fill="rgba(11,17,32,0.72)" stroke="rgba(140,180,230,0.22)" />
      {title ? <Label x={x + 16} y={y + 22} text={title} opacity={0.7} /> : null}
      {gridLines > 0
        ? Array.from({ length: gridLines }, (_, i) => {
            const py = top + ((bottom - top) * (i + 1)) / (gridLines + 1);
            return (
              <path
                key={i}
                d={`M${x0} ${py} L${x1} ${py}`}
                stroke="rgba(140,180,230,0.12)"
                strokeWidth={1}
                strokeDasharray="4 5"
              />
            );
          })
        : null}
      {fill ? <path d={`${d} L${x1} ${bottom} L${x0} ${bottom} Z`} fill={tone} opacity={0.14} /> : null}
      <path d={d} fill="none" stroke={tone} strokeWidth={1.9} strokeLinejoin="round" strokeLinecap="round" />
      {caption ? (
        <Label x={x + 16} y={y + h - 10} text={caption} opacity={0.85} tone={captionTone ?? C.label} />
      ) : null}
    </g>
  );
};

/* ------------------------------------------------------------- Anatomy kit -- */

/**
 * A vessel drawn horizontally with a wall, a lumen and an optional stenosis
 * profile. Returns both the drawing and the luminal geometry, so a caller can
 * run particles through the residual lumen.
 */
export interface VesselSpec {
  x0: number;
  x1: number;
  top: number;
  bottom: number;
  /** Stenosis height at the narrowest point, in user units. */
  narrowing?: number;
  /** Centre of the narrowing. */
  at?: number;
  /** Width of the narrowing. */
  width?: number;
  wallTone?: string;
  lumenTone?: string;
  /** Injury of the endothelial line, 0–1. */
  injury?: number;
}

export const vesselProfile = (spec: VesselSpec) => {
  const { at = (spec.x0 + spec.x1) / 2, width = 90, narrowing = 0 } = spec;
  return (x: number): number => narrowing * Math.exp(-Math.pow((x - at) / width, 2));
};

export const Vessel = ({
  spec,
  children,
}: {
  spec: VesselSpec;
  children?: ReactNode;
}): ReactNode => {
  const prof = vesselProfile(spec);
  const { x0, x1, top, bottom, wallTone = C.wallDeep, lumenTone = C.lumen } = spec;
  const steps = 48;
  let edge = `M${x0} ${top}`;
  for (let i = 1; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    edge += ` L${x.toFixed(1)} ${(top + prof(x)).toFixed(1)}`;
  }
  return (
    <g>
      <rect
        x={x0}
        y={top - 34}
        width={x1 - x0}
        height={bottom - top + 68}
        rx={24}
        fill={wallTone}
        stroke="rgba(140,180,230,0.22)"
      />
      <path d={`${edge} L${x1} ${bottom} L${x0} ${bottom} Z`} fill={lumenTone} />
      <path d={edge} fill="none" stroke="#8fd0e0" strokeWidth={2} opacity={0.8} />
      <path d={`M${x0} ${bottom} L${x1} ${bottom}`} stroke="#8fd0e0" strokeWidth={2} opacity={0.8} />
      {children}
    </g>
  );
};

/** A generic myocardial chamber: an outer wall of given thickness and a cavity. */
export const Chamber = ({
  cx,
  cy,
  rx,
  ry,
  wall,
  wallTone = '#7d2b3d',
  cavityTone = C.lumen,
  stroke = 'rgba(255,160,180,0.3)',
  opacity = 1,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  wall: number;
  wallTone?: string;
  cavityTone?: string;
  stroke?: string;
  opacity?: number;
}): ReactNode => (
  <g opacity={opacity}>
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={wallTone} />
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={stroke} strokeWidth={1.5} />
    <ellipse cx={cx} cy={cy} rx={Math.max(2, rx - wall)} ry={Math.max(2, ry - wall)} fill={cavityTone} />
  </g>
);

/**
 * A venous valve: two cusps in a sinus. `closure` 1 = cusps meet (competent),
 * 0 = cusps held apart (incompetent), so reflux can be drawn through the gap.
 */
export const VenousValve = ({
  x,
  top,
  bottom,
  closure,
  tone = '#9fd7e6',
  thickening = 0,
}: {
  x: number;
  top: number;
  bottom: number;
  closure: number;
  tone?: string;
  thickening?: number;
}): ReactNode => {
  const mid = (top + bottom) / 2;
  /* closure 1 = the free edges meet in the middle of the vein (competent);
     0 = they lie back against the wall, leaving the lumen wide open. */
  const reach = ((bottom - top) / 2 - 3) * (1 - clamp01(closure));
  const w = 20 + thickening * 6;
  return (
    <g>
      <path
        d={`M${x - w} ${top + 2} Q${x - w / 2} ${top + 6} ${x + 2} ${mid - reach}`}
        fill="none"
        stroke={tone}
        strokeWidth={3 + thickening * 2}
        strokeLinecap="round"
      />
      <path
        d={`M${x - w} ${bottom - 2} Q${x - w / 2} ${bottom - 6} ${x + 2} ${mid + reach}`}
        fill="none"
        stroke={tone}
        strokeWidth={3 + thickening * 2}
        strokeLinecap="round"
      />
    </g>
  );
};

export { C as PALETTE };
