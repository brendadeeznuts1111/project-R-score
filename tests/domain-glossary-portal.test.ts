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
import {
  LIMIT_SURFACE_CONCEPTS,
  PORTAL_SEMANTIC_CONCEPTS,
  PORTAL_SEMANTIC_TYPES,
  PORTAL_UI_ROLES,
  validatePortalSemanticVocabulary,
} from '../lib/portal/semantic-vocabulary.ts';
import {
  orphanDomSectionHashes,
  PORTAL_GLOSSARY_SURFACES,
  validatePortalGlossarySurfaces,
} from '../lib/portal/page-glossary.ts';
import { PORTAL_PAGE_CONCEPT_DEFINITIONS } from '../lib/portal/page-concepts.ts';
import { complianceKpiGlossaryConcepts } from '../lib/operations/compliance-policy-kpis.ts';
import { regulationPolicyGlossaryConcepts } from '../lib/operations/regulation-policy-catalog.ts';
import { sportsBettingGlossaryConcepts } from '../lib/operations/sports-betting-glossary.ts';
import { sportsbookOpeningBaselineGlossaryConcepts } from '../lib/operations/sportsbook-opening-baseline.ts';
import { telegramGlossaryConcepts } from '../lib/telegram/telegram-glossary.ts';
import { partnerOpsGlossaryConcepts } from '../lib/telegram/partner-ops-glossary.ts';
import { opsViewGlossaryConcepts } from '../lib/telegram/ops-view-glossary.ts';

