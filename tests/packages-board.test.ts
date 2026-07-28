// @see https://bun.com/docs/test — bun:test
import { describe, test, expect } from 'bun:test';
import {
  PACKAGES_MAP_SCHEMA,
  formatLoadError,
  normalizePackagesMap,
} from '../public/portal/packages/packages-board.js';

describe('packages-board failure paths', () => {
  test('pins board schema v11', () => {
    expect(PACKAGES_MAP_SCHEMA).toBe(11);
  });

  test('normalizePackagesMap accepts bake shape', () => {
    const data = normalizePackagesMap(
      {
        schemaVersion: 11,
        kind: 'packages-graph-map',
        generatedAt: 't',
        bunVersion: '1.4.0',
        score: 100,
        packages: [{ name: 'rip', score: 100, role: 'consumed', orphans: 0, bytes: 1024 }],
        map: {
          summary: { openActions: 0, avgPackageScore: 100, archivePlaceholders: 0 },
          actions: [],
          archiveProbes: [],
        },
      },
      '/registry/packages-graph-map.json'
    );
    expect(data.schemaOk).toBe(true);
    expect(data.packages).toHaveLength(1);
    expect(data.summary.openActions).toBe(0);
  });

  test('normalizePackagesMap rejects empty payload', () => {
    expect(() => normalizePackagesMap(null as never, 'x')).toThrow(/empty|object/i);
  });

  test('schema mismatch still renders with schemaOk=false', () => {
    const data = normalizePackagesMap(
      {
        schemaVersion: 9,
        packages: [],
        map: { summary: {}, actions: [], archiveProbes: [] },
      },
      '/registry/packages-graph-map.json'
    );
    expect(data.schemaOk).toBe(false);
    expect(data.schemaVersion).toBe(9);
  });

  test('formatLoadError stringifies Errors', () => {
    expect(formatLoadError(new Error('HTTP 404'))).toBe('HTTP 404');
    expect(formatLoadError('boom')).toBe('boom');
  });
});
