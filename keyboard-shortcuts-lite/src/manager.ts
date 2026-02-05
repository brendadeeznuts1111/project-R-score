import type { ShortcutOptions, ShortcutCallback, ShortcutRegistration } from './types.js';
import { isUserTyping, hasModifier, announceToScreenReader } from './focus-utils.js';

/**
 * High-performance keyboard shortcut manager with Bun optimization
 */
export class KeyboardShortcutManager {
  private shortcuts = new Map<string, ShortcutRegistration>();
  private boundHandler: (e: KeyboardEvent) => void;
  private isInitialized = false;
  private enabled = true;
  private lastExecutionTime = new Map<string, number>();

  constructor() {
    this.boundHandler = this.handleKeydown.bind(this);
  }

  /**
   * Register a keyboard shortcut
   */
  register(key: string, callback: ShortcutCallback, options: ShortcutOptions = {}): void {
    const registration: ShortcutRegistration = {
      key: key.toLowerCase(),
      callback,
      options: { requireModifier: true, ...options }
    };
    
    this.shortcuts.set(registration.key, registration);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(key: string): boolean {
    return this.shortcuts.delete(key.toLowerCase());
  }

  /**
   * Check if a shortcut is registered
   */
  has(key: string): boolean {
    return this.shortcuts.has(key.toLowerCase());
  }

  /**
   * Get all registered shortcuts
   */
  getAll(): ShortcutRegistration[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Enable or disable all shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Initialize the shortcut manager
   */
  init(): void {
    if (this.isInitialized) return;
    document.addEventListener('keydown', this.boundHandler);
    this.isInitialized = true;
  }

  /**
   * Destroy the shortcut manager and clean up
   */
  destroy(): void {
    document.removeEventListener('keydown', this.boundHandler);
    this.isInitialized = false;
    this.shortcuts.clear();
    this.lastExecutionTime.clear();
  }

  /**
   * Handle keyboard events
   */
  private handleKeydown(e: KeyboardEvent): void {
    if (!this.enabled) return;

    // Respect user typing context
    if (isUserTyping() && !hasModifier(e)) return;

    const shortcut = this.shortcuts.get(e.key.toLowerCase());
    if (!shortcut) return;

    // Check modifier requirement
    if (shortcut.options.requireModifier && !hasModifier(e)) return;

    // Debounce rapid execution (500ms throttle)
    const now = Date.now();
    const lastTime = this.lastExecutionTime.get(shortcut.key) || 0;
    if (now - lastTime < 500) return;
    
    this.lastExecutionTime.set(shortcut.key, now);
    
    e.preventDefault();
    
    // Execute callback with error handling
    try {
      const result = shortcut.callback();
      
      // Handle async callbacks
      if (result instanceof Promise) {
        result.catch(error => {
          console.error('Keyboard shortcut callback failed:', error);
          announceToScreenReader('Action failed');
        });
      }
    } catch (error) {
      console.error('Keyboard shortcut callback failed:', error);
      announceToScreenReader('Action failed');
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      registeredShortcuts: this.shortcuts.size,
      isInitialized: this.isInitialized,
      enabled: this.enabled,
      lastExecutions: Object.fromEntries(this.lastExecutionTime)
    };
  }
}
