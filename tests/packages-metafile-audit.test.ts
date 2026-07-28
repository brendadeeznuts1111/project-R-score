// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/test/index#run-tests
import { describe, test, expect } from 'bun:test';
import {
  diffAgainstPrevious,
  findImportCycles,
  formatAuditMarkdown,
  runPackagesMetafileAudit,
  scorePackageAudit,
  type PackageAuditReport,
} from '../tools/packages-metafile-audit.ts';

describe('packages-metafile-audit', () => {
  // Lazy memoized reports: hooks have a fixed ~5s timeout (unconfigurable),
  // and three sequential full-monorepo audits exceeded it under parallel-lane
  // load. Deferring into the first awaiting test puts the cost inside the
  // 10s test budget; each report is still computed at most once.
  let deepP: Promise<PackageAuditReport> | undefined;
  let shallowP: Promise<PackageAuditReport> | undefined;
  let crossP: Promise<PackageAuditReport> | undefined;
  const getDeep = () => (deepP ??= runPackagesMetafileAudit());
  const getShallow = () => (shallowP ??= runPackagesMetafileAudit({ deepMap: false }));
  const getCross = () => (crossP ??= runPackagesMetafileAudit({ crossCheck: true }));

  test('schema v13 score + probes + quarantine + summary', async () => {
    const deep = await getDeep();
    expect(deep.schemaVersion).toBe(13);
    expect(deep.root).toBe('.');
    expect(deep.map.quarantine).toBeDefined();
    expect(deep.map.summary?.quarantineCount).toBe(deep.map.quarantine!.length);
    expect(deep.map.packages.includes('package')).toBe(false);
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

  test('emits portable provenance and deterministic sampled edges', async () => {
    const [deep, shallow] = await Promise.all([getDeep(), getShallow()]);
    const samples = [...deep.map.packageEdges, ...deep.map.externalEdges].map(edge => edge.samples);
    for (const evidence of samples) {
      expect(evidence).toEqual([...evidence].sort());
    }

    const sampleIndex = (report: PackageAuditReport) => ({
      package: report.map.packageEdges.map(edge => ({
        key: `${edge.from}->${edge.to}`,
        samples: edge.samples,
      })),
      external: report.map.externalEdges.map(edge => ({
        key: `${edge.fromPackage}->${edge.targetPrefix}`,
        samples: edge.samples,
      })),
    });
    expect(sampleIndex(deep)).toEqual(sampleIndex(shallow));
  });

  test('--shallow skips deep-map enrichment', async () => {
    const shallow = await getShallow();
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

  test('formatAuditMarkdown includes score', async () => {
    const md = formatAuditMarkdown(await getDeep());
    expect(md).toContain('Score:');
    expect(md).toContain(String((await getDeep()).score));
  });

  test('cross-check attaches Transpiler compare', async () => {
    expect((await getCross()).crossCheck).toBeDefined();
  });

  test('vault plane attaches env.template coupling', async () => {
    const report = await runPackagesMetafileAudit({ vault: true });
    expect(report.schemaVersion).toBe(13);
    expect(report.map.vault).toBeDefined();
    expect(report.map.vault!.summary.packagesWithEnv).toBeGreaterThan(0);
    expect(report.map.summary?.vaultPackagesWithEnv).toBe(
      report.map.vault!.summary.packagesWithEnv
    );
    expect(report.map.vault!.envHits.every(h => typeof h.inTemplate === 'boolean')).toBe(true);
  });

  test('env inventory attaches compact harness scan with owners', async () => {
    const report = await runPackagesMetafileAudit({ envInventory: true });
    expect(report.map.env).toBeDefined();
    expect(report.map.env!.schemaVersion).toBe(3);
    expect(report.map.env!.runtime.root.missingNeedsInject).toBeDefined();
    expect(report.map.summary?.envRootRuntimeNeedsInject).toBe(
      report.map.env!.summary.rootRuntimeNeedsInject
    );
    expect(report.map.env!.scannedRoots).toContain('packages');
    expect(report.map.env!.packagesPlane.summary.packagesWithEnv).toBeGreaterThan(0);
    expect(report.map.env!.owners.length).toBeGreaterThan(0);
    expect(report.map.env!.runtime.root).toBeDefined();
    expect(report.map.env!.defaultsIssues).toBeDefined();
    expect(report.map.vault).toBeDefined();
    expect(report.map.summary?.envPackageTouchedKeys).toBe(
      report.map.env!.summary.packageTouchedKeys
    );
  });
});
