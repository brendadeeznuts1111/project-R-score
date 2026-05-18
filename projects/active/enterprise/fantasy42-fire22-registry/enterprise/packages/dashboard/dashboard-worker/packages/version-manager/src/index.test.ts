/**
 * @fire22/version-manager Tests
 *
 * Comprehensive test suite using Bun test runner
 */

import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { VersionUtils, BunVersionManager, WorkspaceVersionManager } from './index';

describe('VersionUtils with Bun.semver', () => {
  test('should parse valid semver versions', () => {
    const versions = [
      '1.0.0',
      '2.1.3',
      '10.20.30',
      '1.1.2-prerelease+meta',
      '1.1.2+meta',
      '1.1.2+meta-valid',
      '1.0.0-alpha',
      '1.0.0-beta',
      '1.0.0-alpha.beta',
      '1.0.0-alpha.1',
      '1.0.0-alpha0.valid',
      '1.0.0-alpha.0valid',
      '1.0.0-alpha-a.b-c-somethinglong+metadata+meta',
      '1.0.0-rc.1+meta',
    ];

    for (const version of versions) {
      const parsed = VersionUtils.parse(version);
      expect(parsed.format()).toBe(version);
    }
  });

  test('should reject invalid semver versions', () => {
    const invalidVersions = [
      '',
      '1',
      '1.2',
      '1.2.3-0123',
      '1.2.3-0123.0123',
      '1.1.2+.123',
      '+invalid',
      '-invalid',
      'alpha',
      'alpha.beta',
      '1.2.3.DEV',
      '1.2-SNAPSHOT-123',
    ];

    for (const version of invalidVersions) {
      expect(() => VersionUtils.parse(version)).toThrow();
    }
  });

  test('should compare versions correctly', () => {
    const comparisons = [
      // [v1, v2, expected result]
      ['1.0.0', '2.0.0', -1], // v1 < v2
      ['2.0.0', '2.0.0', 0], // v1 = v2
      ['2.0.0', '1.0.0', 1], // v1 > v2
      ['2.0.0', '2.0.1', -1], // patch difference
      ['2.0.0', '2.1.0', -1], // minor difference
      ['2.0.0', '1.9.0', 1], // major vs minor
      ['1.0.0-alpha', '1.0.0', -1], // prerelease < release
      ['1.0.0-alpha', '1.0.0-alpha.1', -1], // prerelease ordering
      ['1.0.0-alpha.1', '1.0.0-alpha.beta', -1], // numeric vs string
      ['1.0.0-alpha.beta', '1.0.0-beta', -1], // alpha < beta
      ['1.0.0-beta', '1.0.0-beta.2', -1], // beta < beta.2
      ['1.0.0-beta.2', '1.0.0-beta.11', -1], // numeric ordering
      ['1.0.0-beta.11', '1.0.0-rc.1', -1], // beta < rc
      ['1.0.0-rc.1', '1.0.0', -1], // rc < release
    ];

    for (const [v1, v2, expected] of comparisons) {
      const result = VersionUtils.compare(v1, v2);
      if (expected > 0) {
        expect(result).toBeGreaterThan(0);
      } else if (expected < 0) {
        expect(result).toBeLessThan(0);
      } else {
        expect(result).toBe(0);
      }
    }
  });

  test('should check range satisfaction', () => {
    const ranges = [
      // [version, range, expected]
      ['1.0.0', '^1.0.0', true],
      ['1.0.1', '^1.0.0', true],
      ['1.1.0', '^1.0.0', true],
      ['2.0.0', '^1.0.0', false],
      ['1.0.0', '~1.0.0', true],
      ['1.0.1', '~1.0.0', true],
      ['1.1.0', '~1.0.0', false],
      ['1.2.3', '>=1.0.0', true],
      ['0.9.0', '>=1.0.0', false],
      ['1.2.3', '<=2.0.0', true],
      ['3.0.0', '<=2.0.0', false],
    ];

    for (const [version, range, expected] of ranges) {
      const result = VersionUtils.satisfies(version, range);
      expect(result).toBe(expected);
    }
  });

  test('should validate version format', () => {
    expect(VersionUtils.isValid('1.0.0')).toBe(true);
    expect(VersionUtils.isValid('1.0.0-alpha.1')).toBe(true);
    expect(VersionUtils.isValid('invalid')).toBe(false);
    expect(VersionUtils.isValid('1.2')).toBe(false);
    expect(VersionUtils.isValid('')).toBe(false);
  });

  test('should generate next version suggestions', () => {
    const current = '2.1.3';
    const suggestions = VersionUtils.getNextVersions(current);

    expect(suggestions.patch).toBe('2.1.4');
    expect(suggestions.minor).toBe('2.2.0');
    expect(suggestions.major).toBe('3.0.0');
    expect(suggestions.prerelease.alpha).toBe('2.1.3-alpha.0');
    expect(suggestions.prerelease.beta).toBe('2.1.3-beta.0');
    expect(suggestions.prerelease.rc).toBe('2.1.3-rc.0');
  });

  test('should sort versions correctly', () => {
    const unsorted = ['2.0.0', '1.0.0', '1.10.0', '1.2.0', '1.0.0-alpha'];

    const sortedAsc = VersionUtils.sort(unsorted, false);
    expect(sortedAsc).toEqual(['1.0.0-alpha', '1.0.0', '1.2.0', '1.10.0', '2.0.0']);

    const sortedDesc = VersionUtils.sort(unsorted, true);
    expect(sortedDesc).toEqual(['2.0.0', '1.10.0', '1.2.0', '1.0.0', '1.0.0-alpha']);
  });

  test('should filter versions by range', () => {
    const versions = ['1.0.0', '1.1.0', '2.0.0', '2.1.0', '3.0.0'];
    const filtered = VersionUtils.filterByRange(versions, '^2.0.0');
    expect(filtered).toEqual(['2.0.0', '2.1.0']);
  });
});

