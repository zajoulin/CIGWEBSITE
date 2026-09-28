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
import type { SectionData } from '../../lib/cardio3d/heart';
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
  const [section, setSection] = useState<SectionData | null>(null);
  const [labelPos, setLabelPos] = useState<SectionLabelLayout[]>([]);

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
        setSection(model.section);
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
    const reframe = !firstMode.current && !compact;
    viewer.setSection(viewMode.section && section ? section.plane : null, reframe);
    viewer.setViewMode(viewMode, reframe);
    firstMode.current = false;
  }, [viewMode, compact, status, section]);

  // Cross-section labels follow the model as it is rotated and zoomed.
  const sectionActive = Boolean(viewMode.section && section && status === 'ready');
  useEffect(() => {
    if (!sectionActive || !section) {
      setLabelPos([]);
      return;
    }
    let raf = 0;
    let last = '';
    const track = () => {
      const viewer = viewerRef.current;
      const canvas = canvasRef.current;
      if (viewer && canvas) {
        const layout = layoutSectionLabels(
          section.labels.map((l) => ({ text: l.text, at: viewer.projectPoint(l.point) })),
          canvas.clientWidth,
          canvas.clientHeight,
        );
        const key = layout.map((l) => `${l.x | 0},${l.y | 0},${l.lx | 0},${l.ly | 0}`).join(';');
        if (key !== last) {
          last = key;
          setLabelPos(layout);
        }
      }
      raf = requestAnimationFrame(track);
    };
    raf = requestAnimationFrame(track);
    return () => cancelAnimationFrame(raf);
  }, [sectionActive, section]);

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
          detail="Preparing the cardiac chambers, valves, vessels and conduction system."
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

      {labelPos.length ? <SectionLabels labels={labelPos} /> : null}

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

/* ------------------------------------------------ Cross-section labels -- */

interface SectionLabelLayout {
  text: string;
  /** Anchor on the model. */
  x: number;
  y: number;
  /** Label position. */
  lx: number;
  ly: number;
  side: 'left' | 'right';
}

const LABEL_GAP = 22;
const LABEL_MARGIN = 12;

/**
 * Places each label beside the model on the side its anchor is on, stacked so
 * they never overlap, with a leader line back to the anchor.
 */
const layoutSectionLabels = (
  items: { text: string; at: { x: number; y: number; visible: boolean } | null }[],
  width: number,
  height: number,
): SectionLabelLayout[] => {
  const shown = items.filter((i) => i.at && i.at.visible) as {
    text: string;
    at: { x: number; y: number };
  }[];
  if (!shown.length) return [];
  const xs = shown.map((i) => i.at.x);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const mid = (minX + maxX) / 2;
  const out: SectionLabelLayout[] = [];
  for (const side of ['left', 'right'] as const) {
    const group = shown
      .filter((i) => (side === 'left' ? i.at.x < mid : i.at.x >= mid))
      .sort((a, b) => a.at.y - b.at.y);
    const column = side === 'left'
      ? Math.max(LABEL_MARGIN, minX - 70)
      : Math.min(width - LABEL_MARGIN, maxX + 70);
    let prev = -Infinity;
    const placed = group.map((i) => {
      const ly = Math.max(i.at.y, prev + LABEL_GAP);
      prev = ly;
      return { text: i.text, x: i.at.x, y: i.at.y, lx: column, ly, side };
    });
    // If the stack ran off the bottom, slide it back up.
    const overflow = prev - (height - 70);
    if (overflow > 0) for (const p of placed) p.ly = Math.max(LABEL_MARGIN, p.ly - overflow);
    out.push(...placed);
  }
  return out;
};

const SectionLabels = ({ labels }: { labels: SectionLabelLayout[] }) => (
  <div
    aria-label="Labelled structures in the cross-section"
    role="list"
    style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
  >
    <svg
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
    >
      {labels.map((l) => (
        <g key={l.text}>
          <line
            x1={l.x}
            y1={l.y}
            x2={l.lx}
            y2={l.ly}
            stroke="rgba(226, 238, 255, 0.55)"
            strokeWidth={1}
          />
          <circle cx={l.x} cy={l.y} r={3} fill="#fff" stroke="rgba(4, 52, 100, 0.9)" strokeWidth={1.2} />
        </g>
      ))}
    </svg>
    {labels.map((l) => (
      <span
        key={l.text}
        role="listitem"
        style={{
          position: 'absolute',
          left: l.lx,
          top: l.ly,
          transform: `translate(${l.side === 'left' ? '-100%' : '0'}, -50%)`,
          padding: '2px 8px',
          borderRadius: 999,
          background: 'rgba(6, 22, 44, 0.86)',
          border: '1px solid rgba(160, 196, 240, 0.28)',
          color: '#eaf2ff',
          fontSize: 11.5,
          lineHeight: '16px',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
        }}
      >
        {l.text}
      </span>
    ))}
  </div>
);
