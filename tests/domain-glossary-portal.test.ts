// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import { PORTAL_OVERFLOW_NAV, PORTAL_FOOTER_LINKS } from '../lib/portal/chrome-catalog.ts';
import { PORTAL_DASHBOARD_ROUTES } from '../lib/http/public-routes.ts';
import {
  PORTAL_HTML_ROUTES,
  PORTAL_MARKDOWN_SLUGS,
  PORTAL_TRAILING_SLASH_SOURCES,
} from '../lib/http/portal-route-manifest.ts';
import { PORTAL_WEAVE_ARTIFACTS, PORTAL_WEAVE_SURFACES } from '../lib/http/portal-weave.ts';

describe('domain glossary portal', () => {
  test('registry projection is integral, bounded, and color-normalized', async () => {
    const payload = await Bun.file('public/registry/domain-glossary.json').json();

    expect(payload).toMatchObject({
      schemaVersion: 1,
      kind: 'domain-glossary',
      path: '/registry/domain-glossary.json',
      integrityOk: true,
      sources: {
        semanticAuthority: 'Kalshi-bot/src/institutions/glossary.ts',
        canonicalDump: 'Kalshi-bot/research/registry/glossary-dump.json',
        colorKernel: 'lib/theme/colors.ts',
      },
    });
    expect(payload.summary.concepts).toBe(payload.concepts.length);
    expect(payload.summary.concepts).toBeGreaterThan(80);
    expect(payload.categories).toHaveLength(8);
    expect(payload.categories.every(category => /^#[0-9a-f]{6}$/i.test(category.color))).toBe(true);
    expect(new Set(payload.concepts.map(concept => concept.id)).size).toBe(
      payload.concepts.length
    );
    expect(payload.concepts.find(concept => concept.id === 'eff_edge')).toMatchObject({
      category: 'model',
      kind: 'registry',
      unit: 'cents',
    });
  });

  test('board uses URLPattern.hash deep links and shared portal chrome', async () => {
    const [html, script] = await Promise.all([
      Bun.file('public/portal/glossary/index.html').text(),
      Bun.file('public/portal/glossary/glossary-board.js').text(),
    ]);

    expect(html).toContain('Domain glossary');
    expect(html).toContain('/portal/data.js');
    expect(html).toContain('/portal/topbar.js');
    expect(html).toContain('/portal/components/footer.js');
    expect(html).toContain('/portal/glossary/glossary-board.js');
    expect(html).toContain('id="glossary-category-chips"');
    expect(html).toContain('id="glossary-result-chip"');
    expect(html).toContain('id="clear-glossary-filters"');
    expect(script).toContain("const GLOSSARY_URL = '/registry/domain-glossary.json'");
    expect(script).toContain("new URLPattern({ hash: 'glossary\\\\::concept' })");
    expect(script).toContain('hash.groups.concept');
    expect(script).toContain('titleLink.href = conceptHash(concept.id)');
    expect(script).toContain('deepLink.href = conceptHash(concept.id)');
    expect(script).toContain('url.searchParams.set(parameter, value)');
    expect(script).toContain("history.pushState(null, '', url)");
    expect(script).toContain("history.replaceState(history.state, '', url)");
    expect(script).toContain('syncConceptFromUrl');
    expect(script).not.toContain('location.hash.slice');
    expect(script).not.toContain("fetch('/api/health");
  });

  test('route, chrome, and weave make the glossary discoverable', () => {
    expect(PORTAL_HTML_ROUTES).toContain('/portal/glossary/');
    expect(PORTAL_TRAILING_SLASH_SOURCES).toContain('/portal/glossary');
    expect(PORTAL_MARKDOWN_SLUGS).toContain('glossary');
    expect(PORTAL_DASHBOARD_ROUTES).toContainEqual(
      expect.objectContaining({ path: '/portal/glossary/' })
    );
    expect(PORTAL_OVERFLOW_NAV).toContainEqual(
      expect.objectContaining({ id: 'glossary', href: '/portal/glossary/' })
    );
    expect(PORTAL_FOOTER_LINKS).toContainEqual(
      expect.objectContaining({ label: 'Glossary', href: '/portal/glossary/' })
    );
    expect(PORTAL_WEAVE_SURFACES).toContainEqual(
      expect.objectContaining({ id: 'glossary', href: '/portal/glossary/' })
    );
    expect(PORTAL_WEAVE_ARTIFACTS).toContainEqual(
      expect.objectContaining({ href: '/registry/domain-glossary.json' })
    );
  });

  test('committed projection stays aligned with the canonical dump', async () => {
    const proc = Bun.spawn(['bun', 'tools/domain-glossary.ts', '--check'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    expect(stderr).toBe('');
    expect(exitCode, stdout).toBe(0);
  });
});
