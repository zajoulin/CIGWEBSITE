/* ==========================================================================
   CIG — Loading state for the ECG & Bedside Monitoring module
   --------------------------------------------------------------------------
   This file exists to give the route its own suspense boundary with something
   visible in it.

   The application shell reads the URL's search parameters (the module accepts
   ?rhythm= and ?view= deep links), which makes the router suspend this route
   while it resolves. Without a boundary of its own, the nearest one is the
   shell's, whose fallback is nothing at all — so every moment the route spends
   suspended is rendered to the learner as a blank white page. With this file
   the wait is scoped to the module and looks like the module.
   ========================================================================== */

export default function EcgLoading() {
  return (
    <section className="section-tight" aria-busy="true" aria-live="polite">
      <div className="wrap wrap-wide">
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <span className="eyebrow eyebrow-blue">Learning Hub · Electrocardiography</span>
          <h1 style={{ fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)', marginTop: 'var(--s-3)' }}>
            Starting the bedside monitor…
          </h1>
          <p className="lede" style={{ marginTop: 'var(--s-3)' }}>
            Building the waveform engine and loading the rhythm library.
          </p>
        </div>
      </div>
    </section>
  );
}
