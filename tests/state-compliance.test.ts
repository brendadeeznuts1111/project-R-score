// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * State regulatory compliance — MA/NJ isolation, licenses, bet limits.
 *
 * Run:
 *   bun test tests/state-compliance.test.ts
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { randomUUIDv7 } from 'bun';
import { openOperationsDb } from '../lib/operations/db.ts';
import { ensurePosition } from '../lib/operations/liquidity.ts';
import { bindPartnerProfile } from '../lib/operations/partner-profile-bridge.ts';
import { publishAndDispatch } from '../lib/operations/play-dispatcher.ts';
import { PlaySigner } from '../lib/operations/play-signing.ts';
import {
  ComplianceRepository,
  ScopedRepository,
  seedStateRegulations,
  getPartnerRegulatoryStatus,
  requireStateCompliance,
  renderRegulatoryPanelHtml,
  ensureStateRegulationSchema,
  normalizeSportCatalogKey,
  normalizeMarketCatalogKey,
  setPartnerIdentityVerified,
  sumDailyStateWagerVolume,
  upsertPartnerGeoProfile,
} from '../lib/operations/state-regulation.ts';
import { asStateCode, asTreeNodeId } from '../lib/types/branded.ts';

function seedPartner(
  db: ReturnType<typeof openOperationsDb>,
  nodeId: string // brand-ok — test fixture tree node
) {
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, active, status, created_at)
     VALUES ($id, 'partner', NULL, NULL, $name, 1, 'active', $now)`,
    { $id: nodeId, $name: `Partner ${nodeId}`, $now: now }
  );
}

describe('state compliance', () => {
  let db: ReturnType<typeof openOperationsDb>;

  beforeEach(() => {
    db = openOperationsDb({ path: ':memory:' });
    ensureStateRegulationSchema(db);
    seedStateRegulations(db);
  });

  test('plays table has state_code column', () => {
    const cols = db.query('PRAGMA table_info(plays)').all() as { name: string }[];
    expect(cols.some(c => c.name === 'state_code')).toBe(true);
  });

  test('compliance check blocks unlicensed partner in NJ', () => {
    const nodeId = 'unlicensed-partner';
    seedPartner(db, nodeId);
    const repo = new ComplianceRepository(db);
    const result = repo.isBetAllowed({
      nodeId,
      stateCode: 'NJ',
      sportId: 'soccer',
      marketId: 'match_winner',
      wagerAmount: 100,
      betType: 'straight',
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toContain('not licensed');
    }
  });

  test('licensed partner allowed under MA max wager', () => {
    const nodeId = 'ma-licensed';
    seedPartner(db, nodeId);
    const repo = new ComplianceRepository(db);
    repo.upsertLicense(nodeId, 'MA', { licenseNumber: 'MA-TEST-1' });

    const ok = repo.isBetAllowed({
      nodeId,
      stateCode: 'MA',
      sportId: 'soccer',
      marketId: 'match_winner',
      wagerAmount: 100,
      betType: 'straight',
    });
    expect(ok).toEqual({ allowed: true });
  });

  test('MA max wager and bet type enforced', () => {
    const nodeId = 'ma-limits';
    seedPartner(db, nodeId);
    const repo = new ComplianceRepository(db);
    repo.upsertLicense(nodeId, 'MA');

    const over = repo.isBetAllowed({
      nodeId,
      stateCode: 'MA',
      sportId: 'soccer',
      marketId: 'match_winner',
      wagerAmount: 6000,
      betType: 'straight',
    });
    expect(over.allowed).toBe(false);
    if (!over.allowed) expect(over.reason).toContain('max wager');

    const badType = repo.isBetAllowed({
      nodeId,
      stateCode: 'MA',
      sportId: 'soccer',
      marketId: 'match_winner',
      wagerAmount: 50,
      betType: 'teaser',
    });
    expect(badType.allowed).toBe(false);
    if (!badType.allowed) expect(badType.reason).toContain('not allowed');
  });

  test('materialized policy lifecycle can revoke enforcement', () => {
    const nodeId = 'ma-revoked-policy';
    seedPartner(db, nodeId);
    const repo = new ComplianceRepository(db);
    repo.upsertLicense(nodeId, 'MA');
    db.run(
      `UPDATE regulatory_limits
       SET status = 'revoked'
       WHERE policy_key = 'policy.MA.soccer.match_winner'`
    );

    expect(
      repo.isBetAllowed({
        nodeId,
        stateCode: 'MA',
        sportId: 'soccer',
        marketId: 'match_winner',
        wagerAmount: 6_000,
        betType: 'straight',
      })
    ).toEqual({ allowed: true });
  });

  test('account tier raises the governed basketball wager cap', () => {
    const nodeId = 'ma-vip-tier';
    seedPartner(db, nodeId);
    const repo = new ComplianceRepository(db);
    repo.upsertLicense(nodeId, 'MA');

    expect(
      repo.isBetAllowed({
        nodeId,
        stateCode: 'MA',
        sportId: 'basketball',
        marketId: 'over_under',
        wagerAmount: 12_000,
        betType: 'straight',
        accountTier: 'vip',
      })
    ).toEqual({ allowed: true });
    const blocked = repo.isBetAllowed({
      nodeId,
      stateCode: 'MA',
      sportId: 'basketball',
      marketId: 'over_under',
      wagerAmount: 16_000,
      betType: 'straight',
      accountTier: 'vip',
    });
    expect(blocked.allowed).toBe(false);
  });

  test('composite exclusion groups block an otherwise valid wager', () => {
    const nodeId = 'nj-exclusion';
    seedPartner(db, nodeId);
    const repo = new ComplianceRepository(db);
    repo.upsertLicense(nodeId, 'NJ');
    bindPartnerProfile(db, asTreeNodeId(nodeId));
    setPartnerIdentityVerified(db, nodeId, true);

    const result = repo.isBetAllowed({
      nodeId,
      stateCode: 'NJ',
      sportId: 'soccer',
      marketId: 'match_winner',
      wagerAmount: 100,
      betType: 'straight',
      exclusionGroups: ['soccer_single_market'],
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toContain('exclusion group');
  });

  test('NJ allows teaser; MA soccer does not (no cross-state leakage)', () => {
    const nodeId = 'dual-state';
    seedPartner(db, nodeId);
    const repo = new ComplianceRepository(db);
    repo.upsertLicense(nodeId, 'MA');
    repo.upsertLicense(nodeId, 'NJ');
    bindPartnerProfile(db, asTreeNodeId(nodeId));
    setPartnerIdentityVerified(db, nodeId, true);

    const nj = repo.isBetAllowed({
      nodeId,
      stateCode: 'NJ',
      sportId: 'soccer',
      marketId: 'match_winner',
      wagerAmount: 50,
      betType: 'teaser',
    });
    expect(nj).toEqual({ allowed: true });

    const ma = repo.isBetAllowed({
      nodeId,
      stateCode: 'MA',
      sportId: 'soccer',
      marketId: 'match_winner',
      wagerAmount: 50,
      betType: 'teaser',
    });
    expect(ma.allowed).toBe(false);
  });

  test('ScopedRepository blocks raw node_id filters', () => {
    const scope = new ScopedRepository(db, {
      nodeId: asTreeNodeId('node-a'),
      state: asStateCode('MA'),
    });
    expect(() =>
      scope.all(`SELECT * FROM regulatory_violations WHERE node_id = $x`, { $x: 'evil' })
    ).toThrow(/Direct dimension filter/);
  });

  test('ScopedRepository isolates violations by state', () => {
    const nodeId = asTreeNodeId('scope-partner');
    seedPartner(db, nodeId);
    const repo = new ComplianceRepository(db);
    repo.upsertLicense(nodeId, 'MA');
    repo.upsertLicense(nodeId, 'NJ');
    repo.logViolation(nodeId, 'MA', 'MA block');
    repo.logViolation(nodeId, 'NJ', 'NJ block');

    const maScope = new ScopedRepository(db, { nodeId, state: asStateCode('MA') });
    const maRows = maScope.all<{ reason: string }>(
      `SELECT reason FROM regulatory_violations ORDER BY blocked_at`
    );
    expect(maRows).toHaveLength(1);
    expect(maRows[0]!.reason).toBe('MA block');

    const njScope = new ScopedRepository(db, { nodeId, state: asStateCode('NJ') });
    const njRows = njScope.all<{ reason: string }>(`SELECT reason FROM regulatory_violations`);
    expect(njRows).toHaveLength(1);
    expect(njRows[0]!.reason).toBe('NJ block');
  });

  test('getPartnerRegulatoryStatus returns license, limits, violations', () => {
    const nodeId = 'dash-partner';
    seedPartner(db, nodeId);
    const repo = new ComplianceRepository(db);
    repo.upsertLicense(nodeId, 'MA', { licenseNumber: 'MA-99' });
    repo.logViolation(nodeId, 'MA', 'test violation');

    const status = getPartnerRegulatoryStatus(db, nodeId, 'MA');
    expect(status.state).toBe('MA');
    expect(status.license?.status).toBe('active');
    expect(status.license?.license_number).toBe('MA-99');
    expect(status.limits.some(l => l.sport_id === 'soccer')).toBe(true);
    expect(status.limits.some(l => l.policy_key?.startsWith('policy.MA.'))).toBe(true);
    expect(status.violations.some(v => v.reason === 'test violation')).toBe(true);

    const html = renderRegulatoryPanelHtml(status);
    expect(html).toContain('Regulatory – MA');
    expect(html).toContain('active');
  });

  test('requireStateCompliance middleware blocks unlicensed body', async () => {
    const nodeId = 'http-partner';
    seedPartner(db, nodeId);
    const req = new Request('http://localhost/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stateCode: 'NJ',
        sportId: 'soccer',
        marketId: 'match_winner',
        wagerAmount: 100,
        betType: 'straight',
      }),
    });
    const res = await requireStateCompliance(db, req, { nodeId });
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = (await res!.json()) as { error: string };
    expect(body.error).toContain('not licensed');

    const n = db
      .query(
        `SELECT COUNT(*) AS n FROM regulatory_violations
         WHERE node_id = $n AND state_code = 'NJ'`
      )
      .get({ $n: nodeId }) as { n: number };
    expect(n.n).toBe(1);
  });

  test('requireStateCompliance allows licensed MA bet', async () => {
    const nodeId = 'http-ma';
    seedPartner(db, nodeId);
    new ComplianceRepository(db).upsertLicense(nodeId, 'MA');
    const req = new Request('http://localhost/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stateCode: 'MA',
        sportId: 'soccer',
        marketId: 'match_winner',
        wagerAmount: 100,
        betType: 'straight',
      }),
    });
    const res = await requireStateCompliance(db, req, { nodeId });
    expect(res).toBeNull();
  });

  test('NBA/totals normalizes to basketball/over_under catalog', () => {
    expect(normalizeSportCatalogKey('NBA')).toBe('basketball');
    expect(normalizeMarketCatalogKey('totals')).toBe('over_under');
    const nodeId = 'nba-norm';
    seedPartner(db, nodeId);
    const repo = new ComplianceRepository(db);
    repo.upsertLicense(nodeId, 'MA');
    const ok = repo.isBetAllowed({
      nodeId,
      stateCode: 'MA',
      sportId: 'NBA',
      marketId: 'totals',
      wagerAmount: 500,
      betType: 'straight',
    });
    expect(ok).toEqual({ allowed: true });
  });

  test('NJ requires identity verification for soccer', () => {
    const nodeId = 'nj-idv';
    seedPartner(db, nodeId);
    const repo = new ComplianceRepository(db);
    repo.upsertLicense(nodeId, 'NJ');
    bindPartnerProfile(db, asTreeNodeId(nodeId));

    const blocked = repo.isBetAllowed({
      nodeId,
      stateCode: 'NJ',
      sportId: 'soccer',
      marketId: 'match_winner',
      wagerAmount: 50,
      betType: 'straight',
    });
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.reason).toContain('Identity verification');

    setPartnerIdentityVerified(db, nodeId, true);
    const ok = repo.isBetAllowed({
      nodeId,
      stateCode: 'NJ',
      sportId: 'soccer',
      marketId: 'match_winner',
      wagerAmount: 50,
      betType: 'straight',
    });
    expect(ok).toEqual({ allowed: true });
  });

  test('max_daily_total blocks after prior same-state stakes', () => {
    const nodeId = 'ma-daily';
    seedPartner(db, nodeId);
    const repo = new ComplianceRepository(db);
    repo.upsertLicense(nodeId, 'MA');

    // Prior distribution volume under MA today
    const playId = 'play-prior-daily';
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO experts (id, name, sport, market, edge_score, active, created_at)
       VALUES ('ex-daily', 'E', 'soccer', 'match_winner', 0.5, 1, $now)`,
      { $now: now }
    );
    db.run(
      `INSERT INTO plays (id, expert_id, sport, market, event, selection, odds, stake_recommended, confidence, signed_hash, sent_at, state_code)
       VALUES ($id, 'ex-daily', 'soccer', 'match_winner', 'A vs B', 'home', -110, 20000, 0, 'h', $now, 'MA')`,
      { $id: playId, $now: now }
    );
    db.run(
      `INSERT INTO play_distribution (play_id, node_id, channel, received_at, stake_actual, ack_status, state_code)
       VALUES ($pid, $nid, 'telegram', $now, 24000, 'pending', 'MA')`,
      { $pid: playId, $nid: nodeId, $now: now }
    );

    expect(sumDailyStateWagerVolume(db, nodeId, 'MA')).toBe(24000);

    // Under max_wager ($5k) but 24k + 2k exceeds max_daily_total ($25k)
    const over = repo.isBetAllowed({
      nodeId,
      stateCode: 'MA',
      sportId: 'soccer',
      marketId: 'match_winner',
      wagerAmount: 2000,
      betType: 'straight',
    });
    expect(over.allowed).toBe(false);
    if (!over.allowed) expect(over.reason).toContain('max daily total');
  });
});

