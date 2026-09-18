/* ==========================================================================
   CIG — The patient's chest
   --------------------------------------------------------------------------
   A flat, anterior view of the torso that the learner works on directly:
   electrodes go on it, the stethoscope goes on it, and the surface landmarks
   that define both are drawn on it.

   Deliberately two-dimensional and drawn as one scalable SVG. The Learning
   Hub already has a WebGL thorax in the examination module for exploring the
   anatomy in three dimensions; what the simulation needs is something a
   student can tap accurately on a phone, that costs nothing to draw, and that
   works with no GPU at all. Every coordinate the learner is judged against
   comes from content/simulation/torso.json, so the artwork and the anatomy
   are separately editable.

   The silhouette is generated from a table of half-widths down the body and
   mirrored, so male and female models come out of one description and every
   marker sits on the body rather than beside it.
   ========================================================================== */

import { useRef } from 'react';
import type { ReactNode } from 'react';
import { auscultationSiteById, ecgLeadById, torsoMap } from '../../lib/content';
import type { SimSex, TorsoElectrodeSite } from '../../lib/types';
import type { PlacedElectrode } from './useSimulation';

const W = torsoMap.width;
const H = torsoMap.height;
const MID = W / 2;

/* ---------------------------------------------------------- Silhouette -- */

/** Half-width of the body at a given height, in view units. */
type Section = [y: number, halfWidth: number];

const MALE: Section[] = [
  [38, 25],
  [66, 26],
  [88, 30],
  [100, 50],
  [112, 76],
  [124, 94],
  [150, 104],
  [190, 110],
  [230, 112],
  [270, 110],
  [310, 104],
  [350, 96],
  [390, 88],
  [420, 87],
  [450, 92],
  [480, 98],
  [508, 98],
  [530, 92],
  [548, 78],
];

const FEMALE: Section[] = [
  [38, 23],
  [66, 24],
  [88, 28],
  [100, 46],
  [112, 70],
  [124, 88],
  [150, 98],
  [190, 104],
  [230, 106],
  [270, 106],
  [310, 100],
  [350, 86],
  [390, 79],
  [420, 84],
  [450, 95],
  [480, 104],
  [508, 106],
  [530, 100],
  [548, 84],
];

/**
 * Catmull-Rom through the section points, converted to cubic Béziers, so the
 * outline is smooth rather than a chain of straight segments.
 */
const smooth = (points: [number, number][]): string => {
  if (points.length < 2) return '';
  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
};

/**
 * One closed outline: down the patient's left side, across the bottom, and
 * back up the right. Smoothed in a single pass so the two sides join without
 * a corner, then closed across the top of the neck.
 */
const bodyPath = (sections: Section[]): string => {
  const right: [number, number][] = sections.map(([y, hw]) => [MID + hw, y]);
  const left: [number, number][] = [...sections].reverse().map(([y, hw]) => [MID - hw, y]);
  return `${smooth([...right, ...left])} Z`;
};

/* The two arms, drawn behind the torso as tapered capsules so the shoulder
   reads correctly and the midaxillary line stays visible. */
const ARM_LEFT = 'M 112 126 C 86 184, 64 262, 56 372';
const ARM_RIGHT = 'M 288 126 C 314 184, 336 262, 344 372';

/* ---------------------------------------------------------------- Props -- */

export type TorsoMode = 'electrodes' | 'auscultation' | 'review';

export interface TorsoStageProps {
  sex: SimSex;
  mode: TorsoMode;
  /** Electrodes already on the chest. */
  placed: Map<string, PlacedElectrode>;
  /** The electrode the learner is holding, in electrode mode. */
  active?: TorsoElectrodeSite | null;
  /** Draws the target outline for these electrodes. */
  guides?: Set<string>;
  /** Shows every target outline, e.g. at beginner level or in review. */
  showAllGuides?: boolean;
  /** A tap on the body, in torso view units. */
  onPlace?: (x: number, y: number) => void;
  /** Auscultation mode: which site is selected and what to do about a tap. */
  activeSite?: string | null;
  visitedSites?: Set<string>;
  onSite?: (siteId: string) => void;
  /** Marks a wrong attempt with a transient cross. */
  errorAt?: { x: number; y: number } | null;
  caption?: ReactNode;
}

const cx = (site: { male: [number, number]; female: [number, number] }, sex: SimSex) =>
  sex === 'female' ? site.female : site.male;

