// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Refresh known-chat metadata via Bot API getChat / getChatMemberCount.
 */
import type { Database } from 'bun:sqlite';
import {
  listKnownChats,
  updateKnownChatMemberCount,
  upsertKnownChat,
  type KnownChatFilterKind,
  type KnownChatRow,
} from './known-chats.ts';
import { getChat, getChatMemberCount } from './telegram-api.ts';

export type RefreshKnownChatsOpts = {
  db: Database;
  token: string;
  filter?: KnownChatFilterKind;
  chatIds?: string[]; // brand-ok
  limit?: number;
};

export type RefreshKnownChatsResult = {
  refreshed: number;
  failed: number;
  rows: KnownChatRow[];
  errors: Array<{ chatId: string; error: string }>; // brand-ok
};

export async function refreshKnownChats(
  opts: RefreshKnownChatsOpts
): Promise<RefreshKnownChatsResult> {
  const targets = listKnownChats(opts.db, {
    filter: opts.filter ?? 'active',
    chatIds: opts.chatIds,
    limit: opts.limit ?? 100,
    activeOnly: opts.filter === 'all' || opts.filter === 'inactive' ? false : undefined,
  });

  let refreshed = 0;
  let failed = 0;
  const errors: RefreshKnownChatsResult['errors'] = [];

  for (const row of targets) {
    const chatRes = await getChat(opts.token, row.chatId);
    if (!chatRes.ok) {
      failed++;
      errors.push({ chatId: row.chatId, error: chatRes.description ?? 'getChat failed' });
      continue;
    }
    upsertKnownChat(opts.db, {
      chat: {
        id: chatRes.chat.id,
        type: chatRes.chat.type,
        title: chatRes.chat.title,
        username: chatRes.chat.username,
        first_name: chatRes.chat.first_name,
        last_name: chatRes.chat.last_name,
        is_forum: chatRes.chat.is_forum,
      },
      source: 'manual',
      botStatus: row.botStatus,
      inactive: !row.active,
    });
    const count = await getChatMemberCount(opts.token, row.chatId);
    updateKnownChatMemberCount(opts.db, row.chatId, count);
    refreshed++;
  }

  const rows = listKnownChats(opts.db, {
    filter: opts.filter ?? 'all',
    chatIds: opts.chatIds ?? targets.map(t => t.chatId),
    activeOnly: false,
    limit: opts.limit ?? 200,
  });

  return { refreshed, failed, rows, errors };
}
