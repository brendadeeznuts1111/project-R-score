// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
/**
 * Connected limit-pattern fixture and read model.
 *
 * The write path seeds deterministic partner → agent → sub-agent trees and
 * attaches sportsbook limit history, state licenses, discrete geo profiles,
 * ZIPs, and regulatory audit rows. The read path projects those same tables
 * into book, state, ZIP-prefix, and downline patterns for APIs and the portal.
 */
import type { Database } from 'bun:sqlite';
import { ensureAccountLimitsSchema, queryRecentLimitChanges } from '../account-limits-repo.ts';
import {
  asStateCode,
  asTreeNodeId,
  asZipCode,
  type StateCode,
  type TreeNodeId,
  type ZipCode,
} from '../types/branded.ts';
import { initSchema } from './schema.ts';
import { PartnerAnalyticsRepository, type RaiseContextMetrics } from './partner-analytics-repo.ts';
import { applyPartnerComplianceOnboard } from './partner-compliance-onboard.ts';
import { bindPartnerProfile } from './partner-profile-bridge.ts';
import {
  ComplianceRepository,
  ensureStateRegulationSchema,
  seedStateRegulations,
} from './state-regulation.ts';

type LimitPatternSeries = {
  sportsbook: string;
  sport: string;
  market: string;
  betType: 'pregame' | 'live' | 'straight';
  values: readonly number[];
};

type LimitPatternFixtureNode = {
  nodeId: TreeNodeId;
  parentNodeId: TreeNodeId | null;
  type: 'partner' | 'agent' | 'sub_agent';
  name: string;
  stateCode: StateCode;
  location: string;
  zipCode: ZipCode;
  age: number;
  violations: number;
  chargebacks: number;
  handle7d: number;
  avgClv7d: number;
  profit30d: number;
  roi30d: number;
  series: readonly LimitPatternSeries[];
};

