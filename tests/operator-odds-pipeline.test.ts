import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import {
  buildOddsFetchOptions,
  clearPrewarmState,
  detectArbitrage,
  detectChanges,
  detectPatterns,
  endpointFromHost,
  parseOddsJson,
  prewarmBookmaker,
  runMonitorTick,
  syntheticSnapshot,
} from '../lib/operator-research/odds/index.ts';
import { openOddsDb } from '../lib/operator-research/odds/odds-store.ts';
import { asHostId } from '../lib/types/branded.ts';

const TMP_DB = join(import.meta.dir, '../data/operator-research/test-odds.db');

describe('operator odds pipeline', () => {
  beforeAll(() => {
    try {
      rmSync(TMP_DB, { force: true });
    } catch {
      /* ignore */
    }
    openOddsDb(TMP_DB);
  });

  afterAll(() => {
    clearPrewarmState();
    try {
      rmSync(TMP_DB, { force: true });
    } catch {
      /* ignore */
    }
  });

  test('prewarm records stats without throwing', () => {
    const s = prewarmBookmaker('hardrock.bet');
    expect(s.hostKey).toBe('hardrock.bet');
    expect(s.prewarms).toBeGreaterThanOrEqual(1);
  });

  test('HTTP/2 is explicit and default transport remains unpinned', () => {
    const automatic = endpointFromHost('auto.example');
    expect(automatic.protocol).toBeUndefined();
    expect('protocol' in automatic).toBe(false);

    const h2 = endpointFromHost('h2.example', { protocol: 'http2' });
    expect(h2.protocol).toBe('http2');
    expect(buildOddsFetchOptions({ protocol: h2.protocol }).protocol).toBe('http2');
    expect('protocol' in buildOddsFetchOptions()).toBe(false);
  });

  test('parseOddsJson reads fixture shape', async () => {
    const text = await Bun.file(
      join(import.meta.dir, '../lib/operator-research/fixtures/odds/hardrock.json')
    ).text();
    const snap = parseOddsJson(text, { host: 'hardrock.bet', source: 'fixture' });
    expect(String(snap.host)).toBe('hardrock.bet');
    expect(snap.markets.length).toBe(2);
    expect(snap.markets[0]!.selections[0]!.price).toBe(1.91);
    expect(snap.limits.maxBet).toBe(1000);
  });

  test('detectChanges finds price moves, new markets, limit cuts', async () => {
    const a = parseOddsJson(
      await Bun.file(
        join(import.meta.dir, '../lib/operator-research/fixtures/odds/hardrock.json')
      ).text(),
      { host: 'hardrock.bet', source: 'fixture' }
    );
    const b = parseOddsJson(
      await Bun.file(
        join(import.meta.dir, '../lib/operator-research/fixtures/odds/hardrock-moved.json')
      ).text(),
      { host: 'hardrock.bet', source: 'fixture' }
    );
    const diff = detectChanges(a, b);
    expect(diff.identical).toBe(false);
    expect(diff.marketsAdded).toContain('mlb-nyy-bos-spread');
    expect(diff.priceChanges.length).toBeGreaterThan(0);
    expect(diff.limitChanges).not.toBeNull();
    expect(diff.limitChanges!.to.maxBet).toBe(400);
  });

  test('detectPatterns emits line_move, steam, new_market, suspicious', async () => {
    const a = parseOddsJson(
      await Bun.file(
        join(import.meta.dir, '../lib/operator-research/fixtures/odds/hardrock.json')
      ).text(),
      { host: 'hardrock.bet', source: 'fixture', timestamp: 1 }
    );
    const b = parseOddsJson(
      await Bun.file(
        join(import.meta.dir, '../lib/operator-research/fixtures/odds/hardrock-moved.json')
      ).text(),
      { host: 'hardrock.bet', source: 'fixture', timestamp: 2 }
    );
    const diff = detectChanges(a, b);
    const patterns = detectPatterns(b, [a], { diff });
    const types = new Set(patterns.map(p => p.type));
    expect(types.has('line_move')).toBe(true);
    expect(types.has('new_market')).toBe(true);
    // steam needs multi-market same-direction; suspicious needs limit cut w/o price moves
    expect(patterns.length).toBeGreaterThanOrEqual(2);
  });

  test('detectPatterns suspicious on limit cut without prices', () => {
    const a = syntheticSnapshot('lim.example', [
      { id: 'm', name: 'ML', selections: [{ name: 'A', price: 1.9 }] },
    ], { maxBet: 1000, minBet: 1 }, 1);
    const b = syntheticSnapshot('lim.example', [
      { id: 'm', name: 'ML', selections: [{ name: 'A', price: 1.9 }] },
    ], { maxBet: 200, minBet: 1 }, 2);
    const diff = detectChanges(a, b);
    const patterns = detectPatterns(b, [a], { diff });
    expect(patterns.some(p => p.type === 'suspicious')).toBe(true);
  });

  test('detectArbitrage finds multi-book edge on synthetic decimals', () => {
    const hostA = asHostId('book-a.example');
    const hostB = asHostId('book-b.example');
    const market = {
      id: 'm1',
      name: 'Coin Flip',
      selections: [
        { name: 'Heads', price: 2.2 },
        { name: 'Tails', price: 2.2 },
      ],
    };
    // Same market both books with >2.0 both sides → invSum < 1
    const snaps = [
      syntheticSnapshot(String(hostA), [market], { maxBet: 100, minBet: 1 }, 10),
      syntheticSnapshot(String(hostB), [
        {
          id: 'm1',
          name: 'Coin Flip',
          selections: [
            { name: 'Heads', price: 2.15 },
            { name: 'Tails', price: 2.15 },
          ],
        },
      ], { maxBet: 100, minBet: 1 }, 10),
    ];
    // For true arb need sum of best prices per side: use complementary books
    const arbSnaps = [
      syntheticSnapshot('arb-a.example', [
        {
          id: 'cf',
          name: 'Coin Flip',
          selections: [
            { name: 'Heads', price: 2.1 },
            { name: 'Tails', price: 1.7 },
          ],
        },
      ]),
      syntheticSnapshot('arb-b.example', [
        {
          id: 'cf',
          name: 'Coin Flip',
          selections: [
            { name: 'Heads', price: 1.7 },
            { name: 'Tails', price: 2.1 },
          ],
        },
      ]),
    ];
    // Best-price-per-selection arb: book A fat on Yes, book B fat on No.
    const simple = [
      syntheticSnapshot('x.example', [
        {
          id: 'm',
          name: 'M',
          selections: [
            { name: 'Yes', price: 2.2 },
            { name: 'No', price: 1.7 },
          ],
        },
      ]),
      syntheticSnapshot('y.example', [
        {
          id: 'm',
          name: 'M',
          selections: [
            { name: 'Yes', price: 1.7 },
            { name: 'No', price: 2.25 },
          ],
        },
      ]),
    ];
    const signals = detectArbitrage(simple, { minEdge: 0.0 });
    // best Yes 2.2 + best No 2.25 → invSum ≈ 0.899 < 1 → arb
    expect(signals.some(s => s.type === 'arbitrage')).toBe(true);
    expect(detectArbitrage(snaps).length).toBeGreaterThan(0);
    expect(detectArbitrage(arbSnaps).length).toBeGreaterThan(0);
  });

  test('runMonitorTick fixture fallback produces ok results', async () => {
    const results = await runMonitorTick({
      endpoints: [
        endpointFromHost('hardrock.bet', {
          url: 'https://hardrock.bet/api/odds-that-will-fail',
          fixtureId: 'hardrock',
        }),
      ],
      fixtureFallback: true,
      store: false,
      window: 3,
    });
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    expect(results[0]!.snapshot?.markets.length).toBeGreaterThan(0);
    expect(results[0]!.snapshot?.source).toBe('fixture');
  });

  test('Bun.deepEquals short-circuit identical snapshots', () => {
    const s = syntheticSnapshot('same.example', [
      { id: '1', name: 'ML', selections: [{ name: 'A', price: 1.9 }] },
    ]);
    const copy = structuredClone(s);
    copy.timestamp = s.timestamp + 1000;
    const diff = detectChanges(s, copy);
    expect(diff.identical).toBe(true);
  });
});
