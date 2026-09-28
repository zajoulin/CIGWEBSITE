/* ==========================================================================
   CIG — ECG learning workspace
   --------------------------------------------------------------------------
   The bedside monitor, its transport controls, the rhythm library and the
   analysis panel. Every word of clinical content comes from
   content/ecg/*.json — this component decides only where things go and what
   the learner can do to them.

   Transport: play, pause, restart, scrub, step one frame (0.04 s — one small
   square) or one beat at a time, and change speed. Highlighting either
   follows the narration automatically or is driven by the learner picking a
   feature; either way the shaded band is computed from the beat the engine
   scheduled, so it lands exactly on the P wave, ST segment or QT interval it
   claims to.
   ========================================================================== */

import { useState } from 'react';
import { Icon } from '../icons/Icon';
import { Chip, References } from '../ui/primitives';
import { BedsideMonitor, FULL_CHANNELS } from './BedsideMonitor';
import { EcgTeachingStrip } from './EcgTeachingStrip';
import { RhythmQuiz } from './RhythmQuiz';
import { RECORDING, SPEEDS, type EcgSession } from './useEcgSession';
import {
  diseaseById,
  ecgCategories,
  ecgRhythms,
  keyPointById,
  resolveReferences,
  structureById,
} from '../../lib/content';
import { A } from '../../lib/router';
import type { EcgFeatureId } from '../../lib/types';

const featureLabel: Record<EcgFeatureId, string> = {
  p: 'P wave',
  pr: 'PR interval',
  qrs: 'QRS complex',
  j: 'J point',
  st: 'ST segment',
  t: 'T wave',
  u: 'U wave',
  qt: 'QT interval',
  rr: 'R–R interval',
  baseline: 'Baseline',
};

/** mm:ss.t — tenths matter here, because a frame step is 0.04 s. */
const mmss = (t: number): string => {
  const m = Math.floor(t / 60);
  const sec = t - m * 60;
  return `${String(m).padStart(2, '0')}:${sec.toFixed(1).padStart(4, '0')}`;
};

