/* ==========================================================================
   CIG — The 3D chest stage
   --------------------------------------------------------------------------
   Owns a CardioViewer showing the thorax model. Identical in spirit to the
   anatomy stage: the renderer draws named parts and reports which one the
   pointer is over, and everything above it — which electrode is selected,
   what has been placed, which mode is active — is plain React state.

   It also projects the 3D position of every visible marker into screen space
   each frame, which is what lets HTML labels and the electrode cables track
   the model as it is rotated.
   ========================================================================== */

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CardioViewer } from '../../lib/cardio3d/renderer';
import {
  buildThoraxModel,
  THORAX_CAMERA,
  THORAX_VIEW,
  type ThoraxMarker,
  type ThoraxSex,
} from '../../lib/cardio3d/thorax';
import { auscultationSites, ecgLeads, surfaceLandmarks } from '../../lib/content';
import { LoadingState } from '../ui/states';
import type { ChestPoint } from '../../lib/types';

export interface ScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}

export interface ChestStageApi {
  focus: (name: string | null) => void;
  reset: () => void;
}

export interface ChestStageProps {
  sex: ThoraxSex;
  /** Mesh names to hide entirely (also makes them unpickable). */
  hidden: Set<string>;
  /** Mesh name to highlight. */
  selected: string | null;
  onSelect: (marker: ThoraxMarker | null) => void;
  onHover?: (marker: ThoraxMarker | null) => void;
  /** Mesh names whose screen position should be reported every frame. */
  track?: string[];
  onTrack?: (positions: Map<string, ScreenPoint>, size: { width: number; height: number }) => void;
  /**
   * A click anywhere on the chest, in canvas coordinates. Used by challenge
   * mode, where the learner points at the chest rather than at a marker.
   */
  onCanvasClick?: (point: { x: number; y: number }) => void;
  autoRotate?: boolean;
  apiRef?: { current: ChestStageApi | null };
  overlay?: ReactNode;
  onError?: (message: string) => void;
}

const asPoint = (p: ChestPoint): [number, number, number] => [p[0], p[1], p[2]];

