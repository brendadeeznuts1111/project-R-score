// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML.parse
import { joinPath } from '../../path-bun.ts';
import type { Database } from 'bun:sqlite';
import { applyBookmakerTiers } from '../matching/tiers.ts';
import { ensureMatchingSchema } from '../matching/schema.ts';
import { loadOperators } from '../operators.ts';
import { ROOT } from '../paths.ts';
import { openNormalizedDb } from './schema.ts';

const CONFIG_DIR = joinPath(ROOT, 'config/operator-research');

type LeagueToml = {
  leagues?: Array<{
    name: string;
    sport: string;
    country?: string;
    season?: string;
    aliases?: string[];
  }>;
};

type TeamToml = {
  teams?: Array<{
    canonical: string;
    short?: string;
    sport: string;
    league: string;
    aliases?: string[];
    country?: string;
  }>;
};

type MarketToml = {
  market_types?: Array<{
    code: string;
    label?: string;
    sport?: string;
    format?: string;
    keywords?: string[];
  }>;
};

async function parseTomlFile<T>(path: string): Promise<T> {
  const text = await Bun.file(path).text();
  return Bun.TOML.parse(text) as T;
}

export async function seedLeagues(db?: Database): Promise<number> {
  const database = db ?? (await openNormalizedDb());
  const cfg = await parseTomlFile<LeagueToml>(joinPath(CONFIG_DIR, 'leagues.toml'));
  const upsert = database.query(`
    INSERT INTO leagues (name, sport, country, season, aliases)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      sport = excluded.sport,
      country = excluded.country,
      season = excluded.season,
      aliases = excluded.aliases
  `);
  let n = 0;
  for (const league of cfg.leagues ?? []) {
    upsert.run(
      league.name,
      league.sport,
      league.country ?? null,
      league.season ?? null,
      JSON.stringify(league.aliases ?? [])
    );
    n++;
  }
  return n;
}

export async function seedTeams(db?: Database): Promise<number> {
  const database = db ?? (await openNormalizedDb());
  await seedLeagues(database);
  const cfg = await parseTomlFile<TeamToml>(joinPath(CONFIG_DIR, 'teams.toml'));
  const leagueLookup = database.query(`SELECT id FROM leagues WHERE name = ?`);
  const upsert = database.query(`
    INSERT INTO teams (name, short_name, sport, league_id, aliases, country)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(name, sport) DO UPDATE SET
      short_name = excluded.short_name,
      league_id = excluded.league_id,
      aliases = excluded.aliases,
      country = excluded.country
  `);
  let n = 0;
  for (const team of cfg.teams ?? []) {
    const league = leagueLookup.get(team.league) as { id: number } | null;
    let leagueId = league?.id ?? null;
    if (!leagueId) {
      database
        .query(`INSERT INTO leagues (name, sport) VALUES (?, ?)`)
        .run(team.league, team.sport);
      leagueId = (
        database.query(`SELECT id FROM leagues WHERE name = ?`).get(team.league) as {
          id: number;
        }
      ).id;
    }
    upsert.run(
      team.canonical,
      team.short ?? null,
      team.sport,
      leagueId,
      JSON.stringify(team.aliases ?? []),
      team.country ?? null
    );
    n++;
  }
  return n;
}

export async function seedMarketTypes(db?: Database): Promise<number> {
  const database = db ?? (await openNormalizedDb());
  const cfg = await parseTomlFile<MarketToml>(joinPath(CONFIG_DIR, 'market-types.toml'));
  const upsert = database.query(`
    INSERT INTO market_types (code, label, sport, format, keywords, normalization_rules)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET
      label = excluded.label,
      sport = excluded.sport,
      format = excluded.format,
      keywords = excluded.keywords
  `);
  let n = 0;
  for (const mt of cfg.market_types ?? []) {
    upsert.run(
      mt.code,
      mt.label ?? mt.code,
      mt.sport ?? '*',
      mt.format ?? 'decimal',
      JSON.stringify(mt.keywords ?? []),
      null
    );
    n++;
  }
  // Always ensure unknown exists
  upsert.run('unknown', 'Unknown', '*', 'decimal', JSON.stringify([]), null);
  return n + 1;
}

export async function seedBookmakers(db?: Database): Promise<number> {
  const database = db ?? (await openNormalizedDb());
  const operators = await loadOperators();
  const upsert = database.query(`
    INSERT INTO bookmakers (name, host, active, config)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(name) DO UPDATE SET
      host = excluded.host,
      active = 1,
      config = excluded.config
  `);
  // Also unique on host — handle host conflict separately
  const byHost = database.query(`SELECT id FROM bookmakers WHERE host = ?`);
  let n = 0;
  for (const op of operators) {
    const existing = byHost.get(op.host) as { id: number } | null;
    const config = JSON.stringify({
      id: op.id,
      identity: op.identity,
      markets: op.markets,
      geo: op.geo,
      expectedStack: op.expectedStack,
      url: op.url,
    });
    if (existing) {
      database
        .query(`UPDATE bookmakers SET name = ?, active = 1, config = ? WHERE id = ?`)
        .run(op.name, config, existing.id);
    } else {
      try {
        upsert.run(op.name, op.host, config);
      } catch {
        database
          .query(`UPDATE bookmakers SET host = ?, active = 1, config = ? WHERE name = ?`)
          .run(op.host, config, op.name);
      }
    }
    n++;
  }
  return n;
}

export type SeedReport = {
  leagues: number;
  teams: number;
  marketTypes: number;
  bookmakers: number;
};

export async function seedAll(): Promise<SeedReport> {
  const db = await openNormalizedDb();
  ensureMatchingSchema(db);
  const leagues = await seedLeagues(db);
  const teams = await seedTeams(db);
  const marketTypes = await seedMarketTypes(db);
  const bookmakers = await seedBookmakers(db);
  applyBookmakerTiers(db);
  return { leagues, teams, marketTypes, bookmakers };
}
