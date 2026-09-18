/* ==========================================================================
   CIG — Clinical simulation session
   --------------------------------------------------------------------------
   One encounter with one patient: which case is on the bed, how far through
   the workflow the learner is, where they put each electrode, what they heard,
   what they answered, what they got wrong and what it all scores.

   The hook owns *state*; it owns no content. Cases, electrode targets,
   questions, stages and scoring weights all come from /content, so the
   simulation can be re-authored without touching a component.
   ========================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  clinicalCaseById,
  ecgRhythmById,
  ecgRhythms,
  randomCaseForLevel,
  simLevelById,
  simLevels,
  simScoring,
  torsoElectrodes,
  torsoMap,
} from '../../lib/content';
import type {
  ClinicalCase,
  EcgRhythm,
  SimLevel,
  SimLevelId,
  SimQuestion,
  SimStage,
  TorsoElectrodeSite,
} from '../../lib/types';

/* ------------------------------------------------------------- Placement -- */

export interface PlacedElectrode {
  leadId: string;
  /** Where the learner actually put it, in torso view units. */
  x: number;
  y: number;
  /** True when it landed within tolerance of the anatomical target. */
  correct: boolean;
  /** True when it went down correctly without a wrong attempt first. */
  firstTime: boolean;
}

export interface SimMistake {
  id: string;
  /** Which part of the encounter it happened in. */
  area: 'placement' | 'analysis' | 'reasoning';
  title: string;
  detail: string;
  /** What the learner should take away. */
  correction: string;
}

export interface SimScoreLine {
  id: 'placement' | 'analysis' | 'reasoning';
  label: string;
  description: string;
  score: number;
  max: number;
}

export interface SimScore {
  lines: SimScoreLine[];
  total: number;
  max: number;
  fraction: number;
  band: { label: string; note: string };
}

/* ------------------------------------------------------------------ Hook -- */

export interface SimulationSession {
  level: SimLevel;
  levels: SimLevel[];
  setLevel: (id: SimLevelId) => void;

  activeCase: ClinicalCase;
  /**
   * The rhythm that generates the waveform, with the *case's* observations
   * substituted for the rhythm's generic ones — so the monitor above the bed
   * shows this patient's numbers rather than the library's.
   */
  monitorRhythm: EcgRhythm;

  stage: SimStage;
  stages: SimStage[];
  stageIndex: number;
  goToStage: (stage: SimStage) => void;
  advance: () => void;

  /* --- electrode placement --- */
  electrodes: TorsoElectrodeSite[];
  placed: Map<string, PlacedElectrode>;
  activeElectrode: TorsoElectrodeSite | null;
  selectElectrode: (leadId: string) => void;
  /** Attempts to place the active electrode at a point on the torso. */
  placeAt: (x: number, y: number) => { correct: boolean; message: string } | null;
  removeElectrode: (leadId: string) => void;
  /** Reveals the target for the active electrode, at a cost. */
  revealHint: () => void;
  hintedLeads: Set<string>;
  lastFeedback: { leadId: string; correct: boolean; message: string } | null;
  clearFeedback: () => void;
  allPlaced: boolean;

  /* --- acquisition --- */
  acquired: boolean;
  acquire: () => void;

  /* --- auscultation --- */
  listenedSites: Set<string>;
  markListened: (siteId: string) => void;

  /* --- questions --- */
  questions: SimQuestion[];
  questionIndex: number;
  currentQuestion: SimQuestion | null;
  answers: Map<string, string>;
  answer: (questionId: string, optionId: string) => void;
  nextQuestion: () => void;
  answeredAll: boolean;

  /* --- outcome --- */
  score: SimScore;
  mistakes: SimMistake[];
  elapsedSeconds: number;

  /* --- lifecycle --- */
  newCase: () => void;
  restartCase: () => void;
  /** True until the learner's browser has mounted the module. */
  caseNumber: number;
}

const DEFAULT_LEVEL: SimLevelId = 'beginner';

const fallbackCase = (levelId: SimLevelId): ClinicalCase =>
  randomCaseForLevel(levelId, null) ??
  randomCaseForLevel(DEFAULT_LEVEL, null) ??
  (clinicalCaseById.values().next().value as ClinicalCase);

