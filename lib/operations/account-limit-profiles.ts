// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
/**
 * Account-centered limit control projection.
 *
 * This is a read model over existing authorities. It does not create a second
 * source of truth for limits, profiles, licenses, geography, or violations.
 */
import type { Database } from 'bun:sqlite';

import {
  asPartnerProfileKey,
  asStateCode,
  asTreeNodeId,
  tryZipCode,
  type PartnerProfileKey,
  type StateCode,
  type TreeNodeId,
  type ZipCode,
} from '../types/branded.ts';
import { parseSpecialRules, type SpecialRules } from './state-regulation.ts';
import type { LimitPatternSnapshot } from './limit-patterns.ts';

export type AccountLimitMonitoringStatus = 'monitored' | 'attention' | 'blocked' | 'incomplete';
export type AccountLimitTone = 'ok' | 'warn' | 'bad' | 'skip';
export type AccountLimitTraceKind =
  | 'limit-observed'
  | 'limit-changed'
  | 'license-bound'
  | 'policy-bound'
  | 'profile-updated'
  | 'wager-blocked';

export type AccountRegulationPolicy = {
  policyCode: string;
  stateCode: StateCode;
  scope: 'jurisdiction' | 'account';
  treeNodeId: TreeNodeId | null;
  sportKey: string;
  marketKey: string;
  maxWager: number | null;
  minWager: number | null;
  allowedBetTypes: string[];
  specialRules: SpecialRules;
  effectiveFrom: number;
  effectiveTo: number | null;
  source: 'regulatory_limits';
};

export type AccountLimitTrace = {
  kind: AccountLimitTraceKind;
  at: string;
  source: string;
  detail: string;
};

export type AccountLimitProfile = {
  treeNodeId: TreeNodeId;
  profileKey: PartnerProfileKey | null;
  accountName: string;
  accountKind: string;
  lifecycleStatus: string | null;
  monitoringStatus: AccountLimitMonitoringStatus;
  tone: AccountLimitTone;
  jurisdiction: {
    stateCode: StateCode | null;
    location: string | null;
    zipCode: ZipCode | null;
  };
  license: {
    stateCode: StateCode;
    status: string;
    licenseNumber: string | null;
    grantedAt: string | null;
  } | null;
  policyCodes: string[];
  observations: {
    dimensions: number;
    sportsbooks: string[];
    lastObservedAt: string | null;
    raises: number;
    decreases: number;
    violations30d: number;
  };
  traces: AccountLimitTrace[];
};

export type AccountLimitProfilesProjection = {
  schemaVersion: 1;
  kind: 'account-limit-profiles';
  generatedAt: string;
  summary: {
    accounts: number;
    monitored: number;
    attention: number;
    blocked: number;
    incomplete: number;
    jurisdictions: number;
    policies: number;
    traceEvents: number;
  };
  policies: AccountRegulationPolicy[];
  profiles: AccountLimitProfile[];
  sources: string[];
};

type TreeRow = {
  id: string; // brand-ok — tree_nodes.id wire
  name: string;
  type: string;
};

type BindingRow = {
  tree_node_id: string; // brand-ok — partner_profile_bindings.tree_node_id wire
  profile_key: string;
  lifecycle_status: string;
  updated_at: string;
};

type GeoRow = {
  node_id: string; // brand-ok — partner_geo_profiles.node_id wire
  state_code: string;
  location: string | null;
  zip_code: string | null;
};

type LicenseRow = {
  node_id: string; // brand-ok — partner_state_licenses.node_id wire
  state_code: string;
  license_number: string | null;
  status: string;
  granted_at: number | null;
};

type PolicyRow = {
  state_code: string;
  sport_id: string; // brand-ok — regulatory catalog key
  market_id: string; // brand-ok — regulatory catalog key
  node_id: string | null; // brand-ok — optional account override
  max_wager: number | null;
  min_wager: number | null;
  allowed_bet_types: string | null;
  special_rules: string | null;
  effective_from: number;
  effective_to: number | null;
};

type LimitObservationRow = {
  node_id: string; // brand-ok — partner_account_limits.node_id wire
  sportsbook: string;
  sport_id: string; // brand-ok — sportsbook catalog key
  market_id: string; // brand-ok — sportsbook catalog key
  bet_type: string;
  max_wager: number;
  recorded_at: number;
};

type ViolationRow = {
  node_id: string; // brand-ok — regulatory_violations.node_id wire
  state_code: string;
  reason: string;
  blocked_at: number;
};

function tableExists(db: Database, name: string): boolean {
  return (
    db
      .query(`SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = $name`)
      .get({ $name: name }) != null
  );
}

