// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  buildMonorepoSurfaces,
  classifyRegistryFamily,
  discoverPackagesGraphDirs,
  discoverWorkspaceMembers,
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

  test('buildMonorepoSurfaces v2 inventories portal chrome brand registry lib sto', async () => {
    const s = await buildMonorepoSurfaces(ROOT);
    expect(s.kind).toBe('monorepo-surfaces');
    expect(s.schemaVersion).toBe(2);
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
    // Portal refs + orphans
    expect((s.registry.portalRefs?.length ?? 0)).toBeGreaterThan(5);
    expect((s.summary.registryOrphanFromPortal ?? 0)).toBeGreaterThan(0);
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
  });
});
