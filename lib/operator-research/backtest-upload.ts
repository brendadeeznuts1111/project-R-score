// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
import type { RuleId } from '../types/branded.ts';

export const BACKTEST_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const BACKTEST_UPLOAD_MAX_ROWS = 50_000;

const REQUIRED_COLUMNS = ['timestamp', 'rule_id', 'edge_pct', 'outcome', 'odds_decimal'] as const;
const OUTCOMES = new Set(['win', 'loss', 'push']);
const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const EDGE_NUMBER = /^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/;
const MONEY_NUMBER = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

export type CsvParseResult = { ok: true; rows: string[][] } | { ok: false; error: string };

export type BacktestWarning = {
  code: 'ROW_REJECTED';
  message: string;
  row: number;
};

export type BacktestCsvResult = {
  analysisType: 'settled-outcomes';
  source: 'uploaded-csv';
  mock: false;
  ruleId: RuleId;
  ruleName: string;
  inputSha256: string;
  stakeMode: 'actual' | 'unit' | 'mixed';
  acceptedRows: number;
  rejectedRows: number;
  totalBets: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  totalStake: number;
  totalProfit: number;
  roiPct: number;
  avgEdgePct: number;
  maxDrawdown: number;
  startTimestamp: string;
  endTimestamp: string;
  dailyReturnDates: string[];
  dailyReturns: number[];
  warnings: BacktestWarning[];
};

export type BacktestCsvAnalysis =
  | { ok: true; result: BacktestCsvResult }
  | { ok: false; status: number; error: string; warnings?: BacktestWarning[] };

type AcceptedRow = {
  timestamp: number;
  edgeMilliPct: number;
  outcome: 'win' | 'loss' | 'push';
  oddsDecimal: number;
  stakeCents: number;
  hasExplicitStake: boolean;
};

/** RFC 4180-compatible parser with quoted fields, escaped quotes, and CRLF support. */
export function parseCsv(text: string, maxRows = BACKTEST_UPLOAD_MAX_ROWS + 1): CsvParseResult {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let justClosedQuote = false;

  const finishRow = () => {
    row.push(field);
    field = '';
    justClosedQuote = false;
    if (row.some(value => value.trim() !== '')) rows.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          justClosedQuote = true;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (justClosedQuote && char !== ',' && char !== '\n' && char !== '\r') {
      return { ok: false, error: 'Unexpected text after closing quote' };
    }
    if (char === '"') {
      if (field.length > 0) return { ok: false, error: 'Unexpected quote in unquoted field' };
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
      justClosedQuote = false;
    } else if (char === '\n') {
      finishRow();
      if (rows.length > maxRows)
        return { ok: false, error: `CSV exceeds ${maxRows - 1} data rows` };
    } else if (char === '\r') {
      if (text[index + 1] !== '\n') {
        finishRow();
        if (rows.length > maxRows) {
          return { ok: false, error: `CSV exceeds ${maxRows - 1} data rows` };
        }
      }
    } else {
      field += char;
    }
  }

  if (inQuotes) return { ok: false, error: 'Unclosed quoted field' };
  if (field.length > 0 || row.length > 0) finishRow();
  if (rows.length > maxRows) return { ok: false, error: `CSV exceeds ${maxRows - 1} data rows` };
  return { ok: true, rows };
}

function fixed(value: number): number {
  return Number(value.toFixed(2));
}

export function fingerprintBacktestCsv(text: string): string {
  return new Bun.CryptoHasher('sha256').update(text).digest('hex');
}

