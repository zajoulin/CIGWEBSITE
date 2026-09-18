/* ==========================================================================
   CIG — Homepage sections
   --------------------------------------------------------------------------
   The homepage introduces the organisation first: who CIG is, what it does,
   what it runs, who leads it, and the research and education it produces.
   The Learning Hub — the interactive anatomy and disease platform — is
   presented as one of CIG's major functions rather than as the whole site.

   Every string here comes from /content. Nothing is hard-coded.
   ========================================================================== */

import { useState } from 'react';
import { A } from '../../lib/router';
import { Icon } from '../icons/Icon';
import { Chip, PlaceholderTag, Reveal, SectionHeader, Stat } from '../ui/primitives';
import { Crest } from '../brand/Crest';
import { AnatomyStage } from '../anatomy/AnatomyStage';
import { DiseaseCard } from '../disease/DiseaseExplorer';
import { PersonCard, PersonModal } from '../people/PersonCard';
import { VIEW_MODES } from '../../lib/cardio3d';
import type { Person } from '../../lib/types';
import {
  anatomyCategories,
  contentStats,
  diseases,
  events,
  featuredDiseases,
  hubSections,
  org,
  president,
  research,
  structureByMesh,
  teamHeads,
  vicePresidents,
} from '../../lib/content';

/* --------------------------------------------------------------- About -- */

export const AboutCigSection = () => (
  <section className="section" id="about-cig">
    <div className="wrap">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'var(--s-10)',
          alignItems: 'start',
        }}
      >
        <div>
          <SectionHeader
            eyebrow="About CIG"
            title={`Who we are`}
            lede={org.whoWeAre}
          />
          <div className="hero-cta" style={{ marginTop: 'var(--s-6)' }}>
            <A href="/about" className="btn btn-primary">
              More about CIG
              <Icon name="arrow-right" size={14} className="arrow" />
            </A>
            <A href="/leadership" className="btn btn-ghost">
              Meet the team
            </A>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 'var(--s-4)' }}>
          <Reveal delay={1}>
            <article className="card card-pad">
              <span className="eyebrow eyebrow-navy">Our mission</span>
              <p style={{ marginTop: 'var(--s-4)', fontSize: 'var(--t-sm)', lineHeight: 1.7 }}>
                {org.missionStatement}
              </p>
            </article>
          </Reveal>
          <Reveal delay={2}>
            <article className="card card-pad">
              <span className="eyebrow eyebrow-blue">Our vision</span>
              <p style={{ marginTop: 'var(--s-4)', fontSize: 'var(--t-sm)', lineHeight: 1.7 }}>
                {org.visionStatement}
              </p>
            </article>
          </Reveal>
        </div>
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------- Pillars -- */

