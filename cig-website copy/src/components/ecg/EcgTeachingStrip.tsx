/* ==========================================================================
   CIG — Labelled teaching strip
   --------------------------------------------------------------------------
   One beat of the current rhythm, drawn on calibrated ECG paper with the
   waves named and the intervals measured with calipers — the printed strip a
   student would annotate, generated live from the same signal that is
   scrolling across the monitor above it.

   Plain SVG so it scales, prints and stays readable at any size.
   ========================================================================== */

import { useMemo } from 'react';
import { EcgSignal } from '../../lib/ecg/engine';
import type { Beat } from '../../lib/ecg/engine';
import type { EcgFeatureId, EcgRhythm } from '../../lib/types';

/** Geometry, in SVG user units: 1 mm of ECG paper = 8 units. */
const MM = 8;
const SECONDS = 1.6;
const WIDTH = SECONDS * 25 * MM; // 25 mm/s
const TRACE_H = 22 * MM;
const CALIPER_H = 7.5 * MM;
const HEIGHT = TRACE_H + CALIPER_H;
const BASELINE = TRACE_H * 0.62;
const MV = 10 * MM; // 10 mm/mV

interface Caliper {
  feature: EcgFeatureId;
  label: string;
  value: string;
  row: number;
}

export const EcgTeachingStrip = ({
  rhythm,
  signal,
  highlight,
  onPick,
}: {
  rhythm: EcgRhythm;
  signal: EcgSignal;
  highlight: EcgFeatureId | null;
  onPick?: (feature: EcgFeatureId) => void;
}) => {
  const w = rhythm.waveform;

  const { path, beat, t0 } = useMemo(() => {
    // Take a settled beat a few seconds in, and start the strip a little
    // before its P wave so the preceding baseline is visible.
    const b: Beat | null = signal.beatFrom(6.2);
    const anchor = b?.pOnset ?? b?.qrsOnset ?? 6.2;
    const start = anchor - 0.16;
    const samples = 620;
    let d = '';
    for (let i = 0; i <= samples; i++) {
      const t = start + (i / samples) * SECONDS;
      const v = signal.valueAt(t);
      const x = (i / samples) * WIDTH;
      const y = BASELINE - v * MV;
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return { path: d, beat: b, t0: start };
  }, [signal]);

  const xOf = (t: number): number => ((t - t0) / SECONDS) * WIDTH;

  const windows = useMemo(() => {
    if (!beat) return null;
    const get = (f: EcgFeatureId) => signal.window(beat, f);
    return {
      p: get('p'),
      pr: get('pr'),
      qrs: get('qrs'),
      st: get('st'),
      t: get('t'),
      u: get('u'),
      qt: get('qt'),
      rr: get('rr'),
      j: get('j'),
    };
  }, [beat, signal]);

  const calipers: Caliper[] = [];
  if (windows?.pr) {
    calipers.push({ feature: 'pr', label: 'PR', value: `${w.prInterval.toFixed(2)} s`, row: 0 });
  }
  calipers.push({ feature: 'qrs', label: 'QRS', value: `${w.qrsDuration.toFixed(2)} s`, row: windows?.pr ? 1 : 0 });
  calipers.push({ feature: 'qt', label: 'QT', value: `${w.qtInterval.toFixed(2)} s`, row: windows?.pr ? 0 : 1 });

  const labelled: { feature: EcgFeatureId; text: string; at: number | null; above: boolean }[] = [
    { feature: 'p', text: 'P', at: windows?.p ? (windows.p.start + windows.p.end) / 2 : null, above: true },
    { feature: 'qrs', text: 'QRS', at: windows?.qrs ? (windows.qrs.start + windows.qrs.end) / 2 : null, above: true },
    { feature: 'st', text: 'ST', at: windows?.st ? (windows.st.start + windows.st.end) / 2 : null, above: false },
    { feature: 't', text: 'T', at: windows?.t ? (windows.t.start + windows.t.end) / 2 : null, above: true },
  ];
  if (w.uAmplitude && windows?.u) {
    labelled.push({ feature: 'u', text: 'U', at: (windows.u.start + windows.u.end) / 2, above: true });
  }

  const active = highlight ? windows?.[highlight as keyof typeof windows] ?? null : null;

  return (
    <figure className="ecg-strip" style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Labelled ECG strip of ${rhythm.name}: P wave, QRS complex and T wave with PR, QRS and QT intervals measured.`}
      >
        <defs>
          <pattern id="ecg-mm" width={MM} height={MM} patternUnits="userSpaceOnUse">
            <path d={`M ${MM} 0 L 0 0 0 ${MM}`} fill="none" stroke="var(--ecg-grid-fine)" strokeWidth="0.7" />
          </pattern>
          <pattern id="ecg-cm" width={MM * 5} height={MM * 5} patternUnits="userSpaceOnUse">
            <rect width={MM * 5} height={MM * 5} fill="url(#ecg-mm)" />
            <path
              d={`M ${MM * 5} 0 L 0 0 0 ${MM * 5}`}
              fill="none"
              stroke="var(--ecg-grid-bold)"
              strokeWidth="1.4"
            />
          </pattern>
        </defs>

        <rect width={WIDTH} height={HEIGHT} fill="var(--ecg-paper)" />
        <rect width={WIDTH} height={TRACE_H} fill="url(#ecg-cm)" />

        {/* the highlighted feature */}
        {active ? (
          <g>
            <rect
              x={xOf(active.start)}
              y={4}
              width={Math.max(3, xOf(active.end) - xOf(active.start))}
              height={TRACE_H - 8}
              fill="var(--ecg-mark-wash)"
            />
            <line x1={xOf(active.start)} y1={4} x2={xOf(active.start)} y2={TRACE_H - 4} stroke="var(--ecg-mark)" strokeWidth="0.8" />
            <line x1={xOf(active.end)} y1={4} x2={xOf(active.end)} y2={TRACE_H - 4} stroke="var(--ecg-mark)" strokeWidth="0.8" />
          </g>
        ) : null}

        {/* calibration pulse: 1 mV, 5 mm wide */}
        <path
          d={`M 4 ${BASELINE} L 4 ${BASELINE - MV} L ${4 + MM * 5} ${BASELINE - MV} L ${4 + MM * 5} ${BASELINE}`}
          fill="none"
          stroke="var(--ecg-trace)"
          strokeWidth="1"
          opacity="0.55"
        />

        <path d={path} fill="none" stroke="var(--ecg-trace)" strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" />

        {/* wave labels */}
        {labelled.map((l) =>
          l.at === null ? null : (
            <g
              key={l.feature}
              className={'ecg-strip-label' + (highlight === l.feature ? ' is-active' : '')}
              onClick={() => onPick?.(l.feature)}
              role={onPick ? 'button' : undefined}
              tabIndex={onPick ? 0 : undefined}
              aria-label={onPick ? `Highlight the ${l.text} wave` : undefined}
              onKeyDown={(e: { key: string; preventDefault: () => void }) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPick?.(l.feature);
                }
              }}
            >
              {/* As with the calipers below: the leader line is 0.6 units
                  wide because it points at an exact instant on a calibrated
                  tracing, which leaves a finger nothing to aim at. An
                  invisible rectangle around it carries the tap instead. */}
              {onPick ? (
                <rect
                  className="ecg-strip-label-hit"
                  x={xOf(l.at) - 2.2 * MM}
                  y={l.above ? 0.6 * MM : Math.min(BASELINE + 1.2 * MM, TRACE_H - 4.4 * MM)}
                  width={4.4 * MM}
                  height={
                    l.above
                      ? Math.max(5.4 * MM, BASELINE - 1.6 * MM - 0.6 * MM)
                      : Math.max(5.4 * MM, TRACE_H - 2.4 * MM - (BASELINE + 1.2 * MM) + 1.4 * MM)
                  }
                  fill="transparent"
                />
              ) : null}
              <line
                x1={xOf(l.at)}
                y1={l.above ? 2.5 * MM : TRACE_H - 3.6 * MM}
                x2={xOf(l.at)}
                y2={l.above ? BASELINE - 1.6 * MM : BASELINE + 1.2 * MM}
                stroke="var(--ecg-ink-soft)"
                strokeWidth="0.6"
                strokeDasharray="2.5 2.5"
              />
              <text
                x={xOf(l.at)}
                y={l.above ? 1.8 * MM : TRACE_H - 2.4 * MM}
                textAnchor="middle"
                className="ecg-strip-text"
              >
                {l.text}
              </text>
            </g>
          ),
        )}

        {/* interval calipers */}
        <g>
          {calipers.map((c) => {
            const win = windows?.[c.feature as keyof typeof windows];
            if (!win) return null;
            const y = TRACE_H + 2.6 * MM + c.row * 3.4 * MM;
            const x1 = xOf(win.start);
            const x2 = xOf(win.end);
            const on = highlight === c.feature;
            return (
              <g
                key={c.feature}
                className={'ecg-caliper' + (on ? ' is-active' : '')}
                onClick={() => onPick?.(c.feature)}
                role={onPick ? 'button' : undefined}
                tabIndex={onPick ? 0 : undefined}
                aria-label={onPick ? `Highlight the ${c.label} interval` : undefined}
                onKeyDown={(e: { key: string; preventDefault: () => void }) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPick?.(c.feature);
                  }
                }}
              >
                {/* A caliper is drawn at exact positions on a calibrated
                    tracing, so it cannot be made thicker without lying about
                    the measurement. This invisible rectangle gives it a
                    comfortable tap target instead, on a phone as much as with
                    a mouse, without moving a single mark. */}
                {onPick ? (
                  <rect
                    className="ecg-caliper-hit"
                    x={Math.min(x1, x2) - 1.2 * MM}
                    y={y - 3.2 * MM}
                    width={Math.abs(x2 - x1) + 2.4 * MM}
                    height={5.4 * MM}
                    fill="transparent"
                  />
                ) : null}
                <line x1={x1} y1={y - 1.1 * MM} x2={x1} y2={y + 1.1 * MM} strokeWidth="0.9" />
                <line x1={x2} y1={y - 1.1 * MM} x2={x2} y2={y + 1.1 * MM} strokeWidth="0.9" />
                <line x1={x1} y1={y} x2={x2} y2={y} strokeWidth="0.9" />
                <text x={(x1 + x2) / 2} y={y - 1.7 * MM} textAnchor="middle" className="ecg-strip-text">
                  {c.label} {c.value}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <figcaption className="ecg-strip-caption">
        <span className="mono">25 mm/s · 10 mm/mV</span>
        <span>
          One small square = 0.04 s and 0.1 mV · one large square = 0.20 s and 0.5 mV. Generated
          from the same signal as the monitor.
        </span>
      </figcaption>
    </figure>
  );
};
