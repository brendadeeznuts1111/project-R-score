// keyboard-shortcuts-lite/src/polish-integration.ts - Polish Integration
// ═══════════════════════════════════════════════════════════════════════════════
// Extends focus-utils with polish feedback features

import { announceToScreenReader } from "./focus-utils.ts";
import {
  FeedbackManager,
  feedbackManager,
  flashElement,
  pulseElement,
  highlightElement,
  playSound,
  triggerHaptic,
  type SoundType,
  type HapticPattern,
  type VisualFlashType,
} from "../../lib/polish/index.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Enhanced Announcement with Feedback
// ─────────────────────────────────────────────────────────────────────────────

export interface AnnounceOptions {
  sound?: SoundType;
  haptic?: HapticPattern;
  visual?: {
    type: VisualFlashType;
    target?: string | HTMLElement;
  };
}

export async function announceWithFeedback(
  message: string,
  type: "success" | "info" | "warning" | "error" = "info",
  options: AnnounceOptions = {}
): Promise<void> {
  // Screen reader announcement
  announceToScreenReader(message);

  // Multi-modal feedback based on type
  switch (type) {
    case "success":
      await feedbackManager.success(options.visual?.target);
      break;
    case "error":
      await feedbackManager.error(options.visual?.target);
      break;
    case "warning":
      await feedbackManager.warning(options.visual?.target);
      break;
    default:
      await feedbackManager.info(options.visual?.target);
  }

  // Additional custom feedback
  if (options.sound) {
    await playSound(options.sound);
  }
  if (options.haptic) {
    triggerHaptic(options.haptic);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Enhanced Focus with Polish
// ─────────────────────────────────────────────────────────────────────────────

export interface PolishedFocusOptions {
  selectText?: boolean;
  announce?: boolean;
  announceMessage?: string;
  playClickSound?: boolean;
  hapticFeedback?: boolean;
  highlightDuration?: number;
}

export async function focusWithPolish(
  selector: string | HTMLElement,
  options: PolishedFocusOptions = {}
): Promise<boolean> {
  const element = typeof selector === "string"
    ? document.querySelector<HTMLElement>(selector)
    : selector;

  if (!element) return false;

  // Focus the element
  element.focus();

  if (options.selectText !== false && "select" in element) {
    (element as HTMLInputElement).select();
  }

  // Visual highlight with polish
  highlightElement(element, options.highlightDuration ?? 1000);

  // Audio feedback
  if (options.playClickSound !== false) {
    await playSound("click").catch(() => null);
  }

  // Haptic feedback
  if (options.hapticFeedback !== false) {
    triggerHaptic("light");
  }

  // Screen reader announcement
  if (options.announce !== false) {
    announceToScreenReader(options.announceMessage ?? "Element focused");
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shortcut Execution Feedback
// ─────────────────────────────────────────────────────────────────────────────

export async function executeShortcutWithFeedback(
  shortcutName: string,
  action: () => void | Promise<void>,
  options: {
    successMessage?: string;
    errorMessage?: string;
    silent?: boolean;
  } = {}
): Promise<boolean> {
  try {
    // Click feedback on activation
    if (!options.silent) {
      await feedbackManager.click();
    }

    await action();

    // Success feedback
    if (!options.silent) {
      await feedbackManager.success();
      if (options.successMessage) {
        announceToScreenReader(options.successMessage);
      }
    }

    return true;
  } catch (error) {
    // Error feedback
    await feedbackManager.error();
    if (options.errorMessage) {
      announceToScreenReader(options.errorMessage);
    }
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyboard Event Enhancements
// ─────────────────────────────────────────────────────────────────────────────

let keySequence = "";
let sequenceTimeout: Timer | null = null;

export function trackKeySequence(key: string): string {
  if (sequenceTimeout) {
    clearTimeout(sequenceTimeout);
  }

  keySequence += key;
  if (keySequence.length > 10) {
    keySequence = keySequence.slice(-10);
  }

  sequenceTimeout = setTimeout(() => {
    keySequence = "";
  }, 2000);

  return keySequence;
}

export function checkEasterEggSequence(sequence: string): boolean {
  const easterEggs = ["konami", "secret", "power"];

  for (const egg of easterEggs) {
    if (keySequence.toLowerCase().includes(egg)) {
      keySequence = "";
      return true;
    }
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface ShortcutPolishConfig {
  audioEnabled: boolean;
  hapticEnabled: boolean;
  visualFeedback: boolean;
  announceShortcuts: boolean;
}

let config: ShortcutPolishConfig = {
  audioEnabled: true,
  hapticEnabled: true,
  visualFeedback: true,
  announceShortcuts: true,
};

export function configureShortcutPolish(updates: Partial<ShortcutPolishConfig>): void {
  config = { ...config, ...updates };
  feedbackManager.setAudioEnabled(config.audioEnabled);
  feedbackManager.setHapticEnabled(config.hapticEnabled);
  feedbackManager.setVisualEnabled(config.visualFeedback);
}

export function getShortcutPolishConfig(): ShortcutPolishConfig {
  return { ...config };
}

// ─────────────────────────────────────────────────────────────────────────────
// Export bundle
// ─────────────────────────────────────────────────────────────────────────────

export const shortcutPolish = {
  announce: announceWithFeedback,
  focus: focusWithPolish,
  execute: executeShortcutWithFeedback,
  configure: configureShortcutPolish,
  getConfig: getShortcutPolishConfig,
  trackKey: trackKeySequence,
  checkEasterEgg: checkEasterEggSequence,
};
