// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  PORTAL_HTML_ROUTES,
  PORTAL_MARKDOWN_SLUGS,
  PORTAL_TRAILING_SLASH_SOURCES,
} from '../lib/http/portal-route-manifest.ts';
import { PORTAL_DASHBOARD_ROUTES } from '../lib/http/public-routes.ts';

describe('portal route wiring', () => {
  test('_redirects covers all trailing-slash sources', async () => {
    const redirects = await Bun.file('public/_redirects').text();
    const rules = redirects
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
    for (const src of PORTAL_TRAILING_SLASH_SOURCES) {
      expect(rules.some(l => l.startsWith(`${src} `) || l.startsWith(`${src}\t`))).toBe(true);
    }
  });

  test('every portal HTML route has a directory index', async () => {
    for (const route of PORTAL_HTML_ROUTES) {
      const rel =
        route === '/monitoring/'
          ? 'public/monitoring/index.html'
          : `public${route}index.html`.replace(/\/+/g, '/');
      expect(await Bun.file(rel).exists()).toBe(true);
    }
  });

  test('public-routes catalog includes critical portal surfaces', () => {
    const paths = new Set(PORTAL_DASHBOARD_ROUTES.map(r => r.path));
    expect(paths.has('/portal/')).toBe(true);
    expect(paths.has('/portal/ops/')).toBe(true);
    expect(paths.has('/portal/toc/')).toBe(true);
    expect(paths.has('/registry/toc-ops.json')).toBe(true);
    expect(paths.has('/api/toc')).toBe(true);
    expect(paths.has('/portal/compliance/')).toBe(true);
    expect(paths.has('/registry/compliance-board.json')).toBe(true);
    expect(paths.has('/api/compliance')).toBe(true);
    expect(paths.has('/portal/skills/')).toBe(true);
    expect(paths.has('/monitoring/')).toBe(true);
  });

  test('compliance portal is first-class in route SSOT', () => {
    expect(PORTAL_HTML_ROUTES).toContain('/portal/compliance/');
    expect(PORTAL_TRAILING_SLASH_SOURCES).toContain('/portal/compliance');
    expect(PORTAL_MARKDOWN_SLUGS).toContain('compliance');
  });

  test('markdown slugs have static stubs under public/portal/', async () => {
    for (const slug of PORTAL_MARKDOWN_SLUGS) {
      const rel = slug === 'index' ? 'public/portal/index.md' : `public/portal/${slug}.md`;
      expect(await Bun.file(rel).exists()).toBe(true);
    }
  });

  test('/api/skills Pages Function exists', async () => {
    expect(await Bun.file('functions/api/skills.ts').exists()).toBe(true);
  });

  test('monitoring href variants share one public handler', async () => {
    const source = await Bun.file('scripts/serve-public.ts').text();
    expect(source).toContain("'/monitoring': () => monitoringPage()");
    expect(source).toContain("'/monitoring/': () => monitoringPage()");
  });
});
