/**
 * TOC Ops portal fixture — seed + snapshot shape for Pages build-out.
 */
import { describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildDemoTocOpsFixture, TOC_BOTTLENECK_RULE_KEYS } from '../lib/toc-ops/fixture.ts';
import {
  exportTocOpsSnapshot,
  loadTocOpsSummarySlice,
  tocOpsToSummarySlice,
} from '../lib/toc-ops/export-snapshot.ts';
import { seedTocOpsDemo } from '../lib/operations/toc-ops-seed.ts';
import { validateOpsSummary } from '../lib/registry/contracts.ts';
import { buildOpsSummary } from '../lib/operations/ops-summary.ts';
import { openOperationsDb } from '../lib/operations/db.ts';

describe('toc-ops demo fixture', () => {
  test('ASH + PAT cover WARMED, Warming, Gate 12, rails, Soft, bottlenecks', () => {
    const snap = buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z');
    expect(snap.schema).toBe('factorywager.toc-ops.portal-fixture.v1');
    expect(snap.readOnly).toBe(true);
    expect(snap.partners.map(p => p.partnerCode)).toEqual(['ASH', 'PAT']);
    expect(snap.summary.warmed).toBeGreaterThanOrEqual(2);
    expect(snap.summary.warming).toBeGreaterThanOrEqual(1);
    expect(snap.summary.confirmedRails).toBeGreaterThanOrEqual(2);
    expect(snap.buffer.floatTarget).toBe(50_000);
    expect(snap.catalog.warmupRequiredForPlay).toBe(2);
    expect(snap.catalog.bottleneckRuleKeys).toEqual([...TOC_BOTTLENECK_RULE_KEYS]);

    const ash = snap.partners[0]!;
    expect(ash.accounts.some(a => a.status === 'WARMED' && a.warmupCount === 2)).toBe(true);
    expect(ash.accounts.some(a => a.status === 'Warming' && a.warmupCount === 1)).toBe(true);
    expect(ash.rails.every(r => r.confirmed)).toBe(true);

    const pat = snap.partners[1]!;
    const principal = pat.accounts.find(a => a.callSign === 'PAT-002');
    expect(principal?.gate12.withdrawalMode).toBe('principal_recovery');
    expect(principal?.gate12.housePrincipalOutstanding).toBe(5000);
    expect(pat.rails.some(r => !r.confirmed)).toBe(true);

    const openBn = snap.partners.flatMap(p => p.bottlenecks).filter(b => b.resolvedAt == null);
    expect(openBn.some(b => b.ruleKey === 'warmup_cycle_aging')).toBe(true);
  });

  test('export + summary slice + seed ifEmpty', async () => {
    const root = mkdtempSync(join(tmpdir(), 'toc-ops-'));
    try {
      const first = await seedTocOpsDemo({ root, force: true });
      expect(first.seeded).toBe(true);
      expect(first.partners).toBe(2);

      const skip = await seedTocOpsDemo({ root, ifEmpty: true });
      expect(skip.seeded).toBe(false);

      const slice = loadTocOpsSummarySlice(root);
      expect(slice.available).toBe(true);
      expect(slice.warmed).toBeGreaterThan(0);
      expect(slice.path).toBe('/registry/toc-ops.json');

      const again = await exportTocOpsSnapshot({
        root,
        fixture: buildDemoTocOpsFixture(),
        bakeEmbed: false,
      });
      expect(again.partners).toBe(2);
      expect(tocOpsToSummarySlice(buildDemoTocOpsFixture()).available).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('ops-summary.toc is contract-valid when present', () => {
    const db = openOperationsDb({ path: ':memory:' });
    try {
      // Ensure toc-ops.json exists in cwd for loadTocOpsSummarySlice
      // (test may run before bake — tolerate empty slice)
      const payload = buildOpsSummary(db, 'snapshot');
      expect(payload.toc).toBeDefined();
      expect(typeof payload.toc.available).toBe('boolean');
      const v = validateOpsSummary(payload);
      expect(v.ok).toBe(true);
    } finally {
      db.close();
    }
  });
});
