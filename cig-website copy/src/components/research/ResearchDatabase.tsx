/* ==========================================================================
   CIG — CIG research records
   --------------------------------------------------------------------------
   Full-text search across titles, authors, abstracts and tags, with filters
   for category, type and year.

   Everything listed here is CIG's own research. The section that renders this
   component shows a "publications are coming soon" state instead when
   content/research.json is empty, so no demo record is ever presented as if
   it were the group's work.
   ========================================================================== */

import { useMemo, useState } from 'react';
import { Icon } from '../icons/Icon';
import { Chip, Reveal } from '../ui/primitives';
import { EmptyState } from '../ui/states';
import { Modal } from '../ui/Modal';
import { research, researchCategories, researchYears } from '../../lib/content';
import type { ResearchItem, ResearchStatus, ResearchType } from '../../lib/types';

const TYPE_LABEL: Record<ResearchType, string> = {
  'original-research': 'Original research',
  review: 'Review',
  'case-report': 'Case report',
  abstract: 'Abstract',
  poster: 'Poster',
  audit: 'Audit',
};

const STATUS_LABEL: Record<ResearchStatus, string> = {
  'in-progress': 'In progress',
  submitted: 'Submitted',
  'under-review': 'Under review',
  accepted: 'Accepted',
  presented: 'Presented',
  published: 'Published',
};

const ALL_TYPES = Object.keys(TYPE_LABEL) as ResearchType[];

const ResearchCard = ({
  item,
  onOpen,
  delay,
}: {
  item: ResearchItem;
  onOpen: (item: ResearchItem) => void;
  delay?: number;
}) => (
  <Reveal delay={delay}>
    <button
      type="button"
      className="card card-hover card-action card-accent-blue card-accent research-card"
      onClick={() => onOpen(item)}
      aria-label={`Open details for ${item.title}`}
    >
      <div className="tag-row">
        <Chip tone="blue">{TYPE_LABEL[item.type]}</Chip>
        <Chip>{item.publicationDate ?? item.year}</Chip>
        <Chip>{item.category}</Chip>
        {item.status ? <Chip tone="blue">{STATUS_LABEL[item.status]}</Chip> : null}
      </div>
      <h4 className="research-title">{item.title}</h4>
      <p className="research-authors">{item.authors.join(', ')}</p>
      {item.venue ? <p className="research-venue">{item.venue}</p> : null}
      <p className="research-abstract">{item.abstract}</p>
      <div className="tag-row">
        {item.tags.slice(0, 4).map((t) => (
          <Chip key={t}>{t}</Chip>
        ))}
      </div>
    </button>
  </Reveal>
);

