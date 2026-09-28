'use client';

/* ==========================================================================
   CIG — Error boundary for the Clinical Simulation module
   --------------------------------------------------------------------------
   Scoped to this route so that anything throwing inside the simulation — the
   waveform engine, the torso, the audio context — is caught at the module
   edge with the message on screen, rather than unwinding to the root and
   leaving the learner looking at a blank page.
   ========================================================================== */

import { useEffect } from 'react';

export default function SimulationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[CIG] Clinical Simulation failed to render:', error);
  }, [error]);

  return (
    <section className="section-tight">
      <div className="wrap wrap-wide">
        <div className="card card-pad">
          <span className="eyebrow eyebrow-crimson">Learning Hub · Clinical simulation</span>
          <h1 style={{ fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)', marginTop: 'var(--s-3)' }}>
            The clinical environment could not start
          </h1>
          <p className="lede" style={{ marginTop: 'var(--s-3)', maxWidth: '68ch' }}>
            Something in the simulation threw while it was being drawn. The rest of the site is
            unaffected — the message below is the fault itself.
          </p>

          <pre
            style={{
              marginTop: 'var(--s-5)',
              padding: 'var(--s-4)',
              borderRadius: '8px',
              background: 'var(--surface-2, #f2f5f9)',
              border: '1px solid var(--line, rgba(4, 52, 100, 0.15))',
              overflowX: 'auto',
              fontSize: '0.82rem',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {error.name}: {error.message}
            {error.digest ? `\n\ndigest: ${error.digest}` : ''}
            {error.stack ? `\n\n${error.stack}` : ''}
          </pre>

          <div className="tag-row" style={{ marginTop: 'var(--s-5)' }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={reset}>
              Try starting the simulation again
            </button>
            <a className="btn btn-sm" href="/learn">
              Back to the Learning Hub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
