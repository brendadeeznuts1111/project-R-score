// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
import type { Database } from 'bun:sqlite';
import { openOddsDb } from '../odds/odds-store.ts';
import { ensureNormalizationSchema } from './schema.ts';

const DEFAULT_KEYWORDS: Record<string, string[]> = {
  moneyline: ['moneyline', 'ml', 'win', 'match winner', 'h2h'],
  spread: ['spread', 'point spread', 'handicap', 'puck line', 'run line'],
  total: ['total', 'over/under', 'ou', 'over under', 'totals'],
  asian_handicap: ['asian handicap', 'ah', 'asian'],
  team_total: ['team total', 'team over/under', 'team ou'],
};

export function classifyMarket(marketName: string, keywords = DEFAULT_KEYWORDS): string {
  const lower = marketName.toLowerCase();
  // Prefer longer / more specific codes first
  const order = ['asian_handicap', 'team_total', 'moneyline', 'spread', 'total'];
  for (const code of order) {
    const kws = keywords[code] ?? [];
    if (kws.some(kw => lower.includes(kw))) return code;
  }
  for (const [code, kws] of Object.entries(keywords)) {
    if (order.includes(code)) continue;
    if (kws.some(kw => lower.includes(kw))) return code;
  }
  return 'unknown';
}

export function getMarketTypeId(code: string, db: Database = openOddsDb()): number | null {
  ensureNormalizationSchema(db);
  const row = db.query(`SELECT id FROM market_types WHERE code = ?`).get(code) as {
    id: number;
  } | null;
  return row?.id ?? null;
}

/** Load keyword map from DB (seeded market_types.keywords JSON). */
export function loadMarketKeywords(db: Database = openOddsDb()): Record<string, string[]> {
  ensureNormalizationSchema(db);
  const rows = db.query(`SELECT code, keywords FROM market_types`).all() as {
    code: string;
    keywords: string | null;
  }[];
  const out: Record<string, string[]> = { ...DEFAULT_KEYWORDS };
  for (const row of rows) {
    if (!row.keywords) continue;
    try {
      const parsed = JSON.parse(row.keywords) as unknown;
      if (Array.isArray(parsed)) {
        out[row.code] = parsed.filter((x): x is string => typeof x === 'string');
      }
    } catch {
      /* keep default */
    }
  }
  return out;
}

export function classifyMarketWithDb(marketName: string, db: Database = openOddsDb()): string {
  return classifyMarket(marketName, loadMarketKeywords(db));
}
