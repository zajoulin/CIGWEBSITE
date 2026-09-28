/* ==========================================================================
   CIG — Disease explorer
   Category rail, live text filter, and cards that open a full disease module.
   ========================================================================== */

import { useMemo, useState } from 'react';
import { A } from '../../lib/router';
import { Icon } from '../icons/Icon';
import { Chip, Reveal } from '../ui/primitives';
import { EmptyState } from '../ui/states';
import { diseaseCategories, diseases } from '../../lib/content';
import type { Disease, IconName } from '../../lib/types';

export const DiseaseCard = ({ disease, delay }: { disease: Disease; delay?: number }) => {
  const category = diseaseCategories.find((c) => c.id === disease.categoryId);
  return (
    <Reveal delay={delay}>
      <A
        href={`/diseases/${disease.id}`}
        className="card card-hover card-action card-accent disease-card"
        ariaLabel={`Open the ${disease.name} module`}
      >
        <Icon
          name={(category?.icon ?? 'heart') as IconName}
          size={120}
          strokeWidth={0.9}
          className="disease-glyph"
        />
        <span className="cat">{category?.label ?? 'Cardiovascular'}</span>
        {/* h3: the card title sits one level under whatever section heading
            the grid appears in. The size comes from .disease-card h3. */}
        <h3>{disease.name}</h3>
        <p>{disease.tagline}</p>
        <div className="disease-card-foot">
          <div className="tag-row">
            {disease.animationId ? (
              <Chip tone="blue">
                <Icon name="play" size={10} />
                Animation
              </Chip>
            ) : null}
            {disease.abbr ? <Chip>{disease.abbr}</Chip> : null}
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 'var(--t-2xs)',
              fontWeight: 560,
              color: 'var(--crimson-bright)',
            }}
          >
            Open module
            <Icon name="arrow-right" size={12} className="arrow" />
          </span>
        </div>
      </A>
    </Reveal>
  );
};

export const DiseaseExplorer = ({
  initialCategory = 'all',
}: {
  initialCategory?: string;
}) => {
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return diseases.filter((d) => {
      if (category !== 'all' && d.categoryId !== category) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        (d.abbr ?? '').toLowerCase().includes(q) ||
        d.tagline.toLowerCase().includes(q) ||
        d.overview.toLowerCase().includes(q)
      );
    });
  }, [category, query]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of diseases) map.set(d.categoryId, (map.get(d.categoryId) ?? 0) + 1);
    return map;
  }, []);

  return (
    <div>
      {/* Named for screen readers only. On /diseases the explorer follows the
          page h1 directly, and the module cards below are h3s, so without this
          the document would have no second heading level. */}
      <h2 className="sr-only">Browse the disease modules</h2>
      <div
        style={{
          display: 'flex',
          gap: 'var(--s-4)',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 'var(--s-5)',
        }}
      >
        <div style={{ flex: '1 1 280px', maxWidth: 400 }}>
          <label className="field">
            <Icon name="search" size={15} />
            <input
              type="search"
              value={query}
              placeholder="Filter diseases…"
              aria-label="Filter diseases by name"
              onChange={(e: { target: { value: string } }) => setQuery(e.target.value)}
            />
          </label>
        </div>
        <p className="mono" style={{ fontSize: 'var(--t-2xs)', color: 'var(--ink-3)' }}>
          {filtered.length} of {diseases.length} modules
        </p>
      </div>

      <div className="cat-rail" role="group" aria-label="Disease categories" style={{ marginBottom: 'var(--s-6)' }}>
        <button
          type="button"
          className="filter-chip"
          aria-pressed={category === 'all'}
          onClick={() => setCategory('all')}
        >
          All categories
        </button>
        {diseaseCategories.map((c) => (
          <button
            key={c.id}
            type="button"
            className="filter-chip"
            aria-pressed={category === c.id}
            onClick={() => setCategory(c.id)}
            title={c.blurb}
          >
            {c.label}
            <span style={{ opacity: 0.55, marginLeft: 6 }}>{counts.get(c.id) ?? 0}</span>
          </button>
        ))}
      </div>

      {category !== 'all' ? (
        <p
          className="lede"
          style={{ marginBottom: 'var(--s-6)', fontSize: 'var(--t-sm)', maxWidth: '78ch' }}
        >
          {diseaseCategories.find((c) => c.id === category)?.blurb}
        </p>
      ) : null}

      {filtered.length ? (
        <div className="disease-grid">
          {filtered.map((d, i) => (
            <DiseaseCard key={d.id} disease={d} delay={((i % 4) + 1) as 1} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No modules match that filter"
          detail="Try a different category, or search for a term such as “infarction”, “valve” or “arrhythmia”."
          action={
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setQuery('');
                setCategory('all');
              }}
            >
              Clear filters
            </button>
          }
        />
      )}
    </div>
  );
};
