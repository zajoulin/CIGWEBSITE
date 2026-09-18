/* ==========================================================================
   CIG — Research
   --------------------------------------------------------------------------
   This section is CIG's own research activity and nothing else: what the
   group is committed to, what it has published or presented, and how a
   student proposes an idea of their own.

   The educational material that used to be reached through here — the
   glossary and the cardiovascular key points — are Learning Hub resources and
   live at /learn/glossary and /learn/keypoints. The legacy query links
   (/research?tab=glossary, /research?topic=…) are redirected below so old
   bookmarks and shared URLs still arrive at the right place.
   ========================================================================== */

import { useEffect } from 'react';
import { A, useRouter } from '../lib/router';
import { Icon } from '../components/icons/Icon';
import { Crest } from '../components/brand/Crest';
import { ResearchDatabase } from '../components/research/ResearchDatabase';
import { ResearchIdeaForm } from '../components/research/ResearchIdeaForm';
import { Reveal, SectionHeader } from '../components/ui/primitives';
import { CtaSection } from '../components/home/sections';
import { research, researchConfig } from '../lib/content';

/** Moves the page to the idea form and puts the cursor in its first field. */
const goToIdeaForm = () => {
  const form = document.getElementById('research-idea');
  if (!form) return;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const first = form.querySelector('input, textarea, select');
  window.setTimeout(() => (first as { focus?: () => void } | null)?.focus?.(), 420);
};

export const ResearchPage = () => {
  const { query, navigate } = useRouter();
  const cfg = researchConfig;

  /* Legacy deep links from before the Learning Hub and Research were split. */
  useEffect(() => {
    if (query.topic) navigate(`/learn/keypoints?topic=${query.topic}`, { replace: true });
    else if (query.tab === 'glossary') navigate('/learn/glossary', { replace: true });
    else if (query.tab === 'keypoints') navigate('/learn/keypoints', { replace: true });
  }, [query.topic, query.tab, navigate]);

  return (
    <>
      <header className="page-head page-head-navy stage">
        <div className="grid-bg" />
        <div className="wrap">
          <div className="page-head-row">
            <span className="crest-plate page-head-crest">
              <Crest width="100%" decorative />
            </span>
            <div style={{ minWidth: 0 }}>
              <span className="eyebrow">{cfg.eyebrow}</span>
              <h1 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.9rem)', marginTop: 'var(--s-4)' }}>
                {cfg.title}
              </h1>
              <p className="lede" style={{ marginTop: 'var(--s-4)', maxWidth: '74ch' }}>
                {cfg.lede}
              </p>
              <div className="hero-cta" style={{ marginTop: 'var(--s-6)' }}>
                <button type="button" className="btn btn-primary" onClick={goToIdeaForm}>
                  {cfg.idea.ctaLabel}
                  <Icon name="arrow-right" size={14} className="arrow" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------- Commitment -- */}

      <section className="section-tight" id="research-commitment" aria-labelledby="research-commitment-h">
        <div className="wrap">
          {/* Named for screen readers only: the three cards below are its
              sub-headings, and without it they would follow the h1 as h3s. */}
          <h2 className="sr-only" id="research-commitment-h">
            How CIG approaches research
          </h2>
          <div className="pillar-grid">
            {cfg.commitment.map((c, i) => (
              <Reveal key={c.id} delay={((i % 3) + 1) as 1}>
                <article className="card card-pad" style={{ height: '100%' }}>
                  <div className="mission-icon">
                    <Icon name={c.icon} size={19} />
                  </div>
                  <h3 style={{ fontSize: 'var(--t-lg)', marginTop: 'var(--s-4)' }}>{c.title}</h3>
                  <p
                    style={{
                      fontSize: 'var(--t-sm)',
                      color: 'var(--ink-2)',
                      lineHeight: 1.68,
                      marginTop: 'var(--s-3)',
                    }}
                  >
                    {c.text}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------- Published research -- */}

      <section className="section-tight" id="published-research">
        <div className="wrap">
          <SectionHeader
            eyebrow="Publications"
            title={cfg.published.title}
            lede={cfg.published.lede}
          />

          <div style={{ marginTop: 'var(--s-8)' }}>
            {research.length ? (
              <ResearchDatabase />
            ) : (
              <div className="research-empty">
                <div className="research-empty-icon" aria-hidden="true">
                  <Icon name="microscope" size={26} />
                </div>
                <h3>{cfg.published.emptyTitle}</h3>
                <p>{cfg.published.emptyDetail}</p>
                <p className="research-empty-cta">{cfg.published.emptyCta}</p>
                <button type="button" className="btn btn-primary btn-sm" onClick={goToIdeaForm}>
                  {cfg.idea.ctaLabel}
                  <Icon name="arrow-right" size={13} className="arrow" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Have an idea? -- */}

      <section className="section-tight" id="research-idea-intro">
        <div className="wrap">
          <div className="idea-band stage">
            <div className="grid-bg" />
            <div className="idea-band-inner">
              <span className="eyebrow">{cfg.idea.eyebrow}</span>
              <h2 style={{ marginTop: 'var(--s-4)' }}>{cfg.idea.title}</h2>
              <p style={{ marginTop: 'var(--s-4)', maxWidth: '64ch' }}>{cfg.idea.body}</p>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ marginTop: 'var(--s-7)' }}
                onClick={goToIdeaForm}
              >
                {cfg.idea.ctaLabel}
                <Icon name="arrow-right" size={15} className="arrow" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="wrap">
          <ResearchIdeaForm />

          <p className="research-foot">
            Looking for the glossary or the cardiovascular key points? They are Learning Hub
            resources: <A href="/learn/glossary">Glossary</A> ·{' '}
            <A href="/learn/keypoints">Cardiovascular Key Points</A>
          </p>
        </div>
      </section>

      <CtaSection />
    </>
  );
};
export default ResearchPage;