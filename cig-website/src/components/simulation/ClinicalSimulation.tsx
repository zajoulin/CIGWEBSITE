/* ==========================================================================
   CIG — Clinical Simulation
   --------------------------------------------------------------------------
   The Learning Hub's bedside module. One patient, one encounter, seven
   stages: read the presentation, examine, place ten electrodes on the chest,
   acquire a twelve-lead ECG, listen at the auscultation areas, interpret what
   you obtained, and be scored on all of it.

   This component decides only *where things go and what the learner can do*.
   Every case, question, electrode target, auscultation finding, stage and
   scoring weight comes from /content through useSimulation, so a cardiologist
   can review the whole library as JSON and a CMS can serve it later without a
   single change here.

   The room, the monitor and the ECG all read one clock, so the trace on the
   bedside monitor is the same signal the twelve-lead was cut from.
   ========================================================================== */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../icons/Icon';
import { Chip, References } from '../ui/primitives';
import { BedsideMonitor, FULL_CHANNELS } from '../ecg/BedsideMonitor';
import { useEcgSession } from '../ecg/useEcgSession';
import { PatientRoomScene } from './PatientRoomScene';
import { TorsoStage } from './TorsoStage';
import { TwelveLead } from './TwelveLead';
import { useSimulation, type SimulationSession } from './useSimulation';
import { HeartSoundPlayer } from '../../lib/audio/heartSounds';
import {
  auscultationSiteById,
  diseaseById,
  ecgLeadById,
  heartSoundById,
  keyPointById,
  resolveReferences,
  simulationConfig,
  torsoMap,
} from '../../lib/content';
import { A } from '../../lib/router';
import type { ClinicalCase, SimQuestion, SimStage } from '../../lib/types';

/* ------------------------------------------------------------- Helpers -- */

const mmss = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const stageLabel = (id: SimStage): string =>
  simulationConfig.stageLabels.find((s) => s.id === id)?.label ?? id;

const stageTask = (id: SimStage): string =>
  simulationConfig.stageLabels.find((s) => s.id === id)?.task ?? '';

/* -------------------------------------------------------------- Stepper -- */

const Stepper = ({ session }: { session: SimulationSession }) => (
  <ol className="sim-steps" aria-label="Stages of this encounter">
    {session.stages.map((s, i) => {
      const state =
        i < session.stageIndex ? 'is-done' : i === session.stageIndex ? 'is-current' : '';
      return (
        <li key={s} className={'sim-step ' + state}>
          <button
            type="button"
            // Only completed stages can be revisited: skipping ahead would let
            // the learner read the ECG before placing the electrodes.
            disabled={i > session.stageIndex}
            aria-current={i === session.stageIndex ? 'step' : undefined}
            onClick={() => session.goToStage(s)}
          >
            <span className="sim-step-num">
              {i < session.stageIndex ? <Icon name="check" size={12} /> : i + 1}
            </span>
            <span className="sim-step-label">{stageLabel(s)}</span>
          </button>
        </li>
      );
    })}
  </ol>
);

/* ----------------------------------------------------------- Case brief -- */

