// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
import { afterEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
  ensureAccountLimitsSchema,
  queryRecentLimitChanges,
  seedAccountLimitsDemo,
  AccountLimitsRepository,
} from '../lib/account-limits-repo.ts';
import {
  handleLimitRaiseAgentRequest,
  handleLimitRecordRequest,
  handleLimitSummaryRequest,
} from '../lib/operations/limit-raise-agent-api.ts';
import { PartnerAnalyticsRepository } from '../lib/operations/partner-analytics-repo.ts';
import { asTreeNodeId, type TreeNodeId } from '../lib/types/branded.ts';

const previousSigningSecret = Bun.env.REPORT_SIGNING_SECRET;

afterEach(() => {
  if (previousSigningSecret === undefined) delete Bun.env.REPORT_SIGNING_SECRET;
  else Bun.env.REPORT_SIGNING_SECRET = previousSigningSecret;
});

describe('limit raise agent API', () => {
  test('requires a scoped node identity', async () => {
    const db = new Database(':memory:');
    const response = handleLimitRaiseAgentRequest(
      new Request('http://local/api/agents/v1/limits/raises'),
      db
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('node_id');
    db.close();
  });

  test('rejects non-positive hours', async () => {
    const db = new Database(':memory:');
    const response = handleLimitRaiseAgentRequest(
      new Request('http://local/api/agents/v1/limits/raises?node_id=partner-42&hours=0'),
      db
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('hours');
    db.close();
  });

  test('returns enriched raises with a proofed envelope', async () => {
    Bun.env.REPORT_SIGNING_SECRET = 'test-limit-raise-signing-secret';
    const db = new Database(':memory:');
    ensureAccountLimitsSchema(db);
    const now = Math.floor(Date.now() / 1000);
    const { nodeId } = seedAccountLimitsDemo(db, { nowSec: now, force: true });
    const brandedNodeId = asTreeNodeId(nodeId);
    const raises = new PartnerAnalyticsRepository(db, brandedNodeId).detectRaises(now - 86400);
    const repository = new PartnerAnalyticsRepository(db, brandedNodeId);
    const metrics = repository.deriveContextMetrics(raises[0]!);
    repository.recordRaiseContext(raises[0]!.limit_id, metrics, raises[0]!.increased_at + 1);

    const response = handleLimitRaiseAgentRequest(
      new Request(
        `http://local/api/agents/v1/limits/raises?node_id=${encodeURIComponent(nodeId)}&hours=24`
      ),
      db
    );
    const body = (await response.json()) as {
      node_id: TreeNodeId;
      raises: Array<{
        multi_factor_score: number;
        top_contributing_factors: string[];
        context_proof: { valid: boolean; signed: boolean; hmacValid: boolean | null };
      }>;
      proof: { digest: string; hmac?: string };
      integrity: { hasHmac: boolean };
    };

    expect(response.status).toBe(200);
    expect(body.node_id).toBe(brandedNodeId);
    expect(body.raises.length).toBeGreaterThan(0);
    expect(body.raises[0]!.top_contributing_factors).toHaveLength(3);
    expect(body.raises[0]!.context_proof.valid).toBe(true);
    expect(body.raises[0]!.context_proof.signed).toBe(true);
    expect(body.raises[0]!.context_proof.hmacValid).toBe(true);
    expect(body.proof.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(body.proof.hmac).toMatch(/^[0-9a-f]{64}$/);
    expect(body.integrity.hasHmac).toBe(true);
    db.close();
  });

  test('caps the lookback window at thirty days', async () => {
    const db = new Database(':memory:');
    const response = handleLimitRaiseAgentRequest(
      new Request('http://local/api/agents/v1/limits/raises?node_id=partner-42&hours=9999'),
      db
    );
    expect(response.status).toBe(200);
    expect((await response.json()).lookback_hours).toBe(720);
    db.close();
  });

  test('format=table returns text/plain for raises', async () => {
    const db = new Database(':memory:');
    ensureAccountLimitsSchema(db);
    const now = Math.floor(Date.now() / 1000);
    const { nodeId } = seedAccountLimitsDemo(db, { nowSec: now, force: true });
    const response = handleLimitRaiseAgentRequest(
      new Request(
        `http://local/api/agents/v1/limits/raises?node_id=${encodeURIComponent(nodeId)}&format=table`
      ),
      db
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/plain');
    const text = await response.text();
    expect(text).toContain('LimitRaises');
    expect(text).toContain(nodeId);
    db.close();
  });

  test('summary format=table empty window is friendly', async () => {
    const db = new Database(':memory:');
    ensureAccountLimitsSchema(db);
    const response = handleLimitSummaryRequest(
      db,
      new Request('http://local/api/limits/summary?format=table')
    );
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('(no limit changes in window)');
    db.close();
  });

  test('POST record parses JSON body and detects raise', async () => {
    const db = new Database(':memory:');
    ensureAccountLimitsSchema(db);
    const now = Math.floor(Date.now() / 1000);
    const repo = new AccountLimitsRepository(db);
    repo.recordLimit({
      node_id: asTreeNodeId('partner-42'),
      sportsbook: 'draftkings',
      sport_id: 'nba',
      market_id: 'totals',
      bet_type: 'straight',
      max_wager: 500,
    });
    void now;

    const response = await handleLimitRecordRequest(
      new Request('http://local/api/agents/v1/limits/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: 'partner-42',
          sportsbook: 'draftkings',
          sport_id: 'nba',
          market_id: 'totals',
          bet_type: 'straight',
          max_wager: 1500,
        }),
      }),
      db
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      recorded: boolean;
      raise_detected: boolean;
      raise: { previous_max: number; new_limit: number } | null;
    };
    expect(body.recorded).toBe(true);
    expect(body.raise_detected).toBe(true);
    expect(body.raise?.previous_max).toBe(500);
    expect(body.raise?.new_limit).toBe(1500);
    db.close();
  });

  test('POST record rejects invalid max_wager and bad JSON', async () => {
    const db = new Database(':memory:');
    ensureAccountLimitsSchema(db);

    const badJson = await handleLimitRecordRequest(
      new Request('http://local/api/agents/v1/limits/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{not-json',
      }),
      db
    );
    expect(badJson.status).toBe(400);
    expect((await badJson.json()).error).toContain('JSON');

    const badWager = await handleLimitRecordRequest(
      new Request('http://local/api/agents/v1/limits/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: 'partner-42',
          sportsbook: 'draftkings',
          sport_id: 'nba',
          market_id: 'totals',
          bet_type: 'straight',
          max_wager: 'nope',
        }),
      }),
      db
    );
    expect(badWager.status).toBe(400);
    expect((await badWager.json()).error).toContain('max_wager');
    db.close();
  });

  test('POST record requires POST method', async () => {
    const db = new Database(':memory:');
    const response = await handleLimitRecordRequest(
      new Request('http://local/api/agents/v1/limits/record', { method: 'GET' }),
      db
    );
    expect(response.status).toBe(405);
    db.close();
  });
});