describe('BunVersionManager', () => {
  let manager: BunVersionManager;

  beforeEach(() => {
    manager = new BunVersionManager({
      current: '1.0.0',
      minimum: '1.0.0',
    });
  });

  afterEach(() => {
    // Clean up any test databases
    try {
      const { unlinkSync } = require('fs');
      unlinkSync('version-history.db');
    } catch {
      // Database might not exist
    }
  });

  test('should initialize with current version', () => {
    expect(manager.getCurrentVersion()).toBe('1.0.0');
  });

  test('should increment version correctly', () => {
    expect(manager.increment('patch')).toBe('1.0.1');
    expect(manager.increment('minor')).toBe('1.1.0');
    expect(manager.increment('major')).toBe('2.0.0');
  });

  test('should handle prerelease increments', () => {
    expect(manager.increment('prerelease', 'alpha')).toBe('1.0.0-alpha.0');
    expect(manager.increment('prerelease', 'beta')).toBe('1.0.0-beta.0');
    expect(manager.increment('prerelease', 'rc')).toBe('1.0.0-rc.0');
  });

  test('should compare versions using Bun.semver', () => {
    expect(manager.compare('2.0.0', '1.0.0')).toBeGreaterThan(0);
    expect(manager.compare('1.0.0', '2.0.0')).toBeLessThan(0);
    expect(manager.compare('1.0.0', '1.0.0')).toBe(0);
  });

  test('should check range satisfaction', () => {
    expect(manager.satisfies('1.5.0', '^1.0.0')).toBe(true);
    expect(manager.satisfies('2.0.0', '^1.0.0')).toBe(false);
    expect(manager.satisfies('1.0.5', '~1.0.0')).toBe(true);
  });

  test('should parse versions correctly', () => {
    const version = '1.2.3-beta.1+build.123';
    const parsed = manager.parseVersion(version);
    expect(parsed).toBe(version);
  });

  test('should get next version suggestions', () => {
    const suggestions = manager.getNextVersionSuggestions();

    expect(suggestions.patch).toBe('1.0.1');
    expect(suggestions.minor).toBe('1.1.0');
    expect(suggestions.major).toBe('2.0.0');
    expect(suggestions.prerelease.alpha).toBe('1.0.0-alpha.0');
    expect(suggestions.prerelease.beta).toBe('1.0.0-beta.0');
    expect(suggestions.prerelease.rc).toBe('1.0.0-rc.0');
  });

  test('should handle version bumping', async () => {
    const newVersion = await manager.bumpVersion('patch', {
      author: 'test-user',
      changes: ['Fix bug'],
      breaking: false,
      dryRun: false,
    });

    expect(newVersion).toBe('1.0.1');
    expect(manager.getCurrentVersion()).toBe('1.0.1');
  });

  test('should maintain version history', async () => {
    await manager.bumpVersion('patch', {
      author: 'test-user',
      changes: ['First change'],
      breaking: false,
      dryRun: false,
    });

    await manager.bumpVersion('minor', {
      author: 'test-user',
      changes: ['Second change'],
      breaking: false,
      dryRun: false,
    });

    const history = manager.getHistory(5);
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0].version).toBe('1.1.0'); // Most recent first
    expect(history[1].version).toBe('1.0.1');
  });

  test('should provide version metrics', async () => {
    // Add some version history
    await manager.bumpVersion('patch', { author: 'test', changes: ['change'], breaking: false });
    await manager.bumpVersion('minor', { author: 'test', changes: ['change'], breaking: false });
    await manager.bumpVersion('major', { author: 'test', changes: ['change'], breaking: true });

    const metrics = manager.getMetrics();
    expect(metrics.totalReleases).toBeGreaterThanOrEqual(3);
    expect(metrics.patchReleases).toBeGreaterThanOrEqual(1);
    expect(metrics.minorReleases).toBeGreaterThanOrEqual(1);
    expect(metrics.majorReleases).toBeGreaterThanOrEqual(1);
  });
});

