// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import { HEALTH_FIELD_CONCEPTS } from '../lib/portal/semantic-vocabulary.ts';

describe('portal health page', () => {
  test('live checks separate transport fields and use the tone token contract', async () => {
    const [html, script] = await Promise.all([
      Bun.file('public/portal/health/index.html').text(),
      Bun.file('public/portal/health-page.js').text(),
    ]);

    for (const conceptId of Object.values(HEALTH_FIELD_CONCEPTS)) {
      expect(html).toContain(`/portal/glossary/#glossary:${conceptId}`);
    }
    expect(html).toMatch(/>Hostname<\/a\s*>/);
    expect(html).toContain("[data-tone='ok']");
    expect(html).toContain('--tone-color');
    expect(html).not.toMatch(/\.tone-badge\s*\{\s*--tone-color/);
    expect(html).not.toMatch(/\.health-card\s*\{\s*--tone-color/);
    expect(script).toContain('function targetForProbe(probe)');
    expect(script).toContain("url.port || (url.protocol === 'https:' ? '443' : '80')");
    expect(script).toContain('function toneBadge(tone, label)');
    expect(script).toContain('function semanticValue(field, label, className');
    expect(script).toContain('const HEALTH_FIELD_CONCEPTS = {');
    expect(script).toContain('data-tone="${esc(r.tone)}"');
    expect(script).not.toContain('live-row-ok');
  });

  test('summary cards are grouped, versioned, and resource mapped', async () => {
    const script = await Bun.file('public/portal/health-page.js').text();

    expect(script).toContain('const CARD_RESOURCES = {');
    expect(script).toContain('function cardGroup(id, title, description, cards)');
    expect(script).toMatch(/cardGroup\(\s*'runtime',\s*'Runtime'/);
    expect(script).toMatch(/cardGroup\(\s*'artifacts',\s*'Packages & artifacts'/);
    expect(script).toMatch(/cardGroup\(\s*'verification',\s*'Verification'/);
    expect(script).toMatch(/cardGroup\(\s*'operations',\s*'Operations'/);
    expect(script).toContain('class="health-card-version"');
    expect(script).toContain('class="health-resource-links"');
    expect(script).toContain('>Wiki</a>');
    expect(script).toContain('>Package</a>');
    expect(script).toContain('>Artifact</a>');
  });

  test('keeps operator signal visible and archives verbose evidence by default', async () => {
    const [html, script] = await Promise.all([
      Bun.file('public/portal/health/index.html').text(),
      Bun.file('public/portal/health-page.js').text(),
    ]);

    expect(html).toContain('id="evidence-archive-heading"');
    expect(html).toContain('class="health-action-menu"');
    expect(html).toContain('id="live-evidence"');
    expect(html).toContain('id="live-archive-summary"');
    expect(html).toContain('id="limit-changes-evidence"');
    expect(html).toMatch(/<details class="archive-detail hidden" id="routing-section">/);
    expect(html).not.toMatch(/<details class="archive-detail[^>]*\sopen(?:\s|>)/);
    expect(script).toContain("const archiveSummary = $('live-archive-summary')");
    expect(script).toContain("archiveSummary.dataset.tone = counts.bad ? 'bad'");
  });

  test('exposes Bun fetch protocol and transport proof without crossing the browser boundary', async () => {
    const [html, script] = await Promise.all([
      Bun.file('public/portal/health/index.html').text(),
      Bun.file('public/portal/health-page.js').text(),
    ]);

    expect(html).toContain('id="fetch-protocol-evidence"');
    expect(html).toContain('id="fetch-protocol-body"');
    expect(html).toContain('id="fetch-transport-body"');
    expect(html).toContain('The browser portal remains');
    expect(script).toContain("fetchJson('/registry/release-features.json')");
    expect(script).toContain("fetchJson('/registry/networking-proof.json')");
    expect(script).toContain('function renderFetchProtocolEvidence(release, networking)');
    expect(script).toContain("key.startsWith('fetch protocol (')");
    expect(script).toContain("String(row?.actual || '').startsWith('skipped')");
    expect(script).toContain("summary.dataset.tone = failed ? 'bad' : skipped ? 'warn'");
    expect(script).toContain('BUN_CONFIG_MAX_HTTP_REQUESTS');
    expect(script).toContain('BUN_CONFIG_VERBOSE_FETCH');
  });
});
