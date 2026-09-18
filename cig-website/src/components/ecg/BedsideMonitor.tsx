/* ==========================================================================
   CIG — Bedside cardiac monitor
   --------------------------------------------------------------------------
   A hospital bedside monitor: dark display, calibrated ECG grid, continuously
   scrolling multi-channel waveforms, live numerics, and alarm and status
   indicators inside a physical bezel.

   The waveforms are drawn on a canvas — one sample per pixel per frame — and
   everything else is HTML, so the numerics stay crisp, selectable and
   readable by assistive technology while the traces stay cheap to animate.

   The design is inspired by the class of clinical bedside monitors generally,
   not by any manufacturer's product: the layout, colours and typography are
   CIG's own, and the device is labelled as an educational simulation.
   ========================================================================== */

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '../icons/Icon';
import { EcgSignal, plethAt, respirationAt } from '../../lib/ecg/engine';
import type { DisplayLead } from '../../lib/ecg/leads';
import type { MonitorTone } from '../../lib/ecg/monitorTone';
import type { EcgFeatureId, EcgRhythm } from '../../lib/types';

/* ----------------------------------------------------------- Appearance -- */

const COLORS = {
  bg: '#04121e',
  gridFine: 'rgba(120, 190, 160, 0.11)',
  gridBold: 'rgba(120, 200, 165, 0.2)',
  ecg: '#3ff09a',
  ecgGlow: 'rgba(63, 240, 154, 0.22)',
  pleth: '#41cdf0',
  plethGlow: 'rgba(65, 205, 240, 0.2)',
  resp: '#f3d565',
  respGlow: 'rgba(243, 213, 101, 0.18)',
  label: 'rgba(214, 240, 255, 0.62)',
  highlight: 'rgba(255, 214, 102, 0.16)',
  highlightEdge: 'rgba(255, 214, 102, 0.85)',
};

/** Standard recording speed and gain, which the grid is drawn to. */
const MM_PER_SECOND = 25;
const MM_PER_MV = 10;

export interface MonitorChannelDef {
  id: string;
  kind: 'ecg' | 'pleth' | 'resp';
  label: string;
  sublabel?: string;
  lead?: DisplayLead;
  color: string;
  glow: string;
  /** Share of the display height. */
  weight: number;
}

export const FULL_CHANNELS: MonitorChannelDef[] = [
  { id: 'ecg-ii', kind: 'ecg', label: 'II', sublabel: 'x1.0', lead: 'II', color: COLORS.ecg, glow: COLORS.ecgGlow, weight: 1.25 },
  { id: 'ecg-v1', kind: 'ecg', label: 'V1', sublabel: 'x1.0', lead: 'V1', color: COLORS.ecg, glow: COLORS.ecgGlow, weight: 1 },
  { id: 'pleth', kind: 'pleth', label: 'Pleth', sublabel: 'SpO₂', color: COLORS.pleth, glow: COLORS.plethGlow, weight: 0.85 },
  { id: 'resp', kind: 'resp', label: 'Resp', sublabel: 'Impedance', color: COLORS.resp, glow: COLORS.respGlow, weight: 0.7 },
];

export const COMPACT_CHANNELS: MonitorChannelDef[] = [
  { id: 'ecg-ii', kind: 'ecg', label: 'II', lead: 'II', color: COLORS.ecg, glow: COLORS.ecgGlow, weight: 1.3 },
  { id: 'pleth', kind: 'pleth', label: 'Pleth', color: COLORS.pleth, glow: COLORS.plethGlow, weight: 1 },
];

/* --------------------------------------------------------------- Screen -- */

export interface MonitorScreenProps {
  rhythm: EcgRhythm;
  /** One signal per displayed lead, keyed by lead id, plus 'II' always. */
  signals: Map<string, EcgSignal>;
  /** Live playback clock in signal seconds; read every frame. */
  clockRef: { current: number };
  playing: boolean;
  /** Seconds of signal visible across the display. */
  windowSeconds?: number;
  channels?: MonitorChannelDef[];
  /** Feature to shade on the trace, e.g. the QRS complex. */
  highlight?: EcgFeatureId | null;
  highlightLabel?: string;
  /** Called once per QRS as it reaches the leading edge. */
  onQrs?: (spo2: number) => void;
  className?: string;
}

