// @see https://bun.com/docs/test — bun:test
import { describe, test, expect } from 'bun:test';
import {
  buildPackageGraphMap,
  enrichIntraPackageMap,
  formatPackageMapMermaid,
  resolveMetaImportPath,
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
      'packages/ab-testing/src/cookie-manager.ts',
      './manager',
      '/r'
    );
    expect(local).toEqual({ kind: 'file', path: 'packages/ab-testing/src/manager' });
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
  });
});
