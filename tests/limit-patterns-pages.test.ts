// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  onRequestGet as raisesGet,
  onRequestPost as raisesPost,
} from '../functions/api/agents/v1/limits/raises.ts';
import { onRequestGet as summaryGet } from '../functions/api/limits/summary.ts';
import {
  onRequestGet as recordGet,
  onRequestPost as recordPost,
} from '../functions/api/agents/v1/limits/record.ts';

const now = Math.floor(Date.now() / 1000);

const snapshot = {
  schemaVersion: 1,
  generatedAt: '2026-07-28T00:00:00.000Z',
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
          previous_max: 500,
          new_limit: 1500,
          increased_at: now,
          multi_factor_score: 0.8,
        },
        {
          // outside window / missing stamp — must not appear when filtering
          sportsbook: 'old',
          previous_max: 1,
          new_limit: 2,
          increased_at: 0,
        },
      ],
    },
  },
  patterns: {
    partners: 1,
    nodes: 2,
    downlineNodes: 1,
    books: [{ key: 'draftkings' }],
    states: [{ key: 'NJ' }],
    zips: [{ key: '071' }],
    nodePatterns: [
      {
        node_id: 'limit-demo-atlantic',
        partner_node_id: 'limit-demo-atlantic',
        node_type: 'partner',
        state_code: 'NJ',
        zip_prefix: '071',
        sportsbooks: ['draftkings'],
      },
      {
        node_id: 'limit-demo-newark-agent',
        partner_node_id: 'limit-demo-atlantic',
        node_type: 'agent',
        state_code: 'NJ',
        zip_prefix: '071',
        sportsbooks: ['draftkings'],
      },
    ],
    audit: { hierarchyLinked: 2, geoLinked: 2 },
  },
};

function assetsEnv(body: unknown, status = 200) {
  return {
    ASSETS: {
      fetch: async () =>
        status === 200
          ? Response.json(body)
          : new Response('missing', { status }),
    },
  };
}

describe('Pages limit pattern API', () => {
  test('returns partner and downline patterns from the baked snapshot', async () => {
    const request = new Request(
      'https://score.factory-wager.com/api/agents/v1/limits/raises?node_id=limit-demo-atlantic&hours=48'
    );
    const response = await raisesGet({
      request,
      env: assetsEnv(snapshot),
    } as never);
    const body = (await response.json()) as {
      raises: unknown[];
      found: boolean;
      patterns: {
        partners: number;
        nodes: number;
        downlineNodes: number;
        books: Array<{ key: string }>;
        states: Array<{ key: string }>;
        zips: Array<{ key: string }>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.found).toBe(true);
    expect(body.raises).toHaveLength(1);
    expect(body.patterns.partners).toBe(1);
    expect(body.patterns.nodes).toBe(2);
    expect(body.patterns.downlineNodes).toBe(1);
    expect(body.patterns.books.map(row => row.key)).toEqual(['draftkings']);
    expect(body.patterns.states.map(row => row.key)).toEqual(['NJ']);
    expect(body.patterns.zips.map(row => row.key)).toEqual(['071']);
  });

  test('503 when snapshot missing', async () => {
    const response = await raisesGet({
      request: new Request(
        'https://score.factory-wager.com/api/agents/v1/limits/raises?node_id=x'
      ),
      env: assetsEnv(null, 404),
    } as never);
    expect(response.status).toBe(503);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain('snapshot');
  });

  test('503 when byNode is empty', async () => {
    const response = await raisesGet({
      request: new Request(
        'https://score.factory-wager.com/api/agents/v1/limits/raises?node_id=x'
      ),
      env: assetsEnv({ schemaVersion: 1, byNode: {} }),
    } as never);
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain('empty');
  });

  test('rejects bad hours on Pages', async () => {
    const response = await raisesGet({
      request: new Request(
        'https://score.factory-wager.com/api/agents/v1/limits/raises?node_id=x&hours=abc'
      ),
      env: assetsEnv(snapshot),
    } as never);
    expect(response.status).toBe(400);
  });

  test('format=table returns plain text', async () => {
    const response = await raisesGet({
      request: new Request(
        'https://score.factory-wager.com/api/agents/v1/limits/raises?node_id=limit-demo-atlantic&format=table'
      ),
      env: assetsEnv(snapshot),
    } as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/plain');
    expect(await response.text()).toContain('LimitRaises(snapshot)');
  });

  test('POST raises is 503', async () => {
    const response = await raisesPost({
      request: new Request(
        'https://score.factory-wager.com/api/agents/v1/limits/raises',
        { method: 'POST' }
      ),
      env: {},
    } as never);
    expect(response.status).toBe(503);
  });
});

describe('Pages limit summary API', () => {
  test('aggregates snapshot raises', async () => {
    const response = await summaryGet({
      request: new Request('https://score.factory-wager.com/api/limits/summary'),
      env: assetsEnv(snapshot),
    } as never);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      total: number;
      raises: number;
      uniquePartners: number;
      mode: string;
    };
    expect(body.mode).toBe('snapshot');
    expect(body.total).toBe(2); // includes unstamped historical row in snapshot aggregate
    expect(body.uniquePartners).toBe(1);
  });

  test('503 when bake missing', async () => {
    const response = await summaryGet({
      request: new Request('https://score.factory-wager.com/api/limits/summary'),
      env: assetsEnv(null, 404),
    } as never);
    expect(response.status).toBe(503);
  });

  test('format=table works', async () => {
    const response = await summaryGet({
      request: new Request(
        'https://score.factory-wager.com/api/limits/summary?format=table'
      ),
      env: assetsEnv(snapshot),
    } as never);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('LimitSummary(snapshot)');
  });
});

describe('Pages limit record stub', () => {
  test('POST is 503 local-only', async () => {
    const response = await recordPost({
      request: new Request(
        'https://score.factory-wager.com/api/agents/v1/limits/record',
        { method: 'POST', body: '{}' }
      ),
      env: {},
    } as never);
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain('Pages');
  });

  test('GET is 405', async () => {
    const response = await recordGet({
      request: new Request(
        'https://score.factory-wager.com/api/agents/v1/limits/record'
      ),
      env: {},
    } as never);
    expect(response.status).toBe(405);
  });
});
