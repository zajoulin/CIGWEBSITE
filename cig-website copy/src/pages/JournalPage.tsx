/* ==========================================================================
   CIG — The CIG Journal
   ========================================================================== */

import { useState } from 'react';
import { A } from '../lib/router';
import { Icon } from '../components/icons/Icon';
import { Crest } from '../components/brand/Crest';
import { Modal } from '../components/ui/Modal';
import { Chip, Reveal, SectionHeader } from '../components/ui/primitives';
import { CtaSection } from '../components/home/sections';
import { journal } from '../lib/content';

export const JournalPage = () => {
  const [activeIssue, setActiveIssue] = useState<any | null>(null);

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
              <span className="eyebrow">{journal.eyebrow}</span>
              <h1 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.9rem)', marginTop: 'var(--s-4)' }}>
                {journal.title}
              </h1>
              <p className="lede" style={{ marginTop: 'var(--s-4)', maxWidth: '74ch' }}>
                {journal.lede}
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="section-tight" id="about-the-journal">
        <div className="wrap">
          <Reveal delay={1}>
            <article className="card card-pad">
              <span className="eyebrow eyebrow-navy">About the Journal</span>
              <p style={{ marginTop: 'var(--s-4)', fontSize: 'var(--t-md)', lineHeight: 1.68 }}>
                {journal.about}
              </p>
            </article>
          </Reveal>
        </div>
      </section>

      <section className="section-tight" id="Webinars">
        <div className="wrap">
          <SectionHeader eyebrow="Issues" title="Journal Club Webinars" accent="blue" />

          <div style={{ marginTop: 'var(--s-8)' }}>
            {journal.issues.length ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: 'var(--s-4)',
                }}
              >
                {journal.issues.map((issue: any, i: number) => (
                  <Reveal key={issue.id} delay={((i % 4) + 1) as any}>
                    <article
                      className="card card-pad card-accent card-accent-blue card-hover card-action"
                      style={{ height: '100%', cursor: 'pointer' }}
                      onClick={() => setActiveIssue(issue)}
                    >
                      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                        {issue.image && (
                          <img
                            src={issue.image}
                            alt={issue.title}
                            style={{
                              width: '140px',
                              height: '140px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <div style={{ flex: 1 }}>
                          <div className="tag-row" style={{ marginBottom: 'var(--s-2)' }}>
                            <Chip tone="blue">{issue.category || 'Journal Club'}</Chip>
                          </div>
                          <h3 style={{ fontSize: 'var(--t-lg)', marginTop: 'var(--s-1)' }}>
                            {issue.title}
                          </h3>
                          <p
                            style={{
                              fontSize: 'var(--t-sm)',
                              color: 'var(--ink-2)',
                              lineHeight: 1.66,
                              marginTop: 'var(--s-2)',
                            }}
                          >
                            {issue.summary}
                          </p>
                          {issue.tags && issue.tags.length ? (
                            <div className="tag-row" style={{ marginTop: 'var(--s-3)' }}>
                              {issue.tags.map((tag: string) => (
                                <Chip key={tag}>{tag}</Chip>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  </Reveal>
                ))}
              </div>
            ) : (
              <div className="research-empty">
                <div className="research-empty-icon" aria-hidden="true">
                  <Icon name="book" size={26} />
                </div>
                <h3>{journal.empty.title}</h3>
                <p>{journal.empty.detail}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="wrap">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(288px, 1fr))',
              gap: 'var(--s-4)',
            }}
          >
            {journal.sections.map((s, i) => (
              <Reveal key={s.id} delay={((i % 3) + 1) as any}>
                <A href={s.href} className="card card-pad card-hover card-action" style={{ height: '100%' }}>
                  <div className="mission-icon">
                    <Icon name={s.icon} size={19} />
                  </div>
                  <h3 style={{ fontSize: 'var(--t-lg)', marginTop: 'var(--s-4)' }}>{s.title}</h3>
                  <p
                    style={{
                      fontSize: 'var(--t-sm)',
                      color: 'var(--ink-2)',
                      lineHeight: 1.66,
                      marginTop: 'var(--s-3)',
                      flex: 1,
                    }}
                  >
                    {s.text}
                  </p>
                  <span className="hub-foot" style={{ marginTop: 'var(--s-5)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {s.cta}
                      <Icon name="arrow-right" size={12} />
                    </span>
                  </span>
                </A>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaSection />

      {/* Detailed Modal with Paper Link */}
      {activeIssue ? (
        <Modal
          open={Boolean(activeIssue)}
          onClose={() => setActiveIssue(null)}
          title={activeIssue.title}
          width={760}
        >
          <div style={{ padding: 'var(--s-6)' }}>
            <div className="tag-row" style={{ marginBottom: 'var(--s-4)' }}>
              <Chip tone="blue">{activeIssue.category || 'Journal Club'}</Chip>
              {activeIssue.topic ? <Chip>{activeIssue.topic}</Chip> : null}
            </div>

            <h2 style={{ fontSize: 'var(--t-2xl)', lineHeight: 1.3 }}>{activeIssue.title}</h2>
            {activeIssue.speakers || activeIssue.authors ? (
              <p style={{ marginTop: 'var(--s-2)', color: 'var(--ink-2)', fontSize: 'var(--t-sm)' }}>
                {activeIssue.speakers || activeIssue.authors}
              </p>
            ) : null}

            <section style={{ marginTop: 'var(--s-6)' }}>
              <h6 className="footer-h">Abstract / Overview</h6>
              <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', lineHeight: 1.68 }}>
                {activeIssue.abstract || activeIssue.summary}
              </p>
            </section>

            {activeIssue.keyFindings && activeIssue.keyFindings.length ? (
              <section style={{ marginTop: 'var(--s-6)' }}>
                <h6 className="footer-h">Key Findings / Takeaways</h6>
                <ul className="bullets" style={{ marginTop: 'var(--s-2)' }}>
                  {activeIssue.keyFindings.map((finding: string, idx: number) => (
                    <li key={idx} style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)' }}>
                      {finding}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {activeIssue.tags && activeIssue.tags.length ? (
              <section style={{ marginTop: 'var(--s-6)' }}>
                <h6 className="footer-h">Tags</h6>
                <div className="tag-row" style={{ marginTop: 'var(--s-2)' }}>
                  {activeIssue.tags.map((tag: string) => (
                    <Chip key={tag}>{tag}</Chip>
                  ))}
                </div>
              </section>
            ) : null}

            <section style={{ marginTop: 'var(--s-6)' }}>
              <h6 className="footer-h">Access</h6>
              <div className="tag-row" style={{ marginTop: 'var(--s-3)' }}>
                {activeIssue.paperLink ? (
                  <a
                    className="btn btn-ghost btn-sm"
                    href={activeIssue.paperLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon name="external" size={13} />
                    Read Discussed Paper
                  </a>
                ) : null}
                {activeIssue.pdf ? (
                  <a
                    className="btn btn-ghost btn-sm"
                    href={activeIssue.pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon name="download" size={13} />
                    Download PDF
                  </a>
                ) : null}
                {!activeIssue.paperLink && !activeIssue.pdf ? (
                  <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)' }}>
                    No paper link or PDF is available for this record yet.
                  </p>
                ) : null}
              </div>
            </section>
          </div>
        </Modal>
      ) : null}
    </>
  );
};
export default JournalPage;