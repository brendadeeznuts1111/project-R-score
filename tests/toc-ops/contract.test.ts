/**
 * TOC Ops wire contracts — ops-summary.toc + bake proof.
 */
import { describe, expect, test } from 'bun:test';
import {
  validateOpsSummary,
  validateTocOpsBakeProof,
  validateTocOpsSummarySlice,
} from '../../lib/registry/contracts.ts';
import {
  buildDemoTocOpsFixture,
  buildTocOpsBakeProof,
  tocOpsToSummarySlice,
  withTocMetrics,
} from '../../lib/toc-ops/index.ts';
import { emptyTocOpsSummarySlice } from '../../lib/toc-ops/export-snapshot.ts';
import { buildOpsSummary } from '../../lib/operations/ops-summary.ts';
import { openOperationsDb } from '../../lib/operations/db.ts';

describe('toc-ops · contract', () => {
  test('empty slice validates (unavailable)', () => {
    const v = validateTocOpsSummarySlice(emptyTocOpsSummarySlice());
    expect(v.ok).toBe(true);
  });

  test('available+path-only fails deepened contract', () => {
    const v = validateTocOpsSummarySlice({
      available: true,
      path: '/registry/toc-ops.json',
    });
    expect(v.ok).toBe(false);
    expect(v.errors.some(e => e.includes('plane') || e.includes('enforcement'))).toBe(true);
  });

  test('baked metrics slice validates', () => {
    const snap = withTocMetrics(buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z'));
    const slice = tocOpsToSummarySlice(snap);
    const v = validateTocOpsSummarySlice(slice);
    expect(v.ok).toBe(true);
    expect(slice.throughputT).toBeNumber();
    expect(slice.enforcementFocus).toBeTruthy();
  });

  test('bake proof validates and is ok for demo fixture', () => {
    const snap = withTocMetrics(buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z'));
    const proof = buildTocOpsBakeProof(snap);
    const v = validateTocOpsBakeProof(proof);
    expect(v.ok).toBe(true);
    expect(proof.ok).toBe(true);
    expect(proof.checks.every(c => c.ok)).toBe(true);
  });

  test('ops-summary with available toc requires throughput', () => {
    const db = openOperationsDb({ path: ':memory:' });
    try {
      const payload = buildOpsSummary(db, 'snapshot');
      // Force a weak toc to prove contract rejects under-spec
      const weak = {
        ...payload,
        toc: { available: true, path: '/registry/toc-ops.json' },
      };
      expect(validateOpsSummary(weak).ok).toBe(false);

      const good = {
        ...payload,
        toc: tocOpsToSummarySlice(
          withTocMetrics(buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z'))
        ),
      };
      expect(validateOpsSummary(good).ok).toBe(true);
    } finally {
      db.close();
    }
  });
});
