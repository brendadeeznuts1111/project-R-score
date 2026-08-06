import type { OutId, PartnerCode, SportsbookId } from '../../../../lib/types/branded.ts';
import type { FactProvenance, MoneyAmount, ProviderConnectionStatus } from './types.ts';

export const PARTNER_OUT_CAPABILITY_SCHEMA_V1 = 'factorywager.partner-out-capability.v1' as const;
export const BET_STRUCTURES = ['straight', 'parlay', 'same_game_parlay'] as const;
export type BetStructure = (typeof BET_STRUCTURES)[number];
export const MARKET_PHASES = ['pregame', 'live'] as const;
export type MarketPhase = (typeof MARKET_PHASES)[number];
export const CAPABILITY_SUPPORT_VALUES = ['supported', 'unsupported', 'unknown'] as const;
export type CapabilitySupport = (typeof CAPABILITY_SUPPORT_VALUES)[number];
export const OFFER_CATALOG_STATUSES = ['complete', 'partial', 'unavailable'] as const;
export type OfferCatalogStatus = (typeof OFFER_CATALOG_STATUSES)[number];
export const PROMOTION_CATALOG_STATUSES = ['available', 'none', 'unknown'] as const;
export type PromotionCatalogStatus = (typeof PROMOTION_CATALOG_STATUSES)[number];
export const CREDENTIAL_READINESS_VALUES = ['configured', 'missing', 'unknown'] as const;
export type CredentialReadiness = (typeof CREDENTIAL_READINESS_VALUES)[number];
export const EXECUTION_AUTHORIZATION_STATUSES = ['allowed', 'blocked', 'unknown'] as const;
export type ExecutionAuthorizationStatus = (typeof EXECUTION_AUTHORIZATION_STATUSES)[number];
export const SPORTSBOOK_RESOLUTION_METHODS = ['exact', 'alias', 'manual'] as const;
export type SportsbookResolutionMethod = (typeof SPORTSBOOK_RESOLUTION_METHODS)[number];
export const OUT_LIMIT_KINDS = [
  'max_stake',
  'max_gross_payout',
  'max_net_win',
  'daily_stake',
  'weekly_stake',
] as const;
export type OutLimitKind = (typeof OUT_LIMIT_KINDS)[number];
export const EXECUTION_CRITICAL_LIMIT_KINDS = [
  'max_stake',
  'max_gross_payout',
  'max_net_win',
] as const satisfies readonly OutLimitKind[];
export const OUT_LIMIT_STATUSES = ['known', 'not_applicable', 'unknown'] as const;
export type OutLimitStatus = (typeof OUT_LIMIT_STATUSES)[number];

export type ObservedValue<T> = { value: T; provenance: FactProvenance };
export type WagerScope = {
  sport?: string;
  market?: string;
  structure?: BetStructure;
  phase?: MarketPhase;
};
export type OutLimitFact = {
  kind: OutLimitKind;
  status: OutLimitStatus;
  amount?: MoneyAmount;
  scope: WagerScope;
  provenance: FactProvenance;
};
export type PartnerOutCapabilitySnapshot = {
  schema: typeof PARTNER_OUT_CAPABILITY_SCHEMA_V1;
  partnerCode: PartnerCode;
  outId: OutId;
  observedAt: string;
  sportsbook: {
    sportsbookId: SportsbookId;
    accountEntrypointUrl: string;
    host: string;
    skinLabel?: string;
    brandGroup?: string;
    resolutionMethod: SportsbookResolutionMethod;
  };
  access: {
    credentials: ObservedValue<CredentialReadiness>;
    authorization: ObservedValue<ExecutionAuthorizationStatus>;
    providerConnection: ObservedValue<ProviderConnectionStatus>;
  };
  betStructures: Array<{
    structure: BetStructure;
    support: CapabilitySupport;
    provenance: FactProvenance;
  }>;
  wagerOfferCatalog: {
    status: OfferCatalogStatus;
    sports: string[];
    markets: string[];
    phases: MarketPhase[];
    provenance: FactProvenance;
  };
  promotionOfferCatalog: {
    status: PromotionCatalogStatus;
    offerRefs: string[];
    provenance: FactProvenance;
  };
  limits: OutLimitFact[];
};