export const EcgWorkspace = ({
  session,
  onRhythmChange,
}: {
  session: EcgSession;
  /** Lets the page keep the address bar in step with the learner's choice. */
  onRhythmChange?: (id: string) => void;
}) => {
  const {
    rhythm,
    selectRhythm,
    signals,
    leadII,
    clockRef,
    displayTime,
    playing,
    setPlaying,
    speed,
    setSpeed,
    setClock,
    stepFrames,
    stepBeat,
    restart,
    soundEnabled,
    toggleSound,
    tone,
    onQrs,
    narrationIndex,
    autoFeature,
  } = session;

  const [manualFeature, setManualFeature] = useState<EcgFeatureId | null>(null);
  const feature = manualFeature ?? autoFeature;
  const activeHighlight = rhythm.highlights.find((h) => h.feature === feature) ?? null;
  const step = rhythm.narration[narrationIndex] ?? rhythm.narration[0];
  const refs = resolveReferences(rhythm.references);

  const pickRhythm = (id: string) => {
    if (onRhythmChange) onRhythmChange(id);
    else selectRhythm(id);
    setManualFeature(null);
  };

  return (
    <>
      <div className="ecg-shell">
      {/* ---------------------------------------------------- rhythm rail -- */}
      <aside className="ecg-rail" aria-label="ECG rhythm library">
        <div className="ecg-rail-head">
          <h2>Rhythm library</h2>
          <p>{ecgRhythms.length} rhythms and patterns</p>
        </div>
        <div className="ecg-rail-scroll">
          {ecgCategories.map((cat) => {
            const items = ecgRhythms.filter((r) => r.categoryId === cat.id);
            if (!items.length) return null;
            return (
              <section key={cat.id} className="ecg-rail-group">
                <h3 className={'ecg-rail-cat ecg-accent-' + cat.accent}>{cat.label}</h3>
                {items.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={'ecg-rail-item' + (r.id === rhythm.id ? ' active' : '')}
                    aria-current={r.id === rhythm.id ? 'true' : undefined}
                    onClick={() => pickRhythm(r.id)}
                  >
                    <span className={'ecg-rail-dot ecg-accent-' + cat.accent} aria-hidden="true" />
                    <span className="ecg-rail-body">
                      <span className="ecg-rail-name">{r.name}</span>
                      <span className="ecg-rail-meta">{r.rateRange}</span>
                    </span>
                  </button>
                ))}
              </section>
            );
          })}
        </div>
      </aside>

      {/* ------------------------------------------------------- the stage -- */}
      <div className="ecg-stage-col">
        <BedsideMonitor
          rhythm={rhythm}
          signals={signals}
          clockRef={clockRef}
          playing={playing}
          channels={FULL_CHANNELS}
          highlight={feature}
          highlightLabel={activeHighlight?.label}
          onQrs={onQrs}
          tone={tone}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          bed="BED 4"
        />

        <div className="ecg-controls" role="group" aria-label="Playback controls">
          <button
            type="button"
            className="ctrl-btn ctrl-btn-primary"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause the trace' : 'Play the trace'}
          >
            <Icon name={playing ? 'pause' : 'play'} size={13} />
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            className="ctrl-btn"
            onClick={restart}
            aria-label="Restart from the beginning"
            title="Restart"
          >
            <Icon name="restart" size={13} />
          </button>
          <button
            type="button"
            className="ctrl-btn"
            onClick={() => stepBeat(-1)}
            aria-label="Previous beat"
            title="Previous beat"
          >
            <Icon name="skip-back" size={13} />
          </button>
          <button
            type="button"
            className="ctrl-btn ctrl-btn-frame"
            onClick={() => stepFrames(-1)}
            aria-label="Step back one frame, 0.04 seconds"
            title="Step back one small square (0.04 s)"
          >
            −1f
          </button>
          <button
            type="button"
            className="ctrl-btn ctrl-btn-frame"
            onClick={() => stepFrames(1)}
            aria-label="Step forward one frame, 0.04 seconds"
            title="Step forward one small square (0.04 s)"
          >
            +1f
          </button>
          <button
            type="button"
            className="ctrl-btn"
            onClick={() => stepBeat(1)}
            aria-label="Next beat"
            title="Next beat"
          >
            <Icon name="skip-forward" size={13} />
          </button>

          <input
            className="ecg-scrub"
            type="range"
            min={0}
            max={RECORDING}
            step={0.01}
            value={displayTime}
            aria-label="Scrub through the recording"
            aria-valuetext={`${mmss(displayTime)} of ${mmss(RECORDING)}`}
            onChange={(e: { target: { value: string } }) => {
              setPlaying(false);
              setClock(parseFloat(e.target.value));
            }}
          />

          <span className="ecg-time mono">
            {mmss(displayTime)} / {mmss(RECORDING)}
          </span>

          <div className="anim-speed" role="group" aria-label="Playback speed">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={speed === s}
                onClick={() => setSpeed(s)}
                aria-label={`${s} times speed`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        <div className="ecg-caption">
          <div className="ecg-caption-head">
            <span className="ecg-step-label">
              Step {String(narrationIndex + 1).padStart(2, '0')} /{' '}
              {String(rhythm.narration.length).padStart(2, '0')} — {step?.title}
            </span>
            <span className="ecg-rhythm-name">{rhythm.name}</span>
          </div>
          <p aria-live="polite">{step?.text}</p>

          <div className="ecg-feature-row" role="group" aria-label="Highlight an ECG feature">
            <button
              type="button"
              className={'filter-chip' + (manualFeature === null ? ' active' : '')}
              aria-pressed={manualFeature === null}
              onClick={() => setManualFeature(null)}
            >
              <Icon name="sparkles" size={11} />
              Follow the explanation
            </button>
            {rhythm.highlights.map((h) => (
              <button
                key={h.feature}
                type="button"
                className={
                  'filter-chip filter-chip-blue' +
                  (manualFeature === h.feature ? ' active' : '') +
                  (h.abnormal ? ' is-abnormal' : '')
                }
                aria-pressed={manualFeature === h.feature}
                onClick={() => setManualFeature(h.feature === manualFeature ? null : h.feature)}
              >
                {h.label}
              </button>
            ))}
          </div>

          {activeHighlight ? (
            <div className={'ecg-note' + (activeHighlight.abnormal ? ' is-abnormal' : '')}>
              <span className="ecg-note-title">
                {activeHighlight.label}
                {activeHighlight.abnormal ? <em> · abnormal in this rhythm</em> : null}
              </span>
              <p>{activeHighlight.note}</p>
            </div>
          ) : (
            <div className="ecg-note ecg-note-quiet">
              <span className="ecg-note-title">{featureLabel[feature ?? 'baseline']}</span>
              <p>
                Choose a feature above to shade it on the scrolling trace, or leave it following the
                explanation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------- analysis pane -- */}
      <aside className="ecg-analysis" aria-label="Rhythm analysis">
        <div className="ecg-analysis-scroll">
          <header className="ecg-analysis-head">
            <span className="eyebrow eyebrow-blue">
              {ecgCategories.find((c) => c.id === rhythm.categoryId)?.label}
            </span>
            <h2>{rhythm.name}</h2>
            <p className="ecg-tagline">{rhythm.tagline}</p>
            <div className="tag-row">
              <Chip tone="blue" block>
                {rhythm.rateRange}
              </Chip>
              <Chip tone="blue" block>
                {rhythm.regularity}
              </Chip>
            </div>
          </header>

          <section>
            <h3 className="ecg-h">Measurements</h3>
            <div className="ecg-measures">
              {rhythm.measurements.map((m) => (
                <div key={m.label} className={'ecg-measure' + (m.abnormal ? ' is-abnormal' : '')}>
                  <span className="ecg-measure-label">{m.label}</span>
                  <span className="ecg-measure-value">{m.value}</span>
                  <span className="ecg-measure-normal">normal: {m.normal}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="ecg-h">How to recognise it</h3>
            <ul className="bullets">
              {rhythm.recognition.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="ecg-h">What is happening</h3>
            <p className="ecg-prose">{rhythm.mechanism}</p>
          </section>

          <section>
            <h3 className="ecg-h">Why it matters</h3>
            <p className="ecg-prose">{rhythm.significance}</p>
          </section>

          <section>
            <h3 className="ecg-h">Causes</h3>
            <ul className="bullets">
              {rhythm.causes.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="ecg-h">Management principles</h3>
            <p className="ecg-prose">{rhythm.management}</p>
          </section>

          {rhythm.relatedDiseases.length ||
          rhythm.relatedStructures.length ||
          rhythm.relatedKeyPoints.length ? (
            <section>
              <h3 className="ecg-h">Go deeper</h3>
              <div className="tag-row">
                {rhythm.relatedDiseases.map((id) => {
                  const d = diseaseById.get(id);
                  return d ? (
                    <A key={id} href={`/diseases/${d.id}`} className="filter-chip filter-chip-blue">
                      <Icon name="pulse" size={11} />
                      {d.name}
                    </A>
                  ) : null;
                })}
                {rhythm.relatedStructures.map((id) => {
                  const s = structureById.get(id);
                  return s ? (
                    <A key={id} href={`/anatomy?structure=${s.id}`} className="filter-chip">
                      <Icon name="anatomy" size={11} />
                      {s.name}
                    </A>
                  ) : null;
                })}
                {rhythm.relatedKeyPoints.map((id) => {
                  const k = keyPointById.get(id);
                  return k ? (
                    <A key={id} href={`/learn/keypoints?topic=${k.id}`} className="filter-chip">
                      <Icon name="lightbulb" size={11} />
                      {k.title}
                    </A>
                  ) : null;
                })}
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="ecg-h">References</h3>
            <References items={refs} />
          </section>
        </div>
      </aside>

      </div>

      {/* ---------------------------------------------------------- lower deck --
          Outside the workspace grid on purpose: a sticky grid item is
          constrained by the grid container, so leaving this inside would let
          the rail and the analysis panel travel down over it. */}
      <div className="ecg-lower">
        <div className="ecg-lower-grid">
          <div className="ecg-strip-card">
            <div className="ecg-lower-head">
              <h3 className="ecg-h">The beat, on paper</h3>
              <p>
                The same rhythm printed at standard calibration, with the waves named and the
                intervals measured. Select a label to shade that feature on the monitor above.
              </p>
            </div>
            <EcgTeachingStrip
              rhythm={rhythm}
              signal={leadII}
              highlight={feature}
              onPick={(f) => setManualFeature(f === manualFeature ? null : f)}
            />
          </div>

          <div className="ecg-bedside-card">
            <h3 className="ecg-h">At the bedside</h3>
            <p className="ecg-prose">{rhythm.vitals.bedside}</p>
            <dl className="ecg-vitals">
              <div>
                <dt>Heart rate</dt>
                <dd>{rhythm.vitals.heartRateLabel ?? `${rhythm.vitals.heartRate} bpm`}</dd>
              </div>
              <div>
                <dt>Blood pressure</dt>
                <dd>
                  {rhythm.vitals.bpSystolic > 0
                    ? `${rhythm.vitals.bpSystolic}/${rhythm.vitals.bpDiastolic} mmHg`
                    : 'Unrecordable'}
                </dd>
              </div>
              <div>
                <dt>SpO₂</dt>
                <dd>{rhythm.vitals.spo2 > 0 ? `${rhythm.vitals.spo2}%` : 'No trace'}</dd>
              </div>
              <div>
                <dt>Respiratory rate</dt>
                <dd>
                  {rhythm.vitals.respiratoryRate > 0
                    ? `${rhythm.vitals.respiratoryRate}/min`
                    : 'Not breathing normally'}
                </dd>
              </div>
            </dl>
            <A href="/learn/simulation" className="btn btn-primary btn-sm">
              <Icon name="bed" size={14} />
              Take this to the bedside
            </A>

            <RhythmQuiz onReveal={pickRhythm} />
          </div>
        </div>
      </div>
    </>
  );
};
