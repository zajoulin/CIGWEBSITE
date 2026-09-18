/* ==========================================================================
   CIG — 3D cardiovascular examination
   --------------------------------------------------------------------------
   Three modes over one interactive thorax:

     ECG Leads     select a lead, see exactly where it belongs against the
                   anatomical landmarks, and watch the cable run from the
                   electrode to the monitor — patient → electrodes → monitor
                   → waveform, as one continuous chain.
     Auscultation  move the stethoscope over the chest; each area responds
                   with its own heart sounds, synthesised in step with a
                   cardiac-cycle timeline that shows when the murmur occurs.
     Anatomy       the surface landmarks every one of those positions is
                   defined by.

   Challenge mode turns any of it into a test: "Place V1", "Where would you
   listen for aortic stenosis?" — the learner clicks the chest and is marked
   on how close they were to the correct landmark.
   ========================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../icons/Icon';
import { Chip, References } from '../ui/primitives';
import { ChestStage, type ChestStageApi, type ScreenPoint } from './ChestStage';
import { CycleTimeline } from './CycleTimeline';
import { MonitorScreen, COMPACT_CHANNELS } from '../ecg/BedsideMonitor';
import { useEcgSession } from '../ecg/useEcgSession';
import { HeartSoundPlayer, type ChestPiece } from '../../lib/audio/heartSounds';
import { surfacePoint, type ThoraxMarker, type ThoraxSex } from '../../lib/cardio3d/thorax';
import {
  auscultationSites,
  challengesFor,
  diseaseById,
  ecgLeads,
  heartSoundById,
  resolveReferences,
  surfaceLandmarks,
} from '../../lib/content';
import { A } from '../../lib/router';
import type { ChestPoint, ExamChallenge, HeartSound } from '../../lib/types';

export type ExamMode = 'leads' | 'auscultation' | 'anatomy';

/**
 * How close a click has to be to count as correct, in model units — about
 * two centimetres on a real chest, which is roughly the accuracy expected of
 * electrode placement.
 */
const TOLERANCE = 0.5;

/** V1 and V2 straddle the sternum, a known distance apart in model space. */
const SCALE_REFERENCE = { a: 'lead.v1', b: 'lead.v2' };

const MODES: { id: ExamMode; label: string; icon: 'ecg' | 'stethoscope' | 'anatomy' }[] = [
  { id: 'leads', label: 'ECG Leads', icon: 'ecg' },
  { id: 'auscultation', label: 'Auscultation', icon: 'stethoscope' },
  { id: 'anatomy', label: 'Anatomy', icon: 'anatomy' },
];

const distance3 = (a: [number, number, number], b: [number, number, number]): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const asPoint = (p: ChestPoint): [number, number, number] => [p[0], p[1], p[2]];

/**
 * A cable from an electrode on the chest to the monitor's input at the top
 * right of the stage, drawn with a little slack so it reads as a lead wire.
 */
