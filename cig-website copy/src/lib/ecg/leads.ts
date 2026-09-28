/* ==========================================================================
   CIG — Displayed leads
   --------------------------------------------------------------------------
   The engine synthesises one cardiac vector. A surface lead records the
   projection of that vector onto its own axis, which is why the same beat
   looks different in different leads: lead II looks along the axis of normal
   depolarisation and sees tall positive complexes, while V1 sits over the
   right ventricle and septum and sees a small R with a deep S.

   These are documented teaching approximations — per-component projection
   factors, not a solved forward model of the torso — and the interface says
   so wherever a derived lead is displayed.

   Two layers, deliberately separated:

     1. the projection below, which is a property of where the electrode is
        and is therefore the same for every case; and
     2. a per-case `LeadOverride`, which is a property of *this* patient — an
        inferior infarct elevates II, III and aVF and depresses I and aVL,
        while an anterior one does the opposite, and no fixed projection can
        know which. The clinical simulation supplies that from its case file,
        so the twelve-lead tracing matches the case rather than being
        generically shaped.
   ========================================================================== */

import type { EcgWaveform, LeadCode, LeadOverride } from '../types';

export type DisplayLead = LeadCode;

export interface LeadProjection {
  id: DisplayLead;
  label: string;
  /** What the lead looks at, shown in the monitor's lead label tooltip. */
  views: string;
  /** The wall this lead faces, for grouping a twelve-lead layout. */
  territory: 'inferior' | 'lateral' | 'septal' | 'anterior' | 'cavity';
  p: number;
  qrs: number;
  s: number;
  q: number;
  t: number;
  st: number;
}

/**
 * The twelve conventional leads in the order a printed ECG lays them out,
 * column by column: I/II/III, aVR/aVL/aVF, V1–V3, V4–V6.
 */
export const TWELVE_LEADS: DisplayLead[] = [
  'I',
  'II',
  'III',
  'aVR',
  'aVL',
  'aVF',
  'V1',
  'V2',
  'V3',
  'V4',
  'V5',
  'V6',
];

export const LEAD_PROJECTIONS: Record<DisplayLead, LeadProjection> = {
  I: {
    id: 'I',
    label: 'I',
    views: 'High lateral wall — left arm against right arm, the horizontal axis of the frontal plane',
    territory: 'lateral',
    p: 0.7,
    qrs: 0.62,
    s: 0.5,
    q: 0.9,
    t: 0.7,
    st: 0.6,
  },
  II: {
    id: 'II',
    label: 'II',
    views: 'Inferior wall — the standard rhythm-monitoring lead, with the largest P wave',
    territory: 'inferior',
    p: 1,
    qrs: 1,
    s: 1,
    q: 1,
    t: 1,
    st: 1,
  },
  III: {
    id: 'III',
    label: 'III',
    views: 'Inferior wall — the most rightward of the inferior leads, and the most variable',
    territory: 'inferior',
    p: 0.52,
    qrs: 0.74,
    s: 0.9,
    q: 1.1,
    t: 0.62,
    st: 0.95,
  },
  aVR: {
    id: 'aVR',
    label: 'aVR',
    views: 'The cavity of the left ventricle, seen from the right shoulder — everything is inverted',
    territory: 'cavity',
    p: -0.85,
    qrs: -0.62,
    s: -0.7,
    q: -0.6,
    t: -0.75,
    st: -0.8,
  },
  aVL: {
    id: 'aVL',
    label: 'aVL',
    views: 'High lateral wall — the most leftward and superior of the limb leads',
    territory: 'lateral',
    p: 0.34,
    qrs: 0.46,
    s: 0.45,
    q: 0.85,
    t: 0.44,
    st: 0.5,
  },
  aVF: {
    id: 'aVF',
    label: 'aVF',
    views: 'Inferior wall — looks straight up from the feet, so it reports the inferior surface directly',
    territory: 'inferior',
    p: 0.78,
    qrs: 0.86,
    s: 0.95,
    q: 1.05,
    t: 0.8,
    st: 0.98,
  },
  V1: {
    id: 'V1',
    label: 'V1',
    views: 'Septum and right ventricle — small R, deep S, and the best view of atrial activity',
    territory: 'septal',
    p: 0.72,
    qrs: 0.26,
    s: 1.75,
    q: 0.3,
    t: 0.42,
    st: 1,
  },
  V2: {
    id: 'V2',
    label: 'V2',
    views: 'Septum — the largest precordial voltages, and where anterior ST changes appear first',
    territory: 'septal',
    p: 0.6,
    qrs: 0.42,
    s: 1.85,
    q: 0.3,
    t: 0.75,
    st: 1.25,
  },
  V3: {
    id: 'V3',
    label: 'V3',
    views: 'Anterior wall — the transition zone, where the R wave usually overtakes the S wave',
    territory: 'anterior',
    p: 0.56,
    qrs: 0.78,
    s: 1.25,
    q: 0.5,
    t: 0.9,
    st: 1.25,
  },
  V4: {
    id: 'V4',
    label: 'V4',
    views: 'Anterior wall and the apex — over the left ventricle at the midclavicular line',
    territory: 'anterior',
    p: 0.58,
    qrs: 1.24,
    s: 0.8,
    q: 0.8,
    t: 1,
    st: 1.15,
  },
  V5: {
    id: 'V5',
    label: 'V5',
    views: 'Lateral wall of the left ventricle — the tallest R wave of the precordial leads',
    territory: 'lateral',
    p: 0.62,
    qrs: 1.18,
    s: 0.45,
    q: 1.2,
    t: 0.9,
    st: 0.9,
  },
  V6: {
    id: 'V6',
    label: 'V6',
    views: 'Lateral wall — the most leftward precordial lead, with a small S and a clear septal Q',
    territory: 'lateral',
    p: 0.58,
    qrs: 0.98,
    s: 0.3,
    q: 1.25,
    t: 0.82,
    st: 0.8,
  },
};

/**
 * Projects the synthesised vector onto a displayed lead. Only amplitudes
 * change: intervals, conduction rules and the beat schedule are properties of
 * the heart, not of the electrode, so every lead stays perfectly in step.
 *
 * `override` is the case-specific layer described at the top of this file. It
 * multiplies the projected amplitude, so 1 leaves the lead as the projection
 * made it, 0 flattens that component and a negative value inverts it.
 */
export const deriveLeadWaveform = (
  w: EcgWaveform,
  lead: DisplayLead,
  override?: LeadOverride,
): EcgWaveform => {
  const k = LEAD_PROJECTIONS[lead];
  if (lead === 'II' && !override) return w;

  const f = {
    p: k.p * (override?.p ?? 1),
    qrs: k.qrs * (override?.r ?? 1),
    s: k.s * (override?.s ?? 1),
    q: k.q * (override?.q ?? 1),
    t: k.t * (override?.t ?? 1),
    st: k.st * (override?.st ?? 1),
  };

  return {
    ...w,
    pAmplitude: w.pAmplitude * f.p,
    qrsAmplitude: w.qrsAmplitude * f.qrs,
    sAmplitude: (w.sAmplitude ?? 0.2) * f.s,
    qAmplitude: (w.qAmplitude ?? 0) * f.q,
    tAmplitude: w.tAmplitude * f.t,
    stShift: w.stShift * f.st,
    uAmplitude: w.uAmplitude ? w.uAmplitude * f.t : undefined,
    fibrillatory: w.fibrillatory
      ? w.fibrillatory * (lead === 'V1' || lead === 'V2' ? 1.5 : 0.6)
      : undefined,
  };
};
