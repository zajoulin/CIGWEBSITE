/* ==========================================================================
   CIG — Cardiovascular glossary
   Searchable terms, each linked back into the anatomy, physiology and disease
   content so the platform reads as one connected knowledge graph.
   ========================================================================== */

import { useMemo, useState } from 'react';
import { A } from '../../lib/router';
import { Icon } from '../icons/Icon';
import { Chip } from '../ui/primitives';
import { EmptyState } from '../ui/states';
import { diseaseById, glossary, keyPointById, structureById } from '../../lib/content';

export const Glossary = () => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? glossary.filter(
          (g) =>
            g.term.toLowerCase().includes(q) ||
            g.definition.toLowerCase().includes(q) ||
            (g.formula ?? '').toLowerCase().includes(q),
        )
      : glossary;
    return [...list].sort((a, b) => a.term.localeCompare(b.term));
  }, [query]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 'var(--s-4)',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 'var(--s-6)',
        }}
      >
        <div style={{ flex: '1 1 300px', maxWidth: 420 }}>
          <label className="field">
            <Icon name="search" size={15} />
            <input
              type="search"
              value={query}
              placeholder="Search terms — preload, ejection fraction, stenosis…"
              aria-label="Search the glossary"
              onChange={(e: { target: { value: string } }) => setQuery(e.target.value)}
            />
          </label>
        </div>
        <p className="mono" style={{ fontSize: 'var(--t-2xs)', color: 'var(--ink-3)' }}>
          {filtered.length} of {glossary.length} terms
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No terms match that search"
          detail="Try a shorter term, or browse the full list by clearing the search."
          action={
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQuery('')}>
              Clear search
            </button>
          }
        />
      ) : (
        <div className="gloss-list">
          {filtered.map((g) => {
            const isOpen = open === g.id;
            return (
              <div className="gloss-item" key={g.id}>
                <button
                  type="button"
                  className="gloss-btn"
                  aria-expanded={isOpen}
                  aria-controls={`gloss-${g.id}`}
                  onClick={() => setOpen(isOpen ? null : g.id)}
                >
                  <span style={{ minWidth: 0 }}>
                    <span className="gloss-term" style={{ display: 'block' }}>
                      {g.term}
                    </span>
                    {!isOpen ? (
                      <span
                        style={{
                          display: 'block',
                          fontSize: 'var(--t-xs)',
                          color: 'var(--ink-3)',
                          marginTop: 3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '72ch',
                        }}
                      >
                        {g.definition}
                      </span>
                    ) : null}
                  </span>
                  <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={15} />
                </button>

                {isOpen ? (
                  <div className="gloss-body" id={`gloss-${g.id}`}>
                    <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', lineHeight: 1.68 }}>
                      {g.definition}
                    </p>

                    {g.formula || g.typicalValue ? (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                          gap: 'var(--s-3)',
                        }}
                      >
                        {g.formula ? (
                          <div
                            style={{
                              padding: 'var(--s-3) var(--s-4)',
                              borderRadius: 'var(--r-md)',
                              background: 'var(--abyss)',
                              border: '1px solid var(--line)',
                            }}
                          >
                            <div className="footer-h" style={{ marginBottom: 4 }}>
                              Formula
                            </div>
                            <div className="mono" style={{ fontSize: 'var(--t-xs)', color: 'var(--blue-bright)' }}>
                              {g.formula}
                            </div>
                          </div>
                        ) : null}
                        {g.typicalValue ? (
                          <div
                            style={{
                              padding: 'var(--s-3) var(--s-4)',
                              borderRadius: 'var(--r-md)',
                              background: 'var(--abyss)',
                              border: '1px solid var(--line)',
                            }}
                          >
                            <div className="footer-h" style={{ marginBottom: 4 }}>
                              Typical value
                            </div>
                            <div className="mono" style={{ fontSize: 'var(--t-xs)', color: 'var(--ink)' }}>
                              {g.typicalValue}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="related-grid">
                      {g.relatedAnatomy.map((id) => {
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
                      {g.relatedPhysiology.map((id) => {
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
                      {g.relatedDiseases.map((id) => {
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

                    {!g.relatedAnatomy.length && !g.relatedDiseases.length ? (
                      <Chip>No linked content yet</Chip>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
