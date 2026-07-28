// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
/**
 * Agent-facing multi-factor limit-raise response.
 *
 * The caller supplies an already-authorized request and database. Wire values
 * are parsed once here; branded node identity travels through the repository.
 */
import type { Database } from 'bun:sqlite';
import { parseTreeNodeId } from '../types/branded.ts';
import { buildReportProofFromValue, proofScoreHints } from '../security/report-proof.ts';
import { PartnerAnalyticsRepository } from './partner-analytics-repo.ts';
import { AccountLimitsRepository, queryRecentLimitChanges } from '../account-limits-repo.ts';
import { enqueueLimitRaiseAlert } from '../channels/outbox.ts';
import { runGranularAnalysis } from '../prediction/granular-analysis.ts';
import { runLimitPredictionCycle } from '../prediction/limit-prediction.ts';
import { LimitRaiseReport } from './limit-raise-report.ts';
import { buildLimitPatternSnapshot, scopeLimitPatternSnapshot } from './limit-patterns.ts';

const DEFAULT_LOOKBACK_HOURS = 24;
const MAX_LOOKBACK_HOURS = 24 * 30;

function json(data: object, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function parseLookbackHours(raw: string | null): number {
  if (raw == null || raw.trim() === '') return DEFAULT_LOOKBACK_HOURS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('hours must be a positive number');
  }
  return Math.min(MAX_LOOKBACK_HOURS, parsed);
}

export function handleLimitRaiseAgentRequest(request: Request, db: Database): Response {
  const url = new URL(request.url);
  const rawNodeId = url.searchParams.get('node_id') ?? url.searchParams.get('nodeId');
  if (!rawNodeId) {
    return json(
      {
        error: 'node_id is required',
        example: '/api/agents/v1/limits/raises?node_id=partner-42&hours=24',
      },
      400
    );
  }

  let nodeId;
  let hours;
  try {
    nodeId = parseTreeNodeId(rawNodeId);
    hours = parseLookbackHours(url.searchParams.get('hours'));
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'invalid query parameters' },
      400
    );
  }

  const sinceTimestamp = Math.floor(Date.now() / 1000) - Math.round(hours * 3600);
  const repository = new PartnerAnalyticsRepository(db, nodeId);
  const raises = repository.getEnrichedRaisesWithContext(sinceTimestamp);
  const scoreByLimit = new Map(raises.map(raise => [raise.limit_id, raise]));
  const patterns = scopeLimitPatternSnapshot(
    buildLimitPatternSnapshot(
      db,
      queryRecentLimitChanges(db, hours).map(change => {
        const scored = scoreByLimit.get(change.limit_id);
        return {
          ...change,
          node_id: parseTreeNodeId(change.node_id),
          multi_factor_score: scored?.multi_factor_score,
          context_proof_valid: scored?.context_proof?.valid ?? null,
        };
      }),
      hours
    ),
    nodeId
  );
  const body = {
    schemaVersion: 1,
    node_id: nodeId,
    lookback_hours: hours,
    since_timestamp: sinceTimestamp,
    raises,
    patterns,
  };
  const proof = buildReportProofFromValue(body);

  return json({
    ...body,
    proof,
    integrity: proofScoreHints(proof),
  });
}

/** POST /api/agents/v1/limits/record — record a current limit snapshot. */
export function handleLimitRecordRequest(request: Request, db: Database): Response {
  if (request.method !== 'POST') {
    return json({ error: 'POST required' }, 405);
  }
  try {
    const body = request.body ? JSON.parse(request.body as any) : {};
    const { node_id, sportsbook, sport_id, market_id, bet_type, max_wager } = body;
    if (!node_id || !sportsbook || !sport_id || !market_id || !bet_type || max_wager == null) {
      return json(
        {
          error:
            'Missing required fields: node_id, sportsbook, sport_id, market_id, bet_type, max_wager',
        },
        400
      );
    }
    const nodeId = parseTreeNodeId(node_id);
    if (!['pregame', 'live', 'straight'].includes(bet_type)) {
      return json({ error: 'bet_type must be pregame, live, or straight' }, 400);
    }
    const repo = new AccountLimitsRepository(db);
    const raise = repo.recordLimitWithAlert({
      node_id: nodeId,
      sportsbook,
      sport_id,
      market_id,
      bet_type,
      max_wager: Number(max_wager),
    });
    // Enqueue outbox alert when raise detected
    if (raise) {
      enqueueLimitRaiseAlert(db, {
        treeNodeId: nodeId,
        sportsbook,
        sportId: sport_id,
        marketId: market_id,
        betType: bet_type,
        previousMax: raise.previous_max,
        newLimit: raise.new_limit,
      });
    }
    return json({ recorded: true, raise_detected: raise != null, raise }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'invalid request' }, 400);
  }
}

