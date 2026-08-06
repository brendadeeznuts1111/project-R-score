import { describe, expect, test } from 'bun:test';
import {
  detectArbitrage,
  detectValueEdges,
  multiWayArbEdge,
  parseOddsJson,
  rankSignals,
  runEdgeScan,
  steamVelocity,
  syntheticSnapshot,
  twoWayArbProfit,
} from '../lib/operator-research/odds/index.ts';
import { joinPath } from '../lib/path-bun.ts';

const FIX = joinPath(import.meta.dir, '../lib/operator-research/fixtures/odds');

async function load(host: string, file: string) {
  const text = await Bun.file(joinPath(FIX, file)).text();
  return parseOddsJson(text, { host, source: 'fixture' });
}

describe('odds edge depth', () => {
  test('multi-way arb math: best legs across books', () => {
    // NYY 2.2 + BOS 2.25 → invSum ≈ 0.899
    const edge = multiWayArbEdge([2.2, 2.25]);
    expect(edge).toBeGreaterThan(0.09);
    expect(twoWayArbProfit(2.2, 2.25)).toBeGreaterThan(0.09);
  });

  test('detectArbitrage uses best price per selection (not same-side sum)', async () => {
    const hr = await load('hardrock.bet', 'hardrock-arb.json');
    const dk = await load('sportsbook.draftkings.com', 'draftkings-arb.json');
    const signals = detectArbitrage([hr, dk], { minEdge: 0.02 });
    expect(signals.some(s => s.type === 'arbitrage')).toBe(true);
    const arb = signals.find(s => s.type === 'arbitrage')!;
    expect(arb.meta?.legs?.length).toBe(2);
    expect(arb.meta?.edgePct).toBeGreaterThan(2);
    // Legs should be on different hosts for a true cross-book split
    const hosts = new Set(arb.meta!.legs!.map(l => l.host));
    expect(hosts.size).toBe(2);
  });

  test('detectValueEdges flags soft book vs pinnacle', async () => {
    const pin = await load('www.pinnacle.com', 'pinnacle.json');
    const hr = await load('hardrock.bet', 'hardrock.json');
    // hardrock 1.91/1.95 is close to pin 1.95/1.95 — use synthetic soft fat price
    const soft = structuredClone(hr);
    soft.markets[0]!.selections[0]!.price = 2.15; // fat NYY
    const signals = detectValueEdges([pin, soft], { minEvPct: 1 });
    expect(signals.some(s => s.type === 'value')).toBe(true);
    const v = signals.find(s => s.type === 'value')!;
    expect(v.meta?.sharpHost).toContain('pinnacle');
    expect(v.meta?.evPct ?? 0).toBeGreaterThan(0);
  });

  test('steamVelocity scales with time', () => {
    const v1 = steamVelocity(2.0, 2.2, 0, 60_000); // +10% in 1 min
    expect(v1).toBeCloseTo(0.1, 5);
    const v2 = steamVelocity(2.0, 2.2, 0, 120_000);
    expect(v2).toBeCloseTo(0.05, 5);
  });

  test('runEdgeScan --seed-arb produces arbitrage summary', async () => {
    const report = await runEdgeScan({
      hosts: ['hardrock.bet', 'sportsbook.draftkings.com'],
      seedFixtures: {
        'hardrock.bet': 'hardrock-arb',
        'sportsbook.draftkings.com': 'draftkings-arb',
      },
      store: false,
      minArbEdge: 0.02,
    });
    expect(report.snapshots).toBe(2);
    expect(report.summary.arbitrage).toBeGreaterThanOrEqual(1);
    const ranked = rankSignals(report.signals);
    expect(ranked[0]!.type).toBe('arbitrage');
  });

  test('identical two-way books do not produce arbitrage', () => {
    const market = {
      id: 'm1',
      name: 'Coin Flip',
      selections: [
        { name: 'Heads', price: 1.91 },
        { name: 'Tails', price: 1.91 },
      ],
    };
    const a = syntheticSnapshot('a.example', [market]);
    const b = syntheticSnapshot('b.example', [structuredClone(market)]);
    const signals = detectArbitrage([a, b], { minEdge: 0.01 });
    expect(signals.filter(s => s.type === 'arbitrage').length).toBe(0);
  });
});
