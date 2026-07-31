// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/http/server — Bun.serve
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/webview — Bun.WebView
import { describe, expect, test } from 'bun:test';

const CATALOG_PATH = 'public/portal/catalog/index.html';
const TAXONOMY_PATH = 'public/registry/scrape-wire-taxonomy.json';
const catalogHtml = await Bun.file(CATALOG_PATH).text();

describe('catalog scrape-wire static contract', () => {
  test('owns one stable section fragment with self-links', () => {
    expect(catalogHtml.match(/id="section:scrape-wire"/g)).toHaveLength(1);
    expect(catalogHtml.match(/href="#section:scrape-wire"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(catalogHtml).toContain(
      'id="section:scrape-wire" aria-labelledby="scrape-wire-heading" data-glossary-concept="scrape.wire"'
    );
  });

  test('maps live audit outcomes onto active, limited, and unavailable status tones', () => {
    expect(catalogHtml).toContain(
      "badge.className = `wire-audit ${report?.ok ? 'status-active' : 'status-limited'}`"
    );
    expect(catalogHtml).toContain('`audit ok · ${warnings} warning');
    expect(catalogHtml).toContain('`audit failed · ${errors} error');
    expect(catalogHtml).toContain("badge.className = 'wire-audit status-inactive'");
    expect(catalogHtml).toContain("badge.textContent = 'audit unavailable'");
    expect(catalogHtml).toContain('role="status"');
  });

  test('renders taxonomy chips as encoded glossary deep links', () => {
    expect(catalogHtml).toContain('/portal/glossary/#glossary:scrape.wire');
    expect(catalogHtml).toContain(
      'const href = `/portal/glossary/#glossary:${encodeURIComponent(conceptId)}`'
    );
    expect(catalogHtml).toContain('data-glossary-concept="${esc(conceptId)}"');
    for (const registry of [
      'bookRegistry',
      'sportRegistry',
      'leagueRegistry',
      'marketRegistry',
      'phaseRegistry',
    ]) {
      expect(catalogHtml).toContain(`payload.${registry}`);
    }
  });

  test('wires Tier 4 registry artifacts so public-discovery does not orphan them', () => {
    expect(catalogHtml).toContain('/registry/scrape-wire-taxonomy.json');
    expect(catalogHtml).toContain('/registry/scrape-wire-schema-audit.json');
    expect(catalogHtml).toContain('/registry/scraped-limits-observed.json');
    expect(catalogHtml).toContain('/registry/caesars-scrape-endpoints.json');
  });

  test('applies baked hex as --chip-color on book/sport/league chips', () => {
    expect(catalogHtml).toContain('--chip-color');
    expect(catalogHtml).toContain('wireChip(`#${row.rank} ${row.label}`, row.key, row.conceptId, \'\', row.hex || \'\')');
    expect(catalogHtml).toContain('wireChip(row.label, row.key, row.conceptId, \'\', row.hex || \'\')');
    expect(catalogHtml).toContain(
      'wireChip(row.label, row.key, row.conceptId, row.sport, row.hex || \'\')'
    );
  });
});

const WEBVIEW_AVAILABLE = typeof Bun.WebView === 'function';

describe.skipIf(!WEBVIEW_AVAILABLE)('catalog scrape-wire browser contract', () => {
  test('preserves the fragment and renders live audit + glossary chips', async () => {
    const taxonomy = await Bun.file(TAXONOMY_PATH).json();
    const expectedChipCount = [
      taxonomy.bookRegistry,
      taxonomy.sportRegistry,
      taxonomy.leagueRegistry,
      taxonomy.marketRegistry,
      taxonomy.phaseRegistry,
    ].reduce(
      (total, rows) =>
        total + (Array.isArray(rows) ? rows.filter(row => Boolean(row?.conceptId)).length : 0),
      0
    );

    const server = Bun.serve({
      port: 0,
      async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname === '/portal/catalog/' || url.pathname === '/portal/catalog/index.html') {
          return new Response(catalogHtml, {
            headers: { 'content-type': 'text/html; charset=utf-8' },
          });
        }
        if (url.pathname === '/api/catalog') {
          return Response.json({ accounts: [] });
        }
        if (url.pathname === '/registry/scrape-wire-schema-audit.json') {
          return Response.json({
            kind: 'scrape-wire-schema-audit',
            schemaVersion: 1,
            generatedAt: '2026-07-31T00:00:00.000Z',
            ok: true,
            summary: { errors: 0, warnings: 1 },
          });
        }
        const file = Bun.file(`public${url.pathname}`);
        if (await file.exists()) return new Response(file);
        return new Response('not found', { status: 404 });
      },
    });

    try {
      await using view = new Bun.WebView({ width: 900, height: 700 });
      await view.navigate(`http://127.0.0.1:${server.port}/portal/catalog/#section:scrape-wire`);

      let auditText = '';
      for (let attempt = 0; attempt < 60; attempt++) {
        auditText = String(
          await view.evaluate(`document.getElementById('wire-audit')?.textContent || ''`)
        );
        if (auditText.startsWith('audit ok')) break;
        await Bun.sleep(25);
      }

      expect(auditText).toBe('audit ok · 1 warning');
      expect(await view.evaluate(`location.hash`)).toBe('#section:scrape-wire');
      expect(
        await view.evaluate(`document.getElementById('wire-audit')?.className || ''`)
      ).toContain('status-active');
      expect(
        await view.evaluate(`document.querySelectorAll('a.wire-chip').length`)
      ).toBe(expectedChipCount);
      expect(
        await view.evaluate(`
          [...document.querySelectorAll('a.wire-chip')].every(link => {
            const concept = link.dataset.glossaryConcept;
            return Boolean(concept) &&
              link.getAttribute('href') === '/portal/glossary/#glossary:' + encodeURIComponent(concept);
          })
        `)
      ).toBe(true);
    } finally {
      server.stop(true);
    }
  });
});