describe('WorkspaceVersionManager', () => {
  let workspace: WorkspaceVersionManager;

  beforeEach(() => {
    workspace = new WorkspaceVersionManager('2.0.0');
  });

  test('should initialize with root version', () => {
    const versions = workspace.getWorkspaceVersions();
    expect(versions.root).toBe('2.0.0');
  });

  test('should add workspace packages', () => {
    workspace.addWorkspace('test-package', '2.0.0');
    const versions = workspace.getWorkspaceVersions();
    expect(versions['test-package']).toBe('2.0.0');
  });

  test('should check version consistency', () => {
    workspace.addWorkspace('consistent-package', '2.0.0');
    workspace.addWorkspace('inconsistent-package', '1.0.0');

    const consistency = workspace.checkConsistency();
    expect(consistency.consistent).toBe(false);
    expect(consistency.inconsistencies).toHaveLength(1);
    expect(consistency.inconsistencies[0].package).toBe('inconsistent-package');
    expect(consistency.inconsistencies[0].version).toBe('1.0.0');
    expect(consistency.inconsistencies[0].expected).toBe('2.0.0');
  });

  test('should sync workspace versions', async () => {
    workspace.addWorkspace('package-a', '1.0.0');
    workspace.addWorkspace('package-b', '1.5.0');

    await workspace.syncVersions('3.0.0');

    const versions = workspace.getWorkspaceVersions();
    expect(versions['package-a']).toBe('3.0.0');
    expect(versions['package-b']).toBe('3.0.0');
    expect(versions.root).toBe('3.0.0');
  });
});

describe('Performance Tests', () => {
  test('should parse versions quickly', () => {
    const iterations = 1000;
    const start = Bun.nanoseconds();

    for (let i = 0; i < iterations; i++) {
      VersionUtils.parse('3.1.0-beta.1+build.123');
    }

    const duration = Number(Bun.nanoseconds() - start) / 1000000; // ms
    const avgTime = duration / iterations;

    // Should be faster than 1ms per operation
    expect(avgTime).toBeLessThan(1);
  });

  test('should compare versions quickly', () => {
    const iterations = 1000;
    const start = Bun.nanoseconds();

    for (let i = 0; i < iterations; i++) {
      VersionUtils.compare('3.1.0', '3.0.0');
    }

    const duration = Number(Bun.nanoseconds() - start) / 1000000; // ms
    const avgTime = duration / iterations;

    // Should be faster than 0.1ms per operation
    expect(avgTime).toBeLessThan(0.1);
  });

  test('should check satisfaction quickly', () => {
    const iterations = 1000;
    const start = Bun.nanoseconds();

    for (let i = 0; i < iterations; i++) {
      VersionUtils.satisfies('3.1.0', '^3.0.0');
    }

    const duration = Number(Bun.nanoseconds() - start) / 1000000; // ms
    const avgTime = duration / iterations;

    // Should be faster than 0.5ms per operation
    expect(avgTime).toBeLessThan(0.5);
  });
});

describe('Error Handling', () => {
  test('should handle invalid version formats gracefully', () => {
    expect(() => VersionUtils.parse('invalid.version')).toThrow();
    expect(() => VersionUtils.compare('invalid', '1.0.0')).toThrow();
    expect(() => VersionUtils.satisfies('invalid', '^1.0.0')).toThrow();
  });

  test('should handle empty or null inputs', () => {
    expect(() => VersionUtils.parse('')).toThrow();
    expect(VersionUtils.isValid('')).toBe(false);
  });

  test('should handle extreme version numbers', () => {
    // Test with very large version numbers
    const largeVersion = '999999999.999999999.999999999';
    expect(() => VersionUtils.parse(largeVersion)).not.toThrow();

    // Test comparison with large numbers
    expect(VersionUtils.compare(largeVersion, '1.0.0')).toBeGreaterThan(0);
  });

  test('should handle complex prerelease identifiers', () => {
    const complexVersion = '1.0.0-alpha.1.2.3.beta.gamma+build.1.2.3';
    expect(() => VersionUtils.parse(complexVersion)).not.toThrow();

    const parsed = VersionUtils.parse(complexVersion);
    expect(parsed.format()).toBe(complexVersion);
  });
});
