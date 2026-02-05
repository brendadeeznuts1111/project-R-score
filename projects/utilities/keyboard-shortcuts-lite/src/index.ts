// Main exports for the keyboard shortcuts library
export type { ShortcutOptions, FocusOptions, KeyboardShortcutConfig, ShortcutCallback, ShortcutRegistration } from './types.js';
export { KeyboardShortcutManager } from './manager.js';
export { focusWithFeedback, announceToScreenReader, isUserTyping, hasModifier } from './focus-utils.js';

// Default instance for quick usage
import { KeyboardShortcutManager } from './manager.js';
export const shortcuts = new KeyboardShortcutManager();

// Auto-initialize in browser environments
if (typeof window !== 'undefined') {
  shortcuts.init();
  
  // Auto-cleanup on page unload
  window.addEventListener('beforeunload', () => {
    shortcuts.destroy();
  });
}