const LIMIT_PATTERN_FIXTURES: readonly LimitPatternFixtureNode[] = [
  {
    nodeId: asTreeNodeId('limit-demo-atlantic'),
    parentNodeId: null,
    type: 'partner',
    name: 'Atlantic Partner Desk',
    stateCode: asStateCode('NJ'),
    location: 'Newark',
    zipCode: asZipCode('07102'),
    age: 34,
    violations: 0,
    chargebacks: 0,
    handle7d: 420_000,
    avgClv7d: 92,
    profit30d: 96_000,
    roi30d: 0.21,
    series: [
      {
        sportsbook: 'draftkings',
        sport: 'basketball',
        market: 'over_under',
        betType: 'straight',
        values: [1_000, 2_500],
      },
      {
        sportsbook: 'fanduel',
        sport: 'soccer',
        market: 'match_winner',
        betType: 'pregame',
        values: [1_500, 2_000],
      },
    ],
  },
  {
    nodeId: asTreeNodeId('limit-demo-newark-agent'),
    parentNodeId: asTreeNodeId('limit-demo-atlantic'),
    type: 'agent',
    name: 'Newark Agent Lane',
    stateCode: asStateCode('NJ'),
    location: 'Newark',
    zipCode: asZipCode('07103'),
    age: 29,
    violations: 1,
    chargebacks: 1,
    handle7d: 255_000,
    avgClv7d: 58,
    profit30d: 41_000,
    roi30d: 0.13,
    series: [
      {
        sportsbook: 'fanduel',
        sport: 'basketball',
        market: 'over_under',
        betType: 'live',
        values: [750, 1_750],
      },
      {
        sportsbook: 'betmgm',
        sport: 'soccer',
        market: 'match_winner',
        betType: 'straight',
        values: [1_200, 900],
      },
    ],
  },
  {
    nodeId: asTreeNodeId('limit-demo-jersey-sub'),
    parentNodeId: asTreeNodeId('limit-demo-newark-agent'),
    type: 'sub_agent',
    name: 'Jersey City Sub-Agent',
    stateCode: asStateCode('NJ'),
    location: 'Jersey City',
    zipCode: asZipCode('07302'),
    age: 27,
    violations: 2,
    chargebacks: 2,
    handle7d: 135_000,
    avgClv7d: 32,
    profit30d: 12_000,
    roi30d: 0.06,
    series: [
      {
        sportsbook: 'hardrock',
        sport: 'basketball',
        market: 'over_under',
        betType: 'straight',
        values: [500, 1_000, 800],
      },
    ],
  },
  {
    nodeId: asTreeNodeId('limit-demo-baystate'),
    parentNodeId: null,
    type: 'partner',
    name: 'Bay State Partner Desk',
    stateCode: asStateCode('MA'),
    location: 'Boston',
    zipCode: asZipCode('02108'),
    age: 41,
    violations: 0,
    chargebacks: 0,
    handle7d: 360_000,
    avgClv7d: 74,
    profit30d: 72_000,
    roi30d: 0.17,
    series: [
      {
        sportsbook: 'betmgm',
        sport: 'basketball',
        market: 'over_under',
        betType: 'straight',
        values: [1_000, 2_200],
      },
      {
        sportsbook: 'caesars',
        sport: 'soccer',
        market: 'match_winner',
        betType: 'pregame',
        values: [800, 1_400],
      },
    ],
  },
  {
    nodeId: asTreeNodeId('limit-demo-boston-agent'),
    parentNodeId: asTreeNodeId('limit-demo-baystate'),
    type: 'agent',
    name: 'Boston Agent Lane',
    stateCode: asStateCode('MA'),
    location: 'Boston',
    zipCode: asZipCode('02111'),
    age: 31,
    violations: 1,
    chargebacks: 0,
    handle7d: 210_000,
    avgClv7d: 46,
    profit30d: 35_000,
    roi30d: 0.11,
    series: [
      {
        sportsbook: 'draftkings',
        sport: 'basketball',
        market: 'over_under',
        betType: 'live',
        values: [600, 1_300],
      },
    ],
  },
  {
    nodeId: asTreeNodeId('limit-demo-worcester-sub'),
    parentNodeId: asTreeNodeId('limit-demo-boston-agent'),
    type: 'sub_agent',
    name: 'Worcester Sub-Agent',
    stateCode: asStateCode('MA'),
    location: 'Worcester',
    zipCode: asZipCode('01608'),
    age: 25,
    violations: 3,
    chargebacks: 2,
    handle7d: 95_000,
    avgClv7d: 18,
    profit30d: 4_000,
    roi30d: 0.02,
    series: [
      {
        sportsbook: 'caesars',
        sport: 'soccer',
        market: 'match_winner',
        betType: 'straight',
        values: [700, 1_100, 650],
      },
    ],
  },
  {
    nodeId: asTreeNodeId('limit-demo-shoreline'),
    parentNodeId: null,
    type: 'partner',
    name: 'Shoreline Partner Desk',
    stateCode: asStateCode('NJ'),
    location: 'Atlantic City',
    zipCode: asZipCode('08401'),
    age: 38,
    violations: 1,
    chargebacks: 0,
    handle7d: 310_000,
    avgClv7d: 67,
    profit30d: 54_000,
    roi30d: 0.14,
    series: [
      {
        sportsbook: 'hardrock',
        sport: 'basketball',
        market: 'over_under',
        betType: 'straight',
        values: [1_250, 3_000],
      },
    ],
  },
  {
    nodeId: asTreeNodeId('limit-demo-atlantic-sub'),
    parentNodeId: asTreeNodeId('limit-demo-shoreline'),
    type: 'sub_agent',
    name: 'Atlantic City Sub-Agent',
    stateCode: asStateCode('NJ'),
    location: 'Atlantic City',
    zipCode: asZipCode('08401'),
    age: 26,
    violations: 2,
    chargebacks: 1,
    handle7d: 175_000,
    avgClv7d: 39,
    profit30d: 22_000,
    roi30d: 0.08,
    series: [
      {
        sportsbook: 'caesars',
        sport: 'soccer',
        market: 'match_winner',
        betType: 'live',
        values: [900, 1_600],
      },
    ],
  },
] as const;

