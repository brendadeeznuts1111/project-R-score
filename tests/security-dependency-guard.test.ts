import { describe, expect, test } from 'bun:test';
import {
  BLOCKED_PACKAGES,
  CORE_SCAN_DIRS,
  listBlockedDeps,
} from '../scripts/security-dependency-guard';

describe('security dependency guard', () => {
  test('detects blocked deps in dependency sections', () => {
    const hits = listBlockedDeps({
      dependencies: { 'aws-sdk': '2.1693.0' },
      devDependencies: { 'event-stream': '^4.0.0' },
      optionalDependencies: { ws: '^8.0.0' },
    });

    expect(hits.length).toBe(2);
    expect(hits.some((h) => h.section === 'dependencies' && h.name === 'aws-sdk')).toBe(true);
    expect(hits.some((h) => h.section === 'devDependencies' && h.name === 'event-stream')).toBe(true);
  });

  test('ignores allowed deps', () => {
    const hits = listBlockedDeps({
      dependencies: { ws: '^8.19.0', axios: '^1.13.5' },
      devDependencies: { eslint: '^9.39.2' },
    });
    expect(hits).toEqual([]);
  });

  test('guard configuration contains expected blocked packages and scan roots', () => {
    expect(BLOCKED_PACKAGES.includes('aws-sdk')).toBe(true);
    expect(BLOCKED_PACKAGES.includes('event-stream')).toBe(true);
    expect(CORE_SCAN_DIRS.includes('server')).toBe(true);
    expect(CORE_SCAN_DIRS.includes('tests')).toBe(true);
  });
});

