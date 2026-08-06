// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
import type { Database } from 'bun:sqlite';
import { openOddsDb } from '../odds/odds-store.ts';
import { ensureNormalizationSchema } from './schema.ts';

export type ResolvedTeam = {
  id: number;
  canonical: string;
  shortName: string | null;
  sport: string | null;
  leagueId: number | null;
};

type TeamRow = {
  id: number;
  name: string;
  short_name: string | null;
  sport: string | null;
  league_id: number | null;
  aliases: string | null;
};

function rowToResolved(row: TeamRow): ResolvedTeam {
  return {
    id: row.id,
    canonical: row.name,
    shortName: row.short_name,
    sport: row.sport,
    leagueId: row.league_id,
  };
}

function aliasesInclude(aliasesJson: string | null, needle: string): boolean {
  if (!aliasesJson) return false;
  try {
    const arr = JSON.parse(aliasesJson) as unknown;
    if (!Array.isArray(arr)) return false;
    const n = needle.toLowerCase();
    return arr.some(a => typeof a === 'string' && a.toLowerCase() === n);
  } catch {
    return false;
  }
}

/**
 * Resolve a free-text team/label to a canonical team row.
 * Matches: exact name, short_name, then aliases JSON.
 */
export function resolveTeam(
  name: string,
  sport?: string,
  db: Database = openOddsDb()
): ResolvedTeam | null {
  ensureNormalizationSchema(db);
  const q = name.trim();
  if (!q) return null;

  const exact = sport
    ? (db
        .query(
          `SELECT id, name, short_name, sport, league_id, aliases FROM teams
           WHERE (name = ? COLLATE NOCASE OR short_name = ? COLLATE NOCASE) AND sport = ?
           LIMIT 1`
        )
        .get(q, q, sport) as TeamRow | null)
    : (db
        .query(
          `SELECT id, name, short_name, sport, league_id, aliases FROM teams
           WHERE name = ? COLLATE NOCASE OR short_name = ? COLLATE NOCASE
           LIMIT 1`
        )
        .get(q, q) as TeamRow | null);
  if (exact) return rowToResolved(exact);

  const candidates = (
    sport
      ? (db
          .query(
            `SELECT id, name, short_name, sport, league_id, aliases FROM teams
             WHERE sport = ? AND aliases IS NOT NULL`
          )
          .all(sport) as TeamRow[])
      : (db
          .query(
            `SELECT id, name, short_name, sport, league_id, aliases FROM teams
             WHERE aliases IS NOT NULL`
          )
          .all() as TeamRow[])
  ).filter(r => aliasesInclude(r.aliases, q));

  if (candidates.length === 1) return rowToResolved(candidates[0]!);
  // Prefer exact short-name length match when ambiguous
  const shortHit = candidates.find(c => (c.short_name ?? '').toLowerCase() === q.toLowerCase());
  return shortHit ? rowToResolved(shortHit) : candidates[0] ? rowToResolved(candidates[0]) : null;
}

export function resolveLeague(
  name: string,
  db: Database = openOddsDb()
): { id: number; name: string; sport: string } | null {
  ensureNormalizationSchema(db);
  const q = name.trim();
  const exact = db
    .query(`SELECT id, name, sport, aliases FROM leagues WHERE name = ? COLLATE NOCASE`)
    .get(q) as { id: number; name: string; sport: string; aliases: string | null } | null;
  if (exact) return { id: exact.id, name: exact.name, sport: exact.sport };

  const all = db.query(`SELECT id, name, sport, aliases FROM leagues`).all() as {
    id: number;
    name: string;
    sport: string;
    aliases: string | null;
  }[];
  for (const row of all) {
    if (aliasesInclude(row.aliases, q)) {
      return { id: row.id, name: row.name, sport: row.sport };
    }
  }
  return null;
}

const MARKET_TAIL =
  /\s+(?:moneyline|ml|spread|total|totals|ou|over\/under|asian(?:\s+handicap)?|ah|handicap|run line|puck line)\b.*$/i;

/** Parse "NYY vs BOS Moneyline" / "mlb-nyy-bos-ml" into home/away tokens. */
export function parseMatchupTokens(
  marketName: string,
  marketId?: string // brand-ok — opaque research/wire id
): {
  home?: string;
  away?: string;
  leagueHint?: string;
} {
  // Prefer structured market ids (mlb-nyy-bos-ml) — unambiguous short codes.
  if (marketId) {
    const parts = marketId.toLowerCase().split('-').filter(Boolean);
    const suffixes = new Set(['ml', 'total', 'spread', 'ah', 'ou', 'h2h']);
    const core = parts.filter((p, i) => !(i === parts.length - 1 && suffixes.has(p)));
    if (core.length >= 3) {
      return {
        leagueHint: core[0],
        home: core[1]?.toUpperCase(),
        away: core[2]?.toUpperCase(),
      };
    }
  }

  const stripped = marketName.replace(MARKET_TAIL, '').trim();
  const vs = stripped.match(/^([A-Za-z0-9 .'-]+?)\s+vs\.?\s+([A-Za-z0-9 .'-]+)$/i);
  if (vs) {
    return { home: vs[1]!.trim(), away: vs[2]!.trim() };
  }
  return {};
}
