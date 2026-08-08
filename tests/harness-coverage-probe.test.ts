/**
 * Coverage probe — cheap imports + asserts over lib/harness (no live proofs).
 * Used by `bun run test:harness-coverage` / coverage-ratchet.
 */
import { describe, expect, test } from 'bun:test';
import { CODE_QUALITY_TENANTS, assertCodeQualityFields } from '../lib/harness/code-quality';
import {
  loadCoverageBaseline,
  parseCoverageTotals,
} from '../lib/harness/coverage-ratchet';
import {
  assertScheduledJobCoverage,
  discoverScheduledJobs,
  SCHEDULED_JOB_EXEMPTIONS,
  SCHEDULED_JOB_OWNERS,
} from '../lib/harness/discover-scheduled';
import { assertRunbookProofLinks, MAINTENANCE_RUNBOOKS } from '../lib/harness/maintenance';
import { CRITICAL_PROOF_PATHS } from '../lib/harness/proof';
import { assertSignalMonitorFields } from '../lib/harness/signal-monitoring';
import { joinPath } from '../lib/path-bun';

const ROOT = joinPath(import.meta.dir, '..');

describe('harness coverage probe', () => {
  test('catalogs load and cheap asserts pass', async () => {
    expect(MAINTENANCE_RUNBOOKS.length).toBeGreaterThanOrEqual(2);
    expect(CODE_QUALITY_TENANTS.length).toBeGreaterThanOrEqual(2);
    expect(assertRunbookProofLinks()).toEqual([]);
    expect(assertCodeQualityFields()).toEqual([]);
    expect(assertSignalMonitorFields()).toEqual([]);
    expect(await assertScheduledJobCoverage(ROOT, ['docs-integrity', 'install-verify'])).toEqual(
      []
    );
  });

  test('threads research cron package scripts are classified (exempt)', async () => {
    const jobs = await discoverScheduledJobs(ROOT);
    const researchCron = jobs.filter(
      (j) => j.source === 'package-script' && String(j.detail).startsWith('threads:research:cron:')
    );
    expect(researchCron.length).toBe(3);
    for (const id of [
      'threads:research:cron:preview',
      'threads:research:cron:register',
      'threads:research:cron:remove',
    ]) {
      expect(SCHEDULED_JOB_EXEMPTIONS.some((ex) => ex.match === id)).toBe(true);
    }
    // Full owner/exempt pass with spine-ish tenants used by other schedules
    expect(
      await assertScheduledJobCoverage(ROOT, ['docs-integrity', 'install-verify', 'ops-snapshot'])
    ).toEqual([]);
  });

  test('parseCoverageTotals reads Bun text table', () => {
    const sample = `
----------------------------|---------|---------|-------------------
All files                   |   40.00 |   55.00 |
 lib/harness/foo.ts         |  100.00 |  100.00 |
----------------------------|---------|---------|-------------------
`;
    expect(parseCoverageTotals(sample)).toEqual({ funcsPct: 40, linesPct: 55 });
    expect(parseCoverageTotals('no table')).toBeUndefined();
  });

  test('coverage baseline + proof catalog load', async () => {
    const baseline = await loadCoverageBaseline(ROOT);
    expect(baseline.scope).toBe('lib/harness');
    expect(baseline.minLinesPct).toBeGreaterThanOrEqual(50);
    expect(baseline.minFuncsPct).toBeGreaterThanOrEqual(20);
    expect(Object.keys(SCHEDULED_JOB_OWNERS).length).toBeGreaterThanOrEqual(1);
    expect(CRITICAL_PROOF_PATHS.some((p) => p.id === 'bun-bench-profiling')).toBe(true);
    expect(CRITICAL_PROOF_PATHS.some((p) => p.id === 'bun-env')).toBe(true);
    const bench = CRITICAL_PROOF_PATHS.find((p) => p.id === 'bun-bench-profiling');
    expect(bench?.evidence.includes(bench.freshRerun)).toBe(true);
  });
});
