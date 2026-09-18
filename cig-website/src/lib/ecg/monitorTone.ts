/* ==========================================================================
   CIG — Monitor tones
   --------------------------------------------------------------------------
   The short QRS beep and the alarm tone a bedside monitor makes. Both are
   generated with a couple of oscillator nodes — no audio files, no library.

   As on a real monitor, the pitch of the QRS beep falls with the oxygen
   saturation, which is the cue clinicians actually listen for during an
   intubation or an arrest without looking at the screen. Sound is off until
   the learner turns it on, and never plays automatically.
   ========================================================================== */

type Ctor = new () => AudioContext;

const createContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
  const Impl = w.AudioContext ?? w.webkitAudioContext;
  if (!Impl) return null;
  try {
    return new Impl();
  } catch {
    return null;
  }
};

export type AlarmLevel = 'normal' | 'advisory' | 'warning' | 'critical';

export class MonitorTone {
  private ctx: AudioContext | null = null;
  private lastAlarmAt = 0;
  enabled = false;

  private ensure(): AudioContext | null {
    if (!this.ctx) this.ctx = createContext();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (on) this.ensure();
  }

  /** The short beep that accompanies each detected QRS complex. */
  beep(spo2: number): void {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    // 92–100% maps to roughly 660–880 Hz, then falls steeply below that.
    const sat = Math.max(70, Math.min(100, spo2 || 100));
    const freq = 300 + (sat - 70) * 19;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.14, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /** A two- or three-note alarm burst, repeated no more than once a second. */
  alarm(level: AlarmLevel): void {
    if (!this.enabled || level === 'normal') return;
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const gap = level === 'critical' ? 1.1 : level === 'warning' ? 2.4 : 6;
    if (now - this.lastAlarmAt < gap) return;
    this.lastAlarmAt = now;

    const notes =
      level === 'critical' ? [988, 784, 988, 784] : level === 'warning' ? [784, 659] : [523];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = f;
      const t = now + i * 0.15;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(level === 'critical' ? 0.075 : 0.05, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    });
  }

  dispose(): void {
    if (this.ctx) {
      void this.ctx.close().catch(() => undefined);
      this.ctx = null;
    }
  }
}
