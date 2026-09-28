/* ==========================================================================
   CIG — Pathophysiology animation scenes
   --------------------------------------------------------------------------
   Five medically-sequenced visualisations, each a pure function of animation
   progress. They are diagrammatic teaching illustrations, not depictions of
   any individual patient, and are labelled as such in the player.
   ========================================================================== */

import type { ReactNode } from 'react';
import type { AnimationSceneId } from '../../lib/types';
import { ecgPath } from './ecg';
import { ELECTRICAL_SCENES } from './scenes.electrical';
import { MYOCARDIAL_SCENES } from './scenes.myocardial';
import { VALVE_SCENES } from './scenes.valve';
import { VASCULAR_SCENES } from './scenes.vascular';
import {
  PALETTE as C,
  clamp01,
  flowOffsets,
  mixHex,
  phase,
  quadAt,
  rand,
  smoothstep,
  type SceneContext,
} from './sceneUtils';

const W = 800;
const H = 450;

const Label = ({
  x,
  y,
  text,
  opacity = 1,
  anchor = 'start',
  tone = C.label,
}: {
  x: number;
  y: number;
  text: string;
  opacity?: number;
  anchor?: 'start' | 'middle' | 'end';
  tone?: string;
}) =>
  opacity <= 0.01 ? null : (
    <text
      x={x}
      y={y}
      fill={tone}
      opacity={opacity}
      textAnchor={anchor}
      style={{
        font: '500 11px ui-monospace, "IBM Plex Mono", monospace',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}
    >
      {text}
    </text>
  );

const Leader = ({
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
}) =>
  opacity <= 0.01 ? null : (
    <path
      d={`M${x1} ${y1} L${x2} ${y2}`}
      stroke={tone}
      strokeWidth={1}
      opacity={opacity}
      strokeDasharray="3 3"
    />
  );

const Backdrop = () => (
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

/* ============================================================ ATHEROSCLEROSIS */

const Atherosclerosis = (ctx: SceneContext): ReactNode => {
  const dysfunction = phase(ctx, 1, 2);
  const lipids = phase(ctx, 2, 3);
  const foam = phase(ctx, 3, 4);
  const plaque = phase(ctx, 4, 5);
  const narrowing = phase(ctx, 5, 6);
  const rupture = phase(ctx, 6, 7);
  const thrombus = phase(ctx, 7, 8);
  const occlusion = phase(ctx, 8, 9);

  const cx = 430;
  const lumenTop = 168;
  const lumenBottom = 288;
  const plaqueHeight = 16 * foam + 52 * plaque + 22 * narrowing;

  const profile = (x: number): number =>
    plaqueHeight * Math.exp(-Math.pow((x - cx) / 108, 2));

  const topEdge = (steps = 40): string => {
    let d = `M60 ${lumenTop}`;
    for (let i = 0; i <= steps; i++) {
      const x = 60 + (680 * i) / steps;
      d += ` L${x.toFixed(1)} ${(lumenTop + profile(x)).toFixed(1)}`;
    }
    return d;
  };

  const minLumen = lumenBottom - (lumenTop + plaqueHeight);
  const flowSpeed = 0.55 * Math.max(0.06, 1 - occlusion * 0.98) * Math.max(0.35, minLumen / 120);
  const particles = flowOffsets(16, flowSpeed, ctx.clock, ctx.reduced);

  return (
    <>
      <Backdrop />

      {/* Vessel wall */}
      <rect x={60} y={112} width={680} height={228} rx={26} fill={C.wallDeep} />
      <rect x={60} y={112} width={680} height={228} rx={26} fill="none" stroke="rgba(140,180,230,0.22)" />
      <rect x={68} y={128} width={664} height={196} rx={20} fill={C.wall} opacity={0.72} />

      {/* Lumen */}
      <path d={`${topEdge()} L740 ${lumenBottom} L60 ${lumenBottom} Z`} fill={C.lumen} />

      {/* Endothelium — becomes irregular as it is injured */}
      <path
        d={topEdge()}
        fill="none"
        stroke={mixHex('#8fd0e0', '#c9704f', dysfunction)}
        strokeWidth={2.2}
        strokeDasharray={dysfunction > 0.15 ? `${10 - dysfunction * 7} ${dysfunction * 6}` : undefined}
      />
      <path
        d={`M60 ${lumenBottom} L740 ${lumenBottom}`}
        stroke={mixHex('#8fd0e0', '#c9704f', dysfunction * 0.6)}
        strokeWidth={2.2}
        fill="none"
      />

      {/* Blood flow */}
      {particles.map((p, i) => {
        const x = 60 + p * 680;
        const jitter = ((i % 4) - 1.5) * 16;
        const top = lumenTop + profile(x);
        const y = (top + lumenBottom) / 2 + jitter * ((lumenBottom - top) / 120);
        const past = x > cx + 60;
        const opacity = past ? 1 - occlusion * 0.9 : 1;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={4.2}
            fill={C.blood}
            opacity={0.55 * opacity}
          />
        );
      })}

      {/* LDL particles crossing the endothelium into the intima */}
      {lipids > 0.02
        ? Array.from({ length: 12 }, (_, i) => {
            const x = cx - 110 + rand(i) * 220;
            const dive = clamp01(lipids * 1.5 - i * 0.05);
            const y = lumenTop + profile(x) - dive * (18 + rand(i + 40) * 16);
            return (
              <circle key={i} cx={x} cy={y} r={3.4} fill={C.lipid} opacity={0.85 * lipids} />
            );
          })
        : null}

      {/*
        The plaque occupies the wall between a base line in the intima and the
        luminal surface, so the necrotic core, the foam cells and the fibrous
        cap all track the growing bulge rather than floating above it.
      */}
      {plaque > 0.02 ? (
        <ellipse
          cx={cx}
          cy={lumenTop + plaqueHeight * 0.42 - 10}
          rx={88 * plaque}
          ry={Math.max(8, plaqueHeight * 0.42) * plaque}
          fill={C.necrotic}
          opacity={0.78 * plaque}
        />
      ) : null}

      {/* Foam cells, drifting from the intima into the growing plaque */}
      {foam > 0.02
        ? Array.from({ length: 18 }, (_, i) => {
            const x = cx - 108 + rand(i + 7) * 216;
            const inWall = lumenTop - 10 - rand(i + 19) * 26;
            const inPlaque = lumenTop + plaqueHeight * (0.12 + rand(i + 31) * 0.6) - 12;
            const y = inWall + (inPlaque - inWall) * plaque;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={4.4 + rand(i + 3) * 2.2}
                fill={C.foam}
                opacity={0.6 * foam}
              />
            );
          })
        : null}

      {/* Fibrous cap: a thickened band along the luminal surface of the plaque */}
      {plaque > 0.1 ? (
        <path
          d={(() => {
            let d = `M${cx - 112} ${(lumenTop + profile(cx - 112)).toFixed(1)}`;
            for (let i = 1; i <= 16; i++) {
              const x = cx - 112 + (224 * i) / 16;
              d += ` L${x.toFixed(1)} ${(lumenTop + profile(x)).toFixed(1)}`;
            }
            return d;
          })()}
          fill="none"
          stroke={C.cap}
          strokeWidth={Math.max(1.2, 5 - rupture * 3.6)}
          strokeLinecap="round"
          opacity={0.9 * plaque}
        />
      ) : null}

      {/* Cap fissure, opening onto the necrotic core */}
      {rupture > 0.05 ? (
        <path
          d={`M${cx - 16} ${lumenTop + profile(cx - 16)} l8 -14 l-9 -7 l12 -11`}
          fill="none"
          stroke="#ffd9df"
          strokeWidth={2.6}
          strokeLinecap="round"
          opacity={rupture}
        />
      ) : null}

      {/* Thrombus growing from the ruptured surface into the lumen */}
      {thrombus > 0.02 ? (
        <>
          <path
            d={`M${cx - 84} ${lumenTop + profile(cx - 84)} Q${cx} ${
              lumenTop +
              profile(cx) +
              Math.min(lumenBottom - lumenTop - plaqueHeight - 6, (58 + 70 * occlusion) * thrombus)
            } ${cx + 88} ${lumenTop + profile(cx + 88)} Z`}
            fill={C.thrombus}
            opacity={0.95}
          />
          {Array.from({ length: 10 }, (_, i) => (
            <circle
              key={i}
              cx={cx - 62 + rand(i + 55) * 124}
              cy={lumenTop + profile(cx) + 12 + rand(i + 91) * 34 * thrombus}
              r={2.6}
              fill={C.platelet}
              opacity={0.55 * thrombus}
            />
          ))}
        </>
      ) : null}

      {/* Downstream perfusion indicator */}
      <g opacity={occlusion}>
        <rect x={628} y={356} width={112} height={30} rx={8} fill="rgba(90,40,55,0.5)" stroke="rgba(224,58,92,0.4)" />
        <Label x={684} y={375} text="flow ↓" anchor="middle" tone="#ff9bab" opacity={occlusion} />
      </g>

      {/* Callouts */}
      <Leader x1={cx} y1={lumenTop - 44} x2={cx} y2={lumenTop - 14} opacity={plaque} />
      <Label x={cx} y={lumenTop - 52} text="Atherosclerotic plaque" anchor="middle" opacity={plaque} />
      <Leader x1={150} y1={lumenTop - 30} x2={180} y2={lumenTop - 6} opacity={dysfunction} />
      <Label x={92} y={lumenTop - 38} text="Endothelial dysfunction" opacity={dysfunction} />
      <Label x={cx + 130} y={lumenTop + profile(cx) + 74} text="Thrombus" opacity={thrombus} tone="#ff9bab" />
      <Label x={70} y={368} text="Arterial wall — intima · media · adventitia" opacity={0.5} />
    </>
  );
};

