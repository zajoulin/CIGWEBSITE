/* ==========================================================================
   CIG — Home, About, Activities, Learning Hub, Leadership, Diseases,
   Disease detail and Research pages
   --------------------------------------------------------------------------
   The site is the digital home of the Cardiology Interest Group. The
   cardiovascular education platform — interactive anatomy, disease modules,
   animations, key points and glossary — is presented as CIG's Learning Hub,
   one of the group's major functions.
   ========================================================================== */

import type { ReactNode } from 'react';
import { A, useRouter } from '../lib/router';
import { Icon } from '../components/icons/Icon';
import { Hero } from '../components/home/Hero';
import {
  AboutCigSection,
  AnatomyPreviewSection,
  CtaSection,
  DiseasePreviewSection,
  EventsSection,
  HubCards,
  LeadershipPreviewSection,
  LearningHubSection,
  MissionSection,
  ResearchPreviewSection,
  ResourcesSection,
  WhatWeDoSection,
} from '../components/home/sections';
import { Crest } from '../components/brand/Crest';
import { LeadershipTree } from '../components/people/LeadershipTree';
import { DiseaseExplorer } from '../components/disease/DiseaseExplorer';
import { DiseaseDetail } from '../components/disease/DiseaseDetail';
import { Chip, Disclaimer, Reveal, SectionHeader, Stat } from '../components/ui/primitives';
import { ErrorState } from '../components/ui/states';
import { contentStats, diseaseById, org, simulationConfig } from '../lib/content';

/* ------------------------------------------------------------ Page head -- */

/**
 * The standard CIG section front: crest, eyebrow, title and lede on the deep
 * navy identity band, so every major area of the site is unmistakably CIG's.
 */
