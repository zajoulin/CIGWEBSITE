/* ==========================================================================
   CIG — Pathophysiology scenes: arteries, veins and the pulmonary circulation
   --------------------------------------------------------------------------
   Aortic aneurysm · aortic dissection · pulmonary embolism · deep vein
   thrombosis · pulmonary hypertension · hypertension · peripheral arterial
   disease · chronic venous insufficiency.

   Each scene is a pure function of the animation context, so scrubbing the
   timeline reproduces frames exactly. Geometry is deliberately diagrammatic:
   these are teaching illustrations, not depictions of an individual patient.
   ========================================================================== */

import type { ReactNode } from 'react';
import {
  Arrow,
  Backdrop,
  Banner,
  Chamber,
  CurvedArrow,
  FlowPath,
  Jet,
  Label,
  Leader,
  Meter,
  Numeral,
  Panel,
  RowsPanel,
  Speckle,
  StatPanel,
  Trace,
  VenousValve,
  along,
} from './sceneKit';
import {
  PALETTE as C,
  clamp01,
  flowOffsets,
  mixHex,
  phase,
  rand,
  smoothstep,
  type SceneContext,
} from './sceneUtils';

type Scene = (ctx: SceneContext) => ReactNode;

/* --------------------------------------------------------------- helpers -- */

type Pt = [number, number];

/** Offsets a polyline perpendicular to its own direction — used to build the
 *  wall, lumen and dissection flap of a curved vessel from one centreline. */
const offsetLine = (pts: Pt[], d: number): Pt[] =>
  pts.map((p, i) => {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    return [p[0] - (dy / len) * d, p[1] + (dx / len) * d] as Pt;
  });

const toPath = (pts: Pt[], close = false): string =>
  pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') +
  (close ? ' Z' : '');

/** A ribbon between two offset lines, drawn as one filled polygon. */
const ribbon = (a: Pt[], b: Pt[]): string => `${toPath(a)} ${toPath([...b].reverse()).replace('M', 'L')} Z`;

/** Samples a smooth centreline through the given control points. */
const resample = (pts: Pt[], n: number): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => along(pts, i / n));

/* ======================================================== AORTIC ANEURYSM -- */

const AorticAneurysm: Scene = (ctx) => {
  const degeneration = phase(ctx, 1, 2);
  const proteolysis = phase(ctx, 2, 3);
  const dilating = phase(ctx, 3, 4);
  const laplace = phase(ctx, 4, 5);
  const thrombus = phase(ctx, 5, 6);
  const rupture = phase(ctx, 6, 7);

  const x0 = 52;
  const x1 = 470;
  const cy = 214;
  const at = 268;
  const baseR = 30;
  const bulge = 20 * dilating + 40 * laplace + 10 * thrombus;
  const spread = (x: number): number => Math.exp(-Math.pow((x - at) / 96, 2));
  const radius = (x: number): number => baseR + bulge * spread(x);

  const steps = 60;
  const xs = Array.from({ length: steps + 1 }, (_, i) => x0 + ((x1 - x0) * i) / steps);
  const upper = (pad: number): Pt[] => xs.map((x) => [x, cy - radius(x) - pad] as Pt);
  const lower = (pad: number): Pt[] => xs.map((x) => [x, cy + radius(x) + pad] as Pt);

  const diameter = (2 * (baseR + bulge)) / baseR;
  const tension = clamp01((baseR + bulge) / 92);
  const risk = clamp01(dilating * 0.2 + laplace * 0.5 + thrombus * 0.15 + rupture);

  return (
    <>
      <Backdrop />

      {/* Adventitia and media, thinning as the wall degenerates */}
      <path d={ribbon(upper(13), upper(0))} fill="#3a2c39" opacity={0.95} />
      <path d={ribbon(lower(0), lower(13))} fill="#3a2c39" opacity={0.95} />
      <path d={ribbon(upper(0), upper(-9))} fill={mixHex('#6d7f9c', '#4a4550', degeneration)} opacity={0.9} />
      <path d={ribbon(lower(-9), lower(0))} fill={mixHex('#6d7f9c', '#4a4550', degeneration)} opacity={0.9} />

      {/* Lumen */}
      <path d={ribbon(upper(-9), lower(-9))} fill={C.lumen} />

      {/* Elastic lamellae — continuous at first, fragmented as elastin is lost */}
      {[-2, -5].map((k, i) => (
        <path
          key={i}
          d={toPath(xs.map((x) => [x, cy - radius(x) - k] as Pt))}
          fill="none"
          stroke="#9fb4d4"
          strokeWidth={1}
          opacity={0.5 * (1 - degeneration * 0.65)}
          strokeDasharray={degeneration > 0.1 ? `${16 - degeneration * 13} ${degeneration * 12}` : undefined}
        />
      ))}
      {[-2, -5].map((k, i) => (
        <path
          key={`b${i}`}
          d={toPath(xs.map((x) => [x, cy + radius(x) + k] as Pt))}
          fill="none"
          stroke="#9fb4d4"
          strokeWidth={1}
          opacity={0.5 * (1 - degeneration * 0.65)}
          strokeDasharray={degeneration > 0.1 ? `${16 - degeneration * 13} ${degeneration * 12}` : undefined}
        />
      ))}

      {/* Inflammatory cells releasing matrix metalloproteinases */}
      {proteolysis > 0.02 ? (
        <>
          <Speckle cx={at} cy={cy - baseR - 6} rx={92} ry={7} count={12} seed={4} tone="#f2b544" r={2.4} opacity={proteolysis * 0.85} />
          <Speckle cx={at} cy={cy + baseR + 6} rx={92} ry={7} count={12} seed={22} tone="#f2b544" r={2.4} opacity={proteolysis * 0.85} />
        </>
      ) : null}

      {/* Laminated mural thrombus, confined to the sac and thickest at its centre */}
      {thrombus > 0.02
        ? (() => {
            /* Thickness follows the bulge, so no thrombus is drawn where the
               aorta is still of normal calibre. */
            const lining = (x: number): number => Math.max(0, spread(x) - 0.12) * 26 * thrombus;
            const top = (k: number): Pt[] => xs.map((x) => [x, cy - radius(x) + 9 + lining(x) * k] as Pt);
            const bot = (k: number): Pt[] => xs.map((x) => [x, cy + radius(x) - 9 - lining(x) * k] as Pt);
            return (
              <>
                <path d={ribbon(top(0), top(1))} fill={C.thrombus} opacity={0.92} />
                <path d={ribbon(bot(1), bot(0))} fill={C.thrombus} opacity={0.92} />
                {[0.35, 0.7].map((k) => (
                  <path key={k} d={toPath(top(k))} stroke="#a8556a" strokeWidth={1} fill="none" opacity={0.6} />
                ))}
                {[0.35, 0.7].map((k) => (
                  <path key={`b${k}`} d={toPath(bot(k))} stroke="#a8556a" strokeWidth={1} fill="none" opacity={0.6} />
                ))}
              </>
            );
          })()
        : null}

      {/* Flow: laminar in the normal segment, recirculating within the sac */}
      {flowOffsets(14, 0.5, ctx.clock, ctx.reduced).map((p, i) => {
        const x = x0 + p * (x1 - x0);
        const swirl = Math.sin(p * 6 + i) * radius(x) * 0.5 * (0.2 + laplace * 0.8);
        return <circle key={i} cx={x} cy={cy + swirl} r={3.6} fill={C.blood} opacity={0.5} />;
      })}

      {/* Rupture: the wall tears and blood escapes into the retroperitoneum */}
      {rupture > 0.05 ? (
        <g>
          <path
            d={`M${at - 26} ${cy - radius(at - 26) - 6} l14 -12 l-8 -12 l18 -10`}
            stroke="#ffd9df"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            opacity={rupture}
          />
          {Array.from({ length: 16 }, (_, i) => {
            const a = -Math.PI / 2 - 0.6 + rand(i) * 1.2;
            const d = 10 + rand(i + 30) * 70 * rupture;
            return (
              <circle
                key={i}
                cx={at - 12 + Math.cos(a) * d}
                cy={cy - radius(at) - 6 + Math.sin(a) * d}
                r={3 + rand(i + 9) * 2}
                fill={C.blood}
                opacity={rupture * 0.75}
              />
            );
          })}
        </g>
      ) : null}

      <Label x={x0 + 4} y={cy + 118} text="Abdominal aorta — longitudinal section" opacity={0.55} />
      <Leader x1={at - 112} y1={cy - 62} x2={at - 58} y2={cy - radius(at - 58) - 14} opacity={dilating} />
      <Label x={at - 118} y={cy - 66} text="Aneurysm sac" anchor="end" opacity={dilating} />
      <Label x={x0 + 4} y={94} text="Intima · media · adventitia" opacity={0.5} />

      {/* Instruments */}
      <StatPanel
        x={496}
        y={40}
        w={272}
        title="Maximum diameter"
        value={`${diameter.toFixed(1)} cm`}
        meter={diameter / 7}
        tone={diameter >= 5.5 ? '#ff8fa3' : diameter >= 4 ? C.amber : C.cyan}
        caption={diameter >= 5.5 ? 'Repair threshold exceeded' : diameter >= 3 ? 'Aneurysmal — surveillance' : 'Normal calibre'}
        captionTone={diameter >= 5.5 ? '#ff9bab' : C.label}
      />

      <Panel x={496} y={156} w={272} h={86} title="Wall tension  T ≈ P × r">
        <Meter x={512} y={198} w={240} value={tension} tone={mixHex('#3ccfe6', '#e0455f', tension)} />
        <Label
          x={512}
          y={230}
          text={laplace > 0.35 ? 'Dilatation accelerates dilatation' : 'Tension within tolerance'}
          opacity={0.8}
          tone={laplace > 0.35 ? '#ff9bab' : C.label}
        />
      </Panel>

      <RowsPanel
        x={496}
        y={256}
        w={272}
        title="Wall integrity"
        rows={[
          { label: 'Elastin loss', on: degeneration },
          { label: 'MMP activity', on: proteolysis },
          { label: 'Rupture risk', on: risk },
        ]}
      />

      <Banner x={496} y={396} w={272} text="Rupture · haemorrhagic shock" opacity={rupture} />
    </>
  );
};

