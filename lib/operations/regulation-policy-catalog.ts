/**
 * Governed jurisdiction policy catalog.
 *
 * These are internal operational reference policies, not external legal
 * citations. SQLite materializes this catalog for runtime lookup.
 */
import { asStateCode, type StateCode, type TreeNodeId } from '../types/branded.ts';

/** Prefer sports-betting glossary primary ids over raw wire keys for policy seeAlso. */
function glossaryConceptForPolicyMarket(market: string): string {
  if (market === 'spread') return 'market.point_spread';
  if (market === 'over_under') return 'market.total';
  return `market.${market}`;
}

export type RegulationPolicyKey = `policy.${string}.${string}.${string}`;
export type JurisdictionConceptKey = `jurisdiction.${string}`;
export type RegulationPolicyStatus = 'active' | 'draft' | 'revoked' | 'suspended';
export type RegulationAuthority = 'state' | 'tribal' | 'federal' | 'compact';
export type RegulationRiskTier = 'low' | 'medium' | 'high' | 'critical';
export type RegulationEnforcementAction = 'block' | 'cap' | 'warn' | 'report';
export type RegulationPolicyScope = 'jurisdiction' | 'account' | 'event';

export type TieredLimit = {
  tier: string;
  maxBet: number;
};

export type JurisdictionDefinition = {
  key: JurisdictionConceptKey;
  stateCode: StateCode;
  label: string;
  authority: RegulationAuthority;
  defaultAge: number;
  defaultIdentityRequired: boolean;
  dailyLimit?: number;
  weeklyLimit?: number;
  taxRate?: number;
  sourceRef: string;
};

export type RegulationPolicyDefinition = {
  key: RegulationPolicyKey;
  label: string;
  jurisdiction: StateCode;
  sport: string;
  market: string;
  scope: RegulationPolicyScope;
  treeNodeId?: TreeNodeId;
  status: RegulationPolicyStatus;
  effectiveDate: string;
  expirationDate?: string;
  sourceRef: string;
  authority?: RegulationAuthority;
  riskTier: RegulationRiskTier;
  enforcementAction: RegulationEnforcementAction;
  maxBet: number;
  minBet: number;
  allowedBetTypes: readonly string[];
  dailyLimit?: number;
  weeklyLimit?: number;
  playerAgeMin?: number;
  identityRequired?: boolean;
  taxRate?: number;
  tags: readonly string[];
  exclusionGroups: readonly string[];
  tieredLimits: readonly TieredLimit[];
  alertRuleKey?: string;
};

export type ResolvedRegulationPolicy = RegulationPolicyDefinition & {
  authority: RegulationAuthority;
  dailyLimit: number | null;
  weeklyLimit: number | null;
  playerAgeMin: number;
  identityRequired: boolean;
  taxRate: number | null;
  policyCode: string;
};

export const REGULATION_SPORT_KEYS = [
  'american_football',
  'baseball',
  'basketball',
  'hockey',
  'soccer',
] as const;

export const REGULATION_MARKET_KEYS = ['match_winner', 'over_under', 'spread'] as const;

export const JURISDICTION_CATALOG = [
  {
    key: 'jurisdiction.MA',
    stateCode: asStateCode('MA'),
    label: 'Massachusetts',
    authority: 'state',
    defaultAge: 21,
    defaultIdentityRequired: false,
    sourceRef: 'internal:state-regulation-reference-seed/MA',
  },
  {
    key: 'jurisdiction.NJ',
    stateCode: asStateCode('NJ'),
    label: 'New Jersey',
    authority: 'state',
    defaultAge: 21,
    defaultIdentityRequired: false,
    sourceRef: 'internal:state-regulation-reference-seed/NJ',
  },
] as const satisfies readonly JurisdictionDefinition[];

