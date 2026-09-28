/* ==========================================================================
   CIG — Pathophysiology scenes: rhythm and conduction
   --------------------------------------------------------------------------
   Supraventricular tachycardia · ventricular arrhythmias · conduction
   disorders and bradyarrhythmias.

   These three scenes need waveforms the shared ECG generator does not model —
   a re-entrant tachycardia, torsades, fibrillation, and dissociated atrial and
   ventricular activity — so each defines its own tracing function and draws it
   through the generic Trace panel.
   ========================================================================== */

import type { ReactNode } from 'react';
import {
  Backdrop,
  Banner,
  Chamber,
  Label,
  Leader,
  Meter,
  Numeral,
  Panel,
  RowsPanel,
  Speckle,
  StatPanel,
  Trace,
  along,
} from './sceneKit';
import { PALETTE as C, clamp01, mixHex, phase, rand, type SceneContext } from './sceneUtils';

type Scene = (ctx: SceneContext) => ReactNode;
type Pt = [number, number];

/* --------------------------------------------------------------- helpers -- */

/** A P wave, QRS complex and T wave placed at a given time within the strip. */
const pWave = (t: number, at: number, amp = 0.16): number =>
  t > at && t < at + 0.11 ? amp * Math.sin(((t - at) / 0.11) * Math.PI) : 0;

const qrsWave = (t: number, at: number, amp = 1, width = 0.075): number => {
  const u = (t - at) / width;
  if (u < 0 || u > 1) return 0;
  if (u < 0.18) return -0.1 * amp * (u / 0.18);
  if (u < 0.52) return amp * ((u - 0.18) / 0.34);
  if (u < 0.82) return amp * (1 - (u - 0.52) / 0.3);
  return -0.22 * amp * (1 - (u - 0.82) / 0.18);
};

const tWave = (t: number, at: number, amp = 0.22, width = 0.2): number =>
  t > at && t < at + width ? amp * Math.sin(((t - at) / width) * Math.PI) : 0;

/* ============================================ SUPRAVENTRICULAR TACHYCARDIA -- */