export const TorsoStage = ({
  sex,
  mode,
  placed,
  active = null,
  guides,
  showAllGuides = false,
  onPlace,
  activeSite = null,
  visitedSites,
  onSite,
  errorAt = null,
  caption,
}: TorsoStageProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const sections = sex === 'female' ? FEMALE : MALE;

  /** Converts a pointer position into torso view units. */
  const toView = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const el = svgRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    // preserveAspectRatio is xMidYMid meet, so work out the letterboxing.
    const scale = Math.min(rect.width / W, rect.height / H);
    const offsetX = (rect.width - W * scale) / 2;
    const offsetY = (rect.height - H * scale) / 2;
    return {
      x: (clientX - rect.left - offsetX) / scale,
      y: (clientY - rect.top - offsetY) / scale,
    };
  };

  const handleClick = (e: { clientX: number; clientY: number }) => {
    const p = toView(e.clientX, e.clientY);
    if (!p) return;
    if (mode === 'electrodes') onPlace?.(p.x, p.y);
    else if (mode === 'auscultation') {
      /* Pick the nearest auscultation area within its own tolerance, so a tap
         near the apex selects the mitral area rather than nothing. */
      let best: { id: string; d: number } | null = null;
      for (const a of torsoMap.auscultation) {
        const [ax, ay] = cx(a, sex);
        const d = Math.hypot(p.x - ax, p.y - ay);
        if (d <= a.tolerance * 1.5 && (!best || d < best.d)) best = { id: a.siteId, d };
      }
      if (best) onSite?.(best.id);
    }
  };

  /* Which target outlines are drawn: all of them at beginner level and in the
     debrief, only the ones the learner asked for a hint on otherwise. */
  const targetsToOutline = torsoMap.electrodes.filter(
    (e) => showAllGuides || mode === 'review' || guides?.has(e.leadId) === true,
  );

  return (
    <div className={'torso torso-' + mode}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="torso-svg"
        /* Deliberately an image, not a control. Pointing at the chest is the
           quick way to do this; the keyboard-accessible route is the list of
           electrodes and auscultation areas beside the diagram, so the SVG
           itself never needs to take focus. */
        role="img"
        aria-label={
          mode === 'electrodes'
            ? `Anterior view of the patient's chest. Tap the correct anatomical position for the ${active?.code ?? 'next'} electrode. Every electrode can also be placed from the keyboard-accessible list beside this diagram.`
            : mode === 'auscultation'
              ? "Anterior view of the patient's chest showing the five cardiac auscultation areas. Each area is also a button in the list beside this diagram."
              : "Anterior view of the patient's chest showing where each electrode was placed."
        }
        onClick={handleClick}
      >
        <defs>
          <linearGradient id="torso-skin" x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0%" stopColor="var(--torso-skin-1)" />
            <stop offset="100%" stopColor="var(--torso-skin-2)" />
          </linearGradient>
          <linearGradient id="torso-arm" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="var(--torso-skin-2)" />
            <stop offset="100%" stopColor="var(--torso-skin-3)" />
          </linearGradient>
          <radialGradient id="torso-shade" cx="50%" cy="34%" r="62%">
            <stop offset="60%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(12, 32, 56, 0.14)" />
          </radialGradient>
        </defs>

        {/* arms behind the body */}
        <g stroke="url(#torso-arm)" strokeWidth="44" strokeLinecap="round" fill="none">
          <path d={ARM_LEFT} />
          <path d={ARM_RIGHT} />
        </g>

        {/* neck and body */}
        <path d={bodyPath(sections)} fill="url(#torso-skin)" stroke="var(--torso-edge)" strokeWidth="1.6" />

        {/* female chest wall contour, drawn on the anterior surface */}
        {sex === 'female' ? (
          /* The inframammary folds, and the upper contour above them. Drawn
             because they matter clinically: V4 to V6 go on the chest wall
             *below* this line, not on the breast. */
          <g fill="none" stroke="var(--torso-line)" strokeWidth="1.7" opacity="0.8">
            <path d="M 128 232 C 136 286, 172 298, 202 260" />
            <path d="M 272 232 C 264 286, 228 298, 198 260" />
            <g opacity="0.45" strokeWidth="1.3">
              <path d="M 130 228 C 146 200, 184 202, 202 236" />
              <path d="M 270 228 C 254 200, 216 202, 198 236" />
            </g>
          </g>
        ) : (
          <g fill="none" stroke="var(--torso-line)" strokeWidth="1.4" opacity="0.5">
            <path d="M 146 240 C 158 264, 182 268, 200 258" />
            <path d="M 254 240 C 242 264, 218 268, 200 258" />
          </g>
        )}

        {/* surface landmarks: clavicles, sternum, costal margin, axillary lines */}
        <g className="torso-landmarks" fill="none">
          {/* clavicles */}
          <path d="M 200 132 C 176 120, 146 112, 118 116" />
          <path d="M 200 132 C 224 120, 254 112, 282 116" />
          {/* sternum with the sternal angle marked */}
          <path d="M 200 138 L 200 300" />
          <path d="M 184 170 L 216 170" className="torso-landmark-key" />
          {/* ribs, schematically */}
          <g opacity="0.55">
            <path d="M 200 186 C 172 190, 148 204, 132 226" />
            <path d="M 200 186 C 228 190, 252 204, 268 226" />
            <path d="M 200 216 C 170 220, 144 236, 128 262" />
            <path d="M 200 216 C 230 220, 256 236, 272 262" />
            <path d="M 200 248 C 168 252, 140 270, 124 300" />
            <path d="M 200 248 C 232 252, 260 270, 276 300" />
            <path d="M 200 282 C 166 288, 138 308, 122 340" />
            <path d="M 200 282 C 234 288, 262 308, 278 340" />
          </g>
          {/* costal margin */}
          <path d="M 200 306 C 168 322, 140 346, 126 380" className="torso-landmark-key" />
          <path d="M 200 306 C 232 322, 260 346, 274 380" className="torso-landmark-key" />
          {/* midclavicular and axillary reference lines */}
          <g strokeDasharray="5 7" opacity="0.5">
            <path d="M 256 128 L 256 330" />
            <path d="M 144 128 L 144 330" />
            <path d="M 278 150 L 278 330" />
            <path d="M 304 168 L 304 330" />
          </g>
          {/* umbilicus */}
          <circle cx="200" cy="412" r="5" className="torso-landmark-key" />
        </g>

        <path d={bodyPath(sections)} fill="url(#torso-shade)" stroke="none" />

        {/* target outlines */}
        {mode !== 'auscultation'
          ? targetsToOutline.map((e) => {
              const [x, y] = cx(e, sex);
              return (
                <circle
                  key={'guide-' + e.leadId}
                  cx={x}
                  cy={y}
                  r={e.tolerance}
                  className={
                    'torso-guide' + (active?.leadId === e.leadId ? ' is-active' : '')
                  }
                />
              );
            })
          : null}

        {/* auscultation areas */}
        {mode === 'auscultation'
          ? torsoMap.auscultation.map((a) => {
              const [x, y] = cx(a, sex);
              const site = auscultationSiteById.get(a.siteId);
              const name = site?.shortName ?? a.siteId;
              /* Four of the five areas sit within a few centimetres of each
                 other on the left sternal border, so a name beside every dot
                 would be an unreadable pile. Each carries its initial instead,
                 and only the selected area is named — with the label thrown
                 away from the midline so it never lands on its neighbours. */
              /* Which side the label goes on: away from the midline by
                 default, but flipped back if the name would run off the edge
                 of the drawing. Text width is estimated from the character
                 count, which is enough to choose a side. */
              const estimated = name.length * 6.8 + 10;
              const toLeft =
                x < MID || x + a.tolerance + 30 + estimated > W - 6;
              return (
                <g
                  key={a.siteId}
                  className={
                    'torso-site' +
                    (activeSite === a.siteId ? ' is-active' : '') +
                    (visitedSites?.has(a.siteId) ? ' is-visited' : '')
                  }
                >
                  <circle cx={x} cy={y} r={a.tolerance} className="torso-site-halo" />
                  <circle cx={x} cy={y} r={11} className="torso-site-dot" />
                  <text x={x} y={y + 4} textAnchor="middle" className="torso-site-initial">
                    {name.charAt(0).toUpperCase()}
                  </text>
                  {activeSite === a.siteId ? (
                    <>
                      <line
                        x1={toLeft ? x - a.tolerance : x + a.tolerance}
                        y1={y}
                        x2={toLeft ? x - a.tolerance - 26 : x + a.tolerance + 26}
                        y2={y - 16}
                        className="torso-site-leader"
                      />
                      <text
                        x={toLeft ? x - a.tolerance - 30 : x + a.tolerance + 30}
                        y={y - 16}
                        textAnchor={toLeft ? 'end' : 'start'}
                        className="torso-label"
                      >
                        {name}
                      </text>
                    </>
                  ) : null}
                </g>
              );
            })
          : null}

        {/* electrodes already on the chest */}
        {mode !== 'auscultation'
          ? [...placed.values()].map((p) => {
              const site = torsoMap.electrodes.find((e) => e.leadId === p.leadId);
              const lead = ecgLeadById.get(p.leadId);
              if (!site) return null;
              return (
                <g key={'placed-' + p.leadId} className="torso-electrode">
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={13}
                    fill={lead?.color ?? '#f2f5f8'}
                    stroke="rgba(10,36,64,0.55)"
                    strokeWidth="1.6"
                  />
                  {/* The code sits inside the electrode. Ten of these are on a
                      chest at once, several of them within a few millimetres of
                      one another, so labels beside them would collide. */}
                  <text x={p.x} y={p.y + 4} textAnchor="middle" className="torso-chip">
                    {site.code}
                  </text>
                </g>
              );
            })
          : null}

        {/* transient marker where a wrong placement was attempted */}
        {errorAt ? (
          <g className="torso-error">
            <circle cx={errorAt.x} cy={errorAt.y} r={13} />
            <path
              d={`M ${errorAt.x - 6} ${errorAt.y - 6} L ${errorAt.x + 6} ${errorAt.y + 6} M ${errorAt.x + 6} ${errorAt.y - 6} L ${errorAt.x - 6} ${errorAt.y + 6}`}
            />
          </g>
        ) : null}
      </svg>
      {caption ? <p className="torso-caption">{caption}</p> : null}
    </div>
  );
};
