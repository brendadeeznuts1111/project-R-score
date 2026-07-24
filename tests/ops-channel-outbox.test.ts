/**
 * Unified ops channel outbox tests.
 * @see lib/channels/outbox.ts
 */
import { describe, expect, test } from 'bun:test';
import { openOperationsDb } from '../lib/operations/db.ts';
import {
  enqueueOpsChannelEvent,
  processChannelOutbox,
  queryOpsChannelHealth,
  readLocalChannelEvents,
} from '../lib/channels/outbox.ts';

describe('ops channel outbox', () => {
  test('enqueue + process populates local channel store', async () => {
    const db = openOperationsDb({ path: ':memory:' });
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

    const events = await readLocalChannelEvents('identity', 0);
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
});
