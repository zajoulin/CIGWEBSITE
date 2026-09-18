/* ==========================================================================
   CIG — Anatomy navigation tree
   The keyboard-accessible equivalent of clicking the 3D model.
   ========================================================================== */

import { useState } from 'react';
import { Icon } from '../icons/Icon';
import {
  anatomyCategories,
  anatomyGroups,
  structuresByCategory,
} from '../../lib/content';
import type { AnatomicalStructure, AnatomyCategory } from '../../lib/types';

export const AnatomyTree = ({
  selectedId,
  onSelect,
  hidden,
  onToggleHidden,
}: {
  selectedId: string | null;
  onSelect: (structure: AnatomicalStructure) => void;
  hidden: Set<string>;
  onToggleHidden?: (meshName: string) => void;
}) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  return (
    <nav className="tree" aria-label="Anatomical structures">
      {anatomyGroups.map((group) => (
        <div key={group.id} style={{ marginBottom: 'var(--s-4)' }}>
          <h3
            className="footer-h"
            style={{ padding: '0 0.6em', marginBottom: 'var(--s-2)' }}
          >
            {group.label}
          </h3>

          {group.categories.map((catId) => {
            const cat = anatomyCategories.find((c) => c.id === catId);
            if (!cat) return null;
            const items = structuresByCategory(catId as AnatomyCategory);
            const isOpen = !collapsed[catId];
            return (
              <div className="tree-group" key={catId}>
                <button
                  type="button"
                  className="tree-head"
                  aria-expanded={isOpen}
                  onClick={() => toggle(catId)}
                  title={cat.blurb}
                >
                  <span>{cat.label}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ opacity: 0.6 }}>{items.length}</span>
                    <Icon name="chevron-right" size={12} className="caret" />
                  </span>
                </button>

                {isOpen ? (
                  <div className="tree-items">
                    {items.map((s) => {
                      const isHidden = hidden.has(s.meshName);
                      return (
                        <div
                          key={s.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 2 }}
                        >
                          <button
                            type="button"
                            className={'tree-item' + (selectedId === s.id ? ' active' : '')}
                            onClick={() => onSelect(s)}
                            aria-current={selectedId === s.id ? 'true' : undefined}
                            style={isHidden ? { opacity: 0.42 } : undefined}
                          >
                            <span
                              className="tree-swatch"
                              style={{ background: s.color }}
                              aria-hidden="true"
                            />
                            <span
                              style={{
                                flex: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {s.name}
                            </span>
                            {s.abbr ? (
                              <span
                                className="mono abbr"
                                style={{ fontSize: 10, color: 'var(--ink-4)' }}
                                title={s.abbr}
                              >
                                {s.abbr}
                              </span>
                            ) : null}
                          </button>
                          {onToggleHidden ? (
                            <button
                              type="button"
                              onClick={() => onToggleHidden(s.meshName)}
                              aria-label={
                                isHidden ? `Show ${s.name} in the model` : `Hide ${s.name} in the model`
                              }
                              aria-pressed={isHidden}
                              title={isHidden ? 'Show structure' : 'Hide structure'}
                              style={{
                                display: 'grid',
                                placeItems: 'center',
                                width: 24,
                                height: 24,
                                borderRadius: 5,
                                color: isHidden ? 'var(--crimson-bright)' : 'var(--ink-4)',
                                flex: 'none',
                              }}
                            >
                              <Icon name={isHidden ? 'eye-off' : 'eye'} size={13} />
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </nav>
  );
};
