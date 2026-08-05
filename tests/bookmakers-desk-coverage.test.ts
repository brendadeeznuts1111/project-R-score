// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  applyDeskMaxBetsToCatalog,
  buildDeskCoverageReport,
  classifyDeskBook,
  collectDeskBooks,
  DESK_BOOK_ALIASES,
  matchDeskBookToRegistry,
} from '../lib/bookmakers/desk-coverage.ts';
import { loadBookmakerRegistry } from '../lib/bookmakers/resolve.ts';

describe('bookmakers desk coverage', () => {
  test('classifies placeholders and domain-style desk books', async () => {
    const reg = await loadBookmakerRegistry();
    expect(classifyDeskBook('Partner book TBD', reg).class).toBe('placeholder');
    expect(classifyDeskBook('SouthFL PPH Desk', reg).class).toBe('placeholder');
    expect(matchDeskBookToRegistry('parlay21.com', reg)).toBe('parlay21-com');
    expect(matchDeskBookToRegistry('Hard Rock Florida', reg)).toBe('hard-rock-florida');
    expect(matchDeskBookToRegistry('action92.com', reg)).toBe('action92-com');
    expect(classifyDeskBook('Orange777', reg).class).toBe('unmatched');
  });

  test('DESK_BOOK_ALIASES maps known typos only (not Orange777)', async () => {
    const reg = await loadBookmakerRegistry();
    expect(DESK_BOOK_ALIASES['orange777']).toBeUndefined();
    expect(DESK_BOOK_ALIASES['orange-777']).toBeUndefined();
    expect(matchDeskBookToRegistry('hardrock florida', reg)).toBe('hard-rock-florida');
    expect(matchDeskBookToRegistry('parlay21', reg)).toBe('parlay21-com');
    expect(matchDeskBookToRegistry('Orange777', reg)).toBeUndefined();
  });

  test('report against committed seat desk + registry', async () => {
    if (!(await Bun.file('public/registry/seat-capital-desk.json').exists())) {
      return; // optional in some worktrees
    }
    const desk = JSON.parse(await Bun.file('public/registry/seat-capital-desk.json').text());
    const reg = await loadBookmakerRegistry();
    const report = buildDeskCoverageReport(desk, reg, 'fixed');
    expect(report.deskBooks).toBeGreaterThanOrEqual(3);
    expect(report.matched).toBeGreaterThanOrEqual(1);
    expect(report.hits.some(h => h.class === 'placeholder')).toBe(true);
    // Orange777 remains unmatched until domain SSOT exists
    const orange = report.hits.find(h => h.deskBook.toLowerCase() === 'orange777');
    if (orange) expect(orange.class).toBe('unmatched');
    const hr = report.hits.find(h => h.registryId === 'hard-rock-florida');
    if (hr?.maxBetUsd != null) expect(hr.maxBetUsd).toBe(500);
  });

  test('applyDeskMaxBetsToCatalog fills missing max only', () => {
    const books = {
      'hard-rock-florida': { limits: { maxBetUsd: null as number | null, liquidityTier: 'medium' } },
      pinnacle: { limits: { maxBetUsd: null as number | null, liquidityTier: 'high' } },
    };
    const report = {
      generatedAt: 't',
      deskBooks: 1,
      matched: 1,
      placeholder: 0,
      unmatched: 0,
      hits: [
        {
          deskBook: 'Hard Rock Florida',
          class: 'matched' as const,
          registryId: 'hard-rock-florida',
          maxBetUsd: 500,
          samples: 2,
        },
      ],
      registryUnused: [],
    };
    expect(applyDeskMaxBetsToCatalog(books, report)).toBe(1);
    expect(books['hard-rock-florida'].limits.maxBetUsd).toBe(500);
    expect(books.pinnacle.limits.maxBetUsd).toBeNull();
  });

  test('collectDeskBooks counts samples', () => {
    const map = collectDeskBooks({
      desks: [
        { outs: [{ book: 'Hard Rock Florida', maxBet: '500' }, { book: 'Hard Rock Florida', maxBet: '—' }] },
      ],
    });
    expect(map.get('Hard Rock Florida')?.count).toBe(2);
    expect(map.get('Hard Rock Florida')?.maxBets).toEqual([500]);
  });
});
