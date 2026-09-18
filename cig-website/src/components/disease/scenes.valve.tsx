/* ==========================================================================
   CIG — Pathophysiology scenes: valve disease and endocardial infection
   --------------------------------------------------------------------------
   Aortic regurgitation · mitral stenosis · mitral regurgitation · tricuspid
   regurgitation · infective endocarditis · rheumatic heart disease.

   The valve scenes share one idea: a valve is drawn in the view that actually
   shows its lesion (long axis for a leak, en face for an orifice), the chamber
   it loads is drawn beside it, and the instrument panel carries the numbers a
   clinician would use to grade it.
   ========================================================================== */

import type { ReactNode } from 'react';
import {
  Arrow,
  Backdrop,
  Banner,
  Chamber,
  CurvedArrow,
  EcgPanel,
  Jet,
  Label,
  Leader,
  Meter,
  Panel,
  RowsPanel,
  Speckle,
  StatPanel,
  Trace,
  cycle,
} from './sceneKit';
import { PALETTE as C, clamp01, mixHex, phase, type SceneContext } from './sceneUtils';

type Scene = (ctx: SceneContext) => ReactNode;

/* --------------------------------------------------------------- helpers -- */

/** Two leaflets meeting at a coaptation point, drawn in long axis.
 *  `gap` 0 = sealed, 1 = widely separated. */
const Leaflets = ({
  cx,
  cy,
  span,
  drop,
  gap,
  tone = '#bfe6f2',
  thickness = 4,
}: {
  cx: number;
  cy: number;
  /** Half the annular width. */
  span: number;
  /** How far the free edges hang towards the ventricle. */
  drop: number;
  gap: number;
  tone?: string;
  thickness?: number;
}): ReactNode => (
  <g>
    <path
      d={`M${cx - span} ${cy} Q${cx - span * 0.5} ${cy + drop} ${cx - gap * span * 0.6} ${cy + drop}`}
      fill="none"
      stroke={tone}
      strokeWidth={thickness}
      strokeLinecap="round"
    />
    <path
      d={`M${cx + span} ${cy} Q${cx + span * 0.5} ${cy + drop} ${cx + gap * span * 0.6} ${cy + drop}`}
      fill="none"
      stroke={tone}
      strokeWidth={thickness}
      strokeLinecap="round"
    />
  </g>
);

/** The mitral orifice seen en face: two leaflets around a central opening that
 *  narrows to the classic fish mouth as the commissures fuse. */
const MitralEnFace = ({
  cx,
  cy,
  r,
  opening,
  calcify,
  fusion,
}: {
  cx: number;
  cy: number;
  r: number;
  /** 0 = closed, 1 = fully open. */
  opening: number;
  calcify: number;
  fusion: number;
}): ReactNode => {
  const halfWidth = r * 0.72 * opening;
  const halfHeight = r * 0.2 + r * 0.42 * opening;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#241a24" stroke="rgba(140,180,230,0.24)" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={r - 4} fill={mixHex('#9ad8e6', '#d8dfe8', calcify * 0.7)} opacity={0.92} />
      <ellipse cx={cx} cy={cy} rx={Math.max(2, halfWidth)} ry={Math.max(1.5, halfHeight)} fill={C.lumen} />
      {/* Fused commissures, drawn as thickened bands at each end of the orifice */}
      {[-1, 1].map((s) => (
        <path
          key={s}
          d={`M${cx + s * (r - 6)} ${cy} L${cx + s * Math.max(2, halfWidth)} ${cy}`}
          stroke={mixHex('#bfeaf5', '#ffffff', fusion)}
          strokeWidth={3 + fusion * 5}
          strokeLinecap="round"
        />
      ))}
      {calcify > 0.05 ? (
        <Speckle cx={cx} cy={cy} rx={r - 12} ry={r - 12} count={20} seed={13} tone={C.calcium} r={2.2} opacity={calcify * 0.9} ring={0.45} />
      ) : null}
    </g>
  );
};

/* ==================================================== AORTIC REGURGITATION -- */

