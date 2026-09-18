/* ==========================================================================
   CIG — Icon set
   --------------------------------------------------------------------------
   A dependency-free, stroke-based 24×24 icon system. Icons are decorative by
   default (aria-hidden); pass a `label` to expose one to assistive technology.
   ========================================================================== */

import type { IconName } from '../../lib/types';

const P: Record<IconName | 'instagram' | 'linkedin' | 'x', string> = {
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  anatomy:
    'M12 3v18M7 6c-2 2-2 5 0 7s2 5 0 7M17 6c2 2 2 5 0 7s-2 5 0 7',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  'arrow-up-right': 'M7 17 17 7M8 7h9v9',
  beaker: 'M9 3h6M10 3v6L5 19a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 19l-5-10V3M7.5 14h9',
  bed: 'M3 6v13M3 11h13a4 4 0 0 1 4 4v4M3 19h18M7.5 10.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z',
  monitor: 'M3 5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5ZM9 21h6M12 17v4M6 11h2.2l1.3-3 2 6 1.4-3h5.1',
  mute: 'M11 5 6.5 9H3v6h3.5L11 19V5ZM16 9.5l4.5 5M20.5 9.5l-4.5 5',
  sound: 'M11 5 6.5 9H3v6h3.5L11 19V5ZM15.5 8.8a4.5 4.5 0 0 1 0 6.4M18.6 6a8.5 8.5 0 0 1 0 12',
  torso: 'M8.5 3h7l.6 3.2a4 4 0 0 0 2.2 2.8L21 10l-1.4 3-2.1-1v6.5a2.5 2.5 0 0 1-2.5 2.5h-6A2.5 2.5 0 0 1 6.5 18.5V12l-2.1 1L3 10l2.7-1a4 4 0 0 0 2.2-2.8L8.5 3Z',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5ZM4 19a2 2 0 0 1 2-2h13',
  brain:
    'M9.5 3a3 3 0 0 0-3 3 3 3 0 0 0-2 5.2A3 3 0 0 0 6 17a3 3 0 0 0 3.5 4V3ZM14.5 3a3 3 0 0 1 3 3 3 3 0 0 1 2 5.2A3 3 0 0 1 18 17a3 3 0 0 1-3.5 4V3Z',
  calendar: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6ZM4 10h16M8 3v4M16 3v4',
  check: 'M4 12.5 9 18 20 6',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-right': 'M9 6l6 6-6 6',
  close: 'M6 6l12 12M18 6L6 18',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM15.5 8.5l-2 5-5 2 2-5 5-2Z',
  crosshair: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 2v4M12 18v4M2 12h4M18 12h4',
  download: 'M12 3v12M7 11l5 5 5-5M4 20h16',
  ecg: 'M2 12h4l2-6 4 12 3-8 2 2h5',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  'eye-off': 'M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.4 5.4A9.9 9.9 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.2 6.7A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 3.4-.6',
  filter: 'M3 5h18l-7 8v6l-4 2v-8L3 5Z',
  flask: 'M10 3h4M10.5 3v5.5L5.5 18A2.5 2.5 0 0 0 7.7 22h8.6a2.5 2.5 0 0 0 2.2-4l-5-9.5V3M8 15h8',
  focus: 'M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z',
  graduation: 'M12 3 2 8l10 5 10-5-10-5ZM6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5M21 9v5',
  grid: 'M4 4h7v7H4V4ZM13 4h7v7h-7V4ZM4 13h7v7H4v-7ZM13 13h7v7h-7v-7Z',
  heart:
    'M12 20.5S3.5 15 3.5 8.9A4.9 4.9 0 0 1 8.4 4c1.6 0 3 .8 3.6 2 .6-1.2 2-2 3.6-2a4.9 4.9 0 0 1 4.9 4.9c0 6.1-8.5 11.6-8.5 11.6Z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v6M12 7.5v.5',
  instagram:
    'M16 2H8a6 6 0 0 0-6 6v8a6 6 0 0 0 6 6h8a6 6 0 0 0 6-6V8a6 6 0 0 0-6-6ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM17.5 6.5h.01',
  layers: 'M12 3 2 8l10 5 10-5-10-5ZM2 13l10 5 10-5M2 18l10 5 10-5',
  lightbulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5.9 1.2.9 1.9v.2h5.2v-.2c0-.7.3-1.4.9-1.9A6 6 0 0 0 12 3Z',
  link: 'M10 13a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7L11.5 5.8M14 11a4 4 0 0 0-5.7 0l-3 3A4 4 0 1 0 11 19.7l1.4-1.4',
  linkedin:
    'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6ZM2 9h4v12H2ZM4 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  lungs:
    'M12 3v10M8.5 8C6 8 4 11 4 15v3a2 2 0 0 0 2.6 1.9l3-1A2 2 0 0 0 11 17V9.5M15.5 8c2.5 0 4.5 3 4.5 7v3a2 2 0 0 1-2.6 1.9l-3-1A2 2 0 0 1 13 17V9.5',
  mail: 'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6ZM3.5 6.5 12 13l8.5-6.5',
  megaphone: 'M3 11v2a2 2 0 0 0 2 2h2l7 5V4L7 9H5a2 2 0 0 0-2 2ZM18 8a5 5 0 0 1 0 8',
  menu: 'M3 6h18M3 12h18M3 18h18',
  microscope:
    'M6 21h12M9 21V9M9 9h4a4 4 0 0 1 0 8H9M11 5h4M13 5v4M5 17a7 7 0 0 0 11 4',
  network: 'M12 3a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM5 16a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM19 16a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM12 8v4M12 12 6.5 16M12 12l5.5 4',
  pause: 'M9 5v14M15 5v14',
  people:
    'M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM22 20v-1.5a4 4 0 0 0-3-3.9M16 4.2a4 4 0 0 1 0 7.6',
  play: 'M7 4.5v15l13-7.5-13-7.5Z',
  pulse: 'M2 12h4l3-7 4 14 3-7h6',
  refresh: 'M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5',
  restart: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3',
  shield: 'M12 3 4 6v6c0 5 3.4 8.3 8 9.5 4.6-1.2 8-4.5 8-9.5V6l-8-3Z',
  'skip-back': 'M18 5v14L8 12l10-7ZM6 5v14',
  'skip-forward': 'M6 5v14l10-7L6 5ZM18 5v14',
  sparkles: 'M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z',
  stethoscope:
    'M5 3v5a4 4 0 0 0 8 0V3M4 3h2M12 3h2M9 12v3a5 5 0 0 0 10 0v-1M19 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  syringe: 'M17 3l4 4M19 5l-9 9M14 6l4 4M8 12l4 4M11 15l-5 5-3-1 1-3 5-5',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  trending: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  valve: 'M12 3v4M12 17v4M6.5 5.5 9 9M17.5 5.5 15 9M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 12h5M15 12h5',
  vessel: 'M6 3c0 5 4 6 4 10s-4 4-4 8M18 3c0 4-3 5-6 6M18 21c0-4-2-6-5-7',
  warning: 'M12 4 2.5 20h19L12 4ZM12 10v5M12 17.5v.5',
  wave: 'M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0M2 17c2-4 4-4 6 0M14 17c2-4 4-4 6 0',
  x: 'M18 2h3l-7 8 8 12h-6l-5-7-5 7H2l8-9L2 2h6l4 6 6-6Z',
};

