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
  test('v2 covers ONB→PLAY, limits, plays, experiments', () => {
    const snap = buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z');
    expect(snap.schema).toBe('factorywager.toc-ops.portal-fixture.v2');
    expect(snap.readOnly).toBe(true);
    expect(snap.plane).toBe('demo-readonly');
    expect(snap.partners.map(p => p.partnerCode)).toEqual(['ASH', 'PAT', 'NOV']);
    expect(snap.catalog.flowOrder[0]).toBe('ONB');
    expect(snap.catalog.depositCorridor.target).toBe(5000);
    expect(snap.catalog.bottleneckRuleKeys).toEqual([...TOC_BOTTLENECK_RULE_KEYS]);

    expect(snap.summary.warmed).toBeGreaterThanOrEqual(3);
    expect(snap.summary.warming).toBeGreaterThanOrEqual(1);
    expect(snap.summary.onboarding).toBe(1);
    expect(snap.summary.openOnb).toBeGreaterThanOrEqual(1);
    expect(snap.summary.openLimit).toBeGreaterThanOrEqual(1);
    expect(snap.summary.playsSettled).toBeGreaterThanOrEqual(2);
    expect(snap.summary.playsBlocked).toBeGreaterThanOrEqual(1);
    expect(snap.summary.activeExperiments).toBe(1);
    expect(snap.summary.unconfirmedRails).toBeGreaterThanOrEqual(1);

    const nov = snap.partners.find(p => p.partnerCode === 'NOV')!;
    expect(nov.status).toBe('Onboarding');
    expect(nov.flowStage).toBe('ONB');
    expect(nov.openTasks.some(t => t.taskType === 'ONB' && t.status === 'PendingPartner')).toBe(
      true
    );
    expect(nov.rails.every(r => !r.confirmed)).toBe(true);

    const ash = snap.partners.find(p => p.partnerCode === 'ASH')!;
    expect(ash.accounts.find(a => a.callSign === 'ASH-001')?.limits.freshness).toBe('stale');
    expect(ash.recentPlays.some(p => p.status === 'blocked')).toBe(true);

    const pat = snap.partners.find(p => p.partnerCode === 'PAT')!;
    expect(pat.accounts.find(a => a.callSign === 'PAT-001')?.limits.freshness).toBe('fresh');
    expect(pat.experimentAssignment?.variantKey).toBe('dynamic');
    expect(pat.recentPlays.some(p => p.status === 'placed')).toBe(true);

    expect(snap.experts.length).toBeGreaterThanOrEqual(2);
    expect(snap.experiments.some(e => e.status === 'active')).toBe(true);
    expect(snap.experiments.some(e => e.status === 'completed')).toBe(true);
  });

  test('export + summary slice + seed ifEmpty', async () => {
    const root = mkdtempSync(join(tmpdir(), 'toc-ops-'));
    try {
      const first = await seedTocOpsDemo({ root, force: true });
      expect(first.seeded).toBe(true);
      expect(first.partners).toBe(3);

      const skip = await seedTocOpsDemo({ root, ifEmpty: true });
      expect(skip.seeded).toBe(false);

      const slice = loadTocOpsSummarySlice(root);
      expect(slice.available).toBe(true);
      expect(slice.onboarding).toBe(1);
      expect(slice.openOnb).toBeGreaterThan(0);
      expect(slice.activeExperiments).toBe(1);
      expect(slice.path).toBe('/registry/toc-ops.json');

      const again = await exportTocOpsSnapshot({
        root,
        fixture: buildDemoTocOpsFixture(),
        bakeEmbed: false,
      });
      expect(again.partners).toBe(3);
      const baked = JSON.parse(await Bun.file(again.path).text());
      expect(baked.enforcement?.plane).toBe('operate-lite');
      expect(baked.enforcement?.failed).toBeGreaterThan(0);
      expect(baked.enforcement?.throughput?.T).toBeGreaterThan(0);
      const enfSlice = tocOpsToSummarySlice(baked);
      expect(enfSlice.enforcementFocus).toBe(baked.enforcement.diagnosis.focus);
      expect(enfSlice.throughputT).toBe(baked.enforcement.throughput.T);
      expect(tocOpsToSummarySlice(buildDemoTocOpsFixture()).playsSettled).toBeGreaterThan(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('ops-summary.toc is contract-valid when present', () => {
    const db = openOperationsDb({ path: ':memory:' });
    try {
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
