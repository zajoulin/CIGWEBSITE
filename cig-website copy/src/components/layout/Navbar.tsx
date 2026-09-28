/* ==========================================================================
   CIG — Primary navigation
   --------------------------------------------------------------------------
   A deep-navy CIG bar carrying the official crest, the organisation name and
   the university it belongs to, with an ECG motif and a full-screen mobile
   sheet. The items themselves come from content/org.json, so the information
   architecture stays content-driven.
   ========================================================================== */

import { useEffect, useMemo, useState } from 'react';
import { A, useRouter } from '../../lib/router';
import { EcgTrace, Icon } from '../icons/Icon';
import { BrandLockup, CrestMark } from '../brand/Crest';
import { org } from '../../lib/content';

export interface NavItem {
  href: string;
  label: string;
  short: string;
}

export const NAV_ITEMS: NavItem[] = org.nav;

/** Splits a nav href into its path and its query parameters. */
const parseHref = (href: string): { path: string; params: Record<string, string> } => {
  const [path, qs] = href.split('?');
  const params: Record<string, string> = {};
  if (qs) {
    for (const pair of qs.split('&')) {
      const [k, v = ''] = pair.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v);
    }
  }
  return { path, params };
};

export const Navbar = () => {
  const { path, query } = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu on navigation, and lock scroll while it is open.
  useEffect(() => setMenuOpen(false), [path]);
  useEffect(() => {
    if (!menuOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // Exactly one navigation item is ever marked active: the most specific entry
  // that matches the current location, so two entries never light up together
  // (a query-qualified entry always beats the bare path it sits on).
  const activeHref = useMemo(() => {
    let best: string | null = null;
    let bestScore = -1;

    for (const item of NAV_ITEMS) {
      const { path: p, params } = parseHref(item.href);

      // The Learning Hub owns every module beneath it, including the anatomy,
      // disease, glossary and key-point routes.
      const onPath =
        p === '/'
          ? path === '/'
          : p === '/learn'
            ? path === '/learn' ||
              path.startsWith('/learn/') ||
              path === '/anatomy' ||
              path.startsWith('/diseases') ||
              path === '/glossary' ||
              path === '/keypoints' ||
              path === '/key-points'
            : path === p || path.startsWith(p + '/');
      if (!onPath) continue;

      const keys = Object.keys(params);
      if (keys.some((k) => query[k] !== params[k])) continue;

      // A query-qualified entry always beats the bare one for the same path.
      const score = p.length + keys.length * 100;
      if (score > bestScore) {
        bestScore = score;
        best = item.href;
      }
    }
    return best;
  }, [path, query]);

  const isActive = (href: string) => href === activeHref;

  return (
    <>
      <header className={'nav stage' + (scrolled || menuOpen ? ' scrolled' : '')}>
        <nav className="wrap wrap-wide nav-inner" aria-label="Primary">
          <A href="/" className="brand" ariaLabel={`${org.name}, ${org.university.name} — home`}>
            <BrandLockup />
          </A>

          <EcgTrace />

          <div className="nav-links">
            {NAV_ITEMS.map((item) => (
              <A
                key={item.href}
                href={item.href}
                className={'nav-link' + (isActive(item.href) ? ' active' : '')}
              >
                {item.short}
              </A>
            ))}
          </div>

          <div className="nav-actions">
            <A href="/learn" className="btn btn-primary btn-sm nav-cta">
              <Icon name="anatomy" size={14} />
              Learning Hub
            </A>
            <button
              type="button"
              className="burger"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Icon name={menuOpen ? 'close' : 'menu'} size={18} />
            </button>
          </div>
        </nav>
      </header>

      {menuOpen ? (
        <div className="mobile-nav stage" id="mobile-nav">
          <div className="mobile-nav-head">
            <span className="brand-mark" style={{ width: 40, height: 40 }}>
              <CrestMark width="100%" decorative />
            </span>
            <span className="brand-text">
              <span className="brand-abbr">{org.name}</span>
              <span className="brand-uni">{org.university.name}</span>
            </span>
          </div>

          {NAV_ITEMS.map((item, i) => (
            <A
              key={item.href}
              href={item.href}
              className={'mobile-link' + (isActive(item.href) ? ' active' : '')}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
              <span className="idx">{String(i + 1).padStart(2, '0')}</span>
            </A>
          ))}

          <A href="/learn" className="btn btn-primary btn-lg" onClick={() => setMenuOpen(false)}>
            <Icon name="anatomy" size={16} />
            Enter the {org.learningHub.short}
          </A>

          <p className="mobile-nav-foot">{org.tagline}</p>
        </div>
      ) : null}
    </>
  );
};