export type ExecutionConstraintRequest = {
  capability: PartnerOutCapabilitySnapshot;
  wager: {
    structure: BetStructure;
    sport?: string;
    market?: string;
    phase?: MarketPhase;
  };
  stake: MoneyAmount;
  projectedGrossPayout?: MoneyAmount;
  projectedNetWin?: MoneyAmount;
  reservableLiquidity?: MoneyAmount;
};
export const EXECUTION_CONSTRAINT_OUTCOMES = ['pass', 'fail', 'unknown', 'not_applicable'] as const;
export type ExecutionConstraintOutcome = (typeof EXECUTION_CONSTRAINT_OUTCOMES)[number];
export type ExecutionConstraintCheckCode =
  | 'credentials'
  | 'authorization'
  | 'provider_connection'
  | 'bet_structure'
  | 'wager_offer_catalog'
  | (typeof EXECUTION_CRITICAL_LIMIT_KINDS)[number]
  | 'liquidity';
export type ExecutionConstraintCheck = {
  code: ExecutionConstraintCheckCode;
  outcome: ExecutionConstraintOutcome;
  reason: string;
};
export type ExecutionConstraintDecision = {
  partnerCode: PartnerCode;
  outId: OutId;
  decision: 'allow' | 'deny' | 'manual_review';
  checks: ExecutionConstraintCheck[];
};

function compareMoney(left: MoneyAmount, right: MoneyAmount, label: string): void {
  if (left.currency !== right.currency) {
    throw new TypeError(
      `${label} currency mismatch: ${left.currency} cannot be compared with ${right.currency}`
    );
  }
}
function requestMoney(value: MoneyAmount | undefined, stake: MoneyAmount, label: string): void {
  if (!value) return;
  if (!Number.isSafeInteger(value.minorUnits) || value.minorUnits < 0) {
    throw new TypeError(`${label}.minorUnits must be a non-negative safe integer`);
  }
  compareMoney(stake, value, label);
}
function statusCheck(
  code: ExecutionConstraintCheckCode,
  value: string,
  pass: string,
  fails: readonly string[]
): ExecutionConstraintCheck {
  if (value === pass) return { code, outcome: 'pass', reason: `${code} is ${value}` };
  if (fails.includes(value)) return { code, outcome: 'fail', reason: `${code} is ${value}` };
  return { code, outcome: 'unknown', reason: `${code} is ${value}` };
}
function scopeMatches(scope: WagerScope, wager: ExecutionConstraintRequest['wager']): boolean {
  return (
    (scope.sport === undefined || scope.sport === wager.sport) &&
    (scope.market === undefined || scope.market === wager.market) &&
    (scope.structure === undefined || scope.structure === wager.structure) &&
    (scope.phase === undefined || scope.phase === wager.phase)
  );
}
function specificity(scope: WagerScope): number {
  return Object.values(scope).filter(value => value !== undefined).length;
}
function selectLimit(
  capability: PartnerOutCapabilitySnapshot,
  kind: OutLimitKind,
  wager: ExecutionConstraintRequest['wager']
): OutLimitFact {
  const matches = capability.limits
    .filter(limit => limit.kind === kind && scopeMatches(limit.scope, wager))
    .sort((a, b) => specificity(b.scope) - specificity(a.scope));
  const selected = matches[0];
  if (!selected) throw new TypeError(`capability is missing required global ${kind} fact`);
  if (matches[1] && specificity(matches[1].scope) === specificity(selected.scope)) {
    throw new TypeError(`${kind} has ambiguous matching facts at equal scope specificity`);
  }
  return selected;
}
function limitCheck(
  capability: PartnerOutCapabilitySnapshot,
  kind: (typeof EXECUTION_CRITICAL_LIMIT_KINDS)[number],
  wager: ExecutionConstraintRequest['wager'],
  actual?: MoneyAmount
): ExecutionConstraintCheck {
  const limit = selectLimit(capability, kind, wager);
  if (limit.status === 'not_applicable')
    return {
      code: kind,
      outcome: 'not_applicable',
      reason: `${kind} is explicitly not applicable`,
    };
  if (limit.status === 'unknown')
    return { code: kind, outcome: 'unknown', reason: `${kind} has not been observed` };
  if (!actual)
    return { code: kind, outcome: 'unknown', reason: `${kind} requires a projected amount` };
  if (!limit.amount) throw new TypeError(`${kind} known limit is missing amount`);
  compareMoney(actual, limit.amount, kind);
  return actual.minorUnits <= limit.amount.minorUnits
    ? { code: kind, outcome: 'pass', reason: `${kind} is within the observed ceiling` }
    : { code: kind, outcome: 'fail', reason: `${kind} exceeds the observed ceiling` };
}
function offerCheck(
  catalog: PartnerOutCapabilitySnapshot['wagerOfferCatalog'],
  wager: ExecutionConstraintRequest['wager']
): ExecutionConstraintCheck {
  if (catalog.status === 'unavailable')
    return {
      code: 'wager_offer_catalog',
      outcome: 'unknown',
      reason: 'wager offer catalog is unavailable',
    };
  const missing =
    (wager.sport !== undefined && !catalog.sports.includes(wager.sport)) ||
    (wager.market !== undefined && !catalog.markets.includes(wager.market)) ||
    (wager.phase !== undefined && !catalog.phases.includes(wager.phase));
  if (!missing)
    return {
      code: 'wager_offer_catalog',
      outcome: 'pass',
      reason: 'wager appears in the observed offer catalog',
    };
  return catalog.status === 'complete'
    ? {
        code: 'wager_offer_catalog',
        outcome: 'fail',
        reason: 'wager is absent from the complete offer catalog',
      }
    : {
        code: 'wager_offer_catalog',
        outcome: 'unknown',
        reason: 'wager is absent from a partial offer catalog',
      };
}

