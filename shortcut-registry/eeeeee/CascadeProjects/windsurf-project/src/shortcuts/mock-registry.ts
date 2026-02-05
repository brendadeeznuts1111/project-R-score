/**
 * Mock ShortcutRegistry for testing purposes
 * Provides a mock implementation when the external dependency is not available
 */

import type { ShortcutConfig } from './registry';

// Event interface for shortcut triggers
interface ShortcutEvent {
  shortcutId: string;
  data?: unknown;
}

// Profile interface for better typing
interface Profile {
  id: string;
  name: string;
  description: string;
  shortcuts: string[];
  createdAt?: string;
}

// Usage statistics interface
interface UsageStatistics {
  totalUsage: number;
  dailyStats: never[];
  topShortcuts: never[];
  period: string;
}

export class MockShortcutRegistry {
  private shortcuts: Map<string, ShortcutConfig> = new Map();
  private profiles: Map<string, Profile> = new Map();
  private activeProfileId: string | null = null;
  private eventListeners: Map<string, ((event: ShortcutEvent) => void)[]> = new Map();

  constructor() {
    // Initialize with some default shortcuts
    const defaultShortcuts: ShortcutConfig[] = [
      {
        id: 'test.shortcut',
        action: 'test',
        description: 'Test shortcut',
        category: 'test',
        default: { primary: 'Ctrl+T' },
        enabled: true,
        scope: 'global'
      }
    ];

    defaultShortcuts.forEach(shortcut => {
      this.shortcuts.set(shortcut.id, shortcut);
    });

    // Create default profile
    this.profiles.set('default', {
      id: 'default',
      name: 'Default Profile',
      description: 'Default shortcut profile',
      shortcuts: Array.from(this.shortcuts.keys())
    });
    this.activeProfileId = 'default';
  }

  register(config: ShortcutConfig): void {
    this.shortcuts.set(config.id, config);
  }

  unregister(id: string): void {
    this.shortcuts.delete(id);
  }

  getAllShortcuts(): ShortcutConfig[] {
    return Array.from(this.shortcuts.values());
  }

  getAllProfiles(): Profile[] {
    return Array.from(this.profiles.values());
  }

  getActiveProfile(): Profile | null {
    return this.activeProfileId ? this.profiles.get(this.activeProfileId) || null : null;
  }

  createProfile(name: string, description: string, basedOn?: string): Profile {
    const profile: Profile = {
      id: `profile_${Date.now()}`,
      name,
      description,
      shortcuts: basedOn ? this.profiles.get(basedOn)?.shortcuts || [] : [],
      createdAt: new Date().toISOString()
    };
    this.profiles.set(profile.id, profile);
    return profile;
  }

  setActiveProfile(profileId: string): void {
    if (this.profiles.has(profileId)) {
      this.activeProfileId = profileId;
    }
  }

  detectConflicts(): unknown[] {
    // Mock implementation - return empty conflicts array
    return [];
  }

  getUsageStatistics(days: number = 30): UsageStatistics {
    return {
      totalUsage: 0,
      dailyStats: [],
      topShortcuts: [],
      period: `${days} days`
    };
  }

  on(event: string, callback: (event: ShortcutEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.push(callback);
    }
  }

  getShortcutByKey(key: string): ShortcutConfig | null {
    // Simple mock implementation - find by primary key
    const shortcuts = Array.from(this.shortcuts.values());
    for (const shortcut of shortcuts) {
      if (shortcut.default.primary === key) {
        return shortcut;
      }
    }
    return null;
  }

  trigger(shortcutId: string): void {
    const shortcut = this.shortcuts.get(shortcutId);
    if (shortcut) {
      const event: ShortcutEvent = { shortcutId };
      const listeners = this.eventListeners.get('shortcut:triggered') || [];
      listeners.forEach(callback => {
        callback(event);
      });
    }
  }
}

// Export either the real ShortcutRegistry or mock based on availability
let ShortcutRegistryClass: typeof MockShortcutRegistry;

try {
  // Try to import the real ShortcutRegistry
  ShortcutRegistryClass = require('../../../../wind/src/core/registry').ShortcutRegistry;
} catch {
  // Fall back to mock implementation
  ShortcutRegistryClass = MockShortcutRegistry;
}

export { ShortcutRegistryClass as ShortcutRegistry };