describe('domain glossary portal', () => {
  test('registry projection is integral, bounded, and color-normalized', async () => {
    const payload = await Bun.file('public/registry/domain-glossary.json').json();

    expect(payload).toMatchObject({
      schemaVersion: 2,
      sourceSchemaVersion: 5,
      kind: 'domain-glossary',
      path: '/registry/domain-glossary.json',
      integrityOk: true,
      sources: {
        semanticAuthority: 'Kalshi-bot/src/institutions/glossary.ts',
        portalSemanticAuthority: 'lib/portal/semantic-vocabulary.ts',
        pageGlossaryAuthority: 'lib/portal/page-glossary.ts',
        regulationPolicyAuthority: 'lib/operations/regulation-policy-catalog.ts',
        complianceKpiAuthority: 'lib/operations/compliance-policy-kpis.ts',
        sportsBettingAuthority: 'lib/operations/sports-betting-glossary.ts',
        sportsbookOpeningBaselineAuthority: 'lib/operations/sportsbook-opening-baseline.ts',
        telegramAuthority: 'lib/telegram/telegram-glossary.ts',
        telegramColorKernel: 'lib/telegram/telegram-color-kernel.ts',
        partnerOpsAuthority: 'lib/telegram/partner-ops-glossary.ts',
        partnerOpsColorKernel: 'lib/telegram/partner-ops-color-kernel.ts',
        opsViewAuthority: 'lib/telegram/ops-view-glossary.ts',
        canonicalDump: 'Kalshi-bot/research/registry/glossary-dump.json',
        colorKernel: 'public/portal/theme.jsonc',
      },
    });
    expect(payload.summary.concepts).toBe(payload.concepts.length);
    expect(payload.summary.concepts).toBeGreaterThan(140);
    expect(payload.summary.portalSemantics).toBe(
      PORTAL_SEMANTIC_CONCEPTS.length +
        regulationPolicyGlossaryConcepts().length +
        complianceKpiGlossaryConcepts().length +
        sportsBettingGlossaryConcepts().length +
        sportsbookOpeningBaselineGlossaryConcepts().length +
        telegramGlossaryConcepts().length +
        partnerOpsGlossaryConcepts().length +
        opsViewGlossaryConcepts().length
    );
    expect(payload.concepts.some(c => c.id === 'telegram.wire')).toBe(true);
    expect(payload.concepts.some(c => c.id === 'accounting.free_roll')).toBe(true);
    expect(payload.concepts.some(c => c.id === 'book.type.legal')).toBe(true);
    const conceptIds = new Set(payload.concepts.map(concept => concept.id));
    expect(
      payload.concepts.flatMap(concept =>
        concept.seeAlso.filter(relatedId => !conceptIds.has(relatedId))
      )
    ).toEqual([]);
    expect(payload.categories).toHaveLength(8);
    expect(payload.categories.every(category => /^#[0-9a-f]{6}$/i.test(category.color))).toBe(true);
    // Portal design kernel (theme.jsonc dark) — not the legacy FW Tailwind palette
    expect(payload.categories.find(c => c.id === 'market')).toMatchObject({
      colorKey: 'accent',
      color: '#58a6ff',
    });
    expect(payload.categories.find(c => c.id === 'pipeline')).toMatchObject({
      colorKey: 'red',
      color: '#f85149',
    });
    // Partner-ops concept colors win over category defaults
    expect(payload.concepts.find(c => c.id === 'partner.phase.operator_ready')?.color).toBe(
      '#3fb950'
    );
    expect(payload.concepts.find(c => c.id === 'accounting.deposit')?.color).toBe('#3fb950');
    expect(new Set(payload.concepts.map(concept => concept.id)).size).toBe(
      payload.concepts.length
    );
    expect(payload.concepts.find(concept => concept.id === 'eff_edge')).toMatchObject({
      category: 'model',
      kind: 'registry',
      unit: 'cents',
    });
    expect(payload.concepts.find(concept => concept.id === 'ui.semantic.kind')).toMatchObject({
      kind: 'ui',
      semanticType: 'classification',
      uiRole: 'chip',
      values: expect.arrayContaining(['edge-health', 'registry-bake', 'proof']),
    });
    expect(
      payload.concepts.find(concept => concept.id === 'ops.limits.influence_score')
    ).toMatchObject({
      kind: 'ui',
      semanticType: 'state',
      uiRole: 'badge',
      unit: 'percent',
    });
    expect(payload.concepts.find(concept => concept.id === 'ops.limits.limit_delta')).toMatchObject({
      unit: 'usd',
    });
    expect(
      payload.concepts.find(
        concept => concept.id === 'policy.MA.basketball.over_under'
      )
    ).toMatchObject({
      kind: 'policy',
      semanticType: 'classification',
      uiRole: 'code',
    });
    expect(
      payload.concepts.find(
        concept => concept.id === 'kpi.compliance.active_policies'
      )
    ).toMatchObject({
      kind: 'kpi',
      uiRole: 'badge',
      unit: 'count',
      format: 'integer',
    });
    expect(payload.concepts.find(concept => concept.id === 'sport.soccer')).toMatchObject({
      kind: 'sport',
      category: 'tournament',
      semanticType: 'classification',
    });
    expect(payload.concepts.find(concept => concept.id === 'market.match_winner')).toMatchObject({
      kind: 'market',
      category: 'market',
      synonyms: expect.arrayContaining(['moneyline']),
    });
    expect(payload.concepts.find(concept => concept.id === 'multi.parlay')).toMatchObject({
      kind: 'multi',
      synonyms: expect.arrayContaining(['multi', 'accumulator']),
    });
    expect(payload.concepts.find(concept => concept.id === 'cross_market.unified_price')).toMatchObject({
      kind: 'cross_market',
      unit: 'probability',
    });
    expect(payload.concepts.find(concept => concept.id === 'ops.limits.node')).toMatchObject({
      kind: 'ui',
      semanticType: 'resource',
      synonyms: expect.arrayContaining(['node_id', 'TreeNodeId']),
    });
    expect(payload.concepts.find(concept => concept.id === 'ops.limits.agent')).toMatchObject({
      kind: 'ui',
      values: expect.arrayContaining(['agent']),
      seeAlso: expect.arrayContaining(['api.agent']),
    });
    expect(payload.concepts.find(concept => concept.id === 'api.agent')).toMatchObject({
      kind: 'ui',
      seeAlso: expect.arrayContaining(['ops.limits.agent']),
    });
    expect(
      payload.concepts.find(concept => concept.id === 'ops.limits.opening_baseline')
    ).toMatchObject({
      kind: 'baseline',
      unit: 'usd',
      format: 'currency:usd',
    });
    expect(
      payload.concepts.find(concept => concept.id === 'ops.limits.baseline_tier')
    ).toMatchObject({
      kind: 'baseline',
      semanticType: 'classification',
      uiRole: 'chip',
      values: expect.arrayContaining(['1', '5']),
    });

    expect(payload.surfaces).toContainEqual({
      path: '/portal/partner-history/',
      concept: 'page.partnerHistory',
      sections: expect.objectContaining({
        'opening-baseline': 'section.openingBaseline',
      }),
    });
    expect(payload.surfaces).toContainEqual({
      path: '/portal/limits/',
      concept: 'page.limitPatterns',
      sections: expect.objectContaining({
        'account-control': 'section.accountLimitControl',
        'recent-changes': 'section.recentLimitChanges',
      }),
    });
  });

  test('portal vocabulary separates concept kind, semantic type, and UI role', () => {
    expect(() => validatePortalSemanticVocabulary()).not.toThrow();
    expect(PORTAL_SEMANTIC_TYPES).toContain('classification');
    expect(PORTAL_SEMANTIC_TYPES).toContain('presentation');
    expect(PORTAL_UI_ROLES).toContain('chip');
    expect(PORTAL_UI_ROLES).toContain('token');
    expect(new Set(PORTAL_SEMANTIC_CONCEPTS.map(concept => concept.id)).size).toBe(
      PORTAL_SEMANTIC_CONCEPTS.length
    );
    expect(() =>
      validatePortalGlossarySurfaces(
        new Set(PORTAL_SEMANTIC_CONCEPTS.map(concept => concept.id))
      )
    ).not.toThrow();
    expect(
      PORTAL_GLOSSARY_SURFACES.find(surface => surface.path === '/portal/limits/')?.concept
    ).toBe(LIMIT_SURFACE_CONCEPTS.page);
    expect(
      PORTAL_GLOSSARY_SURFACES.find(surface => surface.path === '/portal/partners/')?.sections
    ).toEqual({
      telegram: 'section.partnersTelegram',
      accounting: 'section.partnersAccounting',
      'accounts-limits': 'section.partnersAccountsLimits',
      onboard: 'section.partnersOnboard',
      deposits: 'section.partnersDeposits',
      'partner-message': 'section.partnersPartnerMessage',
      outs: 'section.partnersOuts',
      books: 'section.partnersBookDetail',
      'tag-filter-bar': 'section.partnersTags',
    });
    expect(PORTAL_GLOSSARY_SURFACES).toHaveLength(PORTAL_PAGE_CONCEPT_DEFINITIONS.length);
    expect(new Set(PORTAL_GLOSSARY_SURFACES.map(surface => surface.path))).toEqual(
      new Set(PORTAL_PAGE_CONCEPT_DEFINITIONS.map(page => page.path))
    );
  });

  test('board DOM section ids are governed by page-glossary surfaces', async () => {
    const boards = [
      '/portal/partners/',
      '/portal/account/',
      '/portal/limits/',
      '/portal/partner-history/',
    ] as const;
    for (const path of boards) {
      const file = `public${path}index.html`;
      const html = await Bun.file(file).text();
      expect(orphanDomSectionHashes(path, html), `${path} orphaned #section:`).toEqual([]);
    }
  });

  test('board uses URLPattern.hash deep links and shared portal chrome', async () => {
    const [html, script, ux] = await Promise.all([
      Bun.file('public/portal/glossary/index.html').text(),
      Bun.file('public/portal/glossary/glossary-board.js').text(),
      Bun.file('public/portal/components/glossary-ux.js').text(),
    ]);

    expect(html).toContain('Domain glossary');
    expect(html).toContain('/portal/data.js');
    expect(html).toContain('/portal/topbar.js');
    expect(html).toContain('/portal/components/footer.js');
    expect(html).toContain('/portal/glossary/glossary-board.js');
    expect(html).toContain('id="glossary-crumbs"');
    expect(html).toContain('id="glossary-category-chips"');
    expect(html).toContain('id="glossary-result-chip"');
    expect(html).toContain('id="clear-glossary-filters"');
    expect(html).toContain('id="glossary-semantic-type"');
    expect(html).toContain('role="search" aria-label="Filter domain concepts"');
    expect(html).toContain('aria-labelledby="glossary-detail-title"');
    expect(html).toContain('aria-describedby="glossary-detail-description"');
    expect(script).toContain("from '../components/glossary-ux.js'");
    expect(script).toContain('bootGlossaryUx');
    expect(script).toContain('trackGlossaryEvent');
    expect(script).toContain('glossaryPattern = new URLPattern');
    expect(script).toContain("hash: 'glossary");
    expect(script).toContain('hash.groups.concept');
    expect(script).toContain('decodeURIComponent(captured)');
    expect(script).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
    expect(script).toContain('lastTrackedConceptId !== concept.id');
    expect(script).toContain('titleLink.href = conceptHash(concept.id)');
    expect(script).toContain('deepLink.href = conceptHash(concept.id)');
    expect(script).toContain('url.searchParams.set(parameter, value)');
    expect(script).toContain("history.pushState(null, '', url)");
    expect(script).toContain("history.replaceState(history.state, '', url)");
    expect(script).toContain('syncConceptFromUrl');
    expect(script).toContain("addDetailRow(details, 'Concept kind', concept.kind)");
    expect(script).toContain("addDetailRow(details, 'Semantic type', concept.semanticType)");
    expect(script).toContain("addDetailRow(details, 'UI role', concept.uiRole)");
    expect(script).toContain("addDetailRow(details, 'Format', concept.format)");
    expect(script).not.toContain('location.hash.slice');
    expect(script).not.toContain("fetch('/api/health");
    expect(ux).toContain("const GLOSSARY_URL = '/registry/domain-glossary.json'");
    expect(ux).toContain('enhanceGlossaryTooltips');
    expect(ux).toContain('mountGlossaryAutocomplete');
    expect(ux).toContain('mountGlossaryBreadcrumbs');
    expect(ux).toContain('trackGlossaryEvent');
    expect(ux).toContain('schemaVersion !== 2');
  });

  test('shared glossary UX keeps DOM, fragments, focus, and telemetry bounded', async () => {
    const ux = await Bun.file('public/portal/components/glossary-ux.js').text();

    expect(ux).toContain("new URLPattern({ hash: 'section\\\\::section' })");
    expect(ux).toContain("new URLPattern({ hash: 'glossary\\\\::concept' })");
    expect(ux).toContain('decodeURIComponent(value)');
    expect(ux).not.toContain('location.hash.slice');
    expect(ux).not.toContain('.innerHTML');
    expect(ux).toContain("el.setAttribute('aria-describedby'");
    expect(ux).toContain("item.setAttribute('aria-selected', 'false')");
    expect(ux).toContain("input.removeAttribute('aria-activedescendant')");
    expect(ux).toContain("button.addEventListener('click'");
    expect(ux).toContain("if (event.key === 'Escape') hideTip()");
    expect(ux).toContain('const TRACK_DETAIL_KEYS = Object.freeze');
    expect(ux).toContain("'page.view': ['page', 'section']");
    expect(ux).not.toContain("'page.view': ['path'");
    expect(ux).not.toContain('detail: { name, ...detail');
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

  test('registered limits sections and rendered concept references stay aligned', async () => {
    const html = await Bun.file('public/portal/limits/index.html').text();
    const payload = await Bun.file('public/registry/domain-glossary.json').json();
    const surface = PORTAL_GLOSSARY_SURFACES.find(row => row.path === '/portal/limits/');
    expect(surface).toBeDefined();
    expect(html).toContain(`/portal/glossary/#glossary:${surface?.concept}`);
    for (const [sectionId, concept] of Object.entries(surface?.sections ?? {})) {
      expect(html).toContain(`id="${sectionId}"`);
      expect(html).toContain(`/portal/glossary/#glossary:${concept}`);
    }

    const knownConcepts = new Set(payload.concepts.map(concept => concept.id));
    const references = [
      ...html.matchAll(/#glossary:([^"'?#\s<]+)/g),
      ...html.matchAll(/data-glossary-concept="([^"]+)"/g),
    ].map(match => match[1]);
    expect(references.length).toBeGreaterThan(30);
    expect(references.filter(concept => !knownConcepts.has(concept))).toEqual([]);
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
