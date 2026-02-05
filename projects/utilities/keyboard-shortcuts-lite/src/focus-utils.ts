import type { ShortcutOptions, ShortcutCallback } from './types.js';

/**
 * Enhanced focus utility with visual feedback and accessibility
 */
export function focusWithFeedback(
  selector: string | HTMLElement,
  options: { selectText?: boolean; announce?: boolean; announceMessage?: string } = {}
): boolean {
  const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (!element) return false;

  const HTMLElement = element as HTMLElement;
  HTMLElement.focus();
  
  if (options.selectText !== false && 'select' in element) {
    (element as HTMLInputElement).select();
  }

  // Subtle blue glow animation
  HTMLElement.animate(
    [
      { boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5)' },
      { boxShadow: 'none' }
    ],
    { duration: 300, easing: 'ease-out' }
  );

  // Screen reader announcement if requested
  if (options.announce !== false) {
    announceToScreenReader(options.announceMessage || 'Element focused');
  }

  return true;
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(message: string): void {
  const announcer = document.createElement('div');
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', 'polite');
  announcer.className = 'sr-only';
  announcer.textContent = message;
  document.body.appendChild(announcer);
  setTimeout(() => announcer.remove(), 1000);
}

/**
 * Check if user is currently typing in a form element
 */
export function isUserTyping(): boolean {
  const activeTag = document.activeElement?.tagName.toLowerCase();
  return ['input', 'textarea', 'select'].includes(activeTag || '');
}

/**
 * Check if modifier key is pressed (Ctrl or Cmd)
 */
export function hasModifier(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey;
}
