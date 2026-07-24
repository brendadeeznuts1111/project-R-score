/**
 * Unified ops channel outbox tests.
 * @see lib/channels/outbox.ts
 * @see lib/channels/toc-outbox.ts
 */
import { describe, expect, test } from 'bun:test';
import { openOperationsDb } from '../lib/operations/db.ts';
import {
  enqueueOpsChannelEvent,
  processChannelOutbox,
  queryOpsChannelHealth,
  readLocalChannelEvents,
} from '../lib/channels/outbox.ts';
import { enqueueTocBakeChannelEvents } from '../lib/channels/toc-outbox.ts';
import { withTocMetrics } from '../lib/toc-ops/export-snapshot.ts';
import { buildDemoTocOpsFixture } from '../lib/toc-ops/fixture.ts';
import { postTocSoftBalance } from '../lib/operations/toc-soft-balance.ts';
import { parseOpsChannelTopic } from '../lib/channels/ops-channel-event.ts';

describe('ops channel outbox', () => {
  test('enqueue + process populates local channel store', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    const baseline = (await readLocalChannelEvents('identity', 0)).length;
    enqueueOpsChannelEvent(db, {
      topic: 'identity',
      eventType: 'partner.bound',
      idempotencyKey: 'test-bind-1',
      payload: { treeNodeId: 'node-1', profileKey: 'pp-test' },
    });

    const healthBefore = queryOpsChannelHealth(db);
    expect(healthBefore.pending).toBe(1);

    const result = await processChannelOutbox(db, { deliver: false });
    expect(result.sent).toBe(1);

    const events = await readLocalChannelEvents('identity', baseline);
    expect(events.length).toBe(1);
    expect((events[0]?.payload as Record<string, unknown>).profileKey).toBe('pp-test');

    const healthAfter = queryOpsChannelHealth(db);
    expect(healthAfter.pending).toBe(0);
    expect(healthAfter.sent).toBe(1);
    db.close();
  });

  test('idempotency key prevents duplicate rows', () => {
    const db = openOperationsDb({ path: ':memory:' });
    enqueueOpsChannelEvent(db, {
      topic: 'plays',
      eventType: 'play.dispatched',
      idempotencyKey: 'dup-key',
      payload: { playId: 'p1' },
    });
    enqueueOpsChannelEvent(db, {
      topic: 'plays',
      eventType: 'play.dispatched',
      idempotencyKey: 'dup-key',
      payload: { playId: 'p1' },
    });

    const count = db
      .query('SELECT COUNT(*) AS n FROM ops_channel_outbox')
      .get() as { n: number };
    expect(count.n).toBe(1);
    db.close();
  });

  test('topic toc is valid and bake enqueues metrics + gates + ranked', async () => {
    expect(parseOpsChannelTopic('toc')).toBe('toc');
    const db = openOperationsDb({ path: ':memory:' });
    const snap = withTocMetrics(buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z'));
    const fan = enqueueTocBakeChannelEvents(db, snap);
    expect(fan.enqueued).toBeGreaterThanOrEqual(1 + 1);
    expect(fan.metrics?.eventType).toBe('toc.metrics.baked');
    expect(fan.criticalGates.length).toBeGreaterThan(0);
    expect(fan.rankedActions.length).toBeGreaterThan(0);

    // Idempotent re-bake same generatedAt
    const again = enqueueTocBakeChannelEvents(db, snap);
    expect(again.enqueued).toBe(fan.enqueued);

    const pending = db
      .query(`SELECT COUNT(*) AS n FROM ops_channel_outbox WHERE topic = 'toc' AND status = 'pending'`)
      .get() as { n: number };
    expect(pending.n).toBe(fan.enqueued);

    const result = await processChannelOutbox(db, { deliver: false });
    expect(result.sent).toBe(fan.enqueued);

    const local = await readLocalChannelEvents('toc', 0);
    expect(local.some(e => (e.payload as { eventType?: string }) == null || true)).toBe(true);
    expect(local.length).toBeGreaterThanOrEqual(1);
    const types = db
      .query(`SELECT event_type FROM ops_channel_outbox WHERE topic = 'toc'`)
      .all() as Array<{ event_type: string }>;
    expect(types.some(t => t.event_type === 'toc.metrics.baked')).toBe(true);
    expect(types.some(t => t.event_type === 'toc.gate.critical')).toBe(true);
    expect(types.some(t => t.event_type === 'toc.action.ranked')).toBe(true);
    db.close();
  });

  test('Soft post enqueues toc.soft.posted', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    postTocSoftBalance(db, {
      entryType: 'ProfitSplit',
      stakeholder: 'House',
      amount: 42,
      callSign: 'ASH-001',
      partnerCode: 'ASH',
      taskId: 'WD-TEST-CHANNEL',
    });
    const row = db
      .query(
        `SELECT event_type, payload_json FROM ops_channel_outbox
         WHERE topic = 'toc' AND event_type = 'toc.soft.posted' LIMIT 1`
      )
      .get() as { event_type: string; payload_json: string } | null;
    expect(row?.event_type).toBe('toc.soft.posted');
    const payload = JSON.parse(row!.payload_json) as { amount: number; callSign: string };
    expect(payload.amount).toBe(42);
    expect(payload.callSign).toBe('ASH-001');

    await processChannelOutbox(db, { deliver: false });
    const local = await readLocalChannelEvents('toc', 0);
    expect(local.length).toBeGreaterThanOrEqual(1);
    db.close();
  });
});
