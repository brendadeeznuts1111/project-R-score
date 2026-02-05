/**
 * Unit tests for ShortcutRegistry
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { ShortcutRegistry } from '../../src/core/registry';
import type { ShortcutConfig } from '../../src/types';
import { testShortcuts, createTestShortcut } from '../fixtures/test-data';

describe('ShortcutRegistry', () => {
  let registry: ShortcutRegistry;

  beforeEach(() => {
    registry = new ShortcutRegistry();
  });

  test('should register a shortcut', () => {
    const shortcut = createTestShortcut({ id: 'test.register' });
    
    expect(() => registry.register(shortcut)).not.toThrow();
    expect(registry.getShortcutCount()).toBeGreaterThan(0);
  });

  test('should unregister a shortcut', () => {
    const shortcut = createTestShortcut({ id: 'test.unregister' });
    registry.register(shortcut);
    
    const initialCount = registry.getShortcutCount();
    registry.unregister('test.unregister');
    
    expect(registry.getShortcutCount()).toBeLessThan(initialCount);
  });

  test('should create a profile', () => {
    const profile = registry.createProfile('Test Profile', 'Test description');
    
    expect(profile).toBeDefined();
    expect(profile.id).toBeDefined();
    expect(profile.name).toBe('Test Profile');
    expect(registry.getProfileCount()).toBeGreaterThan(0);
  });

  test('should set active profile', () => {
    const profile = registry.createProfile('Test Profile', 'Test description');
    
    expect(() => registry.setActiveProfile(profile.id)).not.toThrow();
    expect(registry.getActiveProfile().id).toBe(profile.id);
  });

  test('should detect conflicts', () => {
    const shortcut1 = createTestShortcut({ id: 'test.conflict1', default: { primary: 'Ctrl+S' } });
    const shortcut2 = createTestShortcut({ id: 'test.conflict2', default: { primary: 'Ctrl+S' } });
    
    registry.register(shortcut1);
    registry.register(shortcut2);
    
    const conflicts = registry.detectConflicts();
    expect(conflicts.length).toBeGreaterThan(0);
  });

  test('should get effective key for platform', () => {
    const shortcut = createTestShortcut({
      id: 'test.platform',
      default: {
        primary: 'Ctrl+S',
        macOS: 'Cmd+S'
      }
    });
    
    registry.register(shortcut);
    const platform = registry.getPlatform();
    const effectiveKey = registry.getEffectiveKey(shortcut);
    
    expect(effectiveKey).toBeDefined();
    if (platform === 'macOS') {
      expect(effectiveKey).toBe('Cmd+S');
    } else {
      expect(effectiveKey).toBe('Ctrl+S');
    }
  });
});
