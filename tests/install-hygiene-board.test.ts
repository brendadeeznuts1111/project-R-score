/** Pure helpers for the install-hygiene portal board. */
import { describe, expect, test } from 'bun:test';
import {
  ageLabel,
  buildRecommendedActions,
  buildStatRows,
  buildTextSummary,
  cacheMeterFromSlice,
  describeFetchResultLines,
  formatLiveFetchStatus,
  INSTALL_HYGIENE_EMBED_ID,
  INSTALL_HYGIENE_SCHEMA,
  INSTALL_HYGIENE_SOURCE,
  readInstallHygieneEmbed,
  renderActionsHtml,
  renderCacheRowsSimple,
  renderVerifyCheckRows,
  statusChip,
  toneClass,
  toneFromReport,
} from '../public/portal/install-hygiene/install-hygiene-board.js';

const healthy = {
  schemaVersion: 1,
  kind: 'install-hygiene',
  generatedAt: new Date().toISOString(),
  bunVersion: '1.4.0',
  ok: true,
  installCache: {
    available: true,
    sizeHuman: '1.00 GB',
    wouldPrune: false,
  },
  npmInstall: { ok: true, violations: [] },
  installVerify: {
    ok: true,
    failed: 0,
    checks: [
      { ok: true, label: 'install policy', detail: 'linker=isolated' },
      { ok: false, label: 'broken', detail: 'nope' },
    ],
  },
};

