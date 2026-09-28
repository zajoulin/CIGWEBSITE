/* ==========================================================================
   CIG — The patient room
   --------------------------------------------------------------------------
   The clinician's point of view standing at the foot of the bed: the patient
   semi-recumbent on a raised backrest looking back at you, and the cardiac
   monitor on its stand beside the bed, its screen square to the viewer. The
   monitor in the scene is the real one — the same canvas that runs in the
   ECG module is composited into the screen, so the trace in the room is this
   patient's actual rhythm rather than a picture of one.

   The scene is built on a single vanishing point behind the bed head: the
   footboard is nearest and widest, the bed narrows away from you, and the
   floor lines converge on the headwall. That is what puts the learner at the
   end of the bed rather than off to one side, which is where you actually
   stand when you look at a monitor.

   The room is not decoration. It is where the clinical task happens: the
   banner across the top states what the learner has been asked to do, the
   monitor beside the bed is the live one, and the hotspots on the patient are
   the examination.

   Drawn as a single scalable SVG with a small set of lighting gradients: no
   textures to download, no 3D library, and it stays sharp on any display.
   Deliberately diagrammatic — this is a teaching scene, not a simulation of
   a real patient-care system, and no real patient is depicted.
   ========================================================================== */

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '../icons/Icon';
import { MonitorScreen, COMPACT_CHANNELS } from '../ecg/BedsideMonitor';
import type { EcgSignal } from '../../lib/ecg/engine';
import type { ClinicalCase, EcgRhythm } from '../../lib/types';

export interface PatientRoomSceneProps {
  /** The case's rhythm, carrying this patient's observations. */
  rhythm: EcgRhythm;
  activeCase: ClinicalCase;
  signals: Map<string, EcgSignal>;
  clockRef: { current: number };
  playing: boolean;
  /** The clinical task, shown across the top of the scene. */
  task: string;
  /** Hides the monitor numerics until the learner has looked at the patient. */
  revealVitals?: boolean;
  onRevealVitals?: () => void;
  onQrs?: (spo2: number) => void;
  /** Rendered under the scene — the stage's own controls. */
  footer?: ReactNode;
}

interface Hotspot {
  id: string;
  label: string;
  detail: string;
  /** Percentage position within the scene. */
  x: number;
  y: number;
}

