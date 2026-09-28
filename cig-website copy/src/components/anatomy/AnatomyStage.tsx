/* ==========================================================================
   CIG — The 3D anatomy stage
   --------------------------------------------------------------------------
   Owns the WebGL canvas and the CardioViewer lifecycle. Everything above it
   (selection, view mode, isolation) is plain React state, so the same stage
   powers both the full anatomy page and the compact homepage preview.
   ========================================================================== */

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CardioViewer, loadModel, type ViewMode } from '../../lib/cardio3d';
import { structureByMesh } from '../../lib/content';
import { LoadingState } from '../ui/states';

export interface StageApi {
  focus: (mesh: string | null) => void;
  reset: () => void;
}

export interface AnatomyStageProps {
  selectedMesh: string | null;
  viewMode: ViewMode;
  isolated: boolean;
  hidden: Set<string>;
  onSelect: (mesh: string | null) => void;
  onHover?: (mesh: string | null) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
  autoRotate?: boolean;
  compact?: boolean;
  /** Rendered inside the stage, above the canvas. */
  overlay?: ReactNode;
  /** Shows a floating label for the hovered or selected structure. */
  showTooltip?: boolean;
  apiRef?: { current: StageApi | null };
  className?: string;
  initialRadius?: number;
  initialTarget?: [number, number, number];
}

export const AnatomyStage = ({
  selectedMesh,
  viewMode,
  isolated,
  hidden,
  onSelect,
  onHover,
  onReady,
  onError,
  autoRotate = false,
  compact = false,
  overlay,
  showTooltip = true,
  apiRef,
  className = '',
  initialRadius,
  initialTarget,
}: AnatomyStageProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<CardioViewer | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [hoveredMesh, setHoveredMesh] = useState<string | null>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);

  // Keep the latest callbacks without re-creating the viewer.
  const handlers = useRef({ onSelect, onHover, onError, onReady });
  handlers.current = { onSelect, onHover, onError, onReady };

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const start = async () => {
      try {
        const model = await loadModel();
        if (cancelled || !canvasRef.current) return;

        const viewer = new CardioViewer(canvasRef.current, model.parts, {
          compact,
          autoRotate,
          reducedMotion,
          initialCamera:
            initialRadius || initialTarget
              ? {
                  ...(initialRadius ? { radius: initialRadius } : {}),
                  ...(initialTarget ? { target: initialTarget } : {}),
                }
              : undefined,
          onSelect: (name) => handlers.current.onSelect(name),
          onHover: (name) => {
            setHoveredMesh(name);
            handlers.current.onHover?.(name);
          },
          onError: (message) => {
            if (cancelled) return;
            setStatus('error');
            setErrorMessage(message);
            handlers.current.onError?.(message);
          },
        });

        viewerRef.current = viewer;
        if (apiRef) {
          apiRef.current = {
            focus: (mesh) => viewer.focusOn(mesh),
            reset: () => viewer.resetView(),
          };
        }
        setStatus('ready');
        handlers.current.onReady?.();
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error && err.message === 'webgl2-unavailable'
            ? 'Your browser does not support WebGL2, which this viewer needs.'
            : 'The interactive anatomy could not be initialised.';
        setStatus('error');
        setErrorMessage(message);
        handlers.current.onError?.(message);
      }
    };

    void start();

    return () => {
      cancelled = true;
      viewerRef.current?.dispose();
      viewerRef.current = null;
      if (apiRef) apiRef.current = null;
    };
    // Intentionally mounts once: subsequent prop changes are pushed below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-frame the camera when the view mode changes, but not on first mount —
  // the initial framing comes from `initialRadius`.
  const firstMode = useRef(true);
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.setViewMode(viewMode, !firstMode.current && !compact);
    firstMode.current = false;
  }, [viewMode, compact, status]);

  useEffect(() => {
    viewerRef.current?.setSelected(selectedMesh);
  }, [selectedMesh]);

  useEffect(() => {
    viewerRef.current?.setIsolated(isolated ? selectedMesh : null);
  }, [isolated, selectedMesh]);

  useEffect(() => {
    viewerRef.current?.setHidden(hidden);
  }, [hidden]);

  useEffect(() => {
    viewerRef.current?.setAutoRotate(autoRotate);
  }, [autoRotate]);

  // Track the on-screen position of whichever structure the tooltip describes.
  const tipMesh = hoveredMesh ?? (compact ? selectedMesh : null);
  useEffect(() => {
    if (!showTooltip || !tipMesh) {
      setTipPos(null);
      return;
    }
    let raf = 0;
    const track = () => {
      const p = viewerRef.current?.project(tipMesh);
      setTipPos(p && p.visible ? { x: p.x, y: p.y } : null);
      raf = requestAnimationFrame(track);
    };
    raf = requestAnimationFrame(track);
    return () => cancelAnimationFrame(raf);
  }, [tipMesh, showTooltip]);

  const tipStructure = tipMesh ? structureByMesh.get(tipMesh) : undefined;

  return (
    <div className={'viewer ' + className}>
      <canvas
        ref={canvasRef}
        aria-label="Interactive three-dimensional cardiovascular model. Use the structure list beside the model for a keyboard-accessible alternative."
        role="img"
      />

      {status === 'loading' ? (
        <LoadingState
          title="Loading cardiovascular anatomy…"
          detail="Generating the cardiac chambers, valves, vessels and conduction system."
        />
      ) : null}

      {status === 'error' ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            padding: 'var(--s-6)',
            textAlign: 'center',
          }}
          role="alert"
        >
          <div style={{ maxWidth: '40ch' }}>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>
              Interactive anatomy is temporarily unavailable
            </p>
            <p style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-2)' }}>
              {errorMessage} Every structure is still fully readable from the list and information
              panel.
            </p>
          </div>
        </div>
      ) : null}

      {showTooltip && tipPos && tipStructure ? (
        <div className="hotspot-tip" style={{ left: tipPos.x, top: tipPos.y }}>
          <h6>{tipStructure.name}</h6>
          <p>{tipStructure.summary}</p>
        </div>
      ) : null}

      {overlay ? <div className="viewer-overlay">{overlay}</div> : null}
    </div>
  );
};