/* ======================================================= MYOCARDIAL INFARCTION */

const heartOutline =
  'M250 78 C344 78 392 152 386 218 C379 306 300 388 246 408 C192 388 116 306 110 218 C104 152 156 78 250 78 Z';
const ladPath = 'M236 96 C224 158 232 250 250 402';
const territory =
  'M234 176 C196 244 196 330 248 404 C300 338 296 250 290 176 Z';

const MyocardialInfarction = (ctx: SceneContext): ReactNode => {
  const plaque = phase(ctx, 1, 2);
  const rupture = phase(ctx, 2, 3);
  const thrombus = phase(ctx, 3, 4);
  const occluded = phase(ctx, 4, 5);
  const ischaemia = phase(ctx, 5, 6);
  const injury = phase(ctx, 6, 7);
  const consequences = phase(ctx, 7, 8);

  const beat = ctx.reduced ? 0 : Math.sin((ctx.clock / 1000) * 3.6);
  const contraction = 1 - 0.02 * beat * (1 - ischaemia * 0.85);

  const territoryColour = mixHex(
    mixHex(C.muscle, C.ischaemic, ischaemia),
    C.infarct,
    injury,
  );

  const particles = flowOffsets(9, 0.5 * (1 - occluded * 0.97), ctx.clock, ctx.reduced);

  return (
    <>
      <Backdrop />

      {/* Myocardium */}
      <g transform={`translate(248 240) scale(${contraction.toFixed(4)}) translate(-248 -240)`}>
        <path d={heartOutline} fill="#7d2b3d" opacity={0.92} />
        <path d={heartOutline} fill="none" stroke="rgba(255,160,180,0.28)" strokeWidth={1.5} />
        <path d={territory} fill={territoryColour} opacity={0.35 + 0.5 * Math.max(ischaemia, injury)} />
        {injury > 0.2
          ? Array.from({ length: 14 }, (_, i) => (
              <circle
                key={i}
                cx={222 + rand(i) * 60}
                cy={200 + rand(i + 30) * 190}
                r={2 + rand(i + 60) * 2}
                fill="#2f2b35"
                opacity={injury * 0.8}
              />
            ))
          : null}

        {/* Coronary arteries */}
        <path d={ladPath} fill="none" stroke={mixHex('#ef5350', '#5c6273', occluded)} strokeWidth={7} strokeLinecap="round" />
        <path d="M236 118 C288 128 330 150 352 186" fill="none" stroke="#ef5350" strokeWidth={5.5} strokeLinecap="round" />
        <path d="M236 118 C186 130 146 156 128 196" fill="none" stroke="#ef5350" strokeWidth={5.5} strokeLinecap="round" />

        {/* Flowing blood in the LAD, stopping at the occlusion */}
        {particles.map((p, i) => {
          const pos = quadAt([236, 96], [226, 200], [250, 402], p);
          const stopped = occluded > 0.4 && p > 0.24;
          return (
            <circle
              key={i}
              cx={pos[0]}
              cy={pos[1]}
              r={2.6}
              fill="#ffd4d9"
              opacity={stopped ? 0.08 : 0.85}
            />
          );
        })}

        {/* Occlusion marker */}
        {thrombus > 0.05 ? (
          <circle cx={233} cy={186} r={7 + 4 * thrombus} fill={C.thrombus} stroke="#ffd9df" strokeWidth={1.4} />
        ) : null}
      </g>

      <Label x={110} y={62} text="Left anterior descending artery" opacity={0.75} />
      <Leader x1={200} y1={70} x2={234} y2={110} opacity={0.55} />
      <Label x={126} y={430} text="Anteroseptal territory at risk" opacity={Math.max(ischaemia, 0.25)} />

      {/* Inset: the culprit lesion in close-up */}
      <g>
        <rect x={470} y={40} width={300} height={168} rx={14} fill="rgba(11,17,32,0.72)" stroke="rgba(140,180,230,0.22)" />
        <Label x={486} y={62} text="Culprit lesion" opacity={0.8} />
        <rect x={490} y={78} width={260} height={110} rx={16} fill={C.wallDeep} />
        {(() => {
          // Same construction as the atherosclerosis scene, at inset scale:
          // a luminal profile that the plaque, cap and thrombus all follow.
          const icx = 620;
          const top = 96;
          const bottom = 170;
          const height = 34 * plaque + 8 * occluded;
          const prof = (x: number): number => height * Math.exp(-Math.pow((x - icx) / 44, 2));
          let lumen = `M498 ${top}`;
          for (let i = 1; i <= 20; i++) {
            const x = 498 + (244 * i) / 20;
            lumen += ` L${x.toFixed(1)} ${(top + prof(x)).toFixed(1)}`;
          }
          const cap = (() => {
            let d = `M${icx - 54} ${(top + prof(icx - 54)).toFixed(1)}`;
            for (let i = 1; i <= 10; i++) {
              const x = icx - 54 + (108 * i) / 10;
              d += ` L${x.toFixed(1)} ${(top + prof(x)).toFixed(1)}`;
            }
            return d;
          })();
          return (
            <>
              <path d={`${lumen} L742 ${bottom} L498 ${bottom} Z`} fill={C.lumen} />
              {plaque > 0.02 ? (
                <ellipse
                  cx={icx}
                  cy={top + height * 0.42 - 5}
                  rx={44 * plaque}
                  ry={Math.max(5, height * 0.42) * plaque}
                  fill={C.necrotic}
                  opacity={0.85}
                />
              ) : null}
              {plaque > 0.1 ? (
                <path
                  d={cap}
                  fill="none"
                  stroke={C.cap}
                  strokeWidth={Math.max(1, 3.4 - rupture * 2.5)}
                  strokeLinecap="round"
                />
              ) : null}
              {rupture > 0.05 ? (
                <path
                  d={`M${icx - 8} ${top + prof(icx - 8)} l5 -8 l-6 -4 l8 -7`}
                  fill="none"
                  stroke="#ffd9df"
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={rupture}
                />
              ) : null}
              {thrombus > 0.03 ? (
                <path
                  d={`M${icx - 42} ${top + prof(icx - 42)} Q${icx} ${
                    top + prof(icx) + Math.min(bottom - top - height - 4, (26 + 34 * occluded) * thrombus)
                  } ${icx + 44} ${top + prof(icx + 44)} Z`}
                  fill={C.thrombus}
                />
              ) : null}
              {flowOffsets(7, 0.55 * (1 - occluded * 0.95), ctx.clock, ctx.reduced).map((p, i) => {
                const x = 498 + p * 244;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={156}
                    r={3.2}
                    fill={C.blood}
                    opacity={occluded > 0.5 && x > icx + 20 ? 0.08 : 0.6}
                  />
                );
              })}
            </>
          );
        })()}
      </g>

      {/* ECG strip developing ST elevation */}
      <g>
        <rect x={470} y={250} width={300} height={150} rx={14} fill="rgba(11,17,32,0.72)" stroke="rgba(140,180,230,0.22)" />
        <Label x={486} y={272} text="Lead V3" opacity={0.7} />
        <path
          d={ecgPath({
            x0: 486,
            x1: 754,
            yBase: 340,
            amplitude: 44,
            seconds: 3,
            stElevation: ischaemia * 0.6 + injury * 0.5,
            offset: ctx.reduced ? 0 : (ctx.clock / 1000) * 0.6,
          })}
          fill="none"
          stroke={mixHex('#3ccfe6', '#ff6b83', Math.max(ischaemia, injury))}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Label
          x={754}
          y={392}
          text={injury > 0.4 ? 'ST elevation' : ischaemia > 0.3 ? 'ST change' : 'Sinus rhythm'}
          anchor="end"
          tone={injury > 0.4 ? '#ff9bab' : C.label}
          opacity={0.9}
        />
      </g>

      <g opacity={consequences}>
        <rect x={470} y={214} width={300} height={26} rx={8} fill="rgba(122,27,44,0.35)" stroke="rgba(224,58,92,0.4)" />
        <Label x={620} y={231} text="Troponin release · arrhythmia risk" anchor="middle" tone="#ff9bab" opacity={consequences} />
      </g>
    </>
  );
};

