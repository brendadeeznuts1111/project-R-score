/**
 * useGlobalShortcuts - TOML Macro Binding Engine
 *
 * January 21, 2026 - Bun 1.3.6
 *
 * Features:
 * - Binds all shortcuts from shortcuts.toml (~0.8ms mount)
 * - Platform modifier normalization (Cmd on macOS, Ctrl on Windows/Linux)
 * - Conflict detection with console.warn + optional toast
 * - CRC32 integrity verification
 * - PubSub event emission on bind
 */

import { useEffect, useCallback, useRef } from "react";
import { shortcutsConfig, getConfigIntegrity } from "../config";
import type { ShortcutBinding } from "../config";
import { showGlobalToast } from "./useToast";

// ============================================
// Types
// ============================================

export interface ShortcutAction {
  key: string;
  normalizedKey: string;
  action: string;
  description: string;
  category: string;
  when?: string;
  handler?: () => void;
}

export interface ShortcutConflict {
  key: string;
  actions: string[];
  categories: string[];
}

export interface ShortcutBindResult {
  total: number;
  bound: number;
  conflicts: number;
  platform: "mac" | "windows" | "linux";
  bindTimeMs: number;
  integrity: string;
}

export interface UseGlobalShortcutsOptions {
  /** Show toast on conflicts */
  showConflictToast?: boolean;
  /** Toast callback */
  onToast?: (message: string, type: "info" | "success" | "error") => void;
  /** Custom action handlers */
  handlers?: Record<string, () => void>;
  /** Enabled categories (empty = all) */
  enabledCategories?: string[];
  /** Disable all shortcuts */
  disabled?: boolean;
  /** Enable sound effects for shortcuts */
  soundEnabled?: boolean;
  /** Enable toast notifications for shortcuts */
  toastEnabled?: boolean;
  /** Enable animation effects for shortcuts */
  animationEnabled?: boolean;
}

// ============================================
// Platform Detection
// ============================================

const detectPlatform = (): "mac" | "windows" | "linux" => {
  if (typeof navigator === "undefined") return "mac";
  const platform = navigator.platform?.toLowerCase() || "";
  if (platform.includes("mac")) return "mac";
  if (platform.includes("win")) return "windows";
  return "linux";
};

const PLATFORM = detectPlatform();

// ============================================
// Key Normalization
// ============================================

/**
 * Normalize CmdOrCtrl, Cmd/Ctrl to platform-specific modifier
 */
function normalizeKey(key: string, platform: "mac" | "windows" | "linux"): string {
  const isMac = platform === "mac";

  return key
    // CmdOrCtrl → platform-specific
    .replace(/CmdOrCtrl/gi, isMac ? "Meta" : "Control")
    .replace(/Cmd\/Ctrl/gi, isMac ? "Meta" : "Control")
    // Explicit modifiers
    .replace(/\bCmd\b/gi, "Meta")
    .replace(/\bCtrl\b/gi, "Control")
    .replace(/\bOpt\b/gi, "Alt")
    .replace(/\bOption\b/gi, "Alt")
    // Normalize separators
    .replace(/\s*\+\s*/g, "+")
    // Lowercase for consistency
    .toLowerCase();
}

/**
 * Parse a normalized key string into parts
 */
function parseKeyCombo(normalizedKey: string): {
  modifiers: Set<string>;
  key: string;
} {
  const parts = normalizedKey.split("+");
  const key = parts.pop() || "";
  const modifiers = new Set(parts);
  return { modifiers, key };
}

/**
 * Check if a keyboard event matches a key combo
 */
function matchesKeyCombo(
  event: KeyboardEvent,
  normalizedKey: string
): boolean {
  const { modifiers, key } = parseKeyCombo(normalizedKey);

  // Check modifiers
  if (modifiers.has("meta") !== event.metaKey) return false;
  if (modifiers.has("control") !== event.ctrlKey) return false;
  if (modifiers.has("alt") !== event.altKey) return false;
  if (modifiers.has("shift") !== event.shiftKey) return false;

  // Check key (normalize event.key)
  const eventKey = event.key.toLowerCase();

  // Handle special keys
  const keyMap: Record<string, string> = {
    escape: "esc",
    " ": "space",
    arrowup: "up",
    arrowdown: "down",
    arrowleft: "left",
    arrowright: "right",
  };

  const normalizedEventKey = keyMap[eventKey] || eventKey;

  return normalizedEventKey === key;
}