const PatientCard = ({ activeCase }: { activeCase: ClinicalCase }) => (
  <div className="card card-pad sim-panel">
    <span className="eyebrow eyebrow-crimson">Presentation</span>
    <h3>{activeCase.patient.descriptor}</h3>
    <p className="sim-complaint">{activeCase.presentingComplaint}</p>

    <h4 className="sim-sub">History</h4>
    <ul className="sim-list">
      {activeCase.history.map((h) => (
        <li key={h}>{h}</li>
      ))}
    </ul>

    <h4 className="sim-sub">Symptoms</h4>
    <ul className="sim-list">
      {activeCase.symptoms.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ul>
  </div>
);

const VitalsGrid = ({ activeCase }: { activeCase: ClinicalCase }) => {
  const v = activeCase.vitals;
  const rows: { label: string; value: string; unit: string }[] = [
    { label: 'Heart rate', value: v.heartRateLabel ?? String(v.heartRate), unit: 'bpm' },
    { label: 'Blood pressure', value: v.bpSystolic > 0 ? `${v.bpSystolic}/${v.bpDiastolic}` : '- -', unit: 'mmHg' },
    { label: 'SpO₂', value: v.spo2 > 0 ? String(v.spo2) : '- -', unit: '%' },
    { label: 'Respiratory rate', value: String(v.respiratoryRate), unit: '/min' },
  ];
  if (v.temperature) rows.push({ label: 'Temperature', value: v.temperature.toFixed(1), unit: '°C' });
  return (
    <div className="sim-vitals">
      {rows.map((r) => (
        <div key={r.label} className="sim-vital">
          <span className="sim-vital-label">{r.label}</span>
          <span className="sim-vital-value">
            {r.value}
            <em>{r.unit}</em>
          </span>
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------ Electrode stage -- */

const ElectrodeStage = ({ session }: { session: SimulationSession }) => {
  const [errorAt, setErrorAt] = useState<{ x: number; y: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const active = session.activeElectrode;
  const lead = active ? ecgLeadById.get(active.leadId) : null;
  const placedCount = session.placed.size;

  const handlePlace = (x: number, y: number) => {
    const result = session.placeAt(x, y);
    if (!result) return;
    if (!result.correct) {
      setErrorAt({ x, y });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setErrorAt(null), 2200);
    } else {
      setErrorAt(null);
    }
  };

  /* The keyboard-accessible equivalent of pointing at the chest. It places the
     electrode on its landmark, and it counts as a hint, so it is never a way
     of scoring better than a learner using a pointer. */
  const placeFromLandmark = () => {
    if (!active) return;
    session.revealHint();
    const [x, y] =
      session.activeCase.patient.sex === 'female' ? active.female : active.male;
    handlePlace(x, y);
  };

  return (
    <div className="sim-split">
      <div className="sim-stage-main">
        <TorsoStage
          sex={session.activeCase.patient.sex}
          mode="electrodes"
          placed={session.placed}
          active={active}
          guides={session.hintedLeads}
          showAllGuides={session.level.showPlacementGuides}
          onPlace={handlePlace}
          errorAt={errorAt}
          caption={
            <>
              <Icon name="info" size={12} /> Anterior view of the patient&rsquo;s chest —{' '}
              {session.activeCase.patient.sex === 'female' ? 'female' : 'male'} model. Tap where the{' '}
              <strong>{active?.code ?? 'next'}</strong> electrode belongs. The dashed lines are the
              midclavicular, anterior axillary and midaxillary lines; the short bar on the sternum is
              the sternal angle.
            </>
          }
        />
      </div>

      <div className="sim-stage-side">
        <div className="card card-pad sim-panel">
          <span className="eyebrow eyebrow-crimson">Task</span>
          <h3>Obtain a 12-lead ECG</h3>
          <p className="sim-progress-line">
            <strong>{placedCount}</strong> of {session.electrodes.length} electrodes placed
          </p>
          <div className="sim-progress" role="progressbar" aria-valuenow={placedCount} aria-valuemin={0} aria-valuemax={session.electrodes.length}>
            <span style={{ width: `${(placedCount / session.electrodes.length) * 100}%` }} />
          </div>

          {active ? (
            <div className="sim-active-lead">
              <span
                className="sim-lead-swatch"
                style={{ background: lead?.color ?? '#f2f5f8' }}
                aria-hidden="true"
              />
              <div>
                <h4>
                  {active.code} — {lead?.name ?? ''}
                </h4>
                <p>{active.cue}</p>
                {session.hintedLeads.has(active.leadId) && lead ? (
                  <p className="sim-hint-text">
                    <Icon name="lightbulb" size={12} /> {lead.howToFind}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {session.lastFeedback ? (
            <p
              className={
                'sim-feedback ' + (session.lastFeedback.correct ? 'is-good' : 'is-bad')
              }
              role="status"
            >
              <Icon name={session.lastFeedback.correct ? 'check' : 'warning'} size={13} />
              {session.lastFeedback.message}
            </p>
          ) : null}

          <div className="sim-actions">
            <button
              type="button"
              className="btn btn-sm"
              onClick={session.revealHint}
              disabled={!active || session.hintedLeads.has(active.leadId)}
            >
              <Icon name="lightbulb" size={13} />
              Show the landmark
            </button>
            <button type="button" className="btn btn-sm" onClick={placeFromLandmark} disabled={!active}>
              <Icon name="target" size={13} />
              Place at the landmark
            </button>
          </div>
          <p className="sim-note">
            Asking for a landmark costs half a mark, and placing from it uses the same hint — it is
            the keyboard-accessible route to the same result, not a shortcut past the marking.
          </p>
        </div>

        <div className="card card-pad sim-panel">
          <h4 className="sim-sub">Electrodes</h4>
          <ul className="sim-electrode-list">
            {session.electrodes.map((e) => {
              const l = ecgLeadById.get(e.leadId);
              const done = session.placed.has(e.leadId);
              return (
                <li key={e.leadId}>
                  <button
                    type="button"
                    className={
                      'sim-electrode' +
                      (done ? ' is-done' : '') +
                      (active?.leadId === e.leadId ? ' is-active' : '')
                    }
                    aria-pressed={active?.leadId === e.leadId}
                    onClick={() =>
                      done ? session.removeElectrode(e.leadId) : session.selectElectrode(e.leadId)
                    }
                  >
                    <span
                      className="sim-lead-swatch"
                      style={{ background: l?.color ?? '#f2f5f8' }}
                      aria-hidden="true"
                    />
                    <span className="sim-electrode-code">{e.code}</span>
                    <span className="sim-electrode-name">{l?.landmark ?? ''}</span>
                    <span className="sim-electrode-state">
                      {done ? (
                        <>
                          <Icon name="check" size={12} /> placed
                        </>
                      ) : (
                        'pending'
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

/* --------------------------------------------------- Auscultation stage -- */

const AuscultationStage = ({ session }: { session: SimulationSession }) => {
  const [siteId, setSiteId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef<HeartSoundPlayer | null>(null);

  useEffect(() => {
    playerRef.current = new HeartSoundPlayer();
    return () => {
      playerRef.current?.dispose();
      playerRef.current = null;
    };
  }, []);

  const finding = siteId
    ? session.activeCase.auscultation.find((a) => a.siteId === siteId)
    : null;
  const site = siteId ? auscultationSiteById.get(siteId) : null;
  const sound = heartSoundById.get(finding?.soundId ?? 'normal-s1-s2') ?? null;

  const select = (id: string) => {
    setSiteId(id);
    session.markListened(id);
    setPlaying(false);
    playerRef.current?.stop();
  };

  const toggle = () => {
    const player = playerRef.current;
    if (!player || !sound) return;
    if (playing) {
      player.stop();
      setPlaying(false);
    } else {
      setPlaying(player.play(sound));
    }
  };

  useEffect(() => {
    // Never leave a sound running when the learner moves on.
    return () => playerRef.current?.stop();
  }, [siteId]);

  const expected = session.activeCase.auscultation.map((a) => a.siteId);
  const heardAll = expected.every((id) => session.listenedSites.has(id));

  return (
    <div className="sim-split">
      <div className="sim-stage-main">
        <TorsoStage
          sex={session.activeCase.patient.sex}
          mode="auscultation"
          placed={new Map()}
          activeSite={siteId}
          visitedSites={session.listenedSites}
          onSite={select}
          caption={
            <>
              <Icon name="info" size={12} /> Tap an auscultation area to place the stethoscope.{' '}
              {heardAll
                ? 'You have listened everywhere this case has findings.'
                : `Listened at ${session.listenedSites.size} of ${torsoMap.auscultation.length} areas.`}
            </>
          }
        />
      </div>

      <div className="sim-stage-side">
        <div className="card card-pad sim-panel">
          <span className="eyebrow eyebrow-blue">Auscultation</span>
          {site ? (
            <>
              <h3>{site.name}</h3>
              <p className="sim-note-strong">{site.location}</p>
              <p>{site.why}</p>
              {finding ? <p className="sim-finding">{finding.note}</p> : null}
              {sound ? (
                <div className="sim-sound">
                  <div>
                    <h4>{sound.name}</h4>
                    <p className="sim-note">
                      {sound.timing === 'none' ? 'Heart sounds' : `${sound.timing} · ${sound.pitch}-pitched`} · {sound.quality}
                    </p>
                  </div>
                  <button type="button" className="btn btn-primary btn-sm" onClick={toggle}>
                    <Icon name={playing ? 'pause' : 'sound'} size={13} />
                    {playing ? 'Stop' : 'Listen'}
                  </button>
                </div>
              ) : null}
              <p className="sim-note">{simulationConfig.audioNote}</p>
              <h4 className="sim-sub">Technique</h4>
              <p>{site.technique}</p>
            </>
          ) : (
            <>
              <h3>Place the stethoscope</h3>
              <p>
                Choose an area on the chest, or from the list below. Each one is where sound from a
                particular valve reaches the chest wall most directly — the areas are named for the
                valve you hear best there, not for where that valve actually sits.
              </p>
            </>
          )}

          <ul className="sim-site-list">
            {torsoMap.auscultation.map((a) => {
              const s = auscultationSiteById.get(a.siteId);
              return (
                <li key={a.siteId}>
                  <button
                    type="button"
                    className={
                      'sim-site' +
                      (siteId === a.siteId ? ' is-active' : '') +
                      (session.listenedSites.has(a.siteId) ? ' is-done' : '')
                    }
                    aria-pressed={siteId === a.siteId}
                    onClick={() => select(a.siteId)}
                  >
                    <span className="sim-site-name">{s?.name ?? a.siteId}</span>
                    <span className="sim-site-loc">{s?.location ?? ''}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------ Interpretation -- */

const QuestionCard = ({
  question,
  chosen,
  onAnswer,
  onNext,
  index,
  total,
  isLast,
}: {
  question: SimQuestion;
  chosen: string | undefined;
  onAnswer: (optionId: string) => void;
  onNext: () => void;
  index: number;
  total: number;
  isLast: boolean;
}) => {
  const answered = chosen !== undefined;
  const chosenOption = question.options.find((o) => o.id === chosen);
  const correctOption = question.options.find((o) => o.correct);

  return (
    <div className="card card-pad sim-panel sim-question">
      <div className="sim-question-head">
        <span className="eyebrow eyebrow-crimson">
          {question.kind === 'rhythm'
            ? 'Rhythm'
            : question.kind === 'systematic'
              ? `Systematic reading · ${question.step ?? ''}`
              : question.kind === 'interpretation'
                ? 'Interpretation'
                : 'Clinical reasoning'}
        </span>
        <span className="sim-question-count">
          {index + 1} / {total}
        </span>
      </div>
      <h3>{question.prompt}</h3>

      <ul className="sim-options">
        {question.options.map((o) => {
          const state = !answered
            ? ''
            : o.correct
              ? ' is-correct'
              : o.id === chosen
                ? ' is-wrong'
                : ' is-dim';
          return (
            <li key={o.id}>
              <button
                type="button"
                className={'sim-option' + state}
                disabled={answered}
                onClick={() => onAnswer(o.id)}
              >
                <span className="sim-option-mark" aria-hidden="true">
                  {answered && o.correct ? (
                    <Icon name="check" size={13} />
                  ) : answered && o.id === chosen ? (
                    <Icon name="close" size={13} />
                  ) : (
                    o.id.toUpperCase()
                  )}
                </span>
                <span className="sim-option-text">{o.text}</span>
              </button>
              {answered && (o.id === chosen || o.correct) ? (
                <p className={'sim-option-feedback' + (o.correct ? ' is-good' : ' is-bad')}>
                  {o.feedback}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {answered ? (
        <div className="sim-answer-foot" role="status">
          <p className="sim-explain">
            <strong>
              {chosenOption?.correct
                ? 'Correct.'
                : `Not quite — the answer is “${correctOption?.text ?? ''}”.`}
            </strong>{' '}
            {question.explanation}
          </p>
          <button type="button" className="btn btn-primary btn-sm" onClick={onNext}>
            {isLast ? 'Finish and see your score' : 'Next question'}
            <Icon name="arrow-right" size={13} />
          </button>
        </div>
      ) : null}
    </div>
  );
};

/* --------------------------------------------------------------- Score -- */

const ScoreStage = ({ session }: { session: SimulationSession }) => {
  const c = session.activeCase;
  const reading = c.ecg;
  const refs = resolveReferences(c.references);

  const rows: { label: string; value: string }[] = [
    { label: 'Rate', value: reading.rate },
    { label: 'Rhythm', value: reading.rhythm },
    { label: 'P waves', value: reading.pWaves },
    { label: 'PR interval', value: reading.prInterval },
    { label: 'QRS', value: reading.qrs },
    { label: 'Axis', value: reading.axis },
    { label: 'ST segment', value: reading.stSegment },
    { label: 'T waves', value: reading.tWaves },
  ];

  return (
    <div className="sim-debrief">
      <div className="card card-pad sim-scorecard">
        <span className="eyebrow eyebrow-blue">Case completed</span>
        <h3>{c.title}</h3>
        <div className="sim-score-total">
          <span className="sim-score-number">
            {session.score.total}
            <em>/ {session.score.max}</em>
          </span>
          <div>
            <strong>{session.score.band.label}</strong>
            <p>{session.score.band.note}</p>
          </div>
        </div>

        <ul className="sim-score-lines">
          {session.score.lines.map((l) => (
            <li key={l.id}>
              <div className="sim-score-line-head">
                <span>{l.label}</span>
                <span className="mono">
                  {l.score}/{l.max}
                </span>
              </div>
              <div className="sim-progress">
                <span style={{ width: `${Math.max(0, (l.score / l.max) * 100)}%` }} />
              </div>
              <p className="sim-note">{l.description}</p>
            </li>
          ))}
        </ul>

        <div className="sim-score-meta">
          <Chip tone="blue">Time taken {mmss(session.elapsedSeconds)}</Chip>
          <Chip tone="blue">
            {session.placed.size}/{session.electrodes.length} electrodes
          </Chip>
          <Chip tone="blue">Difficulty: {session.level.label}</Chip>
          <Chip tone={session.mistakes.length ? 'crimson' : 'blue'}>
            {session.mistakes.length} mistake{session.mistakes.length === 1 ? '' : 's'}
          </Chip>
        </div>

        <div className="sim-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={session.newCase}>
            <Icon name="refresh" size={13} />
            Try another case
          </button>
          <button type="button" className="btn btn-sm" onClick={session.restartCase}>
            <Icon name="restart" size={13} />
            Repeat this case
          </button>
        </div>
      </div>

      <div className="card card-pad sim-panel">
        <span className="eyebrow eyebrow-crimson">Review your mistakes</span>
        {session.mistakes.length === 0 ? (
          <p className="sim-clean">
            <Icon name="check" size={14} /> Nothing to review — every electrode went on correctly
            first time and every question was answered correctly.
          </p>
        ) : (
          <ol className="sim-mistakes">
            {session.mistakes.map((m) => (
              <li key={m.id}>
                <span className={'sim-mistake-tag sim-mistake-' + m.area}>{m.area}</span>
                <h4>{m.title}</h4>
                <p className="sim-note">{m.detail}</p>
                <p>{m.correction}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="card card-pad sim-panel">
        <span className="eyebrow eyebrow-blue">The correct interpretation</span>
        <h3>{c.interpretation}</h3>
        <dl className="sim-reading">
          {rows.map((r) => (
            <div key={r.label}>
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
        <h4 className="sim-sub">What matters on this tracing</h4>
        <ul className="sim-list">
          {reading.keyFindings.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <p className="sim-note-strong">
          Leads carrying the finding: {reading.keyLeads.join(', ')}
        </p>
      </div>

      <div className="sim-debrief-wide">
        <TwelveLead rhythm={session.monitorRhythm} reading={reading} showViews />
      </div>

      <div className="card card-pad sim-panel">
        <span className="eyebrow eyebrow-blue">Why</span>
        <p>{c.explanation}</p>
        <h4 className="sim-sub">Clinical context</h4>
        <p>{c.clinicalContext}</p>
        <h4 className="sim-sub">Learning objectives</h4>
        <ul className="sim-list">
          {c.learningObjectives.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
        {c.relatedDiseases.length || c.relatedKeyPoints.length ? (
          <>
            <h4 className="sim-sub">Go deeper</h4>
            <div className="tag-row">
              {c.relatedDiseases.map((id) => {
                const d = diseaseById.get(id);
                return d ? (
                  <A key={id} href={`/diseases/${id}`} className="filter-chip filter-chip-crimson">
                    {d.name}
                  </A>
                ) : null;
              })}
              {c.relatedKeyPoints.map((id) => {
                const k = keyPointById.get(id);
                return k ? (
                  <A key={id} href={`/learn/keypoints?topic=${id}`} className="filter-chip filter-chip-blue">
                    {k.title}
                  </A>
                ) : null;
              })}
              <A
                href={`/learn/ecg?rhythm=${encodeURIComponent(c.ecgRhythmId)}`}
                className="filter-chip filter-chip-blue"
              >
                Study this rhythm on the monitor
              </A>
            </div>
          </>
        ) : null}
        {refs.length ? (
          <>
            <h4 className="sim-sub">References</h4>
            <References items={refs} />
          </>
        ) : null}
      </div>
    </div>
  );
};

/* ===================================================== The whole module -- */

export const ClinicalSimulation = ({
  initialLevel,
  initialCase,
}: {
  initialLevel?: string;
  initialCase?: string;
}) => {
  const session = useSimulation(initialLevel, initialCase);
  const ecg = useEcgSession(session.activeCase.ecgRhythmId);
  const [vitalsSeen, setVitalsSeen] = useState(false);

  /* One clock for the room and the twelve-lead: when the case changes, the
     waveform engine is pointed at the new rhythm and the trace restarts. */
  useEffect(() => {
    ecg.selectRhythm(session.activeCase.ecgRhythmId);
    ecg.restart();
    setVitalsSeen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.activeCase.id, session.caseNumber]);

  const revealVitals = session.level.showVitalsUpfront || vitalsSeen;
  const stage = session.stage;

  const monitorRhythm = session.monitorRhythm;

  const room = (
    <PatientRoomScene
      rhythm={monitorRhythm}
      activeCase={session.activeCase}
      signals={ecg.signals}
      clockRef={ecg.clockRef}
      playing={ecg.playing}
      onQrs={ecg.onQrs}
      task={stageTask(stage)}
      revealVitals={revealVitals}
      onRevealVitals={() => setVitalsSeen(true)}
    />
  );

  /** The primary action for the current stage. */
  const primary = useMemo(() => {
    switch (stage) {
      case 'brief':
        return { label: 'Assess the patient', disabled: false, onClick: session.advance };
      case 'examination':
        return {
          label: 'Proceed to the ECG',
          disabled: !revealVitals,
          onClick: session.advance,
          hint: revealVitals ? '' : 'Check the observations on the monitor first.',
        };
      case 'electrodes':
        return {
          label: 'Acquire 12-lead ECG',
          disabled: !session.allPlaced,
          onClick: () => {
            session.acquire();
            session.advance();
          },
          hint: session.allPlaced
            ? ''
            : `Place all ${session.electrodes.length} electrodes before acquiring.`,
        };
      case 'acquire':
        return { label: 'Continue', disabled: false, onClick: session.advance };
      case 'auscultation':
        return { label: 'Continue to interpretation', disabled: false, onClick: session.advance };
      case 'interpret':
        return {
          label: 'See your score',
          disabled: !session.answeredAll,
          onClick: () => session.goToStage('score'),
          hint: session.answeredAll ? '' : 'Answer every question first.',
        };
      default:
        return null;
    }
  }, [stage, session, revealVitals]);

  return (
    <div className="sim">
      <div className="sim-bar">
        <div className="sim-bar-level" role="group" aria-label="Difficulty">
          <span className="sim-bar-label">Difficulty</span>
          <div className="sim-levels">
            {session.levels.map((l) => (
              <button
                key={l.id}
                type="button"
                className={'sim-level' + (l.id === session.level.id ? ' active' : '')}
                aria-pressed={l.id === session.level.id}
                title={l.blurb}
                onClick={() => session.setLevel(l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <p className="sim-bar-blurb">
          <strong>{session.level.tagline}.</strong> {session.level.blurb}
        </p>
        <div className="sim-bar-meta">
          <Chip tone="blue">Case {session.caseNumber}</Chip>
          <Chip tone="blue">{mmss(session.elapsedSeconds)}</Chip>
          <button type="button" className="btn btn-sm" onClick={session.newCase}>
            <Icon name="refresh" size={13} />
            New random case
          </button>
        </div>
      </div>

      <Stepper session={session} />

      {stage === 'brief' ? (
        <div className="sim-split">
          <div className="sim-stage-main">{room}</div>
          <div className="sim-stage-side">
            <PatientCard activeCase={session.activeCase} />
            {revealVitals ? (
              <div className="card card-pad sim-panel">
                <span className="eyebrow eyebrow-blue">Observations</span>
                <VitalsGrid activeCase={session.activeCase} />
              </div>
            ) : (
              <div className="card card-pad sim-panel">
                <span className="eyebrow eyebrow-blue">Observations</span>
                <p>
                  The monitor is beside the bed. Select it to read this patient&rsquo;s heart rate,
                  blood pressure, oxygen saturation and respiratory rate.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {stage === 'examination' ? (
        <div className="sim-split">
          <div className="sim-stage-main">{room}</div>
          <div className="sim-stage-side">
            <div className="card card-pad sim-panel">
              <span className="eyebrow eyebrow-crimson">Examination</span>
              <h3>What you find at the bedside</h3>
              <ul className="sim-list">
                {session.activeCase.examinationFindings.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
            <div className="card card-pad sim-panel">
              <span className="eyebrow eyebrow-blue">Observations</span>
              {revealVitals ? (
                <VitalsGrid activeCase={session.activeCase} />
              ) : (
                <p>Select the bedside monitor to read the observations.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {stage === 'electrodes' ? <ElectrodeStage session={session} /> : null}

      {stage === 'acquire' ? (
        <div className="sim-acquire">
          <div className="card card-pad sim-panel sim-acquire-head">
            <span className="eyebrow eyebrow-blue">12-lead ECG acquired</span>
            <h3>
              {session.activeCase.patient.descriptor} · {session.activeCase.patient.setting}
            </h3>
            <p>
              All ten electrodes are on the chest and the recording has been taken. Read the tracing
              before you answer anything — rate, rhythm, P waves, PR interval, QRS, axis, ST segment,
              T waves — then continue.
            </p>
            {revealVitals ? <VitalsGrid activeCase={session.activeCase} /> : null}
          </div>
          <div className="sim-monitor-wrap">
            <BedsideMonitor
              rhythm={monitorRhythm}
              signals={ecg.signals}
              clockRef={ecg.clockRef}
              playing={ecg.playing}
              channels={FULL_CHANNELS}
              onQrs={ecg.onQrs}
              bed="BED 4"
              tone={ecg.tone}
              soundEnabled={ecg.soundEnabled}
              onToggleSound={ecg.toggleSound}
            />
          </div>
          <TwelveLead
            rhythm={monitorRhythm}
            reading={session.activeCase.ecg}
            highlight={null}
            emphasis={[]}
          />
        </div>
      ) : null}

      {stage === 'auscultation' ? <AuscultationStage session={session} /> : null}

      {stage === 'interpret' ? (
        <div className="sim-interpret">
          <TwelveLead
            rhythm={monitorRhythm}
            reading={session.activeCase.ecg}
            highlight={session.currentQuestion?.highlight ?? null}
            emphasis={session.currentQuestion?.leads ?? []}
          />
          {session.currentQuestion ? (
            <QuestionCard
              question={session.currentQuestion}
              chosen={session.answers.get(session.currentQuestion.id)}
              onAnswer={(optionId) =>
                session.currentQuestion && session.answer(session.currentQuestion.id, optionId)
              }
              onNext={() => {
                if (session.questionIndex >= session.questions.length - 1) {
                  session.goToStage('score');
                } else {
                  session.nextQuestion();
                }
              }}
              index={session.questionIndex}
              total={session.questions.length}
              isLast={session.questionIndex >= session.questions.length - 1}
            />
          ) : (
            <div className="card card-pad sim-panel">
              <p>This case has no questions at this difficulty level.</p>
            </div>
          )}
        </div>
      ) : null}

      {stage === 'score' ? <ScoreStage session={session} /> : null}

      {primary ? (
        <div className="sim-footer">
          {primary.hint ? <span className="sim-note">{primary.hint}</span> : null}
          <button
            type="button"
            className="btn btn-primary"
            disabled={primary.disabled}
            onClick={primary.onClick}
          >
            {primary.label}
            <Icon name="arrow-right" size={14} />
          </button>
        </div>
      ) : null}
    </div>
  );
};

export { useSimulation };
