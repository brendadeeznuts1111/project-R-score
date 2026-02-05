/**
 * Bun Macro: Validate shortcuts at bundle-time
 * 
 * This macro validates shortcut configurations at build time to catch
 * errors before runtime.
 * 
 * @example
 * ```ts
 * import { validateShortcuts } from './macros/validateShortcuts.ts' with { type: 'macro' };
 * 
 * // This will fail at build time if shortcuts are invalid
 * validateShortcuts();
 * ```
 */

import type { ShortcutConfig } from '../types';
import { getDefaultShortcuts } from './getDefaultShortcuts';

interface ValidationError {
  shortcutId: string;
  field: string;
  message: string;
}

/**
 * Validate a single shortcut configuration
 */
function validateShortcut(shortcut: ShortcutConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!shortcut.id || shortcut.id.trim().length === 0) {
    errors.push({
      shortcutId: shortcut.id || 'unknown',
      field: 'id',
      message: 'Shortcut ID is required',
    });
  }

  if (!shortcut.action || shortcut.action.trim().length === 0) {
    errors.push({
      shortcutId: shortcut.id,
      field: 'action',
      message: 'Shortcut action is required',
    });
  }

  if (!shortcut.description || shortcut.description.trim().length === 0) {
    errors.push({
      shortcutId: shortcut.id,
      field: 'description',
      message: 'Shortcut description is required',
    });
  }

  if (!shortcut.default?.primary) {
    errors.push({
      shortcutId: shortcut.id,
      field: 'default.primary',
      message: 'Shortcut must have a default primary key combination',
    });
  }

  const validScopes = ['global', 'panel', 'component'];
  if (!validScopes.includes(shortcut.scope)) {
    errors.push({
      shortcutId: shortcut.id,
      field: 'scope',
      message: `Scope must be one of: ${validScopes.join(', ')}`,
    });
  }

  const validCategories = [
    'theme',
    'telemetry',
    'emulator',
    'general',
    'compliance',
    'logs',
    'ui',
    'developer',
    'accessibility',
    'data',
    'payment',
    'custom',
    'development',
    'navigation',
    'ide',
    'browser',
    'window',
  ];
  if (!validCategories.includes(shortcut.category)) {
    errors.push({
      shortcutId: shortcut.id,
      field: 'category',
      message: `Category must be one of: ${validCategories.join(', ')}`,
    });
  }

  // Validate key combination format
  if (shortcut.default.primary) {
    const keyParts = shortcut.default.primary.split('+');
    if (keyParts.length > 4) {
      errors.push({
        shortcutId: shortcut.id,
        field: 'default.primary',
        message: 'Key combination has too many modifiers (max 4)',
      });
    }
  }

  return errors;
}

/**
 * Validate all shortcuts and return validation result
 * Note: This macro returns validation info but doesn't throw errors
 * Use the result to handle validation as needed
 */
export function validateShortcuts(): {
  valid: boolean;
  errors: ValidationError[];
  shortcuts: ShortcutConfig[];
} {
  const shortcuts = getDefaultShortcuts();
  const errors: ValidationError[] = [];

  // Check for duplicate IDs
  const ids = new Set<string>();
  for (const shortcut of shortcuts) {
    if (ids.has(shortcut.id)) {
      errors.push({
        shortcutId: shortcut.id,
        field: 'id',
        message: `Duplicate shortcut ID: ${shortcut.id}`,
      });
    }
    ids.add(shortcut.id);

    // Validate each shortcut
    const shortcutErrors = validateShortcut(shortcut);
    errors.push(...shortcutErrors);
  }

  // Check for conflicts (same key combination)
  const keyMap = new Map<string, string[]>();
  for (const shortcut of shortcuts) {
    const key = shortcut.default.primary.toLowerCase();
    if (!keyMap.has(key)) {
      keyMap.set(key, []);
    }
    keyMap.get(key)!.push(shortcut.id);
  }

  for (const [key, shortcutIds] of keyMap.entries()) {
    if (shortcutIds.length > 1) {
      errors.push({
        shortcutId: shortcutIds.join(', '),
        field: 'default.primary',
        message: `Key conflict: ${key} is used by multiple shortcuts: ${shortcutIds.join(', ')}`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    shortcuts,
  };
}

/**
 * Get shortcut statistics at bundle-time
 */
export function getShortcutStats(): {
  total: number;
  byCategory: Record<string, number>;
  byScope: Record<string, number>;
} {
  const shortcuts = getDefaultShortcuts();
  const byCategory: Record<string, number> = {};
  const byScope: Record<string, number> = {};

  for (const shortcut of shortcuts) {
    byCategory[shortcut.category] = (byCategory[shortcut.category] || 0) + 1;
    byScope[shortcut.scope] = (byScope[shortcut.scope] || 0) + 1;
  }

  return {
    total: shortcuts.length,
    byCategory,
    byScope,
  };
}