export const PatientRoomScene = ({
  rhythm,
  activeCase,
  signals,
  clockRef,
  playing,
  task,
  revealVitals = true,
  onRevealVitals,
  onQrs,
  footer,
}: PatientRoomSceneProps) => {
  const [open, setOpen] = useState<string | null>(null);
  const v = rhythm.vitals;

  const hotspots: Hotspot[] = [
    {
      id: 'patient',
      label: `The patient — ${activeCase.patient.descriptor}`,
      detail: `${activeCase.presentingComplaint} ${v.bedside}`,
      x: 45,
      y: 47,
    },
    {
      id: 'examination',
      label: 'General examination',
      detail: activeCase.examinationFindings.join(' · '),
      x: 34,
      y: 62,
    },
    {
      id: 'iv',
      label: 'Intravenous access',
      detail:
        'A cannula in the left antecubital fossa with maintenance fluid running. In a peri-arrest rhythm this is the route for every drug you will need, so it is checked and secured before anything else.',
      x: 23,
      y: 41,
    },
    {
      id: 'electrodes',
      label: 'Monitoring electrodes',
      detail:
        'Three self-adhesive electrodes on the chest wall give the monitor a continuous rhythm strip. They are not a diagnostic 12-lead ECG — for ST-segment analysis you still need all twelve leads, which is the task in front of you.',
      x: 52,
      y: 55,
    },
  ];

  const alarmTone =
    v.alarm === 'critical'
      ? '#ff5f6d'
      : v.alarm === 'warning'
        ? '#ffa53d'
        : v.alarm === 'advisory'
          ? '#ffd166'
          : '#3ff09a';

  return (
    <div className={'room sim-room room-alarm-' + (revealVitals ? v.alarm : 'normal')}>
      <div className="sim-task" role="status">
        <Icon name="target" size={14} />
        <span>{task}</span>
      </div>
      <div className="room-scene">
        <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="room-wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16293e" />
              <stop offset="55%" stopColor="#102132" />
              <stop offset="100%" stopColor="#0a1826" />
            </linearGradient>
            <linearGradient id="room-floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d1b29" />
              <stop offset="100%" stopColor="#060f19" />
            </linearGradient>
            <radialGradient id="room-light" cx="50%" cy="0%" r="72%">
              <stop offset="0%" stopColor="rgba(196, 224, 255, 0.30)" />
              <stop offset="45%" stopColor="rgba(150, 190, 235, 0.10)" />
              <stop offset="100%" stopColor="rgba(10, 24, 38, 0)" />
            </radialGradient>
            <radialGradient id="room-monitor-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(63, 240, 154, 0.30)" />
              <stop offset="100%" stopColor="rgba(63, 240, 154, 0)" />
            </radialGradient>
            {/* The sheet is lit from the head end, so it brightens away from you. */}
            <linearGradient id="room-sheet" x1="0" y1="1" x2="0.15" y2="0">
              <stop offset="0%" stopColor="#9fb0c4" />
              <stop offset="45%" stopColor="#ccd8e6" />
              <stop offset="100%" stopColor="#e7edf5" />
            </linearGradient>
            <linearGradient id="room-blanket2" x1="0" y1="1" x2="0.2" y2="0">
              <stop offset="0%" stopColor="#2c4666" />
              <stop offset="100%" stopColor="#5c81ae" />
            </linearGradient>
            <linearGradient id="room-steel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#93a6bb" />
              <stop offset="100%" stopColor="#4b5c70" />
            </linearGradient>
            {/* A shade cooler and deeper than the bedding, so the patient
                reads as a separate form against the sheet behind. */}
            <linearGradient id="room-gown" x1="0" y1="0" x2="0.35" y2="1">
              <stop offset="0%" stopColor="#cfdeec" />
              <stop offset="100%" stopColor="#8ba3bb" />
            </linearGradient>
            <linearGradient id="room-window" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0b1f36" />
              <stop offset="58%" stopColor="#123253" />
              <stop offset="100%" stopColor="#1b4468" />
            </linearGradient>
            <radialGradient id="room-vignette" cx="50%" cy="42%" r="72%">
              <stop offset="52%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(2, 10, 20, 0.66)" />
            </radialGradient>
          </defs>

          {/* ---- room shell: wall above, floor below, junction behind the bed ---- */}
          <rect width="1200" height="700" fill="url(#room-wall)" />
          <rect width="1200" height="352" fill="url(#room-light)" />
          <rect y="352" width="1200" height="348" fill="url(#room-floor)" />
          <path d="M0 352 H1200" stroke="rgba(150,190,235,0.16)" strokeWidth="2" />

          {/* floor lines converging on the headwall, which is what puts the
              viewer at the foot of the bed rather than beside it */}
          <g stroke="rgba(150,190,235,0.06)" strokeWidth="1.5">
            <path d="M-120 700 L455 352" />
            <path d="M170 700 L520 352" />
            <path d="M1030 700 L680 352" />
            <path d="M1320 700 L745 352" />
            <path d="M0 470 H1200" opacity="0.55" />
            <path d="M0 560 H1200" opacity="0.4" />
            <path d="M0 640 H1200" opacity="0.28" />
          </g>

          {/* ---- back wall: window, curtain rail, headwall services ---- */}
          <g>
            <rect x="48" y="112" width="232" height="196" rx="6" fill="url(#room-window)" />
            <g opacity="0.5">
              <circle cx="104" cy="268" r="3" fill="#ffd9a0" />
              <circle cx="128" cy="252" r="2.4" fill="#ffe6bd" />
              <circle cx="212" cy="276" r="3" fill="#ffd9a0" />
              <circle cx="244" cy="258" r="2.2" fill="#cfe6ff" />
              <path d="M84 292 h44 v16 h-44 Z M192 284 h56 v24 h-56 Z" fill="rgba(120,170,215,0.28)" />
            </g>
            <rect x="48" y="112" width="232" height="196" rx="6" fill="none" stroke="rgba(150,190,235,0.22)" strokeWidth="3" />
            <g stroke="rgba(170,205,240,0.1)" strokeWidth="6">
              {[140, 165, 190, 215, 240, 265, 290].map((y) => (
                <path key={y} d={`M54 ${y} H274`} />
              ))}
            </g>
            <path d="M164 112 V308" stroke="rgba(150,190,235,0.22)" strokeWidth="3" />

            {/* curtain rail and folded curtain */}
            <path d="M30 82 H1170" stroke="rgba(150,190,235,0.24)" strokeWidth="4" strokeLinecap="round" />
            <path
              d="M1092 86 q18 84 6 178 q-4 38 10 80 h58 q-16 -48 -8 -92 q10 -92 -4 -166 Z"
              fill="rgba(96, 130, 168, 0.35)"
            />
            <g stroke="rgba(150,190,235,0.16)" strokeWidth="2">
              <path d="M1106 90 q14 124 6 254" />
              <path d="M1128 90 q12 124 4 254" />
            </g>

            {/* headwall services, directly behind the bed head */}
            <rect x="452" y="118" width="296" height="80" rx="8" fill="rgba(20,40,60,0.85)" stroke="rgba(150,190,235,0.2)" strokeWidth="2" />
            <g fill="rgba(150,190,235,0.5)">
              <circle cx="492" cy="158" r="12" />
              <circle cx="536" cy="158" r="12" />
              <rect x="570" y="146" width="52" height="24" rx="4" />
              <rect x="640" y="146" width="52" height="24" rx="4" />
            </g>
            <text x="468" y="190" fill="rgba(180,215,245,0.34)" fontSize="13" fontFamily="ui-monospace, monospace">
              O₂ · SUCTION · AIR
            </text>
          </g>

          {/* ---- IV pole, to the patient's right ---- */}
          <g>
            <ellipse cx="308" cy="592" rx="52" ry="12" fill="rgba(0,0,0,0.35)" />
            <rect x="302" y="214" width="12" height="378" rx="6" fill="url(#room-steel)" />
            <path d="M266 588 H350 M308 588 v6" stroke="url(#room-steel)" strokeWidth="9" strokeLinecap="round" />
            <path d="M278 222 H338" stroke="url(#room-steel)" strokeWidth="8" strokeLinecap="round" />
            {/* fluid bag */}
            <path d="M267 232 h44 a8 8 0 0 1 8 8 v92 a8 8 0 0 1 -8 8 h-44 a8 8 0 0 1 -8 -8 v-92 a8 8 0 0 1 8 -8 Z" fill="rgba(214, 236, 252, 0.5)" />
            <path d="M259 286 h60 v46 a8 8 0 0 1 -8 8 h-44 a8 8 0 0 1 -8 -8 Z" fill="rgba(150, 205, 240, 0.55)" />
            <rect x="259" y="232" width="60" height="108" rx="8" fill="none" stroke="rgba(190,225,250,0.4)" strokeWidth="2" />
            {/* giving set running down and across to the patient's arm */}
            <path
              d="M289 342 q6 44 22 74 q26 48 106 62"
              fill="none"
              stroke="rgba(198, 226, 248, 0.55)"
              strokeWidth="2.5"
            />
            <circle cx="289" cy="358" r="9" fill="rgba(214,236,252,0.6)" />
          </g>

          {/* ---- monitor stand, beside the bed, screen square to the viewer ---- */}
          <g>
            <ellipse cx="948" cy="600" rx="92" ry="17" fill="rgba(0,0,0,0.38)" />
            <rect x="939" y="330" width="18" height="264" rx="8" fill="url(#room-steel)" />
            <path d="M878 596 H1018" stroke="url(#room-steel)" strokeWidth="12" strokeLinecap="round" />
            <circle cx="948" cy="600" r="92" fill="url(#room-monitor-glow)" opacity="0.22" />
            {/* the bezel the live monitor is composited into */}
            <rect x="812" y="126" width="272" height="212" rx="14" fill="#0c1722" stroke="rgba(150,200,235,0.26)" strokeWidth="3" />
            <rect x="930" y="326" width="36" height="18" rx="4" fill="url(#room-steel)" />
          </g>

          {/* ---- bed, running away from the viewer ---- */}
          <g>
            <ellipse cx="600" cy="626" rx="330" ry="28" fill="rgba(0,0,0,0.42)" />

            {/* frame, castors */}
            <path d="M338 596 L468 372 H732 L862 596 Z" fill="rgba(28,42,58,0.9)" />
            <rect x="352" y="566" width="16" height="56" rx="7" fill="url(#room-steel)" />
            <rect x="832" y="566" width="16" height="56" rx="7" fill="url(#room-steel)" />
            <circle cx="360" cy="628" r="14" fill="#2b3947" stroke="rgba(150,190,235,0.3)" strokeWidth="2" />
            <circle cx="840" cy="628" r="14" fill="#2b3947" stroke="rgba(150,190,235,0.3)" strokeWidth="2" />

            {/* mattress: a trapezoid, wide at the foot and narrowing to the head */}
            <path d="M352 588 L470 378 H730 L848 588 Z" fill="url(#room-sheet)" />
            <path d="M352 588 L470 378 H730 L848 588" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />

            {/* raised backrest behind, carrying the patient upright toward you */}
            <path d="M470 378 H730 L714 250 q-114 -16 -228 0 Z" fill="url(#room-sheet)" />
            <path d="M486 250 q114 -16 228 0" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />

            {/* pillow, wide enough to show either side of the head */}
            <path
              d="M508 306 q-12 -36 34 -47 q58 -12 116 0 q46 11 34 47 q-10 28 -92 28 q-82 0 -92 -28 Z"
              fill="url(#room-sheet)"
            />
            <path
              d="M542 259 q58 -12 116 0"
              fill="none"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="2"
            />

            {/* footboard, nearest the viewer */}
            <rect x="324" y="556" width="552" height="26" rx="12" fill="url(#room-steel)" />
            <rect x="336" y="576" width="528" height="52" rx="10" fill="#22354a" stroke="rgba(150,190,235,0.22)" strokeWidth="2" />
            <path d="M600 582 v46" stroke="rgba(150,190,235,0.12)" strokeWidth="2" />

            {/* side rails, running away in perspective */}
            <path d="M446 414 L360 566" stroke="url(#room-steel)" strokeWidth="11" strokeLinecap="round" />
            <path d="M754 414 L840 566" stroke="url(#room-steel)" strokeWidth="11" strokeLinecap="round" />
            <path d="M452 404 L470 386" stroke="url(#room-steel)" strokeWidth="9" strokeLinecap="round" />
            <path d="M748 404 L730 386" stroke="url(#room-steel)" strokeWidth="9" strokeLinecap="round" />

            {/* ---- the patient, semi-recumbent and facing you ---- */}
            <g>
              {/* neck and head, face toward the viewer */}
              <path d="M578 298 h44 v32 q-22 10 -44 0 Z" fill="#c99e85" />
              <ellipse cx="600" cy="272" rx="40" ry="45" fill="#dcb89e" />
              {/* ears */}
              <path d="M560 266 q-9 5 -1 17" fill="none" stroke="rgba(150,105,85,0.5)" strokeWidth="2" strokeLinecap="round" />
              <path d="M640 266 q9 5 1 17" fill="none" stroke="rgba(150,105,85,0.5)" strokeWidth="2" strokeLinecap="round" />
              {/* hair, following the hairline rather than sitting on top like a cap */}
              <path
                d="M560 268 q0 -50 40 -52 q40 2 40 52 q-8 -26 -22 -32 q-24 12 -58 32 Z"
                fill="#38495c"
              />
              {/* eyes closed, brows, nose and a resting mouth — schematic on purpose */}
              <path d="M580 268 q8 -5 16 0" stroke="rgba(60,45,38,0.5)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
              <path d="M604 268 q8 -5 16 0" stroke="rgba(60,45,38,0.5)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
              <path d="M579 256 q9 -4 17 -1 M604 255 q8 -3 17 1" stroke="rgba(56,73,92,0.38)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              <path d="M598 276 v9 q3 3 6 1" stroke="rgba(150,105,85,0.45)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              <path d="M589 297 q11 2 22 0" stroke="rgba(120,70,60,0.45)" strokeWidth="2.2" fill="none" strokeLinecap="round" />

              {/* nasal cannula, prongs at the nose and tubing over both ears */}
              <path d="M590 287 q10 4 20 0" fill="none" stroke="rgba(240,248,255,0.8)" strokeWidth="2.2" />
              <path
                d="M590 287 q-30 4 -34 36 q-4 40 10 70"
                fill="none"
                stroke="rgba(240,248,255,0.42)"
                strokeWidth="2.2"
              />
              <path
                d="M610 287 q30 4 34 36 q4 40 -10 70"
                fill="none"
                stroke="rgba(240,248,255,0.42)"
                strokeWidth="2.2"
              />

              {/* torso in a gown: a real neckline and sloping shoulders, so the
                  head sits on a body rather than on a dome */}
              <path
                d="M574 332 q-32 4 -46 24 q-16 20 -20 48 l-8 52 q42 12 100 12 q58 0 100 -12 l-8 -52 q-4 -28 -20 -48 q-14 -20 -46 -24 q-26 9 -52 0 Z"
                fill="url(#room-gown)"
                stroke="rgba(52, 84, 118, 0.35)"
                strokeWidth="2"
              />
              <path d="M600 344 v108" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
              <path
                d="M574 332 q26 9 52 0"
                fill="none"
                stroke="rgba(255,255,255,0.34)"
                strokeWidth="2"
              />

              {/* arms resting along the sides, hands on the blanket */}
              <path
                d="M528 352 q-30 14 -36 46 l-14 70 q16 10 32 4 l12 -64 q6 -28 24 -40 Z"
                fill="#d8b49a"
                stroke="rgba(52, 84, 118, 0.28)"
                strokeWidth="1.6"
              />
              <path
                d="M672 352 q30 14 36 46 l14 70 q-16 10 -32 4 l-12 -64 q-6 -28 -24 -40 Z"
                fill="#d8b49a"
                stroke="rgba(52, 84, 118, 0.28)"
                strokeWidth="1.6"
              />
              <ellipse cx="494" cy="460" rx="15" ry="11" fill="#e0bda3" />
              <ellipse cx="706" cy="460" rx="15" ry="11" fill="#e0bda3" />
              {/* cannula dressing at the antecubital fossa */}
              <rect x="476" y="416" width="30" height="14" rx="6" fill="rgba(240,248,255,0.85)" transform="rotate(-14 491 423)" />

              {/* blanket over the legs, widening toward the foot of the bed */}
              <path
                d="M366 572 L472 478 q30 -12 62 -5 q66 15 136 0 q32 -7 62 5 L834 572 q-117 22 -234 22 q-117 0 -234 -22 Z"
                fill="url(#room-blanket2)"
              />
              <g stroke="rgba(255,255,255,0.13)" strokeWidth="2" fill="none">
                <path d="M524 484 L488 568" />
                <path d="M600 490 L600 578" />
                <path d="M676 484 L712 568" />
              </g>
              <path
                d="M472 478 q30 -12 62 -5 q66 15 136 0 q32 -7 62 5"
                fill="none"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="3"
              />

              {/* monitoring electrodes on the chest, cables running to the monitor */}
              <g>
                <path d="M566 372 q92 -34 178 -66 q42 -16 70 -20" fill="none" stroke="rgba(216,53,42,0.32)" strokeWidth="2" />
                <path d="M634 370 q68 -26 124 -48 q30 -12 56 -16" fill="none" stroke="rgba(230,240,250,0.34)" strokeWidth="2" />
                <path d="M600 408 q82 -42 160 -76 q30 -13 54 -17" fill="none" stroke="rgba(150,190,235,0.32)" strokeWidth="2" />
                <circle cx="566" cy="372" r="6.5" fill="#d8352a" stroke="rgba(40,60,80,0.4)" strokeWidth="1.4" />
                <circle cx="634" cy="370" r="6.5" fill="#f2f5f8" stroke="rgba(40,60,80,0.5)" strokeWidth="1.4" />
                <circle cx="600" cy="408" r="6.5" fill="#1b2430" stroke="rgba(150,190,235,0.6)" strokeWidth="1.4" />
              </g>
            </g>
          </g>

          {/* ---- bedside cabinet, front left ---- */}
          <g>
            <ellipse cx="130" cy="606" rx="80" ry="14" fill="rgba(0,0,0,0.3)" />
            <rect x="58" y="472" width="146" height="130" rx="8" fill="#1a2c3f" stroke="rgba(150,190,235,0.18)" strokeWidth="2" />
            <path d="M58 516 H204 M58 560 H204" stroke="rgba(150,190,235,0.16)" strokeWidth="2" />
            <rect x="112" y="490" width="38" height="6" rx="3" fill="rgba(150,190,235,0.35)" />
            {/* observation chart */}
            <rect x="78" y="432" width="90" height="40" rx="4" fill="rgba(232,240,248,0.82)" transform="rotate(-5 123 452)" />
            <g stroke="rgba(60,90,120,0.45)" strokeWidth="2" transform="rotate(-5 123 452)">
              <path d="M88 444 H158" />
              <path d="M88 452 H144" />
              <path d="M88 460 H150" />
            </g>
          </g>

          {/* soft vignette so the eye lands on the patient and the monitor */}
          <rect width="1200" height="700" fill="url(#room-vignette)" />
        </svg>

        {/* ---- the live monitor, composited into the scene ---- */}
        <button
          type="button"
          className={'room-monitor' + (revealVitals ? '' : ' is-masked')}
          onClick={() => onRevealVitals?.()}
          aria-label={
            revealVitals
              ? `Bedside monitor. Heart rate ${v.heartRateLabel ?? v.heartRate}, oxygen saturation ${v.spo2 > 0 ? v.spo2 + ' per cent' : 'unobtainable'}, blood pressure ${v.bpSystolic > 0 ? v.bpSystolic + ' over ' + v.bpDiastolic : 'unobtainable'}.`
              : 'Check the observations on the bedside monitor.'
          }
        >
          <span className="room-monitor-shell">
            <span className="room-monitor-top">
              <span className="room-monitor-brand">CIG CardioSim</span>
              <span className="room-monitor-bed">BED 4</span>
            </span>
            <span className="room-monitor-screen">
              <MonitorScreen
                rhythm={rhythm}
                signals={signals}
                clockRef={clockRef}
                playing={playing}
                windowSeconds={4.5}
                channels={COMPACT_CHANNELS}
                onQrs={onQrs}
              />
            </span>
            <span className="room-monitor-numbers">
              <span className="room-num room-num-hr">
                {revealVitals ? (v.heartRateLabel ?? v.heartRate) : '- -'}
                <em>bpm</em>
              </span>
              <span className="room-num room-num-spo2">
                {revealVitals && v.spo2 > 0 ? v.spo2 : '- -'}
                <em>SpO₂</em>
              </span>
              <span className="room-num room-num-bp">
                {revealVitals && v.bpSystolic > 0
                  ? `${v.bpSystolic}/${v.bpDiastolic}`
                  : '- -/- -'}
                <em>NIBP</em>
              </span>
            </span>
            {revealVitals && v.alarm !== 'normal' && v.alarmText ? (
              <span className="room-monitor-alarm" style={{ color: alarmTone }}>
                {v.alarmText}
              </span>
            ) : null}
          </span>
          <span className="room-monitor-cue">
            <Icon name="focus" size={13} />
            {revealVitals ? 'Bedside monitor' : 'Check the observations'}
          </span>
        </button>

        {/* ---- hotspots ---- */}
        {hotspots.map((h) => (
          <div
            key={h.id}
            className={'room-hotspot' + (open === h.id ? ' is-open' : '')}
            style={{ left: `${h.x}%`, top: `${h.y}%` }}
          >
            <button
              type="button"
              className="room-hotspot-dot"
              aria-expanded={open === h.id}
              aria-label={h.label}
              onClick={() => setOpen(open === h.id ? null : h.id)}
            >
              <span />
            </button>
            {open === h.id ? (
              <div className="room-tip" role="note">
                <h6>{h.label}</h6>
                <p>{h.detail}</p>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* The same four hotspots as a list. Four 26px dots overlaid on a scene
          only ~260px tall cannot be tapped apart, so on touch-sized screens
          the dots are hidden by CSS and this list carries the identical
          content instead. It is display:none from 781px up, where the dots
          on the scene are the better affordance. */}
      <ul className="room-findings">
        {hotspots.map((h) => (
          <li key={h.id}>
            <button
              type="button"
              className="room-finding"
              aria-expanded={open === h.id}
              onClick={() => setOpen(open === h.id ? null : h.id)}
            >
              <span className="room-finding-dot" aria-hidden="true" />
              <span className="room-finding-label">{h.label}</span>
              <Icon name={open === h.id ? 'chevron-down' : 'chevron-right'} size={14} />
            </button>
            {open === h.id ? <p className="room-finding-detail">{h.detail}</p> : null}
          </li>
        ))}
      </ul>

      <div className="room-caption">
        <div>
          <span className="eyebrow eyebrow-blue">
            Bedside · fictional teaching case · {activeCase.patient.setting}
          </span>
          <h3>{activeCase.patient.descriptor}</h3>
          <p>{activeCase.presentingComplaint}</p>
        </div>
        {footer}
      </div>
    </div>
  );
};
