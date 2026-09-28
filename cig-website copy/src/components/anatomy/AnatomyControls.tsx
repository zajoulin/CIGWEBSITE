/* ==========================================================================
   CIG — Viewer controls: view modes and camera actions
   ========================================================================== */

import { Icon } from '../icons/Icon';
import { VIEW_MODES, type ViewModeId } from '../../lib/cardio3d';

export const ViewModeSwitch = ({
  value,
  onChange,
}: {
  value: ViewModeId;
  onChange: (id: ViewModeId) => void;
}) => (
  <div className="view-modes" role="group" aria-label="Anatomical view mode">
    {VIEW_MODES.map((m) => (
      <button
        key={m.id}
        type="button"
        className="view-mode"
        aria-pressed={value === m.id}
        onClick={() => onChange(m.id)}
        title={m.description}
      >
        {m.label}
      </button>
    ))}
  </div>
);

export const CameraControls = ({
  hasSelection,
  isolated,
  autoRotate,
  anyHidden,
  onFocus,
  onReset,
  onToggleIsolate,
  onToggleRotate,
  onShowAll,
}: {
  hasSelection: boolean;
  isolated: boolean;
  autoRotate: boolean;
  anyHidden: boolean;
  onFocus: () => void;
  onReset: () => void;
  onToggleIsolate: () => void;
  onToggleRotate: () => void;
  onShowAll: () => void;
}) => (
  <div className="ctrl-cluster" role="group" aria-label="Model controls">
    <button
      type="button"
      className="ctrl-btn"
      onClick={onFocus}
      disabled={!hasSelection}
      title="Move the camera to frame the selected structure"
    >
      <Icon name="focus" size={13} />
      Focus selected
    </button>
    <button
      type="button"
      className="ctrl-btn"
      aria-pressed={isolated}
      onClick={onToggleIsolate}
      disabled={!hasSelection}
      title="Fade everything except the selected structure"
    >
      <Icon name="layers" size={13} />
      Isolate
    </button>
    <button type="button" className="ctrl-btn" onClick={onReset} title="Return to the default view">
      <Icon name="restart" size={13} />
      Reset view
    </button>
    <button
      type="button"
      className="ctrl-btn"
      aria-pressed={autoRotate}
      onClick={onToggleRotate}
      title="Rotate the model slowly when idle"
    >
      <Icon name="refresh" size={13} />
      Auto-rotate
    </button>
    {anyHidden ? (
      <button type="button" className="ctrl-btn" onClick={onShowAll} title="Show all hidden structures">
        <Icon name="eye" size={13} />
        Show all
      </button>
    ) : null}
  </div>
);

export const ViewerHint = () => (
  <p
    className="mono"
    style={{
      fontSize: 10.5,
      letterSpacing: '0.06em',
      color: 'var(--ink-4)',
      textTransform: 'uppercase',
    }}
  >
    {/* Both hints are always rendered and CSS shows the one that matches the
        pointer, so the string never depends on a media query read in JS.
        The mouse wording described three gestures a touchscreen cannot make. */}
    <span className="hint-mouse">
      Drag to rotate · Scroll to zoom · Shift-drag to pan · Click a structure
    </span>
    <span className="hint-touch">
      Drag to rotate · Pinch to zoom · Two fingers to pan · Tap a structure
    </span>
  </p>
);
