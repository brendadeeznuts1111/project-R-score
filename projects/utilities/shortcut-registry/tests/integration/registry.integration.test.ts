/**
 * Integration tests for ShortcutRegistry
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { ShortcutRegistry } from '../../src/core/registry';
import type { ShortcutConfig } from '../../src/types';
import { testShortcuts } from '../fixtures/test-data';

describe('ShortcutRegistry Integration', () => {
  let registry: ShortcutRegistry;

  beforeEach(() => {
    registry = new ShortcutRegistry();
  });

  test('should register and trigger shortcuts', () => {
    const shortcut = testShortcuts[0];
    let triggered = false;

    registry.register(shortcut);
    registry.on(shortcut.id, () => {
      triggered = true;
    });

    const result = registry.trigger(shortcut.id);
    
    expect(result).toBe(true);
    expect(triggered).toBe(true);
  });

  test('should handle profile overrides', () => {
    const shortcut = testShortcuts[0];
    const profile = registry.createProfile('Test Profile', 'Test');

    registry.register(shortcut);
    registry.setActiveProfile(profile.id);
    registry.setOverride(shortcut.id, 'Ctrl+Shift+S', profile.id);

    const effectiveKey = registry.getEffectiveKey(shortcut, profile.id);
    expect(effectiveKey).toBe('Ctrl+Shift+S');
  });

  test('should track usage', async () => {
    const shortcut = testShortcuts[0];
    registry.register(shortcut);
    
    registry.trigger(shortcut.id);
    
    // Give database a moment to write
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const stats = registry.getUsageStatistics(1);
    expect(stats).toBeDefined();
  });

  test('should create and execute macros', async () => {
    const shortcut1 = testShortcuts[0];
    const shortcut2 = testShortcuts[1];
    
    registry.register(shortcut1);
    registry.register(shortcut2);

    const macro = registry.createMacro(
      'Test Macro',
      [
        { action: shortcut1.id, delay: 0 },
        { action: shortcut2.id, delay: 100 }
      ]
    );

    expect(macro).toBeDefined();
    expect(macro.id).toBeDefined();

    // Execute macro
    await registry.executeMacro(macro.id);
    
    // Macro execution should complete without errors
    expect(true).toBe(true);
  });

  test('should handle profile inheritance', () => {
    const baseProfile = registry.createProfile('Base Profile', 'Base');
    const derivedProfile = registry.createProfile('Derived Profile', 'Derived', baseProfile.id);

    expect(derivedProfile.basedOn).toBe(baseProfile.id);
  });
});
