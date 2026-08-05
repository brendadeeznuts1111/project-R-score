// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  enrichDodEntry,
  extractAccountingAmount,
  parseBunImageMetaStrip,
  telegramMessageDeepLink,
} from '../lib/dod/enrich-entry.ts';

describe('dod enrich-entry', () => {
  test('extractAccountingAmount reads first dollar figure', () => {
    expect(extractAccountingAmount('ASH · Balance $12,450.00 FanDuel')).toBe(12450);
    expect(extractAccountingAmount('BIL-001 · NBA $250 · DK')).toBe(250);
    expect(extractAccountingAmount('no money')).toBeUndefined();
  });

  test('telegramMessageDeepLink builds private forum message URLs', () => {
    expect(
      telegramMessageDeepLink({
        chatId: '-1002147483001',
        messageId: 1842,
        threadId: 42,
      })
    ).toBe('https://t.me/c/2147483001/42/1842');

    expect(
      telegramMessageDeepLink({
        username: 'FactoryWagerOps',
        messageId: 99,
      })
    ).toBe('https://t.me/FactoryWagerOps/99');

    expect(telegramMessageDeepLink({ chatId: '-1001', messageId: 1 })).toBeNull();
  });

  test('parseBunImageMetaStrip keeps agent-learning fields only', () => {
    const strip = parseBunImageMetaStrip({
      width: 1170,
      height: 2532,
      format: 'jpeg',
      size: 482110,
      exif: {
        Software: 'Screenshot',
        Device: { Model: 'iPhone 15 Pro' },
        MakerNote: 'secret-blob',
      },
      gps: { lat: 25.76, lng: -80.19 },
    });
    expect(strip?.width).toBe(1170);
    expect(strip?.exif.deviceModel).toBe('iPhone 15 Pro');
    expect(strip?.exif.software).toBe('Screenshot');
    expect(strip?.missingExif).toBe(false);
    expect(JSON.stringify(strip)).not.toContain('MakerNote');
  });

  test('enrichDodEntry fills accounting + deep link + image_meta', () => {
    const row = enrichDodEntry({
      id: 'x',
      type: 'balance',
      extracted_text: 'ASH · Balance $12,450.00 FanDuel',
      telegram_chat_id: '-1002147483001',
      telegram_message_id: 1842,
      telegram_thread_id: 42,
      image_meta_json: JSON.stringify({
        width: 10,
        height: 20,
        format: 'png',
        size: 100,
      }),
    });
    expect(row.accounting_amount).toBe(12450);
    expect(row.telegram_deep_link).toBe('https://t.me/c/2147483001/42/1842');
    expect((row.image_meta as { width: number }).width).toBe(10);
  });
});