const AorticRegurgitation: Scene = (ctx) => {
  const leak = phase(ctx, 1, 2);
  const volume = phase(ctx, 2, 3);
  const eccentric = phase(ctx, 3, 4);
  const pressureLoad = phase(ctx, 4, 5);
  const pulsePressure = phase(ctx, 5, 6);
  const coronary = phase(ctx, 6, 7);
  const decompensate = phase(ctx, 7, 8);

  const cyc = cycle(ctx, 64);
  const inSystole = cyc < 0.34;
  const contraction = inSystole ? Math.sin((cyc / 0.34) * Math.PI) : 0;

  const dilate = 1 + volume * 0.16 + eccentric * 0.22 + decompensate * 0.1;
  const rx = 62 * dilate;
  const ry = 84 * dilate;
  const cx = 190;
  const cy = 252;
  const squeeze = 1 - 0.14 * contraction * (1 - decompensate * 0.55);

  const regurgFraction = clamp01(leak * 0.32 + volume * 0.14 + decompensate * 0.12);
  const systolic = Math.round(118 + volume * 14 + pressureLoad * 18);
  const diastolic = Math.round(74 - leak * 14 - pulsePressure * 14);
  const ef = Math.round(66 - decompensate * 22);

  /* Aortic root pressure: a tall systolic peak with a steep diastolic run-off
     as blood leaks back into the ventricle. */
  const aortic = (u: number): number => {
    const t = (u * 2.2) % 1;
    const peak = 0.5 + pressureLoad * 0.2;
    if (t < 0.32) return 0.2 + peak * Math.sin((t / 0.32) * Math.PI) + 0.12;
    const decay = Math.exp(-(t - 0.32) * (3 + (leak + pulsePressure) * 6));
    return 0.2 + (peak * 0.72 + 0.12) * decay;
  };

  return (
    <>
      <Backdrop />

      <Label x={cx - 46} y={64} text="Aorta" anchor="end" opacity={0.6} />

      {/* Aorta and root */}
      <path d={`M${cx - 26} ${cy - ry - 6} L${cx - 26} 72 Q${cx} 46 ${cx + 26} 72 L${cx + 26} ${cy - ry - 6} Z`} fill="#5c2334" opacity={0.9} />
      <path d={`M${cx - 18} ${cy - ry - 6} L${cx - 18} 78 Q${cx} 58 ${cx + 18} 78 L${cx + 18} ${cy - ry - 6} Z`} fill={C.lumen} />

      {/* Left ventricle in long axis */}
      <g transform={`translate(${cx} ${cy}) scale(${squeeze.toFixed(3)}) translate(${-cx} ${-cy})`}>
        <Chamber cx={cx} cy={cy} rx={rx} ry={ry} wall={18 + eccentric * 3} />
      </g>

      {/* Aortic cusps: sealing in diastole, or held apart by disease */}
      <Leaflets
        cx={cx}
        cy={cy - ry + 6}
        span={26}
        drop={inSystole ? -20 : 16}
        gap={inSystole ? 1 : leak * 0.9}
        tone={mixHex('#bfe6f2', '#d8dfe8', leak * 0.5)}
      />

      {/* Forward stroke volume in systole; regurgitant jet in diastole */}
      {inSystole ? (
        <Jet x={cx} y={cy - ry - 10} angle={-Math.PI / 2} length={62} clock={ctx.clock} reduced={ctx.reduced} count={7} spread={6} r={3} tone="#ffd4d9" opacity={0.9} />
      ) : (
        <Jet
          x={cx}
          y={cy - ry + 14}
          angle={Math.PI / 2}
          length={70 * leak}
          clock={ctx.clock}
          reduced={ctx.reduced}
          count={9}
          spread={10}
          r={3}
          tone="#9cc3ff"
          opacity={leak}
        />
      )}

      {/* Mitral inflow, which the ventricle must accommodate on top of the leak */}
      <Arrow x1={cx + rx - 6} y1={cy - ry + 40} x2={cx + rx - 40} y2={cy - ry + 74} tone="#7fb2ff" width={6} opacity={0.8} />

      <Label x={cx} y={cy + ry + 34} text="Left ventricle — long axis" anchor="middle" opacity={0.6} />
      <Label
        x={cx}
        y={cy + ry + 52}
        text={eccentric > 0.4 ? 'Eccentric hypertrophy · sarcomeres in series' : 'Normal chamber'}
        anchor="middle"
        opacity={0.8}
        tone={eccentric > 0.4 ? C.amber : C.label}
      />
      <Leader x1={cx + 58} y1={cy - ry - 24} x2={cx + 22} y2={cy - ry + 2} opacity={leak} />
      <Label x={cx + 62} y={cy - ry - 28} text="Loss of coaptation" opacity={leak} />
      {coronary > 0.1 ? (
        <>
          <path
            d={`M${cx + 20} ${cy - ry + 26} C${cx + 74} ${cy - ry + 34} ${cx + 84} ${cy - 20} ${cx + 60} ${cy + 26}`}
            stroke={mixHex('#ef5350', '#6d4a58', coronary)}
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
          />
          <Label x={cx + 92} y={cy + 12} text="Coronary perfusion ↓" opacity={coronary} tone="#ff9bab" />
        </>
      ) : null}

      {/* Instruments */}
      <StatPanel
        x={430}
        y={40}
        w={338}
        title="Regurgitant fraction"
        value={`${Math.round(regurgFraction * 100)}%`}
        meter={regurgFraction / 0.6}
        tone={regurgFraction > 0.5 ? '#ff8fa3' : C.amber}
        aside={`EF ${ef}%`}
        caption={regurgFraction > 0.5 ? 'Severe regurgitation' : regurgFraction > 0.3 ? 'Moderate regurgitation' : 'Competent valve'}
        captionTone={regurgFraction > 0.5 ? '#ff9bab' : C.label}
      />

      <Trace
        x={430}
        y={164}
        w={338}
        h={150}
        title="Aortic root pressure"
        fn={aortic}
        tone={mixHex('#3ccfe6', '#f2b544', pulsePressure)}
        gridLines={2}
        caption={`${systolic}/${diastolic} mmHg · pulse pressure ${systolic - diastolic}`}
        captionTone={systolic - diastolic > 70 ? C.amber : C.label}
      />

      <Panel x={430} y={330} w={338} h={70} title="Coronary perfusion pressure">
        <Meter x={446} y={372} w={306} value={clamp01(1 - coronary * 0.62 - pulsePressure * 0.2)} tone={coronary > 0.4 ? '#e0455f' : C.cyan} />
      </Panel>

      <Banner x={430} y={412} w={338} text="Decompensation · operate before symptoms" opacity={decompensate} />
    </>
  );
};

