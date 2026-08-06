// @see https://bun.com/docs/guides/http/sse — Bun SSE responses
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
import {
  queryNormalizedOdds,
  queryNormalizedOddsAfter,
  type OddsQueryRow,
} from './normalization/store.ts';

export const ODDS_STREAM_RETRY_MS = 3_000;
export const ODDS_STREAM_POLL_MS = 1_000;
export const ODDS_STREAM_HEARTBEAT_MS = 15_000;

type OddsStreamSource = {
  latest: (opts: { limit: number; session?: 'pregame' | 'live' }) => OddsQueryRow[];
  after: (cursor: number, opts: { limit: number; session?: 'pregame' | 'live' }) => OddsQueryRow[];
};

export type OddsStreamOptions = {
  requestId: string; // brand-ok — opaque request correlation id
  cursor: number;
  limit: number;
  session?: 'pregame' | 'live';
  pollMs?: number;
  heartbeatMs?: number;
  source?: OddsStreamSource;
};

const DEFAULT_SOURCE: OddsStreamSource = {
  latest: opts => queryNormalizedOdds(opts).reverse(),
  after: (cursor, opts) => queryNormalizedOddsAfter(cursor, opts),
};

function serializeOddsRow(row: OddsQueryRow) {
  return {
    id: row.id,
    eventId: row.eventId,
    selection: row.selection,
    oddsDecimal: row.oddsDecimal,
    oddsAmerican: row.oddsAmerican,
    handicap: row.oddsHandicap,
    timestamp: row.timestamp,
    session: row.session,
    market: row.marketCode,
    bookmaker: row.bookmaker,
    host: row.host,
    homeTeam: row.homeTeam,
    awayTeam: row.awayTeam,
    league: row.league,
    sport: row.sport,
    source: row.source,
  };
}

export function oddsStreamResponse(req: Request, opts: OddsStreamOptions): Response {
  const source = opts.source ?? DEFAULT_SOURCE;
  const pollMs = Math.max(10, opts.pollMs ?? ODDS_STREAM_POLL_MS);
  const heartbeatMs = Math.max(pollMs, opts.heartbeatMs ?? ODDS_STREAM_HEARTBEAT_MS);

  return new Response(
    async function* () {
      let cursor = Math.max(0, Math.floor(opts.cursor));
      yield `retry: ${ODDS_STREAM_RETRY_MS}\nevent: connected\ndata: ${JSON.stringify({
        schemaVersion: 1,
        type: 'connected',
        requestId: opts.requestId,
        cursor,
        session: opts.session ?? 'all',
        limit: opts.limit,
        connectedAt: new Date().toISOString(),
      })}\n\n`;

      let initial = cursor === 0;
      let lastWriteAt = Date.now();
      try {
        while (!req.signal.aborted) {
          let rows: OddsQueryRow[];
          const isSnapshot = initial;
          try {
            rows = initial
              ? source.latest({ limit: opts.limit, session: opts.session })
              : source.after(cursor, { limit: opts.limit, session: opts.session });
            initial = false;
          } catch {
            yield `event: stream_error\ndata: ${JSON.stringify({
              schemaVersion: 1,
              type: 'stream_error',
              requestId: opts.requestId,
              at: new Date().toISOString(),
              code: 'ODDS_QUERY_FAILED',
              message: 'Odds stream temporarily unavailable.',
              retryable: true,
            })}\n\n`;
            return;
          }

          if (rows.length) {
            cursor = Math.max(cursor, ...rows.map(row => row.id));
            lastWriteAt = Date.now();
            yield `id: ${cursor}\nevent: ${isSnapshot ? 'snapshot' : 'odds'}\ndata: ${JSON.stringify(
              {
                schemaVersion: 1,
                type: isSnapshot ? 'snapshot' : 'odds',
                requestId: opts.requestId,
                cursor,
                count: rows.length,
                emittedAt: new Date().toISOString(),
                rows: rows.map(serializeOddsRow),
              }
            )}\n\n`;
          } else if (Date.now() - lastWriteAt >= heartbeatMs) {
            lastWriteAt = Date.now();
            yield `: heartbeat ${new Date().toISOString()}\n\n`;
          }

          await Bun.sleep(pollMs);
        }
      } finally {
        // Async-generator cancellation reaches this block when the EventSource disconnects.
      }
    },
    {
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-store, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
        'x-content-type-options': 'nosniff',
        'x-request-id': opts.requestId,
      },
    }
  );
}
