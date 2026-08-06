import { describe, expect, test } from 'bun:test';
import {
  buildPartnerHealthPayload,
  derivePartnerStatus,
  extractEtldPlusOne,
  isArbEligible,
  loadMergedRegistry,
  lookupBookByHost,
} from '../lib/bookmakers/merge.ts';
import { resolveTelegramTarget } from '../lib/operator-research/partners-signal.ts';

describe('bookmakers merge registry', () => {
  test('extractEtldPlusOne strips subdomains', () => {
    expect(extractEtldPlusOne('hardrockfl.sportsbook.hardrock.bet')).toBe('hardrock.bet');
    expect(extractEtldPlusOne('www.pinnacle.com')).toBe('pinnacle.com');
    expect(extractEtldPlusOne('sportsbook.draftkings.com')).toBe('draftkings.com');
  });

  test('loadMergedRegistry joins public liquidity with ops balance/health', () => {
    const reg = loadMergedRegistry();
    expect(reg.count).toBeGreaterThanOrEqual(5);
    const hr = reg.books['hard-rock-florida'];
    expect(hr).toBeDefined();
    expect(hr!.liquidityTier).toBe('medium');
    expect(hr!.limits.maxBetUsd).toBe(500);
    expect(hr!.etldPlusOne).toBe('hardrock.bet');
    expect(hr!.status).toBeTruthy();
    expect(hr!.balance).toBeDefined();
    expect(reg.books.pinnacle?.liquidityTier).toBe('high');
  });

  test('lookupBookByHost resolves hardrock.bet → hard-rock-florida', () => {
    const reg = loadMergedRegistry();
    const hit = lookupBookByHost(reg, 'https://www.hardrock.bet/sports');
    expect(hit?.id).toBe('hard-rock-florida');
  });

  test('buildPartnerHealthPayload shape for dashboard', () => {
    const payload = buildPartnerHealthPayload();
    expect(payload.ok).toBe(true);
    expect(payload.health.length).toBe(payload.summary.total);
    expect(payload.lastUpdated).toBe(payload.generatedAt);
    expect(payload.health[0]).toHaveProperty('liquidityTier');
    expect(payload.health[0]).toHaveProperty('status');
    expect(payload.health[0]).toHaveProperty('providerType');
    expect(payload.health[0]).toHaveProperty('paymentMethods');
    expect(payload.health[0]).toHaveProperty('contact');
    expect(payload.health[0]).toHaveProperty('limits');
    expect(payload.summary.byLiquidity).toBeDefined();
  });

  test('derivePartnerStatus + arb eligibility', () => {
    expect(derivePartnerStatus({ healthStatus: 'down' })).toBe('offline');
    expect(derivePartnerStatus({ healthStatus: 'ok', balanceAmount: 50 })).toBe('critical');
    expect(derivePartnerStatus({ healthStatus: 'ok', balanceAmount: 200 })).toBe('low_balance');
    expect(
      isArbEligible({
        liquidityTier: 'illiquid',
        status: 'active',
        balance: { amount: 1000 },
      })
    ).toBe(false);
    expect(
      isArbEligible({
        liquidityTier: 'high',
        status: 'active',
        balance: { amount: null },
      })
    ).toBe(true);
  });

  test('resolveTelegramTarget uses partners-ops chatId for hard-rock-florida', () => {
    const target = resolveTelegramTarget('hard-rock-florida');
    expect(target?.source).toBe('partners-ops');
    expect(target?.chatId).toMatch(/^-?\d+$/);
    expect(target?.partnerCode).toBeTruthy();
  });
});