export const ChestStage = ({
  sex,
  hidden,
  selected,
  onSelect,
  onHover,
  track,
  onTrack,
  onCanvasClick,
  autoRotate = false,
  apiRef,
  overlay,
  onError,
}: ChestStageProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<CardioViewer | null>(null);
  const markersRef = useRef<Map<string, ThoraxMarker>>(new Map());
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const handlers = useRef({ onSelect, onHover, onTrack, onError, track, onCanvasClick });
  handlers.current = { onSelect, onHover, onTrack, onError, track, onCanvasClick };

  /* The viewer owns pointer events on the canvas for orbiting and picking, so
     the raw click is observed alongside it — and ignored if the pointer moved,
     which means the learner was rotating the model rather than pointing. */
  const down = useRef({ x: 0, y: 0, moved: 0 });

  /* Build the model for the current sex. Rebuilding is cheap — the geometry
     is generated in code — and it keeps electrode positions honest, since
     several of them differ between the male and female chest wall. */
  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setStatus('loading');
    const reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const start = async () => {
      // Yield once so the loading state can paint before geometry generation.
      await new Promise((r) => setTimeout(r, 0));
      if (cancelled || !canvasRef.current) return;

      const model = buildThoraxModel({
        sex,
        leads: ecgLeads.map((l) => ({
          id: l.id,
          position: asPoint(sex === 'female' && l.positionFemale ? l.positionFemale : l.position),
          color: l.color,
        })),
        sites: auscultationSites.map((s) => ({
          id: s.id,
          position: asPoint(sex === 'female' && s.positionFemale ? s.positionFemale : s.position),
        })),
        landmarks: surfaceLandmarks.map((l) => ({
          id: l.id,
          position: asPoint(sex === 'female' && l.positionFemale ? l.positionFemale : l.position),
        })),
      });

      markersRef.current = new Map(model.markers.map((m) => [m.name, m]));

      try {
        const viewer = new CardioViewer(canvasRef.current, model.parts, {
          reducedMotion,
          autoRotate,
          initialCamera: { radius: THORAX_CAMERA.radius, target: [...THORAX_CAMERA.target] },
          onSelect: (name) => {
            handlers.current.onSelect(name ? (markersRef.current.get(name) ?? null) : null);
          },
          onHover: (name) => {
            handlers.current.onHover?.(name ? (markersRef.current.get(name) ?? null) : null);
          },
          onError: (m) => {
            if (cancelled) return;
            setStatus('error');
            setMessage(m);
            handlers.current.onError?.(m);
          },
        });
        viewer.setViewMode(THORAX_VIEW, false);
        viewerRef.current = viewer;
        if (apiRef) {
          apiRef.current = {
            // Frame the marker without diving into it: an electrode is a few
            // millimetres across, so focusing on its own bounds would put the
            // camera inside the chest wall.
            focus: (name) => {
              const marker = name ? markersRef.current.get(name) : null;
              if (marker) viewer.frameTo(7.8, [...marker.position]);
              else viewer.frameTo(THORAX_CAMERA.radius, [...THORAX_CAMERA.target]);
            },
            reset: () => viewer.frameTo(THORAX_CAMERA.radius, [...THORAX_CAMERA.target]),
          };
        }
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error && err.message === 'webgl2-unavailable'
            ? 'Your browser does not support WebGL2, which this viewer needs.'
            : 'The interactive chest could not be initialised.';
        setStatus('error');
        setMessage(msg);
        handlers.current.onError?.(msg);
      }
    };

    void start();

    return () => {
      cancelled = true;
      viewerRef.current?.dispose();
      viewerRef.current = null;
      if (apiRef) apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sex]);

  useEffect(() => {
    viewerRef.current?.setHidden(hidden);
  }, [hidden, status]);

  useEffect(() => {
    viewerRef.current?.setSelected(selected);
  }, [selected, status]);

  useEffect(() => {
    viewerRef.current?.setAutoRotate(autoRotate);
  }, [autoRotate]);

  /* Screen-space tracking for the HTML labels and the electrode cables. */
  useEffect(() => {
    if (!track || !track.length || !onTrack) return;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const viewer = viewerRef.current;
      if (!viewer) return;
      const out = new Map<string, ScreenPoint>();
      for (const name of handlers.current.track ?? []) {
        const p = viewer.project(name);
        if (p) out.set(name, p);
      }
      const el = canvasRef.current;
      const size = el
        ? { width: el.clientWidth, height: el.clientHeight }
        : { width: 0, height: 0 };
      handlers.current.onTrack?.(out, size);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [track, onTrack, status]);

  return (
    <div className="viewer chest-viewer">
      <canvas
        ref={canvasRef}
        onPointerDown={(e: { clientX: number; clientY: number }) => {
          down.current = { x: e.clientX, y: e.clientY, moved: 0 };
        }}
        onPointerMove={(e: { clientX: number; clientY: number }) => {
          down.current.moved += Math.abs(e.clientX - down.current.x) + Math.abs(e.clientY - down.current.y);
          down.current.x = e.clientX;
          down.current.y = e.clientY;
        }}
        onClick={(e: { clientX: number; clientY: number }) => {
          if (down.current.moved > 6) return;
          const el = canvasRef.current;
          if (!el) return;
          const rect = el.getBoundingClientRect();
          handlers.current.onCanvasClick?.({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }}
        aria-label="Interactive three-dimensional model of the thorax. Every electrode position and auscultation area is also listed beside the model as a keyboard-accessible alternative."
        role="img"
      />

      {status === 'loading' ? (
        <LoadingState
          title="Building the thorax…"
          detail="Generating the chest wall, ribs, sternum and the heart beneath them."
        />
      ) : null}

      {status === 'error' ? (
        <div className="chest-error" role="alert">
          <div>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>
              The interactive chest is temporarily unavailable
            </p>
            <p style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-2)' }}>
              {message} Every electrode position, landmark and auscultation area is still fully
              described in the panels beside the model.
            </p>
          </div>
        </div>
      ) : null}

      {overlay ? <div className="viewer-overlay">{overlay}</div> : null}
    </div>
  );
};
