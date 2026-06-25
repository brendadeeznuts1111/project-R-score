// lib/polish/feedback/audio.ts - Web Audio Feedback Sounds
// ═══════════════════════════════════════════════════════════════════════════════

import { Runtime } from "../core/runtime.ts";
import type { SoundType, AudioConfig } from "../types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Sound Configurations
// ─────────────────────────────────────────────────────────────────────────────

const SOUND_CONFIGS: Record<SoundType, AudioConfig[]> = {
  success: [
    { frequency: 523.25, duration: 100, type: "sine" }, // C5
    { frequency: 659.25, duration: 100, type: "sine" }, // E5
    { frequency: 783.99, duration: 150, type: "sine" }, // G5
  ],
  error: [
    { frequency: 200, duration: 150, type: "square" },
    { frequency: 150, duration: 200, type: "square" },
  ],
  warning: [
    { frequency: 440, duration: 100, type: "triangle" },
    { frequency: 440, duration: 100, type: "triangle" },
  ],
  click: [
    { frequency: 1000, duration: 30, type: "sine" },
  ],
  notification: [
    { frequency: 880, duration: 100, type: "sine" },
    { frequency: 1108.73, duration: 150, type: "sine" }, // C#6
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Audio Manager
// ─────────────────────────────────────────────────────────────────────────────

class AudioManager {
  private context: AudioContext | null = null;
  private enabled = true;
  private volume = 0.5;

  constructor() {
    // Only initialize in browser
    if (Runtime.supportsAudio && typeof AudioContext !== "undefined") {
      // Lazy initialization to avoid autoplay restrictions
    }
  }

  private getContext(): AudioContext | null {
    if (!Runtime.supportsAudio) return null;

    if (!this.context) {
      try {
        this.context = new AudioContext();
      } catch {
        return null;
      }
    }

    return this.context;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  async play(type: SoundType): Promise<void> {
    if (!this.enabled) return;

    const ctx = this.getContext();
    if (!ctx) return;

    // Resume context if suspended (autoplay policy)
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => null);
    }

    const configs = SOUND_CONFIGS[type];
    if (!configs) return;

    let startTime = ctx.currentTime;

    for (const config of configs) {
      await this.playTone(ctx, config, startTime);
      startTime += config.duration / 1000;
    }
  }

  private async playTone(
    ctx: AudioContext,
    config: AudioConfig,
    startTime: number
  ): Promise<void> {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(config.frequency, startTime);

    const volume = (config.volume ?? 1) * this.volume;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, startTime + config.duration / 1000);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + config.duration / 1000 + 0.01);
  }

  async playCustom(configs: AudioConfig[]): Promise<void> {
    if (!this.enabled) return;

    const ctx = this.getContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => null);
    }

    let startTime = ctx.currentTime;

    for (const config of configs) {
      await this.playTone(ctx, config, startTime);
      startTime += config.duration / 1000;
    }
  }

  // Play a single note by frequency
  async playNote(frequency: number, duration = 100): Promise<void> {
    await this.playCustom([{ frequency, duration, type: "sine" }]);
  }

  // Play a chord
  async playChord(frequencies: number[], duration = 200): Promise<void> {
    if (!this.enabled) return;

    const ctx = this.getContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => null);
    }

    const startTime = ctx.currentTime;

    for (const frequency of frequencies) {
      this.playTone(ctx, { frequency, duration, type: "sine" }, startTime);
    }
  }

  dispose(): void {
    if (this.context) {
      this.context.close().catch(() => null);
      this.context = null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Instance
// ─────────────────────────────────────────────────────────────────────────────

export const audioManager = new AudioManager();

// ─────────────────────────────────────────────────────────────────────────────
// Convenience Functions
// ─────────────────────────────────────────────────────────────────────────────

export function playSound(type: SoundType): Promise<void> {
  return audioManager.play(type);
}

export function setAudioEnabled(enabled: boolean): void {
  audioManager.setEnabled(enabled);
}

export function setAudioVolume(volume: number): void {
  audioManager.setVolume(volume);
}
