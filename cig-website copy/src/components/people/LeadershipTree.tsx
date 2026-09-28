/* ==========================================================================
   CIG — Leadership hierarchy
   --------------------------------------------------------------------------
   A real organisational tree rather than a flat grid:

        President  →  2 Vice Presidents  →  6 Team Heads  →  team members

   Every tier is drawn from content/people.json and content/teams.json.
   ========================================================================== */

import { useState } from 'react';
import { Icon } from '../icons/Icon';
import { MemberChip, PersonCard, PersonModal, Avatar } from './PersonCard';
import { Reveal } from '../ui/primitives';
import { president, teamsWithPeople, vicePresidents } from '../../lib/content';
import type { Person } from '../../lib/types';

/** Branching connector drawn between hierarchy tiers. */
const OrgConnector = ({ count }: { count: number }) => {
  if (count < 1) return null;
  const xs =
    count === 1 ? [50] : Array.from({ length: count }, (_, i) => ((i + 0.5) / count) * 100);
  return (
    <div className="org-connector" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <g vectorEffect="non-scaling-stroke">
          <path d="M50 0 L50 48" vectorEffect="non-scaling-stroke" />
          {count > 1 ? (
            <path
              d={`M${xs[0]} 48 L${xs[xs.length - 1]} 48`}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {xs.map((x, i) => (
            <path key={i} d={`M${x} 48 L${x} 100`} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      </svg>
    </div>
  );
};

const TierLabel = ({ children }: { children: string }) => (
  <div className="org-tier-label">
    <span>{children}</span>
  </div>
);

export const LeadershipTree = () => {
  const [active, setActive] = useState<Person | null>(null);
  const [openTeams, setOpenTeams] = useState<Record<string, boolean>>({});

  const toggleTeam = (id: string) => setOpenTeams((t) => ({ ...t, [id]: !t[id] }));

  return (
    <>
      <div className="org">
        {/* Tier 1 — President */}
        {president ? (
          <>
            <TierLabel>President</TierLabel>
            <Reveal>
              <div style={{ width: 'min(300px, 100%)', margin: '0 auto' }}>
                <PersonCard person={president} size="lg" onOpen={setActive} />
              </div>
            </Reveal>
            <OrgConnector count={vicePresidents.length} />
          </>
        ) : null}

        {/* Tier 2 — Vice Presidents */}
        <TierLabel>Vice Presidents</TierLabel>
        <div className="org-tier org-tier-vps">
          {vicePresidents.map((vp, i) => (
            <Reveal key={vp.id} delay={i + 1}>
              <PersonCard person={vp} onOpen={setActive} />
            </Reveal>
          ))}
        </div>

        <OrgConnector count={teamsWithPeople.length} />

        {/* Tier 3 — Team Heads */}
        <TierLabel>Team Heads</TierLabel>
        <div className="org-tier org-tier-heads">
          {teamsWithPeople.map(({ team, head }, i) =>
            head ? (
              <Reveal key={team.id} delay={((i % 6) + 1) as 1}>
                <PersonCard person={head} onOpen={setActive} />
              </Reveal>
            ) : null,
          )}
        </div>
      </div>

      {/* Tier 4 — Team members, grouped beneath their head */}
      <div style={{ marginTop: 'var(--s-16)' }}>
        <TierLabel>Teams & Members</TierLabel>
        <div style={{ display: 'grid', gap: 'var(--s-4)' }}>
          {teamsWithPeople.map(({ team, head, members }) => {
            const open = openTeams[team.id] ?? true;
            return (
              <div className="team-block" key={team.id}>
<button
  type="button"
  className="team-head-row"
  aria-expanded={open}
  aria-controls={`team-${team.id}`}
  onClick={() => toggleTeam(team.id)}
>
  <span
    className="team-avatar"
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--surface-2)',
    }}
  >
    <Icon name={team.icon} size={20} />
  </span>                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontSize: 'var(--t-lg)', fontWeight: 600, letterSpacing: '-0.02em' }}>
                        {team.name}
                      </span>
                      <span className={`chip chip-${team.accent}`}>
                        <Icon name={team.icon} size={11} />
                        {members.length} member{members.length === 1 ? '' : 's'}
                      </span>
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 'var(--t-xs)',
                        color: 'var(--ink-3)',
                        marginTop: 4,
                        maxWidth: '78ch',
                        lineHeight: 1.55,
                      }}
                    >
                      {team.description}
                    </span>
                    {head ? (
                      <span
                        style={{
                          display: 'block',
                          fontSize: 'var(--t-2xs)',
                          color: 'var(--crimson-bright)',
                          marginTop: 6,
                        }}
                        className="mono"
                      >
                        HEAD · {head.name}
                      </span>
                    ) : null}
                  </span>
                  <Icon name={open ? 'chevron-down' : 'chevron-right'} size={16} />
                </button>

                {open ? (
                  <div className="team-members" id={`team-${team.id}`}>
                    {members.map((m) => (
                      <MemberChip key={m.id} person={m} onOpen={setActive} />
                    ))}
                    {members.length === 0 ? (
                      <p style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-3)' }}>
                        No members listed yet.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <PersonModal person={active} onClose={() => setActive(null)} />
    </>
  );
};