describe('state compliance · play dispatcher', () => {
  test('stateCode play blocks unlicensed partner and logs violation', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    seedStateRegulations(db);
    const now = new Date().toISOString();
    const expertId = randomUUIDv7();
    const agentId = randomUUIDv7();
    db.run(
      `INSERT INTO experts (id, name, sport, market, edge_score, active, created_at)
       VALUES ($id, 'Expert', 'NBA', 'totals', 0.8, 1, $now)`,
      { $id: expertId, $now: now }
    );
    db.run(
      `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, telegram_id, active, status, created_at)
       VALUES ($aid, 'agent', NULL, $eid, 'Agent', '999', 1, 'active', $now)`,
      { $aid: agentId, $eid: expertId, $now: now }
    );
    bindPartnerProfile(db, asTreeNodeId(agentId));
    ensurePosition(db, agentId, '_all', 50_000);

    const result = await publishAndDispatch(
      new PlaySigner(),
      {
        expertId,
        sport: 'NBA',
        market: 'totals',
        event: 'LAL vs GSW',
        selection: 'over 225.5',
        odds: -110,
        stakeRecommended: 500,
        stateCode: 'MA',
      },
      db,
      { flush: false }
    );

    expect(result.enqueued).toBe(0);
    const play = db
      .query('SELECT state_code FROM plays WHERE id = $id')
      .get({ $id: result.id }) as { state_code: string };
    expect(play.state_code).toBe('MA');

    const gate = db
      .query(
        `SELECT allowed, action, reason FROM play_gate_decisions
         WHERE play_id = $pid AND node_id = $nid`
      )
      .get({ $pid: result.id, $nid: agentId }) as {
      allowed: number;
      action: string;
      reason: string;
    };
    expect(gate.allowed).toBe(0);
    expect(gate.action).toBe('block');
    expect(gate.reason).toContain('not licensed');

    const viol = db
      .query(
        `SELECT COUNT(*) AS n FROM regulatory_violations
         WHERE node_id = $n AND state_code = 'MA' AND play_id = $p`
      )
      .get({ $n: agentId, $p: result.id }) as { n: number };
    expect(viol.n).toBe(1);
    db.close();
  });

  test('licensed MA partner receives NBA/totals with state stamped on distribution', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    seedStateRegulations(db);
    const now = new Date().toISOString();
    const expertId = randomUUIDv7();
    const agentId = randomUUIDv7();
    db.run(
      `INSERT INTO experts (id, name, sport, market, edge_score, active, created_at)
       VALUES ($id, 'Expert', 'NBA', 'totals', 0.8, 1, $now)`,
      { $id: expertId, $now: now }
    );
    db.run(
      `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, telegram_id, active, status, created_at)
       VALUES ($aid, 'agent', NULL, $eid, 'Agent', '888', 1, 'active', $now)`,
      { $aid: agentId, $eid: expertId, $now: now }
    );
    bindPartnerProfile(db, asTreeNodeId(agentId));
    ensurePosition(db, agentId, '_all', 50_000);
    new ComplianceRepository(db).upsertLicense(agentId, 'MA', { licenseNumber: 'MA-DISP-1' });
    upsertPartnerGeoProfile(db, agentId, {
      stateCode: 'MA',
      age: 32,
      location: 'Boston',
      zipCode: '02108',
    });

    const result = await publishAndDispatch(
      new PlaySigner(),
      {
        expertId,
        sport: 'NBA',
        market: 'totals',
        event: 'BOS vs MIA',
        selection: 'over 210.5',
        odds: -110,
        stakeRecommended: 500,
        stateCode: 'MA',
        betType: 'straight',
      },
      db,
      { flush: false }
    );

    expect(result.enqueued).toBe(1);
    const dist = db
      .query(
        `SELECT state_code, stake_actual, ack_status FROM play_distribution
         WHERE play_id = $pid AND node_id = $nid`
      )
      .get({ $pid: result.id, $nid: agentId }) as {
      state_code: string;
      stake_actual: number;
      ack_status: string;
    };
    expect(dist.state_code).toBe('MA');
    expect(dist.stake_actual).toBe(500);
    expect(dist.ack_status).toBe('pending');

    const gate = db
      .query('SELECT allowed FROM play_gate_decisions WHERE play_id = $pid')
      .get({ $pid: result.id }) as { allowed: number };
    expect(gate.allowed).toBe(1);

    const enrich = db
      .query(
        `SELECT state_code, age, location, zip_code FROM play_zip_enrichment
         WHERE play_id = $pid AND node_id = $nid`
      )
      .get({ $pid: result.id, $nid: agentId }) as {
      state_code: string;
      age: number;
      location: string;
      zip_code: string;
    };
    expect(enrich.state_code).toBe('MA');
    expect(enrich.age).toBe(32);
    expect(enrich.location).toBe('Boston');
    expect(enrich.zip_code).toBe('02108');
    db.close();
  });

  test('HMAC binds stateCode — MA and NJ signatures differ', () => {
    const signer = new PlaySigner();
    const base = {
      expertId: 'ex-1',
      sport: 'NBA',
      market: 'totals',
      event: 'A vs B',
      selection: 'over',
      odds: -110,
      stakeRecommended: 100,
    };
    const ma = signer.sign({ ...base, stateCode: 'MA' });
    const nj = signer.sign({ ...base, stateCode: 'NJ' });
    const none = signer.sign(base);
    expect(ma).not.toBe(nj);
    expect(ma).not.toBe(none);
    expect(signer.verify({ ...base, stateCode: 'MA' }, ma)).toBe(true);
    expect(signer.verify({ ...base, stateCode: 'NJ' }, ma)).toBe(false);
  });
});
