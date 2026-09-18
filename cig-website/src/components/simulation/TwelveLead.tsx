/* ==========================================================================
   CIG — The acquired 12-lead ECG
   --------------------------------------------------------------------------
   The tracing the learner obtains after placing the electrodes. Twelve
   simultaneous leads plus a rhythm strip, drawn on calibrated ECG paper.

   Every lead comes from the same synthesised cardiac vector and the same beat
   schedule, projected onto that lead's axis (src/lib/ecg/leads.ts) and then
   adjusted by the case's own per-lead overrides — which is what makes an
   inferior infarct elevate II, III and aVF and depress I and aVL instead of
   producing the same shape everywhere.

   Drawn as SVG rather than canvas: it scales to any screen, reflows to one
   column on a phone without horizontal scrolling, prints, and lets the
   feedback panel shade an exact feature of an exact beat.

   Gain follows the machine convention: if the complexes will not fit at
   10 mm/mV the whole tracing is halved and labelled, exactly as a real
   recorder does.
   ========================================================================== */

import { useMemo } from 'react';
import { EcgSignal } from '../../lib/ecg/engine';
import { LEAD_PROJECTIONS, TWELVE_LEADS, deriveLeadWaveform } from '../../lib/ecg/leads';
import type { EcgFeatureId, EcgRhythm, LeadCode, SimEcgReading } from '../../lib/types';

/** 1 mm of ECG paper, in SVG user units. */
const MM = 7;
/** Seconds shown in each lead panel. */
const PANEL_SECONDS = 2.6;
const PANEL_W = PANEL_SECONDS * 25 * MM;
const PANEL_H = 34 * MM;
const BASELINE = PANEL_H * 0.56;
const MV = 10 * MM;

/** Seconds shown in the rhythm strip below the twelve leads. */
const STRIP_SECONDS = 8;
const STRIP_W = STRIP_SECONDS * 25 * MM;
const STRIP_H = 22 * MM;
const STRIP_BASE = STRIP_H * 0.58;

/** The settled beat the tracing starts from — far enough in to be stable. */
const ANCHOR = 8;

export interface TwelveLeadProps {
  rhythm: EcgRhythm;
  reading: SimEcgReading;
  /** Feature to shade, e.g. the ST segment. Defaults to the reading's own. */
  highlight?: EcgFeatureId | null;
  /** Leads to emphasise. Defaults to the reading's key leads. */
  emphasis?: LeadCode[];
  /** Shows the lead's "what it looks at" caption under each panel. */
  showViews?: boolean;
}

interface LeadRender {
  code: LeadCode;
  path: string;
  windows: { start: number; end: number }[];
}