/* ========================================================= MITRAL STENOSIS -- */

const MitralStenosis: Scene = (ctx) => {
  const valvulitis = phase(ctx, 0, 1);
  const fusion = phase(ctx, 1, 2);
  const gradient = phase(ctx, 2, 3);
  const atrial = phase(ctx, 3, 4);
  const pulmonary = phase(ctx, 4, 5);
  const rightHeart = phase(ctx, 5, 6);
  const af = phase(ctx, 6, 7);

  const cyc = cycle(ctx, 72);
  const diastole = cyc > 0.36;
  const opening = (diastole ? 1 : 0.06) * (1 - fusion * 0.78);
  const area = Math.max(0.6, 4.5 - fusion * 3.4).toFixed(1);
  const meanGradient = Math.round(2 + gradient * 12 + fusion * 4 + af * 4);

  const laSize = 1 + atrial * 0.36 + af * 0.08;

  return (
    <>
      <Backdrop />

      {/* Mitral orifice, en face */}
      <MitralEnFace cx={148} cy={148} r={74} opening={opening} calcify={valvulitis * 0.35 + fusion * 0.6} fusion={fusion} />
      <Label x={148} y={244} text="Mitral valve — en face" anchor="middle" opacity={0.6} />
      <Label
        x={148}
        y={262}
        text={`Valve area ≈ ${area} cm²`}
        anchor="middle"
        opacity={0.9}
        tone={Number(area) < 1.5 ? '#ff9bab' : C.label}
      />
      <Label
        x={148}
        y={280}
        text={fusion > 0.4 ? 'Fused commissures' : 'Wide opening'}
        anchor="middle"
        opacity={0.7}
        tone={fusion > 0.4 ? C.amber : C.label}
      />

      {/* Chambers: dilating left atrium above a normal-sized ventricle */}
      <g>
        <ellipse cx={318} cy={140} rx={64 * laSize} ry={46 * laSize} fill="#6f2b3d" opacity={0.92} />
        <ellipse cx={318} cy={140} rx={64 * laSize} ry={46 * laSize} fill="none" stroke="rgba(255,160,180,0.3)" />
        {af > 0.1 ? (
          <Speckle cx={318} cy={140} rx={58 * laSize} ry={40 * laSize} count={18} seed={5} tone="#cbd5e4" r={2} opacity={af * 0.45} />
        ) : null}
        <Label x={318} y={140 + 46 * laSize + 18} text="Left atrium" anchor="middle" opacity={0.6} />

        {/* Pulmonary veins, carrying the pressure backwards into the lungs */}
        {[-1, 1].map((s) => (
          <path
            key={s}
            d={`M${318 + s * 52} ${112} C${318 + s * 96} ${86} ${318 + s * 108} ${64} ${318 + s * 96} 46`}
            stroke={mixHex('#2c4a72', '#a8415c', pulmonary)}
            strokeWidth={10}
            fill="none"
            strokeLinecap="round"
          />
        ))}
        <Label x={318} y={36} text={pulmonary > 0.35 ? 'Pulmonary congestion' : 'Pulmonary veins'} anchor="middle" opacity={0.75} tone={pulmonary > 0.35 ? '#ff9bab' : C.label} />

        {/* Ventricle, filled through the narrowed orifice */}
        <Chamber cx={318} cy={276} rx={56} ry={62} wall={16} />
        <Leaflets cx={318} cy={218} span={30} drop={diastole ? 22 : 8} gap={opening} tone={mixHex('#bfe6f2', '#e8eef6', fusion)} thickness={4 + fusion * 4} />
        {diastole ? (
          <Jet
            x={318}
            y={224}
            angle={Math.PI / 2}
            length={54}
            clock={ctx.clock}
            reduced={ctx.reduced}
            count={8}
            spread={6 + fusion * 12}
            r={3}
            tone="#ffd4d9"
            opacity={0.85}
          />
        ) : null}
        <Label x={318} y={356} text="Left ventricle" anchor="middle" opacity={0.55} />
      </g>

      {/* Right ventricle, pressure-loaded from behind */}
      {rightHeart > 0.05 ? (
        <g opacity={rightHeart}>
          <path d="M394 232 C430 218 452 244 448 282 C444 318 414 336 394 330 Z" fill="#5b6f8f" opacity={0.9} />
          <Label x={456} y={306} text="Right ventricle" anchor="end" opacity={0.75} tone={C.amber} />
        </g>
      ) : null}

      {/* Instruments */}
      <StatPanel
        x={470}
        y={40}
        w={298}
        title="Transmitral mean gradient"
        value={`${meanGradient} mmHg`}
        meter={meanGradient / 22}
        tone={meanGradient >= 10 ? '#ff8fa3' : meanGradient >= 5 ? C.amber : C.cyan}
        caption={gradient > 0.3 ? 'Worsens with tachycardia' : 'Normal filling'}
        captionTone={gradient > 0.3 ? C.amber : C.label}
      />

      <RowsPanel
        x={470}
        y={166}
        w={298}
        title="Consequences"
        rows={[
          { label: 'LA pressure ↑', on: atrial },
          { label: 'Pulmonary hypertension', on: pulmonary },
          { label: 'Right heart failure', on: rightHeart },
        ]}
      />

      <EcgPanel
        x={470}
        y={308}
        w={298}
        h={94}
        ctx={ctx}
        title="Rhythm"
        tone={mixHex('#3ccfe6', '#ff9bab', af)}
        options={{
          seconds: 4.5,
          rate: 76 + af * 34,
          pWave: 1 - af * 0.95,
          irregularity: af * 0.5,
          fibrillation: af,
        }}
        caption={af > 0.4 ? 'Atrial fibrillation — atrial kick lost' : 'Sinus rhythm'}
        captionTone={af > 0.4 ? '#ff9bab' : C.label}
      />

      <Banner x={470} y={412} w={298} text="Left atrial thrombus · systemic embolism" opacity={af} />
    </>
  );
};

