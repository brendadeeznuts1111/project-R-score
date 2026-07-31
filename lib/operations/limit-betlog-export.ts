// @see https://bun.com/docs/runtime/file-io — Bun.file
/**
 * Account-scoped limit pattern / "betlog" export helpers.
 *
 * Betlog here is the multi-factor limit-change pattern log for one tree node
 * (raises + influence factors + evidence) — not Soft ticker wager rows.
 * Used by agent API + Pages snapshot handlers (`format=csv|jsonl`).
 */

export type BetlogRaiseRow = {
  node_id?: string; // brand-ok — tree node wire
  sportsbook?: string;
  sport_id?: string; // brand-ok — snapshot / DB wire sport key (no SportId brand)
  market_id?: string; // brand-ok — snapshot / DB wire market key (no MarketId brand)
  bet_type?: string;
  direction?: string;
  previous_max?: number | null;
  new_limit?: number | null;
  increased_at?: number | null;
  multi_factor_score?: number | null;
  top_contributing_factors?: string[] | null;
  context_proof?: { valid?: boolean | null } | null;
  context_available?: boolean | null;
  message?: string | null;
  [key: string]: unknown;
};

const CSV_HEADERS = [
  'node_id',
  'direction',
  'sportsbook',
  'sport_id',
  'market_id',
  'bet_type',
  'previous_max',
  'new_limit',
  'delta',
  'influence_score',
  'top_factors',
  'proof_valid',
  'increased_at',
  'message',
] as const;

function csvCell(value: string | number | boolean): string {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function rowDelta(row: BetlogRaiseRow): number | '' {
  if (row.previous_max == null || row.new_limit == null) return '';
  return Number(row.new_limit) - Number(row.previous_max);
}

function isoFromUnix(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(Number(seconds))) return '';
  return new Date(Number(seconds) * 1000).toISOString();
}

/** Flat pattern row for CSV / JSONL downloads. */
export function flattenBetlogRaise(row: BetlogRaiseRow): Record<string, string | number | boolean> {
  const factors = Array.isArray(row.top_contributing_factors)
    ? row.top_contributing_factors.join('|')
    : '';
  return {
    node_id: String(row.node_id ?? ''),
    direction: String(row.direction ?? ''),
    sportsbook: String(row.sportsbook ?? ''),
    sport_id: String(row.sport_id ?? ''),
    market_id: String(row.market_id ?? ''),
    bet_type: String(row.bet_type ?? ''),
    previous_max: row.previous_max ?? '',
    new_limit: row.new_limit ?? '',
    delta: rowDelta(row),
    influence_score: row.multi_factor_score ?? '',
    top_factors: factors,
    proof_valid: row.context_proof?.valid === true,
    increased_at: isoFromUnix(row.increased_at),
    message: String(row.message ?? ''),
  };
}

export function raisesToCsv(rows: readonly BetlogRaiseRow[]): string {
  const lines = [CSV_HEADERS.join(',')];
  for (const row of rows) {
    const flat = flattenBetlogRaise(row);
    lines.push(CSV_HEADERS.map(key => csvCell(flat[key])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

/** One JSON object per line (JSONL / NDJSON). */
export function raisesToJsonl(rows: readonly BetlogRaiseRow[]): string {
  if (rows.length === 0) return '';
  return `${rows.map(row => JSON.stringify(flattenBetlogRaise(row))).join('\n')}\n`;
}

export function betlogFilename(
  nodeId: string, // brand-ok — account / tree node
  format: 'csv' | 'jsonl'
): string {
  const safe = String(nodeId || 'account')
    .replaceAll(/[^A-Za-z0-9._-]+/g, '_')
    .slice(0, 64);
  const day = new Date().toISOString().slice(0, 10);
  return `betlog-${safe}-${day}.${format}`;
}

export function betlogDownloadResponse(
  rows: readonly BetlogRaiseRow[],
  nodeId: string, // brand-ok
  format: 'csv' | 'jsonl',
  cacheControl = 'no-store'
): Response {
  const body = format === 'csv' ? raisesToCsv(rows) : raisesToJsonl(rows);
  const filename = betlogFilename(nodeId, format);
  const contentType =
    format === 'csv' ? 'text/csv; charset=utf-8' : 'application/x-ndjson; charset=utf-8';
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Betlog-Rows': String(rows.length),
      'X-Betlog-Node': nodeId,
    },
  });
}
