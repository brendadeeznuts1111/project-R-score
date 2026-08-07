import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { portalCorsHeaders } from '../lib/http/portal-cors.ts';
import { respondFile } from '../lib/http/static-response.ts';
import { fetchJsonResult } from '../public/portal/fetch-json.js';
import { buildLimitWatchProjection } from '../public/portal/limits/limit-watch.js';

const ROOT = join(import.meta.dir, '..');

function snapshot() {
  return {
    byNode: {
      'node-nj': {
        raises: [
          {
            sportsbook: 'draftkings',
            sport_id: 'basketball',
            market_id: 'spread',
            bet_type: 'pregame',
            new_limit: 1_500,
            line_move_5m: 12,
            increased_at: 200,
            multi_factor_score: 0.8,
            context_proof: { valid: true },
          },
          {
            sportsbook: 'fanduel',
            sport_id: 'basketball',
            market_id: 'spread',
            bet_type: 'pregame',
            new_limit: 1_000,
            line_move_5m: 4,
            increased_at: 210,
            multi_factor_score: 0.7,
            context_proof: { valid: true },
          },
          {
            sportsbook: 'draftkings',
            sport_id: 'basketball',
            market_id: 'totals',
            bet_type: 'pregame',
            new_limit: 900,
            increased_at: 220,
            multi_factor_score: 0.55,
            context_proof: { valid: false },
          },
        ],
      },
      'node-ma': {
        raises: [
          {
            sportsbook: 'caesars',
            sport_id: 'soccer',
            market_id: 'match_winner',
            bet_type: 'live',
            new_limit: 2_000,
            increased_at: 230,
            multi_factor_score: 0.4,
            context_proof: { valid: true },
          },
        ],
      },
    },
    patterns: {
      nodePatterns: [
        {
          node_id: 'node-nj',
          node_name: 'Newark desk',
          state_code: 'NJ',
          zip_prefix: '071',
          license_status: 'active',
        },
        {
          node_id: 'node-ma',
          node_name: 'Boston desk',
          state_code: 'MA',
          zip_prefix: '021',
          license_status: 'active',
        },
      ],
    },
  };
}

describe('limit-watch portal projection', () => {
  test('joins market, operator, geo, stake, movement, and proof evidence', () => {
    const projection = buildLimitWatchProjection(snapshot(), { minStake: 750 });

    expect(projection.universe).toEqual({
      states: ['MA', 'NJ'],
      sports: ['basketball', 'soccer'],
      markets: ['match_winner', 'spread', 'totals'],
    });
    expect(projection.summary).toMatchObject({
      actionable: 1,
      crossOperator: 1,
      states: 2,
      operators: 3,
      stakeCapacity: 1_000,
    });
    expect(projection.signals[0]).toMatchObject({
      state: 'NJ',
      sport: 'basketball',
      market: 'spread',
      operatorCount: 2,
      maxStake: 1_000,
      stakeSpread: 500,
      actionable: true,
      movement: { kind: 'sharp', delta: 12 },
      sustainability: { label: 'high', score: 0.75 },
      evidence: { rows: 2, licensedNodes: 1, proofRows: 2 },
    });
  });

  test('applies region, market, and stake filters without inventing operator pairs', () => {
    const projection = buildLimitWatchProjection(snapshot(), {
      state: 'NJ',
      market: 'spread',
      minStake: 1_200,
    });

    expect(projection.signals).toHaveLength(1);
    expect(projection.signals[0].crossOperator).toBe(true);
    expect(projection.signals[0].actionable).toBe(false);
    expect(projection.summary.actionable).toBe(0);
  });

  test('board exposes controls, result table, and module wiring', async () => {
    const [html, script, headers, server] = await Promise.all([
      Bun.file(join(ROOT, 'public/portal/limits/index.html')).text(),
      Bun.file(join(ROOT, 'public/portal/limits/limit-watch.js')).text(),
      Bun.file(join(ROOT, 'public/_headers')).text(),
      Bun.file(join(ROOT, 'scripts/serve-public.ts')).text(),
    ]);
    expect(html).toContain('id="limit-watch"');
    expect(html).toContain('Cross-market limit watch');
    expect(html).toContain('id="watch-min-stake"');
    expect(html).toContain('id="limit-watch-body"');
    expect(html).toContain('/portal/limits/limit-watch.js?v=1');
    expect(html).toContain('price and edge');
    expect(html).toContain('href="../file-mode.css"');
    expect(html).toContain('src="../file-mode.js"');
    expect(script).toContain("import { fetchJsonResult } from '../fetch-json.js'");
    expect(script).toContain("method: 'GET'");
    expect(script).not.toContain("cache: 'no-store'");
    expect(script).toContain('expected JSON');
    expect(script).toContain('retrying automatically');
    expect(headers).toMatch(/\/registry\/\*\.json[\s\S]*Access-Control-Allow-Origin: \*/);
    expect(server).toContain("path === '/registry/limit-raises.json'");
    expect(server).toContain('await respondFile(fsPath, request, responseOptions)');
    expect(server).toContain("req.method === 'OPTIONS' && path.startsWith('/registry/')");
  });

  test('Bun fetch reads file, data, and blob JSON with their content types', async () => {
    const fileUrl = new URL('../public/registry/limit-raises.json', import.meta.url);
    const dataUrl = 'data:application/json;base64,eyJvayI6dHJ1ZX0=';
    const blobUrl = URL.createObjectURL(
      new Blob(['{"ok":true}'], { type: 'application/json' })
    );
    try {
      const [fileResult, dataResult, blobResult] = await Promise.all([
        fetchJsonResult(fileUrl.href),
        fetchJsonResult(dataUrl),
        fetchJsonResult(blobUrl),
      ]);
      for (const result of [fileResult, dataResult, blobResult]) {
        expect(result.ok).toBe(true);
        expect(result.contentType).toContain('application/json');
      }
      expect(fileResult.ok && fileResult.data.schemaVersion).toBe(3);
      expect(dataResult.ok && dataResult.data.ok).toBe(true);
      expect(blobResult.ok && blobResult.data.ok).toBe(true);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  });

  test('BunFile response preserves JSON metadata and public-read CORS', async () => {
    const response = await respondFile(
      join(ROOT, 'public/registry/limit-raises.json'),
      new Request('http://localhost/registry/limit-raises.json'),
      {
        headers: portalCorsHeaders(),
        cacheControl: 'public, max-age=60, stale-while-revalidate=30',
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('X-Serve-Strategy')).toBe('file');
    expect(response.headers.get('Last-Modified')).toBeTruthy();
    expect(response.headers.get('ETag')).toMatch(/^W\//);
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=60, stale-while-revalidate=30'
    );
    expect((await response.json()).schemaVersion).toBe(3);
  });
});