/* =============================================================== HEART FAILURE */

const HeartFailure = (ctx: SceneContext): ReactNode => {
  const dysfunction = phase(ctx, 1, 2);
  const lowOutput = phase(ctx, 2, 3);
  const compensation = phase(ctx, 3, 4);
  const congestion = phase(ctx, 4, 5);
  const remodelling = phase(ctx, 5, 6);
  const valve = phase(ctx, 6, 7);
  const progressive = phase(ctx, 7, 8);

  const cx = 268;
  const cy = 226;
  const beatPhase = ctx.reduced ? 0 : (Math.sin((ctx.clock / 1000) * 3.2) + 1) / 2;
  // Contractile excursion falls as the ventricle fails.
  const excursion = 0.16 * (1 - dysfunction * 0.62 - progressive * 0.22);
  const dilate = 1 + remodelling * 0.34 + progressive * 0.08;
  const wall = 30 * (1 - remodelling * 0.34);
  const rOuter = 106 * dilate;
  const rInner = (rOuter - wall) * (1 - excursion * beatPhase);
  const ef = Math.round(62 - dysfunction * 22 - remodelling * 10 - progressive * 6);

  return (
    <>
      <Backdrop />

      {/* Left ventricle in short axis */}
      <circle cx={cx} cy={cy} r={rOuter} fill="#7d2b3d" opacity={0.9} />
      <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="rgba(255,160,180,0.3)" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={rInner} fill={C.lumen} />
      {remodelling > 0.15
        ? Array.from({ length: 26 }, (_, i) => {
            const a = rand(i) * Math.PI * 2;
            const rr = rInner + 6 + rand(i + 12) * (rOuter - rInner - 10);
            return (
              <circle
                key={i}
                cx={cx + Math.cos(a) * rr}
                cy={cy + Math.sin(a) * rr}
                r={2 + rand(i + 40) * 1.8}
                fill="#e6ebf4"
                opacity={remodelling * 0.85}
              />
            );
          })
        : null}
      <Label x={cx} y={cy + rOuter + 30} text="Left ventricle — short axis" anchor="middle" opacity={0.6} />
      <Label
        x={cx}
        y={cy + rOuter + 48}
        text={remodelling > 0.3 ? 'Dilated · fibrotic · spherical' : 'Wall motion'}
        anchor="middle"
        opacity={0.45}
      />

      {/* Ejection arrow, shortening as forward output falls */}
      <g opacity={0.9}>
        <path
          d={`M${cx + rOuter + 10} ${cy} l${28 + 62 * (1 - lowOutput * 0.72)} 0`}
          stroke={mixHex('#e0455f', '#6d8fd6', lowOutput)}
          strokeWidth={10}
          strokeLinecap="round"
        />
        <path
          d={`M${cx + rOuter + 40 + 62 * (1 - lowOutput * 0.72)} ${cy - 11} l16 11 l-16 11 z`}
          fill={mixHex('#e0455f', '#6d8fd6', lowOutput)}
        />
        <Label x={462} y={cy - 24} text="Stroke volume" anchor="end" opacity={0.75} />
      </g>

      {/* Regurgitant jet from functional mitral regurgitation */}
      {valve > 0.05 ? (
        <>
          <path
            d={`M${cx - 6} ${cy - rInner + 6} l0 -${34 * valve}`}
            stroke="#7fb2ff"
            strokeWidth={7 * valve}
            strokeLinecap="round"
            opacity={0.8}
          />
          <Label x={cx + 12} y={cy - rOuter - 12} text="Functional MR" opacity={valve} tone="#9cc3ff" />
        </>
      ) : null}

      {/* Readouts */}
      <g>
        <rect x={470} y={54} width={300} height={116} rx={14} fill="rgba(11,17,32,0.72)" stroke="rgba(140,180,230,0.22)" />
        <Label x={488} y={78} text="Ejection fraction" opacity={0.7} />
        <text
          x={488}
          y={124}
          fill={ef < 40 ? '#ff8fa3' : ef < 50 ? C.amber : C.cyan}
          style={{ font: '600 40px ui-monospace, "IBM Plex Mono", monospace', letterSpacing: '-0.02em' }}
        >
          {ef}%
        </text>
        <rect x={584} y={96} width={166} height={10} rx={5} fill="rgba(255,255,255,0.08)" />
        <rect
          x={584}
          y={96}
          width={Math.max(6, (166 * ef) / 70)}
          height={10}
          rx={5}
          fill={ef < 40 ? '#e0455f' : ef < 50 ? C.amber : C.cyan}
        />
        <Label x={488} y={152} text={ef < 40 ? 'HFrEF range' : ef < 50 ? 'Mildly reduced' : 'Preserved'} opacity={0.65} />
      </g>

      {/* Neurohormonal activation */}
      <g>
        <Label x={470} y={206} text="Compensatory activation" opacity={0.7} />
        {[
          { label: 'Sympathetic', at: 0 },
          { label: 'RAAS', at: 1 },
          { label: 'Na⁺ / H₂O retention', at: 2 },
        ].map((item, i) => {
          const on = clamp01(compensation * 3 - item.at);
          return (
            <g key={item.label}>
              <rect
                x={470}
                y={220 + i * 34}
                width={300}
                height={26}
                rx={8}
                fill={`rgba(224,58,92,${0.08 + 0.22 * on})`}
                stroke={`rgba(224,58,92,${0.15 + 0.4 * on})`}
              />
              <Label x={484} y={237 + i * 34} text={item.label} opacity={0.4 + 0.6 * on} tone={on > 0.5 ? '#ffb3c0' : C.label} />
              <rect x={700} y={228 + i * 34} width={56} height={10} rx={5} fill="rgba(255,255,255,0.08)" />
              <rect x={700} y={228 + i * 34} width={Math.max(4, 56 * on)} height={10} rx={5} fill="#e0455f" />
            </g>
          );
        })}
      </g>

      {/* Pulmonary congestion */}
      <g>
        <Label x={470} y={344} text="Filling pressure · congestion" opacity={0.7} />
        <rect x={470} y={356} width={300} height={16} rx={8} fill="rgba(255,255,255,0.07)" />
        <rect
          x={470}
          y={356}
          width={Math.max(10, 300 * clamp01(0.18 + congestion * 0.62 + progressive * 0.2))}
          height={16}
          rx={8}
          fill={mixHex('#3ccfe6', '#e0455f', congestion)}
        />
        <Label
          x={470}
          y={392}
          text={congestion > 0.4 ? 'Pulmonary & systemic congestion' : 'Normal filling pressures'}
          opacity={0.7}
          tone={congestion > 0.4 ? '#ff9bab' : C.label}
        />
      </g>

      <g opacity={progressive}>
        <rect x={60} y={392} width={340} height={30} rx={8} fill="rgba(122,27,44,0.3)" stroke="rgba(224,58,92,0.35)" />
        <Label x={230} y={411} text="Remodelling → further dysfunction" anchor="middle" tone="#ff9bab" opacity={progressive} />
      </g>
    </>
  );
};