/* ======================================================= AORTIC DISSECTION -- */

const AorticDissection: Scene = (ctx) => {
  const vulnerable = phase(ctx, 0, 1);
  const tear = phase(ctx, 1, 2);
  const propagate = phase(ctx, 2, 3);
  const branches = phase(ctx, 3, 4);
  const proximal = phase(ctx, 4, 5);
  const rupture = phase(ctx, 5, 6);

  /* Root → ascending → arch → descending, as one centreline. */
  const spine = resample(
    [
      [214, 400],
      [214, 320],
      [212, 250],
      [222, 190],
      [258, 150],
      [312, 138],
      [364, 156],
      [386, 206],
      [388, 274],
      [386, 348],
      [384, 408],
    ],
    72,
  );

  const wallOut = offsetLine(spine, 26);
  const wallIn = offsetLine(spine, -26);
  const lumOut = offsetLine(spine, 20);
  const lumIn = offsetLine(spine, -20);

  const tearAt = 0.24;
  const reach = clamp01(tearAt + propagate * 0.72 + rupture * 0.06);
  const from = Math.round(tearAt * (spine.length - 1));
  const to = Math.round(reach * (spine.length - 1));
  const seg = (line: Pt[]): Pt[] => line.slice(from, Math.max(from + 2, to));

  const flap = offsetLine(spine, 6);
  const falseLumen = tear > 0.05 ? ribbon(seg(flap), seg(lumOut)) : '';

  /* Arch branches; the flap can cover their origins. */
  const branchDefs: { d: string; at: number; name: string }[] = [
    { d: 'M266 146 L258 78', at: 0.36, name: 'Brachiocephalic' },
    { d: 'M300 137 L300 70', at: 0.44, name: 'L common carotid' },
    { d: 'M334 143 L346 76', at: 0.5, name: 'L subclavian' },
  ];

  return (
    <>
      <Backdrop />

      {/* Vessel wall and lumen */}
      <path d={ribbon(wallOut, wallIn)} fill="#3a2c39" />
      <path
        d={ribbon(lumOut, lumIn)}
        fill={C.lumen}
        stroke={mixHex('#8fd0e0', '#c98a6f', vulnerable)}
        strokeWidth={1.4}
      />

      {/* Weakened media */}
      {vulnerable > 0.02 ? (
        <Speckle cx={300} cy={230} rx={130} ry={150} count={26} seed={11} tone="#d8c7a8" r={1.8} opacity={vulnerable * 0.4} ring={0.75} />
      ) : null}

      {/* Branches — dimmed when the flap reaches their origin */}
      {branchDefs.map((b) => {
        const covered = clamp01((reach - b.at) * 6) * branches;
        return (
          <path
            key={b.name}
            d={b.d}
            stroke={mixHex('#e0455f', '#4c5568', covered)}
            strokeWidth={11}
            strokeLinecap="round"
            fill="none"
          />
        );
      })}
      <Label x={252} y={62} text="Arch branches" opacity={0.6} />
      <Label
        x={252}
        y={46}
        text={branches > 0.35 ? 'Malperfusion' : 'Perfused'}
        opacity={branches > 0.35 ? 1 : 0.5}
        tone={branches > 0.35 ? '#ff9bab' : C.label}
      />

      {/* Coronary ostium and aortic root */}
      <path d="M196 384 C158 372 140 340 146 306" stroke={mixHex('#e0455f', '#4c5568', proximal * 0.9)} strokeWidth={8} fill="none" strokeLinecap="round" />
      <Label x={104} y={300} text="Coronary ostium" opacity={0.6} />

      {/* True lumen flow, and the false lumen created by the tear */}
      <FlowPath pts={lumIn} count={10} speed={0.55} clock={ctx.clock} reduced={ctx.reduced} tone={C.blood} r={3.6} opacity={0.55} />
      {tear > 0.05 ? (
        <>
          <path d={falseLumen} fill="#5c2334" opacity={0.9} />
          <path d={toPath(seg(flap))} stroke="#e6ecf6" strokeWidth={2.2} fill="none" opacity={0.95} />
          <FlowPath
            pts={offsetLine(spine, 13)}
            count={8}
            speed={0.4}
            clock={ctx.clock}
            reduced={ctx.reduced}
            tone="#ff9bab"
            r={2.8}
            opacity={0.7 * tear}
            from={tearAt}
            to={reach}
          />
        </>
      ) : null}

      {/* Entry tear */}
      {tear > 0.03 ? (
        <g opacity={tear}>
          <circle cx={along(spine, tearAt)[0] + 5} cy={along(spine, tearAt)[1]} r={7} fill="none" stroke="#ffd9df" strokeWidth={2.2} />
          <Leader x1={110} y1={188} x2={along(spine, tearAt)[0] - 4} y2={along(spine, tearAt)[1]} opacity={tear} />
          <Label x={62} y={182} text="Intimal tear" opacity={tear} tone="#ffd4d9" />
        </g>
      ) : null}

      {/* Proximal complications: regurgitant jet into the ventricle, tamponade */}
      {proximal > 0.05 ? (
        <>
          <Jet x={214} y={392} angle={Math.PI / 2} length={34 * proximal} clock={ctx.clock} reduced={ctx.reduced} count={6} spread={7} r={2.6} opacity={proximal} />
          <Label x={232} y={424} text="Acute aortic regurgitation" opacity={proximal} tone="#ffd4d9" />
        </>
      ) : null}

      {/* External rupture into the pericardium or mediastinum */}
      {rupture > 0.05
        ? Array.from({ length: 14 }, (_, i) => {
            const a = rand(i) * Math.PI * 2;
            const d = 8 + rand(i + 17) * 60 * rupture;
            return (
              <circle key={i} cx={352 + Math.cos(a) * d} cy={300 + Math.sin(a) * d} r={3} fill={C.blood} opacity={rupture * 0.6} />
            );
          })
        : null}

      <Label x={44} y={384} text="Aorta — Stanford classification" opacity={0.55} />
      <Label
        x={44}
        y={402}
        text={reach > 0.42 ? 'Type A · ascending aorta involved' : tear > 0.2 ? 'Entry above the sinotubular junction' : 'Intact intima'}
        opacity={0.8}
        tone={tear > 0.2 ? C.amber : C.label}
      />

      {/* Instruments */}
      <Panel x={468} y={40} w={300} h={110} title="Haemodynamic drivers">
        <Label x={484} y={74} text="Systolic pressure" opacity={0.65} />
        <Meter x={484} y={82} w={268} value={0.82 - proximal * 0.3} tone={proximal > 0.4 ? C.amber : '#e0455f'} />
        <Label x={484} y={122} text="dP/dt — force of the pulse" opacity={0.65} />
        <Meter x={484} y={130} w={268} value={0.88} tone="#e0455f" />
      </Panel>

      <RowsPanel
        x={468}
        y={164}
        w={300}
        title="Malperfusion"
        rows={[
          { label: 'Cerebral', on: clamp01((reach - 0.38) * 5) * branches },
          { label: 'Coronary', on: proximal * 0.9 },
          { label: 'Renal · limb', on: clamp01((reach - 0.6) * 5) * branches },
        ]}
      />

      <Panel x={468} y={306} w={300} h={80} title="Extension of the false lumen">
        <Meter x={484} y={348} w={268} value={reach} tone={mixHex('#f2b544', '#e0455f', propagate)} />
      </Panel>

      <Banner x={468} y={400} w={300} text="Rupture · tamponade · collapse" opacity={rupture} />
    </>
  );
};

