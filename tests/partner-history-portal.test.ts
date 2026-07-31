import { describe, expect, test } from 'bun:test';

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
    expect(html).toContain('id="filter-reset"');
    expect(html).toContain('role="tablist" aria-label="Partner history views"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-labelledby="tab-partner"');
    expect(html).toMatch(/id="panel-partner"[\s\S]*?hidden/);
    expect(html).toContain("const tabPattern = new URLPattern({ hash: 'tab\\\\::tab' })");
    expect(html).toContain("account: 'account'");
    expect(html).toContain("sportsbook: 'sportsbook'");
    expect(html).toContain('history.replaceState(null, \'\', url)');
    expect(html).toContain("event.key === 'ArrowRight'");
  });

  test('joins account context and keeps metrics and exports on the filtered view', async () => {
    const html = await Bun.file(HISTORY_HTML).text();

    expect(html).toContain('opsData?.limitPatterns?.nodePatterns');
    expect(html).toContain('pattern?.node_name');
    expect(html).toContain("change.context_proof?.valid === true");
    expect(html).toContain('deltas are versus prior high-water');
    expect(html).toContain('card.data = { ...opsData, limitChanges: filteredData }');
    expect(html).toContain('const rows = filteredData.map(change => [');
    expect(html).toContain('JSON.stringify(filteredData, null, 2)');
    expect(html).toContain('/portal/limits/#account:${encodeURIComponent(accountId)}');
    expect(html).toContain('id="proof-ct"');
    expect(html).toContain('id="sportsbook-breakdown"');
  });

  test('reusable limit card applies time windows and avoids invented predictions', async () => {
    const source = await Bun.file(LIMIT_CARD).text();

    expect(source).toContain("'sportsbook'");
    expect(source).toContain("'direction'");
    expect(source).toContain('c.increased_at * 1000 < since');
    expect(source).toContain('.sort((left, right) => (right.increased_at ?? 0) - (left.increased_at ?? 0))');
    expect(source).toContain("filtered.some(c => c.predicted_raise_prob != null)");
    expect(source).toContain('hasPredictions ? \'Prediction\' : \'\'');
    expect(source).toContain('aria-label="Filtered partner limit changes"');
    expect(source).toContain('Prior high-water');
    expect(source).toContain("netDelta < 0 ? '-' : ''");
  });

  test('uses existing glossary concepts for history sections and evidence', async () => {
    const html = await Bun.file(HISTORY_HTML).text();
    expect(html).toContain('data-glossary-concept="section.recentLimitChanges"');
    expect(html).toContain('data-glossary-concept="section.perNodeBreakdown"');
    expect(html).toContain('data-glossary-concept="ops.limits.evidence_trace"');
    expect(html).toContain('data-glossary-concept="ops.limits.account"');
  });
});
