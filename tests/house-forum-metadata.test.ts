import { describe, expect, test } from 'bun:test';
import {
  houseTopicsThreadMap,
  saveHouseForumMetadata,
  loadHouseForumMetadata,
} from '../lib/telegram/house-forum-metadata.ts';
import {
  bindAccountingChatInEnvFile,
  mergeTelegramSurfacesJson,
  serializeEnvFile,
  parseEnvFile,
} from '../lib/telegram/telegram-env-bind.ts';

describe('house-forum-metadata', () => {
  test('houseTopicsThreadMap maps General and slug titles', () => {
    const map = houseTopicsThreadMap([
      { title: 'General', messageThreadId: 1 },
      { title: 'Deposits', messageThreadId: 5 },
    ]);
    expect(map.general).toBe(1);
    expect(map.deposits).toBe(5);
  });

  test('save and load round-trip', async () => {
    const root = `/tmp/house-forum-${Date.now()}`;
    const path = await saveHouseForumMetadata(
      {
        surfaceSlug: 'all-accounting',
        title: 'TOC Ops · Accounting',
        chatId: '-100999',
        chatRef: 'tg:chat:-100999',
        topics: [{ title: 'General', messageThreadId: 1 }],
        topicsThreadMap: { general: 1 },
        topicsComplete: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { rootDir: root }
    );
    expect(path).toContain('all-accounting.json');
    const loaded = await loadHouseForumMetadata('all-accounting', { rootDir: root });
    expect(loaded?.chatId).toBe('-100999');
  });
});

describe('telegram-env-bind', () => {
  test('mergeTelegramSurfacesJson adds all-accounting slug', () => {
    const json = mergeTelegramSurfacesJson('{"hq":"-1"}', 'all-accounting', '-100555');
    expect(JSON.parse(json)).toEqual({ hq: '-1', 'all-accounting': '-100555' });
  });

  test('serializeEnvFile updates existing keys', () => {
    const prior = 'TELEGRAM_OPS_CHAT_ID=-1\n# comment\n';
    const updates = parseEnvFile(prior);
    updates.set('TELEGRAM_ACCOUNTING_CHAT_ID', '-100777');
    const next = serializeEnvFile(prior, updates);
    expect(next).toContain('TELEGRAM_ACCOUNTING_CHAT_ID=-100777');
    expect(next).toContain('TELEGRAM_OPS_CHAT_ID=-1');
  });

  test('bindAccountingChatInEnvFile writes accounting keys', async () => {
    const envPath = `/tmp/tg-env-bind-${Date.now()}.env`;
    await Bun.write(envPath, 'TELEGRAM_SURFACES={"hq":"-1"}\n');
    const result = await bindAccountingChatInEnvFile({ chatId: '-100888', envPath });
    expect(result.chatId).toBe('-100888');
    const raw = await Bun.file(envPath).text();
    expect(raw).toContain('TELEGRAM_ACCOUNTING_CHAT_ID=-100888');
    expect(JSON.parse(raw.match(/TELEGRAM_SURFACES=(.+)/)?.[1] ?? '{}')).toMatchObject({
      'all-accounting': '-100888',
      hq: '-1',
    });
  });

  test('bindHouseSurfaceInEnvFile sets TELEGRAM_OPS_CHAT_ID for hq', async () => {
    const envPath = `/tmp/tg-env-hq-${Date.now()}.env`;
    await Bun.write(envPath, 'TELEGRAM_SURFACES={}\n');
    const { bindHouseSurfaceInEnvFile } = await import('../lib/telegram/telegram-env-bind.ts');
    await bindHouseSurfaceInEnvFile({ surfaceSlug: 'hq', chatId: '-100111', envPath });
    const raw = await Bun.file(envPath).text();
    expect(raw).toContain('TELEGRAM_OPS_CHAT_ID=-100111');
    expect(JSON.parse(raw.match(/TELEGRAM_SURFACES=(.+)/)?.[1] ?? '{}')).toMatchObject({ hq: '-100111' });
  });
});