const SupraventricularTachycardia: Scene = (ctx) => {
  const dual = phase(ctx, 0, 1);
  const sinus = phase(ctx, 1, 2);
  const premature = phase(ctx, 2, 3);
  const reentry = phase(ctx, 3, 4);
  const tachycardia = phase(ctx, 4, 5);
  const accessory = phase(ctx, 5, 6);
  const haemodynamic = phase(ctx, 6, 7);
  const preexcited = phase(ctx, 7, 8);

  const time = ctx.reduced ? 0.3 : ctx.clock / 1000;
  const circulating = Math.max(reentry, tachycardia);

  /* The AV nodal circuit: a fast pathway on the left, a slow one on the right,
     joined at the atrial end and at the distal node. */
  const fast: Pt[] = [
    [214, 156],
    [190, 186],
    [180, 216],
    [196, 244],
    [216, 258],
  ];
  const slow: Pt[] = [
    [214, 156],
    [246, 176],
    [262, 208],
    [252, 240],
    [216, 258],
  ];
  const loop: Pt[] = [...slow, ...[...fast].reverse().slice(1)];

  const rate = Math.round(72 + tachycardia * 110 + preexcited * 40);
  const fastBlocked = premature > 0.15 && reentry < 0.85;

  /* ECG: sinus, then a premature beat, then a regular narrow-complex
     tachycardia, and finally the irregular chaos of pre-excited AF. */
  const strip = (u: number): number => {
    const seconds = 4;
    const t = u * seconds;
    let v = 0;
    if (preexcited > 0.4) {
      let beat = 0;
      let at = 0;
      while (at < seconds) {
        const rr = 0.22 + rand(beat * 3.1) * 0.28;
        v += qrsWave(t, at, 0.9 + rand(beat) * 0.3, 0.14);
        at += rr;
        beat++;
      }
      v += 0.02 * Math.sin(t * 60);
    } else if (tachycardia > 0.35) {
      const rr = 60 / rate;
      for (let k = -1; k * rr < seconds + rr; k++) {
        const at = k * rr;
        v += qrsWave(t, at, 1, 0.06);
        v += tWave(t, at + 0.1, 0.14, rr * 0.4);
      }
    } else {
      const rr = 0.82;
      for (let k = -1; k * rr < seconds + rr; k++) {
        const at = k * rr;
        v += pWave(t, at, 0.16 * (1 - premature * 0.2));
        v += qrsWave(t, at + 0.17, 1, 0.07);
        v += tWave(t, at + 0.3);
      }
      if (premature > 0.2) {
        /* One early atrial beat that starts the whole thing. */
        v += pWave(t, 2.3, 0.2);
        v += qrsWave(t, 2.56, 1, 0.07);
      }
    }
    return 0.44 + v * 0.42;
  };

  return (
    <>
      <Backdrop />

      {/* Atrium, node and ventricles */}
      <ellipse cx={214} cy={112} rx={104} ry={48} fill="#6f2b3d" opacity={0.9} />
      <Label x={214} y={70} text="Atrium" anchor="middle" opacity={0.6} />
      <path d="M132 300 C132 366 176 404 214 418 C252 404 296 366 296 300 Z" fill="#7d2b3d" opacity={0.9} />
      <Label x={214} y={400} text="Ventricles" anchor="middle" opacity={0.55} />

      {/* Dual AV nodal pathways */}
      <path
        d={fast.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ')}
        stroke={fastBlocked ? '#5c6273' : mixHex('#8ea6c6', '#f2b544', dual)}
        strokeWidth={9}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={slow.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ')}
        stroke={mixHex('#8ea6c6', '#7ee0a6', dual)}
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
        strokeDasharray="10 6"
      />
      <Label x={162} y={190} text="Fast" anchor="end" opacity={0.75} tone={fastBlocked ? '#ff9bab' : C.label} />
      <Label x={162} y={206} text="long refractory" anchor="end" opacity={0.45} />
      <Label x={278} y={190} text="Slow" opacity={0.75} />
      <Label x={278} y={206} text="short refractory" opacity={0.45} />
      {fastBlocked ? (
        <>
          <path d="M174 200 l16 16 M190 200 l-16 16" stroke="#ff6b83" strokeWidth={3} strokeLinecap="round" />
          <Label x={162} y={244} text="Blocked — refractory" anchor="end" opacity={0.9} tone="#ff9bab" />
        </>
      ) : null}

      {/* His bundle into the ventricles */}
      <path d="M216 258 L216 300" stroke="#8ea6c6" strokeWidth={8} strokeLinecap="round" />

      {/* The travelling impulse */}
      {sinus > 0.05 && circulating < 0.15 ? (
        (() => {
          const u = (time * 0.9) % 1;
          const p = along(fast, u);
          return <circle cx={p[0]} cy={p[1]} r={7} fill={C.amber} opacity={0.9} />;
        })()
      ) : null}
      {circulating > 0.15
        ? [0, 0.5].map((offset, i) => {
            const u = (time * 1.5 + offset) % 1;
            const p = along(loop, u);
            return <circle key={i} cx={p[0]} cy={p[1]} r={7} fill={i === 0 ? C.amber : '#7ee0a6'} opacity={0.9 * circulating} />;
          })
        : null}
      {circulating > 0.2 ? (
        <>
          <Leader x1={300} y1={288} x2={262} y2={244} opacity={circulating} />
          <Label x={294} y={312} text="Re-entry circuit" opacity={circulating} tone={C.amber} />
        </>
      ) : null}

      {/* An accessory pathway bypassing the node altogether */}
      {accessory > 0.05 ? (
        <>
          <path d="M312 150 C352 190 352 250 304 292" stroke="#f2b544" strokeWidth={7} fill="none" strokeLinecap="round" opacity={accessory} />
          <Label x={392} y={318} text="Accessory pathway" opacity={accessory} tone={C.amber} anchor="end" />
        </>
      ) : null}

      {/* Atria contracting against closed valves */}
      {haemodynamic > 0.1 ? (
        <>
          <path d="M96 132 L52 118" stroke="#7fb2ff" strokeWidth={4 + haemodynamic * 4} strokeLinecap="round" opacity={haemodynamic} />
          <Label x={44} y={106} text="Cannon a waves" opacity={haemodynamic} tone="#9cc3ff" />
        </>
      ) : null}

      {/* Instruments */}
      <StatPanel
        x={430}
        y={40}
        w={338}
        title="Ventricular rate"
        value={`${rate} bpm`}
        meter={rate / 260}
        tone={rate > 150 ? '#ff8fa3' : C.cyan}
        caption={rate > 150 ? 'Regular, rapid, narrow complex' : 'Sinus rate'}
        captionTone={rate > 150 ? '#ff9bab' : C.label}
      />

      <Trace
        x={430}
        y={164}
        w={338}
        h={148}
        title="Rhythm strip"
        fn={strip}
        tone={mixHex('#3ccfe6', '#ff9bab', Math.max(tachycardia, preexcited))}
        gridLines={2}
        caption={
          preexcited > 0.4
            ? 'Pre-excited AF — irregular, wide, very fast'
            : tachycardia > 0.35
              ? 'Narrow complex · P buried in the QRS'
              : premature > 0.2
                ? 'Premature atrial beat · PR jump'
                : 'Sinus rhythm'
        }
        captionTone={tachycardia > 0.35 || preexcited > 0.4 ? '#ff9bab' : C.label}
      />

      <Panel x={430} y={326} w={338} h={78} title="Diastolic filling">
        <Meter x={446} y={364} w={306} value={clamp01(1 - tachycardia * 0.55 - preexcited * 0.3)} tone={tachycardia > 0.4 ? C.amber : C.cyan} />
        <Label
          x={446}
          y={394}
          text={haemodynamic > 0.3 ? 'Diastole shortened · stroke volume ↓' : 'Filling time adequate'}
          opacity={0.8}
          tone={haemodynamic > 0.3 ? C.amber : C.label}
        />
      </Panel>

      <Banner x={430} y={414} w={338} text="Avoid AV nodal blockers in pre-excited AF" opacity={preexcited} />
    </>
  );
};

/* ==================================================== VENTRICULAR ARRHYTHMIAS -- */

const VentricularArrhythmias: Scene = (ctx) => {
  const scar = phase(ctx, 0, 1);
  const triggered = phase(ctx, 1, 2);
  const automaticity = phase(ctx, 2, 3);
  const channel = phase(ctx, 3, 4);
  const collapse = phase(ctx, 4, 5);
  const fibrillation = phase(ctx, 5, 6);

  const time = ctx.reduced ? 0.2 : ctx.clock / 1000;
  const cx = 214;
  const cy = 214;

  /* Action potential: prolonged repolarisation with early afterdepolarisations
     when triggered activity is the mechanism. */
  const actionPotential = (u: number): number => {
    const t = (u * 2) % 1;
    const dur = 0.32 + channel * 0.22;
    if (t < 0.02) return 0.12 + (t / 0.02) * 0.78;
    if (t < dur) {
      const plateau = 0.62 - (t / dur) * 0.16;
      const ead = triggered > 0.2 && t > dur * 0.6 ? triggered * 0.2 * Math.sin((t - dur * 0.6) * 60) : 0;
      return 0.28 + plateau + ead;
    }
    if (t < dur + 0.12) return 0.12 + (0.9 - 0.12) * (1 - (t - dur) / 0.12) * 0.36;
    return 0.12;
  };

  /* Rhythm: ectopy, then monomorphic VT, torsades, and finally fibrillation. */
  const strip = (u: number): number => {
    const seconds = 4;
    const t = u * seconds;
    let v = 0;
    if (fibrillation > 0.4) {
      v =
        0.42 * Math.sin(t * 27 + Math.sin(t * 11) * 2.2) * (0.6 + 0.4 * Math.sin(t * 6.3)) +
        0.16 * Math.sin(t * 63 + 1.1) +
        0.08 * (rand(Math.floor(t * 240)) - 0.5);
    } else if (collapse > 0.35) {
      const rr = 0.3;
      const torsade = channel > 0.5 && collapse < 0.75;
      for (let k = -1; k * rr < seconds + rr; k++) {
        const at = k * rr;
        const envelope = torsade ? Math.sin(at * 2.2) : 1;
        v += qrsWave(t, at, 1.05 * envelope, 0.17);
      }
    } else {
      const rr = 0.85;
      for (let k = -1; k * rr < seconds + rr; k++) {
        const at = k * rr;
        v += pWave(t, at);
        v += qrsWave(t, at + 0.17, 1, 0.07);
        v += tWave(t, at + 0.3, 0.22 + channel * 0.1, 0.2 + channel * 0.14);
      }
      if (automaticity > 0.2) {
        /* A ventricular ectopic: wide, early, no preceding P wave. */
        v += qrsWave(t, 1.55, -1.15, 0.17);
        v += qrsWave(t, 3.25, -1.15, 0.17);
      }
    }
    return 0.46 + v * 0.4;
  };

  return (
    <>
      <Backdrop />

      {/* Ventricle in short axis with an infarct scar */}
      <Chamber cx={cx} cy={cy} rx={116} ry={116} wall={38} />
      {scar > 0.05 ? (
        <>
          <path
            d={`M${cx - 92} ${cy - 42} A96 96 0 0 1 ${cx - 30} ${cy - 104} L${cx - 20} ${cy - 68} A62 62 0 0 0 ${
              cx - 58
            } ${cy - 26} Z`}
            fill={C.infarct}
            opacity={0.92 * scar}
          />
          <Label x={cx - 150} y={cy - 96} text="Infarct scar" opacity={scar} />
        </>
      ) : null}

      {/* The surviving isthmus and the circuit that turns around it */}
      {scar > 0.25 ? (
        <>
          <path
            d={`M${cx - 74} ${cy - 74} l24 -18`}
            stroke="#f2b544"
            strokeWidth={4}
            strokeLinecap="round"
            opacity={scar}
          />
          <Label x={cx - 178} y={cy - 62} text="Surviving isthmus" opacity={scar} tone={C.amber} />
          {(() => {
            const u = (time * 0.6) % 1;
            const a = -2.4 + u * Math.PI * 2;
            return (
              <>
                <circle cx={cx + Math.cos(a) * 88} cy={cy + Math.sin(a) * 88} r={7} fill={C.amber} opacity={0.95} />
                <circle
                  cx={cx}
                  cy={cy}
                  r={88}
                  fill="none"
                  stroke={C.amber}
                  strokeWidth={1.6}
                  strokeDasharray="6 8"
                  opacity={0.45}
                />
              </>
            );
          })()}
        </>
      ) : null}

      {/* An ectopic focus firing on its own */}
      {automaticity > 0.08 ? (
        (() => {
          const pulse = (time * 1.4) % 1;
          return (
            <>
              <circle cx={cx + 66} cy={cy + 60} r={7} fill="#7ee0a6" opacity={0.95} />
              <circle
                cx={cx + 66}
                cy={cy + 60}
                r={7 + pulse * 44}
                fill="none"
                stroke="#7ee0a6"
                strokeWidth={2}
                opacity={automaticity * (1 - pulse)}
              />
              <Label x={cx + 96} y={cy + 96} text="Ectopic focus" anchor="end" opacity={automaticity} tone="#7ee0a6" />
            </>
          );
        })()
      ) : null}

      {/* Fibrillation: the organised circuit breaks into wandering wavelets */}
      {fibrillation > 0.08
        ? Array.from({ length: 16 }, (_, i) => {
            const a = rand(i) * Math.PI * 2 + time * (0.7 + rand(i + 4));
            const rr = 24 + rand(i + 11) * 66;
            const x = cx + Math.cos(a) * rr;
            const y = cy + Math.sin(a) * rr * 0.95;
            const s = 9 + rand(i + 21) * 13;
            return (
              <path
                key={i}
                d={`M${x - s} ${y} A${s} ${s} 0 0 ${i % 2} ${x + s} ${y - s * 0.4}`}
                fill="none"
                stroke={i % 2 ? '#ff9bab' : '#f2b544'}
                strokeWidth={2.2}
                opacity={fibrillation * 0.8}
                strokeLinecap="round"
              />
            );
          })
        : null}

      <Label x={cx} y={cy + 150} text="Ventricle — short axis" anchor="middle" opacity={0.55} />
      <Label
        x={cx}
        y={cy + 168}
        text={
          fibrillation > 0.35
            ? 'Ventricular fibrillation — no output'
            : collapse > 0.35
              ? 'Ventricular tachycardia'
              : automaticity > 0.3
                ? 'Ventricular ectopy'
                : 'Sinus rhythm with scar'
        }
        anchor="middle"
        opacity={0.9}
        tone={fibrillation > 0.35 ? '#ff9bab' : collapse > 0.35 ? C.amber : C.label}
      />

      {/* Instruments */}
      <Trace
        x={430}
        y={48}
        w={338}
        h={150}
        title="Rhythm strip"
        fn={strip}
        tone={mixHex('#3ccfe6', '#ff9bab', Math.max(collapse, fibrillation))}
        gridLines={2}
        caption={
          fibrillation > 0.4
            ? 'Chaotic — defibrillate immediately'
            : collapse > 0.35
              ? channel > 0.5
                ? 'Torsades de pointes'
                : 'Monomorphic VT'
              : automaticity > 0.2
                ? 'Ventricular ectopic beats'
                : 'Baseline rhythm'
        }
        captionTone={collapse > 0.35 || fibrillation > 0.4 ? '#ff9bab' : C.label}
      />

      <Trace
        x={430}
        y={212}
        w={338}
        h={130}
        title="Ventricular action potential"
        fn={actionPotential}
        tone={mixHex('#3ccfe6', '#f2b544', Math.max(triggered, channel))}
        gridLines={1}
        caption={
          triggered > 0.3
            ? 'Early afterdepolarisations'
            : channel > 0.3
              ? 'Prolonged repolarisation'
              : 'Normal repolarisation'
        }
        captionTone={triggered > 0.3 || channel > 0.3 ? C.amber : C.label}
      />

      <Panel x={430} y={356} w={338} h={46}>
        <Label x={446} y={384} text="Cardiac output" opacity={0.65} />
        <Meter x={580} y={376} w={172} value={clamp01(1 - collapse * 0.7 - fibrillation)} tone={collapse > 0.3 ? '#e0455f' : C.cyan} />
      </Panel>

      <Banner x={430} y={412} w={338} text="Cardiac arrest · defibrillation is the treatment" opacity={fibrillation} />
    </>
  );
};

/* ====================================================== CONDUCTION DISORDERS -- */

const ConductionDisorders: Scene = (ctx) => {
  const normal = phase(ctx, 0, 1);
  const degeneration = phase(ctx, 1, 2);
  const ischaemia = phase(ctx, 2, 3);
  const level = phase(ctx, 3, 4);
  const wenckebach = phase(ctx, 4, 5);
  const complete = phase(ctx, 5, 6);
  const haemodynamic = phase(ctx, 6, 7);

  const time = ctx.reduced ? 0.4 : ctx.clock / 1000;

  const sa: Pt = [150, 92];
  const av: Pt = [214, 196];
  const his: Pt = [214, 244];
  const atrialPath: Pt[] = [sa, [176, 128], [200, 166], av];
  const leftBundle: Pt[] = [his, [190, 292], [162, 340], [140, 380]];
  const rightBundle: Pt[] = [his, [244, 292], [272, 340], [292, 380]];

  const infranodal = level > 0.45;
  const escapeRate = complete > 0.3 ? (infranodal ? 32 : 48) : 0;
  const ventricularRate = complete > 0.3 ? escapeRate : wenckebach > 0.3 ? 54 : 72;

  /* Ladder: P waves at a steady atrial rate; conduction either lengthens and
     drops (Wenckebach) or fails entirely, leaving an independent escape. */
  const strip = (u: number): number => {
    const seconds = 5;
    const t = u * seconds;
    let v = 0;
    const pRate = 0.72;
    for (let k = -1; k * pRate < seconds + pRate; k++) v += pWave(t, k * pRate, 0.16);

    if (complete > 0.3) {
      const rr = 60 / escapeRate;
      for (let k = -1; k * rr < seconds + rr; k++) {
        v += qrsWave(t, k * rr + 0.2, 1, infranodal ? 0.17 : 0.075);
        v += tWave(t, k * rr + 0.4, 0.2, 0.24);
      }
    } else if (wenckebach > 0.3) {
      for (let k = -1; k * pRate < seconds + pRate; k++) {
        const cyclePos = ((k % 4) + 4) % 4;
        if (cyclePos === 3) continue; // the dropped beat
        const pr = 0.17 + cyclePos * 0.08;
        v += qrsWave(t, k * pRate + pr, 1, 0.075);
        v += tWave(t, k * pRate + pr + 0.13, 0.2, 0.2);
      }
    } else {
      const pr = 0.17 + degeneration * 0.05 + ischaemia * 0.04;
      for (let k = -1; k * pRate < seconds + pRate; k++) {
        v += qrsWave(t, k * pRate + pr, 1, 0.075);
        v += tWave(t, k * pRate + pr + 0.13, 0.2, 0.2);
      }
    }
    return 0.45 + v * 0.4;
  };

  /* Where has the impulse got to? Above the block it always arrives; below it
     depends on whether this beat conducts. */
  const beat = (time * 1.1) % 1;
  const conducts = complete > 0.3 ? false : wenckebach > 0.3 ? Math.floor(time * 1.1) % 4 !== 3 : true;

  return (
    <>
      <Backdrop />

      {/* Atria and ventricles */}
      <ellipse cx={214} cy={132} rx={112} ry={56} fill="#6f2b3d" opacity={0.86} />
      <path d="M120 250 C112 336 160 402 214 424 C268 402 316 336 308 250 Z" fill="#7d2b3d" opacity={0.9} />

      {/* Conduction system */}
      <path d={atrialPath.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ')} stroke="#f2b544" strokeWidth={5} fill="none" opacity={0.75} strokeLinecap="round" />
      <circle cx={sa[0]} cy={sa[1]} r={10} fill={C.amber} opacity={0.95} />
      <Label x={sa[0] - 56} y={sa[1] - 16} text="SA node" opacity={0.8} tone={C.amber} />
      <circle cx={av[0]} cy={av[1]} r={13} fill={mixHex('#f2b544', '#8a8f9c', Math.max(degeneration, ischaemia) * 0.8)} />
      <Label x={av[0] + 24} y={av[1] - 4} text="AV node" opacity={0.8} />
      <path d={`M${his[0]} ${his[1] - 34} L${his[0]} ${his[1] + 16}`} stroke={infranodal ? '#5c6273' : '#f2b544'} strokeWidth={7} strokeLinecap="round" />
      <Label x={his[0] + 24} y={his[1] + 16} text="His bundle" opacity={0.7} />
      <path d={leftBundle.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ')} stroke={infranodal ? '#5c6273' : '#f2b544'} strokeWidth={4.5} fill="none" strokeLinecap="round" />
      <path d={rightBundle.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ')} stroke={infranodal ? '#5c6273' : '#f2b544'} strokeWidth={4.5} fill="none" strokeLinecap="round" />

      {/* Fibrosis and calcification of the conduction axis */}
      {degeneration > 0.05 ? (
        <Speckle cx={214} cy={252} rx={54} ry={80} count={18} seed={29} tone="#cbd5e4" r={2.2} opacity={degeneration * 0.55} />
      ) : null}
      {ischaemia > 0.08 ? (
        <>
          <path d="M262 176 C300 168 322 190 326 216" stroke={mixHex('#ef5350', '#4c5568', ischaemia)} strokeWidth={6} fill="none" strokeLinecap="round" />
          <Label x={412} y={162} text="AV nodal artery" anchor="end" opacity={ischaemia} tone="#ff9bab" />
        </>
      ) : null}

      {/* The impulse itself */}
      {normal > 0.02 ? (
        (() => {
          const above = along(atrialPath, Math.min(1, beat * 2));
          return <circle cx={above[0]} cy={above[1]} r={6.5} fill={C.amber} opacity={0.95} />;
        })()
      ) : null}
      {conducts && beat > 0.5 ? (
        (() => {
          const u = clamp01((beat - 0.5) * 2);
          const l = along(leftBundle, u);
          const r = along(rightBundle, u);
          return (
            <>
              <circle cx={l[0]} cy={l[1]} r={6} fill={C.amber} opacity={0.9} />
              <circle cx={r[0]} cy={r[1]} r={6} fill={C.amber} opacity={0.9} />
            </>
          );
        })()
      ) : null}
      {!conducts ? (
        <>
          <path d={`M${av[0] - 12} ${av[1] + 22} l24 20 M${av[0] + 12} ${av[1] + 22} l-24 20`} stroke="#ff6b83" strokeWidth={3.4} strokeLinecap="round" />
          <Label x={av[0] + 30} y={av[1] + 48} text={complete > 0.3 ? 'Complete block' : 'Dropped beat'} opacity={0.95} tone="#ff9bab" />
        </>
      ) : null}
      {/* An escape rhythm arising below the block */}
      {complete > 0.2 ? (
        (() => {
          const pulse = (time * (escapeRate / 60)) % 1;
          const origin: Pt = infranodal ? [214, 330] : [214, 262];
          return (
            <>
              <circle cx={origin[0]} cy={origin[1]} r={7} fill="#7ee0a6" opacity={0.9} />
              <circle cx={origin[0]} cy={origin[1]} r={7 + pulse * 40} fill="none" stroke="#7ee0a6" strokeWidth={2} opacity={complete * (1 - pulse)} />
              <Label x={origin[0] + 26} y={origin[1] + 30} text={infranodal ? 'Ventricular escape' : 'Junctional escape'} opacity={complete} tone="#7ee0a6" />
            </>
          );
        })()
      ) : null}

      <Label x={56} y={430} text="Atria and ventricles beat independently" opacity={complete} tone="#ff9bab" />

      {/* Instruments */}
      <Trace
        x={430}
        y={48}
        w={338}
        h={160}
        title="Rhythm strip"
        fn={strip}
        tone={mixHex('#3ccfe6', '#ff9bab', complete)}
        gridLines={2}
        caption={
          complete > 0.3
            ? infranodal
              ? 'AV dissociation · wide escape 20–40/min'
              : 'AV dissociation · narrow escape 40–60/min'
            : wenckebach > 0.3
              ? 'Mobitz I — PR lengthens, then a beat drops'
              : 'Sinus rhythm, 1:1 conduction'
        }
        captionTone={complete > 0.3 ? '#ff9bab' : wenckebach > 0.3 ? C.amber : C.label}
      />

      <RowsPanel
        x={430}
        y={222}
        w={338}
        title="Site and cause"
        rows={[
          { label: 'Fibrosis · calcification', on: degeneration },
          { label: 'Ischaemic injury', on: ischaemia },
          { label: infranodal ? 'Infranodal block' : 'Nodal block', on: level },
        ]}
      />

      <Panel x={430} y={356} w={338} h={46}>
        <Numeral x={446} y={388} text={`${ventricularRate} bpm`} size={20} tone={ventricularRate < 45 ? '#ff8fa3' : C.cyan} />
        <Meter x={600} y={378} w={152} value={clamp01(1 - haemodynamic * 0.7)} tone={haemodynamic > 0.35 ? '#e0455f' : C.cyan} />
      </Panel>

      <Banner x={430} y={414} w={338} text="Syncope · pacing is the definitive treatment" opacity={haemodynamic} />
    </>
  );
};

/* ------------------------------------------------------------- Registry -- */

export type ElectricalSceneId =
  | 'supraventricular-tachycardia'
  | 'ventricular-arrhythmias'
  | 'conduction-disorders';

export const ELECTRICAL_SCENES: Record<ElectricalSceneId, Scene> = {
  'supraventricular-tachycardia': SupraventricularTachycardia,
  'ventricular-arrhythmias': VentricularArrhythmias,
  'conduction-disorders': ConductionDisorders,
};
