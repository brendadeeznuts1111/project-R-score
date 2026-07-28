// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
  AccountLimitsRepository,
  ensureAccountLimitsSchema,
  seedAccountLimitsDemo,
} from '../lib/account-limits-repo.ts';
import {
  buildSeatCapitalDeskRichBlocks,
  patchSeatOut,
  type SeatIntakeRecord,
} from '../lib/telegram/seat-capital-desk.ts';
import {
  deskMaxBetDiffersFromBookMax,
  formatAdoptBookMaxButtonLabel,
  formatAdoptBookMaxConfirm,
  formatBookMaxAsDeskMaxBet,
  formatBookMaxDeltaLine,
  formatMaxBetSetConfirm,
  formatOutBookMaxLines,
  loadBookMaxComparesForSeatDesk,
  mapOutsToBookMaxCompares,
  matchDeskBookToLatestLimit,
  normalizeSportsbookKey,
  parseDeskMaxBetAmount,
  shouldOfferAdoptBookMax,
  sportsbookKeysMatch,
} from '../lib/telegram/seat-desk-book-max.ts';

describe('seat-desk-book-max pure helpers', () => {
  test('normalizeSportsbookKey strips host noise', () => {
    expect(normalizeSportsbookKey('www.DraftKings.com')).toBe('draftkings');
    expect(normalizeSportsbookKey('https://fanduel.com/sports')).toBe('fanduel');
    expect(normalizeSportsbookKey('parlay21.com')).toBe('parlay21');
    expect(normalizeSportsbookKey('draftkings')).toBe('draftkings');
  });

  test('sportsbookKeysMatch fuzzy brand/host', () => {
    expect(sportsbookKeysMatch('www.draftkings.com', 'draftkings')).toBe(true);
    expect(sportsbookKeysMatch('FanDuel', 'fanduel')).toBe(true);
    expect(sportsbookKeysMatch('parlay21.com', 'draftkings')).toBe(false);
  });

  test('parseDeskMaxBetAmount handles $ / k / commas', () => {
    expect(parseDeskMaxBetAmount('$500')).toBe(500);
    expect(parseDeskMaxBetAmount('1,500')).toBe(1500);
    expect(parseDeskMaxBetAmount('$1k')).toBe(1000);
    expect(parseDeskMaxBetAmount('1.5k')).toBe(1500);
    expect(parseDeskMaxBetAmount('2.5u')).toBeNull();
    expect(parseDeskMaxBetAmount('')).toBeNull();
    expect(parseDeskMaxBetAmount(undefined)).toBeNull();
  });

  test('formatBookMaxDeltaLine shows delta and no-history', () => {
    expect(
      formatBookMaxDeltaLine({ bookMax: 1500, deskMaxBet: '$500' })
    ).toBe('Book max (last known): $1,500 · desk maxBet: $500 · Δ −$1,000');
    expect(
      formatBookMaxDeltaLine({ bookMax: 500, deskMaxBet: '$1,500' })
    ).toBe('Book max (last known): $500 · desk maxBet: $1,500 · Δ +$1,000');
    expect(formatBookMaxDeltaLine({ bookMax: 500, deskMaxBet: '500' })).toBe(
      'Book max (last known): $500 · desk maxBet: 500 · Δ $0'
    );
    expect(formatBookMaxDeltaLine({ bookMax: null, deskMaxBet: '$500' })).toBe(
      'Book max (last known): no book history'
    );
    expect(formatBookMaxDeltaLine({ bookMax: 1500, deskMaxBet: undefined })).toBe(
      'Book max (last known): $1,500 · desk maxBet: —'
    );
  });

  test('formatMaxBetSetConfirm appends compare line', () => {
    expect(
      formatMaxBetSetConfirm({ outId: 'SPEN-1', deskMaxBet: '$500', bookMax: 1500 })
    ).toBe('SPEN-1 max bet set. Book max (last known): $1,500 · desk maxBet: $500 · Δ −$1,000');
    expect(
      formatMaxBetSetConfirm({ outId: 'SPEN-2', deskMaxBet: '200', bookMax: null })
    ).toBe('SPEN-2 max bet set. Book max (last known): no book history');
  });

  test('shouldOfferAdoptBookMax when book known and desk differs', () => {
    expect(shouldOfferAdoptBookMax({ bookMax: 1500, deskMaxBet: '$500' })).toBe(true);
    expect(shouldOfferAdoptBookMax({ bookMax: 1500, deskMaxBet: undefined })).toBe(true);
    expect(shouldOfferAdoptBookMax({ bookMax: 1500, deskMaxBet: '$1,500' })).toBe(false);
    expect(shouldOfferAdoptBookMax({ bookMax: 1500, deskMaxBet: '1500' })).toBe(false);
    expect(shouldOfferAdoptBookMax({ bookMax: null, deskMaxBet: '$500' })).toBe(false);
    expect(shouldOfferAdoptBookMax({ bookMax: 1500, deskMaxBet: '2.5u' })).toBe(true);
    expect(deskMaxBetDiffersFromBookMax('$500', 1500)).toBe(true);
    expect(deskMaxBetDiffersFromBookMax('$1,500', 1500)).toBe(false);
  });

  test('formatBookMaxAsDeskMaxBet and adopt labels are USD display', () => {
    expect(formatBookMaxAsDeskMaxBet(1500)).toBe('$1,500');
    expect(formatAdoptBookMaxButtonLabel(1500)).toBe('Use book $1,500');
    expect(
      formatAdoptBookMaxConfirm({
        outId: 'SPEN-1',
        deskMaxBet: '$1,500',
        bookMax: 1500,
      })
    ).toContain('adopted from book max $1,500');
    expect(
      formatAdoptBookMaxConfirm({
        outId: 'SPEN-1',
        deskMaxBet: '$1,500',
        bookMax: 1500,
      })
    ).toContain('Δ $0');
  });

  test('patchSeatOut adopt path sets desk maxBet only (no limits write)', () => {
    const record: SeatIntakeRecord = {
      partnerCode: 'SPEN',
      callSign: 'SPEN-001',
      outs: [
        {
          book: 'draftkings.com',
          bookLogin: 'dk',
          maxBet: '$500',
          outId: 'SPEN-1',
          primary: true,
        },
      ],
    };
    const bookMax = 1500;
    const deskMaxBet = formatBookMaxAsDeskMaxBet(bookMax);
    const next = patchSeatOut(record, 'SPEN-1', { maxBet: deskMaxBet });
    expect(next.outs[0]!.maxBet).toBe('$1,500');
    // Intake-only mutation — partner_account_limits is never touched here.
    expect(next.outs[0]!.book).toBe('draftkings.com');
  });
});

