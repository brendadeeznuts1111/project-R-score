// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * State regulatory compliance — MA/NJ isolation, licenses, bet limits.
 *
 * Run:
 *   bun test tests/state-compliance.test.ts
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { openOperationsDb } from '../lib/operations/db.ts';
import {
  ComplianceRepository,
  ScopedRepository,
  seedStateRegulations,
  getPartnerRegulatoryStatus,
  requireStateCompliance,
  renderRegulatoryPanelHtml,
  ensureStateRegulationSchema,
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

  test('NJ allows teaser; MA soccer does not (no cross-state leakage)', () => {
    const nodeId = 'dual-state';
    seedPartner(db, nodeId);
    const repo = new ComplianceRepository(db);
    repo.upsertLicense(nodeId, 'MA');
    repo.upsertLicense(nodeId, 'NJ');

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
});