export type SeedLimitPatternDemoResult = {
  seeded: boolean;
  partners: number;
  downlineNodes: number;
  nodes: number;
  limitRows: number;
  raises: number;
  violations: number;
};

function contextForFixture(fixture: LimitPatternFixtureNode): RaiseContextMetrics {
  return {
    active_players_7d: Math.max(8, Math.round(fixture.handle7d / 8_000)),
    new_players_7d: Math.max(2, Math.round(fixture.handle7d / 40_000)),
    total_handle_7d: fixture.handle7d,
    avg_clv_7d: fixture.avgClv7d,
    top_tier_player_count: Math.max(1, Math.round(fixture.handle7d / 55_000)),
    violation_count_30d: fixture.violations,
    chargeback_count_30d: fixture.chargebacks,
    kyc_pass_rate: Math.max(0.7, 0.99 - fixture.violations * 0.045),
    market_volatility_index: 0.65 + fixture.violations * 0.42,
    peak_betting_hours: JSON.stringify(
      fixture.stateCode === asStateCode('MA') ? [17, 18, 19, 20] : [18, 19, 20, 21]
    ),
    sportsbook_share: Math.min(0.78, 0.34 + fixture.series.length * 0.11),
    partner_profit_30d: fixture.profit30d,
    partner_roi_30d: fixture.roi30d,
  };
}

function upsertFixtureTreeNode(
  db: Database,
  fixture: LimitPatternFixtureNode,
  nowIso: string
): void {
  db.run(
    `INSERT INTO tree_nodes
       (id, type, parent_id, name, call_sign, email, telegram_id, rail_preference,
        total_accounts, total_liquidity, cut_percentage, active, status, created_at)
     VALUES ($id, $type, $parent, $name, $call, $email, $telegram, 'wire',
             $accounts, $liquidity, $cut, 1, $status, $created)
     ON CONFLICT(id) DO UPDATE SET
       type = excluded.type,
       parent_id = excluded.parent_id,
       name = excluded.name,
       call_sign = excluded.call_sign,
       total_accounts = excluded.total_accounts,
       total_liquidity = excluded.total_liquidity,
       cut_percentage = excluded.cut_percentage,
       active = 1,
       status = excluded.status`,
    {
      $id: fixture.nodeId,
      $type: fixture.type,
      $parent: fixture.parentNodeId,
      $name: fixture.name,
      $call: String(fixture.nodeId),
      $email: `${String(fixture.nodeId)}@example.invalid`,
      $telegram: `demo-${String(fixture.nodeId)}`,
      $accounts: fixture.series.length,
      $liquidity: fixture.handle7d / 10,
      $cut: fixture.type === 'partner' ? 0.12 : fixture.type === 'agent' ? 0.08 : 0.04,
      $status: fixture.type === 'partner' ? 'partner' : 'active',
      $created: nowIso,
    }
  );
}

