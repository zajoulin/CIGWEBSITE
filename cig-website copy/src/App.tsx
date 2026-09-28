'use client';

/* ==========================================================================
   CIG — Application shell and route switch
   --------------------------------------------------------------------------
   Shared by both build targets. The Next.js app renders individual pages
   through its own routing; the single-file static build renders <App /> and
   resolves routes here.
   ========================================================================== */

import { useEffect, useRef, useState } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { AnatomyPage } from './pages/AnatomyPage';
import { EcgPage } from './pages/EcgPage';
import { ExaminationPage } from './pages/ExaminationPage';
import { SimulationPage } from './pages/SimulationPage';
import {
  AboutPage,
  ActivitiesPage,
  DiseaseDetailPage,
  DiseasesPage,
  HomePage,
  LeadershipPage,
  LearnPage,
  NotFoundPage,
} from './pages/pages';
import { ResearchPage } from './pages/ResearchPage';
import { JournalPage } from './pages/JournalPage';
import { GlossaryPage, KeyPointsPage } from './pages/LearnResourcePages';
import { A, useRouter } from './lib/router';
import { diseaseById, org } from './lib/content';

export interface PageMeta {
  title: string;
  description: string;
}

/** Page titles and descriptions, used for the document head and Open Graph. */
export const metaForPath = (path: string): PageMeta => {
  const base = `${org.abbr} — ${org.name}`;
  if (path === '/' || path === '')
    return {
      title: `${org.name} (${org.abbr}) — ${org.university.name}`,
      description: org.heroSub,
    };
  if (path === '/learn')
    return {
      title: `${org.learningHub.name} — ${base}`,
      description: org.learningHub.blurb,
    };
  if (path === '/learn/ecg' || path === '/ecg')
    return {
      title: `ECG & Bedside Monitoring — ${base}`,
      description:
        'A simulated bedside cardiac monitor running twenty clinically important ECG rhythms, with play, pause, scrub, frame-by-frame stepping and a synchronised physiological explanation.',
    };
  if (path === '/learn/simulation' || path === '/simulation')
    return {
      title: `Clinical Simulation — ${base}`,
      description:
        'Enter the clinical environment: examine a simulated patient, place all ten ECG electrodes against their anatomical landmarks, acquire a 12-lead ECG, interpret it systematically and be scored on your clinical reasoning.',
    };
  if (path === '/learn/examination' || path === '/examination')
    return {
      title: `3D Cardiovascular Examination — ${base}`,
      description:
        'An interactive 3D thorax for ECG lead placement and cardiac auscultation: place all ten electrodes against anatomical landmarks, listen at the five auscultation areas, and test yourself.',
    };
  if (path === '/learn/glossary' || path === '/glossary')
    return {
      title: `Cardiovascular Glossary — ${base}`,
      description:
        'A searchable cardiovascular glossary: definitions, formulae and typical values, each term cross-linked to the anatomy, physiology and disease modules it belongs to.',
    };
  if (path === '/learn/keypoints' || path === '/keypoints' || path === '/key-points')
    return {
      title: `Cardiovascular Key Points — ${base}`,
      description:
        'Concise, referenced cardiovascular revision topics covering the material students are examined on and use on the ward, each with clinical pearls and citations.',
    };
  if (path === '/journal')
    return {
      title: `The ${org.abbr} Journal — ${base}`,
      description:
        "CIG's publication activity: student-written cardiovascular writing edited by CIG members, and the journal club behind it.",
    };
  if (path === '/activities')
    return {
      title: `Activities & Events — ${base}`,
      description:
        "CIG's year-round programme: teaching sessions, journal clubs, research mentorship, clinical skills workshops, clinical exposure and community outreach.",
    };
  if (path === '/leadership')
    return {
      title: `Leadership & Teams — ${base}`,
      description:
        'The CIG leadership structure: president, vice presidents, team heads and the members of each student team.',
    };
  if (path === '/anatomy')
    return {
      title: `Interactive Cardiovascular Anatomy — ${base}`,
      description:
        'An interactive 3D cardiovascular model with 24 selectable structures, each with referenced anatomy, physiology, pathology and clinical detail.',
    };
  if (path === '/diseases')
    return {
      title: `Cardiovascular Diseases — ${base}`,
      description:
        'A disease explorer covering 27 cardiovascular conditions across twelve categories, with step-by-step pathophysiology and animated visualisations.',
    };
  if (path.startsWith('/diseases/')) {
    const d = diseaseById.get(path.slice('/diseases/'.length));
    if (d) return { title: `${d.name} — ${base}`, description: d.tagline };
  }
  if (path === '/research')
    return {
      title: `CIG Research — ${base}`,
      description:
        "The Cardiology Interest Group's own research activity: what the group publishes and presents, and how students propose a cardiovascular research idea of their own.",
    };
  if (path === '/about')
    return {
      title: `About CIG — ${base}`,
      description: org.whoWeAre,
    };
  return { title: `Page not found — ${base}`, description: org.missionStatement };
};