export const useSimulation = (
  initialLevelId?: string,
  initialCaseId?: string,
): SimulationSession => {
  const [levelId, setLevelId] = useState<SimLevelId>(() =>
    initialLevelId && simLevelById.has(initialLevelId as SimLevelId)
      ? (initialLevelId as SimLevelId)
      : DEFAULT_LEVEL,
  );
  const level = simLevelById.get(levelId) ?? simLevels[0];

  /* The first case is chosen deterministically on the server and re-rolled on
     the client, because a random pick during render would make the server and
     the browser disagree and React would throw a hydration mismatch. */
  const firstCase = useMemo(() => {
    if (initialCaseId && clinicalCaseById.has(initialCaseId)) {
      return clinicalCaseById.get(initialCaseId) as ClinicalCase;
    }
    const pool = [...clinicalCaseById.values()].filter((c) => c.levels.includes(levelId));
    return pool[0] ?? fallbackCase(levelId);
    // Deliberately computed once: re-rolling happens through newCase().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeCase, setActiveCase] = useState<ClinicalCase>(firstCase);
  const [caseNumber, setCaseNumber] = useState(1);

  const [stage, setStage] = useState<SimStage>('brief');
  const [placed, setPlaced] = useState<Map<string, PlacedElectrode>>(() => new Map());
  const [attempted, setAttempted] = useState<Set<string>>(() => new Set());
  const [hintedLeads, setHinted] = useState<Set<string>>(() => new Set());
  const [activeLeadId, setActiveLeadId] = useState<string>(torsoElectrodes[0]?.leadId ?? 'ra');
  const [lastFeedback, setLastFeedback] = useState<SimulationSession['lastFeedback']>(null);
  const [placementMistakes, setPlacementMistakes] = useState<SimMistake[]>([]);
  const [acquired, setAcquired] = useState(false);
  const [listenedSites, setListened] = useState<Set<string>>(() => new Set());
  const [answers, setAnswers] = useState<Map<string, string>>(() => new Map());
  const [questionIndex, setQuestionIndex] = useState(0);
  const [elapsedSeconds, setElapsed] = useState(0);

  const startedAt = useRef<number>(0);
  const running = useRef(true);

  /* ---------------------------------------------------------------- reset -- */

  const resetAttempt = useCallback(() => {
    setStage('brief');
    setPlaced(new Map());
    setAttempted(new Set());
    setHinted(new Set());
    setActiveLeadId(torsoElectrodes[0]?.leadId ?? 'ra');
    setLastFeedback(null);
    setPlacementMistakes([]);
    setAcquired(false);
    setListened(new Set());
    setAnswers(new Map());
    setQuestionIndex(0);
    setElapsed(0);
    startedAt.current = typeof performance !== 'undefined' ? performance.now() : 0;
    running.current = true;
  }, []);

  /* The clock runs while the encounter is in progress and stops at the
     debrief, so "time taken" means time spent on the case. */
  useEffect(() => {
    if (startedAt.current === 0 && typeof performance !== 'undefined') {
      startedAt.current = performance.now();
    }
    const id = setInterval(() => {
      if (!running.current || typeof performance === 'undefined') return;
      setElapsed(Math.floor((performance.now() - startedAt.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  /* Deep links stay live. Arriving at /learn/simulation?case=… while the
     module is already mounted — from a link in the debrief, from the browser's
     back button, or from a bookmark opened in the same tab — changes the case
     rather than being silently ignored because the component happened not to
     remount. */
  useEffect(() => {
    if (!initialCaseId) return;
    const next = clinicalCaseById.get(initialCaseId);
    if (!next || next.id === activeCase.id) return;
    setActiveCase(next);
    setCaseNumber((n) => n + 1);
    resetAttempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCaseId]);

  useEffect(() => {
    if (!initialLevelId) return;
    if (!simLevelById.has(initialLevelId as SimLevelId)) return;
    if (initialLevelId === levelId) return;
    setLevelId(initialLevelId as SimLevelId);
    resetAttempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLevelId]);

  const setLevel = useCallback(
    (id: SimLevelId) => {
      if (!simLevelById.has(id)) return;
      setLevelId(id);
      const next = randomCaseForLevel(id, null);
      if (next) setActiveCase(next);
      setCaseNumber((n) => n + 1);
      resetAttempt();
    },
    [resetAttempt],
  );

  const newCase = useCallback(() => {
    const next = randomCaseForLevel(levelId, activeCase.id);
    if (next) setActiveCase(next);
    setCaseNumber((n) => n + 1);
    resetAttempt();
  }, [levelId, activeCase.id, resetAttempt]);

  const restartCase = useCallback(() => {
    resetAttempt();
  }, [resetAttempt]);

  /* ------------------------------------------------------------- content -- */

  const baseRhythm = ecgRhythmById.get(activeCase.ecgRhythmId) ?? ecgRhythms[0];
  const monitorRhythm: EcgRhythm = useMemo(
    () => ({ ...baseRhythm, vitals: activeCase.vitals }),
    [baseRhythm, activeCase],
  );

  const stages = level.stages;
  const stageIndex = Math.max(0, stages.indexOf(stage));

  const questions = useMemo(
    () => activeCase.questions.filter((q) => level.questionKinds.includes(q.kind)),
    [activeCase, level],
  );

  const electrodes = torsoElectrodes;
  const activeElectrode =
    electrodes.find((e) => e.leadId === activeLeadId) ?? electrodes[0] ?? null;
  const allPlaced = placed.size === electrodes.length;

  /* ----------------------------------------------------------- placement -- */

  const selectElectrode = useCallback((leadId: string) => {
    setActiveLeadId(leadId);
    setLastFeedback(null);
  }, []);

  /** Moves the cursor to the next electrode that has not been placed yet. */
  const advanceElectrode = useCallback(
    (justPlaced: string, current: Map<string, PlacedElectrode>) => {
      const next = electrodes.find((e) => e.leadId !== justPlaced && !current.has(e.leadId));
      if (next) setActiveLeadId(next.leadId);
    },
    [electrodes],
  );

  const placeAt = useCallback(
    (x: number, y: number) => {
      const target = activeElectrode;
      if (!target || placed.has(target.leadId)) return null;

      const sex = activeCase.patient.sex;
      const [tx, ty] = sex === 'female' ? target.female : target.male;
      const tolerance = target.tolerance * level.toleranceScale;
      const distance = Math.hypot(x - tx, y - ty);
      const correct = distance <= tolerance;

      if (correct) {
        const firstTime = !attempted.has(target.leadId);
        const next = new Map(placed);
        next.set(target.leadId, { leadId: target.leadId, x: tx, y: ty, correct: true, firstTime });
        setPlaced(next);
        setLastFeedback({
          leadId: target.leadId,
          correct: true,
          message: `${target.code} correct — ${target.cue}`,
        });
        advanceElectrode(target.leadId, next);
        return { correct: true, message: `${target.code} correct.` };
      }

      /* A wrong placement is not accepted. The electrode stays in the
         learner's hand, they are told where it belongs, and the attempt is
         recorded — which is the whole point of evaluating placement rather
         than accepting every click. */
      setAttempted((prev) => {
        const next = new Set(prev);
        next.add(target.leadId);
        return next;
      });
      setLastFeedback({ leadId: target.leadId, correct: false, message: target.correction });
      setPlacementMistakes((prev) =>
        prev.some((m) => m.id === `placement-${target.leadId}`)
          ? prev
          : [
              ...prev,
              {
                id: `placement-${target.leadId}`,
                area: 'placement',
                title: `${target.code} was placed incorrectly`,
                detail:
                  distance < tolerance * 2
                    ? `Your first attempt was close, but just outside the area accepted for ${target.code}.`
                    : distance < tolerance * 4
                      ? `Your first attempt put ${target.code} some way from its landmark.`
                      : `Your first attempt put ${target.code} a long way from its landmark.`,
                correction: target.correction,
              },
            ],
      );
      return { correct: false, message: target.correction };
    },
    [activeElectrode, placed, activeCase, level.toleranceScale, attempted, advanceElectrode],
  );

  const removeElectrode = useCallback(
    (leadId: string) => {
      setPlaced((prev) => {
        const next = new Map(prev);
        next.delete(leadId);
        return next;
      });
      setActiveLeadId(leadId);
      setLastFeedback(null);
      setAcquired(false);
    },
    [],
  );

  const revealHint = useCallback(() => {
    const target = activeElectrode;
    if (!target) return;
    setHinted((prev) => {
      if (prev.has(target.leadId)) return prev;
      const next = new Set(prev);
      next.add(target.leadId);
      return next;
    });
  }, [activeElectrode]);

  const clearFeedback = useCallback(() => setLastFeedback(null), []);

  /* --------------------------------------------------------- acquisition -- */

  const acquire = useCallback(() => {
    if (!allPlaced) return;
    setAcquired(true);
  }, [allPlaced]);

  const markListened = useCallback((siteId: string) => {
    setListened((prev) => {
      if (prev.has(siteId)) return prev;
      const next = new Set(prev);
      next.add(siteId);
      return next;
    });
  }, []);

  /* ----------------------------------------------------------- questions -- */

  const answer = useCallback((questionId: string, optionId: string) => {
    setAnswers((prev) => {
      if (prev.has(questionId)) return prev;
      const next = new Map(prev);
      next.set(questionId, optionId);
      return next;
    });
  }, []);

  const currentQuestion = questions[questionIndex] ?? null;
  const answeredAll = questions.every((q) => answers.has(q.id));

  const nextQuestion = useCallback(() => {
    setQuestionIndex((i) => Math.min(i + 1, Math.max(0, questions.length - 1)));
  }, [questions.length]);

  /* --------------------------------------------------------------- stage -- */

  const goToStage = useCallback(
    (next: SimStage) => {
      if (!stages.includes(next)) return;
      if (next === 'score') running.current = false;
      else running.current = true;
      setStage(next);
    },
    [stages],
  );

  const advance = useCallback(() => {
    const i = stages.indexOf(stage);
    const next = stages[Math.min(i + 1, stages.length - 1)];
    goToStage(next);
  }, [stage, stages, goToStage]);

  /* --------------------------------------------------------------- score -- */

  const { score, mistakes } = useMemo(() => {
    const sectionOf = (id: 'placement' | 'analysis' | 'reasoning') =>
      simScoring.sections.find((s) => s.id === id);

    const lines: SimScoreLine[] = [];
    const list: SimMistake[] = [...placementMistakes];

    /* Placement: a mark per electrode, less the misplacements and the hints. */
    const placementSection = sectionOf('placement');
    if (placementSection) {
      const wrong = placementMistakes.length;
      const hints = hintedLeads.size;
      const raw =
        placementSection.max -
        wrong * simScoring.placementPenalty -
        hints * simScoring.hintPenalty;
      lines.push({
        id: 'placement',
        label: placementSection.label,
        description: placementSection.description,
        score: Math.max(0, Math.round(raw * 10) / 10),
        max: placementSection.max,
      });
    }

    const gradeGroup = (
      id: 'analysis' | 'reasoning',
      kinds: SimQuestion['kind'][],
    ): void => {
      const section = sectionOf(id);
      if (!section) return;
      const group = questions.filter((q) => kinds.includes(q.kind));
      if (!group.length) return;
      let correct = 0;
      for (const q of group) {
        const chosen = answers.get(q.id);
        const option = q.options.find((o) => o.id === chosen);
        if (option?.correct) {
          correct += 1;
        } else if (chosen) {
          const right = q.options.find((o) => o.correct);
          list.push({
            id: `q-${q.id}`,
            area: id,
            title: q.prompt,
            detail: `You answered: ${option?.text ?? '—'}`,
            correction: `${right ? `Correct answer: ${right.text}. ` : ''}${q.explanation}`,
          });
        }
      }
      lines.push({
        id,
        label: section.label,
        description: section.description,
        score: Math.round((correct / group.length) * section.max * 10) / 10,
        max: section.max,
      });
    };

    gradeGroup('analysis', ['rhythm', 'systematic']);
    gradeGroup('reasoning', ['interpretation', 'action']);

    const total = Math.round(lines.reduce((a, l) => a + l.score, 0) * 10) / 10;
    const max = lines.reduce((a, l) => a + l.max, 0) || 1;
    const fraction = total / max;
    const band =
      simScoring.bands.find((b) => fraction >= b.min) ??
      simScoring.bands[simScoring.bands.length - 1];

    return {
      score: { lines, total, max, fraction, band },
      mistakes: list,
    };
  }, [placementMistakes, hintedLeads, questions, answers]);

  return {
    level,
    levels: simLevels,
    setLevel,
    activeCase,
    monitorRhythm,
    stage,
    stages,
    stageIndex,
    goToStage,
    advance,
    electrodes,
    placed,
    activeElectrode,
    selectElectrode,
    placeAt,
    removeElectrode,
    revealHint,
    hintedLeads,
    lastFeedback,
    clearFeedback,
    allPlaced,
    acquired,
    acquire,
    listenedSites,
    markListened,
    questions,
    questionIndex,
    currentQuestion,
    answers,
    answer,
    nextQuestion,
    answeredAll,
    score,
    mistakes,
    elapsedSeconds,
    newCase,
    restartCase,
    caseNumber,
  };
};

/** The torso view box, exported so the stage and the map never disagree. */
export const TORSO_VIEW = { width: torsoMap.width, height: torsoMap.height };