/* ==================================================== MITRAL REGURGITATION -- */

const MitralRegurgitation: Scene = (ctx) => {
  const coaptation = phase(ctx, 0, 1);
  const regurgitant = phase(ctx, 1, 2);
  const atrialLoad = phase(ctx, 2, 3);
  const ventricularLoad = phase(ctx, 3, 4);
  const cycleStep = phase(ctx, 4, 5);
  const dysfunction = phase(ctx, 5, 6);
  const acute = phase(ctx, 6, 7);

  const cyc = cycle(ctx, 68);
  const inSystole = cyc < 0.36;
  const contraction = inSystole ? Math.sin((cyc / 0.36) * Math.PI) : 0;

  const lvDilate = 1 + ventricularLoad * 0.2 + cycleStep * 0.12 + dysfunction * 0.06;
  const laDilate = (1 + atrialLoad * 0.34 + cycleStep * 0.06) * (1 - acute * 0.3);
  const gap = clamp01(coaptation * 0.7 + cycleStep * 0.3);
  const rf = Math.round((coaptation * 24 + regurgitant * 18 + cycleStep * 14 + acute * 12));
  const ef = Math.round(68 - dysfunction * 16);

  /* Left atrial pressure: a modest v wave when the atrium has had time to
     dilate, a giant one when regurgitation is acute. */
  const laPressure = (u: number): number => {
    const t = (u * 2.4) % 1;
    const a = 0.18 * Math.exp(-Math.pow((t - 0.06) / 0.05, 2));
    const vAmp = 0.22 + regurgitant * 0.2 + acute * 0.5;
    const v = vAmp * Math.exp(-Math.pow((t - 0.42) / 0.12, 2));
    return 0.16 + a + v;
  };

  return (
    <>
      <Backdrop />

      {/* Left atrium above, left ventricle below */}
      <ellipse cx={228} cy={126} rx={70 * laDilate} ry={46 * laDilate} fill="#6f2b3d" opacity={0.92} />
      <ellipse cx={228} cy={126} rx={70 * laDilate} ry={46 * laDilate} fill="none" stroke="rgba(255,160,180,0.3)" />
      <Label x={228} y={126 - 46 * laDilate - 14} text="Left atrium" anchor="middle" opacity={0.6} />

      <g transform={`translate(228 288) scale(${(1 - 0.11 * contraction).toFixed(3)}) translate(-228 -288)`}>
        <Chamber cx={228} cy={288} rx={70 * lvDilate} ry={84 * lvDilate} wall={19} />
      </g>

      {/* Mitral leaflets, tethered apart in systole */}
      <Leaflets
        cx={228}
        cy={186}
        span={36}
        drop={inSystole ? -14 : 24}
        gap={inSystole ? gap : 1}
        tone={mixHex('#bfe6f2', '#e2c9d2', coaptation * 0.4)}
      />

      {/* Systole: part of the stroke volume goes backwards into the atrium */}
      {inSystole ? (
        <>
          <Jet
            x={228}
            y={180}
            angle={-Math.PI / 2}
            length={54 * clamp01(gap + 0.15)}
            clock={ctx.clock}
            reduced={ctx.reduced}
            count={9}
            spread={12}
            r={3}
            tone="#9cc3ff"
            opacity={clamp01(coaptation * 1.4)}
          />
          <Arrow x1={228 + 70 * lvDilate - 22} y1={244} x2={228 + 70 * lvDilate + 26} y2={198} tone="#ffd4d9" width={7} opacity={0.85} />
        </>
      ) : (
        <Arrow x1={228} y1={196} x2={228} y2={244} tone="#7fb2ff" width={7} opacity={0.8} />
      )}

      <Label x={228} y={288 + 84 * lvDilate + 26} text="Left ventricle — long axis" anchor="middle" opacity={0.6} />
      <Label
        x={228}
        y={288 + 84 * lvDilate + 44}
        text={cycleStep > 0.4 ? 'Regurgitation begets regurgitation' : 'Volume overload'}
        anchor="middle"
        opacity={0.8}
        tone={cycleStep > 0.4 ? '#ff9bab' : C.label}
      />
      <Label x={418} y={170} text="Forward stroke volume" anchor="end" opacity={0.6} />

      {/* The vicious cycle of secondary regurgitation */}
      {cycleStep > 0.1 ? (
        <>
          <CurvedArrow p0={[118, 300]} p1={[62, 216]} p2={[126, 152]} tone="#ff9bab" width={3} opacity={cycleStep} dash="6 5" />
          <Label x={44} y={244} text="Dilatation" opacity={cycleStep} tone="#ff9bab" />
        </>
      ) : null}

      {/* Instruments */}
      <StatPanel
        x={430}
        y={40}
        w={338}
        title="Regurgitant fraction"
        value={`${rf}%`}
        meter={rf / 60}
        tone={rf >= 50 ? '#ff8fa3' : rf >= 30 ? C.amber : C.cyan}
        aside={`EF ${ef}%`}
        caption={dysfunction > 0.35 ? "'Normal' EF already means dysfunction" : 'Ventricle unloaded — EF flatters'}
        captionTone={dysfunction > 0.35 ? '#ff9bab' : C.label}
      />

      <Trace
        x={430}
        y={164}
        w={338}
        h={150}
        title="Left atrial pressure"
        fn={laPressure}
        tone={mixHex('#3ccfe6', '#e0455f', acute)}
        gridLines={2}
        caption={acute > 0.35 ? 'Giant v wave — non-compliant atrium' : 'Compliant atrium — modest v wave'}
        captionTone={acute > 0.35 ? '#ff9bab' : C.label}
      />

      <Panel x={430} y={330} w={338} h={70} title="Chamber loading">
        <Meter x={446} y={378} w={148} value={clamp01(0.2 + atrialLoad * 0.7)} tone={C.amber} label="Left atrium" />
        <Meter x={614} y={378} w={138} value={clamp01(0.2 + ventricularLoad * 0.7)} tone={C.amber} label="Left ventricle" />
      </Panel>

      <Banner x={430} y={412} w={338} text="Acute severe MR · flash pulmonary oedema" opacity={acute} />
    </>
  );
};

