/**
 * Broadcast resolve + template + audit log (dry-run / mocked send).
 */
import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
  broadcastToKnownChats,
  renderBroadcastText,
  resolveBroadcastTargets,
} from '../lib/telegram/broadcast.ts';
import { formatKnownChatsTable, upsertKnownChat } from '../lib/telegram/known-chats.ts';
import { resetTelegramRateLimiters } from '../lib/telegram/telegram-api.ts';

describe('broadcast', () => {
  test('renderBroadcastText substitutes fields', () => {
    const text = renderBroadcastText('hi {{title}} ({{chatId}}/{{type}})', {
      chatId: '-1001',
      chatType: 'supergroup',
      title: 'Ops Desk',
      username: null,
      firstName: null,
      lastName: null,
      isForum: true,
      botStatus: 'member',
      memberCount: 12,
      source: 'my_chat_member',
      tenantSlug: 'factory',
      firstSeenAt: '2026-01-01T00:00:00.000Z',
      lastSeenAt: '2026-01-01T00:00:00.000Z',
      active: true,
    });
    expect(text).toBe('hi Ops Desk (-1001/supergroup)');
  });

  test('resolveBroadcastTargets --all active + --chat', () => {
    const db = new Database(':memory:');
    upsertKnownChat(db, {
      chat: { id: -1001, type: 'supergroup', title: 'Ops' },
      source: 'my_chat_member',
      botStatus: 'member',
    });
    upsertKnownChat(db, {
      chat: { id: 42, type: 'private', first_name: 'Ada' },
      source: 'message',
    });
    upsertKnownChat(db, {
      chat: { id: -1002, type: 'supergroup', title: 'Dead' },
      source: 'my_chat_member',
      botStatus: 'kicked',
      inactive: true,
    });

    const active = resolveBroadcastTargets({ db, all: true, filter: 'active' });
    expect(active.map(r => r.chatId).sort()).toEqual(['-1001', '42']);

    const groups = resolveBroadcastTargets({ db, all: true, filter: 'group' });
    expect(groups.map(r => r.chatId)).toEqual(['-1001']);

    const one = resolveBroadcastTargets({ db, chatIds: ['42'] });
    expect(one).toHaveLength(1);
    expect(one[0]!.chatId).toBe('42');

    const table = formatKnownChatsTable(active).join('\n');
    expect(table).toContain('Ops');
    expect(table).toContain('Ada');
  });

  test('broadcastToKnownChats dry-run and live send with audit', async () => {
    resetTelegramRateLimiters();
    const db = new Database(':memory:');
    upsertKnownChat(db, {
      chat: { id: -1001, type: 'supergroup', title: 'Ops' },
      source: 'message',
    });
    const targets = resolveBroadcastTargets({ db, all: true });

    const dry = await broadcastToKnownChats({
      db,
      token: 'tok',
      text: 'hello {{title}}',
      targets,
      dryRun: true,
    });
    expect(dry.skipped).toBe(1);
    expect(dry.sent).toBe(0);

    let bodies: Record<string, unknown>[] = [];
    const orig = globalThis.fetch;
    globalThis.fetch = (async (_i: RequestInfo, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(JSON.stringify({ ok: true, result: { message_id: 7 } }), {
        status: 200,
      });
    }) as typeof fetch;

    try {
      const live = await broadcastToKnownChats({
        db,
        token: '123456:ABC',
        text: 'hello {{title}}',
        targets,
      });
      expect(live.sent).toBe(1);
      expect(live.failed).toBe(0);
      expect(bodies[0]?.text).toBe('hello Ops');
      expect(bodies[0]?.chat_id).toBe('-1001');

      const logged = db
        .query(`SELECT ok, text_preview, chat_id FROM ops_broadcast_log`)
        .get() as { ok: number; text_preview: string; chat_id: string }; // brand-ok — audit row wire
      expect(logged.ok).toBe(1);
      expect(logged.chat_id).toBe('-1001');
      expect(logged.text_preview).toContain('Ops');
    } finally {
      globalThis.fetch = orig;
      resetTelegramRateLimiters();
    }
  });
});

describe('parseOpsAdminUserIds', () => {
  test('parses comma list', async () => {
    const { parseOpsAdminUserIds, isOpsAdminUserId } = await import(
      '../lib/telegram/telegram-config.ts'
    );
    expect(parseOpsAdminUserIds('1, 2, 2, x')).toEqual([1, 2]);
    expect(isOpsAdminUserId(1, [1, 2])).toBe(true);
    expect(isOpsAdminUserId(9, [1, 2])).toBe(false);
    expect(isOpsAdminUserId(1, [])).toBe(false);
  });
});