export const REGULATION_POLICY_CATALOG = [
  {
    key: 'policy.MA.soccer.match_winner',
    label: 'MA Soccer Match Winner Limit',
    jurisdiction: asStateCode('MA'),
    sport: 'soccer',
    market: 'match_winner',
    scope: 'jurisdiction',
    status: 'active',
    effectiveDate: '2026-07-28',
    sourceRef: 'internal:state-regulation-reference-seed/MA',
    riskTier: 'high',
    enforcementAction: 'block',
    maxBet: 5_000,
    minBet: 0.5,
    allowedBetTypes: ['straight', 'parlay'],
    dailyLimit: 25_000,
    playerAgeMin: 21,
    tags: ['soccer'],
    exclusionGroups: [],
    tieredLimits: [],
    alertRuleKey: 'alert.limit_policy_block',
  },
  {
    key: 'policy.MA.basketball.over_under',
    label: 'MA Basketball Over/Under Limit',
    jurisdiction: asStateCode('MA'),
    sport: 'basketball',
    market: 'over_under',
    scope: 'jurisdiction',
    status: 'active',
    effectiveDate: '2026-07-28',
    sourceRef: 'internal:state-regulation-reference-seed/MA',
    riskTier: 'high',
    enforcementAction: 'block',
    maxBet: 10_000,
    minBet: 1,
    allowedBetTypes: ['straight'],
    dailyLimit: 50_000,
    playerAgeMin: 21,
    tags: ['basketball'],
    exclusionGroups: [],
    tieredLimits: [{ tier: 'vip', maxBet: 15_000 }],
    alertRuleKey: 'alert.limit_policy_block',
  },
  {
    key: 'policy.NJ.soccer.match_winner',
    label: 'NJ Soccer Match Winner Limit',
    jurisdiction: asStateCode('NJ'),
    sport: 'soccer',
    market: 'match_winner',
    scope: 'jurisdiction',
    status: 'active',
    effectiveDate: '2026-07-28',
    sourceRef: 'internal:state-regulation-reference-seed/NJ',
    riskTier: 'critical',
    enforcementAction: 'block',
    maxBet: 10_000,
    minBet: 1,
    allowedBetTypes: ['straight', 'parlay', 'teaser'],
    playerAgeMin: 21,
    identityRequired: true,
    tags: ['soccer', 'identity-required'],
    exclusionGroups: ['soccer_single_market'],
    tieredLimits: [],
    alertRuleKey: 'alert.limit_policy_block',
  },
  {
    key: 'policy.NJ.basketball.over_under',
    label: 'NJ Basketball Over/Under Limit',
    jurisdiction: asStateCode('NJ'),
    sport: 'basketball',
    market: 'over_under',
    scope: 'jurisdiction',
    status: 'active',
    effectiveDate: '2026-07-28',
    sourceRef: 'internal:state-regulation-reference-seed/NJ',
    riskTier: 'critical',
    enforcementAction: 'block',
    maxBet: 15_000,
    minBet: 1,
    allowedBetTypes: ['straight', 'parlay'],
    dailyLimit: 75_000,
    playerAgeMin: 21,
    identityRequired: true,
    tags: ['basketball', 'identity-required'],
    exclusionGroups: [],
    tieredLimits: [],
    alertRuleKey: 'alert.limit_policy_block',
  },
] as const satisfies readonly RegulationPolicyDefinition[];