/* ================================================= TRICUSPID REGURGITATION -- */

const TricuspidRegurgitation: Scene = (ctx) => {
  const overload = phase(ctx, 0, 1);
  const annulus = phase(ctx, 1, 2);
  const tether = phase(ctx, 2, 3);
  const atrial = phase(ctx, 3, 4);
  const cycleStep = phase(ctx, 4, 5);
  const congestion = phase(ctx, 5, 6);

  const cyc = cycle(ctx, 70);
  const inSystole = cyc < 0.36;
  const dilate = 1 + overload * 0.2 + cycleStep * 0.16;
  const annulusWidth = 38 * (1 + annulus * 0.55 + cycleStep * 0.15);
  const gap = clamp01(annulus * 0.5 + tether * 0.4 + cycleStep * 0.2);

  /* Right atrial pressure with the systolic regurgitant v wave. */
  const rap = (u: number): number => {
    const t = (u * 2.4) % 1;
    const a = 0.16 * Math.exp(-Math.pow((t - 0.06) / 0.05, 2));
    const v = (0.16 + gap * 0.52) * Math.exp(-Math.pow((t - 0.44) / 0.13, 2));
    return 0.14 + a * (1 - gap * 0.3) + v;
  };

  return (
    <>
      <Backdrop />

      {/* Right atrium and right ventricle */}
      <ellipse cx={210} cy={126} rx={70 * (1 + atrial * 0.3)} ry={44 * (1 + atrial * 0.3)} fill="#2c4a72" opacity={0.92} />
      <ellipse cx={210} cy={126} rx={70 * (1 + atrial * 0.3)} ry={44 * (1 + atrial * 0.3)} fill="none" stroke="rgba(140,190,255,0.32)" />
      <Label x={210} y={70} text="Right atrium" anchor="middle" opacity={0.6} />

      <g transform={`translate(210 292) scale(${dilate.toFixed(3)}) translate(-210 -292)`}>
        <path
          d="M154 200 C214 184 268 214 274 262 C280 320 236 366 196 362 C158 344 140 254 154 200 Z"
          fill="#5b6f8f"
          opacity={0.92}
        />
        <path
          d="M154 200 C214 184 268 214 274 262 C280 320 236 366 196 362 C158 344 140 254 154 200 Z"
          fill="none"
          stroke="rgba(160,200,255,0.35)"
        />
        <path
          d="M176 226 C216 214 250 236 254 272 C258 312 226 342 198 338 C174 322 166 262 176 226 Z"
          fill={C.lumen}
        />
        {/* Papillary muscles, displaced as the ventricle remodels */}
        {[-1, 1].map((s) => (
          <path
            key={s}
            d={`M${214 + s * (16 + tether * 14)} ${300 + tether * 12} l0 22`}
            stroke="#8ea6c6"
            strokeWidth={7}
            strokeLinecap="round"
          />
        ))}
      </g>
      <Label x={244} y={412} text="Right ventricle" anchor="middle" opacity={0.6} />

      {/* Annulus and tethered leaflets */}
      <Leaflets
        cx={210}
        cy={186}
        span={annulusWidth}
        drop={inSystole ? -10 - tether * 16 : 22}
        gap={inSystole ? gap : 1}
        tone="#bfe6f2"
      />
      <Label x={334} y={196} text={`Annulus ${(3.2 * (annulusWidth / 38)).toFixed(1)} cm`} anchor="end" opacity={0.75} tone={annulus > 0.4 ? C.amber : C.label} />

      {inSystole ? (
        <Jet
          x={210}
          y={182}
          angle={-Math.PI / 2}
          length={56 * clamp01(gap + 0.1)}
          clock={ctx.clock}
          reduced={ctx.reduced}
          count={9}
          spread={13}
          r={3}
          tone="#9cc3ff"
          opacity={clamp01(gap * 1.5)}
        />
      ) : null}

      {/* Systemic veins carrying the pressure backwards */}
      <path
        d={`M140 108 C86 96 62 74 58 48`}
        stroke={mixHex('#2c4a72', '#a8415c', congestion)}
        strokeWidth={12}
        fill="none"
        strokeLinecap="round"
      />
      <Label x={40} y={40} text="Jugular veins" opacity={0.6} />
      {congestion > 0.1 ? (
        <>
          <path d="M64 314 q42 -20 84 6 q-10 42 -48 42 q-36 -6 -36 -48 z" fill={mixHex('#5a4a3a', '#7a3b46', congestion)} opacity={0.9} />
          <Label x={54} y={392} text="Hepatic congestion" opacity={congestion} tone="#ff9bab" />
          <Label x={54} y={410} text="Ascites · oedema" opacity={congestion} tone="#ff9bab" />
        </>
      ) : null}

      {/* Instruments */}
      <Trace
        x={430}
        y={48}
        w={338}
        h={150}
        title="Right atrial / jugular pressure"
        fn={rap}
        tone={mixHex('#3ccfe6', '#e0455f', gap)}
        gridLines={2}
        caption={gap > 0.45 ? 'Giant v wave · pulsatile JVP' : 'Normal a and v waves'}
        captionTone={gap > 0.45 ? '#ff9bab' : C.label}
      />

      <RowsPanel
        x={430}
        y={212}
        w={338}
        title="Mechanism"
        rows={[
          { label: 'Annular dilatation', on: annulus },
          { label: 'Leaflet tethering', on: tether },
          { label: 'Self-perpetuating cycle', on: cycleStep },
        ]}
      />

      <Panel x={430} y={354} w={338} h={46}>
        <Label x={446} y={382} text="Venous congestion" opacity={0.65} />
        <Meter x={600} y={373} w={152} value={clamp01(0.12 + congestion * 0.82)} tone={congestion > 0.4 ? '#e0455f' : C.cyan} />
      </Panel>

      <Banner x={430} y={412} w={338} text="Cardiac cirrhosis · cardiorenal syndrome" opacity={congestion} />
    </>
  );
};

