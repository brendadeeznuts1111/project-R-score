import { describe, expect, test } from 'bun:test';
import {
  PORTAL_BOARD_SLUGS,
  portalBoardRoutePaths,
} from '../lib/http/portal-board-slugs.ts';
import { joinPath, resolvePath } from '../lib/path-bun.ts';

const REPO = resolvePath(import.meta.dir, '..');

describe('portal board routes SSOT', () => {
  test('PORTAL_BOARD_SLUGS each have public/portal/<slug>/index.html', async () => {
    for (const slug of PORTAL_BOARD_SLUGS) {
      const index = joinPath(REPO, 'public/portal', slug, 'index.html');
      expect(await Bun.file(index).exists()).toBe(true);
    }
  });

  test('portalBoardRoutePaths pairs slash variants', () => {
    expect(portalBoardRoutePaths('vault')).toEqual(['/portal/vault', '/portal/vault/']);
  });

  test('serve-public imports PORTAL_BOARD_SLUGS and wires portalBoardRoutes', async () => {
    const src = await Bun.file(joinPath(REPO, 'scripts/serve-public.ts')).text();
    expect(src).toContain("from '../lib/http/portal-board-slugs.ts'");
    expect(src).toContain('...portalBoardRoutes(portalPage, PORTAL_BOARD_SLUGS)');
    expect(src).toContain("'/api/registry/tenants/:tenant/registry.json'");
    expect(src).toContain("'/api/skills/:name'");
    expect(src).toContain("'/portal/skills/:name'");
  });

  test('board slug count is stable (ratchet — only go up via intentional SSOT edit)', () => {
    expect(PORTAL_BOARD_SLUGS.length).toBeGreaterThanOrEqual(24);
  });
});
