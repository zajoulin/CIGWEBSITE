/* ==========================================================================
   CIG — Interactive Cardiovascular Anatomy
   --------------------------------------------------------------------------
   Three-pane workspace on desktop: structure tree, 3D stage, information
   panel. On smaller screens the tree collapses into search plus a category
   picker and the information panel becomes a bottom sheet.
   ========================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnatomyStage, type StageApi } from '../components/anatomy/AnatomyStage';
import { AnatomyTree } from '../components/anatomy/AnatomyTree';
import {
  CameraControls,
  ViewerHint,
  ViewModeSwitch,
} from '../components/anatomy/AnatomyControls';
import { AnatomyInfoPanel } from '../components/anatomy/AnatomyInfoPanel';
import { SearchBar } from '../components/ui/SearchBar';
import { Sheet } from '../components/ui/Modal';
import { Icon } from '../components/icons/Icon';
import { Chip } from '../components/ui/primitives';
import { ErrorState } from '../components/ui/states';
import { VIEW_MODES, type ViewModeId } from '../lib/cardio3d';
import { org, structureById, structures } from '../lib/content';
import { useRouter } from '../lib/router';
import type { AnatomicalStructure } from '../lib/types';

const DEFAULT_STRUCTURE = 'left-ventricle';

export const AnatomyPage = () => {
  const { query, navigate } = useRouter();

  const [selectedId, setSelectedId] = useState<string | null>(
    query.structure && structureById.has(query.structure) ? query.structure : DEFAULT_STRUCTURE,
  );
  const [viewModeId, setViewModeId] = useState<ViewModeId>('full');
  const [isolated, setIsolated] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [autoRotate, setAutoRotate] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  const stageApi = useRef<StageApi | null>(null);

  const viewMode = useMemo(
    () => VIEW_MODES.find((m) => m.id === viewModeId) ?? VIEW_MODES[0],
    [viewModeId],
  );
  const selected = selectedId ? structureById.get(selectedId) ?? null : null;

  // Track viewport width so the info panel can become a bottom sheet.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1080px)');
    const update = () => setIsNarrow(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  // Deep links: /anatomy?structure=mitral-valve
  useEffect(() => {
    if (query.structure && structureById.has(query.structure)) {
      setSelectedId(query.structure);
      if (window.matchMedia('(max-width: 1080px)').matches) setSheetOpen(true);
    }
  }, [query.structure]);

  const selectStructure = useCallback(
    (structure: AnatomicalStructure | null, options: { focus?: boolean } = {}) => {
      setSelectedId(structure?.id ?? null);
      if (!structure) return;
      if (options.focus) stageApi.current?.focus(structure.meshName);
      if (window.matchMedia('(max-width: 1080px)').matches) setSheetOpen(true);
    },
    [],
  );

  const selectByMesh = useCallback((mesh: string | null) => {
    if (!mesh) {
      setSelectedId(null);
      return;
    }
    const structure = structures.find((s) => s.meshName === mesh);
    if (structure) {
      setSelectedId(structure.id);
      if (window.matchMedia('(max-width: 1080px)').matches) setSheetOpen(true);
    }
  }, []);

  const toggleHidden = useCallback((mesh: string) => {
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(mesh)) next.delete(mesh);
      else next.add(mesh);
      return next;
    });
  }, []);

  const infoPanel = selected ? (
    <AnatomyInfoPanel
      structure={selected}
      onNavigateStructure={(id) => {
        const s = structureById.get(id);
        if (s) selectStructure(s, { focus: true });
      }}
    />
  ) : (
    <div style={{ padding: 'var(--s-8)' }}>
      <ErrorState
        icon="info"
        title="No structure selected"
        detail="Click a structure on the model, choose one from the list, or search for it by name."
      />
    </div>
  );

  return (
    <>
      {/* Page header with search */}
      <header
        style={{
          paddingTop: 'calc(var(--nav-h) + var(--s-8))',
          paddingBottom: 'var(--s-6)',
          borderBottom: '1px solid var(--line)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div className="grid-bg" />
        <div className="wrap wrap-wide">
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 'var(--s-6)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <span className="eyebrow eyebrow-navy">
                {org.learningHub.short} · Interactive anatomy
              </span>
              <h1
                style={{
                  fontSize: 'clamp(1.75rem, 3.6vw, 2.6rem)',
                  marginTop: 'var(--s-3)',
                }}
              >
                Interactive Cardiovascular Anatomy
              </h1>
              <p
                style={{
                  marginTop: 'var(--s-3)',
                  fontSize: 'var(--t-sm)',
                  color: 'var(--ink-2)',
                  maxWidth: '68ch',
                }}
              >
                {structures.length} named structures across the heart, great vessels and peripheral
                vasculature. Rotate, zoom, isolate and inspect — every structure carries referenced
                anatomy, physiology, pathology and clinical detail.
              </p>
            </div>

            <div style={{ flex: '1 1 320px', maxWidth: 440 }}>
              <SearchBar
                placeholder="Search anatomy, physiology, diseases…"
                ariaLabel="Search anatomical structures and related content"
                onSelect={(entry) => {
                  if (entry.kind === 'structure') {
                    const s = structureById.get(entry.id);
                    if (s) selectStructure(s, { focus: true });
                  } else if (entry.kind === 'disease') {
                    navigate(`/diseases/${entry.id}`);
                  } else if (entry.kind === 'keypoint') {
                    navigate(`/learn/keypoints?topic=${entry.id}`);
                  } else if (entry.kind === 'research') {
                    navigate('/research');
                  } else {
                    navigate('/learn/glossary');
                  }
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Three-pane workspace */}
      <div className="anatomy-shell">
        <div className="anatomy-pane sidebar">
          <AnatomyTree
            selectedId={selectedId}
            onSelect={(s) => selectStructure(s, { focus: true })}
            hidden={hidden}
            onToggleHidden={toggleHidden}
          />
          <div
            style={{
              padding: 'var(--s-4)',
              borderTop: '1px solid var(--line)',
              display: 'grid',
              gap: 'var(--s-2)',
            }}
          >
            <p style={{ fontSize: 10.5, color: 'var(--ink-4)', lineHeight: 1.5 }}>
              Diagrammatic model generated in code — anatomically arranged, not photorealistic. A
              licensed GLB can be dropped in without changing the interface.
            </p>
          </div>
        </div>

        <div className="anatomy-pane anatomy-stage stage">
          <AnatomyStage
            className="viewer-bare"
            selectedMesh={selected?.meshName ?? null}
            viewMode={viewMode}
            isolated={isolated}
            hidden={hidden}
            onSelect={selectByMesh}
            onError={setViewerError}
            autoRotate={autoRotate}
            apiRef={stageApi}
            overlay={
              <>
                <div
                  style={{
                    position: 'absolute',
                    top: 'var(--s-4)',
                    left: 'var(--s-4)',
                    right: 'var(--s-4)',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <ViewModeSwitch value={viewModeId} onChange={setViewModeId} />
                </div>

                <div
                  style={{
                    position: 'absolute',
                    bottom: 'var(--s-4)',
                    left: 'var(--s-4)',
                    right: 'var(--s-4)',
                    display: 'grid',
                    gap: 'var(--s-3)',
                    justifyItems: 'center',
                  }}
                >
                  <CameraControls
                    hasSelection={Boolean(selected)}
                    isolated={isolated}
                    autoRotate={autoRotate}
                    anyHidden={hidden.size > 0}
                    onFocus={() => selected && stageApi.current?.focus(selected.meshName)}
                    onReset={() => {
                      stageApi.current?.reset();
                      setIsolated(false);
                    }}
                    onToggleIsolate={() => setIsolated((v) => !v)}
                    onToggleRotate={() => setAutoRotate((v) => !v)}
                    onShowAll={() => setHidden(new Set())}
                  />
                  <ViewerHint />
                </div>

                {/* Mobile: open the information panel as a bottom sheet */}
                {isNarrow && selected ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ position: 'absolute', top: 'var(--s-4)', right: 'var(--s-4)' }}
                    onClick={() => setSheetOpen(true)}
                  >
                    <Icon name="info" size={13} />
                    Details
                  </button>
                ) : null}
              </>
            }
          />
        </div>

        <div className="anatomy-pane info-pane">{infoPanel}</div>
      </div>

      {/* Narrow-screen structure picker and sheet */}
      {isNarrow ? (
        <div className="wrap" style={{ paddingBlock: 'var(--s-6)' }}>
          {viewerError ? (
            <div style={{ marginBottom: 'var(--s-6)' }}>
              <ErrorState
                title="Interactive anatomy is temporarily unavailable"
                detail={`${viewerError} All ${structures.length} structures remain fully readable below.`}
              />
            </div>
          ) : null}

          <h2 style={{ fontSize: 'var(--t-xl)', marginBottom: 'var(--s-4)' }}>All structures</h2>
          <div className="tag-row">
            {structures.map((s) => (
              <button
                key={s.id}
                type="button"
                className="filter-chip filter-chip-blue"
                aria-pressed={s.id === selectedId}
                onClick={() => selectStructure(s, { focus: true })}
              >
                <span
                  className="tree-swatch"
                  style={{ background: s.color, display: 'inline-block', marginRight: 6 }}
                  aria-hidden="true"
                />
                {s.name}
              </button>
            ))}
          </div>

          <div className="tag-row" style={{ marginTop: 'var(--s-6)' }}>
            {VIEW_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className="filter-chip"
                aria-pressed={viewModeId === m.id}
                onClick={() => setViewModeId(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {isNarrow ? (
        <Sheet
          open={sheetOpen && Boolean(selected)}
          onClose={() => setSheetOpen(false)}
          title={selected?.name ?? 'Structure details'}
        >
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
            {infoPanel}
          </div>
        </Sheet>
      ) : null}

      {/* Desktop error banner */}
      {viewerError && !isNarrow ? (
        <div className="wrap" style={{ paddingBlock: 'var(--s-6)' }}>
          <ErrorState
            title="Interactive anatomy is temporarily unavailable"
            detail={`${viewerError} The structure list and information panel above continue to work normally.`}
          />
        </div>
      ) : null}

      <div className="wrap" style={{ paddingBlock: 'var(--s-8)' }}>
        <div className="tag-row">
          <Chip tone="amber" block>
            <Icon name="info" size={11} />
            Educational visualisation — diagrammatic, not to anatomical scale
          </Chip>
        </div>
      </div>
    </>
  );
};
export default AnatomyPage;