/** Pure out-level preflight. Missing evidence yields manual review, never unlimited. */
export function evaluateExecutionConstraints(
  request: ExecutionConstraintRequest
): ExecutionConstraintDecision {
  if (!Number.isSafeInteger(request.stake.minorUnits) || request.stake.minorUnits <= 0)
    throw new TypeError('stake.minorUnits must be a positive safe integer');
  requestMoney(request.projectedGrossPayout, request.stake, 'projectedGrossPayout');
  requestMoney(request.projectedNetWin, request.stake, 'projectedNetWin');
  requestMoney(request.reservableLiquidity, request.stake, 'reservableLiquidity');
  const structure = request.capability.betStructures.find(
    item => item.structure === request.wager.structure
  );
  if (!structure) throw new TypeError(`missing ${request.wager.structure} capability`);
  const checks: ExecutionConstraintCheck[] = [
    statusCheck('credentials', request.capability.access.credentials.value, 'configured', [
      'missing',
    ]),
    statusCheck('authorization', request.capability.access.authorization.value, 'allowed', [
      'blocked',
    ]),
    statusCheck(
      'provider_connection',
      request.capability.access.providerConnection.value,
      'active',
      ['inactive']
    ),
    structure.support === 'supported'
      ? { code: 'bet_structure', outcome: 'pass', reason: `${structure.structure} is supported` }
      : structure.support === 'unsupported'
        ? {
            code: 'bet_structure',
            outcome: 'fail',
            reason: `${structure.structure} is unsupported`,
          }
        : {
            code: 'bet_structure',
            outcome: 'unknown',
            reason: `${structure.structure} support is unknown`,
          },
    offerCheck(request.capability.wagerOfferCatalog, request.wager),
    limitCheck(request.capability, 'max_stake', request.wager, request.stake),
    limitCheck(request.capability, 'max_gross_payout', request.wager, request.projectedGrossPayout),
    limitCheck(request.capability, 'max_net_win', request.wager, request.projectedNetWin),
  ];
  checks.push(
    !request.reservableLiquidity
      ? { code: 'liquidity', outcome: 'unknown', reason: 'reservable liquidity was not supplied' }
      : request.stake.minorUnits <= request.reservableLiquidity.minorUnits
        ? { code: 'liquidity', outcome: 'pass', reason: 'reservable liquidity covers stake' }
        : { code: 'liquidity', outcome: 'fail', reason: 'stake exceeds reservable liquidity' }
  );
  const decision = checks.some(check => check.outcome === 'fail')
    ? 'deny'
    : checks.some(check => check.outcome === 'unknown')
      ? 'manual_review'
      : 'allow';
  return {
    partnerCode: request.capability.partnerCode,
    outId: request.capability.outId,
    decision,
    checks,
  };
}
