/* ==========================================================================
   CIG — Cardiac cycle timeline
   --------------------------------------------------------------------------
   S1 → systole → S2 → diastole, drawn from the same acoustic model that the
   synthesiser is playing, with a playhead locked to the audio clock. When a
   murmur is sounding, its band is shaded with its real shape — the diamond
   of an ejection murmur, the flat plateau of a pansystolic one, the fading
   wedge of an early diastolic one — so the learner can see when in the cycle
   the noise they are hearing occurs.
   ========================================================================== */

import type { HeartSound, SoundEvent } from '../../lib/types';

const W = 600;
const H = 96;
const TRACK_TOP = 30;
const TRACK_H = 40;

/** Envelope outline for a murmur band, as an SVG path. */
const murmurPath = (ev: SoundEvent): string => {
  const x0 = ev.start * W;
  const x1 = ev.end * W;
  const base = TRACK_TOP + TRACK_H;
  const height = TRACK_H * (0.35 + ev.intensity * 0.62);
  const steps = 30;
  let up = '';
  let down = '';
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    let a: number;
    switch (ev.shape) {
      case 'diamond':
        a = Math.sin(Math.PI * u);
        break;
      case 'crescendo':
        a = Math.pow(u, 1.5);
        break;
      case 'decrescendo':
        a = Math.pow(1 - u, 1.4);
        break;
      case 'plateau':
      default:
        a = Math.min(1, Math.min(u, 1 - u) * 12);
        break;
    }
    const x = x0 + (x1 - x0) * u;
    up += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + (base - a * height).toFixed(1);
    down = 'L' + x.toFixed(1) + ' ' + (base + a * height * 0.38).toFixed(1) + down;
  }
  return up + down + 'Z';
};

export const CycleTimeline = ({
  sound,
  phase,
  compact = false,
}: {
  sound: HeartSound;
  phase: number | null;
  compact?: boolean;
}) => {
  const s1 = sound.events.find((e) => e.id === 's1');
  const s2 = sound.events.find((e) => e.id === 's2');
  const systoleStart = s1 ? s1.start : 0;
  const systoleEnd = s2 ? s2.start : 0.38;
  const murmurs = sound.events.filter((e) => e.kind === 'murmur');
  const beats = sound.events.filter((e) => e.kind !== 'murmur');

  return (
    <figure className={'cycle' + (compact ? ' cycle-compact' : '')} style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Cardiac cycle timeline for ${sound.name}: ${
          murmurs.length
            ? murmurs.map((m) => `${m.label} from ${Math.round(m.start * 100)}% to ${Math.round(m.end * 100)}% of the cycle`).join('; ')
            : 'first and second heart sounds only'
        }.`}
      >
        {/* systole and diastole */}
        <rect
          x={systoleStart * W}
          y={TRACK_TOP}
          width={(systoleEnd - systoleStart) * W}
          height={TRACK_H}
          className="cycle-systole"
        />
        <rect
          x={systoleEnd * W}
          y={TRACK_TOP}
          width={(1 - systoleEnd) * W}
          height={TRACK_H}
          className="cycle-diastole"
        />
        <text x={((systoleStart + systoleEnd) / 2) * W} y={TRACK_TOP - 9} className="cycle-phase">
          SYSTOLE
        </text>
        <text x={((systoleEnd + 1) / 2) * W} y={TRACK_TOP - 9} className="cycle-phase">
          DIASTOLE
        </text>

        {/* murmur envelopes */}
        {murmurs.map((m) => (
          <path key={m.id} d={murmurPath(m)} className="cycle-murmur" />
        ))}

        {/* heart sounds */}
        {beats.map((b) => (
          <g key={b.id} className="cycle-sound">
            <rect
              x={b.start * W}
              y={TRACK_TOP + TRACK_H * 0.5 - 2}
              width={Math.max(3, (b.end - b.start) * W)}
              height={TRACK_H * (0.3 + b.intensity * 0.5)}
              rx="2"
            />
            <text x={b.start * W + 3} y={TRACK_TOP + TRACK_H + 24} className="cycle-label">
              {b.label}
            </text>
          </g>
        ))}

        {/* playhead */}
        {phase !== null ? (
          <line
            x1={phase * W}
            x2={phase * W}
            y1={TRACK_TOP - 4}
            y2={TRACK_TOP + TRACK_H + 4}
            className="cycle-playhead"
          />
        ) : null}
      </svg>
    </figure>
  );
};