describe('queryRecentLimitChanges bet_type isolation', () => {
  test('does not cross-fire when same market has multiple bet types', () => {
    const db = new Database(':memory:');
    ensureAccountLimitsSchema(db);
    const now = Math.floor(Date.now() / 1000);
    const repo = new AccountLimitsRepository(db);
    const node = asTreeNodeId('partner-iso');
    // straight history: 500 → 1500 (true raise); live-only row must not cross-fire
    void now;
    repo.recordLimit({
      node_id: node,
      sportsbook: 'draftkings',
      sport_id: 'nba',
      market_id: 'totals',
      bet_type: 'straight',
      max_wager: 500,
    });
    repo.recordLimit({
      node_id: node,
      sportsbook: 'draftkings',
      sport_id: 'nba',
      market_id: 'totals',
      bet_type: 'straight',
      max_wager: 1500,
    });
    repo.recordLimit({
      node_id: node,
      sportsbook: 'draftkings',
      sport_id: 'nba',
      market_id: 'totals',
      bet_type: 'live',
      max_wager: 800,
    });

    const changes = queryRecentLimitChanges(db, 48);
    const forNode = changes.filter(c => c.node_id === 'partner-iso');
    expect(forNode.length).toBe(1);
    expect(forNode[0]!.bet_type).toBe('straight');
    expect(forNode[0]!.direction).toBe('up');
    expect(forNode[0]!.previous_max).toBe(500);
    expect(forNode[0]!.new_limit).toBe(1500);
    db.close();
  });

  test('detectDecreases compares against previous MAX (not MIN)', () => {
    const db = new Database(':memory:');
    ensureAccountLimitsSchema(db);
    const now = Math.floor(Date.now() / 1000);
    const repo = new AccountLimitsRepository(db);
    const node = asTreeNodeId('partner-down');
    void now;
    repo.recordLimit({
      node_id: node,
      sportsbook: 'fanduel',
      sport_id: 'nba',
      market_id: 'spreads',
      bet_type: 'pregame',
      max_wager: 500,
    });
    repo.recordLimit({
      node_id: node,
      sportsbook: 'fanduel',
      sport_id: 'nba',
      market_id: 'spreads',
      bet_type: 'pregame',
      max_wager: 1500,
    });
    repo.recordLimit({
      node_id: node,
      sportsbook: 'fanduel',
      sport_id: 'nba',
      market_id: 'spreads',
      bet_type: 'pregame',
      max_wager: 1000,
    });

    const decreases = repo.detectDecreases('partner-down', 0);
    expect(decreases.length).toBe(1);
    expect(decreases[0]!.previous_max).toBe(1500);
    expect(decreases[0]!.new_limit).toBe(1000);
    expect(decreases[0]!.limit_id).toBeGreaterThan(0);
    db.close();
  });
});
