import type { ShortcutConfig, ShortcutConflict, ShortcutProfile } from '../types';

export class ShortcutConflictDetector {
  
  detectConflicts(
    shortcuts: Map<string, ShortcutConfig>, 
    profileId: string, 
    platform: 'windows' | 'macOS' | 'linux'
  ): ShortcutConflict[] {
    const conflicts: ShortcutConflict[] = [];
    const keyMap = new Map<string, string[]>(); // key -> [shortcutIds]
    
    // Group shortcuts by effective key
    for (const [shortcutId, config] of shortcuts.entries()) {
      if (!config.enabled) continue;
      
      const effectiveKey = this.getEffectiveKey(config, platform);
      if (!effectiveKey) continue;
      
      const normalizedKey = this.normalizeKey(effectiveKey);
      
      if (!keyMap.has(normalizedKey)) {
        keyMap.set(normalizedKey, []);
      }
      keyMap.get(normalizedKey)!.push(shortcutId);
    }
    
    // Find conflicts
    for (const [key, shortcutIds] of keyMap.entries()) {
      if (shortcutIds.length > 1) {
        const severity = this.calculateSeverity(shortcuts, shortcutIds);
        conflicts.push({
          key: this.denormalizeKey(key),
          actions: shortcutIds,
          severity
        });
      }
    }
    
    return conflicts.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }
  
  private getEffectiveKey(config: ShortcutConfig, platform: 'windows' | 'macOS' | 'linux'): string {
    switch (platform) {
      case 'macOS':
        return config.default.macOS || config.default.primary;
      case 'linux':
        return config.default.linux || config.default.primary;
      default:
        return config.default.primary;
    }
  }
  
  private normalizeKey(key: string): string {
    return key.toLowerCase()
      .replace(/\s+/g, '')
      .replace('ctrl', 'control')
      .replace('cmd', 'meta')
      .replace('command', 'meta')
      .replace('option', 'alt')
      .replace('opt', 'alt');
  }
  
  private denormalizeKey(key: string): string {
    return key.replace('control', 'Ctrl')
      .replace('meta', 'Cmd')
      .replace('alt', 'Alt')
      .replace('shift', 'Shift')
      .replace(/\+/g, ' + ');
  }
  
  private calculateSeverity(shortcuts: Map<string, ShortcutConfig>, shortcutIds: string[]): 'low' | 'medium' | 'high' {
    const globalCount = shortcutIds.filter(id => {
      const shortcut = shortcuts.get(id);
      return shortcut?.scope === 'global';
    }).length;
    
    if (globalCount === shortcutIds.length) {
      return 'high'; // All are global scope
    } else if (globalCount > 0) {
      return 'medium'; // Some are global scope
    } else {
      return 'low'; // None are global scope
    }
  }
  
  suggestResolution(conflict: ShortcutConflict, shortcuts: Map<string, ShortcutConfig>): string[] {
    const suggestions: string[] = [];
    const baseKey = conflict.key;
    
    for (const shortcutId of conflict.actions) {
      const shortcut = shortcuts.get(shortcutId);
      if (!shortcut) continue;
      
      // Suggest alternatives based on category and scope
      const alternatives = this.generateAlternatives(baseKey, shortcut);
      suggestions.push(...alternatives);
    }
    
    // Remove duplicates and check if suggestions are actually available
    return [...new Set(suggestions)].filter(suggestion => {
      return !this.isKeyTaken(suggestion, shortcuts, conflict.actions);
    });
  }
  
  private generateAlternatives(baseKey: string, shortcut: ShortcutConfig): string[] {
    const alternatives: string[] = [];
    const parts = baseKey.split(' + ');
    
    // Try different modifier combinations
    const modifiers = ['Ctrl', 'Alt', 'Shift', 'Cmd'];
    const currentModifiers = parts.filter(p => modifiers.includes(p));
    const currentKey = parts.find(p => !modifiers.includes(p));
    
    if (!currentKey) return alternatives;
    
    // Generate alternatives by changing modifiers
    for (const mod1 of modifiers) {
      if (!currentModifiers.includes(mod1)) {
        alternatives.push(`${mod1} + ${currentKey}`);
      }
      
      for (const mod2 of modifiers) {
        if (mod2 !== mod1 && !currentModifiers.includes(mod2)) {
          alternatives.push(`${mod1} + ${mod2} + ${currentKey}`);
        }
      }
    }
    
    // Try different keys with same modifiers
    const commonKeys = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
    const modifierStr = currentModifiers.join(' + ');
    
    for (const key of commonKeys) {
      if (key !== currentKey) {
        alternatives.push(`${modifierStr} + ${key}`);
      }
    }
    
    return alternatives.slice(0, 5); // Return top 5 suggestions
  }
  
  private isKeyTaken(key: string, shortcuts: Map<string, ShortcutConfig>, excludeIds: string[]): boolean {
    const normalizedKey = this.normalizeKey(key);
    
    for (const [shortcutId, config] of shortcuts.entries()) {
      if (excludeIds.includes(shortcutId) || !config.enabled) continue;
      
      const effectiveKey = this.getEffectiveKey(config, 'windows'); // Check all platforms
      if (this.normalizeKey(effectiveKey) === normalizedKey) {
        return true;
      }
    }
    
    return false;
  }
}
