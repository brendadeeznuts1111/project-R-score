/**
 * Flow enhancements — durable webhook ACK, start HTML, meta upsert, play-ack clear.
 */
import { describe, expect, test } from 'bun:test';
import { randomUUIDv7 } from 'bun';
import { openOperationsDb } from '../lib/operations/db.ts';
import { bindPartnerProfile } from '../lib/operations/partner-profile-bridge.ts';
import { handleFlowCallback } from '../lib/telegram/flows/callbacks.ts';
import {
  getChatChannelMeta,
  rememberTemplateMessageId,
} from '../lib/telegram/flows/channel-meta.ts';
import { translateKeyboard } from '../lib/telegram/flows/keyboards.ts';
import { dispatchOpsFlowOutput } from '../lib/telegram/ops-commands.ts';
import { onTelegramWebhookRequest } from '../lib/telegram/webhook-pages.ts';
import type { R2PutBucket } from '../lib/pages/r2-types.ts';
import { asTreeNodeId } from '../lib/types/branded/operations.ts';
import { FACTORY_BOT_COMMANDS } from '../lib/telegram/telegram-api.ts';

function memoryBucket(): R2PutBucket & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    async get(key: string) {
      const text = store.get(key);
      if (text == null) return null;
      return {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(text));
            controller.close();
          },
        }),
      };
    },
    async put(key: string, value: string | ReadableStream | ArrayBuffer) {
      const text =
        typeof value === 'string'
          ? value
          : value instanceof ArrayBuffer
            ? new TextDecoder().decode(value)
            : await new Response(value).text();
      store.set(key, text);
    },
  };
}

describe('telegram flow enhance', () => {
  test('webhook awaits publish even when waitUntil is present', async () => {
    const bucket = memoryBucket();
    let waitUntilCalled = false;
    const res = await onTelegramWebhookRequest({
      request: new Request('https://example.test/api/telegram/webhook/factory', {
        method: 'POST',
        headers: { 'X-Telegram-Bot-Api-Secret-Token': 'sekrit' },
        body: JSON.stringify({
          message: { chat: { id: 1 }, from: { id: 1 }, text: '/start' },
        }),
      }),
      env: { REGISTRY_BUCKET: bucket, TELEGRAM_WEBHOOK_SECRET: 'sekrit' },
      params: { tenant: 'factory' },
      waitUntil: () => {
        waitUntilCalled = true;
      },
    });
    expect(res.status).toBe(200);
    expect(waitUntilCalled).toBe(false);
    const events = bucket.store.get('channels/telegram-updates/events.jsonl');
    expect(events).toContain('/start');
  });

  test('rememberTemplateMessageId upserts meta when missing', () => {
    const db = openOperationsDb({ path: ':memory:' });
    expect(getChatChannelMeta(db, '999')).toBeNull();
    rememberTemplateMessageId(db, '999', 'status.v1', 42);
    const meta = getChatChannelMeta(db, '999');
    expect(meta?.lastTemplateIds?.['status.v1']).toBe(42);
    db.close();
  });

  test('factory /start flow output keeps HTML keyboard when registered', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const agentId = randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, call_sign, telegram_id, active, created_at)
       VALUES ($id, 'agent', 'Agent', 'ASH-001', '777', 1, $now)`,
      { $id: agentId, $now: now }
    );
    bindPartnerProfile(db, asTreeNodeId(agentId));
    const output = dispatchOpsFlowOutput(db, ':memory:', {
      telegramUserId: '777',
      command: '/start',
      args: [],
    });
    expect(output).toBeTruthy();
    expect(output!.parseMode).toBe('HTML');
    expect(output!.keyboard?.rows?.length).toBeGreaterThan(0);
    db.close();
  });

  test('unregistered /start stays HTML (menu card)', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const output = dispatchOpsFlowOutput(db, ':memory:', {
      telegramUserId: '888',
      command: '/start',
      args: [],
    });
    expect(output?.parseMode).toBe('HTML');
    expect(output?.text).toContain('register');
    db.close();
  });

  test('play ack callback clears inline keyboard', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const agentId = randomUUIDv7();
    const playId = randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, telegram_id, active, created_at)
       VALUES ($id, 'agent', 'A', '555', 1, $now)`,
      { $id: agentId, $now: now }
    );
    bindPartnerProfile(db, asTreeNodeId(agentId));
    db.run(
      `INSERT INTO plays (id, expert_id, sport, market, event, selection, odds, stake_recommended, signed_hash, result, sent_at)
       VALUES ($id, 'e1', 'nfl', 'ml', 'x', 'y', 1.9, 100, 'hash', 'pending', $now)`,
      { $id: playId, $now: now }
    );
    db.run(
      `INSERT INTO play_distribution (play_id, node_id, channel, received_at, ack_status)
       VALUES ($p, $n, 'telegram', $now, 'pending')`,
      { $p: playId, $n: agentId, $now: now }
    );

    const output = handleFlowCallback(`play:${playId}:${agentId}:placed`, {
      db,
      dbPath: ':memory:',
      chatId: '555',
      userId: '555',
      messageId: 9,
      node: {
        id: agentId,
        type: 'agent',
        parent_id: null,
        expert_id: null,
        name: 'A',
        telegram_id: '555',
        call_sign: null,
      },
    });
    expect(output?.keyboard?.rows).toEqual([]);
    const markup = translateKeyboard(output!.keyboard!, 'en');
    expect(markup.inline_keyboard).toEqual([]);
    db.close();
  });

  test('FACTORY_BOT_COMMANDS includes balances and verifydod', () => {
    const cmds = FACTORY_BOT_COMMANDS.map(c => c.command);
    expect(cmds).toContain('balances');
    expect(cmds).toContain('verifydod');
  });
});