/** The glass: grid, waveforms and highlight overlay. */
export const MonitorScreen = ({
  rhythm,
  signals,
  clockRef,
  playing,
  windowSeconds = 6,
  channels = FULL_CHANNELS,
  highlight = null,
  highlightLabel,
  onQrs,
  className = '',
}: MonitorScreenProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const props = useRef({ rhythm, signals, channels, highlight, highlightLabel, playing, windowSeconds, onQrs });
  props.current = { rhythm, signals, channels, highlight, highlightLabel, playing, windowSeconds, onQrs };
  const lastBeat = useRef<number>(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let disposed = false;
    /* The trace is only worth drawing while it is on screen and the browser
       is in the foreground. Scrolled past on a phone it was still repainting
       a full grid and four waveforms every frame, which is what made the
       page feel heavy while scrolling and drained the battery behind it. */
    let onScreen = true;

    /* Sizing used to be re-read from the layout on every animation frame.
       getBoundingClientRect forces a synchronous layout, so the monitor was
       paying for a full layout 60 times a second; a ResizeObserver reports
       the same number only when it actually changes. */
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const applySize = (cssW: number, cssH: number) => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(cssW * dpr));
      const h = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    {
      const rect = canvas.getBoundingClientRect();
      applySize(rect.width, rect.height);
    }

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver((entries) => {
        for (const e of entries) {
          const box = e.contentRect;
          applySize(box.width, box.height);
        }
      });
      ro.observe(canvas);
    }

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          onScreen = entries.some((e) => e.isIntersecting);
        },
        { rootMargin: '120px' },
      );
      io.observe(canvas);
    }

    const draw = () => {
      if (disposed) return;
      raf = requestAnimationFrame(draw);
      if (!onScreen || document.hidden) return;
      const W = canvas.width;
      const H = canvas.height;
      const p = props.current;
      const clock = clockRef.current;
      const t1 = clock;
      const t0 = clock - p.windowSeconds;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, W, H);

      const pxPerSecond = W / p.windowSeconds;
      const pxPerMm = pxPerSecond / MM_PER_SECOND;
      const pxPerMv = pxPerMm * MM_PER_MV;

      /* ---- grid: 1 mm fine, 5 mm bold, calibrated to 25 mm/s ---------- */
      const mm = pxPerMm;
      ctx.lineWidth = Math.max(1, dpr * 0.5);
      ctx.strokeStyle = COLORS.gridFine;
      ctx.beginPath();
      // Grid scrolls with the trace so it reads as moving paper.
      const shift = ((clock * pxPerSecond) % mm + mm) % mm;
      for (let x = -shift; x < W; x += mm) {
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, H);
      }
      for (let y = 0; y < H; y += mm) {
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(W, Math.round(y) + 0.5);
      }
      ctx.stroke();

      ctx.strokeStyle = COLORS.gridBold;
      ctx.beginPath();
      const shift5 = ((clock * pxPerSecond) % (mm * 5) + mm * 5) % (mm * 5);
      for (let x = -shift5; x < W; x += mm * 5) {
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, H);
      }
      for (let y = 0; y < H; y += mm * 5) {
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(W, Math.round(y) + 0.5);
      }
      ctx.stroke();

      /* ---- channel lanes ---------------------------------------------- */
      const totalWeight = p.channels.reduce((a, c) => a + c.weight, 0);
      let laneTop = 0;
      const samples = Math.min(1400, Math.max(240, Math.round(W / Math.max(1, dpr * 0.75))));

      for (const channel of p.channels) {
        const laneH = (H * channel.weight) / totalWeight;
        const mid = laneTop + laneH * 0.58;
        const signal = signalFor(p.signals, channel);

        /* highlight bands, drawn under the trace */
        if (channel.kind === 'ecg' && p.highlight && p.highlight !== 'baseline' && signal) {
          ctx.fillStyle = COLORS.highlight;
          ctx.strokeStyle = COLORS.highlightEdge;
          ctx.lineWidth = dpr;
          for (const beat of signal.beatsBetween(t0, t1)) {
            const win = signal.window(beat, p.highlight);
            if (!win || win.end < t0 || win.start > t1) continue;
            const x0 = ((win.start - t0) / p.windowSeconds) * W;
            const x1 = ((win.end - t0) / p.windowSeconds) * W;
            ctx.fillRect(x0, laneTop + 2, Math.max(2 * dpr, x1 - x0), laneH - 4);
            ctx.beginPath();
            ctx.moveTo(x0 + 0.5, laneTop + 2);
            ctx.lineTo(x0 + 0.5, laneTop + laneH - 2);
            ctx.moveTo(x1 - 0.5, laneTop + 2);
            ctx.lineTo(x1 - 0.5, laneTop + laneH - 2);
            ctx.stroke();
          }
        }

        /* the trace */
        const amp =
          channel.kind === 'ecg'
            ? pxPerMv
            : channel.kind === 'pleth'
              ? laneH * 0.34
              : laneH * 0.3;

        ctx.beginPath();
        for (let i = 0; i <= samples; i++) {
          const t = t0 + (i / samples) * p.windowSeconds;
          let v = 0;
          if (channel.kind === 'ecg' && signal) v = signal.valueAt(t);
          else if (channel.kind === 'pleth' && signal) {
            v = plethAt(signal, t, p.rhythm.vitals.spo2 > 0 ? 1 : 0) - 0.25;
          } else if (channel.kind === 'resp') {
            v = respirationAt(t, p.rhythm.vitals.respiratoryRate);
          }
          const x = (i / samples) * W;
          const y = mid - v * amp;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        // Phosphor look: a wide, soft pass under a thin, bright one.
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = channel.glow;
        ctx.lineWidth = dpr * 3.4;
        ctx.stroke();
        ctx.strokeStyle = channel.color;
        ctx.lineWidth = dpr * 1.35;
        ctx.stroke();

        /* leading-edge marker, as on a scrolling monitor */
        if (p.playing) {
          let v = 0;
          if (channel.kind === 'ecg' && signal) v = signal.valueAt(t1);
          else if (channel.kind === 'pleth' && signal) v = plethAt(signal, t1, 1) - 0.25;
          else if (channel.kind === 'resp') v = respirationAt(t1, p.rhythm.vitals.respiratoryRate);
          ctx.fillStyle = channel.color;
          ctx.beginPath();
          ctx.arc(W - dpr, mid - v * amp, dpr * 2.1, 0, Math.PI * 2);
          ctx.fill();
        }

        /* lane label and 1 mV calibration mark */
        ctx.font = `600 ${Math.round(11 * dpr)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.fillStyle = channel.color;
        ctx.globalAlpha = 0.9;
        ctx.fillText(channel.label, 10 * dpr, laneTop + 16 * dpr);
        if (channel.sublabel) {
          ctx.globalAlpha = 0.45;
          ctx.fillStyle = COLORS.label;
          ctx.fillText(channel.sublabel, 10 * dpr + ctx.measureText(channel.label).width + 8 * dpr, laneTop + 16 * dpr);
        }
        ctx.globalAlpha = 1;

        if (channel.kind === 'ecg') {
          // Calibration pulse: 1 mV tall, 5 mm wide, at the left of the lane.
          const cx = 10 * dpr;
          ctx.strokeStyle = channel.color;
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = dpr;
          ctx.beginPath();
          ctx.moveTo(cx, mid);
          ctx.lineTo(cx, mid - pxPerMv);
          ctx.lineTo(cx + pxPerMm * 5, mid - pxPerMv);
          ctx.lineTo(cx + pxPerMm * 5, mid);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        laneTop += laneH;
        if (laneTop < H) {
          ctx.strokeStyle = 'rgba(150, 200, 235, 0.09)';
          ctx.lineWidth = dpr;
          ctx.beginPath();
          ctx.moveTo(0, Math.round(laneTop) + 0.5);
          ctx.lineTo(W, Math.round(laneTop) + 0.5);
          ctx.stroke();
        }
      }

      /* ---- highlight caption ------------------------------------------ */
      if (p.highlight && p.highlightLabel && p.highlight !== 'baseline') {
        const text = p.highlightLabel.toUpperCase();
        ctx.font = `600 ${Math.round(10.5 * dpr)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        const tw = ctx.measureText(text).width;
        const bx = W - tw - 22 * dpr;
        const by = 8 * dpr;
        ctx.fillStyle = 'rgba(255, 214, 102, 0.14)';
        ctx.fillRect(bx - 8 * dpr, by, tw + 16 * dpr, 20 * dpr);
        ctx.fillStyle = COLORS.highlightEdge;
        ctx.fillText(text, bx, by + 14 * dpr);
      }

      /* ---- QRS beep trigger ------------------------------------------- */
      const lead = p.signals.get('II');
      if (lead && p.playing && p.onQrs) {
        const beat = lead.beatAt(t1);
        if (beat && beat.qrsOnset !== null && beat.index !== lastBeat.current) {
          lastBeat.current = beat.index;
          p.onQrs(p.rhythm.vitals.spo2);
        }
      }
    };

    raf = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      io?.disconnect();
    };
    // Mounted once; live values are read from refs each frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={'mon-canvas ' + className}
      role="img"
      aria-label={`Simulated bedside monitor showing ${rhythm.name} at ${rhythm.vitals.heartRate} beats per minute. ${rhythm.summary}`}
    />
  );
};