const cablePath = (p: ScreenPoint, size: { width: number; height: number }): string => {
  const tx = size.width * 0.9;
  const ty = size.height * 0.2;
  const midX = p.x + (tx - p.x) * 0.55;
  const sag = Math.min(70, Math.abs(tx - p.x) * 0.28);
  return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} C ${(p.x + 40).toFixed(1)} ${(p.y + sag).toFixed(1)}, ${midX.toFixed(1)} ${(ty + sag).toFixed(1)}, ${tx.toFixed(1)} ${ty.toFixed(1)}`;
};

interface Feedback {
  ok: boolean;
  title: string;
  detail: string;
}

export const ExaminationWorkspace = ({
  initialMode = 'leads',
  initialSex = 'male',
  initialLead,
  initialSite,
}: {
  initialMode?: ExamMode;
  initialSex?: ThoraxSex;
  initialLead?: string;
  initialSite?: string;
}) => {
  const [mode, setMode] = useState<ExamMode>(initialMode);
  const [sex, setSex] = useState<ThoraxSex>(initialSex);
  const [selectedLead, setSelectedLead] = useState<string | null>(initialLead ?? 'v1');
  const [selectedSite, setSelectedSite] = useState<string | null>(initialSite ?? 'mitral');
  const [selectedLandmark, setSelectedLandmark] = useState<string | null>('sternal-angle');
  const [showElectrodes, setShowElectrodes] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [hovered, setHovered] = useState<ThoraxMarker | null>(null);
  const [screen, setScreen] = useState<Map<string, ScreenPoint>>(new Map());
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  /** Where the learner last clicked in challenge mode, so it can be marked. */
  const [pin, setPin] = useState<{ x: number; y: number; ok: boolean } | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);

  /* challenge state */
  const [challengeOn, setChallengeOn] = useState(false);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [score, setScore] = useState({ right: 0, asked: 0 });

  /* auscultation state */
  const [soundId, setSoundId] = useState<string>('normal-s1-s2');
  const [listening, setListening] = useState(false);
  const [chestPiece, setChestPiece] = useState<ChestPiece>('diaphragm');
  const [phase, setPhase] = useState<number | null>(null);
  const playerRef = useRef<HeartSoundPlayer | null>(null);

  const stageApi = useRef<ChestStageApi | null>(null);

  /* the monitor beside the chest runs a normal sinus rhythm */
  const session = useEcgSession('normal-sinus-rhythm');

  const lead = selectedLead ? ecgLeads.find((l) => l.id === selectedLead) ?? null : null;
  const site = selectedSite ? auscultationSites.find((s) => s.id === selectedSite) ?? null : null;
  const landmark = selectedLandmark
    ? surfaceLandmarks.find((l) => l.id === selectedLandmark) ?? null
    : null;

  /* ------------------------------------------------------------- audio -- */

  useEffect(() => {
    if (playerRef.current === null && typeof window !== 'undefined') {
      playerRef.current = new HeartSoundPlayer();
    }
    const player = playerRef.current;
    return () => player?.dispose();
  }, []);

  useEffect(() => {
    playerRef.current?.setChestPiece(chestPiece);
  }, [chestPiece]);

  const sound: HeartSound | null = heartSoundById.get(soundId) ?? null;

  const startListening = useCallback(
    (id: string) => {
      const s = heartSoundById.get(id);
      if (!s) return;
      setSoundId(id);
      const ok = playerRef.current?.play(s) ?? false;
      setListening(ok);
    },
    [],
  );

  const stopListening = useCallback(() => {
    playerRef.current?.stop();
    setListening(false);
    setPhase(null);
  }, []);

  useEffect(() => {
    if (!listening) return;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      setPhase(playerRef.current?.phase() ?? null);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [listening]);

  // Leaving auscultation mode should always stop the sound.
  useEffect(() => {
    if (mode !== 'auscultation') stopListening();
  }, [mode, stopListening]);

  /* --------------------------------------------------------- challenge -- */

  const challengeMode: ExamChallenge['mode'] = mode === 'auscultation' ? 'auscultation' : 'leads';
  const challenges = useMemo(() => challengesFor(challengeMode), [challengeMode]);
  const challenge = challengeOn ? (challenges[challengeIndex % challenges.length] ?? null) : null;

  useEffect(() => {
    setChallengeIndex(0);
    setFeedback(null);
  }, [challengeMode, challengeOn]);

  const nextChallenge = () => {
    setFeedback(null);
    setPin(null);
    setChallengeIndex((i) => (i + 1) % Math.max(1, challenges.length));
  };

  /* ------------------------------------------------ target positions -- */

  /** The true 3D position of a lead or auscultation site on this chest. */
  const truePosition = useCallback(
    (kind: 'lead' | 'site', id: string): [number, number, number] | null => {
      if (kind === 'lead') {
        const l = ecgLeads.find((x) => x.id === id);
        if (!l) return null;
        return surfacePoint(
          asPoint(sex === 'female' && l.positionFemale ? l.positionFemale : l.position),
          sex,
          0.12,
        );
      }
      const s = auscultationSites.find((x) => x.id === id);
      if (!s) return null;
      return surfacePoint(
        asPoint(sex === 'female' && s.positionFemale ? s.positionFemale : s.position),
        sex,
        0.12,
      );
    },
    [sex],
  );

  /* -------------------------------------------------------- selection -- */

  const handleSelect = useCallback(
    (marker: ThoraxMarker | null) => {
      if (!marker) return;
      const [kind, id] = marker.name.split('.');

      // In challenge mode the answer comes from where on the chest the learner
      // clicked, which is handled by answerChallenge below.
      if (challenge) return;

      /* Free exploration. */
      if (kind === 'lead') {
        setMode('leads');
        setSelectedLead(id);
      } else if (kind === 'site') {
        setMode('auscultation');
        setSelectedSite(id);
        const s = auscultationSites.find((x) => x.id === id);
        const first = s?.soundIds[0];
        if (first) startListening(first);
      } else if (kind === 'landmark') {
        setSelectedLandmark(id);
        if (mode !== 'anatomy') setMode('anatomy');
      }
    },
    [challenge, mode, startListening, truePosition],
  );

  /**
   * Marks a challenge answer. The click is compared with the projected screen
   * position of the correct landmark, and the pixel distance is converted back
   * into model units using two markers a known distance apart — so the mark is
   * fair however far the learner has zoomed or rotated the model.
   */
  const answerChallenge = useCallback(
    (point: { x: number; y: number }) => {
      if (!challenge || feedback) return;
      const targetName =
        (challenge.mode === 'auscultation' ? 'site.' : 'lead.') + challenge.targetId;
      const targetScreen = screen.get(targetName);
      const a = screen.get(SCALE_REFERENCE.a);
      const b = screen.get(SCALE_REFERENCE.b);
      const refA = truePosition('lead', 'v1');
      const refB = truePosition('lead', 'v2');
      if (!targetScreen || !a || !b || !refA || !refB) return;

      const pxPerUnit =
        Math.hypot(a.x - b.x, a.y - b.y) / Math.max(0.05, distance3(refA, refB));
      const dPx = Math.hypot(point.x - targetScreen.x, point.y - targetScreen.y);
      const dUnits = pxPerUnit > 0 ? dPx / pxPerUnit : Infinity;
      const ok = dUnits <= TOLERANCE && targetScreen.visible !== false;

      setPin({ x: point.x, y: point.y, ok });
      setScore((sc) => ({ right: sc.right + (ok ? 1 : 0), asked: sc.asked + 1 }));
      setFeedback({
        ok,
        title: ok ? 'Correct' : 'Not quite',
        detail: ok ? challenge.successText : challenge.failText,
      });

      if (challenge.mode === 'auscultation') {
        setSelectedSite(challenge.targetId);
        if (ok) {
          const st = auscultationSites.find((x) => x.id === challenge.targetId);
          const first = st?.soundIds[0];
          if (first) startListening(first);
        }
      } else {
        setSelectedLead(challenge.targetId);
      }
    },
    [challenge, feedback, screen, startListening, truePosition],
  );

  /* --------------------------------------------------------- visibility -- */

  const hidden = useMemo(() => {
    const h = new Set<string>();
    const isChallenge = Boolean(challenge);

    if (mode === 'leads') {
      for (const s of auscultationSites) h.add(`site.${s.id}`);
      if (!showElectrodes || isChallenge) {
        for (const l of ecgLeads) {
          if (l.id !== selectedLead || isChallenge) h.add(`lead.${l.id}`);
        }
      }
      // Once the question has been answered, show the correct position.
      if (isChallenge && feedback && challenge) h.delete(`lead.${challenge.targetId}`);
      for (const l of surfaceLandmarks) {
        // Keep the landmarks that define electrode positions, drop the rest.
        if (!['sternal-angle', 'fourth-ics', 'fifth-ics', 'midclavicular-line', 'anterior-axillary-line', 'mid-axillary-line', 'suprasternal-notch'].includes(l.id)) {
          h.add(`landmark.${l.id}`);
        }
      }
    } else if (mode === 'auscultation') {
      for (const l of ecgLeads) h.add(`lead.${l.id}`);
      for (const l of surfaceLandmarks) {
        if (!['sternal-angle', 'apex-beat', 'midclavicular-line', 'sternal-borders'].includes(l.id)) {
          h.add(`landmark.${l.id}`);
        }
      }
      if (isChallenge) {
        for (const s of auscultationSites) h.add(`site.${s.id}`);
        if (feedback && challenge) h.delete(`site.${challenge.targetId}`);
      }
    } else {
      for (const l of ecgLeads) h.add(`lead.${l.id}`);
      for (const s of auscultationSites) h.add(`site.${s.id}`);
    }
    return h;
  }, [mode, showElectrodes, selectedLead, challenge, feedback]);

  const selectedMesh =
    mode === 'leads'
      ? selectedLead
        ? `lead.${selectedLead}`
        : null
      : mode === 'auscultation'
        ? selectedSite
          ? `site.${selectedSite}`
          : null
        : selectedLandmark
          ? `landmark.${selectedLandmark}`
          : null;

  /* Names whose screen position the stage should report each frame. */
  const tracked = useMemo(() => {
    const names: string[] = [];
    if (mode === 'leads') {
      names.push(...ecgLeads.filter((l) => !hidden.has(`lead.${l.id}`)).map((l) => `lead.${l.id}`));
    } else if (mode === 'auscultation') {
      names.push(
        ...auscultationSites.filter((s) => !hidden.has(`site.${s.id}`)).map((s) => `site.${s.id}`),
      );
    } else {
      names.push(
        ...surfaceLandmarks
          .filter((l) => !hidden.has(`landmark.${l.id}`))
          .map((l) => `landmark.${l.id}`),
      );
    }
    // Always track the two reference electrodes — they give the pixels-per-
    // millimetre scale used to mark a challenge answer — and the current
    // target, even while it is hidden.
    names.push(SCALE_REFERENCE.a, SCALE_REFERENCE.b);
    if (challenge) {
      names.push((challenge.mode === 'auscultation' ? 'site.' : 'lead.') + challenge.targetId);
    }
    return Array.from(new Set(names));
  }, [mode, hidden, challenge]);

  const onTrack = useCallback(
    (positions: Map<string, ScreenPoint>, size: { width: number; height: number }) => {
      setScreen(positions);
      setStageSize((prev) =>
        prev.width === size.width && prev.height === size.height ? prev : size,
      );
    },
    [],
  );

  /* ------------------------------------------------------ derived text -- */

  const soundsHere = site
    ? site.soundIds.map((id) => heartSoundById.get(id)).filter((s): s is HeartSound => Boolean(s))
    : [];

  const placedLimb = ['ra', 'la', 'll'].every((id) => !hidden.has(`lead.${id}`));
  const monitorReady = mode === 'leads' && showElectrodes && !challenge && placedLimb;

  /* ------------------------------------------------------------- render -- */

  return (
    <div className="exam-shell">
      {/* ------------------------------------------------------- toolbar -- */}
      <div className="exam-toolbar">
        <div className="exam-modes" role="group" aria-label="Examination mode">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={'view-mode' + (mode === m.id ? ' active' : '')}
              aria-pressed={mode === m.id}
              onClick={() => {
                setMode(m.id);
                setFeedback(null);
              }}
            >
              <Icon name={m.icon} size={14} />
              {m.label}
            </button>
          ))}
        </div>

        <div className="exam-sex" role="group" aria-label="Anatomy">
          {(['male', 'female'] as ThoraxSex[]).map((s) => (
            <button
              key={s}
              type="button"
              className={'view-mode' + (sex === s ? ' active' : '')}
              aria-pressed={sex === s}
              onClick={() => setSex(s)}
            >
              {s === 'male' ? 'Male' : 'Female'}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={'btn btn-sm ' + (challengeOn ? 'btn-primary' : 'btn-ghost')}
          aria-pressed={challengeOn}
          onClick={() => {
            setChallengeOn((v) => !v);
            setFeedback(null);
            setPin(null);
            setScore({ right: 0, asked: 0 });
            // Answering needs the whole chest in view, not a close-up of the
            // electrode that happened to be selected beforehand.
            stageApi.current?.reset();
          }}
          disabled={mode === 'anatomy'}
          title={mode === 'anatomy' ? 'Challenge mode covers lead placement and auscultation' : undefined}
        >
          <Icon name="target" size={14} />
          {challengeOn ? 'Challenge on' : 'Challenge me'}
        </button>

        {challengeOn && score.asked > 0 ? (
          <span className="exam-score mono">
            {score.right} / {score.asked}
          </span>
        ) : null}
      </div>

      {/* ---------------------------------------------------------- list -- */}
      <aside className="exam-list" aria-label="Examination points">
        {mode === 'leads' ? (
          <>
            <div className="exam-list-head">
              <h2>The ten electrodes</h2>
              <p>Limb leads and the six precordial positions.</p>
            </div>
            <div className="exam-list-scroll">
              {(['limb', 'precordial'] as const).map((group) => (
                <section key={group} className="exam-group">
                  <h3 className="exam-group-h">
                    {group === 'limb' ? 'Limb electrodes' : 'Precordial electrodes'}
                  </h3>
                  {ecgLeads
                    .filter((l) => l.group === group)
                    .map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        className={'exam-item' + (selectedLead === l.id ? ' active' : '')}
                        aria-current={selectedLead === l.id ? 'true' : undefined}
                        onClick={() => {
                          setSelectedLead(l.id);
                          setMode('leads');
                          stageApi.current?.focus(`lead.${l.id}`);
                        }}
                      >
                        <span
                          className="exam-swatch"
                          style={{ background: l.color }}
                          aria-hidden="true"
                        />
                        <span className="exam-item-body">
                          <span className="exam-item-name">{l.code}</span>
                          <span className="exam-item-meta">{l.landmark}</span>
                        </span>
                      </button>
                    ))}
                </section>
              ))}
            </div>
          </>
        ) : mode === 'auscultation' ? (
          <>
            <div className="exam-list-head">
              <h2>Auscultation areas</h2>
              <p>Where each valve is heard best, and why.</p>
            </div>
            <div className="exam-list-scroll">
              {auscultationSites.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={'exam-item' + (selectedSite === s.id ? ' active' : '')}
                  aria-current={selectedSite === s.id ? 'true' : undefined}
                  onClick={() => {
                    setSelectedSite(s.id);
                    setMode('auscultation');
                    stageApi.current?.focus(`site.${s.id}`);
                    const first = s.soundIds[0];
                    if (first) startListening(first);
                  }}
                >
                  <span className="exam-swatch exam-swatch-site" aria-hidden="true" />
                  <span className="exam-item-body">
                    <span className="exam-item-name">{s.shortName}</span>
                    <span className="exam-item-meta">{s.location}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="exam-list-head">
              <h2>Surface landmarks</h2>
              <p>The bony points and lines every position is defined by.</p>
            </div>
            <div className="exam-list-scroll">
              {surfaceLandmarks.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={'exam-item' + (selectedLandmark === l.id ? ' active' : '')}
                  aria-current={selectedLandmark === l.id ? 'true' : undefined}
                  onClick={() => {
                    setSelectedLandmark(l.id);
                    stageApi.current?.focus(`landmark.${l.id}`);
                  }}
                >
                  <span className="exam-swatch exam-swatch-landmark" aria-hidden="true" />
                  <span className="exam-item-body">
                    <span className="exam-item-name">{l.short}</span>
                    <span className="exam-item-meta">{l.name}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </aside>

      {/* --------------------------------------------------------- stage -- */}
      <div className="exam-stage-col">
        <div className={'exam-stage stage' + (mode === 'auscultation' ? ' is-listening' : '')}>
          <ChestStage
            sex={sex}
            hidden={hidden}
            selected={selectedMesh}
            onSelect={handleSelect}
            onHover={setHovered}
            track={tracked}
            onTrack={onTrack}
            onCanvasClick={answerChallenge}
            autoRotate={autoRotate}
            apiRef={stageApi}
            onError={setViewerError}
            overlay={
              <>
                {/* cables from each electrode to the monitor */}
                {mode === 'leads' && screen.size ? (
                  <svg className="exam-cables" aria-hidden="true" preserveAspectRatio="none">
                    {ecgLeads.map((l) => {
                      const p = screen.get(`lead.${l.id}`);
                      if (!p || !p.visible) return null;
                      return (
                        <path
                          key={l.id}
                          d={cablePath(p, stageSize)}
                          className="exam-cable"
                          style={{ stroke: l.color }}
                        />
                      );
                    })}
                  </svg>
                ) : null}

                {/* labels that track the model */}
                {[...screen.entries()].map(([name, p]) => {
                  if (!p.visible || hidden.has(name)) return null;
                  const [kind, id] = name.split('.');
                  const isSelected = name === selectedMesh;
                  const isHovered = hovered?.name === name;
                  if (!isSelected && !isHovered) return null;
                  const label =
                    kind === 'lead'
                      ? (ecgLeads.find((l) => l.id === id)?.code ?? id)
                      : kind === 'site'
                        ? (auscultationSites.find((s) => s.id === id)?.shortName ?? id)
                        : (surfaceLandmarks.find((l) => l.id === id)?.short ?? id);
                  const detail =
                    kind === 'lead'
                      ? (ecgLeads.find((l) => l.id === id)?.landmark ?? '')
                      : kind === 'site'
                        ? (auscultationSites.find((s) => s.id === id)?.location ?? '')
                        : (surfaceLandmarks.find((l) => l.id === id)?.name ?? '');
                  return (
                    <div
                      key={name}
                      className={'chest-tag' + (isSelected ? ' is-selected' : '')}
                      style={{ left: p.x, top: p.y }}
                    >
                      <span className="chest-tag-name">{label}</span>
                      <span className="chest-tag-detail">{detail}</span>
                    </div>
                  );
                })}

                {/* where the learner pointed, in challenge mode */}
                {pin ? (
                  <div
                    className={'exam-pin' + (pin.ok ? ' is-ok' : ' is-bad')}
                    style={{ left: pin.x, top: pin.y }}
                    aria-hidden="true"
                  />
                ) : null}

                {/* stethoscope, following the selected auscultation area */}
                {mode === 'auscultation' && selectedSite ? (
                  (() => {
                    const p = screen.get(`site.${selectedSite}`);
                    if (!p || !p.visible) return null;
                    return (
                      <div
                        className={'steth' + (listening ? ' is-live' : '')}
                        style={{ left: p.x, top: p.y }}
                        aria-hidden="true"
                      >
                        <span className="steth-bell" />
                        <span className="steth-tube" />
                      </div>
                    );
                  })()
                ) : null}

                {/* stage controls */}
                <div className="exam-stage-controls">
                  <div className="ctrl-cluster">
                    <button
                      type="button"
                      className="ctrl-btn"
                      onClick={() => stageApi.current?.reset()}
                      aria-label="Reset the view"
                      title="Reset view"
                    >
                      <Icon name="refresh" size={13} />
                    </button>
                    <button
                      type="button"
                      className="ctrl-btn"
                      aria-pressed={autoRotate}
                      onClick={() => setAutoRotate((v) => !v)}
                      aria-label="Rotate the model automatically"
                      title="Auto-rotate"
                    >
                      <Icon name="refresh" size={13} />
                      Rotate
                    </button>
                    {mode === 'leads' ? (
                      <button
                        type="button"
                        className="ctrl-btn"
                        aria-pressed={showElectrodes}
                        onClick={() => setShowElectrodes((v) => !v)}
                      >
                        <Icon name={showElectrodes ? 'eye' : 'eye-off'} size={13} />
                        {showElectrodes ? 'All electrodes' : 'Selected only'}
                      </button>
                    ) : null}
                    {mode === 'auscultation' ? (
                      <>
                        <button
                          type="button"
                          className="ctrl-btn"
                          aria-pressed={chestPiece === 'diaphragm'}
                          onClick={() => setChestPiece('diaphragm')}
                          title="The diaphragm favours higher-pitched sounds"
                        >
                          Diaphragm
                        </button>
                        <button
                          type="button"
                          className="ctrl-btn"
                          aria-pressed={chestPiece === 'bell'}
                          onClick={() => setChestPiece('bell')}
                          title="The bell transmits low-pitched sounds such as S3, S4 and the mitral rumble"
                        >
                          Bell
                        </button>
                      </>
                    ) : null}
                  </div>
                  <p className="viewer-hint">
                    <span className="hint-mouse">
                      Drag to rotate · scroll to zoom · click the chest to{' '}
                      {mode === 'auscultation' ? 'listen' : 'select'}
                    </span>
                    <span className="hint-touch">
                      Drag to rotate · pinch to zoom · tap the chest to{' '}
                      {mode === 'auscultation' ? 'listen' : 'select'}
                    </span>
                  </p>
                </div>

                {/* challenge prompt */}
                {challenge ? (
                  <div className={'exam-challenge' + (feedback ? (feedback.ok ? ' is-ok' : ' is-bad') : '')}>
                    <div className="exam-challenge-head">
                      <Icon name="target" size={14} />
                      <span>{challenge.prompt}</span>
                    </div>
                    {feedback ? (
                      <>
                        <p className="exam-challenge-feedback">
                          <strong>{feedback.title} —</strong> {feedback.detail}
                        </p>
                        <button type="button" className="btn btn-primary btn-sm" onClick={nextChallenge}>
                          Next question
                          <Icon name="arrow-right" size={13} />
                        </button>
                      </>
                    ) : (
                      <p className="exam-challenge-hint">
                        Click the chest where it belongs. Hint: {challenge.hint}
                      </p>
                    )}
                  </div>
                ) : null}
              </>
            }
          />

          {/* the monitor the electrodes are wired to */}
          {mode === 'leads' ? (
            <div className={'exam-monitor' + (monitorReady ? ' is-live' : '')}>
              <div className="exam-monitor-head">
                <span>CIG CardioSim</span>
                <span className="mono">{monitorReady ? 'II' : 'LEADS OFF'}</span>
              </div>
              <div className="exam-monitor-screen">
                {monitorReady ? (
                  <MonitorScreen
                    rhythm={session.rhythm}
                    signals={session.signals}
                    clockRef={session.clockRef}
                    playing={session.playing}
                    windowSeconds={4}
                    channels={COMPACT_CHANNELS.slice(0, 1)}
                  />
                ) : (
                  <div className="exam-monitor-off">
                    <Icon name="warning" size={14} />
                    <span>
                      No signal — the monitor needs RA, LA and LL on the patient before it can
                      record lead II.
                    </span>
                  </div>
                )}
              </div>
              <p className="exam-monitor-foot">
                Patient → electrodes → monitor → waveform. Lead II is the difference in potential
                between the right arm and the left leg.
              </p>
            </div>
          ) : null}
        </div>

        {viewerError ? (
          <p className="exam-error-note">
            <Icon name="info" size={13} />
            {viewerError} The panels beside the model remain fully usable.
          </p>
        ) : null}

        {/* auscultation controls under the stage */}
        {mode === 'auscultation' && site ? (
          <div className="exam-audio">
            <div className="exam-audio-head">
              <div>
                <span className="eyebrow eyebrow-blue">Listening at the {site.shortName} area</span>
                <h3>{sound?.name ?? 'Select a sound'}</h3>
              </div>
              <div className="tag-row">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => (listening ? stopListening() : startListening(soundId))}
                >
                  <Icon name={listening ? 'pause' : 'play'} size={13} />
                  {listening ? 'Stop' : 'Listen'}
                </button>
              </div>
            </div>

            <div className="tag-row exam-sound-row">
              {soundsHere.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={'filter-chip filter-chip-blue' + (soundId === s.id ? ' active' : '')}
                  aria-pressed={soundId === s.id}
                  onClick={() => startListening(s.id)}
                >
                  {s.name}
                </button>
              ))}
            </div>

            {sound ? (
              <>
                <CycleTimeline sound={sound} phase={phase} />
                <p className="exam-audio-note">
                  <Icon name="info" size={13} />
                  Synthesised teaching sounds, generated from the timing and frequency model in the
                  content files and locked to the cycle shown above. They are a schematic
                  representation, not a clinical recording.
                </p>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* --------------------------------------------------------- detail -- */}
      <aside className="exam-detail" aria-label="Details">
        <div className="exam-detail-scroll">
          {mode === 'leads' && lead ? (
            <>
              <header className="exam-detail-head">
                <span className="eyebrow eyebrow-blue">
                  {lead.group === 'limb' ? 'Limb electrode' : 'Precordial electrode'}
                </span>
                <h2>
                  <span className="exam-detail-swatch" style={{ background: lead.color }} />
                  {lead.code}
                </h2>
                <p className="exam-detail-sub">{lead.name}</p>
                <div className="tag-row">
                  <Chip tone="blue" block>
                    {lead.colorName}
                  </Chip>
                </div>
              </header>

              <section>
                <h3 className="ecg-h">Where it goes</h3>
                <p className="exam-landmark">{lead.landmark}</p>
                <p className="ecg-prose">{lead.howToFind}</p>
              </section>

              <section>
                <h3 className="ecg-h">Why the position matters</h3>
                <p className="ecg-prose">{lead.why}</p>
              </section>

              <section>
                <h3 className="ecg-h">What it looks at</h3>
                <p className="ecg-prose">{lead.views}</p>
              </section>

              <section>
                <h3 className="ecg-h">Common errors</h3>
                <ul className="bullets">
                  {lead.pitfalls.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="ecg-h">See the rhythm</h3>
                <div className="tag-row">
                  <A href="/learn/ecg" className="filter-chip filter-chip-blue">
                    <Icon name="monitor" size={11} />
                    Open the bedside monitor
                  </A>
                </div>
              </section>
            </>
          ) : null}

          {mode === 'auscultation' && site ? (
            <>
              <header className="exam-detail-head">
                <span className="eyebrow eyebrow-blue">Auscultation area</span>
                <h2>{site.name}</h2>
                <p className="exam-detail-sub">{site.location}</p>
                <div className="tag-row">
                  <Chip tone="blue" block>
                    {site.valve}
                  </Chip>
                </div>
              </header>

              <section>
                <h3 className="ecg-h">Why here</h3>
                <p className="ecg-prose">{site.why}</p>
              </section>

              <section>
                <h3 className="ecg-h">Listen for</h3>
                <ul className="bullets">
                  {site.listenFor.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="ecg-h">Technique</h3>
                <p className="ecg-prose">{site.technique}</p>
              </section>

              {sound ? (
                <section>
                  <h3 className="ecg-h">{sound.name}</h3>
                  <div className="tag-row" style={{ marginBottom: 'var(--s-3)' }}>
                    <Chip tone="blue">{sound.timing === 'none' ? 'Normal sounds' : sound.timing}</Chip>
                    <Chip tone="blue">{sound.pitch} pitch</Chip>
                    {sound.grade ? <Chip tone="blue" block>{sound.grade}</Chip> : null}
                  </div>
                  <p className="ecg-prose">{sound.description}</p>
                  <h4 className="exam-sub-h">Mechanism</h4>
                  <p className="ecg-prose">{sound.mechanism}</p>
                  {sound.radiation ? (
                    <>
                      <h4 className="exam-sub-h">Radiation</h4>
                      <p className="ecg-prose">{sound.radiation}</p>
                    </>
                  ) : null}
                  {sound.manoeuvres?.length ? (
                    <>
                      <h4 className="exam-sub-h">Manoeuvres</h4>
                      <ul className="bullets">
                        {sound.manoeuvres.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  <h4 className="exam-sub-h">Associated findings</h4>
                  <ul className="bullets">
                    {sound.associated.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                  {sound.relatedDiseases.length ? (
                    <div className="tag-row" style={{ marginTop: 'var(--s-3)' }}>
                      {sound.relatedDiseases.map((id) => {
                        const d = diseaseById.get(id);
                        return d ? (
                          <A key={id} href={`/diseases/${d.id}`} className="filter-chip filter-chip-blue">
                            <Icon name="pulse" size={11} />
                            {d.name}
                          </A>
                        ) : null;
                      })}
                    </div>
                  ) : null}
                  <div style={{ marginTop: 'var(--s-4)' }}>
                    <h3 className="ecg-h">References</h3>
                    <References items={resolveReferences(sound.references)} />
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          {mode === 'anatomy' && landmark ? (
            <>
              <header className="exam-detail-head">
                <span className="eyebrow eyebrow-blue">Surface landmark</span>
                <h2>{landmark.name}</h2>
                <p className="exam-detail-sub">{landmark.kind}</p>
              </header>
              <section>
                <p className="ecg-prose">{landmark.note}</p>
              </section>
              <section>
                <h3 className="ecg-h">Used by</h3>
                <div className="tag-row">
                  {ecgLeads
                    .filter((l) => l.landmark.toLowerCase().includes(landmark.short.toLowerCase().replace(/^\d+\w* /, '')))
                    .map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        className="filter-chip"
                        onClick={() => {
                          setMode('leads');
                          setSelectedLead(l.id);
                        }}
                      >
                        {l.code}
                      </button>
                    ))}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
};
