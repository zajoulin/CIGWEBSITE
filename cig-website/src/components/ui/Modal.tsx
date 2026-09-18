/* ==========================================================================
   CIG — Modal dialog and mobile bottom sheet
   Both trap focus, restore it on close, close on Escape, and lock body scroll.
   ========================================================================== */

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '../icons/Icon';

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

const useDialogBehaviour = (
  open: boolean,
  onClose: () => void,
  panelRef: { current: HTMLElement | null },
): void => {
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const focusFirst = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const target =
        panel.querySelector<HTMLElement>('[data-autofocus]') ??
        panel.querySelector<HTMLElement>(FOCUSABLE) ??
        panel;
      target.focus({ preventScroll: true });
    };
    const t = window.setTimeout(focusFirst, 20);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open, onClose, panelRef]);
};

export const Modal = ({
  open,
  onClose,
  title,
  children,
  width,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useDialogBehaviour(open, onClose, panelRef);
  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e: { target: unknown; currentTarget: unknown }) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={panelRef}
        style={width ? { width: `min(${width}px, 100%)` } : undefined}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
          <Icon name="close" size={16} />
        </button>
        {children}
      </div>
    </div>
  );
};

export const Sheet = ({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useDialogBehaviour(open, onClose, panelRef);
  if (!open) return null;

  return (
    <>
      {/* The sheet is modal and locks the page behind it, but it covers only
          the lower 82% of the screen. Without a backdrop the strip above it
          still looked live — the 3D stage and its camera buttons sat there
          visibly, and tapping them did nothing. The backdrop makes the state
          readable and gives the tap-outside-to-close every bottom sheet on a
          phone is expected to have. */}
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={panelRef}>
        <div className="sheet-grip" aria-hidden="true">
          <span />
        </div>
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close panel"
          style={{ top: 10, right: 12 }}
        >
          <Icon name="close" size={16} />
        </button>
        {children}
      </div>
    </>
  );
};
