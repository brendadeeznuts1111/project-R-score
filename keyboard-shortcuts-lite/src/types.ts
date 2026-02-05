// TypeScript definitions for the keyboard shortcut library
export interface ShortcutOptions {
  /** Whether this shortcut requires Ctrl/Cmd modifier */
  requireModifier?: boolean;
  /** Custom description for accessibility */
  description?: string;
}

export interface FocusOptions {
  /** Whether to select text when focusing input */
  selectText?: boolean;
  /** Whether to announce to screen readers */
  announce?: boolean;
  /** Custom announcement message */
  announceMessage?: string;
}

export interface KeyboardShortcutConfig {
  /** Global enable/disable for all shortcuts */
  enabled?: boolean;
  /** Custom key mapping */
  keyMap?: Record<string, string>;
}

export type ShortcutCallback = () => void | Promise<void>;

export interface ShortcutRegistration {
  key: string;
  callback: ShortcutCallback;
  options: ShortcutOptions;
}
