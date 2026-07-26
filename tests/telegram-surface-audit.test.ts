import { describe, expect, test } from 'bun:test';
import type { KnownChatRow } from '../lib/telegram/known-chats.ts';
import { auditTelegramSurfaces } from '../lib/telegram/surface-audit.ts';

function chat(partial: Partial<KnownChatRow> & { chatId: string }): KnownChatRow { // brand-ok — test fixture wire id
  return {
    chatType: 'supergroup',
    title: null,
    username: null,
    firstName: null,
    lastName: null,
    isForum: true,
    botStatus: 'administrator',
    memberCount: 2,
    surfaceSlug: null,
    source: 'manual',
    tenantSlug: 'factory',
    firstSeenAt: '2026-07-26T00:00:00.000Z',
    lastSeenAt: '2026-07-26T00:00:00.000Z',
    active: true,
    ...partial,
  };
}

describe('surface audit', () => {
  test('flags missing HQ + unset TELEGRAM_SURFACES', () => {
    const report = auditTelegramSurfaces({
      knownChats: [
        chat({
          chatId: '-1003937534779',
          title: 'TOC Ops · ASH · staging',
          surfaceSlug: 'ash-staging',
        }),
        chat({
          chatId: '-1004400413853',
          title: 'TOC Ops · sandbox',
          surfaceSlug: 'sandbox',
        }),
      ],
      env: {
        TELEGRAM_OPS_CHAT_ID: '-1003937534779',
        TELEGRAM_BOT_FACTORY: 'x:y',
      },
      canReadAllGroupMessages: false,
    });
    expect(report.bindingMatrix.find(b => b.slug === 'hq')?.status).toBe('missing');
    expect(report.findings.some(f => f.id === 'A-SURFACES-ENV')).toBe(true);
    expect(report.findings.some(f => f.id === 'A-PRIVACY')).toBe(true);
    expect(report.findings.some(f => f.id === 'A-BIND-hq')).toBe(true);
    expect(report.summary.ok).toBe(false);
  });
});
