import { isPolicyEffective, type RegulationPolicyDefinition } from './regulation-policy-catalog.ts';

export type CompliancePolicyKpiKey =
  | 'kpi.compliance.blocked_bets'
  | 'kpi.compliance.active_policies'
  | 'kpi.compliance.riskiest_jurisdiction'
  | 'kpi.compliance.policy_changes';

export type CompliancePolicyKpi = {
  key: CompliancePolicyKpiKey;
  label: string;
  description: string;
  value: number | string;
  tone: 'ok' | 'warn' | 'bad' | 'info';
  source: string;
  window: 'current' | 'today' | 'trailing-30d';
};

type ViolationEvidence = {
  blocked_at: number;
};

const RISK_WEIGHT = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
} as const;

export function buildCompliancePolicyKpis(input: {
  policies: readonly RegulationPolicyDefinition[];
  violations: readonly ViolationEvidence[];
  now: Date;
}): CompliancePolicyKpi[] {
  const dayStart = new Date(input.now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const blockedToday = input.violations.filter(
    row => row.blocked_at >= Math.floor(dayStart.getTime() / 1000)
  ).length;
  const active = input.policies.filter(policy => isPolicyEffective(policy, input.now));
  const riskByJurisdiction = new Map<string, number>();
  for (const policy of active) {
    riskByJurisdiction.set(
      policy.jurisdiction,
      (riskByJurisdiction.get(policy.jurisdiction) ?? 0) + RISK_WEIGHT[policy.riskTier]
    );
  }
  const riskiest =
    [...riskByJurisdiction].sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
    )[0]?.[0] ?? '—';
  const trailingStart = new Date(input.now.getTime() - 30 * 86400 * 1000)
    .toISOString()
    .slice(0, 10);
  const policyChanges = input.policies.filter(
    policy => policy.effectiveDate >= trailingStart
  ).length;

  return [
    {
      key: 'kpi.compliance.blocked_bets',
      label: 'Blocked bets today',
      description:
        'Number of wager attempts blocked by regulatory policy evidence since 00:00 UTC.',
      value: blockedToday,
      tone: blockedToday > 0 ? 'bad' : 'ok',
      source: 'regulatory_violations.blocked_at',
      window: 'today',
    },
    {
      key: 'kpi.compliance.active_policies',
      label: 'Active policies',
      description:
        'Count of governed jurisdiction policies active at the artifact generation time.',
      value: active.length,
      tone: active.length > 0 ? 'info' : 'warn',
      source: 'REGULATION_POLICY_CATALOG',
      window: 'current',
    },
    {
      key: 'kpi.compliance.riskiest_jurisdiction',
      label: 'Riskiest jurisdiction',
      description:
        'Jurisdiction with the highest summed active policy risk weights; ties sort by state code.',
      value: riskiest,
      tone: riskiest === '—' ? 'warn' : 'bad',
      source: 'REGULATION_POLICY_CATALOG.riskTier',
      window: 'current',
    },
    {
      key: 'kpi.compliance.policy_changes',
      label: 'Policy changes',
      description:
        'Count of policies whose governed effective date falls within the trailing 30 days.',
      value: policyChanges,
      tone: policyChanges > 0 ? 'warn' : 'ok',
      source: 'REGULATION_POLICY_CATALOG.effectiveDate',
      window: 'trailing-30d',
    },
  ];
}

export function complianceKpiGlossaryConcepts() {
  return [
    {
      id: 'kpi.compliance.blocked_bets',
      label: 'Blocked bets today',
      description:
        'Number of wager attempts blocked by regulatory policy evidence since 00:00 UTC.',
      category: 'trading',
      kind: 'kpi',
      synonyms: ['blocked wagers', 'policy blocks'],
      values: null,
      seeAlso: ['ops.limits.evidence_trace'],
      status: 'active',
      source: 'lib/operations/compliance-policy-kpis.ts',
      semanticType: 'state',
      uiRole: 'badge',
    },
    {
      id: 'kpi.compliance.active_policies',
      label: 'Active compliance policies',
      description: 'Count of governed jurisdiction policies active at artifact generation time.',
      category: 'trading',
      kind: 'kpi',
      synonyms: ['active policies'],
      values: null,
      seeAlso: ['ops.limits.jurisdiction_policy'],
      status: 'active',
      source: 'lib/operations/compliance-policy-kpis.ts',
      semanticType: 'state',
      uiRole: 'badge',
    },
    {
      id: 'kpi.compliance.riskiest_jurisdiction',
      label: 'Riskiest jurisdiction',
      description: 'Jurisdiction with the highest summed active policy risk weights.',
      category: 'trading',
      kind: 'kpi',
      synonyms: ['highest policy risk'],
      values: null,
      seeAlso: ['ops.limits.jurisdiction_policy'],
      status: 'active',
      source: 'lib/operations/compliance-policy-kpis.ts',
      semanticType: 'state',
      uiRole: 'badge',
    },
    {
      id: 'kpi.compliance.policy_changes',
      label: 'Compliance policy changes',
      description: 'Count of policies effective within the trailing 30-day window.',
      category: 'trading',
      kind: 'kpi',
      synonyms: ['recent policy changes'],
      values: null,
      seeAlso: ['ops.limits.policy_code'],
      status: 'active',
      source: 'lib/operations/compliance-policy-kpis.ts',
      semanticType: 'state',
      uiRole: 'badge',
    },
  ];
}
