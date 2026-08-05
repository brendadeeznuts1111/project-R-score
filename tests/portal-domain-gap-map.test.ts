// @see https://bun.com/docs/test — bun:test
// Partner-domain gap map: DOD · limits · bookmakers · routing companions + catalog.
import { describe, expect, test } from 'bun:test';
import {
  PORTAL_HTML_ROUTES,
  PORTAL_MARKDOWN_SLUGS,
  PORTAL_TRAILING_SLASH_SOURCES,
} from '../lib/http/portal-route-manifest.ts';
import { publicRouteCatalog } from '../lib/http/public-routes.ts';

const PARTNER_MD = ['dod', 'limits', 'bookmakers', 'routing', 'partners', 'telegram'] as const;

describe('portal partner-domain gap map', () => {
  test('markdown companions exist and are registered slugs', async () => {
    for (const slug of PARTNER_MD) {
      expect(PORTAL_MARKDOWN_SLUGS).toContain(slug);
      expect(await Bun.file(`public/portal/${slug}.md`).exists()).toBe(true);
    }
  });

  test('HTML boards for limits · bookmakers · dod are first-class routes', () => {
    for (const path of ['/portal/limits/', '/portal/bookmakers/', '/portal/dod/', '/portal/limits-lab/']) {
      expect(PORTAL_HTML_ROUTES).toContain(path);
    }
    for (const src of ['/portal/limits', '/portal/bookmakers', '/portal/dod', '/portal/limits-lab']) {
      expect(PORTAL_TRAILING_SLASH_SOURCES).toContain(src);
    }
  });

  test('registry catalog includes partner-domain bakes', () => {
    const paths = new Set(publicRouteCatalog().map(r => r.path));
    expect(paths.has('/registry/limit-raises.json')).toBe(true);
    expect(paths.has('/registry/dod-queue.json')).toBe(true);
    expect(paths.has('/registry/bookmakers.json')).toBe(true);
    expect(paths.has('/portal/bookmakers/')).toBe(true);
    expect(paths.has('/portal/limits/')).toBe(true);
    expect(paths.has('/portal/dod/')).toBe(true);
  });

  test('companions cross-link the partner mesh', async () => {
    const [dod, limits, books, routing, index] = await Promise.all([
      Bun.file('public/portal/dod.md').text(),
      Bun.file('public/portal/limits.md').text(),
      Bun.file('public/portal/bookmakers.md').text(),
      Bun.file('public/portal/routing.md').text(),
      Bun.file('public/portal/index.md').text(),
    ]);

    expect(dod).toContain('limits.md');
    expect(dod).toContain('bookmakers.md');
    expect(dod).toContain('routing.md');

    expect(limits).toContain('bookmakers.md');
    expect(limits).toContain('dod.md');
    expect(limits).toContain('routing.md');
    expect(limits).toContain('limit-raises.json');

    expect(books).toContain('bookmakers:bake');
    expect(books).toContain('limits.md');
    expect(books).toContain('dod.md');

    expect(routing).toContain('check:routes');
    expect(routing).toContain('public:discover:check');
    expect(routing).toContain('/api/dod');
    expect(routing).toContain('limit-raises.json');
    expect(routing).toContain('bookmakers.json');

    expect(index).toContain('bookmakers.md');
    expect(index).toContain('routing.md');
    expect(index).toContain('bookmakers.json');
  });

  test('bookmakers board links companion and related domain boards', async () => {
    const html = await Bun.file('public/portal/bookmakers/index.html').text();
    expect(html).toContain('/portal/bookmakers.md');
    expect(html).toContain('/portal/limits/');
    expect(html).toContain('/portal/routing.md');
    expect(html).toContain('/registry/bookmakers.json');
  });
});
