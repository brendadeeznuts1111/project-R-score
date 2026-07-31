// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import { PARTNER_HISTORY_GLOSSARY } from '../public/portal/partner-history/glossary-map.js';

const HISTORY_HTML = 'public/portal/partner-history/index.html';
const LIMIT_CARD = 'public/portal/components/limit-changes-card.js';

describe('partner-history portal', () => {
  test('exposes accessible, restorable history filters and tabs', async () => {
    const html = await Bun.file(HISTORY_HTML).text();

    expect(html).toContain('role="search"');
    expect(html).toContain('aria-label="Partner history filters"');
    expect(html).toContain('id="sportsbook-select"');
    expect(html).toContain('id="direction-select"');
    expect(html).toContain('id="hours-select"');
    expect(html).toContain('<option value="720"');
    expect(html).toContain('id="filter-reset"');
    expect(html).toContain('role="tablist" aria-label="Partner history views"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-labelledby="tab-partner"');
    expect(html).toMatch(/id="panel-partner"[\s\S]*?hidden/);
    expect(html).toContain("const tabPattern = new URLPattern({ hash: 'tab\\\\::tab' })");
    expect(html).toContain("account: 'account'");
    expect(html).toContain("partner: 'partner'");
    expect(html).toContain("sportsbook: 'sportsbook'");
    expect(html).toContain('history.replaceState(null, \'\', url)');
    expect(html).toContain("event.key === 'ArrowRight'");
    expect(html).toContain('resolveAccountFilter');
    expect(html).toContain('partnerCodeFromRef');
    expect(html).toContain('id="history-hub-links"');
    expect(html).toContain('href="/portal/partners/"');
  });

  test('joins account context and keeps metrics and exports on the filtered view', async () => {
    const html = await Bun.file(HISTORY_HTML).text();

    expect(html).toContain('opsData?.limitPatterns?.nodePatterns');
    expect(html).toContain('pattern?.node_name');
    expect(html).toContain("change.context_proof?.valid === true");
    expect(html).toContain('PARTNER_HISTORY_GLOSSARY.activeFilters');
    expect(html).toContain('PARTNER_HISTORY_GLOSSARY.deltas');
    expect(html).toContain('PARTNER_HISTORY_GLOSSARY.highWater');
    expect(html).toContain('card.data = { ...opsData, limitChanges: filteredData }');
    expect(html).toContain('const rows = filteredData.map(change => [');
    expect(html).toContain('JSON.stringify(filteredData, null, 2)');
    expect(html).toContain('/portal/limits/#account:${encodeURIComponent(accountId)}');
    expect(html).toContain('/portal/partners/#partner/${encodeURIComponent(partnerCode)}');
    expect(html).toContain('id="coverage-ct"');
    expect(html).toContain('id="sportsbook-breakdown"');
    expect(html).toContain('filteredData = [];');
    expect(html).toContain('No account activity is present.');
    expect(html).toContain('No sportsbook activity is present.');
    expect(html).toContain('opsData?.limitPatterns?.audit?.coveragePct');
    expect(html).not.toContain('const proofCount = filteredData.filter');
  });

  test('reusable limit card applies time windows and avoids invented predictions', async () => {
    const source = await Bun.file(LIMIT_CARD).text();

    expect(source).toContain("'sportsbook'");
    expect(source).toContain("'direction'");
    expect(source).toContain('c.increased_at * 1000 < since');
    expect(source).toContain('.sort((left, right) => (right.increased_at ?? 0) - (left.increased_at ?? 0))');
    expect(source).toContain('filtered.some(c => c.predicted_raise_prob != null)');
    expect(source).toContain('G.predictionColumn');
    expect(source).toContain('aria-label="Filtered partner limit changes"');
    expect(source).toContain('Prior limit');
    expect(source).toContain('Market type');
    expect(source).toContain('Structure / phase');
    expect(source).toContain('Sportsbook');
    expect(source).toContain('Observed');
    expect(source).toContain('structurePhaseCell');
    expect(source).toContain('G.accountColumn');
    expect(source).toContain('G.priorLimitColumn');
    expect(source).toContain('G.marketTypeColumn');
    expect(source).toContain('G.structureColumn');
    expect(source).toContain('G.phaseColumn');
    expect(source).toContain('G.factorsColumn');
    expect(source).toContain('G.evidenceColumn');
    expect(source).toContain('G.observedColumn');
    expect(source).not.toContain('Prior high-water');
    expect(source).toContain("netDelta > 0 ? '+' : '−'");
    expect(source).toContain('const loadVersion = ++this._loadVersion');
    expect(source).toContain('if (loadVersion !== this._loadVersion) return');
    expect(source).toContain('this._loadVersion += 1');
  });

  test('uses existing glossary concepts for history sections and evidence', async () => {
    const html = await Bun.file(HISTORY_HTML).text();
    expect(html).toContain('data-glossary-concept="section.recentLimitChanges"');
    expect(html).toContain('data-glossary-concept="section.perNodeBreakdown"');
    expect(html).toContain('data-glossary-concept="ops.limits.data_coverage"');
    expect(html).toContain('data-glossary-concept="ops.limits.account"');
  });

  test('governs every chrome mapping with a registered canonical concept', async () => {
    const registry = await Bun.file('public/registry/domain-glossary.json').json();
    const knownIds = new Set(
      (registry.concepts ?? []).map((concept: { id: unknown }) => String(concept.id))
    );

    for (const concept of Object.values(PARTNER_HISTORY_GLOSSARY)) {
      expect(knownIds.has(concept), concept).toBe(true);
    }
  });

  test('glossary-governs the reusable card title, summaries, actions, and columns', async () => {
    const source = await Bun.file(LIMIT_CARD).text();

    expect(source).toContain('PARTNER_HISTORY_GLOSSARY');
    expect(source).toContain('G.limitChanges');
    expect(source).toContain('G.csv');
    expect(source).toContain('G.visibleChanges');
    expect(source).toContain('G.netChange');
    expect(source).toContain('G.avgInfluence');
    expect(source).toContain('G.directionColumn');
    expect(source).toContain('G.observedColumn');
    expect(source).toContain('data-glossary-concept="${concept}"');
  });

  test('rejects parallel ops.field / empty / toast glossary namespaces in chrome', async () => {
    const html = await Bun.file(HISTORY_HTML).text();
    const card = await Bun.file(LIMIT_CARD).text();
    const chrome = `${html}\n${card}`;
    for (const prefix of [
      'ops.field.',
      'ops.empty.',
      'ops.toast.',
      'ops.shortcut.',
      'ops.sort.',
      'ops.panel.',
      'ops.filter.',
      'ops.metric.',
      'ui.pagination.',
    ]) {
      expect(chrome.includes(prefix), prefix).toBe(false);
    }
  });
});
