// lib/polish/feedback/haptic.ts - Haptic Feedback (navigator.vibrate)
// ═══════════════════════════════════════════════════════════════════════════════

import { Runtime } from "../core/runtime.ts";
import type { HapticPattern } from "../types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Vibration Patterns (ms)
// ─────────────────────────────────────────────────────────────────────────────

const HAPTIC_PATTERNS: Record<HapticPattern, number[]> = {
  light: [10],
  medium: [30],
  heavy: [50],
  double: [20, 50, 20],
  success: [10, 50, 30],
  error: [50, 50, 50, 50, 100],
};

// ─────────────────────────────────────────────────────────────────────────────
// Haptic Manager
// ─────────────────────────────────────────────────────────────────────────────

class HapticManager {
  private enabled = true;

  isSupported(): boolean {
    return Runtime.supportsHaptic;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  trigger(pattern: HapticPattern): boolean {
    if (!this.enabled || !this.isSupported()) return false;

    try {
      const vibrationPattern = HAPTIC_PATTERNS[pattern];
      return navigator.vibrate(vibrationPattern);
    } catch {
      return false;
    }
  }

  triggerCustom(pattern: number[]): boolean {
    if (!this.enabled || !this.isSupported()) return false;

    try {
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }

  stop(): void {
    if (this.isSupported()) {
      try {
        navigator.vibrate(0);
      } catch {
        // Ignore errors
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Instance
// ─────────────────────────────────────────────────────────────────────────────

export const hapticManager = new HapticManager();

// ─────────────────────────────────────────────────────────────────────────────
// Convenience Functions
// ─────────────────────────────────────────────────────────────────────────────

export function triggerHaptic(pattern: HapticPattern): boolean {
  return hapticManager.trigger(pattern);
}

export function setHapticEnabled(enabled: boolean): void {
  hapticManager.setEnabled(enabled);
}

export function isHapticSupported(): boolean {
  return hapticManager.isSupported();
}
