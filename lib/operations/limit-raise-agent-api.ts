// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
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
import { getPredictionAccuracy } from '../prediction/tester.ts';
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

function tableResponse(text: string, status = 200): Response {
  return new Response(text, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function wantsTableFormat(request: Request): boolean {
  const format = (new URL(request.url).searchParams.get('format') ?? 'json').toLowerCase();
  return format === 'table' || format === 'text' || format === 'inspect';
}

export function handleLimitRaiseAgentRequest(request: Request, db: Database): Response {
  const url = new URL(request.url);
  const rawNodeId = url.searchParams.get('node_id') ?? url.searchParams.get('nodeId');
  if (!rawNodeId) {
    return json(
      {
        error: 'node_id is required',
        example: '/api/agents/v1/limits/raises?node_id=partner-42&hours=24',
        links: {
          summary: '/api/limits/summary',
          portal: '/portal/limits/',
          tenant: 'docs/harness/tenants/partner-limits.md',
        },
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

  try {
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

    if (wantsTableFormat(request)) {
      const report = new LimitRaiseReport(raises as never[], {
        nodeId,
        hours,
        multi: true,
      });
      const header = `LimitRaises · node=${nodeId} · ${hours}h · raises=${raises.length}\n\n`;
      const body =
        raises.length === 0
          ? `${header}(no raises in window — try bun run ops:limits:demo)\n`
          : `${header}${Bun.inspect(report, { colors: false })}\n`;
      return tableResponse(body);
    }

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
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'limit raise query failed',
        hint: 'ensure operations.db schema via ops:limits:demo or ops:snapshot',
      },
      500
    );
  }
}

/** POST /api/agents/v1/limits/record — record a current limit snapshot. */
export async function handleLimitRecordRequest(request: Request, db: Database): Promise<Response> {
  if (request.method !== 'POST') {
    return json(
      {
        error: 'POST required',
        example: {
          node_id: 'partner-42',
          sportsbook: 'draftkings',
          sport_id: 'nba',
          market_id: 'totals',
          bet_type: 'straight',
          max_wager: 1500,
        },
      },
      405
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }

  try {
    const node_id = body.node_id;
    const sportsbook = body.sportsbook;
    const sport_id = body.sport_id;
    const market_id = body.market_id;
    const bet_type = body.bet_type;
    const max_wager = body.max_wager;

    if (
      typeof node_id !== 'string' ||
      typeof sportsbook !== 'string' ||
      typeof sport_id !== 'string' ||
      typeof market_id !== 'string' ||
      typeof bet_type !== 'string' ||
      max_wager == null
    ) {
      return json(
        {
          error:
            'Missing required fields: node_id, sportsbook, sport_id, market_id, bet_type, max_wager',
        },
        400
      );
    }

    const wager = Number(max_wager);
    if (!Number.isFinite(wager) || wager < 0) {
      return json({ error: 'max_wager must be a finite number ≥ 0' }, 400);
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
      bet_type: bet_type as 'pregame' | 'live' | 'straight',
      max_wager: wager,
    });

    if (raise) {
      try {
        const partner_code = typeof body.partner_code === 'string' ? body.partner_code : undefined;
        const package_group_chat_id =
          typeof body.package_group_chat_id === 'string' ? body.package_group_chat_id : undefined;
        let telegram_id = typeof body.telegram_id === 'string' ? body.telegram_id : undefined;
        if (!telegram_id) {
          try {
            const row = db
              .query(`SELECT telegram_id FROM tree_nodes WHERE id = ? LIMIT 1`)
              .get(nodeId) as { telegram_id: string | null } | null; // brand-ok — Telegram chat wire
            if (row?.telegram_id?.trim()) telegram_id = row.telegram_id.trim();
          } catch {
            /* tree_nodes optional */
          }
        }
        enqueueLimitRaiseAlert(db, {
          treeNodeId: nodeId,
          sportsbook,
          sportId: sport_id,
          marketId: market_id,
          betType: bet_type,
          previousMax: raise.previous_max,
          newLimit: raise.new_limit,
          telegramId: telegram_id,
          partnerCode: partner_code,
          packageGroupChatId: package_group_chat_id,
        });
      } catch {
        // outbox optional — record still succeeded
      }
    }

    return json({ recorded: true, raise_detected: raise != null, raise }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'invalid request';
    const isValidation =
      /invalid|required|must be|brand|TreeNodeId|parse/i.test(message) ||
      message.includes('node_id');
    return json({ error: message }, isValidation ? 400 : 500);
  }
}

/** GET /api/limits/summary — aggregate limit changes across partners.
 *  `?format=table|text|inspect` → text/plain Bun.inspect.table via LimitRaiseReport.
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
        parts.push('hint: bun run ops:limits:demo · bun tools/seed-limit-patterns.ts (force+bake)');
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
      return tableResponse(parts.join('\n'));
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
      links: {
        portal: '/portal/limits/',
        registry: '/registry/limit-raises.json',
        tenant: 'docs/harness/tenants/partner-limits.md',
      },
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
    const accuracy = getPredictionAccuracy(db, 'limit_raise');
    let lastPredicted: string | null = null;
    if (accuracy.n > 0) {
      try {
        const row = db
          .query(
            `SELECT MAX(prediction_date) as d FROM prediction_accuracy WHERE prediction_type = 'limit_raise'`
          )
          .get() as { d: string | null } | null;
        lastPredicted = row?.d ?? null;
      } catch {
        lastPredicted = null;
      }
    }
    const body = {
      schemaVersion: 1,
      generated: new Date().toISOString(),
      accuracy,
      lastPredicted,
      links: {
        portal: '/portal/limits/',
        predictCli: 'bun run ops:limits:predict',
      },
    };
    const proof = buildReportProofFromValue(body);
    return json({ ...body, proof, integrity: proofScoreHints(proof) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'unknown error' }, 500);
  }
}
