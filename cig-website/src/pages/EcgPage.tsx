/* ==========================================================================
   CIG — ECG & Electrocardiography
   --------------------------------------------------------------------------
   The rhythm library on a simulated bedside monitor: one trace that can be
   played, paused, scrubbed, stepped and dissected, with a synchronised
   explanation of what the heart is doing.

   This module teaches one rhythm at a time. Putting the learner *in* the
   room — examining a patient, placing the electrodes, acquiring the tracing
   and being scored on it — is the Clinical Simulation module in the Learning
   Hub, which is where the patient room now lives.
   ========================================================================== */

import { useEffect } from 'react';
import { Crest } from '../components/brand/Crest';
import { Icon } from '../components/icons/Icon';
import { SearchBar } from '../components/ui/SearchBar';
import { Chip, Disclaimer } from '../components/ui/primitives';
import { EcgWorkspace } from '../components/ecg/EcgWorkspace';
import { useEcgSession } from '../components/ecg/useEcgSession';
import { contentStats, ecgRhythmById, org } from '../lib/content';
import { A, useRouter } from '../lib/router';

export const EcgPage = () => {
  const { query, navigate, hrefFor } = useRouter();
  const session = useEcgSession(query.rhythm);

  /* Deep links: /learn/ecg?rhythm=stemi */
  useEffect(() => {
    if (query.rhythm && ecgRhythmById.has(query.rhythm) && query.rhythm !== session.rhythm.id) {
      session.selectRhythm(query.rhythm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.rhythm]);

  /**
   * Updating the address bar is a convenience, never a requirement: the module
   * is driven entirely by React state, and the URL is only rewritten in
   * response to something the learner did.
   *
   * This deliberately writes the address with the native History API rather
   * than asking the host router to navigate. Changing a rhythm is a change of
   * state *within* this page, not a change of page: routing it through the
   * framework router makes the host re-resolve the whole route, which under a
   * router that suspends on its search parameters replaces the module with its
   * (empty) fallback — the trace, the monitor and the analysis panel all
   * vanish and the learner is left looking at a blank screen. Writing the URL
   * directly leaves the mounted React tree completely untouched, so the heart
   * carries on beating while the address bar catches up.
   *
   * A host that refuses the history write (an embedded preview, a sandboxed
   * frame, a page opened from the file system) simply keeps the current
   * address instead of breaking the page.
   */
  const syncUrl = (rhythmId: string) => {
    if (typeof window === 'undefined' || !window.history?.replaceState) return;
    // hrefFor keeps this correct for whichever host is mounting the module:
    // a real path under the Next.js app, a hash under the single-file build.
    const url = hrefFor(`/learn/ecg?rhythm=${encodeURIComponent(rhythmId)}`);
    try {
      // The existing state object is preserved so the host router's own
      // back/forward bookkeeping survives the rewrite.
      window.history.replaceState(window.history.state, '', url);
    } catch {
      /* the view is already correct; the address bar simply lags behind */
    }
  };

  /** Called when the learner picks a rhythm from the rail, search or the quiz. */
  const pickRhythm = (id: string) => {
    session.selectRhythm(id);
    syncUrl(id);
  };

  return (
    <>
      <header className="page-head page-head-navy stage ecg-head">
        <div className="grid-bg" />
        <div className="wrap wrap-wide">
          <div className="page-head-row">
            <span className="crest-plate page-head-crest">
              <Crest width="100%" decorative />
            </span>
            <div style={{ minWidth: 0 }}>
              <span className="eyebrow">{org.learningHub.short} · Electrocardiography</span>
              <h1 style={{ fontSize: 'clamp(1.75rem, 3.6vw, 2.6rem)', marginTop: 'var(--s-3)' }}>
                ECG &amp; Bedside Monitoring
              </h1>
              <p className="lede" style={{ marginTop: 'var(--s-3)', maxWidth: '72ch' }}>
                A simulated bedside cardiac monitor running {contentStats.ecgRhythms} clinically
                important rhythms. Every trace is generated live from its own physiological
                parameters — so you can pause it, scrub it, step through it one small square at a
                time, and watch each wave being inscribed.
              </p>
              <div className="tag-row" style={{ marginTop: 'var(--s-5)' }}>
                <Chip tone="blue">{contentStats.ecgRhythms} rhythms</Chip>
                <Chip tone="blue">Live waveform engine</Chip>
                <Chip tone="blue">25 mm/s · 10 mm/mV</Chip>
              </div>
            </div>
          </div>

          <div className="ecg-head-tools">
            <A href="/learn/simulation" className="btn btn-sm ecg-head-sim">
              <Icon name="bed" size={14} />
              Enter the Clinical Simulation
            </A>

            <div className="ecg-head-search">
              <SearchBar
                placeholder="Search rhythms, diseases, key points…"
                ariaLabel="Search ECG rhythms and related content"
                onSelect={(entry) => {
                  if (entry.kind === 'ecg') {
                    pickRhythm(entry.id);
                  } else if (entry.kind === 'disease') navigate(`/diseases/${entry.id}`);
                  else if (entry.kind === 'keypoint') navigate(`/learn/keypoints?topic=${entry.id}`);
                  else if (entry.kind === 'structure') navigate(`/anatomy?structure=${entry.id}`);
                  else if (entry.kind === 'exam') navigate('/learn/examination');
                  else if (entry.kind === 'case') navigate(`/learn/simulation?case=${entry.id}`);
                  else if (entry.kind === 'research') navigate('/research');
                  else navigate('/learn/glossary');
                }}
              />
            </div>
          </div>
        </div>
      </header>

      <EcgWorkspace session={session} onRhythmChange={pickRhythm} />

      <section className="section-tight">
        <div className="wrap wrap-wide">
          <div className="ecg-crosslinks">
            <A href="/learn/simulation" className="card card-pad card-hover card-action">
              <div className="hub-icon">
                <Icon name="bed" size={20} />
              </div>
              <h4>Obtain the tracing yourself</h4>
              <p>
                The Clinical Simulation puts you at the bedside: examine the patient, place all ten
                electrodes against their landmarks, acquire a 12-lead ECG and interpret it under
                marking.
              </p>
              <span className="ecg-crosslink-cta">
                Enter the clinical environment
                <Icon name="arrow-right" size={12} />
              </span>
            </A>
            <A href="/anatomy?structure=sa-node" className="card card-pad card-hover card-action">
              <div className="hub-icon">
                <Icon name="anatomy" size={20} />
              </div>
              <h4>See where the impulse comes from</h4>
              <p>
                The sinoatrial node, atrioventricular node, His bundle and Purkinje network in the
                interactive 3D cardiovascular model.
              </p>
              <span className="ecg-crosslink-cta">
                Open the conduction system
                <Icon name="arrow-right" size={12} />
              </span>
            </A>
            <A href="/learn/keypoints?topic=ecg-essentials" className="card card-pad card-hover card-action">
              <div className="hub-icon">
                <Icon name="lightbulb" size={20} />
              </div>
              <h4>Revise the fundamentals</h4>
              <p>
                ECG Essentials: the systematic approach, normal values, axis, and the patterns worth
                committing to memory.
              </p>
              <span className="ecg-crosslink-cta">
                Open the key-point topic
                <Icon name="arrow-right" size={12} />
              </span>
            </A>
          </div>

          <div style={{ marginTop: 'var(--s-8)' }}>
            <Disclaimer title={org.disclaimer.title} body={org.disclaimer.body} />
          </div>
          <p className="ecg-sim-note">
            <Icon name="info" size={13} />
            The monitor, its numbers and every waveform on this page are generated by CIG&rsquo;s
            own teaching simulation. They describe no real patient, and the device is a
            brand-neutral educational representation rather than any manufacturer&rsquo;s product.
          </p>
        </div>
      </section>
    </>
  );
};
export default EcgPage;