/**
 * Known chats — extract + upsert + leave/kick inactive.
 */
import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
  extractKnownChatEvents,
  listKnownChats,
  observeKnownChatsFromUpdate,
  upsertKnownChat,
} from '../lib/telegram/known-chats.ts';
import type { TelegramUpdate } from '../lib/telegram/telegram-update.ts';

describe('extractKnownChatEvents', () => {
  test('message + my_chat_member', () => {
    const update: TelegramUpdate = {
      message: {
        chat: { id: 42, type: 'private', first_name: 'Ada' },
        from: { id: 42 },
        text: '/start',
      },
      my_chat_member: {
        chat: { id: -1001, type: 'supergroup', title: 'Ops', is_forum: true },
        new_chat_member: { status: 'member', user: { id: 1, is_bot: true } },
      },
    };
    const events = extractKnownChatEvents(update);
    expect(events.map(e => e.chat.id).sort()).toEqual([-1001, 42]);
    expect(events.find(e => e.source === 'my_chat_member')?.botStatus).toBe('member');
  });
});

describe('observeKnownChatsFromUpdate', () => {
  test('upserts and marks kicked inactive', () => {
    const db = new Database(':memory:');
    observeKnownChatsFromUpdate({
      db,
      tenantSlug: 'factory',
      update: {
        my_chat_member: {
          chat: { id: -10099, type: 'supergroup', title: 'Desk' },
          new_chat_member: { status: 'administrator' },
        },
      },
    });
    let rows = listKnownChats(db, { activeOnly: false });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.active).toBe(true);
    expect(rows[0]!.botStatus).toBe('administrator');

    observeKnownChatsFromUpdate({
      db,
      update: {
        my_chat_member: {
          chat: { id: -10099, type: 'supergroup', title: 'Desk' },
          new_chat_member: { status: 'kicked' },
        },
      },
    });
    rows = listKnownChats(db, { activeOnly: false });
    expect(rows[0]!.active).toBe(false);
    expect(listKnownChats(db, { activeOnly: true })).toHaveLength(0);
  });

  test('manual upsert preserves title on sparse message', () => {
    const db = new Database(':memory:');
    upsertKnownChat(db, {
      chat: { id: 7, type: 'private', first_name: 'Bob' },
      source: 'manual',
    });
    observeKnownChatsFromUpdate({
      db,
      update: {
        message: {
          chat: { id: 7, type: 'private' },
          from: { id: 7 },
          text: 'hi',
        },
      },
    });
    const row = listKnownChats(db)[0]!;
    expect(row.firstName).toBe('Bob');
    expect(row.source).toBe('message');
  });
});