/* ============================================================= AORTIC STENOSIS */

const AorticStenosis = (ctx: SceneContext): ReactNode => {
  const injury = phase(ctx, 1, 2);
  const calcify = phase(ctx, 2, 3);
  const restricted = phase(ctx, 3, 4);
  const gradient = phase(ctx, 4, 5);
  const hypertrophy = phase(ctx, 5, 6);
  const ischaemia = phase(ctx, 6, 7);
  const symptoms = phase(ctx, 7, 8);

  const vcx = 232;
  const vcy = 198;
  const outerR = 116;
  const beat = ctx.reduced ? 0.5 : (Math.sin((ctx.clock / 1000) * 3.0) + 1) / 2;
  // Cusp opening: wide and mobile at first, progressively restricted.
  // How far the free edges retract towards the annulus: 0 = closed (edges meet
  // in the centre), 1 = fully open. Stenosis caps the achievable opening.
  const opening = (0.06 + 0.94 * beat) * (1 - restricted * 0.82);
  const cuspThickness = 12 + injury * 12 + calcify * 10;
  const area = Math.max(0.35, 3.6 - restricted * 2.9).toFixed(1);
  const meanGradient = Math.round(4 + gradient * 46 + restricted * 6);
  const wallThickness = 20 + hypertrophy * 26;

  /**
   * One semilunar cusp: an arc along the annulus, closed by a quadratic whose
   * midpoint sits at the free edge. The control radius is solved so that the
   * curve actually passes through `rFree` — with rFree = 0 the three cusps
   * meet in the centre (a closed valve) and with rFree large they retract to
   * leave the triangular systolic orifice.
   */
  const cusp = (index: number): string => {
    const gap = 0.055; // commissural separation, so three leaflets read distinctly
    const span = (2 * Math.PI) / 3;
    const a0 = index * span - Math.PI / 2 + gap;
    const a1 = a0 + span - gap * 2;
    const rOut = outerR - 6;
    const rFree = rOut * 0.62 * opening;
    // B(0.5) = 0.25·P0 + 0.5·C + 0.25·P2, and |P0+P2|/2 lies at rOut·cos(span/2).
    const chordR = rOut * Math.cos((a1 - a0) / 2);
    const controlR = 2 * rFree - chordR;
    const mid = (a0 + a1) / 2;
    const p = (a: number, r: number): string =>
      `${(vcx + Math.cos(a) * r).toFixed(1)} ${(vcy + Math.sin(a) * r).toFixed(1)}`;
    return `M${p(a0, rOut)} A${rOut} ${rOut} 0 0 1 ${p(a1, rOut)} Q${p(mid, controlR)} ${p(a0, rOut)} Z`;
  };

  return (
    <>
      <Backdrop />

      {/* Aortic valve, en face */}
      <circle cx={vcx} cy={vcy} r={outerR} fill="#241a24" stroke="rgba(140,180,230,0.24)" strokeWidth={1.5} />
      <circle cx={vcx} cy={vcy} r={outerR - 4} fill={C.lumen} />
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={cusp(i)}
          fill={mixHex('#9ad8e6', '#d8dfe8', injury * 0.6 + calcify * 0.5)}
          stroke={mixHex('#bfeaf5', '#ffffff', calcify)}
          strokeWidth={cuspThickness / 8}
          opacity={0.92}
        />
      ))}
      {calcify > 0.05
        ? Array.from({ length: 22 }, (_, i) => {
            const a = rand(i) * Math.PI * 2;
            const r = 42 + rand(i + 21) * (outerR - 56);
            return (
              <circle
                key={i}
                cx={vcx + Math.cos(a) * r}
                cy={vcy + Math.sin(a) * r}
                r={1.8 + rand(i + 44) * 2.6}
                fill={C.calcium}
                opacity={calcify * 0.9}
              />
            );
          })
        : null}
      <Label x={vcx} y={vcy + outerR + 26} text="Aortic valve — en face" anchor="middle" opacity={0.6} />
      <Label
        x={vcx}
        y={vcy + outerR + 44}
        text={`Valve area ≈ ${area} cm²`}
        anchor="middle"
        opacity={0.85}
        tone={Number(area) < 1.1 ? '#ff9bab' : C.label}
      />

      {/* Left ventricle in long axis, hypertrophying */}
      <g>
        <Label x={470} y={62} text="Left ventricle — long axis" opacity={0.65} />
        <path
          d={`M540 90 Q690 90 690 200 Q690 330 615 372 Q540 330 540 200 Z`}
          fill="#7d2b3d"
          opacity={0.9}
        />
        <path
          d={`M${540 + wallThickness} ${90 + wallThickness * 0.7} Q${690 - wallThickness} ${
            90 + wallThickness * 0.7
          } ${690 - wallThickness} 200 Q${690 - wallThickness} ${330 - wallThickness} 615 ${
            372 - wallThickness
          } Q${540 + wallThickness} ${330 - wallThickness} ${540 + wallThickness} 200 Z`}
          fill={C.lumen}
        />
        {ischaemia > 0.1
          ? Array.from({ length: 16 }, (_, i) => {
              const a = rand(i) * Math.PI * 2;
              return (
                <circle
                  key={i}
                  cx={615 + Math.cos(a) * (44 + rand(i + 5) * 26)}
                  cy={215 + Math.sin(a) * (74 + rand(i + 9) * 34)}
                  r={2.4}
                  fill={C.ischaemic}
                  opacity={ischaemia * 0.7}
                />
              );
            })
          : null}
        <Label
          x={470}
          y={404}
          text={hypertrophy > 0.4 ? 'Concentric hypertrophy' : 'Normal wall thickness'}
          opacity={0.8}
          tone={hypertrophy > 0.4 ? C.amber : C.label}
        />
      </g>

      {/* Turbulent jet through the restricted orifice */}
      {gradient > 0.05 ? (
        <g opacity={gradient}>
          {flowOffsets(9, 1.1, ctx.clock, ctx.reduced).map((p, i) => (
            <circle
              key={i}
              cx={378 + p * 128}
              cy={198 + Math.sin(p * 9 + i) * (6 + 12 * p)}
              r={3}
              fill="#ffd4d9"
              opacity={0.7}
            />
          ))}
          <Label x={444} y={164} text="High-velocity jet" anchor="middle" opacity={gradient} tone="#ffd4d9" />
        </g>
      ) : null}

      {/* Gradient readout */}
      <g>
        <rect x={60} y={378} width={300} height={62} rx={12} fill="rgba(11,17,32,0.72)" stroke="rgba(140,180,230,0.22)" />
        <Label x={76} y={400} text="Mean gradient" opacity={0.7} />
        <text
          x={76}
          y={430}
          fill={meanGradient >= 40 ? '#ff8fa3' : C.cyan}
          style={{ font: '600 22px ui-monospace, "IBM Plex Mono", monospace' }}
        >
          {meanGradient} mmHg
        </text>
        <rect x={220} y={412} width={124} height={9} rx={4.5} fill="rgba(255,255,255,0.08)" />
        <rect
          x={220}
          y={412}
          width={Math.max(6, (124 * meanGradient) / 60)}
          height={9}
          rx={4.5}
          fill={meanGradient >= 40 ? '#e0455f' : C.cyan}
        />
      </g>

      <g opacity={symptoms}>
        <rect x={470} y={416} width={300} height={26} rx={8} fill="rgba(122,27,44,0.35)" stroke="rgba(224,58,92,0.4)" />
        <Label x={620} y={433} text="Angina · syncope · heart failure" anchor="middle" tone="#ff9bab" opacity={symptoms} />
      </g>
    </>
  );
};

