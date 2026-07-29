// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  buildLibImportHubs,
  buildMonorepoSurfaces,
  buildPageRegistryEdges,
  classifyRegistryFamily,
  discoverPackagesGraphDirs,
  discoverWorkspaceMembers,
  triageRegistryOrphans,
} from '../lib/harness/monorepo-surfaces.ts';
import { resolvePath } from '../scripts/lib/fs-bun';

const ROOT = resolvePath(import.meta.dir, '..');

describe('monorepo-surfaces', () => {
  test('workspace members include packages + STO + shared', async () => {
    const members = await discoverWorkspaceMembers(ROOT);
    expect(members.length).toBeGreaterThanOrEqual(7);
    const paths = members.map(m => m.path);
    expect(paths.some(p => p.startsWith('packages/'))).toBe(true);
    expect(paths).toContain('projects/active/sports-terminal-os');
    expect(paths).toContain('lib/shared');
    const graphDirs = await discoverPackagesGraphDirs(ROOT);
    expect(graphDirs).toContain('registry-client');
    // packages plane is a subset of full workspaces
    expect(members.filter(m => m.inPackagesGraph).length).toBe(graphDirs.length);
  });

  test('classifyRegistryFamily maps proof/ops/portal heuristics', () => {
    expect(classifyRegistryFamily('networking-proof.json', null)).toBe('proof');
    expect(classifyRegistryFamily('ops-summary.json', null)).toBe('ops');
    expect(classifyRegistryFamily('portal-chrome.json', 'portal-chrome')).toBe('portal');
    expect(classifyRegistryFamily('packages-graph-map.json', 'packages-graph-map')).toBe(
      'packages'
    );
    expect(classifyRegistryFamily('compliance-board.json', null)).toBe('compliance');
    expect(classifyRegistryFamily('verification-stable-1.4.0.json', null)).toBe('verification');
    expect(classifyRegistryFamily('vault-map.json', 'vault-map-bundle')).toBe('vault');
    expect(classifyRegistryFamily('telegram-handshake.json', null)).toBe('telegram');
  });

  test('buildPageRegistryEdges + lib hubs + orphan triage', () => {
    const edges = buildPageRegistryEdges(
      [
        {
          href: '/portal/ops/',
          slug: 'ops',
          hasIndex: true,
          hasMd: true,
          scripts: ['/portal/data.js', '/portal/operations-dashboard.js'],
        },
      ],
      [
        {
          path: '/registry/ops-summary.json',
          from: ['public/portal/operations-dashboard.js'],
          exists: true,
        },
        {
          path: '/registry/monorepo-health.json',
          from: ['public/portal/data.js'],
          exists: true,
        },
      ],
      [
        {
          file: 'ops-summary.json',
          kind: null,
          schemaVersion: 1,
          bytes: 1,
          family: 'ops',
        },
        {
          file: 'monorepo-health.json',
          kind: 'monorepo-health',
          schemaVersion: 1,
          bytes: 1,
          family: 'health',
        },
      ]
    );
    expect(edges.some(e => e.page === 'ops' && e.registryPath.includes('ops-summary'))).toBe(
      true
    );
    expect(edges.some(e => e.registryPath.includes('monorepo-health'))).toBe(true);

    const hubs = buildLibImportHubs([
      { fromPackage: 'docs-tools', plane: 'lib', targetPrefix: 'lib/docs', weight: 11 },
      { fromPackage: 'business', plane: 'lib', targetPrefix: 'lib/docs', weight: 1 },
      { fromPackage: 'guards', plane: 'config', targetPrefix: 'config', weight: 1 },
    ]);
    expect(hubs).toHaveLength(1);
    expect(hubs[0]!.targetPrefix).toBe('lib/docs');
    expect(hubs[0]!.weight).toBe(12);
    expect(hubs[0]!.fromPackages).toEqual(['business', 'docs-tools']);

    const triage = triageRegistryOrphans(
      ['networking-proof.json', 'package-info.json', 'weird.json'],
      [
        {
          file: 'networking-proof.json',
          kind: null,
          schemaVersion: null,
          bytes: 1,
          family: 'proof',
        },
        {
          file: 'package-info.json',
          kind: null,
          schemaVersion: null,
          bytes: 1,
          family: 'packages',
        },
        { file: 'weird.json', kind: null, schemaVersion: null, bytes: 1, family: 'other' },
      ]
    );
    expect(triage.find(t => t.file === 'networking-proof.json')?.action).toBe('document');
    expect(triage.find(t => t.file === 'package-info.json')?.action).toBe('wire-portal');
    expect(triage.find(t => t.file === 'weird.json')?.action).toBe('review');
  });

  test('buildMonorepoSurfaces v3 inventories portal chrome brand registry lib sto', async () => {
    const s = await buildMonorepoSurfaces(ROOT, {
      packageExternalEdges: [
        { fromPackage: 'docs-tools', plane: 'lib', targetPrefix: 'lib/docs', weight: 11 },
        { fromPackage: 'business', plane: 'lib', targetPrefix: 'lib/docs', weight: 1 },
      ],
    });
    expect(s.kind).toBe('monorepo-surfaces');
    expect(s.schemaVersion).toBe(3);
    expect(s.summary.workspaceMembers).toBeGreaterThanOrEqual(7);
    expect(s.summary.packagesPlane).toBe(s.packagesGraphDirs.length);
    expect(s.summary.otherWorkspaces).toBe(
      s.summary.workspaceMembers - s.summary.packagesPlane
    );
    // Portal has many pages + chrome components from portal-chrome bake
    expect(s.summary.portalPages).toBeGreaterThanOrEqual(10);
    expect(s.summary.chromeComponents).toBeGreaterThanOrEqual(8);
    expect(s.portal.theme.jsonc).toBe(true);
    expect(s.portal.theme.tokensCss).toBe(true);
    expect(s.portal.theme.darkTokenCount).toBeGreaterThanOrEqual(8);
    expect(s.portal.theme.fontKeys.length).toBeGreaterThanOrEqual(2);
    // Chrome components should resolve on disk
    expect(s.portal.chromeComponents.every(c => c.onDisk === true)).toBe(true);
    // Pages carry script inventory
    const pkgPage = s.portal.pages.find(p => p.slug === 'packages');
    expect(pkgPage?.scripts?.some(src => src.includes('packages-board'))).toBe(true);
    // Brand tenants factory/science/tennis
    expect(s.brand.tenants).toContain('factory');
    expect(s.summary.brandAssets).toBeGreaterThanOrEqual(10);
    // Registry top-level has far more than packages graph dirs
    expect(s.summary.registryTopLevelJson).toBeGreaterThan(s.summary.packagesPlane);
    expect(s.registry.topLevel.every(a => a.family)).toBe(true);
    expect(s.registry.byFamily?.length).toBeGreaterThanOrEqual(4);
    expect(s.registry.topLevel.some(a => a.file === 'packages-graph-map.json')).toBe(true);
    expect(s.registry.topLevel.some(a => a.file === 'portal-chrome.json')).toBe(true);
    // Portal refs + orphans (install-hygiene wired 2026-07-29 — orphan count may be 0)
    expect((s.registry.portalRefs?.length ?? 0)).toBeGreaterThan(5);
    expect((s.summary.registryOrphanFromPortal ?? 0)).toBeGreaterThanOrEqual(0);
    expect(s.registry.portalRefs?.some(r => r.path.includes('install-hygiene-report.json'))).toBe(
      true
    );
    // lib plane is much larger than workspaces lib/*
    expect((s.libPlane?.dirs.length ?? 0)).toBeGreaterThanOrEqual(10);
    expect(s.libPlane?.workspaceShared).toBe(true);
    // STO nested packages (odds-selectors, frontend, …)
    expect((s.sto?.nested.length ?? 0)).toBeGreaterThanOrEqual(1);
    // Plane map documents the scope split
    const planeIds = s.planes.map(p => p.id);
    expect(planeIds).toContain('packages-graph');
    expect(planeIds).toContain('registry-bake');
    expect(planeIds).toContain('portal-chrome');
    expect(planeIds).toContain('brand');
    expect(planeIds).toContain('lib-plane');
    expect(planeIds).toContain('sto-nested');
    expect(planeIds).toContain('registry-portal-refs');
    expect(planeIds).toContain('page-registry-edges');
    expect(planeIds).toContain('lib-import-hubs');
    expect(planeIds).toContain('orphan-wire');
    expect((s.crossPlane?.pageToRegistry.length ?? 0)).toBeGreaterThan(10);
    expect(s.crossPlane?.libImportHubs.some(h => h.targetPrefix === 'lib/docs')).toBe(true);
    expect((s.registry.orphanTriage?.length ?? 0)).toBe(s.registry.orphanFromPortal?.length ?? 0);
    expect((s.summary.orphanWireCandidates ?? 0)).toBeGreaterThanOrEqual(0);
  });
});
