'use client';

/* ==========================================================================
   CIG — Error boundary for the ECG & Bedside Monitoring module
   --------------------------------------------------------------------------
   Scoped deliberately to this route. Without a boundary here, anything that
   throws while the monitor is mounting unwinds all the way to the root and
   React unmounts the tree, which the learner sees as a blank white page with
   nothing to report. This catches it at the module edge, keeps the rest of
   the site alive, and puts the actual message on screen so the fault can be
   read off the page instead of guessed at.
   ========================================================================== */

import { useEffect } from 'react';

export default function EcgError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Also in the console, with the stack, for whoever has devtools open.
    console.error('[CIG] ECG module failed to render:', error);
  }, [error]);

  return (
    <section className="section-tight">
      <div className="wrap wrap-wide">
        <div className="card card-pad">
          <span className="eyebrow eyebrow-crimson">Learning Hub · Electrocardiography</span>
          <h1 style={{ fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)', marginTop: 'var(--s-3)' }}>
            The bedside monitor could not start
          </h1>
          <p className="lede" style={{ marginTop: 'var(--s-3)', maxWidth: '68ch' }}>
            Something in the ECG module threw while it was being drawn. The rest of the site is
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
              Try loading the monitor again
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