export function seedLimitPatternDemo(
  db: Database,
  opts?: { force?: boolean; nowSec?: number }
): SeedLimitPatternDemoResult {
  initSchema(db);
  ensureAccountLimitsSchema(db);
  ensureStateRegulationSchema(db);
  seedStateRegulations(db);
  const now = opts?.nowSec ?? Math.floor(Date.now() / 1000);
  const nowIso = new Date((now - 45 * 86400) * 1000).toISOString();

  const existing = db
    .query(`SELECT COUNT(*) AS n FROM partner_account_limits WHERE node_id LIKE 'limit-demo-%'`)
    .get() as { n: number };
  if (existing.n > 0 && !opts?.force) {
    for (const fixture of LIMIT_PATTERN_FIXTURES) {
      upsertFixtureTreeNode(db, fixture, nowIso);
      bindPartnerProfile(db, fixture.nodeId, {
        lifecycleStatus: fixture.type === 'partner' ? 'active' : 'materialized',
      });
    }
    return {
      seeded: false,
      partners: LIMIT_PATTERN_FIXTURES.filter(row => row.type === 'partner').length,
      downlineNodes: LIMIT_PATTERN_FIXTURES.filter(row => row.type !== 'partner').length,
      nodes: LIMIT_PATTERN_FIXTURES.length,
      limitRows: existing.n,
      raises: queryRecentLimitChanges(db, 48).filter(row =>
        String(row.node_id).startsWith('limit-demo-')
      ).length,
      violations: 0,
    };
  }

  for (const fixture of LIMIT_PATTERN_FIXTURES) {
    if (opts?.force) {
      db.run(
        `DELETE FROM limit_raise_context
         WHERE node_id = $nid OR limit_record_id IN (
           SELECT id FROM partner_account_limits WHERE node_id = $nid
         )`,
        { $nid: fixture.nodeId }
      );
      for (const table of [
        'market_line_movement',
        'player_clv_snapshots',
        'partner_players',
        'partner_account_limits',
        'account_alerts',
        'regulatory_violations',
        'partner_state_licenses',
        'partner_geo_profiles',
      ]) {
        db.run(`DELETE FROM ${table} WHERE node_id = $nid`, { $nid: fixture.nodeId });
      }
    }
    upsertFixtureTreeNode(db, fixture, nowIso);
    bindPartnerProfile(db, fixture.nodeId, {
      lifecycleStatus: fixture.type === 'partner' ? 'active' : 'materialized',
    });
  }

  const compliance = new ComplianceRepository(db);
  let limitRows = 0;
  let raiseCount = 0;
  let violationCount = 0;

  for (let fixtureIndex = 0; fixtureIndex < LIMIT_PATTERN_FIXTURES.length; fixtureIndex++) {
    const fixture = LIMIT_PATTERN_FIXTURES[fixtureIndex]!;
    applyPartnerComplianceOnboard(db, fixture.nodeId, {
      stateCode: fixture.stateCode,
      age: fixture.age,
      location: fixture.location,
      zipCode: fixture.zipCode,
      licenseNumber: `LIMIT-DEMO-${fixture.stateCode}-${fixtureIndex + 1}`,
      identityVerified: true,
    });

    for (let i = 0; i < fixture.violations; i++) {
      compliance.logViolation(
        fixture.nodeId,
        fixture.stateCode,
        i % 2 === 0 ? 'Demo wager exceeded state maximum' : 'Demo ZIP policy review',
        {
          age: fixture.age,
          location: fixture.location,
          zipCode: fixture.zipCode,
          details: JSON.stringify({ fixture: 'limit-patterns', ordinal: i + 1 }),
        }
      );
      violationCount++;
    }

    let seriesIndex = 0;
    for (const series of fixture.series) {
      const seriesStart = now - 12 * 3600 + fixtureIndex * 420 + seriesIndex * 120;
      for (let valueIndex = 0; valueIndex < series.values.length; valueIndex++) {
        const recordedAt = seriesStart + valueIndex * 900;
        db.run(
          `INSERT INTO partner_account_limits
             (node_id, sportsbook, sport_id, market_id, bet_type, max_wager,
              recorded_at, effective_from)
           VALUES ($nid, $book, $sport, $market, $type, $max, $at, $at)`,
          {
            $nid: fixture.nodeId,
            $book: series.sportsbook,
            $sport: series.sport,
            $market: series.market,
            $type: series.betType,
            $max: series.values[valueIndex]!,
            $at: recordedAt,
          }
        );
        limitRows++;
      }
      seriesIndex++;
    }

    const analytics = new PartnerAnalyticsRepository(db, fixture.nodeId);
    const raises = analytics.detectRaises(now - 48 * 3600);
    for (const raise of raises) {
      analytics.recordRaiseContext(
        raise.limit_id,
        contextForFixture(fixture),
        raise.increased_at + 1
      );
      db.run(
        `INSERT INTO market_line_movement
           (node_id, sportsbook, sport_id, market_id, bet_type, move_delta, recorded_at)
         VALUES ($nid, $book, $sport, $market, $type, $delta, $at)`,
        {
          $nid: fixture.nodeId,
          $book: raise.sportsbook,
          $sport: raise.sport_id,
          $market: raise.market_id,
          $type: raise.bet_type,
          $delta: 0.35 + fixtureIndex * 0.09,
          $at: raise.increased_at + 120,
        }
      );
      raiseCount++;
    }
  }

  return {
    seeded: true,
    partners: LIMIT_PATTERN_FIXTURES.filter(row => row.type === 'partner').length,
    downlineNodes: LIMIT_PATTERN_FIXTURES.filter(row => row.type !== 'partner').length,
    nodes: LIMIT_PATTERN_FIXTURES.length,
    limitRows,
    raises: raiseCount,
    violations: violationCount,
  };
}