/* ========================================================== ATRIAL FIBRILLATION */

const AtrialFibrillation = (ctx: SceneContext): ReactNode => {
  const substrate = phase(ctx, 1, 2);
  const triggers = phase(ctx, 2, 3);
  const chaos = phase(ctx, 3, 4);
  const noContraction = phase(ctx, 4, 5);
  const irregular = phase(ctx, 5, 6);
  const stasis = phase(ctx, 6, 7);
  const embolism = phase(ctx, 7, 8);

  const time = ctx.reduced ? 0 : ctx.clock / 1000;
  const organised = 1 - chaos;

  return (
    <>
      <Backdrop />

      {/* Atria, viewed from behind */}
      <g>
        {/* Right atrium */}
        <ellipse cx={250} cy={190} rx={104} ry={88} fill="#2c4a72" opacity={0.92} />
        <ellipse cx={250} cy={190} rx={104} ry={88} fill="none" stroke="rgba(140,190,255,0.3)" strokeWidth={1.4} />
        {/* Left atrium */}
        <ellipse cx={452} cy={186} rx={110} ry={92} fill="#6f2b3d" opacity={0.92} />
        <ellipse cx={452} cy={186} rx={110} ry={92} fill="none" stroke="rgba(255,160,180,0.3)" strokeWidth={1.4} />
        <Label x={250} y={296} text="Right atrium" anchor="middle" opacity={0.6} />
        <Label x={452} y={296} text="Left atrium" anchor="middle" opacity={0.6} />

        {/* Fibrosis in the atrial wall */}
        {substrate > 0.05
          ? Array.from({ length: 34 }, (_, i) => {
              const left = i % 2 === 0;
              const cx = left ? 250 : 452;
              const rx = left ? 96 : 102;
              const a = rand(i) * Math.PI * 2;
              const rr = rand(i + 17);
              return (
                <circle
                  key={i}
                  cx={cx + Math.cos(a) * rx * rr}
                  cy={190 + Math.sin(a) * 84 * rr}
                  r={2 + rand(i + 33) * 2}
                  fill="#cbd5e4"
                  opacity={substrate * 0.4}
                />
              );
            })
          : null}

        {/* Sinuatrial node and its organised wavefront */}
        <circle cx={196} cy={124} r={9} fill={C.amber} opacity={0.9} />
        <Label x={150} y={106} text="SA node" opacity={0.75} tone={C.amber} />
        {organised > 0.05
          ? [0, 1, 2].map((i) => {
              const r = ((time * 46 + i * 34) % 110) + 10;
              return (
                <circle
                  key={i}
                  cx={196}
                  cy={124}
                  r={r}
                  fill="none"
                  stroke={C.amber}
                  strokeWidth={1.6}
                  opacity={organised * 0.5 * (1 - r / 130)}
                />
              );
            })
          : null}

        {/* Pulmonary vein ostia and their ectopic triggers */}
        {[
          [536, 128],
          [548, 200],
        ].map(([px, py], i) => (
          <g key={i}>
            <circle cx={px} cy={py} r={16} fill="#8d3247" stroke="rgba(255,160,180,0.4)" />
            {triggers > 0.05 ? (
              <circle
                cx={px}
                cy={py}
                r={16 + ((time * 60 + i * 25) % 40)}
                fill="none"
                stroke="#ff8fa3"
                strokeWidth={2}
                opacity={triggers * (1 - (((time * 60 + i * 25) % 40) / 40))}
              />
            ) : null}
          </g>
        ))}
        <Label x={576} y={110} text="Pulmonary vein triggers" opacity={triggers} tone="#ff9bab" />

        {/* Chaotic re-entrant wavelets */}
        {chaos > 0.05
          ? Array.from({ length: 14 }, (_, i) => {
              const left = i % 2 === 0;
              const bx = left ? 250 : 452;
              const a = rand(i) * Math.PI * 2 + time * (0.8 + rand(i + 3));
              const rr = 26 + rand(i + 11) * 62;
              const x = bx + Math.cos(a) * rr;
              const y = 190 + Math.sin(a) * rr * 0.82;
              const s = 10 + rand(i + 21) * 14;
              return (
                <path
                  key={i}
                  d={`M${x - s} ${y} A${s} ${s} 0 0 ${i % 2} ${x + s} ${y - s * 0.4}`}
                  fill="none"
                  stroke={left ? '#7fb2ff' : '#ff9bab'}
                  strokeWidth={2.2}
                  opacity={chaos * 0.75}
                  strokeLinecap="round"
                />
              );
            })
          : null}

        {/* Left atrial appendage with stasis and thrombus */}
        <path d="M552 244 q34 22 34 54 q-26 16 -46 -8 q-12 -22 12 -46 z" fill="#5c2334" stroke="rgba(255,160,180,0.35)" />
        <Label x={600} y={306} text="Left atrial appendage" opacity={0.6} anchor="middle" />
        {stasis > 0.05
          ? Array.from({ length: 6 }, (_, i) => {
              const a = time * 0.9 + i;
              return (
                <circle
                  key={i}
                  cx={566 + Math.cos(a) * 12}
                  cy={274 + Math.sin(a) * 12}
                  r={2.4}
                  fill="#ffd4d9"
                  opacity={stasis * 0.6}
                />
              );
            })
          : null}
        {embolism > 0.1 ? (
          <>
            <circle cx={566} cy={274} r={9 + 4 * embolism} fill={C.thrombus} stroke="#ffd9df" strokeWidth={1.2} />
            <path
              d={`M566 274 Q${640 + 60 * embolism} ${240 - 60 * embolism} ${700 + 40 * embolism} ${
                120 - 40 * embolism
              }`}
              fill="none"
              stroke="#ff9bab"
              strokeWidth={2}
              strokeDasharray="5 5"
              opacity={embolism}
            />
            <Label x={700} y={100} text="Systemic embolism" anchor="end" tone="#ff9bab" opacity={embolism} />
          </>
        ) : null}
      </g>

      {/* Atrial contraction indicator */}
      <g>
        <rect x={60} y={318} width={300} height={30} rx={8} fill={`rgba(224,58,92,${0.08 + 0.2 * noContraction})`} stroke={`rgba(224,58,92,${0.2 + 0.3 * noContraction})`} />
        <Label
          x={210}
          y={337}
          text={noContraction > 0.4 ? 'Atrial kick lost — filling ↓ 20–30%' : 'Coordinated atrial contraction'}
          anchor="middle"
          opacity={0.9}
          tone={noContraction > 0.4 ? '#ff9bab' : C.label}
        />
      </g>

      {/* Rhythm strip */}
      <g>
        <rect x={60} y={358} width={710} height={78} rx={12} fill="rgba(11,17,32,0.72)" stroke="rgba(140,180,230,0.22)" />
        <path
          d={ecgPath({
            x0: 74,
            x1: 756,
            yBase: 400,
            amplitude: 30,
            seconds: 6,
            rate: 74 + irregular * 34,
            pWave: 1 - chaos * 0.95,
            irregularity: irregular * 0.55,
            fibrillation: chaos,
            offset: ctx.reduced ? 0 : time * 0.7,
          })}
          fill="none"
          stroke={mixHex('#3ccfe6', '#ff9bab', chaos)}
          strokeWidth={1.8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Label
          x={74}
          y={378}
          text={
            chaos > 0.5
              ? irregular > 0.4
                ? 'Absent P waves · irregularly irregular'
                : 'Absent P waves · fibrillatory baseline'
              : 'Sinus rhythm'
          }
          opacity={0.85}
          tone={chaos > 0.5 ? '#ff9bab' : C.label}
        />
      </g>

      <Label x={60} y={62} text="Atria viewed from behind" opacity={0.55} />
      <Label x={60} y={80} text={`Atrial rate ≈ ${Math.round(70 + chaos * 380)} / min`} opacity={0.75} tone={chaos > 0.4 ? '#ff9bab' : C.label} />
    </>
  );
};

/* ------------------------------------------------------------- Dispatcher -- */

const SCENES: Record<AnimationSceneId, (ctx: SceneContext) => ReactNode> = {
  atherosclerosis: Atherosclerosis,
  'myocardial-infarction': MyocardialInfarction,
  'heart-failure': HeartFailure,
  'aortic-stenosis': AorticStenosis,
  'atrial-fibrillation': AtrialFibrillation,
  ...VASCULAR_SCENES,
  ...VALVE_SCENES,
  ...MYOCARDIAL_SCENES,
  ...ELECTRICAL_SCENES,
};

export const renderScene = (id: AnimationSceneId, ctx: SceneContext): ReactNode => {
  const scene = SCENES[id];
  if (!scene) return null;
  return scene(ctx);
};

export const SCENE_VIEWBOX = `0 0 ${W} ${H}`;
export { smoothstep };
