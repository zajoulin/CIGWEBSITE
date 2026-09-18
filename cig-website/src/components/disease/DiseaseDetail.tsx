/* ==========================================================================
   CIG — Disease module
   Twelve structured sections with a sticky contents rail and scroll spy, plus
   the synchronised pathophysiology animation where one exists.
   ========================================================================== */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { A } from '../../lib/router';
import { Icon } from '../icons/Icon';
import {
  Bullets,
  Chip,
  DataTable,
  Disclaimer,
  References,
  Steps,
} from '../ui/primitives';
import { DiseaseAnimationPlayer } from './DiseaseAnimationPlayer';
import {
  animationById,
  diseaseCategoryById,
  keyPointById,
  org,
  resolveReferences,
  structureById,
} from '../../lib/content';
import type { Disease } from '../../lib/types';

interface SectionDef {
  id: string;
  title: string;
  render: () => ReactNode;
}

const Section = ({
  id,
  index,
  title,
  children,
}: {
  id: string;
  index: number;
  title: string;
  children: ReactNode;
}) => (
  <section className="d-section" id={id}>
    {/* h2, not h3: these are the top-level sections of the module, directly
        under the page h1. The size comes from .d-section > h2, so the tag is
        purely semantic. */}
    <h2>
      <span className="n">{String(index).padStart(2, '0')}</span>
      {title}
    </h2>
    {children}
  </section>
);

