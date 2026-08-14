// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  projectMonorepoHealthBake,
  projectMonorepoHealthHealthArtifact,
  reportToRegistryBake,
  MONOREPO_HEALTH_REGISTRY_PATH,
  type MonorepoHealthRegistryBake,
} from '../lib/monitoring/monorepo-health-slice.ts';
import { computeMonorepoHealth } from '../lib/harness/monorepo-health.ts';

describe('monorepo-health-slice', () => {
  test('project empty when bake missing', () => {
    const s = projectMonorepoHealthBake(null);
    expect(s.available).toBe(false);
    expect(s.path).toBe(MONOREPO_HEALTH_REGISTRY_PATH);
    expect(s.portal).toBe('/portal/packages/');
  });

  test('reportToRegistryBake + project round-trip', () => {
    const scored = computeMonorepoHealth({
      duplicateDepCount: 0,
      deadCodePercent: 5,
      largeFilePercent: 10,
      testFailureRate: 0,
      cyclicDependencyCount: 2,
      testCoveragePercent: 50,
    });
    const report = {
      ...scored,
      generatedAt: '2026-07-28T00:00:00.000Z',
      root: '/tmp',
      bunVersion: '1.4.0',
      fileCount: 100,
      largeFileCount: 10,
      deadFileCount: 5,
      workspacePackageCount: 8,
      entrypointsUsed: [],
      testsRun: false,
      buildRun: true,
      notes: ['n'],
    };
    const bake = reportToRegistryBake(report);
    expect(bake.schemaVersion).toBe(2);
    expect(bake.kind).toBe('monorepo-health');
    expect(bake.score).toBe(scored.score);
    const slice = projectMonorepoHealthBake(bake);
    expect(slice.available).toBe(true);
    expect(slice.score).toBe(scored.score);
    expect(slice.grade).toBe(scored.grade);
    expect(slice.ok).toBe(scored.grade !== 'critical');
    const art = projectMonorepoHealthHealthArtifact(bake as MonorepoHealthRegistryBake);
    expect(art.exists).toBe(true);
    expect(art.claim).toBe('monorepo-health-score');
  });
});