/* ==================================================== INFECTIVE ENDOCARDITIS -- */

const InfectiveEndocarditis: Scene = (ctx) => {
  const injury = phase(ctx, 0, 1);
  const sterile = phase(ctx, 1, 2);
  const adhere = phase(ctx, 2, 3);
  const growth = phase(ctx, 3, 4);
  const destruction = phase(ctx, 4, 5);
  const conduction = phase(ctx, 5, 6);
  const embolism = phase(ctx, 6, 7);
  const immune = phase(ctx, 7, 8);

  const lx = 214;
  const ly = 246;
  const vegSize = 6 * sterile + 20 * growth + 10 * destruction;

  return (
    <>
      <Backdrop />

      {/* A valve leaflet in profile, with the jet that injures it */}
      <path d={`M${lx - 120} ${ly - 96} L${lx + 120} ${ly - 96}`} stroke="rgba(140,180,230,0.25)" strokeWidth={1} strokeDasharray="4 4" />
      <path
        d={`M${lx - 92} ${ly - 96} Q${lx - 40} ${ly - 30} ${lx - 6} ${ly + 4}`}
        stroke={mixHex('#bfe6f2', '#e6d3c4', injury * 0.5)}
        strokeWidth={10 - destruction * 3}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${lx + 92} ${ly - 96} Q${lx + 40} ${ly - 30} ${lx + 6} ${ly + 4}`}
        stroke={mixHex('#bfe6f2', '#e6d3c4', injury * 0.5)}
        strokeWidth={10 - destruction * 3}
        fill="none"
        strokeLinecap="round"
      />
      <Label x={lx - 132} y={ly - 118} text="Valve leaflets — profile" opacity={0.6} />

      {/* The regurgitant jet striking the endocardium */}
      <Jet
        x={lx - 30}
        y={ly + 30}
        angle={-Math.PI / 2.6}
        length={64}
        clock={ctx.clock}
        reduced={ctx.reduced}
        count={7}
        spread={7}
        r={2.6}
        tone="#ffd4d9"
        opacity={0.8}
      />
      <Label x={lx - 118} y={ly + 40} text="Jet lesion" opacity={injury} tone="#ffd4d9" />

      {/* Sterile platelet–fibrin nidus, then the growing infected vegetation */}
      {sterile > 0.02 ? (
        <>
          <ellipse cx={lx - 30} cy={ly - 34} rx={vegSize} ry={vegSize * 0.78} fill={mixHex('#d8d3c4', '#8a6f52', adhere)} opacity={0.95} />
          <ellipse cx={lx - 30} cy={ly - 34} rx={vegSize} ry={vegSize * 0.78} fill="none" stroke="#f5f0e6" strokeWidth={1.2} opacity={0.7} />
          {adhere > 0.05 ? (
            <Speckle
              cx={lx - 30}
              cy={ly - 34}
              rx={vegSize * 0.8}
              ry={vegSize * 0.62}
              count={Math.round(6 + growth * 22)}
              seed={19}
              tone="#7ee0a6"
              r={1.9}
              opacity={0.85 * adhere}
            />
          ) : null}
        </>
      ) : null}
      <Leader x1={lx - 96} y1={ly - 96} x2={lx - 42} y2={ly - 44} opacity={sterile} />
      <Label x={lx - 172} y={ly - 100} text="Vegetation" opacity={sterile} />

      {/* Destruction: a perforation and a root abscess reaching the conduction axis */}
      {destruction > 0.15 ? (
        <>
          <path d={`M${lx + 40} ${ly - 46} l16 10`} stroke="#0b1424" strokeWidth={7} strokeLinecap="round" />
          <Label x={lx + 70} y={ly - 44} text="Perforation" opacity={destruction} tone="#ff9bab" />
        </>
      ) : null}
      {conduction > 0.1 ? (
        <>
          <ellipse cx={lx - 8} cy={ly + 52} rx={26 * conduction} ry={18 * conduction} fill="#7a5b2c" opacity={0.9} />
          <path d={`M${lx - 8} ${ly + 66} l0 40`} stroke={mixHex('#f2b544', '#4c5568', conduction)} strokeWidth={5} strokeLinecap="round" />
          <Label x={lx + 28} y={ly + 108} text="Bundle of His" opacity={conduction} tone={C.amber} />
        </>
      ) : null}

      {/* Septic emboli leaving the valve for the systemic circulation */}
      {embolism > 0.05
        ? [
            { x: 470, y: 92, label: 'Brain' },
            { x: 470, y: 150, label: 'Spleen' },
            { x: 470, y: 208, label: 'Kidney' },
          ].map((target, i) => {
            const t = clamp01(embolism * 1.3 - i * 0.12);
            return (
              <g key={target.label}>
                <CurvedArrow
                  p0={[lx + 20, ly - 40]}
                  p1={[360, ly - 90 - i * 30]}
                  p2={[target.x - 14, target.y]}
                  tone="#ff9bab"
                  width={2.4}
                  opacity={t}
                  dash="5 5"
                />
                <circle cx={lx + 30 + (target.x - lx - 50) * t} cy={ly - 40 + (target.y - ly + 40) * t} r={4} fill="#e6d3c4" opacity={t} />
              </g>
            );
          })
        : null}

      {/* Instruments */}
      <Panel x={452} y={48} w={316} h={188} title="Embolic targets">
        <Label x={468} y={96} text="Brain — stroke · mycotic aneurysm" opacity={0.4 + 0.6 * embolism} tone={embolism > 0.3 ? '#ffb3c0' : C.label} />
        <Label x={468} y={154} text="Spleen — infarct · abscess" opacity={0.4 + 0.6 * embolism} tone={embolism > 0.3 ? '#ffb3c0' : C.label} />
        <Label x={468} y={212} text="Kidney — infarct · glomerulonephritis" opacity={0.4 + 0.6 * Math.max(embolism, immune)} tone={immune > 0.3 ? '#ffb3c0' : C.label} />
      </Panel>

      <RowsPanel
        x={452}
        y={248}
        w={316}
        title="Vegetation"
        rows={[
          { label: 'Bacterial density', on: growth },
          { label: 'Tissue destruction', on: destruction },
        ]}
      />

      <EcgPanel
        x={452}
        y={362}
        w={316}
        h={78}
        ctx={ctx}
        title="Conduction"
        tone={mixHex('#3ccfe6', '#f2b544', conduction)}
        options={{ seconds: 4, rate: 84 - conduction * 32, pWave: 1, irregularity: conduction * 0.35 }}
        caption={conduction > 0.35 ? 'New AV block — suspect root abscess' : 'Normal AV conduction'}
        captionTone={conduction > 0.35 ? C.amber : C.label}
      />

      <Banner x={60} y={412} w={300} text="Immune complexes · Osler's nodes · Roth spots" opacity={immune} />
    </>
  );
};

/* ================================================= RHEUMATIC HEART DISEASE -- */

const RheumaticHeartDisease: Scene = (ctx) => {
  const pharyngitis = phase(ctx, 0, 1);
  const mimicry = phase(ctx, 1, 2);
  const fever = phase(ctx, 2, 3);
  const carditis = phase(ctx, 3, 4);
  const aschoff = phase(ctx, 4, 5);
  const scarring = phase(ctx, 5, 6);
  const recurrence = phase(ctx, 6, 7);

  const orifice = 1 - scarring * 0.72 - recurrence * 0.16;

  return (
    <>
      <Backdrop />

      {/* Pharynx with streptococci */}
      <g>
        <path d="M76 96 q52 -34 104 0 q10 54 -52 74 q-62 -20 -52 -74 z" fill="#7a3b46" opacity={0.92} />
        <path d="M76 96 q52 -34 104 0 q10 54 -52 74 q-62 -20 -52 -74 z" fill="none" stroke="rgba(255,160,180,0.3)" />
        {pharyngitis > 0.02 ? (
          <Speckle cx={128} cy={124} rx={40} ry={30} count={14} seed={3} tone="#7ee0a6" r={3} opacity={pharyngitis * 0.9} />
        ) : null}
        <Label x={128} y={196} text="Group A Streptococcus" anchor="middle" opacity={0.75} tone={pharyngitis > 0.3 ? '#7ee0a6' : C.label} />
      </g>

      {/* Cross-reactive antibodies travelling from throat to valve */}
      {mimicry > 0.03
        ? Array.from({ length: 7 }, (_, i) => {
            const t = clamp01(mimicry * 1.3 - i * 0.08);
            const x = 150 + (256 - 150) * t;
            const y = 150 + (250 - 150) * t + Math.sin(i * 2) * 14;
            return (
              <g key={i} opacity={t}>
                <path d={`M${x} ${y} l0 -9 M${x} ${y - 9} l-6 -6 M${x} ${y - 9} l6 -6`} stroke="#f2b544" strokeWidth={2} fill="none" strokeLinecap="round" />
              </g>
            );
          })
        : null}
      <Label x={232} y={214} text="Molecular mimicry" anchor="end" opacity={mimicry} tone={C.amber} />

      {/* The mitral valve: acute verrucae, then chronic fusion */}
      <MitralEnFace cx={318} cy={296} r={78} opening={clamp01(orifice)} calcify={scarring * 0.8 + recurrence * 0.2} fusion={scarring} />
      {carditis > 0.05
        ? Array.from({ length: 9 }, (_, i) => {
            const a = (i / 9) * Math.PI * 2;
            return (
              <circle
                key={i}
                cx={318 + Math.cos(a) * 44}
                cy={296 + Math.sin(a) * 16}
                r={3.4}
                fill="#f5f0e6"
                opacity={carditis * (1 - scarring * 0.6)}
              />
            );
          })
        : null}
      <Label x={318} y={392} text="Mitral valve — en face" anchor="middle" opacity={0.6} />
      <Label
        x={318}
        y={410}
        text={scarring > 0.4 ? 'Fused commissures · predominant stenosis' : carditis > 0.3 ? 'Verrucae on closure lines · regurgitation' : 'Normal valve'}
        anchor="middle"
        opacity={0.85}
        tone={scarring > 0.4 ? '#ff9bab' : carditis > 0.3 ? C.amber : C.label}
      />

      {/* Aschoff body inset */}
      {aschoff > 0.05 ? (
        <Panel x={44} y={252} w={176} h={150} title="Myocardium" opacity={aschoff}>
          <circle cx={132} cy={330} r={44} fill="#6f2b3d" opacity={0.6} />
          <Speckle cx={132} cy={330} rx={28} ry={24} count={12} seed={27} tone="#e8eef6" r={3} opacity={0.9} />
          <Label x={132} y={392} text="Aschoff body" anchor="middle" opacity={0.9} tone={C.amber} />
        </Panel>
      ) : null}

      {/* Instruments */}
      <RowsPanel
        x={452}
        y={40}
        w={316}
        title="Acute rheumatic fever — Jones criteria"
        rows={[
          { label: 'Carditis', on: fever },
          { label: 'Polyarthritis · chorea', on: clamp01(fever * 1.2 - 0.1) },
          { label: 'Erythema · nodules', on: clamp01(fever * 1.2 - 0.25) },
        ]}
        footer="Latent period 2–4 weeks"
      />

      <Panel x={452} y={198} w={316} h={96} title="Valve damage">
        <Meter x={468} y={240} w={284} value={clamp01(carditis * 0.35 + scarring * 0.5 + recurrence * 0.25)} tone={mixHex('#f2b544', '#e0455f', scarring)} />
        <Label
          x={468}
          y={282}
          text={recurrence > 0.3 ? 'Each recurrence adds damage' : 'Damage accumulates over years'}
          opacity={0.85}
          tone={recurrence > 0.3 ? '#ff9bab' : C.label}
        />
      </Panel>

      <Panel x={452} y={310} w={316} h={72} title="Prevention">
        <Label x={468} y={356} text="Secondary prophylaxis prevents" opacity={0.8} tone={C.cyan} />
        <Label x={468} y={372} text="recurrence — and the damage it adds" opacity={0.8} tone={C.cyan} />
      </Panel>

      <Banner x={452} y={412} w={316} text="Chronic rheumatic valve disease" opacity={scarring} />
    </>
  );
};

/* ------------------------------------------------------------- Registry -- */

export type ValveSceneId =
  | 'aortic-regurgitation'
  | 'mitral-stenosis'
  | 'mitral-regurgitation'
  | 'tricuspid-regurgitation'
  | 'infective-endocarditis'
  | 'rheumatic-heart-disease';

export const VALVE_SCENES: Record<ValveSceneId, Scene> = {
  'aortic-regurgitation': AorticRegurgitation,
  'mitral-stenosis': MitralStenosis,
  'mitral-regurgitation': MitralRegurgitation,
  'tricuspid-regurgitation': TricuspidRegurgitation,
  'infective-endocarditis': InfectiveEndocarditis,
  'rheumatic-heart-disease': RheumaticHeartDisease,
};
