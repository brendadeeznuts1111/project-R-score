// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/test/dates-times — setSystemTime (Date.now · new Date · Intl)
// @see https://bun.com/docs/guides/test/mock-clock — setSystemTime guide
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
import { afterEach, beforeEach, describe, expect, setSystemTime, test } from 'bun:test';

import { ensureAccountLimitsSchema } from '../lib/account-limits-repo.ts';
import { buildAccountLimitProfiles } from '../lib/operations/account-limit-profiles.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import { queryLimitPatternSnapshot } from '../lib/operations/limit-patterns.ts';
import { bindPartnerProfile } from '../lib/operations/partner-profile-bridge.ts';
import {
  ComplianceRepository,
  ensureStateRegulationSchema,
  seedStateRegulations,
  upsertPartnerGeoProfile,
} from '../lib/operations/state-regulation.ts';
import { asStateCode, asTreeNodeId } from '../lib/types/branded.ts';

/**
 * Deterministic clock for lookback windows.
 * `setSystemTime` mocks JS time (`Date.now`, `new Date()`, Intl) — not SQLite unixepoch().
 * @see https://bun.com/docs/test/dates-times
 */
const FAKE_NOW = new Date('2026-07-31T12:00:00.000Z');

describe('account limit profile projection', () => {
  beforeEach(() => {
    setSystemTime(FAKE_NOW);
  });

  afterEach(() => {
    // Reset mocked time (no args) — https://bun.com/docs/test/dates-times#reset-the-system-time
    setSystemTime();
  });

  test('joins profile, jurisdiction, license, policy, observation, and trace evidence', () => {
    const db = openOperationsDb({ path: ':memory:' });
    // Under setSystemTime, Date.now / new Date() return FAKE_NOW (not wall clock).
    const now = new Date();
    const nowSec = Math.floor(Date.now() / 1000);
    expect(now.toISOString()).toBe(FAKE_NOW.toISOString());
    expect(Date.now()).toBe(FAKE_NOW.getTime());
    const nodeId = asTreeNodeId('limits-account-ma');

    ensureAccountLimitsSchema(db);
    ensureStateRegulationSchema(db);
    seedStateRegulations(db);
    db.run(
      `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, active, status, created_at)
       VALUES ($id, 'partner', NULL, NULL, 'Boston account', 1, 'active', $created)`,
      { $id: nodeId, $created: now.toISOString() }
    );
    bindPartnerProfile(db, nodeId);
    upsertPartnerGeoProfile(db, nodeId, {
      stateCode: asStateCode('MA'),
      age: 31,
      location: 'Boston',
      zipCode: '02108',
    });
    const compliance = new ComplianceRepository(db);
    compliance.upsertLicense(nodeId, 'MA', { licenseNumber: 'MA-TEST-ACCOUNT' });

    db.run(
      `INSERT INTO partner_account_limits
         (node_id, sportsbook, sport_id, market_id, bet_type, max_wager, effective_from, recorded_at)
       VALUES
         ($id, 'draftkings', 'basketball', 'over_under', 'pregame', 500, $old, $old),
         ($id, 'draftkings', 'basketball', 'over_under', 'pregame', 900, $now, $now)`,
      { $id: nodeId, $old: nowSec - 3600, $now: nowSec - 60 }
    );

    const patterns = queryLimitPatternSnapshot(db, 48);
    const result = buildAccountLimitProfiles(db, patterns, now);
    const profile = result.profiles.find(row => row.treeNodeId === nodeId);

    expect(result).toMatchObject({
      schemaVersion: 2,
      kind: 'account-limit-profiles',
      summary: {
        accounts: 1,
        monitored: 1,
        jurisdictions: 2,
        policies: 4,
      },
    });
    expect(profile).toMatchObject({
      accountName: 'Boston account',
      monitoringStatus: 'monitored',
      tone: 'ok',
      jurisdiction: {
        stateCode: 'MA',
        location: 'Boston',
        zipCode: '02108',
      },
      license: {
        stateCode: 'MA',
        status: 'active',
        licenseNumber: 'MA-TEST-ACCOUNT',
      },
      observations: {
        dimensions: 1,
        sportsbooks: ['draftkings'],
        raises: 1,
        violations30d: 0,
      },
    });
    expect(profile?.policyCodes).toEqual(
      expect.arrayContaining([
        'FW-LIMIT-MA-BASKETBALL-OVER-UNDER-JURISDICTION',
        'FW-LIMIT-MA-SOCCER-MATCH-WINNER-JURISDICTION',
      ])
    );
    expect(result.kpis).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'kpi.compliance.active_policies',
          value: 4,
        }),
      ])
    );
    expect(result.policies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          policyKey: 'policy.MA.basketball.over_under',
          status: 'active',
          authority: 'state',
          riskTier: 'high',
          enforcementAction: 'block',
          dailyLimit: 50_000,
          tieredLimits: [{ tier: 'vip', maxBet: 15_000 }],
          source: 'regulation-policy-catalog',
        }),
      ])
    );
    expect(profile?.traces.map(trace => trace.kind)).toEqual(
      expect.arrayContaining([
        'profile-updated',
        'license-bound',
        'limit-observed',
        'policy-bound',
      ])
    );
    db.close();
  });

  test('derives blocked status and bad tone from recent violation evidence', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const nodeId = asTreeNodeId('limits-account-nj');
    ensureAccountLimitsSchema(db);
    ensureStateRegulationSchema(db);
    seedStateRegulations(db);
    db.run(
      `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, active, status, created_at)
       VALUES ($id, 'partner', NULL, NULL, 'New Jersey account', 1, 'active', $created)`,
      { $id: nodeId, $created: new Date().toISOString() }
    );
    bindPartnerProfile(db, nodeId);
    upsertPartnerGeoProfile(db, nodeId, {
      stateCode: asStateCode('NJ'),
      age: 27,
      location: 'Hoboken',
      zipCode: '07030',
    });
    const compliance = new ComplianceRepository(db);
    compliance.upsertLicense(nodeId, 'NJ');
    compliance.logViolation(nodeId, 'NJ', 'Test blocked wager');

    const result = buildAccountLimitProfiles(db, queryLimitPatternSnapshot(db), new Date());
    expect(result.profiles[0]).toMatchObject({
      monitoringStatus: 'blocked',
      tone: 'bad',
      observations: { violations30d: 1 },
    });
    expect(result.profiles[0]?.traces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'wager-blocked',
          source: 'regulatory_violations',
        }),
      ])
    );
    db.close();
  });

  test('projects additional state policies without a hardcoded jurisdiction list', () => {
    const db = openOperationsDb({ path: ':memory:' });
    ensureAccountLimitsSchema(db);
    ensureStateRegulationSchema(db);
    seedStateRegulations(db);
    // effective_from must be set explicitly: SQLite DEFAULT (unixepoch()) uses the
    // real wall clock, not Bun setSystemTime — a future real-time default would
    // fail effective_from <= now under the fake clock.
    const effectiveFrom = Math.floor(Date.now() / 1000);
    db.run(
      `INSERT INTO regulatory_limits
         (state_code, sport_id, market_id, max_wager, min_wager, allowed_bet_types, special_rules, effective_from)
       VALUES ('CO', 'basketball', 'spread', 7500, 0, '["straight"]', '{"min_age":21}', $from)`,
      { $from: effectiveFrom }
    );

    const result = buildAccountLimitProfiles(db, queryLimitPatternSnapshot(db), new Date());
    expect(result.summary.jurisdictions).toBe(3);
    expect(result.policies).toContainEqual(
      expect.objectContaining({
        stateCode: 'CO',
        policyCode: 'FW-LIMIT-CO-BASKETBALL-SPREAD-JURISDICTION',
        maxWager: 7500,
      })
    );
    db.close();
  });
});
