/* ==========================================================================
   CIG — ECG trace generator for the pathophysiology animations
   --------------------------------------------------------------------------
   Produces an SVG path for a rhythm strip whose morphology can be morphed
   continuously: P-wave amplitude, ST elevation and R–R irregularity are all
   parameters, so a strip can transition from sinus rhythm to ST-elevation
   infarction or to atrial fibrillation as the animation advances.
   ========================================================================== */

import { rand } from './sceneUtils';

export interface EcgOptions {
  /** Strip geometry in SVG units. */
  x0: number;
  x1: number;
  yBase: number;
  amplitude: number;
  /** Seconds of signal shown across the strip. */
  seconds?: number;
  /** 0 = no P wave (as in atrial fibrillation), 1 = normal. */
  pWave?: number;
  /** 0 = isoelectric ST segment, 1 = marked elevation. */
  stElevation?: number;
  /** 0 = regular, 1 = markedly irregular R–R intervals. */
  irregularity?: number;
  /** Fine fibrillatory baseline undulation, 0–1. */
  fibrillation?: number;
  /** Beats per minute. */
  rate?: number;
  /** Scroll offset in seconds, for a live-looking trace. */
  offset?: number;
}

/** The PQRST complex as a function of time since the start of the beat. */
const beatValue = (
  tau: number,
  rr: number,
  pWave: number,
  stElevation: number,
): number => {
  let v = 0;

  // P wave
  if (pWave > 0 && tau > 0.02 && tau < 0.13) {
    v += pWave * 0.16 * Math.sin(((tau - 0.02) / 0.11) * Math.PI);
  }

  // QRS complex
  if (tau >= 0.17 && tau < 0.20) v -= 0.09 * ((tau - 0.17) / 0.03); // Q
  else if (tau >= 0.20 && tau < 0.235) v += 1.0 * ((tau - 0.20) / 0.035); // R upstroke
  else if (tau >= 0.235 && tau < 0.275) v += 1.0 * (1 - (tau - 0.235) / 0.04); // R downstroke
  else if (tau >= 0.275 && tau < 0.305) v -= 0.22 * (1 - Math.abs((tau - 0.29) / 0.015)); // S

  // ST segment and T wave
  const stStart = 0.305;
  const tStart = stStart + 0.08;
  const tEnd = Math.min(rr - 0.06, tStart + 0.20);
  if (tau >= stStart && tau < tStart) {
    v += stElevation * 0.30;
  } else if (tau >= tStart && tau < tEnd) {
    const p = (tau - tStart) / Math.max(0.05, tEnd - tStart);
    v += (0.20 + stElevation * 0.22) * Math.sin(p * Math.PI) + stElevation * 0.18 * (1 - p);
  }

  return v;
};

export const ecgPath = (options: EcgOptions): string => {
  const {
    x0,
    x1,
    yBase,
    amplitude,
    seconds = 4,
    pWave = 1,
    stElevation = 0,
    irregularity = 0,
    fibrillation = 0,
    rate = 72,
    offset = 0,
  } = options;

  const width = x1 - x0;
  const samples = Math.max(160, Math.round(width));
  const baseRr = 60 / rate;

  // Precompute beat start times across a window wide enough to scroll through.
  const beats: { start: number; rr: number }[] = [];
  let t = -baseRr * 2;
  let i = 0;
  while (t < seconds + baseRr * 3) {
    const jitter = irregularity * (rand(i * 7.3) - 0.5) * 0.9;
    const rr = Math.max(0.36, baseRr * (1 + jitter));
    beats.push({ start: t, rr });
    t += rr;
    i++;
  }

  let d = '';
  for (let s = 0; s <= samples; s++) {
    const frac = s / samples;
    const time = frac * seconds + offset;
    let v = 0;

    for (const b of beats) {
      const tau = time - b.start;
      if (tau >= 0 && tau < b.rr) {
        v += beatValue(tau, b.rr, pWave, stElevation);
        break;
      }
    }

    if (fibrillation > 0) {
      v +=
        fibrillation *
        0.05 *
        (Math.sin(time * 47) * 0.6 + Math.sin(time * 83 + 1.2) * 0.4 + (rand(s) - 0.5) * 0.5);
    }

    const x = x0 + frac * width;
    const y = yBase - v * amplitude;
    d += (s === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
  }
  return d;
};
