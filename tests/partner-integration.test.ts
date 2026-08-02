// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  anchorConceptId,
  anchorDomId,
  parsePartnerHash,
  partnerHash,
} from '../lib/portal/partner-routes.ts';
import { PARTNER_TABLE_SCHEMAS } from '../lib/portal/partner-tables.ts';
import { allPartnerTags } from '../lib/portal/partner-tags.ts';
import {
  TELEGRAM_TOPICS,
  decodeTelegramStartPayload,
  telegramAppHash,
  telegramDeepLink,
  telegramTopicsForPhase,
} from '../lib/portal/partner-telegram.ts';

describe('partner integration contracts', () => {
  test('URLPattern routes normalize and reject unsafe domain values', () => {
    const route = parsePartnerHash('#partner/ash/out/out-ASH-1');
    expect(route).toEqual({ type: 'out', code: 'ASH', outId: 'out-ASH-1' });
    expect(route && anchorDomId(route)).toBe('out-card-out-ASH-1');
    expect(route && anchorConceptId(route)).toBe('section.partnersOuts');
    expect(parsePartnerHash('#partner/ASH/out/out-BIL-1')).toBeNull();
    expect(parsePartnerHash('#partner/ASH/telegram/admin')).toBeNull();
    expect(partnerHash({ type: 'partner', code: '../bad' })).toBe('#partners');
    expect(
      parsePartnerHash('#partner/ASH/opportunity/opp-ASH-001')
    ).toEqual({ type: 'opportunity', code: 'ASH', opportunityId: 'opp-ASH-001' });
    expect(parsePartnerHash('#partner/ASH/opportunity/opp-BIL-001')).toBeNull();
  });

  test('Telegram links use bounded base64url hints and canonical in-app routes', async () => {
    expect(telegramDeepLink('@FactoryWagerBot', 'ash', 'accounting')).toBe(
      'https://t.me/FactoryWagerBot?start=QVNIOmFjY291bnRpbmc'
    );
    expect(
      new URL(telegramDeepLink('FactoryWagerBot', 'ASH', 'ops')).searchParams.get('start')
    ).not.toContain('=');
    expect(() => telegramDeepLink('bad!', 'ASH', 'ops')).toThrow();
    expect(telegramAppHash('ash', 'liquidity')).toBe('#partner/ASH/telegram/liquidity');
    expect(Object.keys(TELEGRAM_TOPICS)).toEqual([
      'general',
      'ops',
      'alerts',
      'liquidity',
      'accounting',
    ]);
    const start = new URL(telegramDeepLink('FactoryWagerBot', 'ASH', 'ops')).searchParams.get(
      'start'
    )!;
    expect(decodeTelegramStartPayload(start)).toEqual({ code: 'ASH', topic: 'ops' });
    expect(decodeTelegramStartPayload('link_abc')).toBeNull();
    expect(decodeTelegramStartPayload('not-base64!!!')).toBeNull();
    expect(telegramTopicsForPhase('onboarding')).toEqual(['general', 'ops']);
    expect(telegramTopicsForPhase('operator_ready')).toContain('accounting');
    // Board JS mirror stays byte-compatible with the TypeScript helper.
    const board = await import('../public/portal/partners/partner-routes.js');
    expect(board.telegramDeepLink('FactoryWagerBot', 'ASH', 'ops')).toBe(
      telegramDeepLink('FactoryWagerBot', 'ASH', 'ops')
    );
    expect(board.decodeTelegramStartPayload(start)).toEqual({ code: 'ASH', topic: 'ops' });
    expect(board.telegramTopicsForPhase('paused')).toEqual(['general', 'alerts']);
    // Soft-fail on board (empty) vs throw in TS — both reject invalid bot names.
    expect(board.telegramDeepLink('bad!', 'ASH', 'ops')).toBe('');
  });

  test('TS and board JS parsePartnerHash share route.type dialect', async () => {
    const board = await import('../public/portal/partners/partner-routes.js');
    const samples = [
      '#partners',
      '#partner/ASH',
      '#partner/ASH/out/out-ASH-1',
      '#partner/ASH/opportunities',
      '#partner/ASH/opportunity/opp-ASH-001',
      '#partner/ASH/accounting',
      '#partner/ASH/telegram/ops',
      '#book/book-dk-nj',
    ] as const;
    for (const hash of samples) {
      const ts = parsePartnerHash(hash);
      const js = board.parsePartnerHash(hash) as { type?: string } | null;
      expect(js?.type, hash).toBe(ts?.type);
    }
  });

  test('tables and tags expose the reviewed integration taxonomy', () => {
    expect(Object.keys(PARTNER_TABLE_SCHEMAS)).toEqual(['partners', 'outs', 'accounting']);
    expect(PARTNER_TABLE_SCHEMAS.outs.some(column => column.key === 'max_bet')).toBe(true);
    expect(PARTNER_TABLE_SCHEMAS.accounting.some(column => column.key === 'running_balance')).toBe(
      true
    );
    expect(allPartnerTags().length).toBeGreaterThan(18);
    const statusIds = allPartnerTags()
      .filter(t => t.id.startsWith('tag.status.'))
      .map(t => ('glossaryId' in t ? t.glossaryId : ''));
    expect(statusIds).toContain('out.status.blocked');
    expect(statusIds).toContain('out.status.partial');
    expect(statusIds).toContain('out.status.funded');
  });
});
