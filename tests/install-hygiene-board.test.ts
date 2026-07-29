/**
 * Pure helpers for the install-hygiene portal board.
 */
import { describe, expect, test } from 'bun:test';
import {
  ageLabel,
  buildStatRows,
  INSTALL_HYGIENE_SCHEMA,
  INSTALL_HYGIENE_SOURCE,
  renderVerifyCheckRows,
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

  test('toneFromReport missing / schema / healthy / attention / fail', () => {
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

  test('buildStatRows flags prune and counts', () => {
    const rows = buildStatRows({
      ...healthy,
      ok: false,
      installCache: {
        available: true,
        sizeHuman: '3.54 GB',
        wouldPrune: true,
      },
    });
    expect(rows.find(r => r.k === 'would prune')?.bad).toBe(true);
    expect(rows.find(r => r.k === 'cache size')?.v).toBe('3.54 GB');
  });

  test('renderVerifyCheckRows marks failures', () => {
    const html = renderVerifyCheckRows(healthy);
    expect(html).toContain('install policy');
    expect(html).toContain('class="fail"');
    expect(html).toContain('broken');
  });

  test('ageLabel handles missing and recent', () => {
    expect(ageLabel(null)).toBe('—');
    expect(ageLabel(new Date().toISOString())).toBe('just now');
  });
});
