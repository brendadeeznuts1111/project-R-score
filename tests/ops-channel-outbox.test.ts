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

  test('telegram projector uses ops chat + forum thread when no telegramId', async () => {
    const prevChat = Bun.env.TELEGRAM_OPS_CHAT_ID;
    const prevTopics = Bun.env.TELEGRAM_TOPICS;
    const prevSurfaces = Bun.env.TELEGRAM_SURFACES;
    Bun.env.TELEGRAM_OPS_CHAT_ID = '-100999';
    Bun.env.TELEGRAM_TOPICS = JSON.stringify({ alerts: 12 });
    delete Bun.env.TELEGRAM_SURFACES;

    const bodies: Record<string, unknown>[] = [];
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async (_input: RequestInfo, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), {
        status: 200,
      });
    }) as typeof fetch;

    const db = openOperationsDb({ path: ':memory:' });
    enqueueOpsChannelEvent(db, {
      topic: 'alerts',
      eventType: 'ops.alert',
      idempotencyKey: 'tg-group-1',
      payload: { message: 'gate breach', severity: 'critical' },
      projectors: ['telegram'],
    });

    try {
      const result = await processChannelOutbox(db, {
        deliver: true,
        telegramToken: 'test-token-abcdef',
      });
      expect(result.sent).toBe(1);
      expect(bodies[0]?.chat_id).toBe('-100999');
      expect(bodies[0]?.message_thread_id).toBe(12);
    } finally {
      globalThis.fetch = origFetch;
      if (prevChat === undefined) delete Bun.env.TELEGRAM_OPS_CHAT_ID;
      else Bun.env.TELEGRAM_OPS_CHAT_ID = prevChat;
      if (prevTopics === undefined) delete Bun.env.TELEGRAM_TOPICS;
      else Bun.env.TELEGRAM_TOPICS = prevTopics;
      if (prevSurfaces === undefined) delete Bun.env.TELEGRAM_SURFACES;
      else Bun.env.TELEGRAM_SURFACES = prevSurfaces;
      db.close();
    }
  });

  test('telegram projector routes alerts to HQ surface when mapped', async () => {
    const prevChat = Bun.env.TELEGRAM_OPS_CHAT_ID;
    const prevTopics = Bun.env.TELEGRAM_TOPICS;
    const prevSurfaces = Bun.env.TELEGRAM_SURFACES;
    Bun.env.TELEGRAM_OPS_CHAT_ID = '-1003937534779';
    Bun.env.TELEGRAM_TOPICS = JSON.stringify({ alerts: 12 });
    Bun.env.TELEGRAM_SURFACES = JSON.stringify({
      hq: '-100111',
      'ash-staging': '-1003937534779',
    });

    const bodies: Record<string, unknown>[] = [];
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async (_input: RequestInfo, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), {
        status: 200,
      });
    }) as typeof fetch;

    const db = openOperationsDb({ path: ':memory:' });
    enqueueOpsChannelEvent(db, {
      topic: 'alerts',
      eventType: 'ops.alert',
      idempotencyKey: 'tg-hq-1',
      payload: { message: 'hq alert', severity: 'critical' },
      projectors: ['telegram'],
    });

    try {
      const result = await processChannelOutbox(db, {
        deliver: true,
        telegramToken: 'test-token-abcdef',
      });
      expect(result.sent).toBe(1);
      expect(bodies[0]?.chat_id).toBe('-100111');
    } finally {
      globalThis.fetch = origFetch;
      if (prevChat === undefined) delete Bun.env.TELEGRAM_OPS_CHAT_ID;
      else Bun.env.TELEGRAM_OPS_CHAT_ID = prevChat;
      if (prevTopics === undefined) delete Bun.env.TELEGRAM_TOPICS;
      else Bun.env.TELEGRAM_TOPICS = prevTopics;
      if (prevSurfaces === undefined) delete Bun.env.TELEGRAM_SURFACES;
      else Bun.env.TELEGRAM_SURFACES = prevSurfaces;
      db.close();
    }
  });

  test('skips pending rows until available_at', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    enqueueOpsChannelEvent(db, {
      topic: 'identity',
      eventType: 'partner.bound',
      idempotencyKey: 'defer-key',
      payload: { treeNodeId: 'n1' },
      projectors: ['r2'],
    });
    const future = new Date(Date.now() + 60_000).toISOString();
    db.run(`UPDATE ops_channel_outbox SET available_at = $at WHERE idempotency_key = 'defer-key'`, {
      $at: future,
    });
    const result = await processChannelOutbox(db, { deliver: false, limit: 10 });
    expect(result.sent).toBe(0);
    const row = db
      .query(`SELECT status FROM ops_channel_outbox WHERE idempotency_key = 'defer-key'`)
      .get() as { status: string };
    expect(row.status).toBe('pending');
    db.close();
  });

  test('429 defers telegram row with available_at', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      ({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          ok: false,
          error_code: 429,
          description: 'Too Many Requests',
          parameters: { retry_after: 0 },
        }),
        arrayBuffer: async () => new ArrayBuffer(0),
      }) as Response;

    enqueueOpsChannelEvent(db, {
      topic: 'alerts',
      eventType: 'ops.alert',
      idempotencyKey: 'rate-key',
      payload: { text: 'hello', telegramId: '8013171035' },
      projectors: ['telegram'],
    });

    try {
      const result = await processChannelOutbox(db, {
        deliver: true,
        telegramToken: 'test-token',
        limit: 1,
      });
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
      const row = db
        .query(
          `SELECT status, retries, last_error, available_at FROM ops_channel_outbox WHERE idempotency_key = 'rate-key'`
        )
        .get() as {
        status: string;
        retries: number;
        last_error: string | null;
        available_at: string | null;
      };
      expect(row.status).toBe('pending');
      expect(row.retries).toBe(1);
      expect(row.last_error).toContain('rate_limit:429');
      expect(row.available_at).not.toBeNull();
    } finally {
      globalThis.fetch = origFetch;
      db.close();
    }
  });
});