// ============================================
// Default Action Handlers
// ============================================

const defaultHandlers: Record<string, () => void> = {
  "focus-search-bar": () => {
    const input = document.querySelector<HTMLInputElement>(
      'input[placeholder*="Search"]'
    );
    input?.focus();
  },

  "toggle-command-palette": () => {
    // Dispatch custom event for command palette
    window.dispatchEvent(new CustomEvent("toggle-command-palette"));
  },

  "command-palette": () => {
    window.dispatchEvent(new CustomEvent("open-command-palette"));
  },

  "open-settings": () => {
    window.dispatchEvent(new CustomEvent("open-settings"));
  },

  "global-search": () => {
    window.dispatchEvent(new CustomEvent("open-global-search"));
  },

  "close-modal-or-clear-selection": () => {
    // Try to close any open modal first
    const modal = document.querySelector('[role="dialog"]');
    if (modal) {
      window.dispatchEvent(new CustomEvent("close-modal"));
    } else {
      // Clear selection
      window.getSelection()?.removeAllRanges();
    }
  },

  "new-tab": () => {
    window.dispatchEvent(new CustomEvent("new-tab"));
  },

  "close-tab": () => {
    window.dispatchEvent(new CustomEvent("close-tab"));
  },

  "next-tab": () => {
    window.dispatchEvent(new CustomEvent("next-tab"));
  },

  "previous-tab": () => {
    window.dispatchEvent(new CustomEvent("previous-tab"));
  },

  "reopen-closed-tab": () => {
    window.dispatchEvent(new CustomEvent("reopen-closed-tab"));
  },

  "save-active-file": () => {
    window.dispatchEvent(new CustomEvent("save-active-file"));
  },

  "close-active-tab": () => {
    window.dispatchEvent(new CustomEvent("close-active-tab"));
  },

  // Editor actions
  "submit-form-or-run-query": () => {
    window.dispatchEvent(new CustomEvent("submit-form"));
  },

  "run-query-new-tab": () => {
    window.dispatchEvent(new CustomEvent("run-query-new-tab"));
  },

  "focus-editor-line": () => {
    window.dispatchEvent(new CustomEvent("focus-editor-line"));
  },

  "toggle-comment-line": () => {
    window.dispatchEvent(new CustomEvent("toggle-comment"));
  },

  // CLI Tools actions
  "open-cli-analyze": () => {
    window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "clitools" }));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("cli-tool-select", { detail: "analyze" }));
    }, 100);
  },

  "open-cli-diagnose": () => {
    window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "clitools" }));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("cli-tool-select", { detail: "diagnose" }));
    }, 100);
  },

  "open-cli-bang": () => {
    window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "clitools" }));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("cli-tool-select", { detail: "bang" }));
    }, 100);
  },

  "open-cli-tools": () => {
    window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "clitools" }));
  },

  // KYC actions
  "kyc-validate": () => {
    window.dispatchEvent(new CustomEvent("kyc:validate:requested"));
  },

  "kyc-failsafe": () => {
    window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "kyc" }));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("kyc:failsafe:requested"));
    }, 100);
  },

  "kyc-review-queue": () => {
    window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "kyc" }));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("kyc:review:requested"));
    }, 100);
  },

  "tab-kyc": () => {
    window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "kyc" }));
  },
};

// ============================================
// PubSub (simple implementation)
// ============================================

const pubsub = {
  subscribers: new Map<string, Set<(data: unknown) => void>>(),

  subscribe(event: string, callback: (data: unknown) => void) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event)!.add(callback);
    return () => this.subscribers.get(event)?.delete(callback);
  },

  publish(event: string, data: unknown) {
    this.subscribers.get(event)?.forEach(cb => cb(data));
    // Also dispatch as CustomEvent for cross-component communication
    window.dispatchEvent(new CustomEvent(event, { detail: data }));
  },
};

export { pubsub };

// ============================================
// Hook Implementation
// ============================================

