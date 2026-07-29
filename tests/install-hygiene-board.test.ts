/**
 * Pure helpers for the install-hygiene portal board (color-coded tones).
 */
import { describe, expect, test } from 'bun:test';
import {
  ageLabel,
  buildStatRows,
  INSTALL_HYGIENE_SCHEMA,
  INSTALL_HYGIENE_SOURCE,
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
    expect(statusChip('red', 'fail')).toContain('ih-chip--red');
    expect(statusChip('yellow', 'attention')).toContain('ih-chip--yellow');
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
    expect(rows.find(r => r.k === 'would prune')?.tone).toBe('yellow');
    expect(rows.find(r => r.k === 'cache size')?.tone).toBe('yellow');
    expect(rows.find(r => r.k === 'npm install')?.tone).toBe('green');
    expect(rows.find(r => r.k === 'overall')?.tone).toBe('yellow');
    expect(rows.find(r => r.k === 'cache size')?.v).toBe('3.54 GB');

    const red = buildStatRows({
      ...healthy,
      ok: false,
      npmInstall: { ok: false, violations: ['hit'] },
    });
    expect(red.find(r => r.k === 'npm install')?.tone).toBe('red');
    expect(red.find(r => r.k === 'overall')?.tone).toBe('red');
  });

  test('renderVerifyCheckRows color-codes pass/fail chips', () => {
    const html = renderVerifyCheckRows(healthy);
    expect(html).toContain('install policy');
    expect(html).toContain('ih-chip--green');
    expect(html).toContain('ih-chip--red');
    expect(html).toContain('ih-row--red');
    expect(html).toContain('broken');
  });

  test('renderCacheRowsSimple tones prune and mismatch', () => {
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
});
