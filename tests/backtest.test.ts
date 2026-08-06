import { describe, expect, test } from 'bun:test';
import { runBacktest } from '../lib/operator-research/backtest.ts';
import { defaultAlertRules } from '../lib/operator-research/edge-engine.ts';
import { asRuleId } from '../lib/types/branded.ts';

describe('backtest', () => {
  test('returns metrics for known rule with seed', () => {
    const rules = defaultAlertRules();
    const out = runBacktest(rules, {
      ruleId: asRuleId('arbitrage'),
      startDate: '2026-07-01',
      endDate: '2026-07-14',
      seed: 42,
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.mock).toBe(true);
    expect(out.result.totalBets).toBeGreaterThan(0);
    expect(out.result.wins + out.result.loss).toBe(out.result.totalBets);
    expect(Number.isFinite(out.result.roi)).toBe(true);
    expect(out.result.dailyReturns.length).toBeGreaterThan(0);
  });

  test('rejects bad dates and unknown rule', () => {
    const rules = defaultAlertRules();
    expect(
      runBacktest(rules, {
        ruleId: asRuleId('arbitrage'),
        startDate: 'nope',
        endDate: '2026-07-01',
      }).ok,
    ).toBe(false);
    expect(
      runBacktest(rules, {
        ruleId: asRuleId('missing-rule'),
        startDate: '2026-07-01',
        endDate: '2026-07-10',
      }).ok,
    ).toBe(false);
  });

  test('is deterministic with seed', () => {
    const rules = defaultAlertRules();
    const a = runBacktest(rules, {
      ruleId: asRuleId('value-bet'),
      startDate: '2026-06-01',
      endDate: '2026-06-20',
      seed: 7,
    });
    const b = runBacktest(rules, {
      ruleId: asRuleId('value-bet'),
      startDate: '2026-06-01',
      endDate: '2026-06-20',
      seed: 7,
    });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.result.totalProfit).toBe(b.result.totalProfit);
      expect(a.result.winRate).toBe(b.result.winRate);
    }
  });
});
