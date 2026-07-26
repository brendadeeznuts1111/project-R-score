/**
 * Legacy ops DB gains available_at on ops_channel_outbox via migrateSchema.
 */
import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { migrateOpsChannelOutboxAvailableAt } from '../lib/operations/schema.ts';
import { enqueueOpsChannelEvent } from '../lib/channels/outbox.ts';

describe('ops schema available_at migration', () => {
  test('legacy outbox without available_at migrates and accepts enqueue', () => {
    const db = new Database(':memory:');
    db.run(`
      CREATE TABLE ops_channel_outbox (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        event_type TEXT NOT NULL,
        idempotency_key TEXT NOT NULL UNIQUE,
        payload_json TEXT NOT NULL,
        projectors TEXT NOT NULL DEFAULT 'r2,telegram',
        status TEXT DEFAULT 'pending',
        retries INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        sent_at TEXT,
        last_error TEXT
      );
    `);

    migrateOpsChannelOutboxAvailableAt(db);

    const cols = (db.query('PRAGMA table_info(ops_channel_outbox)').all() as { name: string }[]).map(
      c => c.name
    );
    expect(cols).toContain('available_at');

    const event = enqueueOpsChannelEvent(db, {
      topic: 'alerts',
      eventType: 'ops.broadcast',
      idempotencyKey: 'legacy-migrate-1',
      payload: { text: 'hi', telegramId: '-1001' },
      projectors: ['telegram'],
      availableAt: new Date(Date.now() + 5000).toISOString(),
    });
    expect(event.inserted).toBe(true);

    db.close();
  });
});
