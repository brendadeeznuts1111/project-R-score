import { describe, expect, test } from 'bun:test';
import {
  extractEtldPlusOne,
  mergeBookmakersWithOps,
  resolvePartnerForHost,
  type MergedRegistry,
} from '../lib/bookmakers/merged-registry.ts';
import type { BookmakerRegistryEntry } from '../lib/bookmakers/resolve.ts';

const sampleBooks: Record<string, BookmakerRegistryEntry> = {
  pinnacle: {
    id: 'pinnacle',
    slug: 'pinnacle',
    label: 'Pinnacle',
    urls: { web: 'https://www.pinnacle.com', api: null },
    fetcher: 'rest',
    sports: ['tennis'],
    limits: { liquidityTier: 'high', maxBetUsd: null, minBetUsd: null },
  } as BookmakerRegistryEntry,
  'hard-rock-florida': {
    id: 'hard-rock-florida',
    slug: 'hard-rock-florida',
    label: 'Hard Rock Florida',
    urls: { web: 'https://hardrockfl.sportsbook.hardrock.bet', api: null },
    fetcher: 'webview',
    sports: ['tennis', 'soccer'],
    limits: { liquidityTier: 'medium', maxBetUsd: 500, minBetUsd: null },
  } as BookmakerRegistryEntry,
};

describe('extractEtldPlusOne', () => {
  test('strips www and multi-label to last two', () => {
    expect(extractEtldPlusOne('www.pinnacle.com')).toBe('pinnacle.com');
    expect(extractEtldPlusOne('hardrockfl.sportsbook.hardrock.bet')).toBe(
      'hardrock.bet',
    );
  });
});

describe('mergeBookmakersWithOps', () => {
  test('merges liquidity from public catalog + out readiness', () => {
    const merged: MergedRegistry = mergeBookmakersWithOps(
      sampleBooks,
      {
        generatedAt: '2026-08-05T00:00:00.000Z',
        partners: [
          {
            code: 'ASH',
            outs: [
              {
                status: 'ready',
                book: { slug: 'hard-rock-florida' },
              },
              {
                status: 'deferred',
                book: { slug: 'hard-rock-florida' },
              },
            ],
          },
        ],
      },
      { now: '2026-08-05T12:00:00.000Z' },
    );

    expect(merged.health).toHaveLength(2);
    const hr = merged.health.find(h => h.id === 'hard-rock-florida');
    expect(hr?.liquidityTier).toBe('medium');
    expect(hr?.outsReady).toBe(1);
    expect(hr?.outsTotal).toBe(2);
    expect(hr?.status).toBe('degraded'); // partial outs ready
    expect(hr?.maxBetUsd).toBe(500);

    const pin = merged.health.find(h => h.id === 'pinnacle');
    expect(pin?.liquidityTier).toBe('high');
    expect(pin?.status).toBe('deferred'); // catalog presence is not health evidence

    const id = resolvePartnerForHost(merged.hostIndex, 'hardrock.bet');
    expect(id).toBe('hard-rock-florida');
  });

  test('keeps liquidity separate from readiness status', () => {
    const lowLiquidityBook = {
      id: 'low-book',
      slug: 'low-book',
      label: 'Low Book',
      urls: { web: 'https://low.example', api: null },
      fetcher: 'seat',
      sports: ['basketball'],
      limits: { liquidityTier: 'low', maxBetUsd: 100, minBetUsd: null },
    } as BookmakerRegistryEntry;

    const merged = mergeBookmakersWithOps(
      { 'low-book': lowLiquidityBook },
      {
        generatedAt: '2026-08-05T12:00:00.000Z',
        partners: [
          {
            code: 'LOW',
            outs: [{ status: 'funded', book: { slug: 'low-book' } }],
          },
        ],
      },
      { now: '2026-08-05T12:00:00.000Z' },
    );

    expect(merged.health[0]?.liquidityTier).toBe('low');
    expect(merged.health[0]?.balance).toBeNull();
    expect(merged.health[0]?.status).toBe('active');
    expect(merged.health[0]?.lastProbe).toBe('2026-08-05T12:00:00.000Z');
  });

  test('marks every catalog row deferred when the ops overlay is unavailable', () => {
    const merged = mergeBookmakersWithOps(
      sampleBooks,
      null,
      { now: '2026-08-05T12:00:00.000Z' },
    );

    expect(merged.health.every(row => row.status === 'deferred')).toBe(true);
    expect(merged.health.every(row => row.lastProbe === null)).toBe(true);
    expect(merged.source.partnersOps).toBeNull();
  });
});
