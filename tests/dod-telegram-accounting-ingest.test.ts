// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { DODVerifier } from '../lib/dod/verifier.ts';
import {
  extractPartnerCodeHint,
  extractTelegramImageFileId,
  findDodByTelegramMessage,
  ingestAccountingDodPhoto,
  parseDodCaption,
} from '../lib/dod/telegram-accounting-ingest.ts';

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

describe('dod telegram accounting ingest helpers', () => {
  test('extractTelegramImageFileId prefers largest photo', () => {
    expect(
      extractTelegramImageFileId({
        photo: [{ file_id: 'small' }, { file_id: 'large' }],
      })
    ).toBe('large');
  });

  test('extractPartnerCodeHint reads ASH · / BIL-001 / bare CODE', () => {
    expect(extractPartnerCodeHint('ASH · Balance $100')).toBe('ASH');
    expect(extractPartnerCodeHint('BIL-001 · slip $250')).toBe('BIL');
  });

  test('parseDodCaption resolves /dod type and platform hint', () => {
    expect(parseDodCaption('/dod balance draftkings')).toEqual({
      type: 'balance',
      platformHint: 'draftkings',
      partnerCode: undefined,
    });
  });
});

describe('dod telegram accounting ingest · house CODE + dedupe', () => {
  test('house Deposits topic requires partner CODE in caption', async () => {
    const houseDir = `.tmp/dod-ingest-house-${Bun.randomUUIDv7().slice(0, 8)}`;
    await Bun.write(
      `${houseDir}/all-accounting.json`,
      JSON.stringify({
        surfaceSlug: 'all-accounting',
        title: 'All Accounting',
        chatId: '-1009990001',
        chatRef: 'tg:chat:-1009990001',
        topics: [{ title: 'Deposits', messageThreadId: 7 }],
        topicsThreadMap: { deposits: 7, general: 1 },
        topicsComplete: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
    const db = new Database(':memory:');
    try {
      const result = await ingestAccountingDodPhoto(
        {
          chat: { id: -1009990001 },
          message_id: 42,
          message_thread_id: 7,
          photo: [{ file_id: 'photo-large' }],
          caption: 'deposit screenshot',
          from: { id: 111 },
        },
        {
          token: 'test-token',
          db,
          dbPath: ':memory:',
          houseMetaDir: houseDir,
          downloadFile: async () => new Uint8Array(PNG_1PX),
          processSubmission: async () => ({
            dodId: 'dod-test',
            status: 'pending',
            visualHash: 'vh',
            metadataHash: 'mh',
            signature: 'sig',
            tamperScore: 0,
            s3Path: 'dod/x/y.webp',
            processedAt: new Date().toISOString(),
          }),
        }
      );
      expect(result.handled).toBe(true);
      expect(result.replyText).toContain('requires partner CODE');
    } finally {
      db.close();
      await Bun.$`rm -rf ${houseDir}`.quiet();
    }
  });

  test('findDodByTelegramMessage dedupes chat+message', async () => {
    const dbPath = `.tmp/dod-dedupe-${Bun.randomUUIDv7().slice(0, 8)}.db`;
    {
      using verifier = new DODVerifier(dbPath);
      verifier.close();
    }
    const db = new Database(dbPath);
    db.run(
      `INSERT INTO dod_submissions (id, agent_id, type, submitted_at, telegram_chat_id, telegram_message_id)
       VALUES ('existing-id', 'agent-1', 'slip', datetime('now'), '-1001', 99)`
    );
    expect(findDodByTelegramMessage(db, '-1001', 99)?.id).toBe('existing-id');
    db.close();
    await Bun.$`rm -f ${dbPath}`.quiet();
  });
});

describe('ops-bot + factory bot edited_message ingest path', () => {
  test('ops-bot source handles edited_message before text gate', async () => {
    const src = await Bun.file('lib/telegram/ops-bot.ts').text();
    expect(src).toContain('update.edited_message');
    expect(src).toContain('update.message ?? update.edited_message');
    expect(src).toContain('ingestAccountingDodPhoto');
  });

  test('factory TelegramBot wires Accounting photo ingest on webhook path', async () => {
    const src = await Bun.file('lib/telegram/bot.ts').text();
    expect(src).toContain('tryAccountingPhotoIngest');
    expect(src).toContain('ingestAccountingDodPhoto');
    expect(src).toContain('update.message ?? update.edited_message');
  });
});
