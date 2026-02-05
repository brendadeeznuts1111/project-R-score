// lib/polish/micro-interactions/index.ts - MicroInteractions Class
// ═══════════════════════════════════════════════════════════════════════════════

import { Runtime } from "../core/runtime.ts";
import { feedbackManager } from "../feedback/manager.ts";
import { typeText, rainbowText, fadeInText, pulseText, slideInText } from "../visual/terminal-animation.ts";
import {
  registerEasterEgg,
  triggerEasterEgg,
  registerBuiltInEasterEggs,
  loadDiscoveredEggs,
  getDiscoveryProgress,
  InputSequenceTracker,
} from "./easter-eggs.ts";
import {
  celebrateCLI,
  showConfetti,
  showLoadingMessages,
  sparkleText,
  waveText,
  bounceText,
  showFireworks,
} from "./animations.ts";
import type { EasterEgg, ConfettiOptions, TypewriterOptions } from "../types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// MicroInteractions Class
// ─────────────────────────────────────────────────────────────────────────────

export class MicroInteractions {
  private inputTracker = new InputSequenceTracker();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    registerBuiltInEasterEggs();
    await loadDiscoveredEggs();
    this.initialized = true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Easter Eggs
  // ─────────────────────────────────────────────────────────────────────────

  registerEasterEgg(egg: EasterEgg): void {
    registerEasterEgg(egg);
  }

  async checkInput(input: string): Promise<boolean> {
    return triggerEasterEgg(input);
  }

  trackKeyPress(char: string): void {
    this.inputTracker.track(char);
  }

  async checkTrackedInput(): Promise<boolean> {
    return this.inputTracker.check();
  }

  getEasterEggProgress(): string {
    return getDiscoveryProgress();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Text Animations
  // ─────────────────────────────────────────────────────────────────────────

  async typeText(text: string, options?: TypewriterOptions): Promise<void> {
    await typeText(text, options);
  }

  async rainbowText(text: string, cycles?: number): Promise<void> {
    await rainbowText(text, cycles);
  }

  async fadeInText(text: string): Promise<void> {
    await fadeInText(text);
  }

  async pulseText(text: string, pulses?: number): Promise<void> {
    await pulseText(text, pulses);
  }

  async slideInText(text: string): Promise<void> {
    await slideInText(text);
  }

  async sparkleText(text: string, duration?: number): Promise<void> {
    await sparkleText(text, duration);
  }

  async waveText(text: string, cycles?: number): Promise<void> {
    await waveText(text, cycles);
  }

  async bounceText(text: string, bounces?: number): Promise<void> {
    await bounceText(text, bounces);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Celebration Effects
  // ─────────────────────────────────────────────────────────────────────────

  async celebrate(message?: string): Promise<void> {
    await feedbackManager.success();

    if (Runtime.isBrowser) {
      showConfetti();
    } else {
      await celebrateCLI(message);
    }
  }

  showConfetti(options?: ConfettiOptions): void {
    showConfetti(options);
  }

  async showFireworks(count?: number): Promise<void> {
    await showFireworks(count);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Loading Effects
  // ─────────────────────────────────────────────────────────────────────────

  async showLoadingMessages(count?: number, interval?: number): Promise<void> {
    await showLoadingMessages(count, interval);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Feedback Integration
  // ─────────────────────────────────────────────────────────────────────────

  async click(): Promise<void> {
    await feedbackManager.click();
  }

  async success(): Promise<void> {
    await feedbackManager.success();
  }

  async error(): Promise<void> {
    await feedbackManager.error();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Instance
// ─────────────────────────────────────────────────────────────────────────────

export const microInteractions = new MicroInteractions();

// ─────────────────────────────────────────────────────────────────────────────
// Re-exports
// ─────────────────────────────────────────────────────────────────────────────

export {
  registerEasterEgg,
  triggerEasterEgg,
  registerBuiltInEasterEggs,
  InputSequenceTracker,
} from "./easter-eggs.ts";

export {
  celebrateCLI,
  showConfetti,
  showLoadingMessages,
  sparkleText,
  waveText,
  bounceText,
  showFireworks,
} from "./animations.ts";
