// @see https://bun.com/docs/test/index#run-tests
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  INSTALL_HYGIENE_STALE_AFTER_MS,
  loadInstallHygieneMonitoringSlice,
  loadInstallHygieneSummarySliceSync,
  parseInstallHygieneReport,
  projectInstallHygieneReport,
  toInstallHygieneOpsSlice,
} from '../lib/monitoring/install-hygiene-slice.ts';

const cleanup: string[] = [];

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map(path => rm(path, { recursive: true, force: true })));
});

function validReport(generatedAt = new Date().toISOString()) {
  return {
    schemaVersion: 1,
    kind: 'install-hygiene',
    generatedAt,
    bunVersion: '1.4.0',
    bunRevision: 'abc123',
    installCache: {
      available: true,
      sizeBytes: 1024,
      sizeHuman: '1.00 KB',
      thresholdBytes: 2048,
      thresholdHuman: '2.00 KB',
      wouldPrune: false,
      pruneReason: 'under threshold',
      cacheDir: '/tmp/cache',
      bunPmCachePath: '/tmp/cache',
      bunPmCacheMismatch: null,
      collectedAt: generatedAt,
    },
    npmInstall: {
      ok: true,
      violations: [],
      violationCount: 0,
      allowedPaths: ['tools/bun-doc-refs.ts'],
    },
    installVerify: {
      ok: true,
      failed: 0,
      strict: false,
      dryRun: true,
      checks: [{ ok: true, label: 'install policy', detail: 'isolated linker' }],
    },
    ok: true,
  };
}

describe('install-hygiene registry slice', () => {
  test('strict parser accepts the canonical wire shape', () => {
    expect(parseInstallHygieneReport(validReport())?.kind).toBe('install-hygiene');
  });

  test('cache pressure and path drift are warnings, not hard errors', () => {
    const report = validReport();
    report.installCache.wouldPrune = true;
    report.installCache.bunPmCacheMismatch = 'path drift';
    report.ok = false;

    const slice = projectInstallHygieneReport(report);
    expect(slice).toMatchObject({
      available: true,
      ok: true,
      warnings: 2,
      errors: 0,
      stale: false,
      reportOk: false,
      cacheWouldPrune: true,
      cachePathMismatch: true,
    });
    expect(toInstallHygieneOpsSlice(slice)).toEqual({
      available: true,
      ok: true,
      warnings: 2,
      errors: 0,
      stale: false,
      path: '/registry/install-hygiene-report.json',
    });
  });

  test('npm policy and install:verify failures are hard errors', () => {
    const report = validReport();
    report.npmInstall = {
      ...report.npmInstall,
      ok: false,
      violations: ['package.json:scripts.install'],
      violationCount: 1,
    };
    report.installVerify = {
      ...report.installVerify,
      ok: false,
      failed: 1,
      checks: [{ ok: false, label: 'lockfile', detail: 'drift' }],
    };
    report.ok = false;

    expect(projectInstallHygieneReport(report)).toMatchObject({
      available: true,
      ok: false,
      errors: 2,
      npmInstallViolations: 1,
      installVerifyFailed: 1,
    });
  });

  test('malformed cross-field counts fail closed', () => {
    const report = validReport();
    report.npmInstall.violationCount = 1;
    expect(parseInstallHygieneReport(report)).toBeNull();
    expect(projectInstallHygieneReport(report)).toMatchObject({
      available: false,
      ok: false,
      errors: 1,
      stale: true,
    });
  });

  test('expired reports are stale hard errors', () => {
    const now = Date.parse('2026-07-28T12:00:00.000Z');
    const generatedAt = new Date(now - INSTALL_HYGIENE_STALE_AFTER_MS - 1).toISOString();
    expect(projectInstallHygieneReport(validReport(generatedAt), now)).toMatchObject({
      available: true,
      ok: false,
      errors: 1,
      stale: true,
    });
  });

  test('loaders distinguish a missing optional artifact from malformed JSON', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'install-hygiene-slice-'));
    cleanup.push(dir);
    const missing = join(dir, 'missing.json');
    expect(await loadInstallHygieneMonitoringSlice(missing)).toBeNull();
    expect(loadInstallHygieneSummarySliceSync(missing)).toMatchObject({
      available: false,
      errors: 0,
      stale: false,
    });

    const malformed = join(dir, 'malformed.json');
    await Bun.write(malformed, '{not json');
    expect(await loadInstallHygieneMonitoringSlice(malformed)).toMatchObject({
      available: false,
      errors: 1,
      stale: true,
    });
    expect(loadInstallHygieneSummarySliceSync(malformed)).toMatchObject({
      available: false,
      errors: 1,
      stale: true,
    });
  });
});
