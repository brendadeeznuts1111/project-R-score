/**
 * Rule backtest simulator for agent-odds v1.07.
 * Synthetic outcomes only — not historical exchange ticks.
 *
 * @see tools/agent-odds-dashboard-serve.ts
 */
import type { AlertRule } from './edge-engine.ts';
import type { RuleId } from '../types/branded.ts';

export type BacktestRequest = {
  ruleId: RuleId;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  seed?: number;
};

export type BacktestResult = {
  ruleId: RuleId;
  ruleName: string;
  totalBets: number;
  wins: number;
  loss: number;
  winRate: number;
  totalProfit: number;
  roi: number;
  dailyReturns: number[];
  startDate: string;
  endDate: string;
  mock: true;
  avgEdgeUsed: number;
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseDay(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isFinite(t) ? t : null;
}

/**
 * Run a synthetic backtest for a rule over a date range.
 */
export function runBacktest(
  rules: AlertRule[],
  req: BacktestRequest,
): { ok: true; result: BacktestResult } | { ok: false; error: string; status: number } {
  const start = parseDay(req.startDate);
  const end = parseDay(req.endDate);
  if (start == null || end == null) {
    return { ok: false, error: 'startDate and endDate must be YYYY-MM-DD', status: 400 };
  }
  if (end < start) {
    return { ok: false, error: 'endDate must be on or after startDate', status: 400 };
  }

  const rule = rules.find(r => r.id === req.ruleId || String(r.id) === String(req.ruleId));
  if (!rule) {
    return { ok: false, error: 'rule not found', status: 404 };
  }

  const days = Math.max(1, Math.round((end - start) / 86_400_000) + 1);
  const rand = mulberry32(req.seed ?? (start ^ end ^ String(rule.id).length * 9973));

  const edgeMin = rule.edge?.min ?? 0.02;
  // base hit rate from pattern
  let baseHit =
    rule.pattern === 'arbitrage'
      ? 0.72
      : rule.pattern === 'value'
        ? 0.52
        : rule.pattern === 'spike'
          ? 0.48
          : 0.5;
  baseHit = Math.min(0.85, Math.max(0.35, baseHit + edgeMin));

  const betsPerDay = 1 + Math.floor(rand() * 3);
  const totalBets = Math.min(500, days * betsPerDay);
  let wins = 0;
  let totalProfit = 0;
  const stake = 10;
  const dailyReturns: number[] = [];
  const dayCount = Math.min(days, 30);

  for (let d = 0; d < dayCount; d++) {
    let dayPnl = 0;
    const n = Math.max(1, Math.floor(totalBets / dayCount));
    for (let i = 0; i < n; i++) {
      const win = rand() < baseHit;
      if (win) {
        wins += 1;
        const profit = stake * (edgeMin * 2 + rand() * 0.08);
        dayPnl += profit;
        totalProfit += profit;
      } else {
        dayPnl -= stake * (0.4 + rand() * 0.6);
        totalProfit -= stake * (0.4 + rand() * 0.6);
      }
    }
    dailyReturns.push(+dayPnl.toFixed(2));
  }

  // scale wins to totalBets proportionally if day loop truncated
  const simulated = dayCount * Math.max(1, Math.floor(totalBets / dayCount));
  const loss = simulated - wins;
  const winRate = simulated > 0 ? (wins / simulated) * 100 : 0;
  const capital = simulated * stake;
  const roi = capital > 0 ? (totalProfit / capital) * 100 : 0;

  return {
    ok: true,
    result: {
      ruleId: rule.id,
      ruleName: rule.name,
      totalBets: simulated,
      wins,
      loss,
      winRate: +winRate.toFixed(2),
      totalProfit: +totalProfit.toFixed(2),
      roi: +roi.toFixed(2),
      dailyReturns,
      startDate: req.startDate,
      endDate: req.endDate,
      mock: true,
      avgEdgeUsed: +(edgeMin * 100).toFixed(2),
    },
  };
}
