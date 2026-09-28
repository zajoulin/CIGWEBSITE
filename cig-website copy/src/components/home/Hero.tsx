/* ==========================================================================
   CIG — Homepage hero
   --------------------------------------------------------------------------
   The first impression is the organisation: the official crest, the group's
   name, the university it belongs to, what CIG is and why a student should
   engage with it. The live cardiovascular model sits alongside as evidence of
   what CIG builds — not as the identity of the site.
   ========================================================================== */

import { useState } from 'react';
import { A } from '../../lib/router';
import { Icon } from '../icons/Icon';
import { Crest } from '../brand/Crest';
import { AnatomyStage } from '../anatomy/AnatomyStage';
import { Stat } from '../ui/primitives';
import { VIEW_MODES } from '../../lib/cardio3d';
import { org, structureByMesh } from '../../lib/content';

const HEART_ONLY = VIEW_MODES.find((m) => m.id === 'heart') ?? VIEW_MODES[0];

export const Hero = () => {
  const [selectedMesh, setSelectedMesh] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const structure = selectedMesh ? structureByMesh.get(selectedMesh) : undefined;

  return (
    <section className="hero stage">
      <div className="grid-bg" />
      <div
        className="glow"
        style={{
          width: 620,
          height: 520,
          top: -140,
          right: '-6%',
          background: 'rgba(16, 99, 173, 0.55)',
        }}
      />
      <div
        className="glow"
        style={{
          width: 480,
          height: 420,
          bottom: -120,
          left: '-8%',
          background: 'rgba(77, 148, 221, 0.32)',
          opacity: 0.32,
        }}
      />

      <div className="wrap wrap-wide hero-grid">
        <div>
          <Crest className="hero-crest" />

          <span className="hero-eyebrow">
            <span className="dot" aria-hidden="true">
              <Icon name="shield" size={12} />
            </span>
            <span>
              {org.university.name} · {org.university.faculty}
            </span>
          </span>

          <h1 className="hero-title">{org.name}</h1>

          <p className="hero-tagline accent">{org.tagline}</p>

          <p className="hero-sub">{org.heroSub}</p>

          <div className="hero-cta">
            <A href="/about" className="btn btn-primary btn-lg">
              <Icon name="people" size={17} />
              Discover CIG
              <Icon name="arrow-right" size={15} className="arrow" />
            </A>
            <A href="/learn" className="btn btn-ghost btn-lg">
              <Icon name="anatomy" size={16} />
              {org.learningHub.short}
            </A>
          </div>

          <div className="hero-meta">
            <span>
              <Icon name="pulse" size={12} />
              {org.heroKicker}
            </span>
            <span>
              <Icon name="graduation" size={12} />
              Open to every year group
            </span>
          </div>

          <div className="hero-stats">
            {org.stats.map((s) => (
              <Stat key={s.label} value={s.value} label={s.label} />
            ))}
          </div>
        </div>

        <div className="hero-visual">
          <AnatomyStage
            className="viewer-bare"
            selectedMesh={selectedMesh}
            viewMode={HEART_ONLY}
            isolated={false}
            hidden={new Set()}
            onSelect={setSelectedMesh}
            onReady={() => setReady(true)}
            autoRotate
            compact
            initialRadius={5.4}
            initialTarget={[0.02, -0.08, 0]}
            showTooltip={false}
          />

          {/* Contextual label for whatever the visitor clicks. */}
          {structure ? (
            <div
              className="card"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                padding: 'var(--s-4) var(--s-5)',
                background: 'var(--glass-strong)',
                backdropFilter: 'blur(14px)',
                animation: 'modal-in var(--dur-3) var(--ease-out)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span
                  className="tree-swatch"
                  style={{ background: structure.color, width: 9, height: 9 }}
                  aria-hidden="true"
                />
                <h4 style={{ fontSize: 'var(--t-md)', letterSpacing: '-0.018em' }}>
                  {structure.name}
                </h4>
              </div>
              <p style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-2)', lineHeight: 1.6 }}>
                {structure.summary}
              </p>
              <A
                href={`/anatomy?structure=${structure.id}`}
                className="btn btn-quiet btn-sm"
                style={{ marginTop: 'var(--s-2)', paddingLeft: 0 }}
              >
                Open in the anatomy viewer
                <Icon name="arrow-right" size={12} className="arrow" />
              </A>
            </div>
          ) : ready ? (
            <p
              className="mono"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 8,
                textAlign: 'center',
                fontSize: 10.5,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--ink-4)',
                pointerEvents: 'none',
              }}
            >
              Built by CIG · Drag to rotate · Click a structure
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
};