/** Keeps the document head in sync with the current route in the static build. */
const useDocumentMeta = (path: string): void => {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const meta = metaForPath(path);
    document.title = meta.title;

    const set = (selector: string, attr: string, value: string, create: () => HTMLElement) => {
      let el = document.head.querySelector(selector);
      if (!el) {
        el = create();
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    set('meta[name="description"]', 'content', meta.description, () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'description');
      return m;
    });
    set('meta[property="og:title"]', 'content', meta.title, () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:title');
      return m;
    });
    set('meta[property="og:description"]', 'content', meta.description, () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:description');
      return m;
    });
  }, [path]);
};

/**
 * Legacy and shorthand addresses, and where each one canonically belongs.
 *
 * These are redirects rather than aliases so that one page never answers to
 * two URLs: whichever address is typed or bookmarked, the visitor ends up on
 * the canonical route, and the navigation highlights the right section. The
 * Next.js build declares the same set as redirecting route stubs.
 */
export const ALIASES: Record<string, string> = {
  '/learning-hub': '/learn',
  '/resources': '/learn',
  '/ecg': '/learn/ecg',
  '/simulation': '/learn/simulation',
  '/examination': '/learn/examination',
  '/glossary': '/learn/glossary',
  '/keypoints': '/learn/keypoints',
  '/key-points': '/learn/keypoints',
  '/people': '/leadership',
};

/** Sends the visitor on to `to`, replacing the alias in history. */
const Redirect = ({ to }: { to: string }) => {
  const { navigate, query } = useRouter();
  const qs = Object.keys(query)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
    .join('&');
  const target = qs ? `${to}?${qs}` : to;

  useEffect(() => {
    navigate(target, { replace: true });
  }, [target, navigate]);

  return (
    <div className="wrap section" style={{ paddingTop: 'calc(var(--nav-h) + var(--s-16))' }}>
      <p role="status" aria-live="polite" style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-3)' }}>
        Taking you to <A href={target}>{target}</A>…
      </p>
    </div>
  );
};

const Routes = () => {
  const { path } = useRouter();

  const alias = ALIASES[path];
  if (alias) return <Redirect to={alias} />;

  if (path === '/' || path === '') return <HomePage />;
  // The Learning Hub and everything under it.
  if (path === '/learn') return <LearnPage />;
  if (path === '/learn/ecg') return <EcgPage />;
  if (path === '/learn/simulation') return <SimulationPage />;
  if (path === '/learn/examination') return <ExaminationPage />;
  if (path === '/learn/glossary') return <GlossaryPage />;
  if (path === '/learn/keypoints') return <KeyPointsPage />;
  if (path === '/anatomy') return <AnatomyPage />;
  if (path === '/diseases') return <DiseasesPage />;
  if (path.startsWith('/diseases/')) {
    return <DiseaseDetailPage id={path.slice('/diseases/'.length)} />;
  }
  // CIG itself.
  if (path === '/about') return <AboutPage />;
  if (path === '/activities') return <ActivitiesPage />;
  if (path === '/leadership') return <LeadershipPage />;
  if (path === '/journal') return <JournalPage />;
  if (path === '/research') return <ResearchPage />;
  return <NotFoundPage path={path} />;
};

export const App = () => {
  const { path } = useRouter();
  const [announcement, setAnnouncement] = useState('');
  const announcerRef = useRef<HTMLDivElement | null>(null);
  const firstRender = useRef(true);
  useDocumentMeta(path);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'auto' });

    // After a client-side navigation the browser keeps its sequential focus
    // position part-way down the old page, so keyboard users would resume
    // mid-document and never reach the skip link. Moving focus to a top-of-page
    // announcer resets the tab order and tells screen readers where they are.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setAnnouncement(metaForPath(path).title);
    announcerRef.current?.focus({ preventScroll: true });
  }, [path]);

  return (
    <>
      <div
        ref={announcerRef}
        className="sr-only"
        tabIndex={-1}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <Navbar />
      <main id="main" key={path} tabIndex={-1}>
        <Routes />
      </main>
      <Footer />
    </>
  );
};