export const TwelveLead = ({
  rhythm,
  reading,
  highlight,
  emphasis,
  showViews = false,
}: TwelveLeadProps) => {
  const feature = highlight === undefined ? reading.highlight : highlight;
  const keyLeads = new Set<LeadCode>(emphasis ?? reading.keyLeads);

  const { leads, strip, gain, t0, t1 } = useMemo(() => {
    const overrides = reading.leadOverrides ?? {};
    const signals = new Map<LeadCode, EcgSignal>();
    for (const code of TWELVE_LEADS) {
      signals.set(code, new EcgSignal(deriveLeadWaveform(rhythm.waveform, code, overrides[code])));
    }

    /* Start a little before a settled beat's P wave so the panel opens on
       baseline rather than mid-complex. */
    const ref = signals.get('II') as EcgSignal;
    const beat = ref.beatFrom(ANCHOR);
    const anchor = beat?.pOnset ?? beat?.qrsOnset ?? ANCHOR;
    const start = anchor - 0.2;
    const end = start + PANEL_SECONDS;

    /* One gain for the whole tracing, as on a real recorder. */
    let peak = 0;
    for (const code of TWELVE_LEADS) {
      const s = signals.get(code) as EcgSignal;
      const data = s.sample(start, end, 260);
      for (let i = 0; i < data.length; i++) {
        const v = Math.abs(data[i]);
        if (v > peak) peak = v;
      }
    }
    const headroom = (PANEL_H - BASELINE) / MV; // millivolts that fit below
    const room = Math.min(BASELINE / MV, headroom) * 0.94;
    const g = peak > room ? 0.5 : 1;

    const samples = 420;
    const rendered: LeadRender[] = TWELVE_LEADS.map((code) => {
      const s = signals.get(code) as EcgSignal;
      const data = s.sample(start, end, samples);
      let d = '';
      for (let i = 0; i < samples; i++) {
        const x = (i / (samples - 1)) * PANEL_W;
        const y = BASELINE - data[i] * MV * g;
        d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      const windows: { start: number; end: number }[] = [];
      if (feature && feature !== 'baseline') {
        for (const b of s.beatsBetween(start, end)) {
          const win = s.window(b, feature);
          if (!win || win.end < start || win.start > end) continue;
          windows.push({
            start: ((win.start - start) / PANEL_SECONDS) * PANEL_W,
            end: ((win.end - start) / PANEL_SECONDS) * PANEL_W,
          });
        }
      }
      return { code, path: d, windows };
    });

    /* The rhythm strip: lead II, eight seconds of it. */
    const rhythmSignal = signals.get('II') as EcgSignal;
    const stripStart = start;
    const stripEnd = start + STRIP_SECONDS;
    const stripSamples = 1100;
    const stripData = rhythmSignal.sample(stripStart, stripEnd, stripSamples);
    let sd = '';
    for (let i = 0; i < stripSamples; i++) {
      const x = (i / (stripSamples - 1)) * STRIP_W;
      const y = STRIP_BASE - stripData[i] * MV * g * 0.8;
      sd += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
    }

    return { leads: rendered, strip: sd, gain: g, t0: start, t1: end };
  }, [rhythm, reading, feature]);

  return (
    <figure className="twelve">
      {/* One shared grid pattern, defined once for every panel below. */}
      <svg width="0" height="0" aria-hidden="true" focusable="false" className="twelve-defs">
        <defs>
          <pattern id="twelve-mm" width={MM} height={MM} patternUnits="userSpaceOnUse">
            <path d={`M ${MM} 0 L 0 0 0 ${MM}`} fill="none" stroke="var(--ecg-grid-fine)" strokeWidth="0.6" />
          </pattern>
          <pattern id="twelve-cm" width={MM * 5} height={MM * 5} patternUnits="userSpaceOnUse">
            <rect width={MM * 5} height={MM * 5} fill="url(#twelve-mm)" />
            <path
              d={`M ${MM * 5} 0 L 0 0 0 ${MM * 5}`}
              fill="none"
              stroke="var(--ecg-grid-bold)"
              strokeWidth="1.2"
            />
          </pattern>
        </defs>
      </svg>

      <figcaption className="twelve-head">
        <span className="mono">
          25 mm/s · {gain === 1 ? '10 mm/mV' : '5 mm/mV (×½)'} · 0.5–40 Hz
        </span>
        <span className="twelve-head-note">
          Simultaneously recorded leads, generated by CIG&rsquo;s teaching simulation from this
          case&rsquo;s parameters. {(t1 - t0).toFixed(1)} s per panel.
        </span>
      </figcaption>

      <div className="twelve-grid">
        {leads.map((l) => {
          const projection = LEAD_PROJECTIONS[l.code];
          return (
            <div
              key={l.code}
              className={'twelve-lead' + (keyLeads.has(l.code) ? ' is-key' : '')}
            >
              <svg
                viewBox={`0 0 ${PANEL_W} ${PANEL_H}`}
                role="img"
                aria-label={`Lead ${l.code}. ${projection.views}.`}
              >
                <rect width={PANEL_W} height={PANEL_H} fill="var(--ecg-paper)" />
                <rect width={PANEL_W} height={PANEL_H} fill="url(#twelve-cm)" />
                {l.windows.map((w, i) => (
                  <rect
                    key={i}
                    x={w.start}
                    y={2}
                    width={Math.max(2, w.end - w.start)}
                    height={PANEL_H - 4}
                    className="twelve-window"
                  />
                ))}
                {/* calibration pulse */}
                <path
                  d={`M 3 ${BASELINE} L 3 ${BASELINE - MV * gain} L ${3 + MM * 5} ${BASELINE - MV * gain} L ${3 + MM * 5} ${BASELINE}`}
                  className="twelve-cal"
                />
                <path d={l.path} className="twelve-trace" />
              </svg>
              <span className="twelve-code">{l.code}</span>
              {keyLeads.has(l.code) ? <span className="twelve-flag">key lead</span> : null}
              {showViews ? <span className="twelve-views">{projection.views}</span> : null}
            </div>
          );
        })}
      </div>

      <div className="twelve-strip">
        <svg
          viewBox={`0 0 ${STRIP_W} ${STRIP_H}`}
          role="img"
          aria-label={`Rhythm strip, lead II, ${STRIP_SECONDS} seconds.`}
        >
          <rect width={STRIP_W} height={STRIP_H} fill="var(--ecg-paper)" />
          <rect width={STRIP_W} height={STRIP_H} fill="url(#twelve-cm)" />
          <path d={strip} className="twelve-trace" />
        </svg>
        <span className="twelve-code">II · rhythm strip · {STRIP_SECONDS} s</span>
      </div>

    </figure>
  );
};
