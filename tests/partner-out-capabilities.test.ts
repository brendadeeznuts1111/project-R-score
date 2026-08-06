import { describe, expect, test } from 'bun:test';
import {
  PARTNER_OUT_CAPABILITY_SCHEMA_V1,
  evaluateExecutionConstraints,
  parseCurrencyCode,
  parsePartnerOutCapabilitySnapshot,
  type PartnerOutCapabilitySnapshot,
} from '../packages/partners/src/index.ts';

const NOW = '2026-08-06T12:00:00.000Z';
function provenance(originalValue: string) {
  return { sourceSystemId: 'pph-capability-probe', sourceRecordRef: 'probe:out-ASH-1', adapterId: 'pph-capability-v1', adapterVersion: '1', observedAt: NOW, originalValue, mappingMethod: 'identity', confidence: 'exact' };
}
function wire(): any {
  return {
    schema: PARTNER_OUT_CAPABILITY_SCHEMA_V1,
    partnerCode: 'ASH', outId: 'out-ASH-1', observedAt: NOW,
    sportsbook: { sportsbookId: 'hard-rock-florida', accountEntrypointUrl: 'https://account.hardrock.bet/login', host: 'account.hardrock.bet', skinLabel: 'Hard Rock Bet Florida', brandGroup: 'Hard Rock International', resolutionMethod: 'exact' },
    access: {
      credentials: { value: 'configured', provenance: provenance('configured') },
      authorization: { value: 'allowed', provenance: provenance('allowed') },
      providerConnection: { value: 'active', provenance: provenance('active') },
    },
    betStructures: [
      { structure: 'straight', support: 'supported', provenance: provenance('yes') },
      { structure: 'parlay', support: 'supported', provenance: provenance('yes') },
      { structure: 'same_game_parlay', support: 'unknown', provenance: provenance('not-observed') },
    ],
    wagerOfferCatalog: { status: 'complete', sports: ['tennis'], markets: ['match_winner'], phases: ['pregame'], provenance: provenance('tennis') },
    promotionOfferCatalog: { status: 'unknown', offerRefs: [], provenance: provenance('not-observed') },
    limits: [
      { kind: 'max_stake', status: 'known', amount: { currency: 'USD', minorUnits: 50_000 }, scope: {}, provenance: provenance('500') },
      { kind: 'max_gross_payout', status: 'known', amount: { currency: 'USD', minorUnits: 120_000 }, scope: {}, provenance: provenance('1200') },
      { kind: 'max_net_win', status: 'known', amount: { currency: 'USD', minorUnits: 70_000 }, scope: {}, provenance: provenance('700') },
      { kind: 'max_stake', status: 'known', amount: { currency: 'USD', minorUnits: 25_000 }, scope: { sport: 'tennis', structure: 'parlay' }, provenance: provenance('250') },
    ],
  };
}
function request(capability: PartnerOutCapabilitySnapshot) {
  return {
    capability,
    wager: { structure: 'parlay' as const, sport: 'tennis', market: 'match_winner', phase: 'pregame' as const },
    stake: { currency: parseCurrencyCode('USD'), minorUnits: 25_000 },
    projectedGrossPayout: { currency: parseCurrencyCode('USD'), minorUnits: 60_000 },
    projectedNetWin: { currency: parseCurrencyCode('USD'), minorUnits: 35_000 },
    reservableLiquidity: { currency: parseCurrencyCode('USD'), minorUnits: 80_000 },
  };
}

describe('partner out capabilities and execution constraints', () => {
  test('parses URL, skin, offers, access, structures, and scoped limits', () => {
    const parsed = parsePartnerOutCapabilitySnapshot(wire());
    expect(parsed).toMatchObject({ partnerCode: 'ASH', outId: 'out-ASH-1', sportsbook: { sportsbookId: 'hard-rock-florida', skinLabel: 'Hard Rock Bet Florida' } });
    expect(parsed.betStructures.map(item => [item.structure, item.support])).toEqual([['straight', 'supported'], ['parlay', 'supported'], ['same_game_parlay', 'unknown']]);
  });

  test('allows only when access, offers, limits, projections, and liquidity pass', () => {
    const result = evaluateExecutionConstraints(request(parsePartnerOutCapabilitySnapshot(wire())));
    expect(result.decision).toBe('allow');
    expect(result.checks).toHaveLength(9);
  });

  test('denies breaches and requires manual review for unknown max win or liquidity', () => {
    const capability = parsePartnerOutCapabilitySnapshot(wire());
    const high = request(capability); high.stake.minorUnits = 25_001;
    expect(evaluateExecutionConstraints(high).decision).toBe('deny');
    const unknown = parsePartnerOutCapabilitySnapshot(wire());
    const maxWin = unknown.limits.find(item => item.kind === 'max_net_win')!;
    maxWin.status = 'unknown'; delete maxWin.amount;
    const input = request(unknown) as ReturnType<typeof request> & { reservableLiquidity?: ReturnType<typeof request>['reservableLiquidity'] };
    delete input.reservableLiquidity;
    expect(evaluateExecutionConstraints(input).decision).toBe('manual_review');
  });

  test('rejects unsafe URLs, cross-partner IDs, loose money, and leaked fields', () => {
    const unsafe = wire(); unsafe.sportsbook.accountEntrypointUrl = 'https://user:secret@account.hardrock.bet/login?token=x';
    expect(() => parsePartnerOutCapabilitySnapshot(unsafe)).toThrow('must not contain credentials');
    const cross = wire(); cross.outId = 'out-BIL-1';
    expect(() => parsePartnerOutCapabilitySnapshot(cross)).toThrow('must belong');
    const float = wire(); float.limits[0].amount.minorUnits = 1.25;
    expect(() => parsePartnerOutCapabilitySnapshot(float)).toThrow('safe integer');
    const leaked = wire(); leaked.sportsbook.username = 'must-not-pass';
    expect(() => parsePartnerOutCapabilitySnapshot(leaked)).toThrow('username');
  });

  test('rejects cross-currency and ambiguous equal-specificity facts', () => {
    const capability = parsePartnerOutCapabilitySnapshot(wire());
    const currency = request(capability); currency.projectedNetWin.currency = parseCurrencyCode('EUR');
    expect(() => evaluateExecutionConstraints(currency)).toThrow('currency mismatch');
    capability.limits.push({ kind: 'max_stake', status: 'known', amount: { currency: parseCurrencyCode('USD'), minorUnits: 20_000 }, scope: { market: 'match_winner', structure: 'parlay' }, provenance: capability.limits[0]!.provenance });
    expect(() => evaluateExecutionConstraints(request(capability))).toThrow('ambiguous matching facts');
  });
});
