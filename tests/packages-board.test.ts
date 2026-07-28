// @see https://bun.com/docs/test — bun:test
import { describe, test, expect } from 'bun:test';
import {
  PACKAGES_MAP_SCHEMA,
  actionHint,
  buildDependencyGraphModel,
  edgesForPackage,
  formatLoadError,
  gradeFromScore,
  graphFocusSet,
  normalizePackagesMap,
  renderDependencyGraphSvg,
  renderPageRegistrySvg,
} from '../public/portal/packages/packages-board.js';

describe('packages-board failure paths', () => {
  test('pins board schema v13', () => {
    expect(PACKAGES_MAP_SCHEMA).toBe(13);
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

  test('buildDependencyGraphModel lays out packages + external edges', () => {
    const model = buildDependencyGraphModel({
      packages: [
        { name: 'rip', role: 'consumed', score: 100 },
        { name: 'docs-tools', role: 'dormant', score: 85 },
      ],
      archiveProbes: [{ package: 'docs-tools' }],
      map: {
        packageEdges: [],
        externalEdges: [
          { fromPackage: 'docs-tools', targetPrefix: 'lib/docs', plane: 'lib', weight: 11 },
          { fromPackage: 'rip', targetPrefix: 'bare:bun', plane: 'bare', weight: 3 },
        ],
      },
    });
    expect(model.stats.packageNodes).toBe(2);
    expect(model.stats.externalNodes).toBe(2);
    expect(model.stats.edges).toBe(2);
    expect(model.nodes.find(n => n.id === 'docs-tools')?.archive).toBe(true);
    expect(model.nodes.every(n => typeof n.x === 'number' && typeof n.y === 'number')).toBe(true);
    const svg = renderDependencyGraphSvg(model);
    expect(svg).toContain('<svg');
    expect(svg).toContain('docs-tools');
    expect(svg).toContain('edge-ext');
    // focus dimming
    const focused = renderDependencyGraphSvg(model, { focusId: 'rip' });
    expect(focused).toContain('focus');
    expect(focused).toContain(' dim');
    const neigh = graphFocusSet(model, 'rip');
    expect(neigh.has('rip')).toBe(true);
    expect(neigh.has('ext:bare:bun')).toBe(true);
    expect(edgesForPackage(model, 'docs-tools')).toHaveLength(1);
  });

  test('normalizePackagesMap accepts bake shape', () => {
    const data = normalizePackagesMap(
      {
        schemaVersion: 13,
        kind: 'packages-graph-map',
        generatedAt: 't',
        bunVersion: '1.4.0',
        score: 100,
        packages: [{ name: 'rip', score: 100, role: 'consumed', orphans: 0, bytes: 1024 }],
        surfaces: {
          summary: {
            workspaceMembers: 8,
            packagesPlane: 6,
            otherWorkspaces: 2,
            portalPages: 18,
            chromeComponents: 11,
            brandAssets: 20,
            registryTopLevelJson: 54,
          },
          planes: [
            {
              id: 'packages-graph',
              label: 'packages/* import graph',
              count: 6,
              note: 'coupling only',
            },
          ],
          workspaces: [
            {
              path: 'packages/rip',
              name: '@factorywager/rip',
              plane: 'packages',
              inPackagesGraph: true,
            },
          ],
          portal: {
            chromeComponents: [{ id: 'topbar', path: '/portal/topbar.js', kind: 'module' }],
          },
          brand: { tenants: ['factory'], assets: [] },
        },
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
    expect(data.surfaces?.summary?.registryTopLevelJson).toBe(54);
    expect(data.surfaces?.planes?.[0]?.id).toBe('packages-graph');
  });

  test('normalizePackagesMap accepts legacy schema v12', () => {
    const data = normalizePackagesMap(
      {
        schemaVersion: 12,
        packages: [{ name: 'rip', score: 100, role: 'consumed', orphans: 0, bytes: 1 }],
        map: { summary: {}, actions: [], archiveProbes: [] },
      },
      '/registry/packages-graph-map.json'
    );
    expect(data.schemaOk).toBe(true);
    expect(data.surfaces).toBeNull();
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

  test('renderPageRegistrySvg bipartite page→registry', () => {
    const svg = renderPageRegistrySvg([
      {
        page: 'ops',
        registryPath: '/registry/ops-summary.json',
        family: 'ops',
        weight: 3,
      },
      {
        page: 'health',
        registryPath: '/registry/monorepo-health.json',
        family: 'health',
        weight: 2,
      },
    ]);
    expect(svg).toContain('page-reg-svg');
    expect(svg).toContain('ops');
    expect(svg).toContain('ops-summary');
    expect(svg).toContain('edge-page-reg');
  });
});