export const DiseaseDetail = ({ disease }: { disease: Disease }) => {
  const category = diseaseCategoryById.get(disease.categoryId);
  const animation = disease.animationId ? animationById.get(disease.animationId) : undefined;
  const refs = resolveReferences(disease.references);
  const [activeId, setActiveId] = useState('overview');
  const contentRef = useRef<HTMLDivElement | null>(null);

  const sections: SectionDef[] = useMemo(() => {
    const list: SectionDef[] = [
      {
        id: 'overview',
        title: 'Overview',
        render: () => (
          <p style={{ fontSize: 'var(--t-md)', color: 'var(--ink-2)', lineHeight: 1.72, maxWidth: '78ch' }}>
            {disease.overview}
          </p>
        ),
      },
      {
        id: 'risk-factors',
        title: 'Risk Factors',
        render: () => (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 'var(--s-5)',
            }}
          >
            <div className="card card-pad">
              <h3 className="footer-h" style={{ color: 'var(--blue)' }}>
                Modifiable
              </h3>
              <Bullets items={disease.riskFactors.modifiable} />
            </div>
            <div className="card card-pad">
              <h3 className="footer-h" style={{ color: 'var(--crimson-bright)' }}>
                Non-modifiable
              </h3>
              <Bullets items={disease.riskFactors.nonModifiable} tone="crimson" />
            </div>
          </div>
        ),
      },
      {
        id: 'pathophysiology',
        title: 'Pathophysiology',
        render: () => <Steps items={disease.pathophysiology} />,
      },
    ];

    if (animation) {
      list.push({
        id: 'visualisation',
        title: 'Visualisation',
        render: () => (
          <div style={{ display: 'grid', gap: 'var(--s-4)' }}>
            <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', maxWidth: '78ch' }}>
              {animation.subtitle}
            </p>
            <DiseaseAnimationPlayer animation={animation} />
          </div>
        ),
      });
    }

    list.push(
      {
        id: 'anatomy',
        title: 'Anatomy Involved',
        render: () => (
          <div style={{ display: 'grid', gap: 'var(--s-5)' }}>
            <Bullets items={disease.anatomyInvolved} />
            {disease.relatedStructures.length ? (
              <div>
                <h3 className="footer-h" style={{ marginBottom: 'var(--s-3)' }}>
                  Explore these structures in 3D
                </h3>
                <div className="related-grid">
                  {disease.relatedStructures.map((id) => {
                    const s = structureById.get(id);
                    if (!s) return null;
                    return (
                      <A key={id} href={`/anatomy?structure=${s.id}`} className="related-link">
                        <span className="tree-swatch" style={{ background: s.color }} aria-hidden="true" />
                        <span style={{ flex: 1 }}>{s.name}</span>
                        <Icon name="arrow-up-right" size={12} />
                      </A>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: 'physiology',
        title: 'Physiological Changes',
        render: () => <Bullets items={disease.physiologyChanges} />,
      },
      {
        id: 'progression',
        title: 'Disease Progression',
        render: () => (
          <div className="timeline">
            {disease.progression.map((p, i) => (
              <div className="tl-item" key={i}>
                <div className="tl-date">{p.stage}</div>
                <p
                  style={{
                    fontSize: 'var(--t-sm)',
                    color: 'var(--ink-2)',
                    lineHeight: 1.62,
                    marginTop: 6,
                    maxWidth: '74ch',
                  }}
                >
                  {p.text}
                </p>
              </div>
            ))}
          </div>
        ),
      },
      {
        id: 'clinical',
        title: 'Clinical Presentation',
        render: () => (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 'var(--s-5)',
            }}
          >
            <div className="card card-pad">
              <h3 className="footer-h" style={{ color: 'var(--blue)' }}>
                Symptoms
              </h3>
              <Bullets items={disease.clinical.symptoms} />
            </div>
            <div className="card card-pad">
              <h3 className="footer-h" style={{ color: 'var(--crimson-bright)' }}>
                Signs
              </h3>
              <Bullets items={disease.clinical.signs} tone="crimson" />
            </div>
          </div>
        ),
      },
      {
        id: 'investigations',
        title: 'Investigations',
        render: () => (
          <DataTable
            table={{
              headers: ['Investigation', 'What it shows'],
              rows: disease.investigations.map((i) => [i.modality, i.findings]),
            }}
          />
        ),
      },
      {
        id: 'complications',
        title: 'Complications',
        render: () => <Bullets items={disease.complications} tone="crimson" />,
      },
      {
        id: 'treatment',
        title: 'Treatment Overview',
        render: () => (
          <div style={{ display: 'grid', gap: 'var(--s-5)' }}>
            <Disclaimer
              title="Educational summary"
              body={disease.treatment.principles}
            />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 'var(--s-4)',
              }}
            >
              {disease.treatment.groups.map((g) => (
                <div className="card card-pad" key={g.name}>
                  <h3 style={{ fontSize: 'var(--t-md)', marginBottom: 6 }}>{g.name}</h3>
                  <p style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-2)', lineHeight: 1.62 }}>
                    {g.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        id: 'takeaways',
        title: 'Key Takeaways',
        render: () => (
          <ol style={{ display: 'grid', gap: 'var(--s-3)', maxWidth: '80ch' }}>
            {disease.keyTakeaways.map((k, i) => (
              <li
                key={i}
                className="card card-pad"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr',
                  gap: 'var(--s-3)',
                  padding: 'var(--s-4)',
                  alignItems: 'start',
                }}
              >
                <span className="mono" style={{ fontSize: 11, color: 'var(--blue)', paddingTop: 3 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ fontSize: 'var(--t-sm)', lineHeight: 1.62 }}>{k}</span>
              </li>
            ))}
          </ol>
        ),
      },
      {
        id: 'references',
        title: 'References',
        render: () => (
          <div style={{ display: 'grid', gap: 'var(--s-5)' }}>
            <References items={refs} />
            {disease.relatedKeyPoints.length ? (
              <div>
                <h3 className="footer-h" style={{ marginBottom: 'var(--s-3)' }}>
                  Related learning
                </h3>
                <div className="related-grid">
                  {disease.relatedKeyPoints.map((id) => {
                    const k = keyPointById.get(id);
                    if (!k) return null;
                    return (
                      <A key={id} href={`/learn/keypoints?topic=${k.id}`} className="related-link">
                        <Icon name="lightbulb" size={13} className="ic" />
                        <span style={{ flex: 1 }}>{k.title}</span>
                        <Icon name="arrow-up-right" size={12} />
                      </A>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ),
      },
    );

    return list;
  }, [disease, animation, refs]);

  // Scroll spy for the contents rail.
  useEffect(() => {
    const root = contentRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const els = sections
      .map((s) => root.querySelector<HTMLElement>(`#${s.id}`))
      .filter((e): e is HTMLElement => Boolean(e));
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target?.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-18% 0px -68% 0px', threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  return (
    <>
      <header className="disease-hero">
        <div className="grid-bg" />
        <div
          className="glow"
          style={{ width: 520, height: 380, top: -160, left: '48%', background: 'var(--crimson-glow)' }}
        />
        <div className="wrap">
          <A
            href="/diseases"
            className="btn btn-quiet btn-sm"
            style={{ marginBottom: 'var(--s-5)', paddingLeft: 0 }}
          >
            <Icon name="chevron-right" size={13} className="arrow" />
            All disease modules
          </A>
          <span className="eyebrow eyebrow-crimson">{category?.label ?? 'Cardiovascular disease'}</span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.4vw, 3.2rem)', marginTop: 'var(--s-4)' }}>
            {disease.name}
          </h1>
          <p className="lede" style={{ marginTop: 'var(--s-4)', maxWidth: '72ch' }}>
            {disease.tagline}
          </p>
          <div className="tag-row" style={{ marginTop: 'var(--s-5)' }}>
            {disease.abbr ? <Chip tone="crimson">{disease.abbr}</Chip> : null}
            {animation ? (
              <Chip tone="blue">
                <Icon name="play" size={10} />
                Includes animation
              </Chip>
            ) : null}
            <Chip>{sections.length} sections</Chip>
            <Chip>{refs.length} references</Chip>
          </div>
        </div>
      </header>

      <div className="wrap section" ref={contentRef}>
        <div className="disease-layout">
          <nav className="toc" aria-label="Sections of this module">
            {sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={'toc-link' + (activeId === s.id ? ' active' : '')}
                aria-current={activeId === s.id ? 'true' : undefined}
              >
                <span className="toc-num">{String(i + 1).padStart(2, '0')}</span>
                {s.title}
              </a>
            ))}
          </nav>

          <div>
            {sections.map((s, i) => (
              <Section key={s.id} id={s.id} index={i + 1} title={s.title}>
                {s.render()}
              </Section>
            ))}

            <div style={{ marginTop: 'var(--s-8)' }}>
              <Disclaimer title={org.disclaimer.title} body={org.disclaimer.body} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
