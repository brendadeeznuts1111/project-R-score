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
  const body = {
    schemaVersion: 1,
    node_id: nodeId,
    lookback_hours: hours,
    since_timestamp: sinceTimestamp,
    raises,
  };
  const proof = buildReportProofFromValue(body);

  return json({
    ...body,
    proof,
    integrity: proofScoreHints(proof),
  });
}