describe('seat-desk-book-max with in-memory sqlite', () => {
  test('latestLimitForSportsbook returns raised max_wager', () => {
    const db = new Database(':memory:');
    ensureAccountLimitsSchema(db);
    const now = Math.floor(Date.now() / 1000);
    const { nodeId } = seedAccountLimitsDemo(db, { nowSec: now, force: true });
    const repo = new AccountLimitsRepository(db);

    const dk = repo.latestLimitForSportsbook(nodeId, 'draftkings');
    expect(dk).not.toBeNull();
    expect(dk!.max_wager).toBe(1500);
    expect(dk!.previous_max).toBe(500);

    const fd = repo.latestLimitForSportsbook(nodeId, 'FanDuel');
    expect(fd).not.toBeNull();
    expect(fd!.max_wager).toBe(1000);

    expect(repo.latestLimitForSportsbook(nodeId, 'betmgm')).toBeNull();
    db.close();
  });

  test('loadBookMaxComparesForSeatDesk maps outs by fuzzy book match', () => {
    const db = new Database(':memory:');
    ensureAccountLimitsSchema(db);
    const now = Math.floor(Date.now() / 1000);
    const nodeId = 'seat-desk-test-node';
    seedAccountLimitsDemo(db, { nodeId, nowSec: now, force: true });

    const record: SeatIntakeRecord = {
      partnerCode: 'SPEN',
      callSign: 'SPEN-001',
      outs: [
        {
          book: 'www.draftkings.com',
          bookLogin: 'dkuser',
          maxBet: '$500',
          outId: 'SPEN-1',
          primary: true,
        },
        {
          book: 'fanduel.com',
          bookLogin: 'fduser',
          maxBet: '1000',
          outId: 'SPEN-2',
        },
        {
          book: 'parlay21.com',
          bookLogin: 'p21',
          maxBet: '300',
          outId: 'SPEN-3',
        },
      ],
    };

    const map = loadBookMaxComparesForSeatDesk(db, record, { nodeId });
    expect(map).not.toBeNull();
    expect(map!.get('SPEN-1')?.bookMax).toBe(1500);
    expect(map!.get('SPEN-1')?.sportsbook).toBe('draftkings');
    expect(map!.get('SPEN-2')?.bookMax).toBe(1000);
    expect(map!.get('SPEN-3')).toBeNull();

    const lines = formatOutBookMaxLines(record, map!);
    expect(lines[0]!.line).toContain('Book max (last known): $1,500');
    expect(lines[0]!.line).toContain('desk maxBet: $500');
    expect(lines[0]!.line).toContain('Δ −$1,000');
    expect(lines[2]!.line).toBe('Book max (last known): no book history');
    db.close();
  });

  test('matchDeskBookToLatestLimit prefers exact sportsbook key', () => {
    const db = new Database(':memory:');
    ensureAccountLimitsSchema(db);
    const { nodeId } = seedAccountLimitsDemo(db, { force: true });
    const limits = new AccountLimitsRepository(db).latestLimitsPerSportsbook(nodeId);
    const hit = matchDeskBookToLatestLimit('DraftKings', limits);
    expect(hit?.sportsbook).toBe('draftkings');
    expect(hit?.max_wager).toBe(1500);
    db.close();
  });

  test('rich desk blocks include book max lines when compares provided', () => {
    const record: SeatIntakeRecord = {
      partnerCode: 'SPEN',
      callSign: 'SPEN-001',
      outs: [
        {
          book: 'draftkings.com',
          bookLogin: 'dk',
          maxBet: '$500',
          outId: 'SPEN-1',
          paymentRail: 'Venmo',
          sendTo: '@x',
          primary: true,
        },
      ],
    };
    const compares = mapOutsToBookMaxCompares(record, [
      {
        limit_id: 1,
        sportsbook: 'draftkings',
        sport_id: 'nba',
        market_id: 'totals',
        bet_type: 'straight',
        max_wager: 1500,
        recorded_at: 1,
        previous_max: 500,
      },
    ]);
    const blocks = buildSeatCapitalDeskRichBlocks(record, new Date('2026-07-27T12:00:00Z'), {
      bookMaxByOutId: compares,
    });
    const htmlish = JSON.stringify(blocks);
    expect(htmlish).toContain('Book max (last known): $1,500');
    expect(htmlish).toContain('desk maxBet: $500');
    expect(htmlish).toContain('Δ −$1,000');
  });
});
