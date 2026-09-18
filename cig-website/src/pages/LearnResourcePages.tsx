/* ==========================================================================
   CIG — Learning Hub resources: Glossary and Cardiovascular Key Points
   --------------------------------------------------------------------------
   These are Learning Hub resources with routes of their own. They used to be
   tabs inside Research, which is why clicking them from the Hub sent the
   learner into the Research section; they now open directly and Research is
   reserved for CIG's own research activity.

   /learn/glossary
   /learn/keypoints  ·  /learn/keypoints?topic=<id> opens a topic directly
   ========================================================================== */

import { A, useRouter } from '../lib/router';
import type { ReactNode } from 'react';
import { Icon } from '../components/icons/Icon';
import { Crest } from '../components/brand/Crest';
import { Chip } from '../components/ui/primitives';
import { Glossary } from '../components/research/Glossary';
import { KeyPointsGrid } from '../components/research/KeyPoints';
import { contentStats, org } from '../lib/content';
import LearnResourcePages from '../../app/_client/KeyPoints';

/** The shared Learning Hub resource header: crest, breadcrumb back to the Hub, title. */
const ResourceHead = ({
  title,
  lede,
  chips,
}: {
  title: string;
  lede: string;
  chips?: ReactNode;
}) => (
  <header className="page-head page-head-navy stage">
    <div className="grid-bg" />
    <div className="wrap">
      <div className="page-head-row">
        <span className="crest-plate page-head-crest">
          <Crest width="100%" decorative />
        </span>
        <div style={{ minWidth: 0 }}>
          <nav className="crumbs" aria-label="Breadcrumb">
            <A href="/learn">{org.learningHub.short}</A>
            <span className="crumb-sep" aria-hidden="true">
              /
            </span>
            <span aria-current="page">{title}</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.9rem)', marginTop: 'var(--s-4)' }}>
            {title}
          </h1>
          <p className="lede" style={{ marginTop: 'var(--s-4)', maxWidth: '74ch' }}>
            {lede}
          </p>
          {chips ? (
            <div className="tag-row" style={{ marginTop: 'var(--s-5)' }}>
              {chips}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  </header>
);

/** Sibling Learning Hub resources, so neither page is a dead end. */
const ResourceFoot = ({ here }: { here: 'glossary' | 'keypoints' }) => (
  <section className="section-tight">
    <div className="wrap">
      <div className="tag-row">
        <A href="/learn" className="btn btn-ghost btn-sm">
          <Icon name="grid" size={13} />
          All {org.learningHub.short} modules
        </A>
        {here === 'glossary' ? (
          <A href="/learn/keypoints" className="btn btn-ghost btn-sm">
            <Icon name="lightbulb" size={13} />
            Cardiovascular Key Points
          </A>
        ) : (
          <A href="/learn/glossary" className="btn btn-ghost btn-sm">
            <Icon name="book" size={13} />
            Cardiovascular Glossary
          </A>
        )}
        <A href="/diseases" className="btn btn-ghost btn-sm">
          <Icon name="pulse" size={13} />
          Disease modules
        </A>
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------- Glossary -- */

export const GlossaryPage = () => (
  <>
    <ResourceHead
      title="Cardiovascular Glossary"
      lede="Definitions, formulae and typical values for the vocabulary of cardiology — each term cross-linked to the anatomy, physiology and disease modules it belongs to."
      chips={
        <>
          <Chip tone="blue">{contentStats.glossary} terms</Chip>
          <Chip tone="blue">Searchable</Chip>
          <Chip tone="blue">Cross-linked</Chip>
        </>
      }
    />

    <section className="section">
      <div className="wrap">
        <Glossary />
      </div>
    </section>

    <ResourceFoot here="glossary" />
  </>
);

/* ----------------------------------------------------------- Key points -- */

export const KeyPointsPage = () => {
  const { query } = useRouter();
  return (
    <>
      <ResourceHead
        title="Cardiovascular Key Points"
        lede="Concise, referenced revision topics covering the material students are examined on and use on the ward — from the cardiac cycle and pressure–volume loops to examination findings and ECG interpretation."
        chips={
          <>
            <Chip tone="blue">{contentStats.keyPoints} topics</Chip>
            <Chip tone="blue">Referenced</Chip>
            <Chip tone="blue">Clinical pearls</Chip>
          </>
        }
      />

      <section className="section" aria-labelledby="keypoints-h">
        <div className="wrap">
          {/* Named for screen readers only: the topic cards below are h3s, so
              without this the list would follow the h1 with no h2 between. */}
          <h2 className="sr-only" id="keypoints-h">
            All {contentStats.keyPoints} key-point topics
          </h2>
          <KeyPointsGrid openTopicId={query.topic ?? null} />
        </div>
      </section>

      <ResourceFoot here="keypoints" />
    </>
  );
};
export default LearnResourcePages;