export type LimitPatternChange = {
  limit_id: number; // brand-ok — partner_account_limits.id
  node_id: TreeNodeId;
  sportsbook: string;
  sport_id: string; // brand-ok — sportsbook catalog wire
  market_id: string; // brand-ok — sportsbook catalog wire
  previous_max: number;
  new_limit: number;
  direction: 'up' | 'down';
  multi_factor_score?: number;
  context_proof_valid?: boolean | null;
};

export type LimitPatternNode = {
  node_id: TreeNodeId;
  partner_node_id: TreeNodeId;
  parent_node_id: TreeNodeId | null;
  node_name: string;
  node_type: 'partner' | 'agent' | 'sub_agent';
  downline_depth: number;
  state_code: StateCode | null;
  location: string | null;
  zip_code: ZipCode | null;
  zip_prefix: string | null;
  license_status: string | null;
  violation_count_30d: number;
  changes: number;
  scored_changes: number;
  proof_verified_changes: number;
  raises: number;
  decreases: number;
  net_delta: number;
  avg_delta_pct: number;
  avg_influence_score: number | null;
  sportsbooks: string[];
  top_market: string | null;
};

export type LimitPatternAggregate = {
  key: string;
  changes: number;
  raises: number;
  decreases: number;
  net_delta: number;
  avg_delta_pct: number;
  avg_influence_score: number | null;
  partners: number;
  nodes: number;
  states: string[];
  zip_prefixes: string[];
  top_market: string | null;
};

export type LimitPatternSnapshot = {
  schemaVersion: 1;
  lookbackHours: number;
  partners: number;
  nodes: number;
  downlineNodes: number;
  books: LimitPatternAggregate[];
  states: LimitPatternAggregate[];
  zips: LimitPatternAggregate[];
  nodePatterns: LimitPatternNode[];
  audit: {
    changeRows: number;
    hierarchyLinked: number;
    geoLinked: number;
    licensed: number;
    scored: number;
    proofVerified: number;
    coveragePct: number;
    sourceTables: string[];
  };
};

type TreeRow = {
  id: string; // brand-ok — tree_nodes.id wire
  type: 'partner' | 'agent' | 'sub_agent';
  parent_id: string | null; // brand-ok — tree_nodes.parent_id wire
  name: string;
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
  status: string;
};

function tableExists(db: Database, name: string): boolean {
  return (
    db
      .query(`SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = $name`)
      .get({ $name: name }) != null
  );
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function topValue(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return (
    [...counts].sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
    )[0]?.[0] ?? null
  );
}