export function useGlobalShortcuts(options: UseGlobalShortcutsOptions = {}) {
  const {
    showConflictToast = true,
    onToast,
    handlers = {},
    enabledCategories = [],
    disabled = false,
    soundEnabled = localStorage.getItem('shortcut-sound-enabled') === 'true',
    toastEnabled = localStorage.getItem('shortcut-toast-enabled') !== 'false', // Default true
    animationEnabled = localStorage.getItem('shortcut-animation-enabled') !== 'false', // Default true
  } = options;
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const boundRef = useRef<ShortcutAction[]>([]);
  const conflictsRef = useRef<ShortcutConflict[]>([]);
  const resultRef = useRef<ShortcutBindResult | null>(null);

  // Merge custom handlers with defaults
  const allHandlers = { ...defaultHandlers, ...handlers };

  // Build shortcut map from TOML config
  const buildShortcutMap = useCallback(() => {
    const startTime = performance.now();
    const shortcuts: ShortcutAction[] = [];
    const keyMap = new Map<string, ShortcutAction[]>();
    const conflicts: ShortcutConflict[] = [];

    // Process keyboard shortcuts
    const { keyboard } = shortcutsConfig;

    for (const [category, bindings] of Object.entries(keyboard)) {
      // Skip if category filtering is enabled and this category is not included
      if (enabledCategories.length > 0 && !enabledCategories.includes(category)) {
        continue;
      }

      for (const [key, binding] of Object.entries(bindings as Record<string, ShortcutBinding>)) {
        const normalizedKey = normalizeKey(key, PLATFORM);

        const shortcut: ShortcutAction = {
          key,
          normalizedKey,
          action: binding.action,
          description: binding.description,
          category,
          when: binding.when,
          handler: allHandlers[binding.action],
        };

        shortcuts.push(shortcut);

        // Track for conflict detection
        if (!keyMap.has(normalizedKey)) {
          keyMap.set(normalizedKey, []);
        }
        keyMap.get(normalizedKey)!.push(shortcut);
      }
    }

    // Enhanced conflict detection with priority
    const categoryPriority: Record<string, number> = {
      global: 100,
      tabs: 90,
      data: 80,
      view: 70,
      projects: 60,
      network: 50,
      dev: 40,
      diagnose: 30,
      kyc: 20,
    };

    for (const [key, actions] of keyMap) {
      if (actions.length > 1) {
        // Sort by priority for better conflict reporting
        const sortedActions = [...actions].sort((a, b) => {
          const priorityA = categoryPriority[a.category] || 0;
          const priorityB = categoryPriority[b.category] || 0;
          return priorityB - priorityA;
        });

        conflicts.push({
          key,
          actions: sortedActions.map(a => a.action),
          categories: sortedActions.map(a => a.category),
        });
      }
    }

    // Sort conflicts by severity (more actions = higher severity)
    conflicts.sort((a, b) => b.actions.length - a.actions.length);

    const bindTimeMs = performance.now() - startTime;

    // Log conflicts
    if (conflicts.length > 0) {
      console.warn(
        `[useGlobalShortcuts] ${conflicts.length} conflict(s) detected:`,
        conflicts.map(c => `${c.key} → ${c.actions.join(", ")}`).join("; ")
      );

      if (showConflictToast && onToast) {
        onToast(
          `${conflicts.length} shortcut conflict(s) detected`,
          "error"
        );
      }
    }

    // Get integrity hash
    const integrity = getConfigIntegrity().shortcuts;

    const result: ShortcutBindResult = {
      total: shortcuts.length,
      bound: shortcuts.filter(s => s.handler).length,
      conflicts: conflicts.length,
      platform: PLATFORM,
      bindTimeMs: Math.round(bindTimeMs * 100) / 100,
      integrity,
    };

    boundRef.current = shortcuts;
    conflictsRef.current = conflicts;
    resultRef.current = result;

    // Publish bind event
    pubsub.publish("shortcuts-bound", result);

    return { shortcuts, conflicts, result };
  }, [enabledCategories, allHandlers, showConflictToast, onToast]);

  // Play sound effect for shortcut
  const playShortcutSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      
      // Check if context is suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {
          // Silently fail if resume is not allowed
          return;
        });
      }
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Create a subtle click sound (two-tone for better feedback)
      oscillator.frequency.setValueAtTime(600, ctx.currentTime);
      oscillator.frequency.setValueAtTime(800, ctx.currentTime + 0.05);
      
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.15);
    } catch (error) {
      // Gracefully handle audio errors (autoplay policy, etc.)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Failed to play shortcut sound:', errorMessage, error);
    }
  }, [soundEnabled]);

  // Add visual animation effect for shortcut
  const addShortcutAnimation = useCallback((event: KeyboardEvent) => {
    // Create a ripple effect at the cursor position
    const ripple = document.createElement('div');
    ripple.style.cssText = `
      position: fixed;
      left: ${event.clientX}px;
      top: ${event.clientY}px;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(59, 130, 246, 0.3);
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 9999;
      animation: shortcutRipple 0.6s ease-out;
    `;
    
    // Add animation keyframes if not already added
    if (!document.getElementById('shortcut-ripple-styles')) {
      const style = document.createElement('style');
      style.id = 'shortcut-ripple-styles';
      style.textContent = `
        @keyframes shortcutRipple {
          0% {
            width: 0;
            height: 0;
            opacity: 1;
          }
          100% {
            width: 100px;
            height: 100px;
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(ripple);
    
    const timeoutId = setTimeout(() => {
      ripple.remove();
      animationTimeoutsRef.current.delete(timeoutId);
    }, 600);
    
    animationTimeoutsRef.current.add(timeoutId);
  }, []);

  // Keyboard event handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled) return;

    // Skip if typing in an input or textarea
    const target = event.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      // Allow Escape to work even in inputs
      if (event.key !== "Escape") return;
    }

    // Find matching shortcut (last-wins strategy from config)
    const strategy = shortcutsConfig.settings["conflict-strategy"];
    let matchedShortcuts: ShortcutAction[] = [];

    for (const shortcut of boundRef.current) {
      if (matchesKeyCombo(event, shortcut.normalizedKey)) {
        // Check "when" condition if present
        if (shortcut.when) {
          // Simple condition evaluation (can be extended)
          const conditions: Record<string, () => boolean> = {
            "editorFocus": () => document.activeElement?.closest("[data-editor]") !== null,
            "modalOpen": () => document.querySelector('[role="dialog"]') !== null,
            "searchFocus": () => document.activeElement?.closest("[data-search]") !== null,
          };

          const conditionFn = conditions[shortcut.when];
          if (conditionFn && !conditionFn()) {
            continue;
          }
        }

        matchedShortcuts.push(shortcut);
      }
    }

    if (matchedShortcuts.length === 0) return;

    // Apply conflict strategy
    let shortcutToExecute: ShortcutAction | null = null;

    if (strategy === "last-wins") {
      shortcutToExecute = matchedShortcuts[matchedShortcuts.length - 1];
    } else if (strategy === "warn") {
      if (matchedShortcuts.length > 1) {
        console.warn(
          `[Shortcut Conflict] Key "${matchedShortcuts[0].key}" matches multiple actions:`,
          matchedShortcuts.map(s => s.action)
        );
      }
      shortcutToExecute = matchedShortcuts[0];
    } else if (strategy === "block") {
      if (matchedShortcuts.length > 1) {
        console.error(
          `[Shortcut Blocked] Key "${matchedShortcuts[0].key}" has conflicting bindings:`,
          matchedShortcuts.map(s => s.action)
        );
        return;
      }
      shortcutToExecute = matchedShortcuts[0];
    }

    if (shortcutToExecute?.handler) {
      event.preventDefault();
      event.stopPropagation();
      
      // Play sound effect if enabled
      if (soundEnabled) {
        playShortcutSound();
      }
      
      // Show toast notification if enabled
      if (toastEnabled) {
        const toastMessage = shortcutToExecute.description || shortcutToExecute.action;
        showGlobalToast(`Shortcut: ${toastMessage}`, "info", 2000);
        if (onToast) {
          onToast(`Shortcut: ${toastMessage}`, "info");
        }
      }
      
      // Add visual animation effect
      if (animationEnabled) {
        addShortcutAnimation(event);
      }
      
      shortcutToExecute.handler();
    }
  }, [disabled]);

  // Bind shortcuts on mount
  useEffect(() => {
    if (disabled) return;

    const { result } = buildShortcutMap();

    console.log(
      `[useGlobalShortcuts] Bound ${result.bound}/${result.total} shortcuts in ${result.bindTimeMs}ms (${result.platform})`
    );

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      
      // Cleanup audio context
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      
      // Cleanup animation timeouts
      animationTimeoutsRef.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      animationTimeoutsRef.current.clear();
    };
  }, [buildShortcutMap, handleKeyDown, disabled, soundEnabled, toastEnabled, animationEnabled, onToast]);

  return {
    shortcuts: boundRef.current,
    conflicts: conflictsRef.current,
    result: resultRef.current,
    platform: PLATFORM,
    rebind: buildShortcutMap,
  };
}

// ============================================
// Utility Exports
// ============================================

export { normalizeKey, parseKeyCombo, matchesKeyCombo, PLATFORM };