function asIso(seconds: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

function parseStringArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as string[];
    return Array.isArray(value)
      ? value.filter(item => typeof item === 'string' && item.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

function policyCode(row: PolicyRow): string {
  const segment = (value: string) =>
    value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  const scope = row.node_id ? `ACCOUNT-${segment(row.node_id)}` : 'JURISDICTION';
  return `FW-LIMIT-${segment(row.state_code)}-${segment(row.sport_id)}-${segment(row.market_id)}-${scope}`;
}

function toneFor(status: AccountLimitMonitoringStatus): AccountLimitTone {
  if (status === 'monitored') return 'ok';
  if (status === 'attention') return 'warn';
  if (status === 'blocked') return 'bad';
  return 'skip';
}

function statusFor(input: {
  hasProfile: boolean;
  stateCode: StateCode | null;
  licenseStatus: string | null;
  dimensions: number;
  violations: number;
}): AccountLimitMonitoringStatus {
  if (input.violations > 0) return 'blocked';
  if (input.stateCode && input.licenseStatus !== 'active') return 'attention';
  if (input.hasProfile && input.stateCode && input.dimensions > 0) return 'monitored';
  return 'incomplete';
}

/**
 * Build the account profile read model from the current operations database.
 * Any two-letter state present in regulatory_limits is projected automatically.
 */
export function buildAccountLimitProfiles(
  db: Database,
  patterns: LimitPatternSnapshot,
  now = new Date()
): AccountLimitProfilesProjection {
  const sources = [
    'tree_nodes',
    'partner_profile_bindings',
    'partner_geo_profiles',
    'partner_state_licenses',
    'regulatory_limits',
    'regulatory_violations',
    'partner_account_limits',
  ].filter(table => tableExists(db, table));

  const trees = tableExists(db, 'tree_nodes')
    ? (db.query(`SELECT id, name, type FROM tree_nodes`).all() as TreeRow[])
    : [];
  const bindings = tableExists(db, 'partner_profile_bindings')
    ? (db
        .query(
          `SELECT tree_node_id, profile_key, lifecycle_status, updated_at
           FROM partner_profile_bindings`
        )
        .all() as BindingRow[])
    : [];
  const geos = tableExists(db, 'partner_geo_profiles')
    ? (db
        .query(`SELECT node_id, state_code, location, zip_code FROM partner_geo_profiles`)
        .all() as GeoRow[])
    : [];
  const licenses = tableExists(db, 'partner_state_licenses')
    ? (db
        .query(
          `SELECT node_id, state_code, license_number, status, granted_at
           FROM partner_state_licenses`
        )
        .all() as LicenseRow[])
    : [];

  const nowSec = Math.floor(now.getTime() / 1000);
  const policies = tableExists(db, 'regulatory_limits')
    ? (db
        .query(
          `SELECT state_code, sport_id, market_id, node_id, max_wager, min_wager,
                  allowed_bet_types, special_rules, effective_from, effective_to
           FROM regulatory_limits
           WHERE effective_from <= $now
             AND (effective_to IS NULL OR effective_to > $now)
           ORDER BY state_code, sport_id, market_id, node_id`
        )
        .all({ $now: nowSec }) as PolicyRow[])
    : [];
  const observations = tableExists(db, 'partner_account_limits')
    ? (db
        .query(
          `SELECT node_id, sportsbook, sport_id, market_id, bet_type, max_wager, recorded_at
           FROM partner_account_limits
           ORDER BY recorded_at DESC, id DESC`
        )
        .all() as LimitObservationRow[])
    : [];
  const since = nowSec - 30 * 86400;
  const violations = tableExists(db, 'regulatory_violations')
    ? (db
        .query(
          `SELECT node_id, state_code, reason, blocked_at
           FROM regulatory_violations
           WHERE blocked_at >= $since
           ORDER BY blocked_at DESC, id DESC`
        )
        .all({ $since: since }) as ViolationRow[])
    : [];

  const policyProjection: AccountRegulationPolicy[] = policies.map(row => ({
    policyCode: policyCode(row),
    stateCode: asStateCode(row.state_code),
    scope: row.node_id ? 'account' : 'jurisdiction',
    treeNodeId: row.node_id ? asTreeNodeId(row.node_id) : null,
    sportKey: row.sport_id,
    marketKey: row.market_id,
    maxWager: row.max_wager,
    minWager: row.min_wager,
    allowedBetTypes: parseStringArray(row.allowed_bet_types),
    specialRules: parseSpecialRules(row.special_rules),
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    source: 'regulatory_limits',
  }));

  const treeById = new Map(trees.map(row => [row.id, row]));
  const bindingById = new Map(bindings.map(row => [row.tree_node_id, row]));
  const geoById = new Map(geos.map(row => [row.node_id, row]));
  const patternById = new Map(patterns.nodePatterns.map(row => [String(row.node_id), row]));
  const observationsById = Map.groupBy(observations, row => row.node_id);
  const violationsById = Map.groupBy(violations, row => row.node_id);
  const licensesById = Map.groupBy(licenses, row => row.node_id);

  const accountIds = new Set<string>([
    ...bindings.map(row => row.tree_node_id),
    ...geos.map(row => row.node_id),
    ...licenses.map(row => row.node_id),
    ...observations.map(row => row.node_id),
    ...patterns.nodePatterns.map(row => String(row.node_id)),
  ]);

  const profiles = [...accountIds].sort().map(accountId => {
    const tree = treeById.get(accountId);
    const binding = bindingById.get(accountId);
    const geo = geoById.get(accountId);
    const stateCode = geo?.state_code ? asStateCode(geo.state_code) : null;
    const accountLicenses = licensesById.get(accountId) ?? [];
    const licenseRow =
      accountLicenses.find(row => row.state_code === stateCode) ?? accountLicenses[0] ?? null;
    const accountObservations = observationsById.get(accountId) ?? [];
    const latestByDimension = new Map<string, LimitObservationRow>();
    for (const observation of accountObservations) {
      const key = [
        observation.sportsbook,
        observation.sport_id,
        observation.market_id,
        observation.bet_type,
      ].join(':');
      if (!latestByDimension.has(key)) latestByDimension.set(key, observation);
    }
    const accountViolations = violationsById.get(accountId) ?? [];
    const pattern = patternById.get(accountId);
    const applicablePolicies = policyProjection.filter(
      policy =>
        stateCode != null &&
        policy.stateCode === stateCode &&
        (policy.treeNodeId == null || policy.treeNodeId === accountId)
    );
    const monitoringStatus = statusFor({
      hasProfile: binding != null,
      stateCode,
      licenseStatus: licenseRow?.status ?? null,
      dimensions: latestByDimension.size,
      violations: accountViolations.length,
    });

    const traces: AccountLimitTrace[] = [];
    if (binding) {
      traces.push({
        kind: 'profile-updated',
        at: binding.updated_at,
        source: 'partner_profile_bindings',
        detail: `${binding.lifecycle_status} · ${binding.profile_key}`,
      });
    }
    if (licenseRow?.granted_at) {
      traces.push({
        kind: 'license-bound',
        at: asIso(licenseRow.granted_at)!,
        source: 'partner_state_licenses',
        detail: `${licenseRow.state_code} · ${licenseRow.status}`,
      });
    }
    for (const observation of accountObservations.slice(0, 3)) {
      traces.push({
        kind: 'limit-observed',
        at: asIso(observation.recorded_at)!,
        source: 'partner_account_limits',
        detail: `${observation.sportsbook} ${observation.sport_id}/${observation.market_id} · $${observation.max_wager}`,
      });
    }
    for (const violation of accountViolations.slice(0, 3)) {
      traces.push({
        kind: 'wager-blocked',
        at: asIso(violation.blocked_at)!,
        source: 'regulatory_violations',
        detail: `${violation.state_code} · ${violation.reason}`,
      });
    }
    if (applicablePolicies.length > 0) {
      traces.push({
        kind: 'policy-bound',
        at: now.toISOString(),
        source: 'regulatory_limits',
        detail: `${applicablePolicies.length} effective ${stateCode ?? 'unscoped'} policies`,
      });
    }
    traces.sort((left, right) => right.at.localeCompare(left.at));

    return {
      treeNodeId: asTreeNodeId(accountId),
      profileKey: binding ? asPartnerProfileKey(binding.profile_key) : null,
      accountName: tree?.name ?? pattern?.node_name ?? accountId,
      accountKind: tree?.type ?? pattern?.node_type ?? 'account',
      lifecycleStatus: binding?.lifecycle_status ?? null,
      monitoringStatus,
      tone: toneFor(monitoringStatus),
      jurisdiction: {
        stateCode,
        location: geo?.location ?? null,
        zipCode: geo?.zip_code ? (tryZipCode(geo.zip_code) ?? null) : null,
      },
      license: licenseRow
        ? {
            stateCode: asStateCode(licenseRow.state_code),
            status: licenseRow.status,
            licenseNumber: licenseRow.license_number,
            grantedAt: asIso(licenseRow.granted_at),
          }
        : null,
      policyCodes: applicablePolicies.map(policy => policy.policyCode),
      observations: {
        dimensions: latestByDimension.size,
        sportsbooks: [...new Set(accountObservations.map(row => row.sportsbook))].sort(),
        lastObservedAt: asIso(accountObservations[0]?.recorded_at ?? null),
        raises: pattern?.raises ?? 0,
        decreases: pattern?.decreases ?? 0,
        violations30d: accountViolations.length,
      },
      traces: traces.slice(0, 8),
    } satisfies AccountLimitProfile;
  });

  return {
    schemaVersion: 1,
    kind: 'account-limit-profiles',
    generatedAt: now.toISOString(),
    summary: {
      accounts: profiles.length,
      monitored: profiles.filter(profile => profile.monitoringStatus === 'monitored').length,
      attention: profiles.filter(profile => profile.monitoringStatus === 'attention').length,
      blocked: profiles.filter(profile => profile.monitoringStatus === 'blocked').length,
      incomplete: profiles.filter(profile => profile.monitoringStatus === 'incomplete').length,
      jurisdictions: new Set(policyProjection.map(policy => policy.stateCode)).size,
      policies: policyProjection.length,
      traceEvents: profiles.reduce((sum, profile) => sum + profile.traces.length, 0),
    },
    policies: policyProjection,
    profiles,
    sources,
  };
}