describe('install-hygiene-board', () => {
  test('source + schema pins', () => {
    expect(INSTALL_HYGIENE_SOURCE).toBe('/registry/install-hygiene-report.json');
    expect(INSTALL_HYGIENE_SCHEMA).toBe(1);
  });

  test('toneClass maps missing → yellow', () => {
    expect(toneClass('missing')).toBe('yellow');
    expect(toneClass('green')).toBe('green');
    expect(toneClass('red')).toBe('red');
  });

  test('statusChip embeds tone class', () => {
    expect(statusChip('green', 'ok')).toContain('ih-chip--green');
    expect(statusChip('red', 'blocked')).toContain('ih-chip--red');
    expect(statusChip('yellow', 'review needed')).toContain('ih-chip--yellow');
  });

  test('toneFromReport distinguishes missing, healthy, review, and blocked states', () => {
    expect(toneFromReport(null).tone).toBe('missing');
    expect(toneFromReport({ kind: 'other' }).tone).toBe('missing');
    expect(toneFromReport({ ...healthy, schemaVersion: 99 }).tone).toBe('yellow');
    expect(toneFromReport(healthy).tone).toBe('green');
    expect(
      toneFromReport({
        ...healthy,
        ok: false,
        installCache: { ...healthy.installCache, wouldPrune: true },
      }).tone
    ).toBe('yellow');
    expect(
      toneFromReport({
        ...healthy,
        ok: false,
        npmInstall: { ok: false, violations: ['x'] },
      }).tone
    ).toBe('red');
  });

  test('buildStatRows uses tone color codes', () => {
    const rows = buildStatRows({
      ...healthy,
      ok: false,
      installCache: {
        available: true,
        sizeHuman: '3.54 GB',
        wouldPrune: true,
      },
    });
    expect(rows.find(r => r.k === 'cleanup recommended')?.tone).toBe('yellow');
    expect(rows.find(r => r.k === 'cache usage')?.tone).toBe('yellow');
    expect(rows.find(r => r.k === 'package-manager policy')?.tone).toBe('green');
    expect(rows.find(r => r.k === 'status')?.tone).toBe('yellow');
    expect(rows.find(r => r.k === 'cache usage')?.v).toBe('3.54 GB');

    const red = buildStatRows({
      ...healthy,
      ok: false,
      npmInstall: { ok: false, violations: ['hit'] },
    });
    expect(red.find(r => r.k === 'package-manager policy')?.tone).toBe('red');
    expect(red.find(r => r.k === 'status')?.tone).toBe('red');
  });

  test('renderVerifyCheckRows color-codes passed and failed checks', () => {
    const html = renderVerifyCheckRows(healthy);
    expect(html).toContain('install policy');
    expect(html).toContain('ih-chip--green');
    expect(html).toContain('ih-chip--red');
    expect(html).toContain('ih-row--red');
    expect(html).toContain('broken');
  });

  test('renderCacheRowsSimple highlights cleanup and path mismatches', () => {
    const html = renderCacheRowsSimple({
      available: true,
      sizeHuman: '3.5 GB',
      wouldPrune: true,
      pruneReason: 'over',
      bunPmCacheMismatch: 'path drift',
    });
    expect(html).toContain('ih-row--yellow');
    expect(html).toContain('ih-chip--yellow');
    expect(html).toContain('ih-chip--green'); // available
  });

  test('ageLabel handles missing and recent', () => {
    expect(ageLabel(null)).toBe('—');
    expect(ageLabel(new Date().toISOString())).toBe('just now');
  });

  test('readInstallHygieneEmbed parses the embedded report without network access', () => {
    expect(INSTALL_HYGIENE_EMBED_ID).toBe('install-hygiene-embed');
    const fakeDoc = {
      getElementById(id: string) { // brand-ok — DOM element id, not domain *Id
        if (id !== INSTALL_HYGIENE_EMBED_ID) return null;
        return { textContent: JSON.stringify(healthy) };
      },
    };
    const got = readInstallHygieneEmbed(fakeDoc as unknown as Document);
    expect(got?.kind).toBe('install-hygiene');
    expect(got?.ok).toBe(true);
    expect(readInstallHygieneEmbed(null)).toBeNull();
    expect(
      readInstallHygieneEmbed({
        getElementById: () => ({ textContent: 'not-json' }),
      } as unknown as Document)
    ).toBeNull();
  });

  test('board HTML ships a structured embedded report and clear reading order', async () => {
    const html = await Bun.file('public/portal/install-hygiene/index.html').text();
    expect(html).toContain(`id="${INSTALL_HYGIENE_EMBED_ID}"`);
    expect(html).toMatch(/"kind"\s*:\s*"install-hygiene"/);
    expect(html).toContain('ih-cache-meter');
    expect(html).toContain('ih-actions');
    expect(html).toContain('embedded snapshot');
    expect(html.indexOf('Recommended actions')).toBeLessThan(
      html.indexOf('Install-cache evidence')
    );
  });

  test('buildRecommendedActions adds prune CLIs when over threshold', () => {
    const base = buildRecommendedActions(healthy);
    expect(base.some(a => a.cli.includes('bake:install-hygiene'))).toBe(true);
    const over = buildRecommendedActions({
      ...healthy,
      ok: false,
      installCache: {
        ...healthy.installCache,
        wouldPrune: true,
        pruneReason: 'over threshold',
        bunPmCacheMismatch: 'path drift',
      },
    });
    expect(over.some(a => a.cli === 'bun run install:cache:lifecycle')).toBe(true);
    expect(over.some(a => a.cli === 'bun run install:cache:prune' && a.tone === 'yellow')).toBe(
      true
    );
    expect(over.some(a => a.cli.includes('check-bun-pm-cache'))).toBe(true);
  });

  test('cacheMeterFromSlice tones ratio bands', () => {
    expect(cacheMeterFromSlice(null)).toBeNull();
    const under = cacheMeterFromSlice({
      sizeBytes: 1e9,
      thresholdBytes: 2e9,
      sizeHuman: '1 GB',
      thresholdHuman: '2 GB',
    });
    expect(under?.tone).toBe('green');
    expect(under?.pct).toBe(50);
    const over = cacheMeterFromSlice({
      sizeBytes: 3e9,
      thresholdBytes: 2e9,
      sizeHuman: '3 GB',
      thresholdHuman: '2 GB',
    });
    expect(over?.tone).toBe('yellow');
    const way = cacheMeterFromSlice({
      sizeBytes: 4e9,
      thresholdBytes: 2e9,
      sizeHuman: '4 GB',
      thresholdHuman: '2 GB',
    });
    expect(way?.tone).toBe('yellow');
  });

  test('renderActionsHtml emits copy-cli buttons', () => {
    const html = renderActionsHtml(buildRecommendedActions(healthy));
    expect(html).toContain('copy-cli');
    expect(html).toContain('bake:install-hygiene');
  });

  test('buildTextSummary is copy-friendly plain text', () => {
    const text = buildTextSummary(healthy);
    expect(text).toContain('install hygiene');
    expect(text).toContain('healthy');
    expect(text).toContain('Bun runtime: 1.4.0');
    expect(text).toContain('installation verification: passed');
    expect(buildTextSummary(null)).toContain('missing report');
  });

  test('formatLiveFetchStatus surfaces kind/status for failed live refresh', () => {
    expect(
      formatLiveFetchStatus({ ok: false, kind: 'timeout', error: 'aborted' })
    ).toContain('timeout');
    expect(
      formatLiveFetchStatus({ ok: false, kind: 'http', status: 404, error: 'HTTP 404' })
    ).toContain('404');
    expect(
      formatLiveFetchStatus({ ok: false, kind: 'timeout', error: 'aborted' })
    ).toContain('embedded snapshot');
    expect(formatLiveFetchStatus({ ok: true })).toBe('');
  });

  test('describeFetchResultLines formats ok and error results', () => {
    const ok = describeFetchResultLines({
      ok: true,
      status: 200,
      contentType: 'application/json',
      data: { kind: 'install-hygiene', generatedAt: 't', ok: false },
    });
    expect(ok.some(l => l.includes('200 OK'))).toBe(true);
    expect(ok.some(l => l.includes('install-hygiene'))).toBe(true);
    const bad = describeFetchResultLines({ ok: false, kind: 'timeout', error: 'aborted' });
    expect(bad.some(l => l.includes('timeout'))).toBe(true);
  });
});
