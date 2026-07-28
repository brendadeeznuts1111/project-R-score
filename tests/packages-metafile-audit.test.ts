// @see https://bun.com/docs/test — bun:test
import { describe, test, expect, beforeAll } from 'bun:test';
import {
  diffAgainstPrevious,
  findImportCycles,
  formatAuditMarkdown,
  runPackagesMetafileAudit,
  scorePackageAudit,
  type PackageAuditReport,
} from '../tools/packages-metafile-audit.ts';

describe('packages-metafile-audit', () => {
  let deep: PackageAuditReport;
  let shallow: PackageAuditReport;
  let cross: PackageAuditReport;

  beforeAll(async () => {
    // Sequential builds via tool lock; share reports so tests don't stampede Bun.build.
    deep = await runPackagesMetafileAudit();
    shallow = await runPackagesMetafileAudit({ deepMap: false });
    cross = await runPackagesMetafileAudit({ crossCheck: true });
  });

  test('schema v11 score + probes + summary', () => {
    expect(deep.schemaVersion).toBe(11);
    expect(deep.score).toBeGreaterThanOrEqual(90);
    expect(deep.grade).toBe('healthy');
    expect(deep.map.packages.length).toBeGreaterThan(0);
    expect(deep.totals.mapLayers).toBe(deep.map.layers.length);
    expect(deep.totals.crossPackageEdges).toBe(deep.map.packageEdges.length);
    expect(deep.map.intra).toBeDefined();
    expect(deep.map.declared).toBeDefined();
    expect(deep.map.declared!.length).toBe(deep.map.packages.length);
    expect(deep.map.externalHubs?.length).toBeGreaterThan(0);
    expect(deep.map.coupling?.length).toBe(deep.map.packages.length);
    expect(deep.map.coupling!.some(c => c.role === 'consumed')).toBe(true);
    expect(deep.map.actions).toBeDefined();
    expect(deep.map.summary).toBeDefined();
    expect(deep.map.packageScores?.length).toBe(deep.map.packages.length);
    expect(deep.map.archiveProbes?.length).toBeGreaterThan(0);
    expect(deep.packages.every(p => typeof p.score === 'number')).toBe(true);
    expect(deep.map.declared!.find(d => d.package === 'registry-client')?.inRootWorkspaceDeps).toBe(
      true
    );
    expect(deep.entrypointKinds['packages/rip/src/cli.ts']).toBe('cli');
    expect(deep.orphans.includes('packages/rip/src/cli.ts')).toBe(false);
    // Prefer src over dist for registry-client
    expect(deep.entrypoints.some(e => e.includes('/dist/'))).toBe(false);
  });

  test('--shallow skips deep-map enrichment', () => {
    expect(shallow.map.intra).toBeUndefined();
    expect(shallow.map.outsideConsumers).toBeUndefined();
    expect(shallow.map.declared).toBeUndefined();
  });

  test('scorePackageAudit penalizes orphans and cycles', () => {
    expect(
      scorePackageAudit({ orphanCount: 0, orphanPercent: 0, cycleCount: 0, buildSuccess: true })
    ).toEqual({
      score: 100,
      grade: 'healthy',
    });
    const bad = scorePackageAudit({
      orphanCount: 5,
      orphanPercent: 20,
      cycleCount: 2,
      buildSuccess: false,
    });
    expect(bad.score).toBeLessThan(60);
    expect(bad.grade).toBe('critical');
  });

  test('findImportCycles detects a simple loop', () => {
    const adj = new Map<string, string[]>([
      ['packages/a/src/x.ts', ['packages/a/src/y.ts']],
      ['packages/a/src/y.ts', ['packages/a/src/x.ts']],
    ]);
    expect(findImportCycles(adj).length).toBeGreaterThanOrEqual(1);
  });

  test('diffAgainstPrevious tracks orphan churn', () => {
    const diff = diffAgainstPrevious(
      {
        orphans: ['a.ts'],
        totals: { orphanCount: 1, cycleCount: 0 } as never,
        score: 92,
        generatedAt: 'now',
      },
      {
        orphans: ['b.ts'],
        totals: { orphanCount: 1, cycleCount: 0, orphanPercent: 0 },
        score: 90,
        generatedAt: 'then',
        buildSuccess: true,
      }
    );
    expect(diff.addedOrphans).toEqual(['a.ts']);
    expect(diff.removedOrphans).toEqual(['b.ts']);
    expect(diff.scoreDelta).toBe(2);
  });

  test('formatAuditMarkdown includes score', () => {
    const md = formatAuditMarkdown(deep);
    expect(md).toContain('Score:');
    expect(md).toContain(String(deep.score));
  });

  test('cross-check attaches Transpiler compare', () => {
    expect(cross.crossCheck).toBeDefined();
  });

  test('vault plane attaches env.template coupling', async () => {
    const report = await runPackagesMetafileAudit({ vault: true });
    expect(report.schemaVersion).toBe(11);
    expect(report.map.vault).toBeDefined();
    expect(report.map.vault!.summary.packagesWithEnv).toBeGreaterThan(0);
    expect(report.map.summary?.vaultPackagesWithEnv).toBe(
      report.map.vault!.summary.packagesWithEnv
    );
    expect(report.map.vault!.envHits.every(h => typeof h.inTemplate === 'boolean')).toBe(true);
  });

  test('env inventory attaches compact harness scan', async () => {
    const report = await runPackagesMetafileAudit({ envInventory: true });
    expect(report.map.env).toBeDefined();
    expect(report.map.env!.scannedRoots).toContain('packages');
    expect(report.map.env!.packagesPlane.summary.packagesWithEnv).toBeGreaterThan(0);
    expect(report.map.vault).toBeDefined();
  });
});
