/**
 * Coverage probe — cheap imports + asserts over lib/harness (no live proofs).
 * Used by `bun run test:harness-coverage` / coverage-ratchet.
 */
import { describe, expect, test } from 'bun:test';
import { CODE_QUALITY_TENANTS, assertCodeQualityFields } from '../lib/harness/code-quality';
import { parseCoverageTotals } from '../lib/harness/coverage-ratchet';
import { assertScheduledJobCoverage } from '../lib/harness/discover-scheduled';
import { assertRunbookProofLinks, MAINTENANCE_RUNBOOKS } from '../lib/harness/maintenance';
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

  test('parseCoverageTotals reads Bun text table', () => {
    const sample = `
----------------------------|---------|---------|-------------------
All files                   |   40.00 |   55.00 |
 lib/harness/foo.ts         |  100.00 |  100.00 |
----------------------------|---------|---------|-------------------
`;
    expect(parseCoverageTotals(sample)).toEqual({ funcsPct: 40, linesPct: 55 });
  });
});
