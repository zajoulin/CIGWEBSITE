/* ==========================================================================
   CIG — Pathophysiology scenes: myocardium, shunts and the pericardium
   --------------------------------------------------------------------------
   Stable angina · cardiomyopathies · congenital heart disease · atrial septal
   defect · pericardial disease.
   ========================================================================== */

import type { ReactNode } from 'react';
import {
  Arrow,
  Backdrop,
  Banner,
  Chamber,
  CurvedArrow,
  EcgPanel,
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
  cycle,
} from './sceneKit';
import { PALETTE as C, clamp01, mixHex, phase, rand, type SceneContext } from './sceneUtils';

type Scene = (ctx: SceneContext) => ReactNode;

/* ============================================================ STABLE ANGINA -- */

const StableAngina: Scene = (ctx) => {
  const stenosis = phase(ctx, 0, 1);
  const reserve = phase(ctx, 1, 2);
  const demand = phase(ctx, 2, 3);
  const mismatch = phase(ctx, 3, 4);
  const cascade = phase(ctx, 4, 5);
  const resolution = phase(ctx, 5, 6);

  /* Exercise starts with the demand step and ends when the patient stops. */
  const exertion = clamp01(demand * 1.4) * (1 - resolution);
  const rate = 62 + exertion * 68;

  const epicardial: [number, number][] = [
    [58, 96],
    [116, 124],
    [168, 168],
    [206, 222],
    [232, 282],
    [246, 344],
  ];
  const lesionAt = 0.42;
  const narrow = clamp01(stenosis * 0.62 + reserve * 0.18);

  /* Microvascular tone: dilated at rest to protect flow, so little reserve
     remains when exercise demands more. */
  const microDilate = 1 + reserve * 0.5 + exertion * 0.18 * (1 - reserve * 0.8);
  const supply = clamp01(0.95 - narrow * 0.45) * (1 + exertion * 0.5 * (1 - reserve * 0.75));
  const demandLevel = clamp01(0.3 + exertion * 0.62);
  const ischaemia =
    clamp01((demandLevel - supply * 0.72) * 2.4) * clamp01(0.25 + mismatch) * (1 - resolution * 0.95);

  return (
    <>
      <Backdrop />

      {/* Epicardial coronary with its fixed lesion */}
      <path
        d={epicardial.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ')}
        stroke="#3b4a63"
        strokeWidth={24}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={epicardial.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ')}
        stroke={C.lumen}
        strokeWidth={15}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {stenosis > 0.02 ? (
        <>
          <ellipse cx={168} cy={168} rx={17} ry={8 + 8 * narrow} transform="rotate(40 168 168)" fill={C.necrotic} opacity={0.92} />
          <Leader x1={214} y1={132} x2={180} y2={158} opacity={stenosis} />
          <Label x={218} y={126} text={`${Math.round(40 + narrow * 45)}% stenosis`} opacity={stenosis} />
        </>
      ) : null}
      <FlowPath pts={epicardial} count={8} speed={0.4 + exertion * 0.5} clock={ctx.clock} reduced={ctx.reduced} tone={C.blood} r={3.2} opacity={0.5} from={0} to={lesionAt} />
      <FlowPath
        pts={epicardial}
        count={8}
        speed={(0.4 + exertion * 0.5) * clamp01(1 - narrow * 0.6)}
        clock={ctx.clock}
        reduced={ctx.reduced}
        tone={C.blood}
        r={3.2}
        opacity={0.5 * clamp01(1 - narrow * 0.5)}
        from={lesionAt}
        to={1}
      />

      {/* Microvascular bed, already partly dilated to protect resting flow */}
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M246 344 q${-40 + i * 40} ${26 + i * 8} ${-70 + i * 66} ${48 + i * 6}`}
          stroke="#8d3247"
          strokeWidth={3 * microDilate}
          fill="none"
          strokeLinecap="round"
          opacity={0.9}
        />
      ))}
      <Label x={190} y={420} text="Microvascular bed" opacity={0.6} />
      <Label
        x={190}
        y={438}
        text={reserve > 0.35 ? 'Already dilated — reserve spent' : 'Reserve intact'}
        opacity={0.8}
        tone={reserve > 0.35 ? C.amber : C.label}
      />

      {/* Myocardium in short axis: the subendocardium suffers first */}
      <Chamber cx={352} cy={196} rx={82} ry={82} wall={30} />
      {ischaemia > 0.05 ? (
        <circle
          cx={352}
          cy={196}
          r={62}
          fill="none"
          stroke={C.ischaemic}
          strokeWidth={14}
          opacity={0.35 + 0.6 * ischaemia}
        />
      ) : null}
      <Label x={352} y={296} text="Subendocardium" anchor="middle" opacity={0.6} />
      <Label
        x={352}
        y={314}
        text={ischaemia > 0.35 ? 'Ischaemic — perfused last' : 'Adequately perfused'}
        anchor="middle"
        opacity={0.85}
        tone={ischaemia > 0.35 ? '#ff9bab' : C.label}
      />

      {/* Instruments */}
      <Panel x={452} y={40} w={316} h={148} title={exertion > 0.25 ? 'Exertion' : 'At rest'}>
        <Numeral x={468} y={92} text={`${Math.round(rate)} bpm`} size={22} tone={exertion > 0.4 ? C.amber : C.cyan} />
        <Label x={468} y={122} text="Oxygen demand" opacity={0.65} />
        <Meter x={468} y={130} w={284} value={demandLevel} tone="#e0455f" />
        <Label x={468} y={160} text="Maximum deliverable supply" opacity={0.65} />
        <Meter x={468} y={168} w={284} value={clamp01(supply * 0.72)} tone={supply * 0.72 < demandLevel ? C.amber : C.cyan} />
      </Panel>

      <RowsPanel
        x={452}
        y={192}
        w={316}
        title="The ischaemic cascade"
        rows={[
          { label: 'Diastolic dysfunction', on: clamp01(cascade * 1.5) * (1 - resolution) },
          { label: 'Systolic dysfunction', on: clamp01(cascade * 1.3 - 0.15) * (1 - resolution) },
          { label: 'ST depression', on: clamp01(cascade * 1.2 - 0.3) * (1 - resolution) },
          { label: 'Angina', on: clamp01(cascade - 0.35) * (1 - resolution) },
        ]}
      />

      <EcgPanel
        x={452}
        y={366}
        w={316}
        h={74}
        ctx={ctx}
        title="Lead V5"
        tone={mixHex('#3ccfe6', '#f2b544', ischaemia)}
        options={{ seconds: 3.4, rate, stElevation: -ischaemia * 0.55 }}
        caption={
          resolution > 0.4
            ? 'Resolves with rest — no necrosis'
            : ischaemia > 0.35
              ? 'Horizontal ST depression'
              : 'Normal at rest'
        }
        captionTone={ischaemia > 0.35 && resolution < 0.4 ? C.amber : C.label}
      />
    </>
  );
};

/* ========================================================== CARDIOMYOPATHY -- */

const Cardiomyopathy: Scene = (ctx) => {
  const dilated = phase(ctx, 1, 2);
  const hypertrophic = phase(ctx, 2, 3);
  const obstruction = phase(ctx, 3, 4);
  const restrictive = phase(ctx, 4, 5);
  const arrhythmogenic = phase(ctx, 5, 6);
  const consequences = phase(ctx, 6, 7);

  const cyc = cycle(ctx, 68);
  const contraction = cyc < 0.36 ? Math.sin((cyc / 0.36) * Math.PI) : 0;

  /* One ventricle that morphs between the four phenotypes, so the differences
     read as departures from the same starting geometry. */
  const cx = 232;
  const cy = 224;
  const rx = 84 * (1 + dilated * 0.24 - hypertrophic * 0.06);
  const ry = 96 * (1 + dilated * 0.12 - hypertrophic * 0.04);
  const wall = 20 + hypertrophic * 22 + restrictive * 8 - dilated * 7;
  const squeeze = 1 - 0.13 * contraction * (1 - dilated * 0.72 - restrictive * 0.2);
  const septalExtra = hypertrophic * 26 + obstruction * 10;

  const phenotype =
    arrhythmogenic > 0.3
      ? 'Arrhythmogenic — fibrofatty replacement'
      : restrictive > 0.3
        ? 'Restrictive — stiff walls, huge atria'
        : obstruction > 0.3
          ? 'Obstructive HCM — systolic anterior motion'
          : hypertrophic > 0.3
            ? 'Hypertrophic — asymmetric septum'
            : dilated > 0.3
              ? 'Dilated — spherical, thin-walled'
              : 'Normal ventricle';

  return (
    <>
      <Backdrop />

      <g transform={`translate(${cx} ${cy}) scale(${squeeze.toFixed(3)}) translate(${-cx} ${-cy})`}>
        <Chamber cx={cx} cy={cy} rx={rx} ry={ry} wall={wall} />
        {/* Asymmetric septal thickening, bulging into the cavity */}
        {septalExtra > 1 ? (
          <path
            d={`M${cx - rx + wall} ${cy - ry * 0.66} C${cx - rx + wall + septalExtra * 1.5} ${cy - ry * 0.3} ${
              cx - rx + wall + septalExtra * 1.5
            } ${cy + ry * 0.3} ${cx - rx + wall} ${cy + ry * 0.66} Z`}
            fill="#7d2b3d"
            stroke="rgba(255,160,180,0.3)"
          />
        ) : null}
        {/* Interstitial fibrosis */}
        {Math.max(dilated, restrictive, arrhythmogenic) > 0.15 ? (
          <Speckle
            cx={cx}
            cy={cy}
            rx={rx - 8}
            ry={ry - 8}
            count={22}
            seed={12}
            tone="#e6ebf4"
            r={2}
            opacity={Math.max(dilated * 0.5, restrictive * 0.7, arrhythmogenic * 0.5)}
            ring={0.72}
          />
        ) : null}
        {/* Fibrofatty replacement of the free wall */}
        {arrhythmogenic > 0.1
          ? Array.from({ length: 16 }, (_, i) => {
              const a = -0.6 + rand(i) * 1.6;
              return (
                <circle
                  key={i}
                  cx={cx + Math.cos(a) * (rx - 8)}
                  cy={cy + Math.sin(a) * (ry - 8)}
                  r={3 + rand(i + 8) * 3}
                  fill="#e8c96a"
                  opacity={arrhythmogenic * 0.8}
                />
              );
            })
          : null}
      </g>

      {/* Outflow tract with systolic anterior motion of the mitral leaflet */}
      <path d={`M${cx - 18} ${cy - ry - 4} L${cx - 18} 66 L${cx + 24} 66 L${cx + 24} ${cy - ry - 4}`} fill="none" stroke="#8d3247" strokeWidth={7} />
      {obstruction > 0.08 ? (
        <>
          <path
            d={`M${cx + 30} ${cy - ry + 34} Q${cx + 4 - obstruction * 22} ${cy - ry + 6} ${cx - 8} ${cy - ry - 12}`}
            stroke="#bfe6f2"
            strokeWidth={5}
            fill="none"
            strokeLinecap="round"
          />
          <Jet x={cx - 2} y={cy - ry - 18} angle={-Math.PI / 2} length={46} clock={ctx.clock} reduced={ctx.reduced} count={7} spread={9} r={2.6} tone="#ffd4d9" opacity={obstruction} />
          <Label x={cx + 44} y={cy - ry + 4} text="Systolic anterior" opacity={obstruction} tone={C.amber} />
        </>
      ) : null}

      {/* Atria, which balloon when the ventricle will not fill */}
      {restrictive > 0.08
        ? [-1, 1].map((s) => (
            <ellipse
              key={s}
              cx={cx + s * 126}
              cy={92}
              rx={26 + restrictive * 22}
              ry={18 + restrictive * 14}
              fill="#6f2b3d"
              opacity={0.85 * restrictive}
            />
          ))
        : null}
      {restrictive > 0.25 ? <Label x={80} y={58} text="Biatrial dilatation" opacity={restrictive} tone={C.amber} /> : null}

      <Label x={cx} y={cy + ry + 36} text="Left ventricle — long axis" anchor="middle" opacity={0.55} />
      <Label x={cx} y={cy + ry + 54} text={phenotype} anchor="middle" opacity={0.9} tone={dilated + hypertrophic + restrictive + arrhythmogenic > 0.3 ? C.amber : C.label} />

      {/* Instruments */}
      <RowsPanel
        x={452}
        y={40}
        w={316}
        title="Phenotype"
        rows={[
          { label: 'Dilated', on: dilated * (1 - hypertrophic), tone: '140,190,255' },
          { label: 'Hypertrophic', on: hypertrophic * (1 - restrictive), tone: '242,181,68' },
          { label: 'Restrictive', on: restrictive * (1 - arrhythmogenic), tone: '140,190,255' },
          { label: 'Arrhythmogenic', on: arrhythmogenic, tone: '242,181,68' },
        ]}
      />

      <Panel x={452} y={214} w={316} h={116} title="Mechanics">
        <Label x={468} y={252} text="Systolic function" opacity={0.65} />
        <Meter x={468} y={260} w={284} value={clamp01(1 - dilated * 0.55 - arrhythmogenic * 0.2)} tone={dilated > 0.4 ? '#e0455f' : C.cyan} />
        <Label x={468} y={300} text="Filling (diastolic function)" opacity={0.65} />
        <Meter x={468} y={308} w={284} value={clamp01(1 - hypertrophic * 0.4 - restrictive * 0.6)} tone={restrictive > 0.4 ? '#e0455f' : C.cyan} />
      </Panel>

      <Panel x={452} y={344} w={316} h={72} title="Shared endpoints" opacity={Math.max(0.35, consequences)}>
        <Label x={468} y={390} text="Heart failure · arrhythmia" opacity={0.5 + 0.5 * consequences} tone={consequences > 0.4 ? '#ff9bab' : C.label} />
        <Label x={468} y={406} text="Thromboembolism" opacity={0.5 + 0.5 * consequences} tone={consequences > 0.4 ? '#ff9bab' : C.label} />
      </Panel>

      <Banner x={60} y={412} w={300} text="Sudden cardiac death risk · screen the family" opacity={consequences} />
    </>
  );
};

/* ================================================= CONGENITAL HEART DISEASE -- */

const CongenitalHeartDisease: Scene = (ctx) => {
  const development = phase(ctx, 0, 1);
  const transition = phase(ctx, 1, 2);
  const shunt = phase(ctx, 2, 3);
  const obstruction = phase(ctx, 3, 4);
  const cyanosis = phase(ctx, 4, 5);
  const eisenmenger = phase(ctx, 5, 6);

  const pvr = clamp01(0.86 - transition * 0.62 + eisenmenger * 0.72);
  const svr = clamp01(0.24 + transition * 0.5);
  const reversed = eisenmenger > 0.45;
  const mixing = clamp01(cyanosis * 0.7 + eisenmenger * 0.8);

  /* Four-chamber schematic. Left chambers red, right chambers blue, mixing
     shades them towards each other as shunting becomes bidirectional. */
  const rightTone = mixHex('#2c4a72', '#7a3b52', mixing);
  const leftTone = mixHex('#7d2b3d', '#4d4470', mixing);

  return (
    <>
      <Backdrop />

      {/* Chambers */}
      <ellipse cx={166} cy={148} rx={62} ry={44} fill={rightTone} opacity={0.94} />
      <ellipse cx={318} cy={148} rx={62} ry={44} fill={leftTone} opacity={0.94} />
      <path d="M104 196 C104 300 140 356 172 372 C200 352 224 300 224 196 Z" fill={rightTone} opacity={0.94} />
      <path d="M260 196 C260 300 288 352 314 372 C348 356 380 300 380 196 Z" fill={leftTone} opacity={0.94} />
      <Label x={166} y={124} text="Right atrium" anchor="middle" opacity={0.6} />
      <Label x={318} y={124} text="Left atrium" anchor="middle" opacity={0.6} />
      <Label x={164} y={402} text="Right ventricle" anchor="middle" opacity={0.6} />
      <Label x={322} y={402} text="Left ventricle" anchor="middle" opacity={0.6} />

      {/* The septal defect and its shunt */}
      {development > 0.05 ? (
        <>
          <rect x={232} y={236} width={20} height={54 * clamp01(development * 1.4)} rx={8} fill={C.lumen} />
          <Label x={242} y={228} text="Defect" anchor="middle" opacity={development} />
        </>
      ) : null}
      {shunt > 0.05 ? (
        <Arrow
          x1={reversed ? 250 : 234}
          y1={264}
          x2={reversed ? 214 : 270}
          y2={264}
          tone={reversed ? '#7fb2ff' : '#ffd4d9'}
          width={9}
          opacity={Math.max(shunt, eisenmenger)}
        />
      ) : null}
      <Label
        x={242}
        y={310}
        text={reversed ? 'Right-to-left' : shunt > 0.3 ? 'Left-to-right' : ''}
        anchor="middle"
        opacity={Math.max(shunt, eisenmenger)}
        tone={reversed ? '#9cc3ff' : '#ffd4d9'}
      />

      {/* Great arteries; the pulmonary side takes the extra flow */}
      <path d="M150 104 C142 62 176 44 206 44" stroke={rightTone} strokeWidth={16} fill="none" strokeLinecap="round" />
      <path d="M334 104 C344 60 306 42 274 44" stroke={leftTone} strokeWidth={16} fill="none" strokeLinecap="round" />
      <Label x={206} y={30} text="Pulmonary artery · aorta" anchor="middle" opacity={0.55} />
      <FlowPath
        pts={[
          [150, 104],
          [148, 70],
          [176, 46],
          [206, 44],
        ]}
        count={6}
        speed={0.5 * (1 + shunt) * (1 - eisenmenger * 0.6)}
        clock={ctx.clock}
        reduced={ctx.reduced}
        tone="#7fb2ff"
        r={3}
        opacity={0.6}
      />

      {/* An obstructive lesion, loading the ventricle with pressure instead */}
      {obstruction > 0.08 ? (
        <>
          <ellipse cx={334} cy={92} rx={14} ry={6 + obstruction * 5} fill={C.calcium} opacity={0.85} />
          <Jet x={334} y={80} angle={-Math.PI / 2} length={34 * obstruction} clock={ctx.clock} reduced={ctx.reduced} count={6} spread={8} r={2.4} tone="#ffd4d9" opacity={obstruction} />
          <Label x={412} y={62} text="Outflow obstruction" anchor="end" opacity={obstruction} tone={C.amber} />
        </>
      ) : null}

      {/* Instruments */}
      <Panel x={430} y={40} w={338} h={120} title="Transitional circulation">
        <Label x={446} y={74} text="Pulmonary vascular resistance" opacity={0.65} />
        <Meter x={446} y={82} w={306} value={pvr} tone={eisenmenger > 0.3 ? '#e0455f' : '#7fb2ff'} />
        <Label x={446} y={126} text="Systemic vascular resistance" opacity={0.65} />
        <Meter x={446} y={134} w={306} value={svr} tone="#e0455f" />
      </Panel>

      <RowsPanel
        x={430}
        y={174}
        w={338}
        title="Physiology"
        rows={[
          { label: 'Left-to-right shunt', on: shunt * (1 - eisenmenger) },
          { label: 'Pressure loading', on: obstruction },
          { label: 'Right-to-left · cyanosis', on: Math.max(cyanosis, eisenmenger) },
        ]}
      />

      <StatPanel
        x={430}
        y={316}
        w={338}
        title="Arterial saturation"
        value={`${Math.round(98 - mixing * 22)}%`}
        meter={clamp01((98 - mixing * 22 - 60) / 40)}
        tone={mixing > 0.3 ? '#ff8fa3' : C.cyan}
        caption={mixing > 0.3 ? 'Cyanosis · erythrocytosis · clubbing' : 'Acyanotic'}
        captionTone={mixing > 0.3 ? '#ff9bab' : C.label}
      />

      <Banner x={60} y={416} w={330} text="Eisenmenger — closure no longer possible" opacity={eisenmenger} />
    </>
  );
};

/* =================================================== ATRIAL SEPTAL DEFECT -- */

const AtrialSeptalDefect: Scene = (ctx) => {
  const defect = phase(ctx, 0, 1);
  const shunt = phase(ctx, 1, 2);
  const rightLoad = phase(ctx, 2, 3);
  const pulmonary = phase(ctx, 3, 4);
  const splitting = phase(ctx, 4, 5);
  const arrhythmia = phase(ctx, 5, 6);
  const vascular = phase(ctx, 6, 7);

  const rightSize = 1 + rightLoad * 0.2 + pulmonary * 0.06;
  const qp = 1 + shunt * 0.9 + pulmonary * 0.7;
  const reversed = vascular > 0.5;

  /* The second heart sound, drawn as two components whose separation no longer
     varies with respiration once the right ventricle is volume loaded. */
  const heartSound = (u: number): number => {
    const t = (u * 2) % 1;
    const inspiration = u < 0.5;
    const a2 = 0.42;
    const normalGap = inspiration ? 0.07 : 0.02;
    const p2 = a2 + normalGap + splitting * (inspiration ? 0.03 : 0.08);
    const s1 = 0.06 * Math.exp(-Math.pow((t - 0.06) / 0.014, 2));
    const s2a = 0.46 * Math.exp(-Math.pow((t - a2) / 0.012, 2));
    const s2p = (0.3 + splitting * 0.16) * Math.exp(-Math.pow((t - p2) / 0.012, 2));
    return 0.16 + s1 + s2a + s2p;
  };

  return (
    <>
      <Backdrop />

      {/* Atria with the interatrial defect */}
      <ellipse cx={150} cy={150} rx={66 * rightSize} ry={46 * rightSize} fill="#2c4a72" opacity={0.94} />
      <ellipse cx={150} cy={150} rx={66 * rightSize} ry={46 * rightSize} fill="none" stroke="rgba(140,190,255,0.32)" />
      <ellipse cx={310} cy={150} rx={64} ry={44} fill="#6f2b3d" opacity={0.94} />
      <ellipse cx={310} cy={150} rx={64} ry={44} fill="none" stroke="rgba(255,160,180,0.3)" />
      <Label x={150} y={92} text="Right atrium" anchor="middle" opacity={0.6} />
      <Label x={310} y={92} text="Left atrium" anchor="middle" opacity={0.6} />

      {/* Ventricles */}
      <path
        d={`M${150 - 58 * rightSize} 196 C${150 - 58 * rightSize} 300 ${150 - 20} 356 ${150 + 4} 372 C${
          150 + 46 * rightSize
        } 348 ${150 + 62 * rightSize} 292 ${150 + 62 * rightSize} 196 Z`}
        fill="#2c4a72"
        opacity={0.94}
      />
      <path d="M252 196 C252 296 280 348 306 366 C340 348 368 296 368 196 Z" fill="#7d2b3d" opacity={0.94} />
      <Label x={146} y={400} text="Right ventricle" anchor="middle" opacity={0.6} />
      <Label x={318} y={392} text="Left ventricle" anchor="middle" opacity={0.55} />

      {/* Defect and shunt */}
      {defect > 0.05 ? (
        <rect
          x={226}
          y={132}
          width={20}
          height={40 * clamp01(defect * 1.5)}
          rx={9}
          fill={C.lumen}
          stroke="rgba(180,215,255,0.5)"
          strokeWidth={1.4}
        />
      ) : null}
      {shunt > 0.05 ? (
        <Arrow
          x1={reversed ? 224 : 248}
          y1={152}
          x2={reversed ? 190 : 214}
          y2={152}
          tone={reversed ? '#7fb2ff' : '#ffd4d9'}
          width={8}
          opacity={Math.max(shunt, vascular)}
        />
      ) : null}
      <Label
        x={236}
        y={198}
        text={reversed ? 'Shunt reversed' : shunt > 0.3 ? 'Left-to-right' : ''}
        anchor="middle"
        opacity={Math.max(shunt, vascular)}
        tone={reversed ? '#9cc3ff' : '#ffd4d9'}
      />

      {/* Pulmonary artery taking the extra flow */}
      <path d="M132 106 C120 62 156 44 190 46" stroke="#2c4a72" strokeWidth={16 + pulmonary * 8} fill="none" strokeLinecap="round" />
      <FlowPath
        pts={[
          [132, 106],
          [126, 70],
          [156, 46],
          [190, 46],
        ]}
        count={Math.round(5 + shunt * 5)}
        speed={0.5 + shunt * 0.4}
        clock={ctx.clock}
        reduced={ctx.reduced}
        tone="#7fb2ff"
        r={3}
        opacity={0.6}
      />
      <Label x={196} y={34} text="Pulmonary artery" opacity={0.55} />
      {vascular > 0.15 ? (
        <Speckle cx={158} cy={62} rx={40} ry={16} count={14} seed={23} tone="#cbd5e4" r={2} opacity={vascular * 0.6} />
      ) : null}

      {/* Instruments */}
      <StatPanel
        x={430}
        y={40}
        w={338}
        title="Shunt fraction"
        value={`Qp : Qs  ${qp.toFixed(1)} : 1`}
        meter={(qp - 1) / 2.4}
        tone={qp >= 1.5 ? C.amber : C.cyan}
        caption={qp >= 1.5 ? 'Haemodynamically significant shunt' : 'Small shunt'}
        captionTone={qp >= 1.5 ? C.amber : C.label}
      />

      <Trace
        x={430}
        y={162}
        w={338}
        h={150}
        title="S2 — inspiration | expiration"
        fn={heartSound}
        tone={mixHex('#3ccfe6', '#f2b544', splitting)}
        gridLines={1}
        caption={splitting > 0.4 ? 'Fixed splitting — no respiratory variation' : 'Normal inspiratory splitting'}
        captionTone={splitting > 0.4 ? C.amber : C.label}
      />

      <EcgPanel
        x={430}
        y={328}
        w={338}
        h={78}
        ctx={ctx}
        title="Rhythm"
        tone={mixHex('#3ccfe6', '#ff9bab', arrhythmia)}
        options={{
          seconds: 4,
          rate: 78 + arrhythmia * 26,
          pWave: 1 - arrhythmia * 0.9,
          irregularity: arrhythmia * 0.5,
          fibrillation: arrhythmia * 0.8,
        }}
        caption={arrhythmia > 0.4 ? 'Atrial fibrillation from atrial stretch' : 'Sinus rhythm'}
        captionTone={arrhythmia > 0.4 ? '#ff9bab' : C.label}
      />

      <Banner x={430} y={414} w={338} text="Pulmonary vascular disease · Eisenmenger" opacity={vascular} />
    </>
  );
};

/* ======================================================= PERICARDIAL DISEASE -- */

const PericardialDisease: Scene = (ctx) => {
  const inflammation = phase(ctx, 0, 1);
  const referral = phase(ctx, 1, 2);
  const effusion = phase(ctx, 2, 3);
  const pressure = phase(ctx, 3, 4);
  const tamponade = phase(ctx, 4, 5);
  const interdependence = phase(ctx, 5, 6);
  const constriction = phase(ctx, 6, 7);

  const cx = 214;
  const cy = 230;
  const fluid = clamp01(effusion * 0.6 + pressure * 0.4);
  const sacR = 132 + fluid * 22 + constriction * -8;
  const heartScale = 1 - tamponade * 0.16 - constriction * 0.05;

  /* Respiratory swing: inspiration fills the right side and pushes the septum
     into the left ventricle, which is what pulsus paradoxus measures. */
  const resp = ctx.reduced ? 0 : Math.sin((ctx.clock / 1000) * 0.9);
  const septalShift = interdependence * 16 * resp;

  const arterial = (u: number): number => {
    const t = (u * 3.4) % 1;
    const breath = Math.sin(u * Math.PI * 2);
    const swing = 1 - interdependence * 0.3 * clamp01(breath);
    const beat = t < 0.3 ? Math.sin((t / 0.3) * Math.PI) : Math.exp(-(t - 0.3) * 4) * 0.4;
    return 0.2 + beat * 0.62 * swing;
  };

  const venous = (u: number): number => {
    const t = (u * 3) % 1;
    if (constriction > 0.25) {
      /* Dip and plateau: rapid early filling arrested by the rigid sac. */
      const dip = t < 0.16 ? 0.72 - (t / 0.16) * 0.5 : 0.22 + 0.04 * Math.sin(t * 20);
      return clamp01(dip + 0.16);
    }
    const a = 0.24 * Math.exp(-Math.pow((t - 0.08) / 0.06, 2));
    const v = 0.22 * Math.exp(-Math.pow((t - 0.5) / 0.09, 2));
    return 0.24 + a + v + tamponade * 0.22;
  };

  return (
    <>
      <Backdrop />

      {/* Pericardial sac */}
      <circle
        cx={cx}
        cy={cy}
        r={sacR}
        fill={fluid > 0.02 ? 'rgba(96,150,200,0.18)' : 'none'}
        stroke={mixHex('#8fb4dd', '#e8eef6', constriction)}
        strokeWidth={2 + inflammation * 2 + constriction * 7}
        strokeDasharray={constriction > 0.2 ? undefined : inflammation > 0.2 ? '9 5' : undefined}
      />
      {constriction > 0.2 ? (
        <circle cx={cx} cy={cy} r={sacR} fill="none" stroke={C.calcium} strokeWidth={2} strokeDasharray="14 9" opacity={constriction} />
      ) : null}
      {effusion > 0.05 ? (
        <Speckle cx={cx} cy={cy} rx={sacR - 14} ry={sacR - 14} count={22} seed={15} tone="#9cc3ff" r={2.2} opacity={fluid * 0.55} ring={0.7} />
      ) : null}

      {/* Heart inside the sac, compressed as pressure rises */}
      <g transform={`translate(${cx} ${cy}) scale(${heartScale.toFixed(3)}) translate(${-cx} ${-cy})`}>
        <path
          d={`M${cx - 6} ${cy - 92} C${cx + 76} ${cy - 92} ${cx + 96} ${cy - 10} ${cx + 66} ${cy + 62} C${cx + 40} ${
            cy + 100
          } ${cx - 30} ${cy + 106} ${cx - 62} ${cy + 60} C${cx - 96} ${cy - 8} ${cx - 78} ${cy - 92} ${cx - 6} ${cy - 92} Z`}
          fill="#7d2b3d"
          opacity={0.95}
        />
        {/* Right-sided chambers, the first to collapse */}
        <path
          d={`M${cx - 62 + septalShift} ${cy - 56} C${cx - 20 + septalShift} ${cy - 70} ${cx - 4 + septalShift} ${cy - 10} ${
            cx - 16 + septalShift
          } ${cy + 60} C${cx - 54} ${cy + 52} ${cx - 76} ${cy - 10} ${cx - 62 + septalShift} ${cy - 56} Z`}
          fill={mixHex('#2c4a72', '#1b2a40', tamponade)}
          opacity={0.95}
        />
        <path
          d={`M${cx + 4} ${cy - 54} C${cx + 60} ${cy - 60} ${cx + 72} ${cy + 6} ${cx + 44} ${cy + 58} C${cx + 12} ${
            cy + 52
          } ${cx - 6} ${cy + 4} ${cx + 4} ${cy - 54} Z`}
          fill={C.lumen}
        />
      </g>

      <Label x={cx} y={cy + sacR + 26} text="Heart within the pericardial sac" anchor="middle" opacity={0.6} />
      <Label
        x={cx}
        y={cy + sacR + 44}
        text={
          constriction > 0.35
            ? 'Fibrotic · thickened · calcified'
            : tamponade > 0.35
              ? 'Chamber collapse · filling pressures equalise'
              : effusion > 0.3
                ? 'Pericardial effusion'
                : inflammation > 0.3
                  ? 'Inflamed layers — friction rub'
                  : 'Normal pericardium'
        }
        anchor="middle"
        opacity={0.85}
        tone={tamponade > 0.35 || constriction > 0.35 ? '#ff9bab' : C.label}
      />

      {/* Referred pain along the phrenic nerve */}
      {referral > 0.05 ? (
        <>
          <CurvedArrow p0={[cx - 60, cy - 76]} p1={[120, 108]} p2={[96, 62]} tone="#f2b544" width={2.6} opacity={referral} dash="5 4" />
          <Label x={60} y={50} text="Trapezius ridge pain" opacity={referral} tone={C.amber} />
        </>
      ) : null}

      {/* Instruments */}
      <Panel x={430} y={40} w={338} h={104} title="Pericardial pressure–volume">
        {(() => {
          const px = (v: number): number => 446 + v * 300;
          const py = (p: number): number => 124 - p * 52;
          let d = '';
          for (let i = 0; i <= 40; i++) {
            const v = i / 40;
            const stiff = 1 + constriction * 2.4;
            const p = clamp01(Math.pow(clamp01((v - 0.32) / 0.68), 2.2 / stiff));
            d += (i === 0 ? 'M' : 'L') + px(v).toFixed(1) + ' ' + py(p).toFixed(1);
          }
          return (
            <>
              <path d={d} fill="none" stroke={mixHex('#3ccfe6', '#e0455f', pressure)} strokeWidth={2.2} />
              <circle cx={px(clamp01(0.2 + fluid * 0.7))} cy={py(clamp01(Math.pow(clamp01((0.2 + fluid * 0.7 - 0.32) / 0.68), 2.2)))} r={4.5} fill="#ffd4d9" />
              <Label x={752} y={136} text="Reserve volume → steep rise" anchor="end" opacity={0.55} />
            </>
          );
        })()}
      </Panel>

      <Trace
        x={430}
        y={158}
        w={338}
        h={126}
        title="Arterial pressure"
        fn={arterial}
        tone={mixHex('#3ccfe6', '#e0455f', interdependence)}
        gridLines={2}
        caption={interdependence > 0.35 ? 'Pulsus paradoxus' : 'Normal respiratory variation'}
        captionTone={interdependence > 0.35 ? '#ff9bab' : C.label}
      />

      <Trace
        x={430}
        y={296}
        w={338}
        h={130}
        title="Venous / ventricular filling"
        fn={venous}
        tone={mixHex('#3ccfe6', '#f2b544', constriction)}
        gridLines={2}
        caption={
          constriction > 0.3
            ? 'Dip and plateau · pericardial knock'
            : tamponade > 0.3
              ? 'Raised, equalised filling pressures'
              : 'Normal a and v waves'
        }
        captionTone={constriction > 0.3 || tamponade > 0.3 ? C.amber : C.label}
      />
    </>
  );
};

/* ------------------------------------------------------------- Registry -- */

export type MyocardialSceneId =
  | 'stable-angina'
  | 'cardiomyopathy'
  | 'congenital-heart-disease'
  | 'atrial-septal-defect'
  | 'pericardial-disease';

export const MYOCARDIAL_SCENES: Record<MyocardialSceneId, Scene> = {
  'stable-angina': StableAngina,
  cardiomyopathy: Cardiomyopathy,
  'congenital-heart-disease': CongenitalHeartDisease,
  'atrial-septal-defect': AtrialSeptalDefect,
  'pericardial-disease': PericardialDisease,
};
