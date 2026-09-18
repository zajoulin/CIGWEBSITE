/* ==========================================================================
   CIG — ECG waveform engine
   --------------------------------------------------------------------------
   Synthesises a continuous electrocardiographic signal from the parameters
   held in content/ecg/*.json. Nothing here knows the name of a rhythm: it is
   given amplitudes, intervals and conduction rules, and it returns millivolts
   at a point in time — which is what lets twenty clinically different traces
   come out of one generator and one JSON schema.

   Design notes
   ------------
   • Deterministic. Every "random" element comes from a seeded hash of the
     beat index, so scrubbing backwards reproduces exactly the same trace.
   • Time is absolute seconds from the start of the recording. The monitor
     scrolls by asking for a window; the strip asks for one beat.
   • Beats are scheduled once and cached, then sampled. Two scheduling modes
     cover every rhythm: atrium-driven (sinus and the AV blocks, where the
     P wave decides when the QRS happens) and ventricle-driven (everything
     else, where the atria are independent or absent).
   • Amplitudes are millivolts and intervals are seconds throughout, so the
     result can be measured against the standard 25 mm/s, 10 mm/mV grid the
     monitor draws.
   ========================================================================== */

import type { EcgFeatureId, EcgWaveform } from '../types';

/* ------------------------------------------------------------- Utilities -- */

/** Deterministic pseudo-random in [0,1) from an integer seed. */
const hash = (n: number): number => {
  let x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  x -= Math.floor(x);
  return x;
};

/** Unit gaussian bump centred on `mu` with standard deviation `sigma`. */
const gauss = (u: number, mu: number, sigma: number): number => {
  const d = (u - mu) / sigma;
  return Math.exp(-0.5 * d * d);
};

/** Triangular pulse over 0..1, peaking at 0.5. */
const tri = (u: number): number => Math.max(0, 1 - Math.abs(2 * u - 1));

const clamp01 = (u: number): number => (u < 0 ? 0 : u > 1 ? 1 : u);

/* ------------------------------------------------------------------ Beat -- */

/** One scheduled cardiac cycle, with every landmark resolved to absolute time. */
export interface Beat {
  index: number;
  /** Absolute time of P wave onset; null when there is no organised P wave. */
  pOnset: number | null;
  /** Absolute time of QRS onset; null for a non-conducted (dropped) beat. */
  qrsOnset: number | null;
  /** PR interval used for this beat — varies in Wenckebach. */
  pr: number;
  /** Interval to the next ventricular beat. */
  rr: number;
  /** False when an atrial impulse failed to reach the ventricles. */
  conducted: boolean;
}

export interface FeatureWindow {
  start: number;
  end: number;
}

/* ------------------------------------------------------ Morphology parts -- */

/** P wave contribution, in mV. */
const pWave = (t: number, onset: number, duration: number, amplitude: number): number => {
  if (amplitude === 0) return 0;
  const u = (t - onset) / duration;
  if (u < -0.1 || u > 1.1) return 0;
  return amplitude * gauss(clamp01(u), 0.5, 0.19);
};

/**
 * QRS contribution, in mV. The complex is built from three gaussians — Q, R
 * and S — positioned across the QRS duration, so widening the duration widens
 * the whole complex the way slow conduction does in reality.
 */
const qrsComplex = (t: number, onset: number, w: EcgWaveform): number => {
  const dur = w.qrsDuration;
  const u = (t - onset) / dur;
  if (u < -0.15 || u > 1.25) return 0;

  const q = w.qAmplitude ?? 0;
  const s = w.sAmplitude ?? 0.2;
  const r = w.qrsAmplitude;

  switch (w.qrsShape) {
    case 'monomorphic':
      // Ventricular origin: one broad, slurred deflection with a deep trailing
      // limb and no discrete Q — the impulse never enters the Purkinje system.
      return r * gauss(u, 0.42, 0.2) - s * gauss(u, 0.85, 0.19);
    case 'wide':
      // Conduction-system disease: recognisable Q-R-S, all of it drawn out.
      return (
        -q * gauss(u, 0.12, 0.075) +
        r * gauss(u, 0.42, 0.15) -
        s * gauss(u, 0.78, 0.14)
      );
    case 'chaotic':
      return 0; // Ventricular fibrillation is generated separately.
    case 'narrow':
    default:
      return (
        -q * gauss(u, 0.15, 0.055) +
        r * gauss(u, 0.4, 0.085) -
        s * gauss(u, 0.7, 0.075)
      );
  }
};