function aggregatePatternRows(
  rows: Array<{
    key: string;
    change: LimitPatternChange;
    partnerNodeId: TreeNodeId;
    stateCode: StateCode | null;
    zipPrefix: string | null;
  }>
): LimitPatternAggregate[] {
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const group = groups.get(row.key) ?? [];
    group.push(row);
    groups.set(row.key, group);
  }
  return [...groups]
    .map(([key, group]) => {
      const deltaPcts = group.map(({ change }) =>
        change.previous_max > 0
          ? ((change.new_limit - change.previous_max) / change.previous_max) * 100
          : 0
      );
      const scores = group
        .map(({ change }) => change.multi_factor_score)
        .filter((score): score is number => score != null);
      return {
        key,
        changes: group.length,
        raises: group.filter(({ change }) => change.direction === 'up').length,
        decreases: group.filter(({ change }) => change.direction === 'down').length,
        net_delta: group.reduce(
          (sum, { change }) => sum + change.new_limit - change.previous_max,
          0
        ),
        avg_delta_pct: round(average(deltaPcts) ?? 0, 2),
        avg_influence_score: scores.length > 0 ? round(average(scores) ?? 0) : null,
        partners: new Set(group.map(row => row.partnerNodeId)).size,
        nodes: new Set(group.map(row => row.change.node_id)).size,
        states: [...new Set(group.map(row => row.stateCode).filter(Boolean))].sort(),
        zip_prefixes: [...new Set(group.map(row => row.zipPrefix).filter(Boolean))].sort(),
        top_market: topValue(group.map(row => row.change.market_id)),
      };
    })
    .sort((left, right) => right.changes - left.changes || left.key.localeCompare(right.key));
}