const signalFor = (signals: Map<string, EcgSignal>, channel: MonitorChannelDef): EcgSignal | null =>
  signals.get(channel.lead ?? 'II') ?? signals.get('II') ?? null;

/* ------------------------------------------------------------- Numerics -- */

const Numeric = ({
  label,
  value,
  unit,
  tone,
  sub,
  small,
}: {
  label: string;
  value: string;
  unit?: string;
  tone: 'ecg' | 'spo2' | 'resp' | 'nibp' | 'temp';
  sub?: string;
  small?: boolean;
}) => (
  <div className={'mon-num mon-num-' + tone + (small ? ' mon-num-sm' : '')}>
    <div className="mon-num-head">
      <span className="mon-num-label">{label}</span>
      {unit ? <span className="mon-num-unit">{unit}</span> : null}
    </div>
    <div className="mon-num-value">{value}</div>
    {sub ? <div className="mon-num-sub">{sub}</div> : null}
  </div>
);

/* --------------------------------------------------------------- Device -- */

export interface BedsideMonitorProps extends MonitorScreenProps {
  /** Bed label shown in the monitor's title bar. */
  bed?: string;
  /** Hides the numerics column, for the small monitor beside the bed. */
  compact?: boolean;
  tone?: MonitorTone | null;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  /** Rendered under the screen, e.g. the transport controls. */
  footer?: ReactNode;
}

