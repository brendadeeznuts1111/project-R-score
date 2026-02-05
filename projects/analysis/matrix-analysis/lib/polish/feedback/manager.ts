// lib/polish/feedback/manager.ts - Unified Feedback Manager
// ═══════════════════════════════════════════════════════════════════════════════

import { Runtime } from "../core/runtime.ts";
import { audioManager, playSound } from "./audio.ts";
import { hapticManager, triggerHaptic } from "./haptic.ts";
import { flash, flashElement, shakeElement, pulseElement } from "./visual.ts";
import type { SoundType, HapticPattern, VisualFlashType, FeedbackOptions } from "../types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Feedback Manager
// ─────────────────────────────────────────────────────────────────────────────

export interface FeedbackConfig {
  audio: boolean;
  haptic: boolean;
  visual: boolean;
  audioVolume: number;
}

export class FeedbackManager {
  private config: FeedbackConfig = {
    audio: true,
    haptic: true,
    visual: true,
    audioVolume: 0.5,
  };

  constructor(config: Partial<FeedbackConfig> = {}) {
    this.config = { ...this.config, ...config };
    audioManager.setVolume(this.config.audioVolume);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Configuration
  // ─────────────────────────────────────────────────────────────────────────

  configure(config: Partial<FeedbackConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.audioVolume !== undefined) {
      audioManager.setVolume(config.audioVolume);
    }
  }

  setAudioEnabled(enabled: boolean): void {
    this.config.audio = enabled;
    audioManager.setEnabled(enabled);
  }

  setHapticEnabled(enabled: boolean): void {
    this.config.haptic = enabled;
    hapticManager.setEnabled(enabled);
  }

  setVisualEnabled(enabled: boolean): void {
    this.config.visual = enabled;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Individual Feedback Types
  // ─────────────────────────────────────────────────────────────────────────

  async playSound(type: SoundType): Promise<void> {
    if (!this.config.audio) return;
    await playSound(type);
  }

  triggerHaptic(pattern: HapticPattern): void {
    if (!this.config.haptic) return;
    triggerHaptic(pattern);
  }

  async flashVisual(type: VisualFlashType, target?: HTMLElement | string): Promise<void> {
    if (!this.config.visual) return;
    await flash(type, target);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Combined Feedback
  // ─────────────────────────────────────────────────────────────────────────

  async success(target?: HTMLElement | string): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.config.audio) {
      promises.push(playSound("success"));
    }

    if (this.config.haptic) {
      triggerHaptic("success");
    }

    if (this.config.visual) {
      promises.push(flash("success", target));
    }

    await Promise.all(promises);
  }

  async error(target?: HTMLElement | string): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.config.audio) {
      promises.push(playSound("error"));
    }

    if (this.config.haptic) {
      triggerHaptic("error");
    }

    if (this.config.visual) {
      promises.push(flash("error", target));
      if (Runtime.isBrowser && target) {
        shakeElement(target);
      }
    }

    await Promise.all(promises);
  }

  async warning(target?: HTMLElement | string): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.config.audio) {
      promises.push(playSound("warning"));
    }

    if (this.config.haptic) {
      triggerHaptic("double");
    }

    if (this.config.visual) {
      promises.push(flash("warning", target));
    }

    await Promise.all(promises);
  }

  async info(target?: HTMLElement | string): Promise<void> {
    if (this.config.audio) {
      await playSound("notification");
    }

    if (this.config.haptic) {
      triggerHaptic("light");
    }

    if (this.config.visual) {
      await flash("info", target);
    }
  }

  async click(): Promise<void> {
    if (this.config.audio) {
      await playSound("click");
    }

    if (this.config.haptic) {
      triggerHaptic("light");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Custom Feedback
  // ─────────────────────────────────────────────────────────────────────────

  async custom(options: {
    sound?: SoundType;
    haptic?: HapticPattern;
    visual?: { type: VisualFlashType; target?: HTMLElement | string };
  }): Promise<void> {
    const promises: Promise<void>[] = [];

    if (options.sound && this.config.audio) {
      promises.push(playSound(options.sound));
    }

    if (options.haptic && this.config.haptic) {
      triggerHaptic(options.haptic);
    }

    if (options.visual && this.config.visual) {
      promises.push(flash(options.visual.type, options.visual.target));
    }

    await Promise.all(promises);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Animation Helpers
  // ─────────────────────────────────────────────────────────────────────────

  shake(target: HTMLElement | string): void {
    if (!this.config.visual || !Runtime.isBrowser) return;
    shakeElement(target);
  }

  pulse(target: HTMLElement | string, pulses = 2): void {
    if (!this.config.visual || !Runtime.isBrowser) return;
    pulseElement(target, pulses);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Instance
// ─────────────────────────────────────────────────────────────────────────────

export const feedbackManager = new FeedbackManager();

// ─────────────────────────────────────────────────────────────────────────────
// Quick Access Functions
// ─────────────────────────────────────────────────────────────────────────────

export const feedback = {
  success: (target?: HTMLElement | string) => feedbackManager.success(target),
  error: (target?: HTMLElement | string) => feedbackManager.error(target),
  warning: (target?: HTMLElement | string) => feedbackManager.warning(target),
  info: (target?: HTMLElement | string) => feedbackManager.info(target),
  click: () => feedbackManager.click(),
};
