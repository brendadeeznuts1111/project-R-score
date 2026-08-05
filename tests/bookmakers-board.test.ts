// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  bookStatus,
  filterBooks,
  formatRegion,
  normalizeBooks,
  countByFetcher,
  uniqueSports,
  rowHtml,
  slugEqualsId,
  bookDomain,
} from '../public/portal/bookmakers/bookmakers-board.js';

const BOARD = 'public/portal/bookmakers/index.html';
const SCRIPT = 'public/portal/bookmakers/bookmakers-board.js';

describe('bookmakers board helpers', () => {
  test('normalizeBooks accepts map or list and sorts by id', () => {
    const fromMap = normalizeBooks({
      bookmakers: {
        fanduel: { id: 'fanduel', label: 'FanDuel', domain: 'x', fetcherType: 'webview' },
        pinnacle: { id: 'pinnacle', label: 'Pinnacle', domain: 'y', fetcherType: 'rest' },
      },
    });
    expect(fromMap.map(b => b.id)).toEqual(['fanduel', 'pinnacle']);

    const fromList = normalizeBooks({
      bookmakers: [{ id: 'zeta', domain: 'z', fetcherType: 'seat' }, { id: 'alpha', domain: 'a', fetcherType: 'seat' }],
    });
    expect(fromList.map(b => b.id)).toEqual(['alpha', 'zeta']);
  });

  test('formatRegion handles country/state objects', () => {
    expect(formatRegion({ country: 'US', stateCode: 'NY' })).toBe('US-NY');
    expect(formatRegion({ country: 'US' })).toBe('US');
    expect(formatRegion('CA')).toBe('CA');
  });

  test('filterBooks by fetcher and search', () => {
    const books = normalizeBooks({
      bookmakers: {
        pinnacle: {
          id: 'pinnacle',
          label: 'Pinnacle',
          domain: 'www.pinnacle.com',
          fetcherType: 'rest',
          supportedSports: ['tennis'],
        },
        fanduel: {
          id: 'fanduel',
          label: 'FanDuel',
          domain: 'sportsbook.fanduel.com',
          fetcherType: 'webview',
          supportedSports: ['basketball'],
        },
        hard: {
          id: 'hard-rock-florida',
          label: 'Hard Rock',
          domain: 'hardrock.bet',
          fetcherType: 'seat',
          supportedSports: ['football'],
        },
      },
    });
    expect(filterBooks(books, { fetcher: 'rest' }).map(b => b.id)).toEqual(['pinnacle']);
    expect(filterBooks(books, { q: 'fan' }).map(b => b.id)).toEqual(['fanduel']);
    expect(filterBooks(books, { q: 'tennis' }).map(b => b.id)).toEqual(['pinnacle']);
    const withTier = books.map((b, i) => ({
      ...b,
      liquidityTier: i === 0 ? 'high' : i === 1 ? 'medium' : 'low',
    }));
    expect(filterBooks(withTier, { tier: 'high' }).map(b => b.id)).toEqual(['fanduel']);
    expect(countByFetcher(books)).toEqual({
      all: 3,
      rest: 1,
      webview: 1,
      seat: 1,
      other: 0,
    });
    expect(uniqueSports(books)).toEqual(['basketball', 'football', 'tennis']);
  });

  test('bookStatus and rowHtml include region chips', () => {
    const ok = {
      id: 'pinnacle',
      slug: 'pinnacle',
      label: 'Pinnacle',
      domain: 'www.pinnacle.com',
      fetcherType: 'rest',
      supportedSports: ['tennis'],
      regions: [{ country: 'US' }, { country: 'GB' }],
      color: '#f59e0b',
      skin: '',
      brandGroup: 'Pinnacle',
      lifecycle: ['pre_match', 'live'],
      liquidityTier: 'high',
      note: '',
    };
    expect(bookStatus(ok)).toBe('ok');
    expect(slugEqualsId(ok)).toBe(true);
    expect(bookStatus({ ...ok, domain: '' })).toBe('incomplete');
    const html = rowHtml(ok, new Set(['sport.tennis']));
    expect(html).toContain('data-glossary-concept="sport.tennis"');
    expect(html).toContain('US');
    expect(html).toContain('fetcher-rest');
    expect(html).toContain('state-ok');
  });

  test('normalizeBooks reads v0.4 urls/fetcher/sports and id===slug', () => {
    const books = normalizeBooks({
      bookmakers: {
        'hard-rock-florida': {
          id: 'hard-rock-florida',
          slug: 'hard-rock-florida',
          label: 'Hard Rock Florida',
          skin: 'HardRockBet Florida',
          brandGroup: 'Hard Rock International',
          fetcher: 'seat',
          sports: ['basketball'],
          urls: { web: 'https://hardrockfl.sportsbook.hardrock.bet' },
          limits: { liquidityTier: 'medium' },
          regions: [{ country: 'US', stateCode: 'FL' }],
        },
      },
    });
    expect(books).toHaveLength(1);
    expect(books[0]!.domain).toBe('hardrockfl.sportsbook.hardrock.bet');
    expect(books[0]!.fetcherType).toBe('seat');
    expect(books[0]!.skin).toBe('HardRockBet Florida');
    expect(slugEqualsId(books[0]!)).toBe(true);
    expect(bookDomain({ urls: { web: 'https://www.pinnacle.com/path' } })).toBe('www.pinnacle.com');
  });
});

describe('bookmakers board shell', () => {
  test('page wires module, filters, hero, and related links', async () => {
    const [html, script] = await Promise.all([
      Bun.file(BOARD).text(),
      Bun.file(SCRIPT).text(),
    ]);
    expect(html).toContain('bookmakers-board.js');
    expect(html).toContain('id="bookmakers-body"');
    expect(html).toContain('id="bookmakers-filter"');
    expect(html).toContain('id="bookmakers-search"');
    expect(html).toContain('id="bookmakers-stats"');
    expect(html).toContain('portal-hero');
    expect(html).toContain('/portal/bookmakers.md');
    expect(html).toContain('/registry/bookmakers.json');
    expect(html).toContain('/portal/limits/');
    expect(html).toContain('/portal/routing.md');

    expect(script).toContain('export function normalizeBooks');
    expect(script).toContain('export function formatRegion');
    expect(script).toContain('export function filterBooks');
  });

  test('committed bake renders through normalizeBooks', async () => {
    const payload = await Bun.file('public/registry/bookmakers.json').json();
    const books = normalizeBooks(payload);
    expect(books.length).toBeGreaterThanOrEqual(5);
    expect(books.some(b => b.id === 'pinnacle')).toBe(true);
    expect(books.some(b => b.fetcherType === 'rest')).toBe(true);
    expect(books.every(b => slugEqualsId(b))).toBe(true);
    expect(books.some(b => b.brandGroup)).toBe(true);
    const regions = books.flatMap(b => b.regions.map(formatRegion));
    expect(regions.some(r => r.includes('US'))).toBe(true);
  });
});