const clockString = (): string => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Placeholder shown until the client mounts, so the server and the browser
    render the same markup and hydration never mismatches on the clock. */
const CLOCK_PLACEHOLDER = '--:--';

export const BedsideMonitor = ({
  bed = 'BED 4',
  compact = false,
  tone,
  soundEnabled = false,
  onToggleSound,
  footer,
  ...screen
}: BedsideMonitorProps) => {
  const { rhythm } = screen;
  const v = rhythm.vitals;
  const [now, setNow] = useState(CLOCK_PLACEHOLDER);
  const [alarmSilenced, setAlarmSilenced] = useState(false);

  useEffect(() => {
    setNow(clockString());
    const id = setInterval(() => setNow(clockString()), 20000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => setAlarmSilenced(false), [rhythm.id]);

  // Alarm tone, when the learner has turned monitor sound on.
  useEffect(() => {
    if (!tone || !soundEnabled || alarmSilenced || v.alarm === 'normal') return;
    const id = setInterval(() => tone.alarm(v.alarm), 1000);
    tone.alarm(v.alarm);
    return () => clearInterval(id);
  }, [tone, soundEnabled, alarmSilenced, v.alarm, rhythm.id]);

  const alarmClass = 'mon mon-alarm-' + v.alarm + (compact ? ' mon-compact' : '');

  return (
    <div className={alarmClass}>
      <div className="mon-bezel">
        <div className="mon-topbar">
          <span className="mon-brand">
            <Icon name="pulse" size={13} />
            CIG CardioSim
          </span>
          <span className="mon-bed">{bed} · TEACHING CASE</span>
          {v.alarm !== 'normal' && v.alarmText ? (
            <span className={'mon-alarm-banner' + (alarmSilenced ? ' silenced' : '')}>
              <span className="mon-alarm-dot" />
              {v.alarmText}
              {alarmSilenced ? ' · SILENCED' : ''}
            </span>
          ) : (
            <span className="mon-status-ok">
              <span className="mon-alarm-dot" />
              MONITORING
            </span>
          )}
          <span className="mon-clock mono">{now}</span>
        </div>

        <div className="mon-body">
          <div className="mon-screen">
            <MonitorScreen {...screen} onQrs={screen.onQrs} />
            <div className="mon-scanlines" aria-hidden="true" />
          </div>

          {!compact ? (
            <div className="mon-numerics" aria-live="polite">
              <Numeric
                label="HR"
                unit="bpm"
                tone="ecg"
                value={v.heartRateLabel ?? String(v.heartRate)}
                sub={rhythm.abbr ?? rhythm.name}
              />
              <Numeric
                label="SpO₂"
                unit="%"
                tone="spo2"
                value={v.spo2 > 0 ? String(v.spo2) : '- -'}
                sub={v.spo2 > 0 ? `PR ${v.heartRate}` : 'NO PULSE'}
              />
              <Numeric
                label="RR"
                unit="/min"
                tone="resp"
                value={v.respiratoryRate > 0 ? String(v.respiratoryRate) : '- -'}
                sub="IMPEDANCE"
              />
              <Numeric
                label="NIBP"
                unit="mmHg"
                tone="nibp"
                small
                value={
                  v.bpSystolic > 0 ? `${v.bpSystolic}/${v.bpDiastolic}` : '- - / - -'
                }
                sub={
                  v.bpSystolic > 0
                    ? `(${Math.round((v.bpSystolic + 2 * v.bpDiastolic) / 3)}) MAP`
                    : 'UNOBTAINABLE'
                }
              />
              {v.temperature ? (
                <Numeric label="TEMP" unit="°C" tone="temp" small value={v.temperature.toFixed(1)} />
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mon-botbar">
          <span className="mono">25 mm/s · 10 mm/mV · FILTER 0.5–40 Hz</span>
          <span className="mon-botbar-spacer" />
          {onToggleSound ? (
            <button
              type="button"
              className="mon-btn"
              aria-pressed={soundEnabled}
              onClick={onToggleSound}
              title={soundEnabled ? 'Mute monitor tones' : 'Enable monitor tones'}
            >
              <Icon name={soundEnabled ? 'sound' : 'mute'} size={13} />
              {soundEnabled ? 'Sound on' : 'Sound off'}
            </button>
          ) : null}
          {v.alarm !== 'normal' ? (
            <button
              type="button"
              className="mon-btn"
              aria-pressed={alarmSilenced}
              onClick={() => setAlarmSilenced((s) => !s)}
            >
              <Icon name={alarmSilenced ? 'mute' : 'warning'} size={13} />
              {alarmSilenced ? 'Alarm silenced' : 'Silence alarm'}
            </button>
          ) : null}
        </div>
      </div>
      {footer}
    </div>
  );
};
