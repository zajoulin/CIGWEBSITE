/* ==========================================================================
   CIG — ECG session
   --------------------------------------------------------------------------
   One clock, one set of lead signals and one transport, shared by everything
   that shows the patient's rhythm. The room view and the detailed monitor
   view both read from this, so stepping between them never interrupts the
   trace — the patient's heart carries on regardless of where you are
   standing.
   ========================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EcgSignal } from '../../lib/ecg/engine';
import { deriveLeadWaveform } from '../../lib/ecg/leads';
import { MonitorTone } from '../../lib/ecg/monitorTone';
import { ecgRhythmById, ecgRhythms } from '../../lib/content';
import type { EcgFeatureId, EcgRhythm } from '../../lib/types';

/** The rhythm the module opens on. */
export const DEFAULT_RHYTHM = 'normal-sinus-rhythm';

/** Length of the simulated recording in seconds before it loops. */
export const RECORDING = 60;
/** One small square at 25 mm/s. */
export const FRAME = 0.04;
export const SPEEDS = [0.25, 0.5, 1, 2];
/** Seconds of narration per unit of a step's duration weight. */
const SECONDS_PER_UNIT = 3.4;

export interface EcgSession {
  rhythm: EcgRhythm;
  selectRhythm: (id: string) => void;
  signals: Map<string, EcgSignal>;
  leadII: EcgSignal;
  clockRef: { current: number };
  displayTime: number;
  playing: boolean;
  setPlaying: (v: boolean | ((p: boolean) => boolean)) => void;
  speed: number;
  setSpeed: (v: number) => void;
  setClock: (t: number) => void;
  stepFrames: (n: number) => void;
  stepBeat: (dir: 1 | -1) => void;
  restart: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  tone: MonitorTone | null;
  onQrs: (spo2: number) => void;
  /** Index of the narration step the clock is currently inside. */
  narrationIndex: number;
  /** Feature the narration is pointing at right now. */
  autoFeature: EcgFeatureId | null;
  reducedMotion: boolean;
}

export const useEcgSession = (initialRhythmId?: string): EcgSession => {
  const [rhythmId, setRhythmId] = useState<string>(
    initialRhythmId && ecgRhythmById.has(initialRhythmId)
      ? initialRhythmId
      : // Normal sinus rhythm first: every other trace is read against it.
        (ecgRhythmById.has(DEFAULT_RHYTHM)
          ? DEFAULT_RHYTHM
          : (ecgRhythms.find((r) => r.featured)?.id ?? ecgRhythms[0].id)),
  );
  const rhythm = ecgRhythmById.get(rhythmId) ?? ecgRhythms[0];

  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const [playing, setPlaying] = useState(!reducedMotion);
  const [speed, setSpeed] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);

  const clockRef = useRef(0);
  const toneRef = useRef<MonitorTone | null>(null);
  if (toneRef.current === null && typeof window !== 'undefined') {
    toneRef.current = new MonitorTone();
  }

  /* Signals: one per displayed lead. They share a beat schedule, because when
     a beat happens is a property of the heart, not of the electrode. */
  const signals = useMemo(() => {
    const map = new Map<string, EcgSignal>();
    map.set('II', new EcgSignal(rhythm.waveform));
    map.set('V1', new EcgSignal(deriveLeadWaveform(rhythm.waveform, 'V1')));
    return map;
  }, [rhythm]);
  const leadII = signals.get('II') as EcgSignal;

  /* The clock. One animation frame loop drives the whole module; the canvas
     reads clockRef every frame while React re-renders about ten times a
     second, which is all the interface needs. */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastSync = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playing) {
        let next = clockRef.current + dt * speed;
        if (next > RECORDING) next -= RECORDING;
        clockRef.current = next;
      }
      if (now - lastSync > 90) {
        lastSync = now;
        setDisplayTime(clockRef.current);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  useEffect(() => {
    const tone = toneRef.current;
    return () => tone?.dispose();
  }, []);

  useEffect(() => {
    toneRef.current?.setEnabled(soundEnabled);
  }, [soundEnabled]);

  const setClock = useCallback((t: number) => {
    const next = ((t % RECORDING) + RECORDING) % RECORDING;
    clockRef.current = next;
    setDisplayTime(next);
  }, []);

  const stepFrames = useCallback(
    (n: number) => {
      setPlaying(false);
      setClock(clockRef.current + n * FRAME);
    },
    [setClock],
  );

  const stepBeat = useCallback(
    (dir: 1 | -1) => {
      setPlaying(false);
      const t = clockRef.current;
      if (dir > 0) {
        const next = leadII.beatFrom(t + 0.03);
        if (next?.qrsOnset != null) setClock(next.qrsOnset + 0.02);
      } else {
        const current = leadII.beatAt(t - 0.06);
        const prev =
          current && current.qrsOnset !== null ? leadII.beatAt(current.qrsOnset - 0.06) : null;
        if (prev?.qrsOnset != null) setClock(prev.qrsOnset + 0.02);
        else setClock(Math.max(0, t - 60 / rhythm.waveform.rate));
      }
    },
    [leadII, rhythm.waveform.rate, setClock],
  );

  const restart = useCallback(() => {
    setClock(0);
    setPlaying(!reducedMotion);
  }, [reducedMotion, setClock]);

  const onQrs = useCallback((spo2: number) => {
    toneRef.current?.beep(spo2);
  }, []);

  const selectRhythm = useCallback((id: string) => {
    if (ecgRhythmById.has(id)) setRhythmId(id);
  }, []);

  /* Narration position, derived from the same clock. */
  const narrationBounds = useMemo(() => {
    const bounds: { start: number; end: number }[] = [];
    let acc = 0;
    for (const s of rhythm.narration) {
      const d = s.duration * SECONDS_PER_UNIT;
      bounds.push({ start: acc, end: acc + d });
      acc += d;
    }
    return { bounds, total: acc || 1 };
  }, [rhythm]);

  const narrationIndex = useMemo(() => {
    const t = displayTime % narrationBounds.total;
    const i = narrationBounds.bounds.findIndex((b) => t >= b.start && t < b.end);
    return i < 0 ? 0 : i;
  }, [displayTime, narrationBounds]);

  const autoFeature = rhythm.narration[narrationIndex]?.highlight ?? null;

  return {
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
    toggleSound: () => setSoundEnabled((s) => !s),
    tone: toneRef.current,
    onQrs,
    narrationIndex,
    autoFeature,
    reducedMotion,
  };
};
