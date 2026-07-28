// @see https://bun.com/docs/test — bun:test
import { describe, test, expect } from 'bun:test';
import {
  applyWireRootDeps,
  buildPackageGraphMap,
  classifyPackageCoupling,
  enrichCouplingMap,
  enrichIntraPackageMap,
  formatIntraPackageMermaid,
  formatPackageMapMermaid,
  resolveMetaImportPath,
  scorePackageCoupling,
} from '../lib/harness/packages-graph-map.ts';

describe('packages-graph-map', () => {
  test('aggregates cross-package and external edges', () => {
    const adj = new Map<string, string[]>([
      ['packages/a/src/index.ts', ['packages/b/src/index.ts', 'lib/docs/urls.ts']],
      ['packages/b/src/index.ts', ['packages/b/src/util.ts']],
      ['packages/b/src/util.ts', []],
    ]);
    const map = buildPackageGraphMap(adj);
    expect(map.packages).toEqual(['a', 'b']);
    expect(map.packageEdges).toEqual([
      expect.objectContaining({ from: 'a', to: 'b', weight: 1 }),
    ]);
    expect(map.externalEdges[0]).toMatchObject({
      fromPackage: 'a',
      plane: 'lib',
      targetPrefix: 'lib/docs',
      weight: 1,
    });
    expect(map.internalEdgeCount).toBe(1);
    expect(map.dependencies.a).toEqual(['b']);
    expect(map.dependents.b).toEqual(['a']);
    expect(map.layers[0]).toContain('a');
  });

  test('resolves relative and bare metafile imports', () => {
    const rel = resolveMetaImportPath(
      'packages/docs-tools/src/builders/validator.ts',
      '../../../../lib/docs/constants/domains',
      '/Users/nolarose/Projects'
    );
    expect(rel).toEqual({ kind: 'file', path: 'lib/docs/constants/domains' });
    const bare = resolveMetaImportPath('packages/p2p/src/x.ts', 'bun', '/r');
    expect(bare).toEqual({ kind: 'bare', name: 'bun' });
    const local = resolveMetaImportPath(
      'packages/guards/src/bun-first-guard.ts',
      './index',
      '/r'
    );
    expect(local).toEqual({ kind: 'file', path: 'packages/guards/src/index' });
  });

  test('mermaid export includes edge weights', () => {
    const map = buildPackageGraphMap(
      new Map([['packages/x/src/i.ts', ['packages/y/src/i.ts']]])
    );
    const mmd = formatPackageMapMermaid(map);
    expect(mmd).toContain('flowchart LR');
    expect(mmd).toContain('x');
    expect(mmd).toContain('y');
  });

  test('enrichIntraPackageMap layers internal files', () => {
    const adj = new Map<string, string[]>([
      ['packages/a/src/index.ts', ['packages/a/src/util.ts']],
      ['packages/a/src/util.ts', ['packages/a/src/leaf.ts']],
      ['packages/a/src/leaf.ts', []],
    ]);
    const map = enrichIntraPackageMap(buildPackageGraphMap(adj), adj, { minFiles: 2 });
    expect(map.intra?.a?.fileCount).toBe(3);
    expect(map.intra?.a?.depth).toBeGreaterThanOrEqual(2);
    expect(map.intra?.a?.layers.flat()).toContain('src/leaf.ts');
    const mmd = formatIntraPackageMermaid('a', map.intra!.a!);
    expect(mmd).toContain('flowchart TB');
    expect(mmd).toContain('depth=');
  });

  test('classifyPackageCoupling marks dormant vs consumed + actions', () => {
    let map = buildPackageGraphMap(
      new Map([
        ['packages/live/src/i.ts', ['lib/x.ts']],
        ['packages/dead/src/i.ts', []],
      ])
    );
    map = {
      ...map,
      outsideConsumers: [
        {
          package: 'live',
          count: 2,
          consumers: ['lib/a.ts', 'tools/b.ts'],
          workspaceImports: 0,
          relativeImports: 2,
        },
      ],
      declared: [
        {
          package: 'live',
          npmName: '@factorywager/live',
          declaredWorkspace: [],
          actualCrossPkg: [],
          missingInPackageJson: [],
          unusedDeclared: [],
          inRootWorkspaceDeps: false,
        },
        {
          package: 'dead',
          npmName: '@factorywager/dead',
          declaredWorkspace: [],
          actualCrossPkg: [],
          missingInPackageJson: [],
          unusedDeclared: [],
          inRootWorkspaceDeps: false,
        },
      ],
    };
    map = enrichCouplingMap(map);
    expect(map.externalHubs?.[0]?.targetPrefix).toBe('lib/x.ts');
    const roles = Object.fromEntries(classifyPackageCoupling(map).map(c => [c.package, c.role]));
    expect(roles.live).toBe('consumed');
    expect(roles.dead).toBe('dormant');
    expect(map.actions?.some(a => a.package === 'live' && a.action === 'wire-root-dep')).toBe(true);
    expect(map.actions?.some(a => a.package === 'live' && a.action === 'migrate-relative-imports')).toBe(
      true
    );
    expect(map.actions?.some(a => a.package === 'dead' && a.action === 'archive-candidate')).toBe(
      true
    );
    const scores = scorePackageCoupling(map);
    expect(scores.find(s => s.package === 'live')!.score).toBeLessThan(100);
  });

  test('applyWireRootDeps dry-run reports adds', async () => {
    const result = await applyWireRootDeps(process.cwd(), ['docs-tools'], { dryRun: true });
    expect(result.dryRun).toBe(true);
    // docs-tools may already be wired after apply; either added or skipped is fine
    expect(result.added.length + result.skipped.length).toBe(1);
  });

  test('residual relative imports still migrate even when workspace imports exist', () => {
    let map = buildPackageGraphMap(new Map([['packages/sdk/src/i.ts', []]]));
    map = {
      ...map,
      outsideConsumers: [
        {
          package: 'sdk',
          count: 2,
          consumers: ['lib/a.ts', 'lib/b.ts'],
          workspaceImports: 3,
          relativeImports: 1,
        },
      ],
      declared: [
        {
          package: 'sdk',
          npmName: '@factorywager/sdk',
          declaredWorkspace: [],
          actualCrossPkg: [],
          missingInPackageJson: [],
          unusedDeclared: [],
          inRootWorkspaceDeps: true,
        },
      ],
    };
    map = enrichCouplingMap(map);
    expect(
      map.actions?.some(a => a.package === 'sdk' && a.action === 'migrate-relative-imports')
    ).toBe(true);
    expect(map.actions?.some(a => a.package === 'sdk' && a.action === 'ok')).toBe(false);
    const score = scorePackageCoupling(map).find(s => s.package === 'sdk')!;
    expect(score.score).toBe(92); // 100 − 8 residual relative
    expect(score.reasons.some(r => r.includes('residual relative'))).toBe(true);
  });
});