export const ResearchDatabase = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [type, setType] = useState<'all' | ResearchType>('all');
  const [year, setYear] = useState<'all' | number>('all');
  const [active, setActive] = useState<ResearchItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return research
      .filter((r) => {
        if (category !== 'all' && r.category !== category) return false;
        if (type !== 'all' && r.type !== type) return false;
        if (year !== 'all' && r.year !== year) return false;
        if (!q) return true;
        return (
          r.title.toLowerCase().includes(q) ||
          r.abstract.toLowerCase().includes(q) ||
          r.authors.join(' ').toLowerCase().includes(q) ||
          r.tags.join(' ').toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  }, [query, category, type, year]);

  const reset = () => {
    setQuery('');
    setCategory('all');
    setType('all');
    setYear('all');
  };

  return (
    <div className="research-layout">
      <aside className="filters" aria-label="Research filters">
        <div className="filter-group">
          <h6>Search</h6>
          <label className="field">
            <Icon name="search" size={15} />
            <input
              type="search"
              value={query}
              placeholder="Title, author, abstract…"
              aria-label="Search research"
              onChange={(e: { target: { value: string } }) => setQuery(e.target.value)}
            />
          </label>
        </div>

        <div className="filter-group">
          <h6>Topic</h6>
          <div className="filter-list">
            <button
              type="button"
              className="filter-chip filter-chip-blue"
              aria-pressed={category === 'all'}
              onClick={() => setCategory('all')}
            >
              All
            </button>
            {researchCategories.map((c) => (
              <button
                key={c}
                type="button"
                className="filter-chip filter-chip-blue"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <h6>Research type</h6>
          <div className="filter-list">
            <button
              type="button"
              className="filter-chip filter-chip-blue"
              aria-pressed={type === 'all'}
              onClick={() => setType('all')}
            >
              All
            </button>
            {ALL_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className="filter-chip filter-chip-blue"
                aria-pressed={type === t}
                onClick={() => setType(t)}
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <h6>Year</h6>
          <div className="filter-list">
            <button
              type="button"
              className="filter-chip filter-chip-blue"
              aria-pressed={year === 'all'}
              onClick={() => setYear('all')}
            >
              All
            </button>
            {researchYears.map((y) => (
              <button
                key={y}
                type="button"
                className="filter-chip filter-chip-blue"
                aria-pressed={year === y}
                onClick={() => setYear(y)}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
          <Icon name="refresh" size={13} />
          Clear all filters
        </button>
      </aside>

      <div>
        <p
          className="mono"
          style={{ fontSize: 'var(--t-2xs)', color: 'var(--ink-3)', marginBottom: 'var(--s-4)' }}
        >
          {filtered.length} of {research.length} records
        </p>

        {filtered.length ? (
          <div style={{ display: 'grid', gap: 'var(--s-4)' }}>
            {filtered.map((r, i) => (
              <ResearchCard key={r.id} item={r} onOpen={setActive} delay={((i % 4) + 1) as 1} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No research matches those filters"
            detail="Try clearing a filter, or searching for a broader term."
            action={
              <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
                Clear filters
              </button>
            }
          />
        )}
      </div>

      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title={active?.title ?? 'Research record'}
        width={760}
      >
        {active ? (
          <div className="modal-body" style={{ padding: 'var(--s-8)' }}>
            <div className="tag-row" style={{ marginBottom: 'var(--s-4)' }}>
              <Chip tone="blue">{TYPE_LABEL[active.type]}</Chip>
              <Chip>{active.publicationDate ?? active.year}</Chip>
              <Chip>{active.category}</Chip>
              {active.status ? <Chip tone="blue">{STATUS_LABEL[active.status]}</Chip> : null}
            </div>
            <h3 style={{ fontSize: 'var(--t-2xl)', lineHeight: 1.24 }}>{active.title}</h3>
            <p style={{ marginTop: 'var(--s-3)', fontSize: 'var(--t-sm)', color: 'var(--ink-2)' }}>
              {active.authors.join(', ')}
            </p>
            {active.venue ? (
              <p style={{ marginTop: 6, fontSize: 'var(--t-xs)', color: 'var(--ink-3)' }}>
                {active.venue}
              </p>
            ) : null}
            {active.team ? (
              <p style={{ marginTop: 6, fontSize: 'var(--t-xs)', color: 'var(--ink-3)' }}>
                Research team: {active.team}
              </p>
            ) : null}

            <section style={{ marginTop: 'var(--s-6)' }}>
              <h6 className="footer-h">Abstract</h6>
              <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', lineHeight: 1.68 }}>
                {active.abstract}
              </p>
            </section>

            <section style={{ marginTop: 'var(--s-6)' }}>
              <h6 className="footer-h">Key findings</h6>
              <ul className="bullets">
                {active.keyFindings.map((k, i) => (
                  <li key={i}>{k}</li>
                ))}
              </ul>
            </section>

            <section style={{ marginTop: 'var(--s-6)' }}>
              <h6 className="footer-h">Tags</h6>
              <div className="tag-row">
                {active.tags.map((t) => (
                  <Chip key={t}>{t}</Chip>
                ))}
              </div>
            </section>

            <section style={{ marginTop: 'var(--s-6)' }}>
              <h6 className="footer-h">Access</h6>
              <div className="tag-row">
                {active.doi ? (
                  <a
                    className="btn btn-ghost btn-sm"
                    href={`https://doi.org/${active.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon name="link" size={13} />
                    DOI
                  </a>
                ) : null}
                {active.link ? (
                  <a
                    className="btn btn-ghost btn-sm"
                    href={active.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon name="external" size={13} />
                    Publisher
                  </a>
                ) : null}
                {active.pdf ? (
                  <a
                    className="btn btn-ghost btn-sm"
                    href={active.pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon name="download" size={13} />
                    PDF
                  </a>
                ) : null}
                {!active.doi && !active.link && !active.pdf ? (
                  <p style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-3)' }}>
                    No DOI, link or PDF is available for this record yet.
                  </p>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