/* ======================================================= PULMONARY EMBOLISM -- */

const PulmonaryEmbolism: Scene = (ctx) => {
  const thrombus = phase(ctx, 0, 1);
  const embolise = phase(ctx, 1, 2);
  const resistance = phase(ctx, 2, 3);
  const strain = phase(ctx, 3, 4);
  const interdependence = phase(ctx, 4, 5);
  const gas = phase(ctx, 5, 6);
  const infarct = phase(ctx, 6, 7);
  const shock = phase(ctx, 7, 8);

  /* Leg vein → inferior vena cava → right atrium → right ventricle →
     pulmonary trunk, drawn as one continuous route the embolus travels. */
  const route: Pt[] = [
    [58, 424],
    [60, 372],
    [78, 330],
    [106, 300],
    [134, 276],
    [150, 250],
    [170, 280],
    [200, 308],
    [222, 270],
    [252, 214],
    [286, 176],
  ];
  const leftPa: Pt[] = [
    [286, 176],
    [318, 146],
    [356, 126],
    [396, 118],
  ];
  const rightPa: Pt[] = [
    [286, 176],
    [318, 196],
    [354, 214],
    [396, 224],
  ];

  const rvDilate = 1 + strain * 0.3;
  const septum = interdependence * 24;
  const pvr = clamp01(0.12 + resistance * 0.5 + strain * 0.25);
  const spo2 = Math.round(98 - gas * 12 - shock * 6);
  const sbp = Math.round(126 - shock * 52);
  const lodged = embolise > 0.85;

  return (
    <>
      <Backdrop />

      {/* Right atrium and right ventricle, the chambers the route passes through */}
      <ellipse cx={146} cy={244} rx={44} ry={34} fill="#2c4a72" opacity={0.92} />
      <g transform={`translate(198 300) scale(${rvDilate.toFixed(3)}) translate(-198 -300)`}>
        <path
          d="M162 268 C198 258 230 280 234 308 C238 340 212 358 188 352 C168 336 156 290 162 268 Z"
          fill="#5b6f8f"
          opacity={0.92}
        />
        <path
          d="M162 268 C198 258 230 280 234 308 C238 340 212 358 188 352 C168 336 156 290 162 268 Z"
          fill="none"
          stroke="rgba(160,200,255,0.35)"
        />
      </g>

      {/* Vessels */}
      <path d={toPath(route)} stroke="#2c4a72" strokeWidth={24} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={toPath(route)} stroke={C.lumen} strokeWidth={15} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {[leftPa, rightPa].map((pa, i) => (
        <g key={i}>
          <path d={toPath(pa)} stroke="#2c4a72" strokeWidth={22} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d={toPath(pa)} stroke={C.lumen} strokeWidth={13} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}

      <Label x={40} y={442} text="Deep vein of the leg" opacity={0.6} />
      <Label x={96} y={224} text="Right atrium" opacity={0.6} />
      <Label x={168} y={392} text="Right ventricle" opacity={0.6} />
      <Label x={300} y={100} text="Pulmonary arteries" opacity={0.6} />

      {/* The thrombus: formed in the leg, travelling, then lodged at a branch */}
      {thrombus > 0.02 && embolise < 0.06 ? (
        <ellipse cx={59} cy={400} rx={9} ry={20} fill={C.thrombus} stroke="#ffd9df" strokeWidth={1.2} opacity={thrombus} />
      ) : null}
      {embolise > 0.05 && !lodged ? (
        (() => {
          const p = along(route, smoothstep(embolise));
          return <ellipse cx={p[0]} cy={p[1]} rx={11} ry={9} fill={C.thrombus} stroke="#ffd9df" strokeWidth={1.2} />;
        })()
      ) : null}
      {lodged ? (
        <>
          <ellipse cx={322} cy={148} rx={12} ry={9} fill={C.thrombus} stroke="#ffd9df" strokeWidth={1.2} />
          <ellipse cx={322} cy={198} rx={11} ry={9} fill={C.thrombus} stroke="#ffd9df" strokeWidth={1.2} />
          <Leader x1={266} y1={116} x2={314} y2={142} opacity={0.7} />
          <Label x={198} y={110} text="Embolus" opacity={0.85} tone="#ffd4d9" />
        </>
      ) : null}

      {/* Flow: brisk into the right heart, obstructed beyond the emboli */}
      <FlowPath pts={route} count={9} speed={0.5} clock={ctx.clock} reduced={ctx.reduced} tone="#7fb2ff" r={3} opacity={0.55} />
      {[leftPa, rightPa].map((pa, i) => (
        <FlowPath
          key={i}
          pts={pa}
          count={5}
          speed={0.5}
          clock={ctx.clock}
          reduced={ctx.reduced}
          tone="#7fb2ff"
          r={2.8}
          opacity={0.5 * (1 - resistance * 0.85)}
        />
      ))}

      {/* A peripheral infarct, where the lung's dual supply is not enough */}
      {infarct > 0.05 ? (
        <>
          <path d="M396 118 L432 100 L436 142 Z" fill={C.infarct} opacity={infarct * 0.95} />
          <Label x={368} y={78} text="Infarct" opacity={infarct} tone="#ff9bab" />
        </>
      ) : null}

      {/* Instruments */}
      <StatPanel
        x={470}
        y={40}
        w={298}
        title="Pulmonary vascular resistance"
        value={`${(1.4 + pvr * 7).toFixed(1)} WU`}
        meter={pvr}
        tone={pvr > 0.4 ? '#ff8fa3' : C.cyan}
        caption={resistance > 0.4 ? 'Obstruction · hypoxic vasoconstriction' : 'Normal resistance'}
        captionTone={resistance > 0.4 ? '#ff9bab' : C.label}
      />

      <StatPanel
        x={470}
        y={156}
        w={298}
        title="Gas exchange"
        value={`SpO₂ ${spo2}%`}
        meter={clamp01((spo2 - 70) / 30)}
        tone={spo2 < 92 ? '#ff8fa3' : C.cyan}
        caption={gas > 0.3 ? 'Dead space ↑ · V/Q mismatch' : 'Normal gas exchange'}
        captionTone={gas > 0.3 ? '#ff9bab' : C.label}
      />

      {/* Short-axis inset: the septum bowing into the left ventricle */}
      <Panel x={470} y={272} w={146} h={158} title="Short axis">
        <circle cx={543} cy={352} r={50} fill="#7d2b3d" />
        <circle cx={543} cy={352} r={37} fill={C.lumen} />
        <path
          d={`M543 314 C${543 - 44 - septum} 324 ${543 - 44 - septum} 380 543 390 C${543 - 88} 380 ${543 - 88} 324 543 314 Z`}
          fill="#5b6f8f"
          opacity={0.92}
        />
        <path d={`M543 314 Q${543 + septum * 0.9} 352 543 390`} stroke="#e6ecf6" strokeWidth={3} fill="none" />
        <Label
          x={543}
          y={420}
          text={interdependence > 0.4 ? 'D-shaped septum' : 'Normal septum'}
          anchor="middle"
          opacity={0.85}
          tone={interdependence > 0.4 ? '#ff9bab' : C.label}
        />
      </Panel>

      <Panel x={628} y={272} w={140} h={158} title="Circulation">
        <Numeral x={644} y={318} text={`${sbp}/${Math.round(sbp * 0.62)}`} size={20} tone={sbp < 90 ? '#ff8fa3' : C.cyan} />
        <Label x={644} y={338} text="mmHg" opacity={0.55} />
        <Meter x={644} y={368} w={108} value={clamp01(1 - shock)} tone={shock > 0.4 ? '#e0455f' : C.cyan} label="Cardiac output" />
        <Label
          x={644}
          y={418}
          text={shock > 0.45 ? 'Obstructive shock' : 'Compensated'}
          opacity={0.85}
          tone={shock > 0.45 ? '#ff9bab' : C.label}
        />
      </Panel>
    </>
  );
};

/* ==================================================== DEEP VEIN THROMBOSIS -- */

const DeepVeinThrombosis: Scene = (ctx) => {
  const triad = phase(ctx, 0, 1);
  const nidus = phase(ctx, 1, 2);
  const propagate = phase(ctx, 2, 3);
  const obstruct = phase(ctx, 3, 4);
  const embolise = phase(ctx, 4, 5);
  const recanalise = phase(ctx, 5, 6);
  const pts = phase(ctx, 6, 7);

  const vx = 214;
  const halfWidth = 26;
  const top = 66;
  const bottom = 404;
  /** Thrombus grows upwards from the calf valve pocket. */
  const clotBottom = 348;
  const clotTop = clotBottom - (30 * nidus + 190 * propagate);
  const valves = [
    { y: 330, calf: true },
    { y: 238, calf: false },
    { y: 148, calf: false },
  ];

  const swelling = obstruct * 16;

  return (
    <>
      <Backdrop />

      {/* Surrounding muscle and the leg outline, which swells as flow obstructs */}
      <path
        d={`M${vx - 96 - swelling} ${top - 6} Q${vx - 116 - swelling} 240 ${vx - 82 - swelling} ${bottom + 20} L${
          vx + 82 + swelling
        } ${bottom + 20} Q${vx + 116 + swelling} 240 ${vx + 96 + swelling} ${top - 6} Z`}
        fill={mixHex('#25334a', '#3d3348', pts)}
        opacity={0.55}
      />

      {/* Vein wall and lumen */}
      <rect x={vx - halfWidth - 6} y={top} width={(halfWidth + 6) * 2} height={bottom - top} rx={22} fill="#2c4a72" />
      <rect x={vx - halfWidth} y={top + 5} width={halfWidth * 2} height={bottom - top - 10} rx={18} fill={C.lumen} />

      {/* Valves — competent until the thrombus organises around them */}
      {valves.map((v, i) => (
        <VenousValve
          key={i}
          x={vx + halfWidth - 2}
          top={v.y - 20}
          bottom={v.y + 20}
          closure={i === 0 ? 1 - recanalise * 0.85 : 1 - pts * 0.9}
          thickening={pts}
        />
      ))}
      {valves.map((v, i) => (
        <g key={`m${i}`} transform={`translate(${vx * 2} 0) scale(-1 1)`}>
          <VenousValve
            x={vx + halfWidth - 2}
            top={v.y - 20}
            bottom={v.y + 20}
            closure={i === 0 ? 1 - recanalise * 0.85 : 1 - pts * 0.9}
            thickening={pts}
          />
        </g>
      ))}

      {/* The thrombus: nidus in the valve pocket, then propagating proximally */}
      {nidus > 0.02 ? (
        <>
          <rect
            x={vx - halfWidth + 3}
            y={clotTop}
            width={halfWidth * 2 - 6}
            height={Math.max(6, clotBottom - clotTop)}
            rx={12}
            fill={C.thrombus}
            opacity={0.95}
          />
          <Speckle
            cx={vx}
            cy={(clotTop + clotBottom) / 2}
            rx={halfWidth - 8}
            ry={Math.max(6, (clotBottom - clotTop) / 2 - 8)}
            count={18}
            seed={7}
            tone="#f5f0e6"
            r={1.6}
            opacity={0.35 * nidus}
          />
          {/* Recanalised channel through the organising thrombus */}
          {recanalise > 0.05 ? (
            <rect
              x={vx - 6 * recanalise}
              y={clotTop}
              width={12 * recanalise}
              height={Math.max(6, clotBottom - clotTop)}
              rx={6}
              fill={C.lumen}
              opacity={0.9}
            />
          ) : null}
        </>
      ) : null}

      {/* Venous return: brisk, then obstructed, then refluxing when valves fail */}
      <FlowPath
        pts={[
          [vx, bottom - 14],
          [vx, top + 14],
        ]}
        count={8}
        speed={0.42 * (1 - obstruct * 0.7) + 0.1}
        clock={ctx.clock}
        reduced={ctx.reduced}
        tone="#7fb2ff"
        r={3}
        opacity={0.5 * (1 - obstruct * 0.55)}
      />
      {pts > 0.1 ? (
        <FlowPath
          pts={[
            [vx + 12, top + 30],
            [vx + 12, bottom - 20],
          ]}
          count={6}
          speed={0.5}
          clock={ctx.clock}
          reduced={ctx.reduced}
          tone="#ff9bab"
          r={2.6}
          opacity={0.7 * pts}
        />
      ) : null}

      {/* An embolus breaking away towards the lungs */}
      {embolise > 0.06 ? (
        <>
          <ellipse
            cx={vx}
            cy={Math.max(84, clotTop - 26 - 80 * smoothstep(embolise))}
            rx={12}
            ry={9}
            fill={C.thrombus}
            stroke="#ffd9df"
            strokeWidth={1.2}
            opacity={embolise}
          />
          <CurvedArrow
            p0={[vx + 20, top + 40]}
            p1={[300, 40]}
            p2={[368, 92]}
            tone="#ff9bab"
            width={3}
            opacity={embolise}
            dash="6 5"
          />
          <Label x={330} y={34} text="To the pulmonary arteries" opacity={embolise} tone="#ff9bab" />
        </>
      ) : null}

      <Label x={64} y={92} text="Deep vein — longitudinal" opacity={0.55} />
      <Label x={64} y={110} text="Proximal ↑" opacity={0.4} />
      <Label x={vx + 60} y={368} text="Valve pocket" opacity={0.6 * Math.max(nidus, 0.4)} />
      <Leader x1={vx + 56} y1={362} x2={vx + halfWidth + 4} y2={336} opacity={0.5} />

      {/* Instruments */}
      <RowsPanel
        x={430}
        y={40}
        w={338}
        title="Virchow's triad"
        rows={[
          { label: 'Venous stasis', on: triad, tone: '140,190,255' },
          { label: 'Endothelial injury', on: clamp01(triad * 1.2 - 0.15), tone: '140,190,255' },
          { label: 'Hypercoagulability', on: clamp01(triad * 1.4 - 0.3), tone: '140,190,255' },
        ]}
      />

      <StatPanel
        x={430}
        y={180}
        w={338}
        title="Thrombus extent"
        value={propagate > 0.45 ? 'Proximal' : nidus > 0.2 ? 'Calf' : 'None'}
        meter={clamp01((clotBottom - clotTop) / 240)}
        tone={propagate > 0.4 ? '#ff8fa3' : C.amber}
        caption={propagate > 0.45 ? 'High embolic risk' : nidus > 0.2 ? 'Isolated distal thrombus' : 'Patent vein'}
        captionTone={propagate > 0.45 ? '#ff9bab' : C.label}
      />

      <Panel x={430} y={296} w={338} h={90} title="Leg">
        <Meter x={446} y={336} w={306} value={clamp01(0.1 + obstruct * 0.8)} tone={obstruct > 0.35 ? C.amber : C.cyan} />
        <Label
          x={446}
          y={374}
          text={obstruct > 0.35 ? 'Unilateral swelling · pain · warmth' : 'Normal calf'}
          opacity={0.85}
          tone={obstruct > 0.35 ? C.amber : C.label}
        />
      </Panel>

      <Banner x={430} y={412} w={338} text="Post-thrombotic syndrome · chronic venous hypertension" opacity={pts} />
    </>
  );
};

/* =================================================== PULMONARY HYPERTENSION -- */

const PulmonaryHypertension: Scene = (ctx) => {
  const insult = phase(ctx, 0, 1);
  const vasoconstrict = phase(ctx, 1, 2);
  const remodel = phase(ctx, 2, 3);
  const thrombosis = phase(ctx, 3, 4);
  const pvrRise = phase(ctx, 4, 5);
  const adapt = phase(ctx, 5, 6);
  const decompensate = phase(ctx, 6, 7);
  const output = phase(ctx, 7, 8);

  /* A small pulmonary artery in cross-section. */
  const ax = 172;
  const ay = 176;
  const outer = 86;
  const media = 12 + remodel * 26 + vasoconstrict * 6;
  const intima = 3 + remodel * 18;
  const lumenR = Math.max(8, outer - 14 - media - intima);

  const mpap = Math.round(14 + pvrRise * 34 + decompensate * 14);
  const rvWall = 12 + adapt * 20;
  const rvDilate = 1 + decompensate * 0.3;
  const septum = decompensate * 22 + output * 10;

  return (
    <>
      <Backdrop />

      {/* Pulmonary arteriole, remodelling from the outside in */}
      <circle cx={ax} cy={ay} r={outer} fill="#2f3d54" />
      <circle cx={ax} cy={ay} r={outer} fill="none" stroke="rgba(140,190,255,0.3)" />
      <circle cx={ax} cy={ay} r={outer - 14} fill="#5b6f8f" opacity={0.85} />
      <circle cx={ax} cy={ay} r={outer - 14 - media} fill="#8ea6c6" opacity={0.85} />
      <circle cx={ax} cy={ay} r={lumenR} fill={C.lumen} />

      {insult > 0.02 ? (
        <circle cx={ax} cy={ay} r={lumenR + 2} fill="none" stroke={mixHex('#8fd0e0', '#c9704f', insult)} strokeWidth={2.4} />
      ) : null}

      {/* In-situ thrombus occupying the residual lumen */}
      {thrombosis > 0.05 ? (
        <circle cx={ax + lumenR * 0.25} cy={ay - lumenR * 0.2} r={lumenR * 0.55 * thrombosis} fill={C.thrombus} opacity={0.92} />
      ) : null}

      {/* Plexiform lesion budding off the vessel in advanced disease */}
      {remodel > 0.5 ? (
        <g opacity={clamp01((remodel - 0.5) * 2)}>
          {Array.from({ length: 7 }, (_, i) => (
            <circle
              key={i}
              cx={ax + 74 + rand(i) * 34}
              cy={ay - 62 + rand(i + 12) * 40}
              r={5 + rand(i + 5) * 4}
              fill="#8ea6c6"
              opacity={0.8}
            />
          ))}
          <Label x={ax + 78} y={ay - 74} text="Plexiform lesion" opacity={0.9} tone={C.amber} />
        </g>
      ) : null}

      <FlowPath
        pts={[
          [ax - outer - 40, ay],
          [ax - lumenR, ay],
        ]}
        count={5}
        speed={0.5}
        clock={ctx.clock}
        reduced={ctx.reduced}
        tone={C.blood}
        r={3}
        opacity={0.55 * (1 - pvrRise * 0.6)}
      />
      <Label x={ax} y={ay + outer + 26} text="Small pulmonary artery — cross-section" anchor="middle" opacity={0.6} />
      <Label
        x={ax}
        y={ay + outer + 44}
        text={remodel > 0.4 ? 'Intimal proliferation · medial hypertrophy' : 'Thin-walled, wide lumen'}
        anchor="middle"
        opacity={0.8}
        tone={remodel > 0.4 ? C.amber : C.label}
      />

      {/* Right ventricle in short axis: hypertrophy, then dilatation */}
      <g transform={`translate(342 316) scale(${rvDilate.toFixed(3)}) translate(-342 -316)`}>
        <circle cx={382} cy={316} r={52} fill="#7d2b3d" />
        <circle cx={382} cy={316} r={38} fill={C.lumen} />
        <path
          d={`M382 268 C${330 - septum} 282 ${330 - septum} 350 382 364 C${300} 352 ${300} 282 382 268 Z`}
          fill="#5b6f8f"
          opacity={0.92}
        />
        <path
          d={`M382 268 C${330 - septum + rvWall} 282 ${330 - septum + rvWall} 350 382 364`}
          fill="#2c4a72"
          opacity={0.9}
        />
        <path d={`M382 268 Q${382 + septum * 0.8} 316 382 364`} stroke="#e6ecf6" strokeWidth={3 + adapt * 3} fill="none" />
      </g>
      <Label x={286} y={392} text="RV · LV short axis" opacity={0.55} />
      <Label
        x={286}
        y={410}
        text={decompensate > 0.4 ? 'Dilated · septal shift' : adapt > 0.35 ? 'Concentric hypertrophy' : 'Thin-walled RV'}
        opacity={0.85}
        tone={decompensate > 0.4 ? '#ff9bab' : adapt > 0.35 ? C.amber : C.label}
      />

      {/* Functional tricuspid regurgitation */}
      {decompensate > 0.2 ? (
        <Jet
          x={352}
          y={272}
          angle={-Math.PI / 2.2}
          length={40 * decompensate}
          clock={ctx.clock}
          reduced={ctx.reduced}
          count={7}
          spread={8}
          r={2.6}
          tone="#9cc3ff"
          opacity={decompensate}
        />
      ) : null}

      {/* Instruments */}
      <StatPanel
        x={470}
        y={40}
        w={298}
        title="Mean pulmonary artery pressure"
        value={`${mpap} mmHg`}
        meter={mpap / 70}
        tone={mpap >= 25 ? '#ff8fa3' : C.cyan}
        caption={pvrRise > 0.4 ? 'Recruitment reserve exhausted' : 'Reserve preserved'}
        captionTone={pvrRise > 0.4 ? '#ff9bab' : C.label}
      />

      <RowsPanel
        x={470}
        y={156}
        w={298}
        title="Mechanisms"
        rows={[
          { label: 'NO ↓ · prostacyclin ↓', on: vasoconstrict },
          { label: 'Endothelin-1 ↑', on: vasoconstrict },
          { label: 'Remodelling', on: remodel },
          { label: 'In-situ thrombosis', on: thrombosis },
        ]}
      />

      <Panel x={470} y={324} w={298} h={78} title="Right ventricular function">
        <Meter x={486} y={364} w={266} value={clamp01(1 - decompensate * 0.75 - output * 0.2)} tone={decompensate > 0.4 ? '#e0455f' : C.cyan} />
        <Label
          x={486}
          y={394}
          text={output > 0.4 ? 'Output ↓ · exertional syncope' : 'Output maintained'}
          opacity={0.8}
          tone={output > 0.4 ? '#ff9bab' : C.label}
        />
      </Panel>

      <Banner x={470} y={412} w={298} text="Right heart failure" opacity={output} />
    </>
  );
};

/* ============================================================== HYPERTENSION -- */

const Hypertension: Scene = (ctx) => {
  const determinants = phase(ctx, 0, 1);
  const sodium = phase(ctx, 1, 2);
  const neuro = phase(ctx, 2, 3);
  const endothelium = phase(ctx, 3, 4);
  const remodel = phase(ctx, 4, 5);
  const stiffening = phase(ctx, 5, 6);
  const cardiac = phase(ctx, 6, 7);

  const ax = 152;
  const ay = 150;
  const outerR = 62;
  const wall = 10 + remodel * 20 + neuro * 4;
  const lumenR = Math.max(6, outerR - wall);
  const ratio = wall / lumenR;

  const systolic = Math.round(118 + neuro * 14 + remodel * 18 + stiffening * 22);
  const diastolic = Math.round(76 + neuro * 8 + remodel * 10 - stiffening * 6);
  const svr = clamp01(0.3 + remodel * 0.45 + neuro * 0.15);

  /* Aortic pressure waveform: a stiff aorta returns its reflected wave early,
     augmenting the systolic peak and widening the pulse pressure. */
  const pulse = (u: number): number => {
    const t = (u * 2) % 1;
    const eject = t < 0.32 ? Math.sin((t / 0.32) * Math.PI) : 0;
    const reflect = 0.34 * stiffening * Math.exp(-Math.pow((t - 0.24) / 0.09, 2));
    const runoff = t >= 0.32 ? Math.exp(-(t - 0.32) * (5.4 - stiffening * 2.4)) * 0.42 : 0;
    const notch = t >= 0.3 && t < 0.36 ? 0.05 : 0;
    return 0.2 + (eject * 0.62 + reflect + runoff - notch) * (0.9 + stiffening * 0.25);
  };

  return (
    <>
      <Backdrop />

      {/* Resistance arteriole in cross-section */}
      <circle cx={ax} cy={ay} r={outerR} fill="#3b4a63" />
      <circle cx={ax} cy={ay} r={outerR} fill="none" stroke="rgba(140,180,230,0.28)" />
      <circle cx={ax} cy={ay} r={lumenR} fill={C.lumen} />
      <circle
        cx={ax}
        cy={ay}
        r={lumenR + 1.5}
        fill="none"
        stroke={mixHex('#8fd0e0', '#c9704f', endothelium)}
        strokeWidth={2.2}
      />
      {remodel > 0.1 ? (
        <Speckle cx={ax} cy={ay} rx={outerR - 6} ry={outerR - 6} count={22} seed={9} tone="#c8d4e6" r={1.8} opacity={remodel * 0.4} ring={0.55} />
      ) : null}
      <Label x={ax} y={ay + outerR + 26} text="Resistance arteriole" anchor="middle" opacity={0.6} />
      <Label
        x={ax}
        y={ay + outerR + 44}
        text={`Wall : lumen ≈ ${ratio.toFixed(2)}`}
        anchor="middle"
        opacity={0.85}
        tone={ratio > 0.9 ? C.amber : C.label}
      />
      <Label x={ax} y={ay + outerR + 62} text="Resistance ∝ 1 / r⁴" anchor="middle" opacity={0.55} />

      {/* Left ventricle: concentric hypertrophy from chronic pressure loading */}
      <Chamber cx={318} cy={150} rx={66} ry={66} wall={19 + cardiac * 24} />
      {cardiac > 0.15 ? (
        <Speckle cx={318} cy={150} rx={54} ry={54} count={16} seed={31} tone="#e6ebf4" r={1.8} opacity={cardiac * 0.5} ring={0.6} />
      ) : null}
      <Label x={318} y={236} text="Left ventricle" anchor="middle" opacity={0.55} />
      <Label
        x={318}
        y={254}
        text={cardiac > 0.4 ? 'Concentric hypertrophy' : 'Normal wall thickness'}
        anchor="middle"
        opacity={0.85}
        tone={cardiac > 0.4 ? C.amber : C.label}
      />

      {/* Pressure–natriuresis: the renal curve shifts to the right */}
      <Panel x={60} y={310} w={330} h={126} title="Renal pressure–natriuresis">
        {(() => {
          const px = (p: number): number => 84 + p * 268;
          const py = (v: number): number => 414 - v * 74;
          const curve = (shift: number): string => {
            let d = '';
            for (let i = 0; i <= 40; i++) {
              const p = i / 40;
              const v = clamp01((p - 0.18 - shift * 0.34) * 2.4);
              d += (i === 0 ? 'M' : 'L') + px(p).toFixed(1) + ' ' + py(v).toFixed(1);
            }
            return d;
          };
          const set = 0.34 + sodium * 0.34;
          return (
            <>
              <path d={curve(0)} fill="none" stroke="rgba(160,200,255,0.35)" strokeWidth={1.6} strokeDasharray="5 4" />
              <path d={curve(sodium)} fill="none" stroke={mixHex('#3ccfe6', '#e0455f', sodium)} strokeWidth={2.2} />
              <circle cx={px(set)} cy={py(0.38)} r={4.5} fill="#ffd4d9" />
              <Label x={px(set) + 10} y={py(0.38) - 6} text="Set point" opacity={0.8} tone="#ffd4d9" />
              <Label x={84} y={430} text="Arterial pressure →" opacity={0.45} />
              <Label x={84} y={362} text="Na⁺ excretion ↑" opacity={0.45} />
            </>
          );
        })()}
      </Panel>

      {/* Instruments */}
      <Panel x={410} y={40} w={358} h={112} title="Mean arterial pressure = CO × SVR">
        <Label x={426} y={80} text="Cardiac output" opacity={0.6} />
        <Meter x={426} y={88} w={150} value={0.5 + determinants * 0.02} tone={C.cyan} />
        <Label x={600} y={80} text="Systemic resistance" opacity={0.6} />
        <Meter x={600} y={88} w={152} value={svr} tone={mixHex('#3ccfe6', '#e0455f', svr)} />
        <Numeral x={426} y={140} text={`${systolic}/${diastolic} mmHg`} size={22} tone={systolic >= 140 ? '#ff8fa3' : C.cyan} />
        <Label x={752} y={140} text={systolic >= 140 ? 'Stage 2' : systolic >= 130 ? 'Stage 1' : 'Normal'} anchor="end" opacity={0.75} />
      </Panel>

      <RowsPanel
        x={410}
        y={164}
        w={358}
        title="Drivers"
        rows={[
          { label: 'Sympathetic outflow', on: neuro },
          { label: 'Renin–angiotensin–aldosterone', on: neuro },
          { label: 'Nitric oxide ↓', on: endothelium },
        ]}
      />

      <Trace
        x={410}
        y={304}
        w={358}
        h={132}
        title="Aortic pressure waveform"
        fn={pulse}
        tone={mixHex('#3ccfe6', '#f2b544', stiffening)}
        gridLines={2}
        caption={
          stiffening > 0.4
            ? `Stiff aorta · early reflection · PP ${systolic - diastolic}`
            : `Compliant aorta · PP ${systolic - diastolic} mmHg`
        }
        captionTone={stiffening > 0.4 ? C.amber : C.label}
      />
    </>
  );
};

/* ============================================= PERIPHERAL ARTERIAL DISEASE -- */

const PeripheralArterialDisease: Scene = (ctx) => {
  const plaque = phase(ctx, 0, 1);
  const stenosis = phase(ctx, 1, 2);
  const claudication = phase(ctx, 2, 3);
  const ankle = phase(ctx, 3, 4);
  const restPain = phase(ctx, 4, 5);
  const tissueLoss = phase(ctx, 5, 6);
  const acute = phase(ctx, 6, 7);

  /* Iliac → femoral → popliteal → tibial, running down the left of the stage. */
  const artery: Pt[] = [
    [212, 58],
    [228, 104],
    [240, 152],
    [248, 206],
    [252, 258],
    [254, 308],
    [258, 356],
    [266, 398],
  ];
  const lesionAt = 0.42;
  const lesion = along(artery, lesionAt);
  const narrow = clamp01(plaque * 0.4 + stenosis * 0.4 + restPain * 0.2 + acute);
  const abi = Math.max(0.15, 1.1 - stenosis * 0.28 - ankle * 0.22 - restPain * 0.3 - acute * 0.25);

  const collateral = clamp01(stenosis * 1.2 - 0.1) * (1 - acute * 0.85);
  const perfusion = clamp01(1 - narrow * 0.85);

  return (
    <>
      <Backdrop />

      {/* Artery */}
      <path d={toPath(artery)} stroke="#3b4a63" strokeWidth={26} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={toPath(artery)} stroke={C.lumen} strokeWidth={16} fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Collateral channels bridging the lesion */}
      {collateral > 0.05 ? (
        <>
          <path
            d={`M${along(artery, 0.28)[0]} ${along(artery, 0.28)[1]} C190 200 188 250 ${along(artery, 0.6)[0]} ${
              along(artery, 0.6)[1]
            }`}
            stroke="#8d3247"
            strokeWidth={4 * collateral}
            fill="none"
            opacity={0.9}
          />
          <path
            d={`M${along(artery, 0.3)[0]} ${along(artery, 0.3)[1]} C306 208 308 252 ${along(artery, 0.58)[0]} ${
              along(artery, 0.58)[1]
            }`}
            stroke="#8d3247"
            strokeWidth={3.4 * collateral}
            fill="none"
            opacity={0.9}
          />
          <Label x={130} y={236} text="Collaterals" opacity={collateral} tone="#ff9bab" />
        </>
      ) : null}

      {/* The stenosing plaque */}
      {plaque > 0.02 ? (
        <>
          <ellipse cx={lesion[0]} cy={lesion[1]} rx={16} ry={9 + 8 * narrow} fill={C.necrotic} opacity={0.9} />
          <ellipse cx={lesion[0]} cy={lesion[1]} rx={16} ry={9 + 8 * narrow} fill="none" stroke={C.cap} strokeWidth={1.6} opacity={0.7} />
          {acute > 0.15 ? <ellipse cx={lesion[0]} cy={lesion[1]} rx={13} ry={12} fill={C.thrombus} opacity={acute} /> : null}
          <Leader x1={lesion[0] - 26} y1={lesion[1] - 26} x2={lesion[0] - 12} y2={lesion[1] - 8} opacity={plaque} />
          <Label x={lesion[0] - 32} y={lesion[1] - 32} text="Femoral stenosis" anchor="end" opacity={plaque} />
        </>
      ) : null}

      {/* Flow above and below the lesion */}
      <FlowPath pts={artery} count={9} speed={0.5} clock={ctx.clock} reduced={ctx.reduced} tone={C.blood} r={3.2} opacity={0.55} from={0} to={lesionAt} />
      <FlowPath
        pts={artery}
        count={8}
        speed={0.5 * perfusion + 0.05}
        clock={ctx.clock}
        reduced={ctx.reduced}
        tone={C.blood}
        r={3.2}
        opacity={0.55 * perfusion}
        from={lesionAt}
        to={1}
      />

      {/* Foot: colour, then ulceration and gangrene */}
      <path
        d="M266 398 q-6 26 6 34 q30 12 62 2 q10 -6 2 -14 q-30 -10 -42 -26 z"
        fill={mixHex('#a35d68', '#4a4550', clamp01(restPain * 0.5 + tissueLoss * 0.8))}
        opacity={0.95}
      />
      {tissueLoss > 0.2 ? (
        <>
          <ellipse cx={318} cy={428} rx={10 * tissueLoss} ry={6 * tissueLoss} fill="#2f2b35" />
          <Label x={140} y={432} text="Ulcer · gangrene" opacity={tissueLoss} tone="#ff9bab" />
        </>
      ) : null}

      <Label x={54} y={330} text="Lower limb arterial tree" opacity={0.55} />
      <Label x={54} y={348} text="Aortoiliac → femoropopliteal" opacity={0.4} />
      <Label x={54} y={366} text="→ infrapopliteal" opacity={0.4} />

      {/* Instruments */}
      <StatPanel
        x={396}
        y={40}
        w={372}
        title="Ankle–brachial index"
        value={abi.toFixed(2)}
        meter={abi / 1.3}
        tone={abi < 0.4 ? '#ff8fa3' : abi < 0.9 ? C.amber : C.cyan}
        caption={abi < 0.4 ? 'Severe ischaemia' : abi < 0.9 ? 'Peripheral arterial disease' : 'Normal'}
        captionTone={abi < 0.9 ? '#ff9bab' : C.label}
      />

      <Panel x={396} y={156} w={372} h={132} title="Muscle oxygen supply and demand">
        {(() => {
          const walking = claudication > 0.15;
          const demand = walking ? 0.86 : 0.28;
          const supply = clamp01(0.9 - stenosis * 0.34 - restPain * 0.34 - acute * 0.3) * (walking ? 0.62 : 1);
          return (
            <>
              <Label x={412} y={196} text={walking ? 'Demand — walking' : 'Demand — at rest'} opacity={0.7} />
              <Meter x={412} y={204} w={340} value={demand} tone="#e0455f" />
              <Label x={412} y={240} text="Deliverable flow" opacity={0.7} />
              <Meter x={412} y={248} w={340} value={supply} tone={supply < demand ? C.amber : C.cyan} />
              <Label
                x={412}
                y={278}
                text={
                  restPain > 0.35
                    ? 'Unmet even at rest — ischaemic rest pain'
                    : supply < demand
                      ? 'Mismatch on exertion — claudication'
                      : 'Supply meets demand'
                }
                opacity={0.85}
                tone={supply < demand ? '#ff9bab' : C.label}
              />
            </>
          );
        })()}
      </Panel>

      <RowsPanel
        x={396}
        y={300}
        w={372}
        title="Progression"
        rows={[
          { label: 'Claudication', on: claudication },
          { label: 'Rest pain · tissue loss', on: Math.max(restPain, tissueLoss) },
        ]}
      />

      <Banner x={396} y={404} w={372} text="Acute limb ischaemia — the six Ps" opacity={acute} />
    </>
  );
};

/* ============================================ CHRONIC VENOUS INSUFFICIENCY -- */

const ChronicVenousInsufficiency: Scene = (ctx) => {
  const pump = phase(ctx, 0, 1);
  const incompetent = phase(ctx, 1, 2);
  const pumpLoss = phase(ctx, 2, 3);
  const hypertension = phase(ctx, 3, 4);
  const leakage = phase(ctx, 4, 5);
  const fibrosis = phase(ctx, 5, 6);
  const ulcer = phase(ctx, 6, 7);

  const vx = 176;
  const half = 22;
  const top = 62;
  const bottom = 392;
  const valves = [128, 210, 292];
  const closure = 1 - incompetent * 0.92;

  /* Calf contraction cycle, driving the muscle pump. */
  const beat = ctx.reduced ? 0.3 : (Math.sin((ctx.clock / 1000) * 1.6) + 1) / 2;
  const contract = pump > 0.1 ? beat : 0;

  const ambulatory = Math.round(22 + pumpLoss * 56 + hypertension * 8);

  /* Ambulatory venous pressure across ten paces: it should fall and stay low. */
  const avp = (u: number): number => {
    const start = 0.86;
    const steps = 10;
    const k = Math.min(steps, Math.floor(u * steps * 1.2));
    const drop = Math.exp(-k * 0.55);
    const refill = pumpLoss;
    const floor = 0.12 + refill * 0.62;
    const wobble = 0.05 * Math.sin(u * 42) * (1 - refill * 0.5);
    return clamp01(floor + (start - floor) * drop + wobble);
  };

  return (
    <>
      <Backdrop />

      {/* Calf muscle, contracting around the deep vein */}
      <path
        d={`M${vx - 96 - contract * 10} ${top + 40} Q${vx - 128 - contract * 16} 230 ${vx - 76} ${bottom} L${
          vx + 76
        } ${bottom} Q${vx + 128 + contract * 16} 230 ${vx + 96 + contract * 10} ${top + 40} Z`}
        fill={mixHex('#2a3346', '#4a3a46', fibrosis)}
        opacity={0.7}
      />

      {/* Skin: staining and induration at the gaiter area */}
      {leakage > 0.05 ? (
        <Speckle cx={vx} cy={356} rx={62} ry={30} count={22} seed={17} tone="#a4703c" r={2.6} opacity={leakage * 0.75} />
      ) : null}
      {fibrosis > 0.1 ? (
        <path
          d={`M${vx - 78 + fibrosis * 22} 320 Q${vx} 306 ${vx + 78 - fibrosis * 22} 320 L${vx + 74} 392 L${vx - 74} 392 Z`}
          fill="none"
          stroke="#c39a72"
          strokeWidth={2}
          opacity={fibrosis * 0.8}
          strokeDasharray="6 4"
        />
      ) : null}
      {ulcer > 0.15 ? (
        <>
          <ellipse cx={vx + 62} cy={360} rx={16 * ulcer} ry={11 * ulcer} fill="#8d5b4a" stroke="#e0b7a4" strokeWidth={1.4} />
          <Label x={vx + 84} y={330} text="Gaiter ulcer" opacity={ulcer} tone="#ffd4d9" />
        </>
      ) : null}

      {/* Deep vein */}
      <rect x={vx - half - 6} y={top} width={(half + 6) * 2} height={bottom - top} rx={20} fill="#2c4a72" />
      <rect
        x={vx - half + contract * 6}
        y={top + 5}
        width={(half - contract * 6) * 2}
        height={bottom - top - 10}
        rx={16}
        fill={C.lumen}
      />

      {/* Valves */}
      {valves.map((y, i) => (
        <g key={i}>
          <VenousValve x={vx + half - 2} top={y - 18} bottom={y + 18} closure={closure} thickening={incompetent} />
          <g transform={`translate(${vx * 2} 0) scale(-1 1)`}>
            <VenousValve x={vx + half - 2} top={y - 18} bottom={y + 18} closure={closure} thickening={incompetent} />
          </g>
        </g>
      ))}

      {/* Upward pump flow, and gravitational reflux once the valves fail */}
      <FlowPath
        pts={[
          [vx, bottom - 16],
          [vx, top + 16],
        ]}
        count={7}
        speed={0.35 + contract * 0.5}
        clock={ctx.clock}
        reduced={ctx.reduced}
        tone="#7fb2ff"
        r={3}
        opacity={0.55}
      />
      {incompetent > 0.1 ? (
        <FlowPath
          pts={[
            [vx + 13, top + 26],
            [vx + 13, bottom - 20],
          ]}
          count={6}
          speed={0.55}
          clock={ctx.clock}
          reduced={ctx.reduced}
          tone="#ff9bab"
          r={2.6}
          opacity={0.75 * incompetent}
        />
      ) : null}
      {incompetent > 0.15 ? (
        <>
          <Arrow x1={vx + 46} y1={168} x2={vx + 46} y2={252} tone="#ff9bab" width={5} opacity={incompetent} />
          <Label x={vx + 58} y={214} text="Reflux" opacity={incompetent} tone="#ff9bab" />
        </>
      ) : null}

      <Label x={44} y={56} text="Calf pump and deep vein" opacity={0.55} />
      <Label
        x={44}
        y={74}
        text={incompetent > 0.35 ? 'Incompetent valves' : 'Competent valves'}
        opacity={0.85}
        tone={incompetent > 0.35 ? '#ff9bab' : C.label}
      />
      <Label x={44} y={430} text="Gaiter area" opacity={0.5} />

      {/* Instruments */}
      <Trace
        x={330}
        y={48}
        w={438}
        h={168}
        title="Ambulatory venous pressure — ten paces"
        fn={avp}
        tone={mixHex('#3ccfe6', '#e0455f', pumpLoss)}
        gridLines={2}
        fill
        caption={
          pumpLoss > 0.35 ? 'Pressure stays high on walking' : 'Pressure falls on walking — pump competent'
        }
        captionTone={pumpLoss > 0.35 ? '#ff9bab' : C.label}
      />
      <Numeral
        x={752}
        y={104}
        text={`${ambulatory} mmHg`}
        size={22}
        anchor="end"
        tone={ambulatory > 45 ? '#ff8fa3' : C.cyan}
      />

      <RowsPanel
        x={330}
        y={230}
        w={438}
        title="Skin consequences"
        rows={[
          { label: 'Capillary leak · oedema', on: hypertension },
          { label: 'Haemosiderin staining', on: leakage },
          { label: 'Lipodermatosclerosis', on: fibrosis },
        ]}
        footer={fibrosis > 0.4 ? 'Inverted champagne bottle contour' : 'Skin intact'}
        footerTone={fibrosis > 0.4 ? C.amber : C.label}
      />

      <Banner x={330} y={408} w={438} text="Venous ulceration · compression is the treatment" opacity={ulcer} />
    </>
  );
};

/* ------------------------------------------------------------- Registry -- */

export type VascularSceneId =
  | 'aortic-aneurysm'
  | 'aortic-dissection'
  | 'pulmonary-embolism'
  | 'deep-vein-thrombosis'
  | 'pulmonary-hypertension'
  | 'hypertension'
  | 'peripheral-arterial-disease'
  | 'chronic-venous-insufficiency';

export const VASCULAR_SCENES: Record<VascularSceneId, Scene> = {
  'aortic-aneurysm': AorticAneurysm,
  'aortic-dissection': AorticDissection,
  'pulmonary-embolism': PulmonaryEmbolism,
  'deep-vein-thrombosis': DeepVeinThrombosis,
  'pulmonary-hypertension': PulmonaryHypertension,
  hypertension: Hypertension,
  'peripheral-arterial-disease': PeripheralArterialDisease,
  'chronic-venous-insufficiency': ChronicVenousInsufficiency,
};
