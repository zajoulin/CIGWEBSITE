/* ==========================================================================
   CIG — Loading and error states
   The 3D sections must never show a blank rectangle, and a WebGL failure must
   never take the page down with it.
   ========================================================================== */

import type { ReactNode } from 'react';
import { Icon } from '../icons/Icon';

export const EcgSpinner = () => (
  <svg className="spinner-ecg" viewBox="0 0 120 34" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 17h22l5-11 8 22 6-16 5 5h20l5-11 8 22 6-16 5 5h30" />
  </svg>
);

export const LoadingState = ({
  title = 'Loading cardiovascular anatomy…',
  detail,
}: {
  title?: string;
  detail?: string;
}) => (
  <div
    role="status"
    aria-live="polite"
    style={{
      position: 'absolute',
      inset: 0,
      display: 'grid',
      placeItems: 'center',
      gap: 'var(--s-4)',
      textAlign: 'center',
      padding: 'var(--s-6)',
    }}
  >
    <div style={{ display: 'grid', justifyItems: 'center', gap: 'var(--s-3)' }}>
      <EcgSpinner />
      <p style={{ fontSize: 'var(--t-sm)', fontWeight: 550 }}>{title}</p>
      {detail ? (
        <p style={{ fontSize: 'var(--t-2xs)', color: 'var(--ink-3)', maxWidth: '32ch' }}>{detail}</p>
      ) : null}
    </div>
  </div>
);

export const ErrorState = ({
  title,
  detail,
  action,
  icon = 'warning',
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
  icon?: 'warning' | 'search' | 'info';
}) => (
  <div className="state-box" role="alert">
    <div className="state-icon">
      <Icon name={icon} size={22} />
    </div>
    <div>
      <h4 style={{ fontSize: 'var(--t-lg)', marginBottom: 6 }}>{title}</h4>
      {detail ? (
        <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', maxWidth: '52ch' }}>{detail}</p>
      ) : null}
    </div>
    {action}
  </div>
);

export const EmptyState = ({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) => (
  <div className="state-box">
    <div className="state-icon">
      <Icon name="search" size={22} />
    </div>
    <div>
      <h4 style={{ fontSize: 'var(--t-lg)', marginBottom: 6 }}>{title}</h4>
      {detail ? (
        <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', maxWidth: '48ch' }}>{detail}</p>
      ) : null}
    </div>
    {action}
  </div>
);

export const SkeletonBlock = ({ height = 120 }: { height?: number }) => (
  <div className="skeleton" style={{ height }} aria-hidden="true" />
);