export interface IconProps {
  name: IconName | 'instagram' | 'linkedin' | 'x';
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Accessible name. When omitted the icon is hidden from assistive tech. */
  label?: string;
}

export const Icon = ({ name, size = 18, strokeWidth = 1.6, className, label }: IconProps) => {
  const d = P[name] ?? P.info;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {label ? <title>{label}</title> : null}
      {d.split('M').filter(Boolean).map((seg, i) => (
        <path key={i} d={'M' + seg} />
      ))}
    </svg>
  );
};

/** The CIG brand mark: a stylised heart with an ECG trace through it. */
export const BrandMark = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M12 20.2S3.8 14.9 3.8 8.9A4.8 4.8 0 0 1 8.6 4.1c1.5 0 2.9.8 3.4 1.9.5-1.1 1.9-1.9 3.4-1.9a4.8 4.8 0 0 1 4.8 4.8c0 6-8.2 11.3-8.2 11.3Z"
      fill="currentColor"
      opacity="0.22"
    />
    <path
      d="M12 20.2S3.8 14.9 3.8 8.9A4.8 4.8 0 0 1 8.6 4.1c1.5 0 2.9.8 3.4 1.9.5-1.1 1.9-1.9 3.4-1.9a4.8 4.8 0 0 1 4.8 4.8c0 6-8.2 11.3-8.2 11.3Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M4.6 11.6h3.1l1.4-3.2 2.4 6.2 1.6-3h4.3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** The animated ECG trace used in the navigation bar and loading states. */
export const EcgTrace = ({ className = 'nav-ecg' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 120 24" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <path d="M0 12h14l4-8 6 16 5-12 4 4h18l4-8 6 16 5-12 4 4h18l4-8 6 16 5-12 4 4h8" />
  </svg>
);