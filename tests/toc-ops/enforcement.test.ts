/**
 * TOC operate-lite — Hard Gate bake + Soft journal append-only.
 */
import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
  evaluateTocEnforcement,
  withTocEnforcement,
} from '../../lib/toc-ops/enforcement.ts';
import { buildDemoTocOpsFixture } from '../../lib/toc-ops/fixture.ts';
import { tocOpsToSummarySlice } from '../../lib/toc-ops/export-snapshot.ts';
import {
  ensureTocSoftBalanceSchema,
  listTocSoftEntries,
  postTocSoftBalance,
  seedTocSoftFromFixture,
} from '../../lib/operations/toc-soft-balance.ts';

describe('toc-ops · enforcement', () => {
  test('evaluates gates + T/I/OE + Rope focus on demo fixture', () => {
    const snap = withTocEnforcement(buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z'));
    expect(snap.enforcement?.plane).toBe('operate-lite');
    expect(snap.enforcement!.gates.length).toBeGreaterThan(10);
    expect(snap.enforcement!.failed).toBeGreaterThan(0);
    expect(snap.enforcement!.throughput.T).toBeGreaterThan(0);
    expect(snap.enforcement!.throughput.I).toBeGreaterThan(0);
    expect(snap.enforcement!.diagnosis.order).toEqual(['rope', 'drum', 'buffer', 'elevate']);
    expect(['rope', 'drum', 'buffer', 'elevate']).toContain(snap.enforcement!.diagnosis.focus);

    const blockedPlay = snap.enforcement!.gates.some(
      g => g.gateId === 'play_warmed' && !g.ok && g.callSign === 'ASH-002'
    );
    expect(blockedPlay).toBe(true);

    const limitFail = snap.enforcement!.gates.some(
      g => g.gateId === 'play_limit' && !g.ok && g.callSign === 'PAT-002'
    );
    expect(limitFail).toBe(true);

    const slice = tocOpsToSummarySlice(snap);
    expect(slice.enforcementFocus).toBe(snap.enforcement!.diagnosis.focus);
    expect(slice.enforcementFailed).toBe(snap.enforcement!.failed);
    expect(slice.throughputT).toBe(snap.enforcement!.throughput.T);
  });

  test('soft journal is append-only and seeds from fixture', () => {
    const db = new Database(':memory:');
    ensureTocSoftBalanceSchema(db);
    const fixture = buildDemoTocOpsFixture();
    const seeded = seedTocSoftFromFixture(db, fixture);
    expect(seeded.inserted).toBeGreaterThan(5);
    expect(seedTocSoftFromFixture(db, fixture).skipped).toBe(true);

    const rows = listTocSoftEntries(db, 100);
    expect(rows.length).toBe(seeded.inserted);

    postTocSoftBalance(db, {
      entryType: 'Adjustment',
      stakeholder: 'House',
      amount: -10,
      callSign: 'ASH-001',
      partnerCode: 'ASH',
      taskId: 'ADJ-ASH-001-test',
      correctsEntryId: rows[0]!.id,
      reason: 'test correction',
    });

    expect(() => {
      db.run(`UPDATE toc_soft_entries SET amount = 0 WHERE id = $id`, { $id: rows[0]!.id });
    }).toThrow(/append-only/);

    expect(() => {
      db.run(`DELETE FROM toc_soft_entries WHERE id = $id`, { $id: rows[0]!.id });
    }).toThrow(/append-only/);

    db.close();
  });

  test('evaluateTocEnforcement is pure relative to generatedAt', () => {
    const a = evaluateTocEnforcement(buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z'));
    const b = evaluateTocEnforcement(buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z'));
    expect(a.failed).toBe(b.failed);
    expect(a.criticalFailed).toBe(b.criticalFailed);
    expect(a.throughput).toEqual(b.throughput);
    expect(a.diagnosis.focus).toBe(b.diagnosis.focus);
  });
});
