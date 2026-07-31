// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  betlogDownloadResponse,
  betlogFilename,
  flattenBetlogRaise,
  raisesToCsv,
  raisesToJsonl,
} from '../lib/operations/limit-betlog-export.ts';
import {
  ensureAccountLimitsSchema,
  seedAccountLimitsDemo,
} from '../lib/account-limits-repo.ts';
import { handleLimitRaiseAgentRequest } from '../lib/operations/limit-raise-agent-api.ts';
import { Database } from 'bun:sqlite';
import { onRequestGet as raisesGet } from '../functions/api/agents/v1/limits/raises.ts';

describe('limit betlog export', () => {
  test('flattens raise rows into CSV and JSONL', () => {
    const rows = [
      {
        node_id: 'partner-42',
        direction: 'up',
        sportsbook: 'fanduel',
        sport_id: 'nba',
        market_id: 'spread',
        bet_type: 'straight',
        previous_max: 800,
        new_limit: 1200,
        increased_at: 1_700_000_000,
        multi_factor_score: 0.61,
        top_contributing_factors: ['total_handle_7d', 'avg_clv_7d'],
        context_proof: { valid: true },
        message: 'demo',
      },
    ];
    const flat = flattenBetlogRaise(rows[0]!);
    expect(flat.delta).toBe(400);
    expect(flat.top_factors).toBe('total_handle_7d|avg_clv_7d');
    const csv = raisesToCsv(rows);
    expect(csv).toContain('node_id,direction,sportsbook');
    expect(csv).toContain('partner-42');
    expect(csv).toContain('fanduel');
    const jsonl = raisesToJsonl(rows);
    expect(jsonl.trim().split('\n')).toHaveLength(1);
    expect(JSON.parse(jsonl.trim()).sportsbook).toBe('fanduel');
    expect(betlogFilename('partner-42', 'csv')).toMatch(/^betlog-partner-42-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  test('download response sets attachment headers', async () => {
    const response = betlogDownloadResponse([], 'ASH-001', 'jsonl');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('ndjson');
    expect(response.headers.get('Content-Disposition')).toContain('betlog-ASH-001');
    expect(response.headers.get('X-Betlog-Rows')).toBe('0');
  });

  test('agent API serves format=csv and format=jsonl', async () => {
    const db = new Database(':memory:');
    ensureAccountLimitsSchema(db);
    const now = Math.floor(Date.now() / 1000);
    const { nodeId } = seedAccountLimitsDemo(db, { nowSec: now, force: true });

    const csvRes = handleLimitRaiseAgentRequest(
      new Request(
        `http://local/api/agents/v1/limits/raises?node_id=${encodeURIComponent(nodeId)}&hours=48&format=csv`
      ),
      db
    );
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers.get('Content-Type')).toContain('text/csv');
    const csv = await csvRes.text();
    expect(csv).toContain('node_id,direction,sportsbook');
    expect(csv).toContain(nodeId);

    const jsonlRes = handleLimitRaiseAgentRequest(
      new Request(
        `http://local/api/agents/v1/limits/raises?node_id=${encodeURIComponent(nodeId)}&hours=48&format=jsonl`
      ),
      db
    );
    expect(jsonlRes.status).toBe(200);
    expect(jsonlRes.headers.get('Content-Type')).toContain('ndjson');
    const line = (await jsonlRes.text()).trim().split('\n')[0]!;
    expect(JSON.parse(line).node_id).toBe(nodeId);
    db.close();
  });

  test('Pages snapshot handler serves betlog formats', async () => {
    const snapshot = {
      generatedAt: '2026-07-31T00:00:00.000Z',
      lookbackHours: 48,
      byNode: {
        'limit-demo-atlantic': {
          node_id: 'limit-demo-atlantic',
          raises: [
            {
              sportsbook: 'draftkings',
              sport_id: 'nba',
              market_id: 'totals',
              bet_type: 'straight',
              direction: 'up',
              previous_max: 500,
              new_limit: 900,
              increased_at: Math.floor(Date.now() / 1000) - 3600,
              multi_factor_score: 0.55,
              top_contributing_factors: ['avg_clv_7d'],
            },
          ],
        },
      },
      patterns: { nodePatterns: [] },
    };
    const assetsEnv = (body: unknown) => ({
      ASSETS: {
        fetch: async () =>
          new Response(JSON.stringify(body), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      },
    });

    const csvRes = await raisesGet({
      request: new Request(
        'https://score.factory-wager.com/api/agents/v1/limits/raises?node_id=limit-demo-atlantic&hours=48&format=csv'
      ),
      env: assetsEnv(snapshot),
    } as never);
    expect(csvRes.status).toBe(200);
    expect(await csvRes.text()).toContain('draftkings');

    const jsonlRes = await raisesGet({
      request: new Request(
        'https://score.factory-wager.com/api/agents/v1/limits/raises?node_id=limit-demo-atlantic&hours=48&format=jsonl'
      ),
      env: assetsEnv(snapshot),
    } as never);
    expect(jsonlRes.status).toBe(200);
    expect(JSON.parse((await jsonlRes.text()).trim()).market_id).toBe('totals');
  });
});
