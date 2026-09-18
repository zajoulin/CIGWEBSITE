/* ==========================================================================
   CIG — Loading state for the Clinical Simulation module
   --------------------------------------------------------------------------
   The module reads ?level= and ?case= from the address, which makes the
   router suspend this route while it resolves them. Without a boundary of its
   own the nearest fallback is the shell's, which is nothing at all — so the
   learner would see a blank page for as long as the wait lasted. This scopes
   the wait to the module and makes it look like the module.
   ========================================================================== */

export default function SimulationLoading() {
  return (
    <section className="section-tight" aria-busy="true" aria-live="polite">
      <div className="wrap wrap-wide">
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <span className="eyebrow eyebrow-blue">Learning Hub · Clinical simulation</span>
          <h1 style={{ fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)', marginTop: 'var(--s-3)' }}>
            Preparing the clinical environment…
          </h1>
          <p className="lede" style={{ marginTop: 'var(--s-3)' }}>
            Selecting a case from the reviewed library and starting the bedside monitor.
          </p>
        </div>
      </div>
    </section>
  );
}
