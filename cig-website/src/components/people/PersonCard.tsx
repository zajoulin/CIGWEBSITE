/* ==========================================================================
   CIG — Person card, avatar and profile modal
   Photographs, names, roles and biographies all come from content/people.json,
   so the whole hierarchy can be repopulated without touching this file.
   ========================================================================== */

import { Icon } from '../icons/Icon';
import { Chip, PlaceholderTag } from '../ui/primitives';
import { Modal } from '../ui/Modal';
import { teamById } from '../../lib/content';
import type { Person } from '../../lib/types';

const initials = (name: string): string =>
  name
    .replace(/[^A-Za-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '–';

export const Avatar = ({ person, className = '' }: { person: Person; className?: string }) =>
  person.photo ? (
    <img src={person.photo} alt={`${person.name}, ${person.position}`} className={className} />
  ) : (
    <span className={'avatar-fallback ' + className} aria-hidden="true">
      <span>{initials(person.name)}</span>
    </span>
  );

export const PersonCard = ({
  person,
  size = 'md',
  onOpen,
}: {
  person: Person;
  size?: 'md' | 'lg';
  onOpen: (person: Person) => void;
}) => {
  const team = person.teamId ? teamById.get(person.teamId) : null;
  return (
    <button
      type="button"
      className={'person' + (size === 'lg' ? ' person-lg' : '')}
      onClick={() => onOpen(person)}
      aria-label={`View the profile of ${person.name}, ${person.position}`}
    >
<div className="person-photo" style={{ position: 'relative' }}>
  {(person.id === 'head-media' || person.id === 'head-Social-Media' || person.name.includes('Zaid')) && (
    <span
      style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        fontSize: '22px',
        zIndex: 10,
        filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))',
      }}
      title="Website Creator"
    >
      👑
    </span>
  )}
  <Avatar person={person} />
</div>      <div className="person-body">
        <div className="person-role">{person.position}</div>
        <div className="person-name">{person.name}</div>
        {team ? <div className="person-team">{team.name}</div> : null}
        <div className="person-view">
          View profile
          <Icon name="arrow-right" size={12} />
        </div>
      </div>
    </button>
  );
};

export const MemberChip = ({
  person,
  onOpen,
}: {
  person: Person;
  onOpen: (person: Person) => void;
}) => (
  <button
    type="button"
    className="member"
    onClick={() => onOpen(person)}
    aria-label={`View the profile of ${person.name}`}
  >
    <span className="member-avatar">
      <Avatar person={person} />
    </span>
    <span style={{ minWidth: 0 }}>
      <span
        className="member-name"
        style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {person.name}
      </span>
      <span className="member-role">{person.year ?? 'Member'}</span>
    </span>
  </button>
);

export const PersonModal = ({
  person,
  onClose,
}: {
  person: Person | null;
  onClose: () => void;
}) => {
  if (!person) return null;
  const team = person.teamId ? teamById.get(person.teamId) : null;

  const email = person.socials?.email && person.socials.email !== '#' ? person.socials.email : null;
  const xUrl = (person.socials as any)?.x || (person.socials as any)?.X;
  const xLink = xUrl && xUrl !== '#' ? xUrl : null;

  return (
    <Modal open={Boolean(person)} onClose={onClose} title={`${person.name} — profile`} width={720}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 220px) 1fr' }} className="person-modal-grid">
        <div
          style={{
            position: 'relative',
            minHeight: 240,
            background: 'var(--surface-2)',
            overflow: 'hidden',
          }}
        >
          <Avatar person={person} />
        </div>

        <div className="modal-body" style={{ padding: 'var(--s-6)' }}>
          <div className="person-role" style={{ marginBottom: 4 }}>
            {person.position}
          </div>
          <h3 style={{ fontSize: 'var(--t-2xl)', letterSpacing: '-0.026em' }}>{person.name}</h3>
          <div className="tag-row" style={{ marginTop: 'var(--s-3)' }}>
            {team ? <Chip tone="crimson">{team.name}</Chip> : null}
            {person.year ? <Chip>{person.year}</Chip> : null}

          </div>

          <p
            style={{
              marginTop: 'var(--s-5)',
              fontSize: 'var(--t-sm)',
              color: 'var(--ink-2)',
              lineHeight: 1.68,
            }}
          >
            {person.bio}
          </p>

          {person.academicInterests.length ? (
            <section style={{ marginTop: 'var(--s-6)' }}>
              <h6 className="footer-h">Academic interests</h6>
              <div className="tag-row">
                {person.academicInterests.map((i) => (
                  <Chip key={i}>{i}</Chip>
                ))}
              </div>
            </section>
          ) : null}

          {person.cardiovascularInterests.length ? (
            <section style={{ marginTop: 'var(--s-5)' }}>
              <h6 className="footer-h">Cardiovascular interests</h6>
              <div className="tag-row">
                {person.cardiovascularInterests.map((i) => (
                  <Chip key={i} tone="crimson">
                    {i}
                  </Chip>
                ))}
              </div>
            </section>
          ) : null}

          {(email || xLink) ? (
            <section style={{ marginTop: 'var(--s-6)' }}>
              <h6 className="footer-h">Contact</h6>
              <div className="social-row">
                {email ? (
                  <a
                    className="social-btn"
                    href={email.startsWith('mailto:') ? email : `mailto:${email}`}
                    aria-label={`Email ${person.name}`}
                  >
                    <Icon name="mail" size={15} />
                  </a>
                ) : null}
                {xLink ? (
                  <a
                    className="social-btn"
                    href={xLink.startsWith('http') ? xLink : `https://x.com/${xLink.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${person.name} on X`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </Modal>
  );
};