export function buildLimitPatternSnapshot(
  db: Database,
  changes: LimitPatternChange[],
  lookbackHours = 48
): LimitPatternSnapshot {
  const treeRows = tableExists(db, 'tree_nodes')
    ? (db.query(`SELECT id, type, parent_id, name FROM tree_nodes`).all() as TreeRow[])
    : [];
  const treeByNode = new Map(treeRows.map(row => [row.id, row]));
  const geoRows = tableExists(db, 'partner_geo_profiles')
    ? (db
        .query(`SELECT node_id, state_code, location, zip_code FROM partner_geo_profiles`)
        .all() as GeoRow[])
    : [];
  const geoByNode = new Map(geoRows.map(row => [row.node_id, row]));
  const licenseRows = tableExists(db, 'partner_state_licenses')
    ? (db
        .query(`SELECT node_id, state_code, status FROM partner_state_licenses`)
        .all() as LicenseRow[])
    : [];
  const licenseByNodeState = new Map(
    licenseRows.map(row => [`${row.node_id}:${row.state_code}`, row.status])
  );
  const since = Math.floor(Date.now() / 1000) - 30 * 86400;
  const violationRows = tableExists(db, 'regulatory_violations')
    ? (db
        .query(
          `SELECT node_id, COUNT(*) AS n
           FROM regulatory_violations
           WHERE blocked_at >= $since
           GROUP BY node_id`
        )
        .all({ $since: since }) as Array<{
        node_id: string; // brand-ok — regulatory_violations.node_id wire
        n: number;
      }>)
    : [];
  const violationsByNode = new Map(violationRows.map(row => [row.node_id, row.n]));

  function lineage(nodeId: TreeNodeId): {
    partnerNodeId: TreeNodeId;
    parentNodeId: TreeNodeId | null;
    node: TreeRow;
    depth: number;
  } {
    const fallback: TreeRow = {
      id: nodeId,
      type: 'partner',
      parent_id: null,
      name: nodeId,
    };
    const node = treeByNode.get(nodeId) ?? fallback;
    let cursor = node;
    let depth = 0;
    const seen = new Set<string>();
    while (cursor.parent_id && depth < 16 && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      const parent = treeByNode.get(cursor.parent_id);
      if (!parent) break;
      cursor = parent;
      depth++;
      if (cursor.type === 'partner') break;
    }
    return {
      partnerNodeId: asTreeNodeId(cursor.type === 'partner' ? cursor.id : node.id),
      parentNodeId: node.parent_id ? asTreeNodeId(node.parent_id) : null,
      node,
      depth,
    };
  }

  function inheritedGeo(nodeId: TreeNodeId): GeoRow | null {
    let cursor: string | null = nodeId;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      const geo = geoByNode.get(cursor);
      if (geo) return geo;
      cursor = treeByNode.get(cursor)?.parent_id ?? null;
    }
    return null;
  }

  const byNode = new Map<TreeNodeId, LimitPatternChange[]>();
  for (const change of changes) {
    const rows = byNode.get(change.node_id) ?? [];
    rows.push(change);
    byNode.set(change.node_id, rows);
  }

  const nodePatterns: LimitPatternNode[] = [...byNode].map(([nodeId, nodeChanges]) => {
    const tree = lineage(nodeId);
    const geo = inheritedGeo(nodeId);
    const stateCode = geo?.state_code ? asStateCode(geo.state_code) : null;
    const zipCode = geo?.zip_code ? asZipCode(geo.zip_code) : null;
    const scores = nodeChanges
      .map(change => change.multi_factor_score)
      .filter((score): score is number => score != null);
    const deltaPcts = nodeChanges.map(change =>
      change.previous_max > 0
        ? ((change.new_limit - change.previous_max) / change.previous_max) * 100
        : 0
    );
    return {
      node_id: nodeId,
      partner_node_id: tree.partnerNodeId,
      parent_node_id: tree.parentNodeId,
      node_name: tree.node.name,
      node_type: tree.node.type,
      downline_depth: tree.depth,
      state_code: stateCode,
      location: geo?.location ?? null,
      zip_code: zipCode,
      zip_prefix: zipCode ? String(zipCode).slice(0, 3) : null,
      license_status: stateCode
        ? (licenseByNodeState.get(`${nodeId}:${stateCode}`) ??
          licenseByNodeState.get(`${tree.partnerNodeId}:${stateCode}`) ??
          null)
        : null,
      violation_count_30d: violationsByNode.get(nodeId) ?? 0,
      changes: nodeChanges.length,
      scored_changes: nodeChanges.filter(change => change.multi_factor_score != null).length,
      proof_verified_changes: nodeChanges.filter(change => change.context_proof_valid === true)
        .length,
      raises: nodeChanges.filter(change => change.direction === 'up').length,
      decreases: nodeChanges.filter(change => change.direction === 'down').length,
      net_delta: nodeChanges.reduce(
        (sum, change) => sum + change.new_limit - change.previous_max,
        0
      ),
      avg_delta_pct: round(average(deltaPcts) ?? 0, 2),
      avg_influence_score: scores.length > 0 ? round(average(scores) ?? 0) : null,
      sportsbooks: [...new Set(nodeChanges.map(change => change.sportsbook))].sort(),
      top_market: topValue(nodeChanges.map(change => change.market_id)),
    };
  });

  const patternRows = changes.map(change => {
    const node = nodePatterns.find(pattern => pattern.node_id === change.node_id)!;
    return {
      change,
      partnerNodeId: node.partner_node_id,
      stateCode: node.state_code,
      zipPrefix: node.zip_prefix,
    };
  });

  const geoLinked = nodePatterns.filter(node => node.state_code && node.zip_code).length;
  const hierarchyLinked = nodePatterns.filter(node => treeByNode.has(node.node_id)).length;
  const coverageBase = Math.max(1, nodePatterns.length * 3 + changes.length * 2);
  const coverageHits =
    hierarchyLinked +
    geoLinked +
    nodePatterns.filter(node => node.license_status).length +
    changes.filter(change => change.multi_factor_score != null).length +
    changes.filter(change => change.context_proof_valid === true).length;

  return {
    schemaVersion: 1,
    lookbackHours,
    partners: new Set(nodePatterns.map(node => node.partner_node_id)).size,
    nodes: nodePatterns.length,
    downlineNodes: nodePatterns.filter(node => node.node_type !== 'partner').length,
    books: aggregatePatternRows(patternRows.map(row => ({ ...row, key: row.change.sportsbook }))),
    states: aggregatePatternRows(
      patternRows.filter(row => row.stateCode).map(row => ({ ...row, key: String(row.stateCode) }))
    ),
    zips: aggregatePatternRows(
      patternRows.filter(row => row.zipPrefix).map(row => ({ ...row, key: String(row.zipPrefix) }))
    ),
    nodePatterns: nodePatterns.sort(
      (left, right) =>
        left.partner_node_id.localeCompare(right.partner_node_id) ||
        left.downline_depth - right.downline_depth ||
        left.node_name.localeCompare(right.node_name)
    ),
    audit: {
      changeRows: changes.length,
      hierarchyLinked,
      geoLinked,
      licensed: nodePatterns.filter(node => node.license_status === 'active').length,
      scored: changes.filter(change => change.multi_factor_score != null).length,
      proofVerified: changes.filter(change => change.context_proof_valid === true).length,
      coveragePct: round((coverageHits / coverageBase) * 100, 1),
      sourceTables: [
        'tree_nodes',
        'partner_account_limits',
        'limit_raise_context',
        'partner_geo_profiles',
        'partner_state_licenses',
        'regulatory_violations',
      ],
    },
  };
}

