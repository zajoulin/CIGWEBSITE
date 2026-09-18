/* ==========================================================================
   CIG — Search input with ranked results and full keyboard navigation
   ========================================================================== */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../icons/Icon';
import { search, type SearchEntry, type SearchKind } from '../../lib/content';

const KIND_LABEL: Record<SearchKind, string> = {
  structure: 'Anatomy',
  disease: 'Disease',
  keypoint: 'Key points',
  glossary: 'Glossary',
  research: 'Research',
  ecg: 'ECG',
  exam: 'Examination',
  case: 'Simulation case',
};

export const SearchBar = ({
  placeholder = 'Search structures, diseases, concepts…',
  kinds,
  onSelect,
  limit = 10,
  autoFocus,
  ariaLabel = 'Search',
}: {
  placeholder?: string;
  kinds?: SearchKind[];
  onSelect: (entry: SearchEntry) => void;
  limit?: number;
  autoFocus?: boolean;
  ariaLabel?: string;
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const results = useMemo(
    () => (query.trim().length >= 2 ? search(query, { kinds, limit }) : []),
    [query, kinds, limit],
  );

  useEffect(() => setCursor(0), [query]);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  const choose = (entry: SearchEntry) => {
    onSelect(entry);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const onKeyDown = (e: {
    key: string;
    preventDefault: () => void;
  }) => {
    if (!open || !results.length) {
      if (e.key === 'Escape') setQuery('');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => (c + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => (c - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[cursor]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const listId = 'search-results';

  return (
    <div className="search-wrap" ref={wrapRef}>
      <div className="field">
        <Icon name="search" size={15} />
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder={placeholder}
          aria-label={ariaLabel}
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          autoFocus={autoFocus}
          onChange={(e: { target: { value: string } }) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            style={{ color: 'var(--ink-3)', display: 'grid' }}
          >
            <Icon name="close" size={14} />
          </button>
        ) : null}
      </div>

      {open && query.trim().length >= 2 ? (
        <div className="search-results" id={listId} role="listbox">
          {results.length === 0 ? (
            <p className="search-empty">
              No matches for “{query}”. Try an anatomical term, a disease, or a concept such as
              “afterload”.
            </p>
          ) : (
            results.map((r, i) => (
              <button
                key={r.kind + r.id}
                type="button"
                role="option"
                aria-selected={i === cursor}
                className={'search-item' + (i === cursor ? ' cursor' : '')}
                onMouseEnter={() => setCursor(i)}
                onClick={() => choose(r)}
              >
                {r.color ? (
                  <span
                    className="tree-swatch"
                    style={{ background: r.color }}
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className="tree-swatch"
                    style={{ background: 'var(--surface-4)' }}
                    aria-hidden="true"
                  />
                )}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    className="search-item-name"
                    style={{
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.title}
                  </span>
                  <span className="search-item-meta">{r.subtitle}</span>
                </span>
                <span className="search-item-meta">{KIND_LABEL[r.kind]}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};
