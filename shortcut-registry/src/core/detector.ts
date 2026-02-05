import type {
  ShortcutConfig,
  ShortcutConflict,
  Platform
} from '../types';

/**
 * Detects conflicts between keyboard shortcuts
 */
export class ShortcutConflictDetector {
  /**
   * Detect all conflicts in a set of shortcuts for a given profile
   */
  detectConflicts(
    shortcuts: Map<string, ShortcutConfig>,
    profileId: string,
    platform: Platform,
    getEffectiveKey: (config: ShortcutConfig, profileId?: string) => string
  ): ShortcutConflict[] {
    const conflicts: ShortcutConflict[] = [];
    const keyMap = new Map<string, string[]>(); // key -> shortcut IDs

    // Build a map of effective keys to shortcut IDs
    for (const [shortcutId, config] of shortcuts.entries()) {
      if (!config.enabled) continue;

      const effectiveKey = getEffectiveKey(config, profileId);
      const normalizedKey = this.normalizeKey(effectiveKey);

      if (!keyMap.has(normalizedKey)) {
        keyMap.set(normalizedKey, []);
      }
      keyMap.get(normalizedKey)!.push(shortcutId);
    }

    // Find conflicts (keys with multiple shortcuts)
    for (const [key, shortcutIds] of keyMap.entries()) {
      if (shortcutIds.length > 1) {
        // Determine severity based on scope
        const severity = this.determineSeverity(shortcuts, shortcutIds);
        
        conflicts.push({
          key: this.denormalizeKey(key),
          actions: shortcutIds,
          severity,
          profileId
        });
      }
    }

    return conflicts;
  }

  /**
   * Check if two key combinations conflict
   */
  conflicts(key1: string, key2: string): boolean {
    return this.normalizeKey(key1) === this.normalizeKey(key2);
  }

  /**
   * Normalize a key combination for comparison
   */
  private normalizeKey(key: string): string {
    return key
      .toLowerCase()
      .replace(/ctrl/g, 'control')
      .replace(/cmd/g, 'meta')
      .replace(/opt/g, 'alt')
      .replace(/option/g, 'alt')
      .replace(/\s+/g, '')
      .split('+')
      .sort()
      .join('+');
  }

  /**
   * Denormalize a key back to a readable format
   */
  private denormalizeKey(key: string): string {
    // Try to restore a more readable format
    return key
      .split('+')
      .map(k => {
        if (k === 'control') return 'Ctrl';
        if (k === 'meta') return 'Cmd';
        if (k === 'alt') return 'Alt';
        return k.charAt(0).toUpperCase() + k.slice(1);
      })
      .join('+');
  }

  /**
   * Determine conflict severity based on shortcut scopes and importance
   */
  private determineSeverity(
    shortcuts: Map<string, ShortcutConfig>,
    shortcutIds: string[]
  ): 'low' | 'medium' | 'high' {
    const configs = shortcutIds.map(id => shortcuts.get(id)).filter(Boolean) as ShortcutConfig[];
    
    // High severity: multiple global shortcuts
    const globalCount = configs.filter(c => c.scope === 'global').length;
    if (globalCount > 1) {
      return 'high';
    }

    // Medium severity: global + panel/component conflicts
    if (globalCount === 1 && configs.length > 1) {
      return 'medium';
    }

    // Low severity: only panel/component conflicts
    return 'low';
  }

  /**
   * Find alternative keys that don't conflict
   */
  suggestAlternatives(
    currentKey: string,
    usedKeys: Set<string>,
    platform: Platform
  ): string[] {
    const alternatives: string[] = [];
    const parts = currentKey.split('+');
    const mainKey = parts[parts.length - 1];
    const modifiers = parts.slice(0, -1);

    // Try different modifier combinations
    const modifierSets = [
      ['Ctrl', 'Shift'],
      ['Alt'],
      ['Ctrl', 'Alt'],
      ['Shift'],
      ['Ctrl', 'Shift', 'Alt']
    ];

    for (const modSet of modifierSets) {
      const candidate = [...modSet, mainKey].join('+');
      const normalized = this.normalizeKey(candidate);
      
      if (!usedKeys.has(normalized)) {
        alternatives.push(candidate);
      }
    }

    // Platform-specific suggestions
    if (platform === 'macOS') {
      const cmdAlt = ['Cmd', 'Alt', mainKey].join('+');
      if (!usedKeys.has(this.normalizeKey(cmdAlt))) {
        alternatives.push(cmdAlt);
      }
    }

    return alternatives.slice(0, 5); // Return top 5 suggestions
  }
}
