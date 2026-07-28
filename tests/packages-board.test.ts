// @see https://bun.com/docs/test — bun:test
import { describe, test, expect } from 'bun:test';
import {
  PACKAGES_MAP_SCHEMA,
  actionHint,
  formatLoadError,
  gradeFromScore,
  normalizePackagesMap,
} from '../public/portal/packages/packages-board.js';

describe('packages-board failure paths', () => {
  test('pins board schema v12', () => {
    expect(PACKAGES_MAP_SCHEMA).toBe(12);
  });

  test('gradeFromScore matches monorepo-health bands', () => {
    expect(gradeFromScore(100)).toBe('healthy');
    expect(gradeFromScore(90)).toBe('healthy');
    expect(gradeFromScore(89.9)).toBe('needs-improvement');
    expect(gradeFromScore(59.9)).toBe('critical');
    expect(gradeFromScore(null)).toBe('unknown');
  });

  test('actionHint surfaces operator CLI', () => {
    expect(actionHint('wire-root-dep')).toContain('audit:packages:apply');
    expect(actionHint('migrate-relative-imports')).toContain('@factorywager');
    expect(actionHint('archive-candidate')).toContain('quarantine');
  });

  test('normalizePackagesMap accepts bake shape', () => {
    const data = normalizePackagesMap(
      {
        schemaVersion: 12,
        kind: 'packages-graph-map',
        generatedAt: 't',
        bunVersion: '1.4.0',
        score: 100,
        packages: [{ name: 'rip', score: 100, role: 'consumed', orphans: 0, bytes: 1024 }],
        map: {
          summary: { openActions: 0, avgPackageScore: 100, archivePlaceholders: 0 },
          actions: [],
          archiveProbes: [],
          quarantine: [{ package: 'package', reason: 'placeholder', blockedBy: ['tsconfig.json'] }],
          env: {
            schemaVersion: 3,
            uniqueVars: 1,
            summary: { ownerCount: 1, packageTouchedKeys: 1, multiPlaneKeys: 0 },
            owners: [{ envKey: 'REDIS_URL', count: 2, packages: ['p2p'], planes: ['packages'] }],
            defaultsIssues: { total: 0 },
            runtime: { root: { templateKeysMissing: 0 } },
          },
        },
      },
      '/registry/packages-graph-map.json'
    );
    expect(data.schemaOk).toBe(true);
    expect(data.packages).toHaveLength(1);
    expect(data.summary.openActions).toBe(0);
    expect(data.quarantine).toHaveLength(1);
    expect(data.env?.owners?.[0]?.envKey).toBe('REDIS_URL');
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
