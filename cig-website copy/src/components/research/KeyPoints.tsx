/* ==========================================================================
   CIG — Cardiovascular key points
   Concise, referenced teaching topics with facts, tables and clinical pearls.
   ========================================================================== */

import { useEffect, useState } from 'react';
import { A } from '../../lib/router';
import { Icon } from '../icons/Icon';
import { Bullets, Chip, DataTable, References, Reveal } from '../ui/primitives';
import { Modal } from '../ui/Modal';
import {
  diseaseById,
  keyPointById,
  keyPoints,
  resolveReferences,
  structureById,
} from '../../lib/content';
import type { KeyPointTopic } from '../../lib/types';

const TopicCard = ({
  topic,
  onOpen,
  delay,
}: {
  topic: KeyPointTopic;
  onOpen: (t: KeyPointTopic) => void;
  delay?: number;
}) => (
  <Reveal delay={delay}>
    <button
      type="button"
      className="card card-hover card-action card-accent card-accent-blue kp-card"
      onClick={() => onOpen(topic)}
      aria-label={`Open the ${topic.title} key points`}
    >
      <div className="kp-icon">
        <Icon name={topic.icon} size={19} />
      </div>
      <h3 style={{ fontSize: 'var(--t-lg)', letterSpacing: '-0.02em' }}>{topic.title}</h3>
      <p style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-2)', lineHeight: 1.6, flex: 1 }}>
        {topic.summary}
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--s-3)',
          marginTop: 'auto',
        }}
      >
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.08em' }}>
          {topic.category.toUpperCase()}
        </span>
        <Icon name="arrow-right" size={13} className="arrow" />
      </div>
    </button>
  </Reveal>
);

export const KeyPointDetail = ({ topic }: { topic: KeyPointTopic }) => {
  const refs = resolveReferences(topic.references);
  return (
    <div className="modal-body" style={{ padding: 'var(--s-8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-4)', marginBottom: 'var(--s-4)' }}>
        <div className="kp-icon">
          <Icon name={topic.icon} size={19} />
        </div>
        <div>
          <span className="eyebrow">{topic.category}</span>
          <h3 style={{ fontSize: 'var(--t-2xl)', marginTop: 6 }}>{topic.title}</h3>
        </div>
      </div>

      <p className="lede" style={{ fontSize: 'var(--t-sm)', marginBottom: 'var(--s-6)' }}>
        {topic.summary}
      </p>

      {topic.sections.map((s, i) => (
        <section key={i} style={{ marginBottom: 'var(--s-8)' }}>
          <h4 style={{ fontSize: 'var(--t-lg)', marginBottom: 'var(--s-3)' }}>{s.heading}</h4>
          {s.body ? (
            <p
              style={{
                fontSize: 'var(--t-sm)',
                color: 'var(--ink-2)',
                lineHeight: 1.68,
                marginBottom: s.facts || s.table ? 'var(--s-4)' : 0,
              }}
            >
              {s.body}
            </p>
          ) : null}
          {s.facts ? <Bullets items={s.facts} /> : null}
          {s.table ? (
            <div style={{ marginTop: s.facts ? 'var(--s-4)' : 0 }}>
              <DataTable table={s.table} />
            </div>
          ) : null}
        </section>
      ))}

      <section style={{ marginBottom: 'var(--s-8)' }}>
        <h4 style={{ fontSize: 'var(--t-lg)', marginBottom: 'var(--s-3)' }}>Clinical pearls</h4>
        <div style={{ display: 'grid', gap: 'var(--s-2)' }}>
          {topic.pearls.map((p, i) => (
            <div
              key={i}
              className="card"
              style={{
                display: 'grid',
                gridTemplateColumns: '22px 1fr',
                gap: 'var(--s-3)',
                padding: 'var(--s-4)',
                alignItems: 'start',
              }}
            >
              <Icon name="lightbulb" size={15} className="ic" />
              <span style={{ fontSize: 'var(--t-sm)', lineHeight: 1.6 }}>{p}</span>
            </div>
          ))}
        </div>
      </section>

      {topic.related.structures.length || topic.related.diseases.length ? (
        <section style={{ marginBottom: 'var(--s-8)' }}>
          <h4 style={{ fontSize: 'var(--t-lg)', marginBottom: 'var(--s-3)' }}>Related content</h4>
          <div className="related-grid">
            {topic.related.structures.map((id) => {
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
            {topic.related.diseases.map((id) => {
              const d = diseaseById.get(id);
              if (!d) return null;
              return (
                <A key={id} href={`/diseases/${d.id}`} className="related-link">
                  <Icon name="heart" size={13} className="ic" />
                  <span style={{ flex: 1 }}>{d.name}</span>
                  <Icon name="arrow-up-right" size={12} />
                </A>
              );
            })}
          </div>
        </section>
      ) : null}

      <section>
        <h4 style={{ fontSize: 'var(--t-lg)', marginBottom: 'var(--s-3)' }}>References</h4>
        <References items={refs} />
      </section>
    </div>
  );
};

export const KeyPointsGrid = ({
  openTopicId,
  onOpenChange,
}: {
  openTopicId?: string | null;
  onOpenChange?: (id: string | null) => void;
}) => {
  const [active, setActive] = useState<KeyPointTopic | null>(null);

  // Allow deep links such as /learn/keypoints?topic=cardiac-cycle to open a topic.
  useEffect(() => {
    if (!openTopicId) return;
    const t = keyPointById.get(openTopicId);
    if (t) setActive(t);
  }, [openTopicId]);

  const close = () => {
    setActive(null);
    onOpenChange?.(null);
  };

  return (
    <>
      <div className="kp-grid">
        {keyPoints.map((t, i) => (
          <TopicCard key={t.id} topic={t} onOpen={setActive} delay={((i % 4) + 1) as 1} />
        ))}
      </div>

      <Modal open={Boolean(active)} onClose={close} title={active?.title ?? 'Key points'} width={820}>
        {active ? <KeyPointDetail topic={active} /> : null}
      </Modal>
    </>
  );
};

export const KeyPointChips = ({ ids }: { ids: string[] }) => (
  <div className="tag-row">
    {ids.map((id) => {
      const k = keyPointById.get(id);
      if (!k) return null;
      return (
        <Chip key={id} tone="blue">
          {k.title}
        </Chip>
      );
    })}
  </div>
);
