/* ==========================================================================
   CIG — Pathophysiology animation player
   --------------------------------------------------------------------------
   Play, pause, restart, step forwards and backwards, scrub a timeline and
   change speed — with an explanation panel that stays synchronised with the
   visualisation at all times.
   ========================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../icons/Icon';
import { References } from '../ui/primitives';
import { renderScene, SCENE_VIEWBOX } from './scenes';
import type { SceneContext } from './sceneUtils';
import { resolveReferences } from '../../lib/content';
import type { DiseaseAnimation } from '../../lib/types';

const SPEEDS = [0.5, 1, 1.5, 2];
/** Seconds of playback per unit of a step's `duration` weight. */
const SECONDS_PER_UNIT = 4.2;

export const DiseaseAnimationPlayer = ({
  animation,
  compact = false,
}: {
  animation: DiseaseAnimation;
  compact?: boolean;
}) => {
  const steps = animation.steps;
  const n = steps.length;

  const weights = useMemo(() => steps.map((s) => s.duration || 1), [steps]);
  const totalWeight = useMemo(() => weights.reduce((a, b) => a + b, 0), [weights]);
  /** Cumulative fraction at which each step begins. */
  const starts = useMemo(() => {
    const out: number[] = [];
    let acc = 0;
    for (const w of weights) {
      out.push(acc / totalWeight);
      acc += w;
    }
    return out;
  }, [weights, totalWeight]);

  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const [progress, setProgress] = useState(0); // 0–1 across the whole animation
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [clock, setClock] = useState(0);

  const raf = useRef(0);
  const last = useRef(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const scrubbing = useRef(false);

  // Which step are we in, and how far through it?
  const stepIndex = useMemo(() => {
    let i = 0;
    for (let k = 0; k < n; k++) if (progress >= starts[k] - 1e-6) i = k;
    return Math.min(n - 1, i);
  }, [progress, starts, n]);

  const stepT = useMemo(() => {
    const from = starts[stepIndex];
    const to = stepIndex + 1 < n ? starts[stepIndex + 1] : 1;
    return to > from ? (progress - from) / (to - from) : 1;
  }, [progress, starts, stepIndex, n]);

  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(raf.current);
      return;
    }
    last.current = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last.current);
      last.current = now;
      setClock((c) => c + dt * speed);
      setProgress((p) => {
        const next = p + (dt / 1000) * speed / (SECONDS_PER_UNIT * totalWeight);
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, speed, totalWeight]);

  const goToStep = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(n - 1, i));
      const from = starts[clamped];
      const to = clamped + 1 < n ? starts[clamped + 1] : 1;
      // Land part-way through the step rather than at its very start, so that
      // stepping while paused shows the step's change already formed.
      setProgress(from + (to - from) * 0.68);
    },
    [starts, n],
  );

  const restart = useCallback(() => {
    setProgress(0);
    setClock(0);
    setPlaying(!reduced);
  }, [reduced]);

  const scrubTo = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setProgress(p);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (scrubbing.current) scrubTo(e.clientX);
    };
    const onUp = () => {
      scrubbing.current = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [scrubTo]);

  const ctx: SceneContext = {
    g: progress,
    step: stepIndex,
    t: stepT,
    n,
    clock,
    reduced,
  };

  const step = steps[stepIndex];
  const refs = resolveReferences(animation.references);

  return (
    <figure className="anim-shell stage" style={{ margin: 0 }}>
      <div className="anim-stage">
        <svg
          viewBox={SCENE_VIEWBOX}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${animation.title}: step ${stepIndex + 1} of ${n} — ${step.title}. ${step.text}`}
        >
          {renderScene(animation.scene, ctx)}
        </svg>

        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 14,
            display: 'flex',
            gap: 6,
            alignItems: 'center',
          }}
        >
          <span className="chip chip-amber">
            <span className="chip-dot" />
            Educational visualisation
          </span>
        </div>
      </div>

      <figcaption className="anim-caption" aria-live="polite">
        <div className="anim-step-label">
          Step {String(stepIndex + 1).padStart(2, '0')} — {step.title}
        </div>
        <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', lineHeight: 1.62, maxWidth: '82ch' }}>
          {step.text}
        </p>
        {step.markers?.length ? (
          <div className="tag-row" style={{ marginTop: 'var(--s-3)' }}>
            {step.markers.map((m) => (
              <span className="chip chip-blue" key={m}>
                {m}
              </span>
            ))}
          </div>
        ) : null}
      </figcaption>

      <div className="anim-controls">
        <button
          type="button"
          className="ctrl-btn"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pause animation' : 'Play animation'}
        >
          <Icon name={playing ? 'pause' : 'play'} size={13} />
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          className="ctrl-btn"
          onClick={restart}
          aria-label="Restart animation"
          title="Restart"
        >
          <Icon name="restart" size={13} />
        </button>
        <button
          type="button"
          className="ctrl-btn"
          onClick={() => goToStep(stepIndex - 1)}
          disabled={stepIndex === 0}
          aria-label="Previous step"
          title="Previous step"
        >
          <Icon name="skip-back" size={13} />
        </button>
        <button
          type="button"
          className="ctrl-btn"
          onClick={() => goToStep(stepIndex + 1)}
          disabled={stepIndex >= n - 1}
          aria-label="Next step"
          title="Next step"
        >
          <Icon name="skip-forward" size={13} />
        </button>

        <div
          className="anim-track"
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Animation timeline"
          aria-valuemin={1}
          aria-valuemax={n}
          aria-valuenow={stepIndex + 1}
          aria-valuetext={`Step ${stepIndex + 1} of ${n}: ${step.title}`}
          onPointerDown={(e: { clientX: number }) => {
            scrubbing.current = true;
            scrubTo(e.clientX);
          }}
          onKeyDown={(e: { key: string; preventDefault: () => void }) => {
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              goToStep(stepIndex + 1);
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              goToStep(stepIndex - 1);
            } else if (e.key === 'Home') {
              e.preventDefault();
              goToStep(0);
            } else if (e.key === 'End') {
              e.preventDefault();
              goToStep(n - 1);
            } else if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              setPlaying((p) => !p);
            }
          }}
        >
          <div className="anim-track-bar">
            <div className="anim-track-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="anim-ticks" aria-hidden="true">
            {starts.slice(1).map((s, i) => (
              <span className="anim-tick" key={i} style={{ left: `${s * 100}%` }} />
            ))}
          </div>
        </div>

        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
          {String(stepIndex + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
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

      {!compact ? (
        <div style={{ padding: 'var(--s-5)', borderTop: '1px solid var(--line)' }}>
          <h3 className="footer-h" style={{ marginBottom: 'var(--s-3)' }}>
            Sources for this visualisation
          </h3>
          <References items={refs} />
        </div>
      ) : null}
    </figure>
  );
};