const PageHead = ({
  eyebrow,
  title,
  lede,
  children,
  crest = true,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  children?: ReactNode;
  crest?: boolean;
}) => (
  <header className="page-head page-head-navy stage">
    <div className="grid-bg" />
    <div className="wrap">
      <div className="page-head-row">
        {crest ? (
          <span className="crest-plate page-head-crest">
            <Crest width="100%" decorative />
          </span>
        ) : null}
        <div style={{ minWidth: 0 }}>
          <span className="eyebrow">{eyebrow}</span>
          <h1 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.9rem)', marginTop: 'var(--s-4)' }}>
            {title}
          </h1>
          {lede ? (
            <p className="lede" style={{ marginTop: 'var(--s-4)', maxWidth: '74ch' }}>
              {lede}
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  </header>
);

/* ------------------------------------------------------------------ Home -- */

export const HomePage = () => (
  <>
    <Hero />
    <AboutCigSection />
    <MissionSection />
    <WhatWeDoSection />
    <LearningHubSection />
    <ResearchPreviewSection />
    <LeadershipPreviewSection />
    <ResourcesSection />
    <CtaSection />
  </>
);

/* --------------------------------------------------- Clinical simulation -- */

/**
 * The Learning Hub's bedside area. One entry point, deliberately: the patient
 * room is not a feature of its own any more, it is the environment the
 * Clinical Simulation happens in. The examination module sits beside it as the
 * place to explore the same anatomy in three dimensions.
 */
const ClinicalSimulationSection = () => (
  <section className="section-tight" id="clinical-simulation">
    <div className="wrap">
      <SectionHeader
        eyebrow="Clinical simulation"
        title="Everything above, applied to one patient"
        lede={simulationConfig.lede}
        accent="crimson"
      />

      <div className="clinical-grid" style={{ marginTop: 'var(--s-8)' }}>
        <Reveal delay={1}>
          <A href="/learn/simulation" className="card card-hover card-action clinical-card">
            <div className="clinical-card-art clinical-card-art-ecg" aria-hidden="true">
              <svg viewBox="0 0 320 120" preserveAspectRatio="none">
                <path
                  className="clinical-trace"
                  d="M0 72 H34 l6-8 5 16 6-40 7 56 6-24 h30 l7 4 h22 l6-8 5 16 6-40 7 56 6-24 h30 l7 4 h22 l6-8 5 16 6-40 7 56 6-24 h44"
                />
              </svg>
            </div>
            <div className="clinical-card-body">
              <span className="eyebrow eyebrow-crimson">Clinical Simulation</span>
              <h3>Enter the patient room and obtain the ECG yourself</h3>
              <p>
                {contentStats.clinicalCases} reviewed cases, chosen at random, each one internally
                coherent from the presenting complaint through the observations to the tracing and
                the heart sounds. Examine the patient, place all ten electrodes against their
                anatomical landmarks, acquire a 12-lead ECG, interpret it systematically and answer
                for your clinical reasoning — then review every mistake with the explanation beside
                it.
              </p>
              <span className="hub-foot">
                <span>Four difficulty levels · scored</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  Enter the clinical environment
                  <Icon name="arrow-right" size={12} />
                </span>
              </span>
            </div>
          </A>
        </Reveal>

        <Reveal delay={2}>
          <A href="/learn/examination" className="card card-hover card-action clinical-card">
            <div className="clinical-card-art clinical-card-art-exam" aria-hidden="true">
              <svg viewBox="0 0 320 120">
                <ellipse className="clinical-torso" cx="160" cy="74" rx="74" ry="52" />
                <path className="clinical-ribs" d="M96 52 q64 -18 128 0 M92 70 q68 -18 136 0 M96 88 q64 -16 128 0" />
                {[
                  [132, 60],
                  [150, 60],
                  [166, 72],
                  [186, 82],
                  [204, 84],
                  [120, 40],
                  [200, 40],
                ].map(([cx, cy], i) => (
                  <circle key={i} className="clinical-dot" cx={cx} cy={cy} r="5" />
                ))}
              </svg>
            </div>
            <div className="clinical-card-body">
              <span className="eyebrow eyebrow-blue">Clinical Examination</span>
              <h3>Explore the same chest in three dimensions</h3>
              <p>
                A rotatable three-dimensional thorax — male and female — with the ribs, sternum and
                heart visible through the chest wall. Select any of the ten leads to see exactly
                where it belongs and why, follow the cable from the electrode to the monitor, move a
                stethoscope across the five auscultation areas to hear synchronised heart sounds and
                murmurs, then test yourself in challenge mode.
              </p>
              <span className="hub-foot">
                <span>
                  {contentStats.auscultationSites} auscultation areas ·{' '}
                  {contentStats.heartSounds} sounds
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  Examine the patient
                  <Icon name="arrow-right" size={12} />
                </span>
              </span>
            </div>
          </A>
        </Reveal>
      </div>
    </div>
  </section>
);

/* ---------------------------------------------------------- Learning Hub -- */

export const LearnPage = () => (
  <>
    <PageHead
      eyebrow={org.learningHub.eyebrow}
      title={org.learningHub.name}
      lede={org.learningHub.lede}
    >
      <div className="tag-row" style={{ marginTop: 'var(--s-5)' }}>
        <Chip tone="blue">{contentStats.structures} anatomical structures</Chip>
        <Chip tone="blue">{contentStats.diseases} disease modules</Chip>
        <Chip tone="blue">{contentStats.animations} animations</Chip>
        <Chip tone="blue">{contentStats.ecgRhythms} ECG rhythms</Chip>
        <Chip tone="blue">{contentStats.glossary} glossary terms</Chip>
      </div>
    </PageHead>

    <section className="section">
      <div className="wrap">
        <SectionHeader
          eyebrow="Start here"
          title="Everything in the Learning Hub"
          lede="Every way into the same referenced body of cardiovascular material, built and maintained by CIG's Education Team — starting with the clinical simulation, where all of it is put to use on one patient."
        />
        <div style={{ marginTop: 'var(--s-8)' }}>
          <HubCards />
        </div>
      </div>
    </section>

    <ClinicalSimulationSection />
    <AnatomyPreviewSection />
    <DiseasePreviewSection />

    <section className="section-tight">
      <div className="wrap">
        <Disclaimer title={org.disclaimer.title} body={org.disclaimer.body} />
      </div>
    </section>

    <CtaSection />
  </>
);

/* ------------------------------------------------------------ Activities -- */

export const ActivitiesPage = () => (
  <>
    <PageHead
      eyebrow="Activities"
      title="What CIG runs"
      lede="Teaching sessions, journal clubs, research mentorship, clinical skills workshops, clinical exposure and community outreach — the year-round programme of the group."
    />
    <WhatWeDoSection standalone />
    <EventsSection />
    <CtaSection />
  </>
);

/* ------------------------------------------------------------ Leadership -- */

export const LeadershipPage = () => (
  <>
    <PageHead
      eyebrow="Leadership & teams"
      title="Who runs CIG"
      lede={`A president, two vice presidents, ${contentStats.teams} team heads and the members of each team. Names, photographs and biographies are placeholders until the CIG team supplies their own.`}
    />

    <section className="section-tight">
      <div className="wrap">
        <div className="stat-band lead-summary">
          <div>
            <Stat value="1" label="President" />
          </div>
          <div>
            <Stat value="2" label="Vice presidents" />
          </div>
          <div>
            <Stat value={String(contentStats.teams)} label="Student teams" />
          </div>
          <div>
            <Stat value={String(contentStats.people)} label="People listed" />
          </div>
        </div>
      </div>
    </section>

    <section className="section-tight" id="leadership">
      <div className="wrap">
        <LeadershipTree />
      </div>
    </section>

    <CtaSection />
  </>
);

/* -------------------------------------------------------------- Diseases -- */

export const DiseasesPage = () => {
  const { query } = useRouter();
  return (
    <>
      <PageHead
        eyebrow={`${org.learningHub.short} · Disease explorer`}
        title="Cardiovascular Diseases"
        lede={`${contentStats.diseases} modules across twelve categories. Each one follows the same structure — overview, risk factors, step-by-step pathophysiology, anatomy, physiology, progression, presentation, investigations, complications, treatment principles, key takeaways and references.`}
      >
        <div className="tag-row" style={{ marginTop: 'var(--s-5)' }}>
          <Chip tone="blue">
            <Icon name="play" size={10} />
            {contentStats.animations} animated pathophysiology visualisations
          </Chip>
          <Chip tone="blue">12 categories</Chip>
        </div>
      </PageHead>

      <div className="wrap section">
        <DiseaseExplorer initialCategory={query.category ?? 'all'} />
        <div style={{ marginTop: 'var(--s-10)' }}>
          <Disclaimer title={org.disclaimer.title} body={org.disclaimer.body} />
        </div>
      </div>
    </>
  );
};

export const DiseaseDetailPage = ({ id }: { id: string }) => {
  const disease = diseaseById.get(id);
  if (!disease) {
    return (
      <div className="wrap section" style={{ paddingTop: 'calc(var(--nav-h) + var(--s-16))' }}>
        <ErrorState
          title="That disease module could not be found"
          detail="It may have been renamed. Browse the full list of modules instead."
          action={
            <A href="/diseases" className="btn btn-primary btn-sm">
              All disease modules
            </A>
          }
        />
      </div>
    );
  }
  return <DiseaseDetail disease={disease} />;
};

/* ----------------------------------------------------------------- About -- */

/* ----------------------------------------------------------------- About -- */

export const AboutPage = () => (
  <>
    <PageHead eyebrow="About" title={`About the ${org.name}`} lede={org.whoWeAre} />

    <section className="section">
      <div className="wrap">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'var(--s-5)',
          }}
        >
          <Reveal delay={1}>
            <article className="card card-pad" style={{ height: '100%' }}>
              <span className="eyebrow eyebrow-navy">Our mission</span>
              <p style={{ marginTop: 'var(--s-4)', fontSize: 'var(--t-md)', lineHeight: 1.68 }}>
                {org.missionStatement}
              </p>
            </article>
          </Reveal>
          <Reveal delay={2}>
            <article className="card card-pad" style={{ height: '100%' }}>
              <span className="eyebrow eyebrow-blue">Our vision</span>
              <p style={{ marginTop: 'var(--s-4)', fontSize: 'var(--t-md)', lineHeight: 1.68 }}>
                {org.visionStatement}
              </p>
            </article>
          </Reveal>
        </div>
      </div>
    </section>

    <MissionSection />

    <section className="section-tight">
      <div className="wrap">
        <SectionHeader eyebrow="History" title="Timeline" accent="blue" />
        <div className="timeline" style={{ marginTop: 'var(--s-8)', maxWidth: '80ch' }}>
          {org.timeline.map((t, i) => (
            <Reveal key={i} delay={((i % 4) + 1) as 1}>
              <div className="tl-item">
                <div className="tl-date">{t.date}</div>
                <h4 style={{ fontSize: 'var(--t-lg)', marginTop: 6 }}>{t.title}</h4>
                <p
                  style={{
                    fontSize: 'var(--t-sm)',
                    color: 'var(--ink-2)',
                    lineHeight: 1.62,
                    marginTop: 6,
                  }}
                >
                  {t.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    <LeadershipPreviewSection />

{/* Membership Roles & How to Join Section */}
    <section className="section-tight" id="how-to-join">
      <div className="wrap">
        <SectionHeader eyebrow="Membership" title="CIG Roles & Community" accent="blue" />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'var(--s-5)',
            marginTop: 'var(--s-6)',
          }}
        >
          {/* Box 1: CIG Leaders */}
          <article className="card card-pad card-accent card-accent-navy">
            <span className="eyebrow eyebrow-navy">Internal Organizational Team</span>
            <h3 style={{ fontSize: 'var(--t-xl)', marginTop: 'var(--s-2)', letterSpacing: '-0.02em' }}>
              CIG Leaders
            </h3>
            <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', marginTop: 'var(--s-3)', lineHeight: 1.68 }}>
              Internal team leaders directly appointed to manage CIG’s operations, build academic content, and drive group initiatives.
            </p>

            <ul className="bullets" style={{ marginTop: 'var(--s-4)', lineHeight: 1.7 }}>
              <li>
                <strong>Team Membership:</strong> Assigned to one of CIG's 7 core teams (Medical Education, Research, Planning, Social Media, Journal Club, Affairs, or FRC).
              </li>
              <li>
                <strong>Core Responsibilities:</strong> Organizing events, creating platform content, leading team workshops, and managing administrative operations.
              </li>
              <li>
                <strong>Commitment:</strong> Attending team meetings, planning sessions, and active execution throughout the academic year.
              </li>
            </ul>
          </article>

          {/* Box 2: CIG Members */}
          <article className="card card-pad card-accent card-accent-blue">
            <span className="eyebrow eyebrow-blue">General Student Body</span>
            <h3 style={{ fontSize: 'var(--t-xl)', marginTop: 'var(--s-2)', letterSpacing: '-0.02em' }}>
              CIG Members
            </h3>
            <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', marginTop: 'var(--s-3)', lineHeight: 1.68 }}>
              Medical students who participate in CIG’s academic and clinical offerings without holding an internal team leadership role.
            </p>

            <ul className="bullets" style={{ marginTop: 'var(--s-4)', lineHeight: 1.7 }}>
              <li>
                <strong>Educational Access:</strong> Attend webinars, scientific discussions, clinical skills workshops, and journal club sessions.
              </li>
              <li>
                <strong>Mentorship & Events:</strong> Participate in mentorship programs, guest doctor lectures, and CIG-supported medical conferences.
              </li>
              <li>
                <strong>Research Opportunities:</strong> Get involved in group research projects and clinical data initiatives when positions open.
              </li>
            </ul>
          </article>
        </div>

        {/* Action Button Row */}
        <div className="tag-row" style={{ marginTop: 'var(--s-6)', justifyContent: 'center' }}>
          <a
            className="btn btn-primary btn-sm"
            href="mailto:Acccigbau@gmail.com?subject=CIG%20Membership%20Inquiry"
          >
            <Icon name="mail" size={13} />
            Apply 
          </a>
          <A className="btn btn-ghost btn-sm" href="/leadership">
            <Icon name="people" size={13} />
            View Leadership Hierarchy
          </A>
        </div>
      </div>
    </section>

    <section className="section-tight">
      <div className="wrap">
        <SectionHeader eyebrow="Get in touch" title="Contact" />
        <div
          className="card card-pad"
          style={{
            marginTop: 'var(--s-6)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--s-5)',
            maxWidth: 900,
          }}
        >
          <div>
            <h6 className="footer-h">Institution</h6>
            <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)' }}>
              {org.contact.institution}
            </p>
          </div>
          <div>
            <h6 className="footer-h">Address</h6>
            <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)' }}>{org.contact.address}</p>
          </div>
          <div>
            <h6 className="footer-h">Email</h6>
            <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)' }}>{org.contact.email}</p>
          </div>
        </div>
        <div style={{ marginTop: 'var(--s-6)' }}>
          <Disclaimer title={org.disclaimer.title} body={org.disclaimer.body} />
        </div>
      </div>
    </section>

    <CtaSection />
  </>
);
/* ------------------------------------------------------------- Not found -- */

export const NotFoundPage = ({ path }: { path: string }) => (
  <div className="wrap section" style={{ paddingTop: 'calc(var(--nav-h) + var(--s-16))' }}>
    <ErrorState
      title="Page not found"
      detail={`Nothing lives at ${path}. Try the Learning Hub, the disease explorer, or head back to the CIG homepage.`}
      action={
        <div className="tag-row">
          <A href="/" className="btn btn-primary btn-sm">
            Home
          </A>
          <A href="/learn" className="btn btn-ghost btn-sm">
            Learning Hub
          </A>
          <A href="/about" className="btn btn-ghost btn-sm">
            About CIG
          </A>
        </div>
      }
    />
  </div>
);




export default function Pages() {
  return null;
}