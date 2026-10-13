import { expect, test } from 'bun:test';
import { runInNewContext } from 'node:vm';
import { htmlShell } from '../scripts/search-benchmark-dashboard.ts';

const hostile = '<img src=x onerror="alert(1)">\'&';
function shell(domain = 'example.invalid', r2Base = 'https://example.invalid') {
  return htmlShell(
    { port: 0, dir: '.', r2Prefix: 'test', cacheTtlMs: 0, domain, r2Base, hotReload: false, cookies: false },
    { repoUrl: 'https://example.invalid/repo', repoBranchUrl: 'https://example.invalid/repo/tree/test', branchName: 'test', commitShort: 'test', commitFull: 'unknown' },
    { domain, accountId: '', lastSnapshot: '', prefMetric: 'latency', prefSource: 'local' }
  );
}

// Execute the exact shipped browser function bodies, without network or boot side effects.
function panels() {
  const script = [...shell().matchAll(/<script>([\s\S]*?)<\/script>/g)][0]?.[1] ?? '';
  const slice = (start: string, end: string) => {
    const offset = script.indexOf(start);
    expect(offset).toBeGreaterThan(-1);
    const limit = script.indexOf(end, offset);
    expect(limit).toBeGreaterThan(offset);
    return script.slice(offset, limit);
  };
  const elements = {
    domainHealthEl: { innerHTML: '' }, domainRegistryStatusEl: { innerHTML: '' },
    inventoryEl: { innerHTML: '' }, publishEl: { innerHTML: '' }, loopStatusEl: { innerHTML: '' },
    notice: { innerHTML: '' },
  };
  const context = {
    ...elements,
    WARNING_STATUS_LEVELS: {},
    statusPill: () => '<span>status</span>', statusBadge: () => '<span>status</span>',
    setReportNotice: (html: string) => { elements.notice.innerHTML = html; },
    clearReportNotice: () => { elements.notice.innerHTML = ''; },
  };
  const exports = runInNewContext(
    slice('const attrEscape =', 'const emptyState =') +
    slice('const warningBadgeClass =', 'const strictP95FromSnapshot =') +
    slice('const renderLoopStatus =', 'const renderRssDom =') +
    '({renderLoopStatus, renderPublish, renderInventory, renderDomainHealth, renderDomainRegistryStatus});',
    context
  );
  return { elements, ...exports };
}

function noInjectedMarkup(html: string) {
  expect(html).not.toContain('<img');
  expect(html).toContain('&lt;img');
  expect(html).toContain('&quot;');
  expect(html).toContain('&#39;');
  expect(html).toContain('&amp;');
}

test('domain and registry API errors stay text', () => {
  const p = panels();
  p.renderDomainHealth({ error: hostile });
  p.renderDomainRegistryStatus({ error: hostile });
  noInjectedMarkup(p.elements.domainHealthEl.innerHTML);
  noInjectedMarkup(p.elements.domainRegistryStatusEl.innerHTML);
});

test('domain health text, tooltip attributes, status labels and CSS color cannot inject markup', () => {
  const p = panels();
  p.renderDomainHealth({
    domain: hostile, zone: hostile, accountId: hostile, source: hostile,
    storage: { bucket: hostile, endpoint: hostile, domainPrefix: hostile, sampleKeys: { health: hostile } },
    domainRegistry: { mappingSource: hostile, registryVersion: hostile, matchedDomain: hostile, requiredHeader: hostile, tokenEnvVar: hostile },
    health: { dns: { status: hostile }, cookie: { enabled: true, status: hostile, detail: hostile, unicodeBar: hostile, hexBadge: '#fff; background:url(https://attacker.invalid)' } },
    latest: [{ type: hostile, key: hostile, lastModified: hostile, exists: true }],
    subdomains: [{ subdomain: hostile, fullDomain: hostile, urlFragment: hostile, path: hostile, dnsRecords: [hostile], dnsSource: hostile, lastCheckedAt: hostile }],
    cookieTelemetryWrite: { reason: hostile },
  });
  const html = p.elements.domainHealthEl.innerHTML;
  noInjectedMarkup(html);
  expect(html).not.toContain('background:url(');
  expect(html).toContain('background:#666666');
  expect(html).toContain('reason=<code>&lt;img');
  expect(html).toContain('title="&lt;img src=x onerror=&quot;alert(1)&quot;');
  p.renderDomainHealth({ domain: 'example.invalid', health: { cookie: { hexBadge: '#00aAFF' } } });
  expect(p.elements.domainHealthEl.innerHTML).toContain('background:#00aAFF');
});

test('registry rows escape external fields and preserve trusted badge and empty-row markup', () => {
  const p = panels();
  p.renderDomainRegistryStatus({ registry: { path: hostile, version: hostile, domains: [{ domain: hostile, tokenEnvVar: hostile, tokenPresent: true, tokenSource: hostile, bucket: hostile, requiredHeader: hostile }] }, search: { latestSnapshotId: hostile, queryPack: hostile }, generatedAt: hostile });
  const html = p.elements.domainRegistryStatusEl.innerHTML;
  noInjectedMarkup(html);
  expect(html).toContain('<span class="badge status-good">present</span>');
  p.renderDomainRegistryStatus({ registry: { domains: [] } });
  expect(p.elements.domainRegistryStatusEl.innerHTML).toContain('<tr><td colspan="6">No domain registry entries.</td></tr>');
});

test('inventory, publish and loop report fields escape text without changing counts or layout', () => {
  const p = panels();
  p.renderInventory({ snapshotId: hostile, source: hostile, items: [{ name: hostile, category: hostile, size: 0, exists: true, lastModified: hostile }] });
  noInjectedMarkup(p.elements.inventoryEl.innerHTML);
  expect(p.elements.inventoryEl.innerHTML).toContain('<td>0</td>');
  p.renderPublish({ id: hostile, bucket: hostile, warnings: [hostile], uploads: [{ key: hostile, elapsedMs: 12, attempts: 2 }], delta: { value: hostile } });
  noInjectedMarkup(p.elements.publishEl.innerHTML);
  expect(p.elements.publishEl.innerHTML).toContain('<td>12.00</td><td>2</td>');
  p.renderLoopStatus({ latestSnapshotId: hostile, loopClosedReason: hostile, freshness: { latestSnapshotIdSeen: hostile }, stages: [{ id: 'status_freshness', status: 'fail', reason: hostile, evidence: [hostile] }, { id: hostile, status: hostile }] });
  noInjectedMarkup(p.elements.loopStatusEl.innerHTML);
  noInjectedMarkup(p.elements.notice.innerHTML);
  expect(p.elements.loopStatusEl.innerHTML).toContain('<table>');
});

test('shell JSON cannot terminate its script and preserves original configuration values', () => {
  const payload = '</script><img src=x onerror=alert(1)>';
  const html = shell(payload, payload);
  expect(html.match(/<script>/g)).toHaveLength(1);
  expect(html.match(/<\/script>/g)).toHaveLength(1);
  expect(html).not.toContain('<img');
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0]?.[1] ?? '';
  const literal = script.match(/const DEFAULT_DOMAIN = (.*);/)?.[1] ?? '';
  expect(runInNewContext(literal)).toBe(payload);
  expect(() => new Bun.Transpiler({ loader: 'js' }).transformSync(script)).not.toThrow();
});