/** The shape of the ST segment between the J point and the T wave. */
const stProfile = (u: number, shape: EcgWaveform['stShape']): number => {
  const x = clamp01(u);
  switch (shape) {
    case 'convex':
      // Arches upward away from the baseline — the STEMI "tombstone".
      return 1 + 0.3 * Math.sin(Math.PI * x);
    case 'concave':
      // Saddle: dips after the J point before climbing into the T wave.
      return 0.62 + 0.38 * Math.pow(x, 1.6);
    case 'downsloping':
      return 0.55 + 0.75 * x;
    case 'upsloping':
      return 1.15 - 0.65 * x;
    case 'flat':
    default:
      return 1;
  }
};

/** T wave contribution, in mV. */
const tWave = (t: number, onset: number, duration: number, w: EcgWaveform): number => {
  const u = (t - onset) / duration;
  if (u < -0.05 || u > 1.05) return 0;
  const x = clamp01(u);
  const a = w.tAmplitude;

  switch (w.tShape) {
    case 'peaked':
      // Hyperkalaemia: narrow base, tall, symmetrically pointed apex.
      return a * Math.pow(tri(x), 0.7);
    case 'flattened':
      return a * Math.sin(Math.PI * x);
    case 'broad':
      // Hyperacute: broad, tall and more symmetrical than normal.
      return a * Math.pow(Math.sin(Math.PI * x), 0.8);
    case 'inverted':
    case 'normal':
    default:
      // Normal repolarisation is asymmetrical: slow up, faster down.
      return a * Math.sin(Math.PI * Math.pow(x, 1.28));
  }
};

/* ------------------------------------------------------------ The signal -- */

const DEFAULT_P_DURATION = 0.1;
const U_GAP = 0.04;
/** Seconds of signal generated before t = 0, so the first frame is already full. */
const PRE_ROLL = 14;
const U_DURATION = 0.16;

/** T wave duration derived from the QT interval and the QRS width. */
const tDurationOf = (w: EcgWaveform): number =>
  Math.max(0.1, Math.min(0.24, (w.qtInterval - w.qrsDuration) * 0.55));

export class EcgSignal {
  readonly waveform: EcgWaveform;
  private beats: Beat[] = [];
  /** Absolute time up to which beats have been scheduled. */
  private scheduledTo = 0;
  private nextIndex = 0;

  constructor(waveform: EcgWaveform) {
    this.waveform = waveform;
    // Scheduling starts before zero so that the monitor's display window is
    // full of signal from the very first frame, exactly as a monitor that has
    // been running at the bedside for a while would be.
    this.scheduledTo = -PRE_ROLL;
    this.extend(12);
  }

  /* ---------------------------------------------------------- scheduling -- */

  private get atrialDriven(): boolean {
    const w = this.waveform;
    return w.atrial === 'sinus' && w.prInterval > 0;
  }

  /** Cycle length for ventricular beat `i`, including all variability. */
  private cycleLength(i: number, base: number): number {
    const w = this.waveform;
    let rr = base;
    if (w.irregularity > 0) {
      rr *= 1 + w.irregularity * (hash(i * 3.7) - 0.5) * 0.95;
    }
    if (w.sinusArrhythmia) {
      // Respiratory variation: a slow sinusoidal modulation of cycle length.
      rr *= 1 + w.sinusArrhythmia * 0.14 * Math.sin(i * 0.55);
    }
    return Math.max(0.16, rr);
  }

