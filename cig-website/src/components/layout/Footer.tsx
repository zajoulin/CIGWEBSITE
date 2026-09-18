/* ==========================================================================
   CIG — Footer
   --------------------------------------------------------------------------
   The closing CIG identity block: crest, organisation name, the university it
   belongs to, and the routes into the group's work.
   ========================================================================== */

import { A } from '../../lib/router';
import { Icon } from '../icons/Icon';
import { BrandLockup } from '../brand/Crest';
import { org } from '../../lib/content';
import { NAV_ITEMS } from './Navbar';
import { PlaceholderTag } from '../ui/primitives';

export const Footer = () => (
  <footer className="footer stage">
    <div className="wrap wrap-wide">
      <div className="footer-grid">
        <div>
          <A
            href="/"
            className="brand"
            ariaLabel={`${org.name}, ${org.university.name} — home`}
          >
            <BrandLockup size={52} />
          </A>
          <p
            style={{
              marginTop: 'var(--s-5)',
              fontSize: 'var(--t-sm)',
              color: 'var(--ink-2)',
              maxWidth: '40ch',
              lineHeight: 1.62,
            }}
          >
            {org.missionStatement}
          </p>
          <div className="social-row" style={{ marginTop: 'var(--s-5)' }}>
            {org.socials.map((s) => (
              <a
                key={s.label}
                href={s.url}
                className="social-btn"
                aria-label={`${org.abbr} on ${s.label} — link placeholder`}
                title={`${s.label} — placeholder link`}
              >
                <Icon name={s.icon} size={15} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h6 className="footer-h">The group</h6>
          <ul className="footer-list">
            {NAV_ITEMS.filter((n) => n.href !== '/').map((n) => (
              <li key={n.href}>
                <A href={n.href}>{n.label}</A>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h6 className="footer-h">{org.learningHub.short}</h6>
          <ul className="footer-list">
            <li>
              <A href="/learn">All modules</A>
            </li>
            <li>
              <A href="/anatomy">Interactive anatomy</A>
            </li>
            <li>
              <A href="/diseases">Cardiovascular diseases</A>
            </li>
            <li>
              <A href="/learn/ecg">ECG &amp; bedside monitoring</A>
            </li>
            <li>
              <A href="/learn/examination">Clinical examination</A>
            </li>
            <li>
              <A href="/learn/simulation">Clinical simulation</A>
            </li>
            <li>
              <A href="/learn/keypoints">Cardiovascular key points</A>
            </li>
            <li>
              <A href="/learn/glossary">Cardiovascular glossary</A>
            </li>
          </ul>
        </div>

        <div>
          <h6 className="footer-h">Contact</h6>
          <ul className="footer-list">
            <li>
              <span>{org.university.name}</span>
            </li>
            <li>
              <span>{org.university.faculty}</span>
            </li>
            <li>
              <span>{org.contact.address}</span>
            </li>
            <li>
              <span>{org.contact.email}</span>
            </li>
            {org.contact.placeholder ? (
              <li style={{ marginTop: 'var(--s-2)' }}>
                <PlaceholderTag label="Replace contact details" />
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div
        style={{
          paddingTop: 'var(--s-6)',
          display: 'grid',
          gap: 'var(--s-4)',
        }}
      >
        <p
          style={{
            fontSize: 'var(--t-2xs)',
            color: 'var(--ink-3)',
            lineHeight: 1.6,
            maxWidth: '90ch',
          }}
        >
          <strong style={{ color: 'var(--conduction)' }}>{org.disclaimer.title}.</strong>{' '}
          {org.disclaimer.body}
        </p>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {org.name} ({org.abbr}) · {org.university.name}. All
            rights reserved.
          </span>
          <span className="mono">{org.tagline}</span>
        </div>
      </div>
    </div>
  </footer>
);
