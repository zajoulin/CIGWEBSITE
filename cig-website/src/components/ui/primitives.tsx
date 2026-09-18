/* ==========================================================================
   CIG — Shared UI primitives
   ========================================================================== */

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '../icons/Icon';
import type { IconName, KeyPointTable, Reference } from '../../lib/types';

/* --------------------------------------------------------- Scroll reveal -- */

/**
 * A single shared scroll/resize watcher backing every <Reveal>.
 *
 * IntersectionObserver alone is not sufficient: a fast scroll, a jump link, a
 * restored scroll position or a coalesced callback can leave an element that
 * has already passed through the viewport still hidden, which would silently
 * blank out a whole section. This watcher is the safety net — one listener for
 * the entire page, checked on the next animation frame.
 */
type RevealFn = () => void;
const revealWatchers = new Map<Element, RevealFn>();
let revealTicking = false;
let revealBound = false;

const flushReveals = () => {
  revealTicking = false;
  const h = window.innerHeight || document.documentElement.clientHeight;
  for (const [el, show] of revealWatchers) {
    // Anything whose top has entered the viewport — including elements the
    // reader has already scrolled past — is revealed.
    if (el.getBoundingClientRect().top < h - 40) {
      show();
      revealWatchers.delete(el);
    }
  }
};

const scheduleReveals = () => {
  if (revealTicking) return;
  revealTicking = true;
  requestAnimationFrame(flushReveals);
};

const watchReveal = (el: Element, show: RevealFn): (() => void) => {
  revealWatchers.set(el, show);
  if (!revealBound && typeof window !== 'undefined') {
    revealBound = true;
    window.addEventListener('scroll', scheduleReveals, { passive: true });
    window.addEventListener('resize', scheduleReveals, { passive: true });
  }
  scheduleReveals();
  return () => revealWatchers.delete(el);
};

/**
 * Reveals children as they scroll into view. Falls back to visible-by-default
 * when IntersectionObserver is unavailable, and is disabled entirely under
 * prefers-reduced-motion (handled in CSS).
 */
export const Reveal = ({
  children,
  delay = 0,
  className = '',
  as = 'div',
}: {
  children: ReactNode;
  /** 1–6, mapping to the staggered delay utility classes. */
  delay?: number;
  className?: string;
  as?: 'div' | 'li' | 'section';
}) => {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      setShown(true);
    };

    const unwatch = watchReveal(el, show);

    if (typeof IntersectionObserver === 'undefined') {
      show();
      return unwatch;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            show();
            io.disconnect();
            unwatch();
          }
        }
      },
      { rootMargin: '0px 0px -40px 0px', threshold: 0 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      unwatch();
    };
  }, []);

  const cls = ['reveal', delay ? `reveal-${delay}` : '', shown ? 'in' : '', className]
    .filter(Boolean)
    .join(' ');

  const Tag = as as 'div';
  return (
    <Tag ref={ref as never} className={cls}>
      {children}
    </Tag>
  );
};

/* ------------------------------------------------------- Section header -- */

export const SectionHeader = ({
  eyebrow,
  title,
  lede,
  center,
  accent = 'navy',
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  center?: boolean;
  accent?: 'blue' | 'crimson' | 'navy';
  action?: ReactNode;
}) => {
  const head = (
    <div className={'section-head' + (center ? ' center' : '')}>
      {eyebrow ? (
        <span className={'eyebrow eyebrow-' + accent}>{eyebrow}</span>
      ) : null}
      <h2>{title}</h2>
      {lede ? <p className="lede">{lede}</p> : null}
    </div>
  );

  if (!action) return head;
  return (
    <div className="section-head-row">
      {head}
      {action}
    </div>
  );
};

/* -------------------------------------------------------------- Chips -- */

export const Chip = ({
  children,
  tone = 'default',
  dot,
  block,
}: {
  children: ReactNode;
  tone?: 'default' | 'blue' | 'crimson' | 'amber' | 'azure';
  dot?: boolean;
  /** Allows a sentence-length label to wrap instead of forcing overflow. */
  block?: boolean;
}) => (
  <span
    className={
      'chip' + (tone !== 'default' ? ` chip-${tone}` : '') + (block ? ' chip-block' : '')
    }
  >
    {dot ? <span className="chip-dot" /> : null}
    {children}
  </span>
);

export const PlaceholderTag = ({ label = 'Placeholder content' }: { label?: string }) => (
  <span className="placeholder-note">
    <Icon name="info" size={11} />
    {label}
  </span>
);

/* ------------------------------------------------------------- Lists -- */