  /** Schedules beats forward until `until` seconds are covered. */
  private extend(until: number): void {
    const w = this.waveform;
    if (this.scheduledTo >= until) return;

    if (this.atrialDriven) {
      const atrialRate = w.atrialRate ?? w.rate;
      const baseAtrial = 60 / atrialRate;
      let t = this.scheduledTo;
      while (t < until) {
        const i = this.nextIndex++;
        // Wenckebach: the PR interval grows across the group until a beat is
        // blocked. Mobitz II: a constant PR interval and the same drop rule.
        const cycleStep = w.dropEvery ? i % w.dropEvery : 0;
        const dropped = w.dropEvery ? cycleStep === w.dropEvery - 1 : false;
        const pr = w.prInterval + (w.prIncrement ?? 0) * cycleStep;
        const pOnset = t;
        const beat: Beat = {
          index: i,
          pOnset,
          qrsOnset: dropped ? null : pOnset + pr,
          pr,
          rr: baseAtrial,
          conducted: !dropped,
        };
        this.beats.push(beat);
        // The P–P interval belongs to the sinus node, so variability is applied
        // here and the ventricles inherit it through conduction.
        t += this.cycleLength(i, baseAtrial);
        beat.rr = t - pOnset;
      }
      this.scheduledTo = t;
      return;
    }

    // Ventricle-driven: the ventricles keep their own time.
    const base = 60 / w.rate;
    let t = this.scheduledTo;
    while (t < until) {
      const i = this.nextIndex++;
      const rr = this.cycleLength(i, base);
      this.beats.push({
        index: i,
        pOnset: null,
        qrsOnset: t,
        pr: 0,
        rr,
        conducted: true,
      });
      t += rr;
    }
    this.scheduledTo = t;
  }

  /** Reference time of a beat: its QRS onset, or its P wave if it was blocked. */
  private static refOf(b: Beat): number {
    return b.qrsOnset ?? b.pOnset ?? 0;
  }

