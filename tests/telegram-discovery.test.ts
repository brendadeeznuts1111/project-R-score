/**
 * Telegram discovery — probeable ids + digest + mocked Bot API inventory.
 */
import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { resetTelegramRateLimiters } from '../lib/telegram/telegram-api.ts';
import {
  discoverTelegramAssets,
  formatDiscoveryDigest,
  isProbeableTelegramChatId,
} from '../lib/telegram/telegram-discovery.ts';

describe('isProbeableTelegramChatId', () => {
  test('accepts numeric and @username', () => {
    expect(isProbeableTelegramChatId('12345')).toBe(true);
    expect(isProbeableTelegramChatId('-1001234567890')).toBe(true);
    expect(isProbeableTelegramChatId('@TOC_Op_bot')).toBe(true);
  });

  test('rejects fixture / opaque ids', () => {
    expect(isProbeableTelegramChatId('tg-alpha')).toBe(false);
    expect(isProbeableTelegramChatId('tg:dm:nov')).toBe(false);
    expect(isProbeableTelegramChatId('pending-1')).toBe(false);
    expect(isProbeableTelegramChatId('')).toBe(false);
  });
});

describe('discoverTelegramAssets', () => {
  let origFetch: typeof fetch;
  let origToken: string | undefined;
  let origOps: string | undefined;

  beforeEach(() => {
    resetTelegramRateLimiters();
    origFetch = globalThis.fetch;
    origToken = Bun.env.TELEGRAM_BOT_FACTORY;
    origOps = Bun.env.TELEGRAM_OPS_CHAT_ID;
    Bun.env.TELEGRAM_BOT_FACTORY = '8972341795:test-token-for-discovery';
    Bun.env.TELEGRAM_OPS_CHAT_ID = '-100999';
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
    if (origToken === undefined) delete Bun.env.TELEGRAM_BOT_FACTORY;
    else Bun.env.TELEGRAM_BOT_FACTORY = origToken;
    if (origOps === undefined) delete Bun.env.TELEGRAM_OPS_CHAT_ID;
    else Bun.env.TELEGRAM_OPS_CHAT_ID = origOps;
    resetTelegramRateLimiters();
  });

  test('localOnly reports token + skips API', async () => {
    const report = await discoverTelegramAssets({ localOnly: true, opsDbPath: ':memory:' });
    expect(report.token.present).toBe(true);
    expect(report.token.source).toBe('TELEGRAM_BOT_FACTORY');
    expect(report.token.botIdFromToken).toBe(8972341795);
    expect(report.bot).toBeNull();
    expect(report.planes.botApi.usedByFactory).toBe(true);
    expect(report.planes.telegramApiMtproto.usedByFactory).toBe(false);
  });

  test('probes bot profile, webhook, commands, and ops chat', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      const method = url.split('/').pop() ?? '';
      const payloads: Record<string, unknown> = {
        getMe: {
          ok: true,
          result: {
            id: 8972341795,
            is_bot: true,
            first_name: 'TOC',
            username: 'TOC_Op_bot',
            can_join_groups: true,
            can_read_all_group_messages: false,
            supports_inline_queries: false,
          },
        },
        getMyName: { ok: true, result: { name: 'TOC Op' } },
        getMyDescription: { ok: true, result: { description: 'Ops bot' } },
        getMyShortDescription: { ok: true, result: { short_description: 'TOC' } },
        getWebhookInfo: {
          ok: true,
          result: {
            url: 'https://project-r-score.pages.dev/api/telegram/webhook/factory',
            pending_update_count: 0,
            allowed_updates: ['message', 'callback_query'],
          },
        },
        getMyCommands: {
          ok: true,
          result: [
            { command: 'start', description: 'Welcome' },
            { command: 'help', description: 'Help' },
          ],
        },
        getChatMenuButton: { ok: true, result: { type: 'commands' } },
        getMyDefaultAdministratorRights: {
          ok: true,
          result: { can_manage_chat: true, can_delete_messages: false },
        },
        getChat: {
          ok: true,
          result: {
            id: -100999,
            type: 'supergroup',
            title: 'Ops Desk',
            is_forum: true,
          },
        },
        getChatMemberCount: { ok: true, result: 12 },
        getChatMember: {
          ok: true,
          result: {
            status: 'administrator',
            user: { id: 8972341795, is_bot: true, username: 'TOC_Op_bot' },
            can_manage_topics: true,
          },
        },
        getChatAdministrators: {
          ok: true,
          result: [
            {
              status: 'creator',
              user: { id: 1, username: 'owner', is_bot: false },
            },
            {
              status: 'administrator',
              user: { id: 8972341795, username: 'TOC_Op_bot', is_bot: true },
            },
          ],
        },
      };
      const body = payloads[method] ?? { ok: false, description: `unmocked ${method}` };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as typeof fetch;

    const path = `/tmp/tg-discovery-${Date.now()}.db`;
    const seed = new Database(path);
    seed.run(`
      CREATE TABLE tree_nodes (
        id TEXT PRIMARY KEY,
        name TEXT,
        call_sign TEXT,
        telegram_id TEXT,
        active INTEGER
      );
    `);
    seed.run(
      `INSERT INTO tree_nodes (id, name, call_sign, telegram_id, active) VALUES
       ('n1', 'Alpha', 'ALP', 'tg-alpha', 1),
       ('n2', 'Real DM', 'REAL', '424242', 1)`
    );
    seed.close();

    const report = await discoverTelegramAssets({ opsDbPath: path });
    expect(report.bot?.username).toBe('TOC_Op_bot');
    expect(report.webhook?.url).toContain('/api/telegram/webhook/factory');
    expect(report.commands.byScope.default?.length).toBe(2);
    expect(report.commands.missingFromDefault.length).toBeGreaterThan(0);
    expect(report.local.fixtureLikeTelegramIds).toBe(1);
    expect(report.summary.accessibleChats).toBeGreaterThanOrEqual(1);

    const ops = report.chats.find(c => c.source === 'ops_chat');
    expect(ops?.accessible).toBe(true);
    expect(ops?.chat?.is_forum).toBe(true);
    expect(ops?.botMember?.status).toBe('administrator');
    expect(ops?.administrators?.some(a => a.username === 'TOC_Op_bot')).toBe(true);

    const digest = formatDiscoveryDigest(report).join('\n');
    expect(digest).toContain('@TOC_Op_bot');
    expect(digest).toContain('Ops Desk');
  });
});