/** GET /api/limits/summary — aggregate limit changes across partners.
 *  `?format=table|text` → text/plain Bun.inspect.table via LimitRaiseReport.
 *  default → JSON + proof.
 */
export function handleLimitSummaryRequest(db: Database, request?: Request): Response {
  try {
    const format = request
      ? (new URL(request.url).searchParams.get('format') ?? 'json').toLowerCase()
      : 'json';
    const changes = queryRecentLimitChanges(db, 48);
    const total = changes.length;
    const raises = changes.filter(c => c.direction === 'up').length;
    const downs = changes.filter(c => c.direction === 'down').length;
    const netDelta = changes.reduce((s, c) => s + ((c.new_limit ?? 0) - (c.previous_max ?? 0)), 0);
    const avgScore = changes.reduce((s, c) => s + (c.multi_factor_score ?? 0), 0) / (total || 1);
    const books = new Set(changes.map(c => c.sportsbook)).size;
    const partners = new Set(changes.map(c => c.node_id)).size;

    if (format === 'table' || format === 'text' || format === 'inspect') {
      // Group by node for multi-report text dump
      const byNode = new Map<string, typeof changes>();
      for (const c of changes) {
        const list = byNode.get(c.node_id) ?? [];
        list.push(c);
        byNode.set(c.node_id, list);
      }
      const parts: string[] = [
        `LimitSummary · 48h · total=${total} raises=${raises} decreases=${downs} netΔ=$${netDelta}`,
        `partners=${partners} books=${books} avgScore=${avgScore > 0 ? avgScore.toFixed(3) : '—'}`,
        '',
      ];
      if (byNode.size === 0) {
        parts.push('(no limit changes in window)');
      } else {
        for (const [nodeId, rows] of byNode) {
          const report = new LimitRaiseReport(rows as never[], {
            nodeId,
            hours: 48,
            multi: true,
          });
          parts.push(Bun.inspect(report, { colors: false }), '');
        }
      }
      return new Response(parts.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    const body = {
      schemaVersion: 1,
      generated: new Date().toISOString(),
      total,
      raises,
      decreases: downs,
      netDelta,
      avgScore: avgScore > 0 ? Number(avgScore.toFixed(4)) : null,
      uniqueSportsbooks: books,
      uniquePartners: partners,
      changes,
    };
    const proof = buildReportProofFromValue(body);
    return json({ ...body, proof, integrity: proofScoreHints(proof) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'unknown error' }, 500);
  }
}

/** GET /api/limits/analyze — granular breakdown by book/sport/market + regulatory correlation. */
export function handleLimitAnalyzeRequest(db: Database): Response {
  try {
    const analysis = runGranularAnalysis(db, 48);
    const proof = buildReportProofFromValue(analysis);
    return json({ ...analysis, proof, integrity: proofScoreHints(proof) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'unknown error' }, 500);
  }
}

/** POST /api/limits/predictions — run prediction cycle. */
export function handleLimitPredictCycleRequest(db: Database): Response {
  try {
    const result = runLimitPredictionCycle(db);
    const proof = buildReportProofFromValue(result);
    return json({ ...result, proof, integrity: proofScoreHints(proof) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'unknown error' }, 500);
  }
}

/** GET /api/limits/predictions — latest prediction accuracy. */
export function handleLimitPredictionsRequest(db: Database): Response {
  try {
    const { getPredictionAccuracy } =
      require('../prediction/tester.ts') as typeof import('../prediction/tester.ts');
    const accuracy = getPredictionAccuracy(db, 'limit_raise');
    const lastPredicted =
      accuracy.n > 0
        ? (() => {
            try {
              const row = db
                .query(
                  `SELECT MAX(prediction_date) as d FROM prediction_accuracy WHERE prediction_type = 'limit_raise'`
                )
                .get() as { d: string | null } | null;
              return row?.d ?? null;
            } catch {
              return null;
            }
          })()
        : null;
    const body = { schemaVersion: 1, generated: new Date().toISOString(), accuracy, lastPredicted };
    const proof = buildReportProofFromValue(body);
    return json({ ...body, proof, integrity: proofScoreHints(proof) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'unknown error' }, 500);
  }
}