export const Bullets = ({
  items,
  tone = 'blue',
}: {
  items: string[];
  tone?: 'blue' | 'crimson';
}) => (
  <ul className={'bullets' + (tone === 'crimson' ? ' bullets-crimson' : '')}>
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
);

export const DataList = ({ rows }: { rows: { key: string; value: ReactNode }[] }) => (
  <div className="dl">
    {rows.map((r, i) => (
      <div className="dl-row" key={i}>
        <div className="dl-key">{r.key}</div>
        <div className="dl-val">{r.value}</div>
      </div>
    ))}
  </div>
);

export const Steps = ({
  items,
}: {
  items: { title: string; text: string }[];
}) => (
  <ol className="steps">
    {items.map((s, i) => (
      <li className="step" key={i}>
        <div className="step-num">{String(i + 1).padStart(2, '0')}</div>
        <div className="step-line" />
        <div>
          {/* h3: a step sits one level under the section heading it appears in.
              The size is set explicitly so the tag change is purely semantic. */}
          <h3 style={{ marginBottom: 4, fontSize: 'var(--t-lg)', lineHeight: 1.35 }}>{s.title}</h3>
          <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', lineHeight: 1.62 }}>{s.text}</p>
        </div>
      </li>
    ))}
  </ol>
);

export const DataTable = ({ table }: { table: KeyPointTable }) => (
  <figure style={{ margin: 0 }}>
    <div className="table-scroll">
      <table className="data">
        <thead>
          <tr>
            {table.headers.map((h, i) => (
              <th key={i} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {table.caption ? (
      <figcaption
        style={{
          marginTop: 'var(--s-2)',
          fontSize: 'var(--t-2xs)',
          color: 'var(--ink-3)',
        }}
      >
        {table.caption}
      </figcaption>
    ) : null}
  </figure>
);

/* -------------------------------------------------------- References -- */

export const References = ({ items }: { items: Reference[] }) => {
  if (!items.length) return null;
  return (
    <ol className="refs">
      {items.map((r, i) => (
        <li className="ref" key={r.id}>
          <span className="ref-num">[{i + 1}]</span>
          <span>
            {r.citation}{' '}
            {r.url ? (
              <a href={r.url} target="_blank" rel="noopener noreferrer">
                {r.source}
                <Icon name="external" size={11} />
              </a>
            ) : (
              <span className="faint">{r.source}</span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
};

/* -------------------------------------------------------- Disclaimer -- */

export const Disclaimer = ({ title, body }: { title: string; body: string }) => (
  <aside className="disclaimer" role="note">
    <Icon name="warning" size={16} />
    <p>
      <strong>{title}.</strong> {body}
    </p>
  </aside>
);

/* -------------------------------------------------------------- Tabs -- */

export interface TabDef {
  id: string;
  label: string;
  icon?: IconName;
}

export const Tabs = ({
  tabs,
  active,
  onChange,
  idPrefix,
  className = '',
}: {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
  idPrefix: string;
  className?: string;
}) => {
  const onKeyDown = (e: { key: string; preventDefault: () => void }) => {
    const i = tabs.findIndex((t) => t.id === active);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(tabs[(i + 1) % tabs.length].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(tabs[(i - 1 + tabs.length) % tabs.length].id);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(tabs[0].id);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(tabs[tabs.length - 1].id);
    }
  };

  return (
    <div className={'tabs ' + className} role="tablist" onKeyDown={onKeyDown}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${t.id}`}
          aria-controls={`${idPrefix}-panel-${t.id}`}
          aria-selected={t.id === active}
          tabIndex={t.id === active ? 0 : -1}
          className="tab"
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};

export const TabPanel = ({
  id,
  idPrefix,
  active,
  children,
}: {
  id: string;
  idPrefix: string;
  active: string;
  children: ReactNode;
}) => {
  if (id !== active) return null;
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${id}`}
      aria-labelledby={`${idPrefix}-tab-${id}`}
      tabIndex={0}
    >
      {children}
    </div>
  );
};

/* --------------------------------------------------------- Small parts -- */

export const Rule = () => <hr className="rule" />;

export const Stat = ({ value, label }: { value: string; label: string }) => (
  <div>
    <div className="hero-stat-v">{value}</div>
    <div className="hero-stat-l">{label}</div>
  </div>
);

export const IconBadge = ({
  name,
  tone = 'crimson',
}: {
  name: IconName;
  tone?: 'crimson' | 'blue';
}) => (
  <div className={tone === 'blue' ? 'kp-icon' : 'mission-icon'}>
    <Icon name={name} size={20} />
  </div>
);