  /**
   * Index of the first beat whose reference time is at or after `t`.
   * Beats are appended in time order, so a binary search is valid — and it is
   * what keeps per-sample cost logarithmic while the monitor scrolls.
   */
  private lowerBound(t: number): number {
    let lo = 0;
    let hi = this.beats.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (EcgSignal.refOf(this.beats[mid]) < t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /** Every beat whose complex could fall inside [t0, t1]. */
  beatsBetween(t0: number, t1: number): Beat[] {
    this.extend(t1 + 4);
    const pad = 1.4;
    const out: Beat[] = [];
    for (let i = this.lowerBound(t0 - pad); i < this.beats.length; i++) {
      const b = this.beats[i];
      if (EcgSignal.refOf(b) > t1 + pad) break;
      out.push(b);
    }
    return out;
  }

  /**
   * Beats near `t`, reusing one scratch array so that per-pixel calls during
   * rendering allocate nothing.
   */
  private scratch: Beat[] = [];
  beatsNear(t: number, before: number, after: number): Beat[] {
    this.extend(t + 4);
    const out = this.scratch;
    out.length = 0;
    for (let i = Math.max(0, this.lowerBound(t - before)); i < this.beats.length; i++) {
      const b = this.beats[i];
      if (EcgSignal.refOf(b) > t + after) break;
      out.push(b);
    }
    return out;
  }

  /** The most recent beat at or before time `t` that produced a QRS. */
  beatAt(t: number): Beat | null {
    this.extend(t + 4);
    let found: Beat | null = null;
    for (let i = Math.max(0, this.lowerBound(t - 4)); i < this.beats.length; i++) {
      const b = this.beats[i];
      if (b.qrsOnset !== null && b.qrsOnset <= t + 0.0001) found = b;
      else if ((b.qrsOnset ?? Infinity) > t) break;
    }
    return found;
  }

  /** The first fully-formed beat at or after `t`, for the teaching strip. */
  beatFrom(t: number): Beat | null {
    this.extend(t + 6);
    for (let i = Math.max(0, this.lowerBound(t) - 2); i < this.beats.length; i++) {
      const b = this.beats[i];
      if (b.qrsOnset !== null && b.qrsOnset >= t) return b;
    }
    return null;
  }

  /* -------------------------------------------------------------- windows -- */

  /** Absolute time window of one feature of one beat, for highlighting. */
  window(beat: Beat, feature: EcgFeatureId): FeatureWindow | null {
    const w = this.waveform;
    const pDur = w.pDuration ?? DEFAULT_P_DURATION;
    const qrsOnset = beat.qrsOnset;
    const qrsEnd = qrsOnset === null ? null : qrsOnset + w.qrsDuration;
    const tDur = tDurationOf(w);
    const tEnd = qrsOnset === null ? null : qrsOnset + w.qtInterval;
    const tOnset = tEnd === null ? null : tEnd - tDur;

    switch (feature) {
      case 'p':
        return beat.pOnset === null ? null : { start: beat.pOnset, end: beat.pOnset + pDur };
      case 'pr':
        return beat.pOnset === null || qrsOnset === null
          ? null
          : { start: beat.pOnset, end: qrsOnset };
      case 'qrs':
        return qrsOnset === null || qrsEnd === null ? null : { start: qrsOnset, end: qrsEnd };
      case 'j':
        return qrsEnd === null ? null : { start: qrsEnd - 0.015, end: qrsEnd + 0.03 };
      case 'st':
        return qrsEnd === null || tOnset === null ? null : { start: qrsEnd, end: tOnset };
      case 't':
        return tOnset === null || tEnd === null ? null : { start: tOnset, end: tEnd };
      case 'u':
        return tEnd === null
          ? null
          : { start: tEnd + U_GAP, end: tEnd + U_GAP + U_DURATION };
      case 'qt':
        return qrsOnset === null || tEnd === null ? null : { start: qrsOnset, end: tEnd };
      case 'rr':
        return qrsOnset === null ? null : { start: qrsOnset, end: qrsOnset + beat.rr };
      case 'baseline':
      default:
        return null;
    }
  }

  /* --------------------------------------------------------------- sample -- */

  /** Ventricular fibrillation: no complexes, just competing wavelets. */
  private chaotic(t: number): number {
    const w = this.waveform;
    const drift = 1 + 0.35 * Math.sin(t * 0.9) + 0.2 * Math.sin(t * 2.3 + 1.1);
    return (
      w.qrsAmplitude *
      0.55 *
      drift *
      (Math.sin(t * 34.5) * 0.55 +
        Math.sin(t * 47.3 + 1.7) * 0.3 +
        Math.sin(t * 21.1 + 0.4) * 0.25 +
        (hash(Math.floor(t * 260)) - 0.5) * 0.35)
    );
  }

  /** Atrial flutter: a continuous sawtooth with no isoelectric baseline. */
  private flutter(t: number): number {
    const w = this.waveform;
    const period = 60 / (w.atrialRate ?? 300);
    const u = (t % period) / period;
    // Slow upstroke, fast downstroke — the classic inverted sawtooth.
    const saw = u < 0.72 ? -1 + (u / 0.72) * 1.6 : 0.6 - ((u - 0.72) / 0.28) * 1.6;
    return w.pAmplitude * saw;
  }

  /** Signal voltage in millivolts at absolute time `t`. */
  valueAt(t: number): number {
    const w = this.waveform;
    let v = 0;

    // Baseline wander and fine noise, present on every real recording.
    if (w.wander) v += w.wander * 0.05 * Math.sin(t * 1.15 + 0.6);
    if (w.noise) {
      const n = Math.floor(t * 420);
      v += w.noise * 0.035 * (hash(n) + hash(n + 1) - 1);
    }

    if (w.qrsShape === 'chaotic') return v + this.chaotic(t);

    // --- atrial activity -------------------------------------------------
    if (w.atrial === 'fibrillatory') {
      const f = w.fibrillatory ?? 0.05;
      v +=
        f *
        (Math.sin(t * 52.7) * 0.5 +
          Math.sin(t * 71.3 + 1.3) * 0.32 +
          (hash(Math.floor(t * 300)) - 0.5) * 0.7);
    } else if (w.atrial === 'flutter') {
      v += this.flutter(t);
    } else if (w.atrial === 'dissociated') {
      // The atria run at their own fixed rate, so the two P waves that can
      // reach this instant are found arithmetically rather than by searching.
      const pDur = w.pDuration ?? DEFAULT_P_DURATION;
      const step = 60 / (w.atrialRate ?? w.rate);
      const k = Math.floor(t / step);
      for (let j = k - 1; j <= k + 1; j++) {
        if (j < 0) continue;
        v += pWave(t, j * step, pDur, w.pAmplitude);
      }
    }

    // --- beats -----------------------------------------------------------
    // Only beats whose complex can reach `t` are evaluated, located by binary
    // search: the monitor samples this function once per pixel, every frame.
    const tDur = tDurationOf(w);
    this.extend(t + 4);
    const reach = Math.max(1.2, w.qtInterval + w.prInterval + 0.4);
    for (let i = Math.max(0, this.lowerBound(t - reach)); i < this.beats.length; i++) {
      const b = this.beats[i];
      if (EcgSignal.refOf(b) > t + 0.35) break;
      if (b.pOnset !== null && w.atrial === 'sinus') {
        v += pWave(t, b.pOnset, w.pDuration ?? DEFAULT_P_DURATION, w.pAmplitude);
      }
      const onset = b.qrsOnset;
      if (onset === null) continue;

      v += qrsComplex(t, onset, w);

      const qrsEnd = onset + w.qrsDuration;
      const tEnd = onset + w.qtInterval;
      const tOnset = tEnd - tDur;

      // Retrograde P: atria activated backwards, landing on the ST segment.
      if (w.atrial === 'retrograde' && w.pAmplitude > 0) {
        v -= pWave(t, qrsEnd + 0.01, 0.07, w.pAmplitude);
      }

      // ST segment, tapering into the first half of the T wave so that a
      // markedly elevated segment merges into the T rather than stepping.
      if (w.stShift !== 0) {
        if (t >= qrsEnd && t < tOnset) {
          v += w.stShift * stProfile((t - qrsEnd) / Math.max(0.02, tOnset - qrsEnd), w.stShape);
        } else if (t >= tOnset && t < tEnd) {
          const decay = 1 - (t - tOnset) / tDur;
          v += w.stShift * stProfile(1, w.stShape) * decay * 0.85;
        }
      }

      if (t >= tOnset - 0.02 && t <= tEnd + 0.02) {
        v += tWave(t, tOnset, tDur, w);
      }

      if (w.uAmplitude && t >= tEnd + U_GAP && t <= tEnd + U_GAP + U_DURATION) {
        v += w.uAmplitude * Math.sin(Math.PI * ((t - tEnd - U_GAP) / U_DURATION));
      }
    }

    return v;
  }

  /** Samples the signal into an array of [t, mV] pairs across a window. */
  sample(t0: number, t1: number, samples: number): Float32Array {
    const out = new Float32Array(samples);
    const dt = (t1 - t0) / (samples - 1);
    for (let i = 0; i < samples; i++) out[i] = this.valueAt(t0 + i * dt);
    return out;
  }

  /** Mean measured ventricular rate across a window, for the monitor readout. */
  measuredRate(t0: number, t1: number): number {
    const beats = this.beatsBetween(t0, t1).filter((b) => b.qrsOnset !== null);
    if (beats.length < 2) return 0;
    const first = beats[0].qrsOnset as number;
    const last = beats[beats.length - 1].qrsOnset as number;
    if (last <= first) return 0;
    return Math.round(((beats.length - 1) / (last - first)) * 60);
  }
}

/* ------------------------------------------------- Companion waveforms -- */

/**
 * Photoplethysmograph (SpO₂) trace: a pulse wave with a dicrotic notch,
 * triggered by each mechanical beat about 180 ms after ventricular
 * depolarisation. Rhythms that generate no output produce a flat trace.
 */
export const plethAt = (signal: EcgSignal, t: number, perfusion = 1): number => {
  if (perfusion <= 0) return 0;
  let v = 0;
  for (const b of signal.beatsNear(t, 1.2, 0.2)) {
    if (b.qrsOnset === null) continue;
    const tau = t - (b.qrsOnset + 0.18);
    if (tau < 0 || tau > 0.85) continue;
    // Short cycles fill less, so the pulse is smaller — pulsus alternans-like
    // beat-to-beat variation falls out of this naturally in atrial fibrillation.
    const fill = Math.min(1, b.rr / 0.85);
    const upstroke = Math.exp(-Math.pow((tau - 0.13) / 0.075, 2));
    const notch = 0.28 * Math.exp(-Math.pow((tau - 0.33) / 0.055, 2));
    const decay = 0.42 * Math.exp(-tau * 4.2) * (tau > 0.12 ? 1 : tau / 0.12);
    v += fill * perfusion * (upstroke + notch + decay);
  }
  return v;
};

/** Respiratory impedance trace: a smooth, slightly asymmetric breathing cycle. */
export const respirationAt = (t: number, rate: number): number => {
  if (rate <= 0) return 0;
  const period = 60 / rate;
  const u = (((t % period) + period) % period) / period;
  // Inspiration is quicker than expiration.
  const x = u < 0.4 ? (u / 0.4) * 0.5 : 0.5 + ((u - 0.4) / 0.6) * 0.5;
  return Math.sin(Math.PI * 2 * x - Math.PI / 2) * 0.5;
};
