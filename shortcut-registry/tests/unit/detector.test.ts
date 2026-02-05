/**
 * Unit tests for ShortcutConflictDetector
 */

import { describe, test, expect } from 'bun:test';
import { ShortcutConflictDetector } from '../../src/core/detector';
import type { ShortcutConfig, Platform } from '../../src/types';
import { testShortcuts } from '../fixtures/test-data';

describe('ShortcutConflictDetector', () => {
  const detector = new ShortcutConflictDetector();

  test('should detect conflicts between shortcuts', () => {
    const shortcuts = new Map<string, ShortcutConfig>();
    shortcuts.set('test.save', testShortcuts[0]);
    shortcuts.set('test.conflict', testShortcuts[2]);

    const getEffectiveKey = (config: ShortcutConfig) => config.default.primary;
    const conflicts = detector.detectConflicts(
      shortcuts,
      'test_profile',
      'windows',
      getEffectiveKey
    );

    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].key).toBe('Ctrl+S');
    expect(conflicts[0].actions).toContain('test.save');
    expect(conflicts[0].actions).toContain('test.conflict');
  });

  test('should not detect conflicts for different keys', () => {
    const shortcuts = new Map<string, ShortcutConfig>();
    shortcuts.set('test.save', testShortcuts[0]);
    shortcuts.set('test.open', testShortcuts[1]);

    const getEffectiveKey = (config: ShortcutConfig) => config.default.primary;
    const conflicts = detector.detectConflicts(
      shortcuts,
      'test_profile',
      'windows',
      getEffectiveKey
    );

    expect(conflicts.length).toBe(0);
  });

  test('should normalize keys correctly', () => {
    expect(detector.conflicts('Ctrl+S', 'ctrl+s')).toBe(true);
    expect(detector.conflicts('Ctrl+S', 'Cmd+S')).toBe(false);
    expect(detector.conflicts('Ctrl+Shift+S', 'Shift+Ctrl+S')).toBe(true);
  });

  test('should suggest alternatives', () => {
    const usedKeys = new Set(['ctrl+s', 'ctrl+o']);
    const alternatives = detector.suggestAlternatives('Ctrl+S', usedKeys, 'windows');

    expect(alternatives.length).toBeGreaterThan(0);
    expect(alternatives.every(alt => !usedKeys.has(alt.toLowerCase()))).toBe(true);
  });
});
