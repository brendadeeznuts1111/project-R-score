// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  buildMonorepoSurfaces,
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

  test('buildMonorepoSurfaces inventories portal chrome brand registry', async () => {
    const s = await buildMonorepoSurfaces(ROOT);
    expect(s.kind).toBe('monorepo-surfaces');
    expect(s.schemaVersion).toBe(1);
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
    // Brand tenants factory/science/tennis
    expect(s.brand.tenants).toContain('factory');
    expect(s.summary.brandAssets).toBeGreaterThanOrEqual(10);
    // Registry top-level has far more than packages graph dirs
    expect(s.summary.registryTopLevelJson).toBeGreaterThan(s.summary.packagesPlane);
    expect(s.registry.topLevel.some(a => a.file === 'packages-graph-map.json')).toBe(true);
    expect(s.registry.topLevel.some(a => a.file === 'portal-chrome.json')).toBe(true);
    // Plane map documents the scope split
    const planeIds = s.planes.map(p => p.id);
    expect(planeIds).toContain('packages-graph');
    expect(planeIds).toContain('registry-bake');
    expect(planeIds).toContain('portal-chrome');
    expect(planeIds).toContain('brand');
  });
});