export function queryLimitPatternSnapshot(db: Database, lookbackHours = 48): LimitPatternSnapshot {
  const changes = queryRecentLimitChanges(db, lookbackHours).map(change => ({
    ...change,
    node_id: asTreeNodeId(change.node_id),
  }));
  return buildLimitPatternSnapshot(db, changes, lookbackHours);
}

export function scopeLimitPatternSnapshot(
  snapshot: LimitPatternSnapshot,
  nodeId: TreeNodeId
): LimitPatternSnapshot {
  const scopedNodes = snapshot.nodePatterns.filter(
    node => node.node_id === nodeId || node.partner_node_id === nodeId
  );
  const scopedBooks = new Set(scopedNodes.flatMap(node => node.sportsbooks));
  const scopedStates = new Set(scopedNodes.map(node => String(node.state_code ?? '')));
  const scopedZips = new Set(scopedNodes.map(node => String(node.zip_prefix ?? '')));
  const scopedChanges = scopedNodes.reduce((sum, node) => sum + node.changes, 0);
  const coverageBase = Math.max(1, scopedNodes.length * 3 + scopedChanges * 2);
  const coverageHits =
    scopedNodes.filter(node => node.partner_node_id).length +
    scopedNodes.filter(node => node.state_code && node.zip_code).length +
    scopedNodes.filter(node => node.license_status === 'active').length +
    scopedNodes.reduce((sum, node) => sum + node.scored_changes, 0) +
    scopedNodes.reduce((sum, node) => sum + node.proof_verified_changes, 0);
  return {
    ...snapshot,
    partners: new Set(scopedNodes.map(node => node.partner_node_id)).size,
    nodes: scopedNodes.length,
    downlineNodes: scopedNodes.filter(node => node.node_type !== 'partner').length,
    books: snapshot.books.filter(row => scopedBooks.has(row.key)),
    states: snapshot.states.filter(row => scopedStates.has(row.key)),
    zips: snapshot.zips.filter(row => scopedZips.has(row.key)),
    nodePatterns: scopedNodes,
    audit: {
      ...snapshot.audit,
      hierarchyLinked: scopedNodes.filter(node => node.partner_node_id).length,
      geoLinked: scopedNodes.filter(node => node.state_code && node.zip_code).length,
      licensed: scopedNodes.filter(node => node.license_status === 'active').length,
      scored: scopedNodes.reduce((sum, node) => sum + node.scored_changes, 0),
      proofVerified: scopedNodes.reduce((sum, node) => sum + node.proof_verified_changes, 0),
      coveragePct: round((coverageHits / coverageBase) * 100, 1),
      sourceTables: snapshot.audit.sourceTables,
      changeRows: scopedChanges,
    },
  };
}