export function analyzeBacktestCsv(
  text: string,
  opts: { ruleId: RuleId; ruleName: string }
): BacktestCsvAnalysis {
  const inputSha256 = fingerprintBacktestCsv(text);
  const parsed = parseCsv(text.replace(/^\uFEFF/, ''));
  if (!parsed.ok) return { ok: false, status: 422, error: parsed.error };
  if (parsed.rows.length < 2) {
    return { ok: false, status: 422, error: 'CSV requires a header and at least one data row' };
  }

  const headers = parsed.rows[0].map(header => header.trim().toLowerCase());
  if (new Set(headers).size !== headers.length) {
    return { ok: false, status: 422, error: 'CSV contains duplicate column names' };
  }
  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
  const missing = REQUIRED_COLUMNS.filter(column => indexes[column] == null);
  if (missing.length) {
    return { ok: false, status: 422, error: `Missing required columns: ${missing.join(', ')}` };
  }

  const warnings: BacktestWarning[] = [];
  const accepted: AcceptedRow[] = [];
  let explicitStakes = 0;

  for (let rowIndex = 1; rowIndex < parsed.rows.length; rowIndex += 1) {
    const row = parsed.rows[rowIndex];
    const line = rowIndex + 1;
    const rowErrors: string[] = [];
    if (row.length !== headers.length)
      rowErrors.push(`expected ${headers.length} columns, received ${row.length}`);
    const timestampRaw = row[indexes.timestamp]?.trim() ?? '';
    const timestamp = Date.parse(timestampRaw);
    const ruleId = (row[indexes.rule_id] ?? '').trim();
    const edgeRaw = (row[indexes.edge_pct] ?? '').trim();
    const edgePct = Number(edgeRaw);
    const outcome = (row[indexes.outcome] ?? '').trim().toLowerCase();
    const oddsRaw = (row[indexes.odds_decimal] ?? '').trim();
    const oddsDecimal = Number(oddsRaw);
    const stakeRaw = indexes.stake == null ? '' : (row[indexes.stake] ?? '').trim();
    const stake = stakeRaw === '' ? 1 : Number(stakeRaw);
    if (
      !UTC_TIMESTAMP.test(timestampRaw) ||
      !Number.isFinite(timestamp) ||
      new Date(timestamp).toISOString() !== timestampRaw
    ) {
      rowErrors.push('timestamp must be a valid UTC RFC3339 value with milliseconds');
    }
    if (ruleId !== String(opts.ruleId)) rowErrors.push(`rule_id must equal ${String(opts.ruleId)}`);
    if (!EDGE_NUMBER.test(edgeRaw) || !Number.isFinite(edgePct) || edgePct < 0 || edgePct > 100) {
      rowErrors.push('edge_pct must have at most 3 decimals and be between 0 and 100');
    }
    if (!OUTCOMES.has(outcome)) rowErrors.push('outcome must be win, loss, or push');
    if (!Number.isFinite(oddsDecimal) || oddsDecimal <= 1 || oddsDecimal > 1_000) {
      rowErrors.push('odds_decimal must be greater than 1 and at most 1000');
    }
    if (
      (stakeRaw !== '' && !MONEY_NUMBER.test(stakeRaw)) ||
      !Number.isFinite(stake) ||
      stake <= 0 ||
      stake > 1_000_000
    ) {
      rowErrors.push(
        'stake must have at most 2 decimals and be greater than 0 and at most 1000000'
      );
    }
    if (rowErrors.length) {
      if (warnings.length < 20) {
        warnings.push({ code: 'ROW_REJECTED', message: rowErrors.join('; '), row: line });
      }
      continue;
    }

    accepted.push({
      timestamp,
      edgeMilliPct: Math.round(edgePct * 1_000),
      outcome: outcome as AcceptedRow['outcome'],
      oddsDecimal,
      stakeCents: Math.round(stake * 100),
      hasExplicitStake: stakeRaw !== '',
    });
  }

  explicitStakes = accepted.filter(row => row.hasExplicitStake).length;

  const rejectedRows = parsed.rows.length - 1 - accepted.length;
  if (accepted.length === 0) {
    return {
      ok: false,
      status: 422,
      error: 'CSV contains no valid backtest rows',
      warnings,
    };
  }

  accepted.sort((a, b) => a.timestamp - b.timestamp);
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let totalStakeCents = 0;
  let totalProfitCents = 0;
  let edgeMilliTotal = 0;
  let peakProfitCents = 0;
  let maxDrawdownCents = 0;
  const daily = new Map<string, number>();
  for (const row of accepted) {
    const profitCents =
      row.outcome === 'win'
        ? Math.round(row.stakeCents * (row.oddsDecimal - 1))
        : row.outcome === 'loss'
          ? -row.stakeCents
          : 0;
    if (row.outcome === 'win') wins += 1;
    else if (row.outcome === 'loss') losses += 1;
    else pushes += 1;
    totalStakeCents += row.stakeCents;
    totalProfitCents += profitCents;
    edgeMilliTotal += row.edgeMilliPct;
    peakProfitCents = Math.max(peakProfitCents, totalProfitCents);
    maxDrawdownCents = Math.max(maxDrawdownCents, peakProfitCents - totalProfitCents);
    const date = new Date(row.timestamp).toISOString().slice(0, 10);
    daily.set(date, (daily.get(date) ?? 0) + profitCents);
  }
  const settled = wins + losses;
  const dailyEntries = [...daily.entries()].sort(([a], [b]) => a.localeCompare(b));
  const stakeMode =
    indexes.stake == null
      ? 'unit'
      : explicitStakes === accepted.length
        ? 'actual'
        : explicitStakes === 0
          ? 'unit'
          : 'mixed';
  return {
    ok: true,
    result: {
      analysisType: 'settled-outcomes',
      source: 'uploaded-csv',
      mock: false,
      ruleId: opts.ruleId,
      ruleName: opts.ruleName,
      inputSha256,
      stakeMode,
      acceptedRows: accepted.length,
      rejectedRows,
      totalBets: accepted.length,
      wins,
      losses,
      pushes,
      winRate: fixed(settled > 0 ? (wins / settled) * 100 : 0),
      totalStake: fixed(totalStakeCents / 100),
      totalProfit: fixed(totalProfitCents / 100),
      roiPct: fixed(totalStakeCents > 0 ? (totalProfitCents / totalStakeCents) * 100 : 0),
      avgEdgePct: fixed(edgeMilliTotal / accepted.length / 1_000),
      maxDrawdown: fixed(maxDrawdownCents / 100),
      startTimestamp: new Date(accepted[0].timestamp).toISOString(),
      endTimestamp: new Date(accepted[accepted.length - 1].timestamp).toISOString(),
      dailyReturnDates: dailyEntries.map(([date]) => date),
      dailyReturns: dailyEntries.map(([, profitCents]) => fixed(profitCents / 100)),
      warnings,
    },
  };
}
