import { describe, expect, test } from 'bun:test';
import { PORTAL_BOARD_SLUGS } from '../lib/http/portal-board-slugs.ts';
import { joinPath, resolvePath } from '../lib/path-bun.ts';

const REPO = resolvePath(import.meta.dir, '..');

describe('portal board routes SSOT', () => {
  test('PORTAL_BOARD_SLUGS each have public/portal/<slug>/index.html', async () => {
    for (const slug of PORTAL_BOARD_SLUGS) {
      const index = joinPath(REPO, 'public/portal', slug, 'index.html');
      expect(await Bun.file(index).exists()).toBe(true);
    }
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

  test('every board dir under public/portal has a slug (reverse drift check)', async () => {
    const CHROME_DIRS = new Set(['components', 'dist', 'icons']);
    const dirs: string[] = [];
    for await (const f of new Bun.Glob('public/portal/*/index.html').scan()) {
      const dir = f.split('/')[2]!;
      if (!CHROME_DIRS.has(dir)) dirs.push(dir);
    }
    expect(dirs.length).toBe(PORTAL_BOARD_SLUGS.length);
    for (const dir of dirs) {
      expect(PORTAL_BOARD_SLUGS).toContain(dir);
    }
  });

  test('every slug maps to a domain concept (page-concepts alignment)', async () => {
    const { PORTAL_PAGE_CONCEPT_DEFINITIONS } = await import('../lib/portal/page-concepts.ts');
    const paths = new Set(PORTAL_PAGE_CONCEPT_DEFINITIONS.map(d => d.path));
    for (const slug of PORTAL_BOARD_SLUGS) {
      expect(paths.has(`/portal/${slug}/`)).toBe(true);
    }
  });

  test('_redirects 301-covers every slug', async () => {
    const text = await Bun.file('public/_redirects').text();
    for (const slug of PORTAL_BOARD_SLUGS) {
      expect(text).toMatch(new RegExp(`^/portal/${slug}\\s+/portal/${slug}/\\s+301$`, 'm'));
    }
  });

  test('portal-route-manifest HTML routes cover every slug', async () => {
    const { PORTAL_HTML_ROUTES } = await import('../lib/http/portal-route-manifest.ts');
    for (const slug of PORTAL_BOARD_SLUGS) {
      expect(PORTAL_HTML_ROUTES).toContain(`/portal/${slug}/`);
    }
  });

  test('public-routes dashboard catalog covers every slug', async () => {
    const { PORTAL_DASHBOARD_ROUTES } = await import('../lib/http/public-routes.ts');
    const paths = new Set(PORTAL_DASHBOARD_ROUTES.map(r => r.path));
    for (const slug of PORTAL_BOARD_SLUGS) {
      expect(paths.has(`/portal/${slug}/`)).toBe(true);
    }
  });
});
