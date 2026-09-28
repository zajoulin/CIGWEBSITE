/* ==========================================================================
   CIG — Heart sound synthesiser
   --------------------------------------------------------------------------
   Renders one cardiac cycle of auscultation audio from the acoustic model in
   content/exam/heart-sounds.json, then loops it. Every sound the learner hears
   is produced from the JSON: timing as a fraction of the cardiac cycle,
   centre frequency, bandwidth, noisiness and envelope shape.

   Why synthesis rather than recordings: the platform has no licensed audio
   library, and — more usefully — a synthesised murmur is generated from the
   same cycle clock that drives the systole/diastole timeline on screen, so
   what the learner hears and what they see are guaranteed to be in step.

   These are deliberately schematic teaching sounds, not clinical recordings,
   and the interface says so.

   Dependency-free: Web Audio plus a small biquad implemented here, because
   the filtering happens while the cycle is rendered offline rather than in
   the graph.
   ========================================================================== */

import type { HeartSound, SoundEvent } from '../types';

/* --------------------------------------------------------------- Filters -- */

interface Biquad {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

/** Band-pass biquad (constant skirt gain), from the standard RBJ cookbook. */
const bandpass = (freq: number, q: number, sampleRate: number): Biquad => {
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const alpha = Math.sin(w0) / (2 * Math.max(0.3, q));
  const cos = Math.cos(w0);
  const a0 = 1 + alpha;
  return {
    b0: alpha / a0,
    b1: 0,
    b2: -alpha / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha) / a0,
  };
};

/** Runs a biquad over a buffer in place. */
const runFilter = (data: Float32Array, f: Biquad): void => {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < data.length; i++) {
    const x0 = data[i];
    const y0 = f.b0 * x0 + f.b1 * x1 + f.b2 * x2 - f.a1 * y1 - f.a2 * y2;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    data[i] = y0;
  }
};

/* -------------------------------------------------------------- Envelopes -- */

/** Amplitude envelope across an event, u from 0 to 1. */
const envelope = (u: number, shape: SoundEvent['shape']): number => {
  if (u <= 0 || u >= 1) return 0;
  switch (shape) {
    case 'crescendo':
      return Math.pow(u, 1.6) * Math.sin(Math.PI * Math.min(1, u * 1.05));
    case 'decrescendo':
      return Math.exp(-u * 3.1) * Math.sin(Math.PI * Math.min(1, u * 6)) ** 0.4;
    case 'diamond':
      // Crescendo–decrescendo: the shape of an ejection systolic murmur.
      return Math.pow(Math.sin(Math.PI * u), 1.5);
    case 'plateau':
      // Uniform through the event, with short smooth edges.
      return Math.min(1, Math.min(u, 1 - u) * 14);
    case 'thump':
    default: {
      // Short percussive valve sound: near-instant attack, quick decay.
      const attack = Math.min(1, u * 26);
      return attack * Math.exp(-u * 7.5);
    }
  }
};

/* ------------------------------------------------------------- Rendering -- */

export interface RenderedCycle {
  data: Float32Array;
  sampleRate: number;
  /** Duration of one cardiac cycle in seconds. */
  cycle: number;
}

/**
 * Renders a single cardiac cycle. The buffer is exactly one cycle long so it
 * can be looped seamlessly, and events that would ring past the end wrap
 * around into the start — which is what a continuous murmur actually does.
 */
export const renderCycle = (sound: HeartSound, sampleRate = 44100): RenderedCycle => {
  const cycle = 60 / (sound.rate || 72);
  const n = Math.max(1, Math.round(cycle * sampleRate));
  const out = new Float32Array(n);

  for (const ev of sound.events) {
    const start = ev.start * cycle;
    const end = ev.end * cycle;
    const len = Math.max(1, Math.round((end - start) * sampleRate));
    const startSample = Math.round(start * sampleRate);
    const layer = new Float32Array(len);

    // Source material: noise for turbulence, tone for valve closure.
    const noiseRatio = Math.max(0, Math.min(1, ev.noise));
    let phase = 0;
    for (let i = 0; i < len; i++) {
      const u = i / len;
      // Heart sounds fall slightly in pitch as they decay; murmurs do not.
      const f = ev.kind === 'murmur' ? ev.frequency : ev.frequency * (1 - 0.28 * u);
      phase += (2 * Math.PI * f) / sampleRate;
      const tone = Math.sin(phase);
      const noise = Math.random() * 2 - 1;
      layer[i] = tone * (1 - noiseRatio) + noise * noiseRatio;
    }

    // Band-limit to the stated centre frequency and bandwidth. A narrow band
    // gives the low thud of S1; a wide one gives the harsh hiss of a murmur.
    const q = ev.frequency / Math.max(20, ev.bandwidth);
    runFilter(layer, bandpass(ev.frequency, q, sampleRate));
    runFilter(layer, bandpass(ev.frequency, q * 0.8, sampleRate));

    // Apply the envelope and mix into the cycle, wrapping at the end.
    for (let i = 0; i < len; i++) {
      const a = envelope(i / len, ev.shape) * ev.intensity;
      const idx = (startSample + i) % n;
      out[idx] += layer[i] * a;
    }
  }

  // Normalise to a comfortable level, then soft-clip so a loud murmur over a
  // loud S1 never produces digital distortion.
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  const gain = peak > 0 ? 0.82 / peak : 1;
  for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * gain * 1.25) * 0.8;

  return { data: out, sampleRate, cycle };
};