function codeSegment(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function generateRegulationPolicyCode(
  policy: Pick<
    RegulationPolicyDefinition,
    'jurisdiction' | 'sport' | 'market' | 'scope' | 'treeNodeId'
  >
): string {
  const scope =
    policy.scope === 'account' && policy.treeNodeId
      ? `ACCOUNT-${codeSegment(policy.treeNodeId)}`
      : codeSegment(policy.scope);
  return [
    'FW-LIMIT',
    codeSegment(policy.jurisdiction),
    codeSegment(policy.sport),
    codeSegment(policy.market),
    scope,
  ].join('-');
}

export function resolveRegulationPolicy(
  policy: RegulationPolicyDefinition,
  jurisdictions: readonly JurisdictionDefinition[] = JURISDICTION_CATALOG
): ResolvedRegulationPolicy {
  const jurisdiction = jurisdictions.find(entry => entry.stateCode === policy.jurisdiction);
  if (!jurisdiction) {
    throw new Error(`Unknown jurisdiction for ${policy.key}: ${policy.jurisdiction}`);
  }
  return {
    ...policy,
    authority: policy.authority ?? jurisdiction.authority,
    dailyLimit: policy.dailyLimit ?? jurisdiction.dailyLimit ?? null,
    weeklyLimit: policy.weeklyLimit ?? jurisdiction.weeklyLimit ?? null,
    playerAgeMin: policy.playerAgeMin ?? jurisdiction.defaultAge,
    identityRequired: policy.identityRequired ?? jurisdiction.defaultIdentityRequired,
    taxRate: policy.taxRate ?? jurisdiction.taxRate ?? null,
    policyCode: generateRegulationPolicyCode(policy),
  };
}

export function findRegulationPolicy(key: string): ResolvedRegulationPolicy | null {
  const policy = REGULATION_POLICY_CATALOG.find(entry => entry.key === key);
  return policy ? resolveRegulationPolicy(policy) : null;
}

export function findRegulationPolicyForDimensions(input: {
  jurisdiction: StateCode;
  sport: string;
  market: string;
  treeNodeId?: TreeNodeId | null;
}): ResolvedRegulationPolicy | null {
  const policy = REGULATION_POLICY_CATALOG.find(
    entry =>
      entry.jurisdiction === input.jurisdiction &&
      entry.sport === input.sport &&
      entry.market === input.market &&
      (entry.scope !== 'account' || entry.treeNodeId === input.treeNodeId)
  );
  return policy ? resolveRegulationPolicy(policy) : null;
}

export function isPolicyEffective(
  policy: Pick<RegulationPolicyDefinition, 'status' | 'effectiveDate' | 'expirationDate'>,
  now = new Date()
): boolean {
  if (policy.status !== 'active') return false;
  const day = now.toISOString().slice(0, 10);
  return policy.effectiveDate <= day && (!policy.expirationDate || policy.expirationDate > day);
}

export type RegulationPolicyAuditIssue = {
  severity: 'error' | 'warning';
  code:
    | 'conflicting-active-policy'
    | 'expired-policy'
    | 'missing-alert-rule'
    | 'unknown-jurisdiction'
    | 'unknown-market'
    | 'unknown-sport';
  policyKey: RegulationPolicyKey;
  message: string;
};

export type RegulationPolicyAudit = {
  ok: boolean;
  policies: number;
  active: number;
  errors: number;
  warnings: number;
  issues: RegulationPolicyAuditIssue[];
};

export function auditRegulationPolicyCatalog(
  policies: readonly RegulationPolicyDefinition[] = REGULATION_POLICY_CATALOG,
  jurisdictions: readonly JurisdictionDefinition[] = JURISDICTION_CATALOG,
  now = new Date()
): RegulationPolicyAudit {
  const issues: RegulationPolicyAuditIssue[] = [];
  const jurisdictionCodes = new Set(jurisdictions.map(entry => entry.stateCode));
  const sportKeys = new Set<string>(REGULATION_SPORT_KEYS);
  const marketKeys = new Set<string>(REGULATION_MARKET_KEYS);
  const activeKeys = new Map<string, RegulationPolicyDefinition>();

  for (const policy of policies) {
    if (!jurisdictionCodes.has(policy.jurisdiction)) {
      issues.push({
        severity: 'error',
        code: 'unknown-jurisdiction',
        policyKey: policy.key,
        message: `${policy.key} references unknown jurisdiction ${policy.jurisdiction}`,
      });
    }
    if (!sportKeys.has(policy.sport)) {
      issues.push({
        severity: 'error',
        code: 'unknown-sport',
        policyKey: policy.key,
        message: `${policy.key} references unknown sport ${policy.sport}`,
      });
    }
    if (!marketKeys.has(policy.market)) {
      issues.push({
        severity: 'error',
        code: 'unknown-market',
        policyKey: policy.key,
        message: `${policy.key} references unknown market ${policy.market}`,
      });
    }
    if (policy.enforcementAction === 'block' && !policy.alertRuleKey) {
      issues.push({
        severity: 'error',
        code: 'missing-alert-rule',
        policyKey: policy.key,
        message: `${policy.key} blocks wagers without an alert rule`,
      });
    }
    if (policy.expirationDate && policy.expirationDate <= now.toISOString().slice(0, 10)) {
      issues.push({
        severity: 'warning',
        code: 'expired-policy',
        policyKey: policy.key,
        message: `${policy.key} expired ${policy.expirationDate}`,
      });
    }
    if (isPolicyEffective(policy, now)) {
      const conflictKey = [
        policy.jurisdiction,
        policy.sport,
        policy.market,
        policy.scope,
        policy.treeNodeId ?? '',
      ].join(':');
      const prior = activeKeys.get(conflictKey);
      if (prior && prior.maxBet !== policy.maxBet) {
        issues.push({
          severity: 'error',
          code: 'conflicting-active-policy',
          policyKey: policy.key,
          message: `${prior.key} and ${policy.key} have conflicting active max bets`,
        });
      } else {
        activeKeys.set(conflictKey, policy);
      }
    }
  }

  const errors = issues.filter(issue => issue.severity === 'error').length;
  return {
    ok: errors === 0,
    policies: policies.length,
    active: policies.filter(policy => isPolicyEffective(policy, now)).length,
    errors,
    warnings: issues.length - errors,
    issues,
  };
}

export function regulationPolicyGlossaryConcepts() {
  const jurisdictions = JURISDICTION_CATALOG.map(entry => ({
    id: entry.key,
    label: entry.label,
    description: `${entry.label} internal jurisdiction defaults: age ${entry.defaultAge}+ and identity ${entry.defaultIdentityRequired ? 'required' : 'policy-specific'}.`,
    category: 'trading',
    kind: 'jurisdiction',
    synonyms: [entry.stateCode, `${entry.label} jurisdiction`],
    values: null,
    seeAlso: REGULATION_POLICY_CATALOG.filter(
      policy => policy.jurisdiction === entry.stateCode
    ).map(policy => policy.key),
    status: 'active',
    source: 'lib/operations/regulation-policy-catalog.ts',
    semanticType: 'classification',
    uiRole: 'chip',
  }));
  const policies = REGULATION_POLICY_CATALOG.map(policy => {
    const resolved = resolveRegulationPolicy(policy);
    return {
      id: policy.key,
      label: policy.label,
      description: `${resolved.policyCode}: $${resolved.maxBet.toLocaleString()} max, ${resolved.allowedBetTypes.join('/')} bets, age ${resolved.playerAgeMin}+, ${resolved.enforcementAction} enforcement.`,
      category: 'trading',
      kind: 'policy',
      synonyms: [resolved.policyCode, `${policy.jurisdiction} ${policy.sport} ${policy.market}`],
      values: [policy.status, policy.riskTier, policy.enforcementAction],
      seeAlso: [
        `jurisdiction.${policy.jurisdiction}`,
        `sport.${policy.sport}`,
        glossaryConceptForPolicyMarket(policy.market),
      ],
      status: policy.status,
      source: 'lib/operations/regulation-policy-catalog.ts',
      semanticType: 'classification',
      uiRole: 'code',
    };
  });
  return [...jurisdictions, ...policies];
}