/** The six commitments that shape what CIG does. */
export const MissionSection = () => (
  <section className="section-tight" id="what-we-do">
    <div className="wrap">
      <SectionHeader
        eyebrow="What we do"
        title="Six commitments that shape everything CIG does"
        lede="Education, research, clinical exposure, collaboration, leadership and innovation — the six areas the group organises itself around."
      />
      <div className="pillar-grid" style={{ marginTop: 'var(--s-10)' }}>
        {org.mission.map((m, i) => (
          <Reveal key={m.id} delay={((i % 6) + 1) as 1}>
            <article className="card card-hover pillar">
              <span className="pillar-idx">{String(i + 1).padStart(2, '0')}</span>
              <div className="mission-icon">
                <Icon name={m.icon} size={20} />
              </div>
              <h4>{m.title}</h4>
              <p>{m.text}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

/* ---------------------------------------------------------- Activities -- */

export const WhatWeDoSection = ({ standalone = false }: { standalone?: boolean }) => (
  <section className="section" id="activities">
    <div className="wrap">
      <SectionHeader
        eyebrow={standalone ? 'Programme' : 'Activities'}
        title="The CIG programme"
        lede="Teaching, journal club, research mentorship, clinical skills, clinical exposure and community work — run by students, for students."
        action={
          standalone ? undefined : (
            <A href="/activities" className="btn btn-ghost">
              Activities & events
              <Icon name="arrow-right" size={14} className="arrow" />
            </A>
          )
        }
      />
      <div className="activity-grid">
        {org.activities.map((a, i) => (
          <Reveal key={a.title} delay={((i % 6) + 1) as 1}>
            <article className="card card-hover activity-card" style={{ height: '100%' }}>
              <div className="act-icon">
                <Icon name={a.icon} size={19} />
              </div>
              <div>
                <h4>{a.title}</h4>
                <p>{a.text}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

/** Upcoming activities — placeholder entries until CIG supplies a calendar. */
export const EventsSection = ({ limit }: { limit?: number }) => {
  const shown = typeof limit === 'number' ? events.slice(0, limit) : events;
  const anyPlaceholder = shown.some((e) => e.placeholder);

  return (
    <section className="section-tight" id="events">
      <div className="wrap">
        <SectionHeader
          eyebrow="What's on"
          accent="blue"
          title="Upcoming sessions & events"
          lede="Sessions, workshops, journal clubs and clinical exposure days that CIG runs through the academic year."
        />
        {anyPlaceholder ? (
          <div className="disclaimer" style={{ marginBlock: 'var(--s-6)' }}>
            <Icon name="info" size={16} />
            <p>
              <strong>Placeholder schedule.</strong> The entries below describe the shape of a CIG
              event rather than announcing a real one. No date, venue or speaker is claimed. CIG
              members replace them in <code className="mono">content/events.json</code>.
            </p>
          </div>
        ) : null}
        <div className="activity-grid" style={{ marginTop: 'var(--s-6)' }}>
          {shown.map((e, i) => (
            <Reveal key={e.id} delay={((i % 4) + 1) as 1}>
              <article className="card card-hover activity-card" style={{ height: '100%' }}>
                <div className="act-icon">
                  <Icon name={e.icon} size={19} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="tag-row" style={{ marginBottom: 8 }}>
                    <Chip tone="blue">{e.kind}</Chip>
                    {e.placeholder ? <PlaceholderTag label="Placeholder" /> : null}
                  </div>
                  <h4>{e.title}</h4>
                  <p>{e.text}</p>
                  <div className="act-meta tag-row">
                    <Chip>
                      <Icon name="calendar" size={10} />
                      {e.when}
                    </Chip>
                    <Chip>{e.where}</Chip>
                    <Chip>{e.audience}</Chip>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------- Learning Hub -- */

const METRIC_LABEL: Record<string, string> = {
  structures: 'structures',
  diseases: 'modules',
  animations: 'animations',
  keyPoints: 'topics',
  glossary: 'terms',
  references: 'references',
  ecgRhythms: 'rhythms',
  auscultationSites: 'auscultation areas',
  clinicalCases: 'reviewed clinical cases',
};

/** The Learning Hub showcase: CIG's education programme in card form. */
export const LearningHubSection = () => (
  <section className="section" id="learning-hub">
    <div className="wrap">
      <SectionHeader
        eyebrow={org.learningHub.eyebrow}
        title={org.learningHub.name}
        lede={org.learningHub.lede}
        action={
          <A href="/learn" className="btn btn-primary">
            Enter the {org.learningHub.short}
            <Icon name="arrow-right" size={14} className="arrow" />
          </A>
        }
      />
      <HubCards />
    </div>
  </section>
);

/**
 * The Learning Hub's cards. A section marked `featured` in content/hub.json is
 * rendered first and full width — the Clinical Simulation is the flagship
 * experience of the Hub, and it should not sit in the grid as one card among
 * nine.
 */
export const HubCards = () => {
  const featured = hubSections.filter((h) => h.featured);
  const rest = hubSections.filter((h) => !h.featured);

  return (
    <>
      {featured.map((h) => {
        const count = contentStats[h.metric as keyof typeof contentStats];
        return (
          <Reveal key={h.id} delay={1}>
            <A
              href={h.href}
              className="card card-hover card-action hub-feature"
              aria-label={`${h.title} — ${h.cta}`}
            >
              <div className="hub-feature-art" aria-hidden="true">
                <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice">
                  <defs>
                    <linearGradient id="hub-feature-sky" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16293e" />
                      <stop offset="100%" stopColor="#081522" />
                    </linearGradient>
                    <linearGradient id="hub-feature-sheet" x1="0" y1="1" x2="0.1" y2="0">
                      <stop offset="0%" stopColor="#aebccd" />
                      <stop offset="100%" stopColor="#e6edf5" />
                    </linearGradient>
                    <linearGradient id="hub-feature-blanket" x1="0" y1="1" x2="0.15" y2="0">
                      <stop offset="0%" stopColor="#2c4666" />
                      <stop offset="100%" stopColor="#5c81ae" />
                    </linearGradient>
                  </defs>
                  <rect width="320" height="200" fill="url(#hub-feature-sky)" />
                  <path d="M0 116 H320" stroke="rgba(150,190,235,0.16)" strokeWidth="1.4" />
                  {/* floor lines converging behind the bed head */}
                  <g stroke="rgba(150,190,235,0.07)" strokeWidth="1.2">
                    <path d="M-20 200 L118 116" />
                    <path d="M340 200 L202 116" />
                  </g>
                  {/* bed, narrowing away from the viewer */}
                  <path d="M96 196 L128 118 H192 L224 196 Z" fill="url(#hub-feature-sheet)" />
                  <path d="M128 118 H192 L186 84 q-26 -5 -52 0 Z" fill="#e9f0f8" />
                  <path d="M138 92 q22 -5 44 0 q8 14 -22 15 q-30 -1 -22 -15 Z" fill="#f4f8fc" />
                  <ellipse cx="160" cy="88" rx="13" ry="15" fill="#dcb89e" />
                  <path
                    d="M146 106 C 124 112, 114 128, 112 146 Q 160 156, 208 146 C 206 128, 196 112, 174 106 Q 160 113, 146 106 Z"
                    fill="#c9d8e8"
                  />
                  <path d="M118 176 L136 136 q24 5 48 0 L202 176 q-42 8 -84 0 Z" fill="url(#hub-feature-blanket)" />
                  <rect x="88" y="186" width="144" height="8" rx="4" fill="#7f93aa" />
                  {/* monitor on its stand, screen square to the viewer */}
                  <rect x="238" y="38" width="74" height="56" rx="6" fill="#0b1a26" stroke="rgba(150,200,235,0.4)" strokeWidth="2" />
                  <path
                    className="clinical-trace"
                    d="M244 68 h10 l4-5 3 11 4-24 4 32 4-14 h9 l4 2 h20"
                  />
                  <rect x="272" y="94" width="6" height="76" rx="3" fill="#7f93aa" />
                  <path d="M250 172 H298" stroke="#7f93aa" strokeWidth="6" strokeLinecap="round" />
                  {/* IV stand */}
                  <rect x="46" y="52" width="5" height="118" rx="2.5" fill="#7f93aa" />
                  <path d="M32 56 H64" stroke="#7f93aa" strokeWidth="4" strokeLinecap="round" />
                  <rect x="32" y="60" width="32" height="42" rx="6" fill="rgba(206,230,248,0.5)" />
                  <path d="M32 84 h32 v18 a6 6 0 0 1 -6 6 h-20 a6 6 0 0 1 -6 -6 Z" fill="rgba(150,205,240,0.5)" />
                  <path d="M28 172 H70" stroke="#7f93aa" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </div>
              <div className="hub-feature-body">
                <span className="eyebrow eyebrow-crimson">Flagship module</span>
                <h3>{h.title}</h3>
                <p>{h.text}</p>
                <div className="hub-foot">
                  <span>
                    {count} {METRIC_LABEL[h.metric] ?? ''}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {h.cta}
                    <Icon name="arrow-right" size={12} />
                  </span>
                </div>
              </div>
            </A>
          </Reveal>
        );
      })}

      <div className="hub-grid">
        {rest.map((h, i) => {
          const count = contentStats[h.metric as keyof typeof contentStats];
          return (
            <Reveal key={h.id} delay={((i % 6) + 1) as 1}>
              <A
                href={h.href}
                className="card card-hover card-action card-accent hub-card"
                aria-label={`${h.title} — ${h.cta}`}
              >
                <div className="hub-icon">
                  <Icon name={h.icon} size={21} />
                </div>
                <h4>{h.title}</h4>
                <p>{h.text}</p>
                <div className="hub-foot">
                  <span>
                    {count} {METRIC_LABEL[h.metric] ?? ''}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {h.cta}
                    <Icon name="arrow-right" size={12} />
                  </span>
                </div>
              </A>
            </Reveal>
          );
        })}
      </div>
    </>
  );
};

/* -------------------------------------------------------- Anatomy preview -- */

const FULL_VIEW = VIEW_MODES[0];

export const AnatomyPreviewSection = () => {
  const [mesh, setMesh] = useState<string | null>('heart.left_ventricle');
  const structure = mesh ? structureByMesh.get(mesh) : undefined;

  return (
    <section className="section" id="anatomy-preview">
      <div className="wrap">
        <SectionHeader
          eyebrow="Interactive anatomy"
          title="Twenty-four structures, each one selectable, isolatable and referenced"
          lede="Rotate the model, click a structure, and read its anatomy, physiology, pathology and clinical relevance side by side. Every structure links onwards to the diseases that involve it."
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)',
            gap: 'var(--s-8)',
            alignItems: 'center',
            marginTop: 'var(--s-10)',
          }}
          className="anatomy-preview-grid"
        >
          <div
            className="card stage"
            style={{ overflow: 'hidden', aspectRatio: '4 / 3', position: 'relative' }}
          >
            <AnatomyStage
              selectedMesh={mesh}
              viewMode={FULL_VIEW}
              isolated={false}
              hidden={new Set()}
              onSelect={setMesh}
              autoRotate
              initialRadius={10.4}
              initialTarget={[0, 0.12, 0]}
            />
          </div>

          <div>
            {structure ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span
                    className="tree-swatch"
                    style={{ background: structure.color, width: 10, height: 10 }}
                    aria-hidden="true"
                  />
                  <span
                    className="mono"
                    style={{
                      fontSize: 10.5,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-3)',
                    }}
                  >
                    {anatomyCategories.find((c) => c.id === structure.category)?.label}
                  </span>
                </div>
                <h3 style={{ fontSize: 'var(--t-2xl)' }}>{structure.name}</h3>
                <p
                  style={{
                    marginTop: 'var(--s-3)',
                    fontSize: 'var(--t-sm)',
                    color: 'var(--ink-2)',
                    lineHeight: 1.68,
                  }}
                >
                  {structure.summary}
                </p>
                <ul className="bullets" style={{ marginTop: 'var(--s-5)' }}>
                  {structure.keyPoints.slice(0, 3).map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="lede">Click any structure on the model to read about it.</p>
            )}

            <div className="tag-row" style={{ marginTop: 'var(--s-6)' }}>
              {VIEW_MODES.map((m) => (
                <Chip key={m.id} tone="blue">
                  {m.label}
                </Chip>
              ))}
            </div>

            <A href="/anatomy" className="btn btn-blue" style={{ marginTop: 'var(--s-6)' }}>
              Explore full anatomy
              <Icon name="arrow-right" size={14} className="arrow" />
            </A>
          </div>
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------- Disease preview -- */

export const DiseasePreviewSection = () => (
  <section className="section" id="disease-preview">
    <div className="wrap">
      <SectionHeader
        eyebrow="Cardiovascular diseases"
        accent="crimson"
        title="What happens when the circulation goes wrong"
        lede={`${contentStats.diseases} disease modules across twelve categories, each with pathophysiology explained step by step — and animated visualisations for five of them.`}
        action={
          <A href="/diseases" className="btn btn-ghost">
            All {contentStats.diseases} modules
            <Icon name="arrow-right" size={14} className="arrow" />
          </A>
        }
      />

      <div className="disease-grid">
        {featuredDiseases.map((d, i) => (
          <DiseaseCard key={d.id} disease={d} delay={((i % 4) + 1) as 1} />
        ))}
        {diseases
          .filter((d) => !d.featured)
          .slice(0, 1)
          .map((d) => (
            <DiseaseCard key={d.id} disease={d} delay={2} />
          ))}
      </div>
    </div>
  </section>
);

/* --------------------------------------------- Research & Journal preview -- */

/**
 * CIG's academic output: the research the group runs, and the Journal it
 * publishes. When there are no published records yet the section says so and
 * points at the research-idea route instead of rendering empty cards.
 */
export const ResearchPreviewSection = () => {
  const latest = [...research].sort((a, b) => b.year - a.year).slice(0, 3);

  return (
    <section className="section" id="research-preview">
      <div className="wrap">
        <SectionHeader
          eyebrow="Research & publication"
          title="What CIG researches and publishes"
          lede="CIG runs student-led cardiovascular research under academic supervision, and publishes the writing of its members in the CIG Journal. Members can propose a project of their own at any time."
          action={
            <A href="/research" className="btn btn-ghost">
              CIG Research
              <Icon name="arrow-right" size={14} className="arrow" />
            </A>
          }
        />

        {latest.length ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(288px, 1fr))',
              gap: 'var(--s-4)',
            }}
          >
            {latest.map((r, i) => (
              <Reveal key={r.id} delay={((i % 4) + 1) as 1}>
                <A
                  href="/research"
                  className="card card-pad card-hover card-action card-accent card-accent-blue"
                  style={{ display: 'grid', gap: 'var(--s-3)', height: '100%' }}
                >
                  <div className="tag-row">
                    <Chip tone="blue">{r.category}</Chip>
                    <Chip>{r.year}</Chip>
                  </div>
                  <h4
                    style={{ fontSize: 'var(--t-md)', lineHeight: 1.34, letterSpacing: '-0.014em' }}
                  >
                    {r.title}
                  </h4>
                  <p style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-3)' }}>
                    {r.authors.join(', ')}
                  </p>
                  <p className="research-abstract">{r.abstract}</p>
                </A>
              </Reveal>
            ))}
          </div>
        ) : null}

        <div
          className={latest.length ? 'academic-grid academic-grid-tight' : 'academic-grid'}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(288px, 1fr))',
            gap: 'var(--s-4)',
            marginTop: latest.length ? 'var(--s-4)' : 0,
          }}
        >
          <Reveal delay={1}>
            <A
              href="/research"
              className="card card-pad card-hover card-action card-accent card-accent-blue"
              style={{ display: 'grid', gap: 'var(--s-3)', height: '100%', alignContent: 'start' }}
            >
              <div className="mission-icon">
                <Icon name="microscope" size={19} />
              </div>
              <h4 style={{ fontSize: 'var(--t-lg)' }}>CIG Research</h4>
              <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', lineHeight: 1.66 }}>
                Student-led cardiovascular projects with academic supervision — from framing the
                question to writing it up. Published and presented work is listed as it appears.
              </p>
              <span className="hub-foot">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  Explore CIG research
                  <Icon name="arrow-right" size={12} />
                </span>
              </span>
            </A>
          </Reveal>

          <Reveal delay={2}>
            <A
              href="/journal"
              className="card card-pad card-hover card-action card-accent card-accent-blue"
              style={{ display: 'grid', gap: 'var(--s-3)', height: '100%', alignContent: 'start' }}
            >
              <div className="mission-icon">
                <Icon name="book" size={19} />
              </div>
              <h4 style={{ fontSize: 'var(--t-lg)' }}>The CIG Journal</h4>
              <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', lineHeight: 1.66 }}>
                CIG's publication activity: case discussions, focused reviews and reports written
                by members, edited by students, and the journal club that trains them to read the
                literature first.
              </p>
              <span className="hub-foot">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  Visit the Journal
                  <Icon name="arrow-right" size={12} />
                </span>
              </span>
            </A>
          </Reveal>

          <Reveal delay={3}>
            <A
              href="/research"
              className="card card-pad card-hover card-action card-accent card-accent-blue"
              style={{ display: 'grid', gap: 'var(--s-3)', height: '100%', alignContent: 'start' }}
            >
              <div className="mission-icon">
                <Icon name="lightbulb" size={19} />
              </div>
              <h4 style={{ fontSize: 'var(--t-lg)' }}>Have a research idea?</h4>
              <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', lineHeight: 1.66 }}>
                Submit it to the CIG research team. Where appropriate we will discuss the project
                with you and explore opportunities to become involved in the research process.
              </p>
              <span className="hub-foot">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  Submit a research idea
                  <Icon name="arrow-right" size={12} />
                </span>
              </span>
            </A>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

/* ----------------------------------------------------- Leadership preview -- */

/** President, vice presidents and team heads, with the full tree on /leadership. */
export const LeadershipPreviewSection = () => {
  const [open, setOpen] = useState<Person | null>(null);
  const featured = [president, ...vicePresidents, ...teamHeads.slice(0, 3)].filter(
    (p): p is Person => Boolean(p),
  );

  return (
    <section className="section" id="leadership">
      <div className="wrap">
        <SectionHeader
          eyebrow="Leadership"
          title="The people behind CIG"
          lede={`A president, two vice presidents and ${contentStats.teams} student teams. Names, photographs and biographies are placeholders until the CIG team supplies their own.`}
          action={
            <A href="/leadership" className="btn btn-ghost">
              Full leadership structure
              <Icon name="arrow-right" size={14} className="arrow" />
            </A>
          }
        />
        <div className="org-tier-heads" style={{ gap: 'var(--s-4)' }}>
          {featured.map((p, i) => (
            <Reveal key={p.id} delay={((i % 6) + 1) as 1}>
              <PersonCard person={p} onOpen={setOpen} />
            </Reveal>
          ))}
        </div>
      </div>
      <PersonModal person={open} onClose={() => setOpen(null)} />
    </section>
  );
};

/* ------------------------------------------------------------ Resources -- */

export const ResourcesSection = () => (
  <section className="section-tight" id="resources">
    <div className="wrap">
      <SectionHeader
        eyebrow="Resources"
        accent="blue"
        title="Open resources for every student"
        lede="Everything CIG builds is free to use, cross-referenced and cited — inside the Faculty and beyond it."
      />
      <div className="stat-band" style={{ marginTop: 'var(--s-8)' }}>
        {org.stats.map((s) => (
          <div key={s.label}>
            <Stat value={s.value} label={s.label} />
          </div>
        ))}
      </div>
      <div className="tag-row" style={{ marginTop: 'var(--s-6)' }}>
        <A href="/learn/glossary" className="btn btn-ghost btn-sm">
          <Icon name="book" size={13} />
          Glossary — {contentStats.glossary} terms
        </A>
        <A href="/learn/keypoints" className="btn btn-ghost btn-sm">
          <Icon name="lightbulb" size={13} />
          Key points — {contentStats.keyPoints} topics
        </A>
        <A href="/learn" className="btn btn-ghost btn-sm">
          <Icon name="grid" size={13} />
          All {org.learningHub.short} modules
        </A>
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------- CTA -- */

export const CtaSection = () => (
  <section className="section">
    <div className="wrap">
      <div className="cta-band stage">
        <div className="grid-bg" />
        <div style={{ position: 'relative', display: 'grid', justifyItems: 'center' }}>
          <span className="crest-plate" style={{ width: 92, marginBottom: 'var(--s-6)' }}>
            <Crest width="100%" decorative />
          </span>
          <span className="eyebrow">{org.joinCta.eyebrow}</span>
          <h2 style={{ marginTop: 'var(--s-5)' }}>{org.joinCta.title}</h2>
          <p style={{ marginTop: 'var(--s-4)', maxWidth: '58ch' }}>{org.joinCta.body}</p>
          <p
            className="mono"
            style={{
              marginTop: 'var(--s-5)',
              fontSize: 'var(--t-sm)',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--sky)',
            }}
          >
            {org.tagline}
          </p>
          <div
            style={{
              display: 'flex',
              gap: 'var(--s-3)',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: 'var(--s-8)',
            }}
          >
            <A href="/about" className="btn btn-primary btn-lg">
              {org.joinCta.primaryLabel}
              <Icon name="arrow-right" size={15} className="arrow" />
            </A>
            <A href="/learn" className="btn btn-ghost btn-lg">
              {org.joinCta.secondaryLabel}
            </A>
          </div>
          <p
            style={{
              marginTop: 'var(--s-6)',
              fontSize: 'var(--t-2xs)',
              color: 'var(--ink-3)',
              maxWidth: '62ch',
            }}
          >
            {org.joinCta.note}
          </p>
        </div>
      </div>
    </div>
  </section>
);