/* --------------------------------------------------------------- Player -- */

type Ctor = new () => AudioContext;

const getAudioContext = (): AudioContext | null => {
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

export type ChestPiece = 'diaphragm' | 'bell';

/**
 * Plays one rendered cycle on a loop, and reports where in the cycle it is so
 * the on-screen timeline can follow it. A single shared context is created on
 * the first user gesture, as browsers require.
 */
export class HeartSoundPlayer {
  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private startedAt = 0;
  private cycleLength = 0;
  private currentId: string | null = null;
  private volume = 0.7;
  private piece: ChestPiece = 'diaphragm';

  /** True when the browser gives us an audio context at all. */
  get available(): boolean {
    return this.ctx !== null || typeof window !== 'undefined';
  }

  get playingId(): string | null {
    return this.currentId;
  }

  private ensure(): AudioContext | null {
    if (!this.ctx) this.ctx = getAudioContext();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.gain && this.ctx) {
      this.gain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
  }

  /**
   * The chestpiece changes what you hear, exactly as it does at the bedside:
   * the bell transmits low frequencies (S3, S4, the mitral stenosis rumble),
   * the diaphragm favours the higher-pitched murmurs.
   */
  setChestPiece(piece: ChestPiece): void {
    this.piece = piece;
    this.applyPiece();
  }

  private applyPiece(): void {
    if (!this.filter || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.piece === 'bell') {
      this.filter.type = 'lowpass';
      this.filter.frequency.setTargetAtTime(190, now, 0.05);
      this.filter.Q.setTargetAtTime(0.7, now, 0.05);
    } else {
      this.filter.type = 'highpass';
      this.filter.frequency.setTargetAtTime(80, now, 0.05);
      this.filter.Q.setTargetAtTime(0.7, now, 0.05);
    }
  }

  /** Starts (or restarts) a looping heart sound. Returns false if unavailable. */
  play(sound: HeartSound): boolean {
    const ctx = this.ensure();
    if (!ctx) return false;
    this.stop();

    const rendered = renderCycle(sound, ctx.sampleRate);
    const buffer = ctx.createBuffer(1, rendered.data.length, rendered.sampleRate);
    // Cast: lib.dom types this parameter differently across TypeScript
    // versions, and the buffer is always a plain Float32Array here.
    buffer.copyToChannel(rendered.data as Parameters<AudioBuffer['copyToChannel']>[0], 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    gain.gain.value = 0;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    this.source = source;
    this.filter = filter;
    this.gain = gain;
    this.applyPiece();

    source.start();
    this.startedAt = ctx.currentTime;
    this.cycleLength = rendered.cycle;
    this.currentId = sound.id;
    // Short fade-in avoids a click when the stethoscope is placed.
    gain.gain.setTargetAtTime(this.volume, ctx.currentTime, 0.04);
    return true;
  }

  stop(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        /* already stopped */
      }
      this.source.disconnect();
    }
    this.filter?.disconnect();
    this.gain?.disconnect();
    this.source = null;
    this.filter = null;
    this.gain = null;
    this.currentId = null;
  }

  /** Position within the cardiac cycle, 0–1, or null when nothing is playing. */
  phase(): number | null {
    if (!this.ctx || !this.source || this.cycleLength <= 0) return null;
    const elapsed = this.ctx.currentTime - this.startedAt;
    return (elapsed % this.cycleLength) / this.cycleLength;
  }

  dispose(): void {
    this.stop();
    if (this.ctx) {
      void this.ctx.close().catch(() => undefined);
      this.ctx = null;
    }
  }
}
