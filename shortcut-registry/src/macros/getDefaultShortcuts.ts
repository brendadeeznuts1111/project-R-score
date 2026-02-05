/**
 * Bun Macro: Get default shortcuts at bundle-time
 * 
 * This macro reads the default shortcuts from seeds.ts and returns them
 * as a static object that gets inlined into the bundle.
 * 
 * @example
 * ```ts
 * import { getDefaultShortcuts } from './macros/getDefaultShortcuts.ts' with { type: 'macro' };
 * 
 * const shortcuts = getDefaultShortcuts();
 * console.log(`Loaded ${shortcuts.length} default shortcuts`);
 * ```
 */

import type { ShortcutConfig } from '../types';
import { defaultShortcuts } from './shortcuts-data';

/**
 * Macro function that returns default shortcuts at bundle-time
 */
export function getDefaultShortcuts(): ShortcutConfig[] {
  return defaultShortcuts;
}

/**
 * Get shortcuts by category at bundle-time
 */
export function getShortcutsByCategory(category: string): ShortcutConfig[] {
  return defaultShortcuts.filter(s => s.category === category);
}

/**
 * Get shortcut IDs as a string array at bundle-time
 */
export function getShortcutIds(): string[] {
  return defaultShortcuts.map(s => s.id);
}
