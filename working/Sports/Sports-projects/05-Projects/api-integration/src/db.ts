// API Integration - SQLite Database
//
// Persists game events and odds history
// Uses bun:sqlite for zero-dependency storage

import { Database } from "bun:sqlite";
import type { GameEvent, OddsData } from "./types";

let db: Database | null = null;

export function initDB(path: string = "data/api-integration.db"): Database {
  // Ensure directory exists
  const dir = path.substring(0, path.lastIndexOf("/"));
  if (dir && !path.startsWith(":")) {
    try {
      require("fs").mkdirSync(dir, { recursive: true });
    } catch {}
  }

  db = new Database(path);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      sport TEXT NOT NULL,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      status TEXT NOT NULL,
      home_score INTEGER,
      away_score INTEGER,
      timestamp INTEGER NOT NULL,
      created_at INTEGER DEFAULT (unixepoch() * 1000),
      updated_at INTEGER DEFAULT (unixepoch() * 1000)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS game_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      status TEXT NOT NULL,
      home_score INTEGER,
      away_score INTEGER,
      timestamp INTEGER NOT NULL,
      recorded_at INTEGER DEFAULT (unixepoch() * 1000),
      FOREIGN KEY (game_id) REFERENCES games(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS odds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      market TEXT NOT NULL,
      home_odds INTEGER NOT NULL,
      away_odds INTEGER NOT NULL,
      spread REAL,
      over_under REAL,
      timestamp INTEGER NOT NULL,
      recorded_at INTEGER DEFAULT (unixepoch() * 1000),
      FOREIGN KEY (game_id) REFERENCES games(id)
    )
  `);

  // Create indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_games_sport ON games(sport)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_games_status ON games(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_game_history_game_id ON game_history(game_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_odds_game_id ON odds(game_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_odds_timestamp ON odds(timestamp)`);

  return db;
}

export function getDB(): Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDB() first.");
  }
  return db;
}

export function closeDB(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Game operations
export function saveGame(game: GameEvent): void {
  const db = getDB();

  const existing = db.query("SELECT id FROM games WHERE id = ?").get(game.id);

  if (existing) {
    db.run(
      `UPDATE games SET
        status = ?, home_score = ?, away_score = ?,
        timestamp = ?, updated_at = ?
       WHERE id = ?`,
      [
        game.status,
        game.score?.[0] ?? null,
        game.score?.[1] ?? null,
        game.timestamp,
        Date.now(),
        game.id,
      ]
    );
  } else {
    db.run(
      `INSERT INTO games (id, sport, home_team, away_team, status, home_score, away_score, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        game.id,
        game.sport,
        game.teams[0],
        game.teams[1],
        game.status,
        game.score?.[0] ?? null,
        game.score?.[1] ?? null,
        game.timestamp,
      ]
    );
  }

  // Record history
  db.run(
    `INSERT INTO game_history (game_id, status, home_score, away_score, timestamp)
     VALUES (?, ?, ?, ?, ?)`,
    [
      game.id,
      game.status,
      game.score?.[0] ?? null,
      game.score?.[1] ?? null,
      game.timestamp,
    ]
  );
}

export function getGame(id: string): GameEvent | null {
  const row = getDB()
    .query(
      `SELECT id, sport, home_team, away_team, status, home_score, away_score, timestamp
       FROM games WHERE id = ?`
    )
    .get(id) as {
    id: string;
    sport: string;
    home_team: string;
    away_team: string;
    status: string;
    home_score: number | null;
    away_score: number | null;
    timestamp: number;
  } | null;

  if (!row) return null;

  return {
    id: row.id,
    sport: row.sport,
    teams: [row.home_team, row.away_team],
    status: row.status as GameEvent["status"],
    score: row.home_score !== null ? [row.home_score, row.away_score!] : undefined,
    timestamp: row.timestamp,
  };
}

export function getAllGames(filters?: {
  sport?: string;
  status?: string;
  limit?: number;
}): GameEvent[] {
  let query = `SELECT id, sport, home_team, away_team, status, home_score, away_score, timestamp
               FROM games WHERE 1=1`;
  const params: (string | number)[] = [];

  if (filters?.sport) {
    query += " AND sport = ?";
    params.push(filters.sport);
  }
  if (filters?.status) {
    query += " AND status = ?";
    params.push(filters.status);
  }

  query += " ORDER BY timestamp DESC";

  if (filters?.limit) {
    query += " LIMIT ?";
    params.push(filters.limit);
  }

  const rows = getDB().query(query).all(...params) as Array<{
    id: string;
    sport: string;
    home_team: string;
    away_team: string;
    status: string;
    home_score: number | null;
    away_score: number | null;
    timestamp: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    sport: row.sport,
    teams: [row.home_team, row.away_team] as [string, string],
    status: row.status as GameEvent["status"],
    score: row.home_score !== null ? [row.home_score, row.away_score!] : undefined,
    timestamp: row.timestamp,
  }));
}

export function getGameHistory(
  gameId: string,
  limit: number = 100
): Array<{ status: string; score: [number, number] | null; timestamp: number }> {
  const rows = getDB()
    .query(
      `SELECT status, home_score, away_score, timestamp
       FROM game_history
       WHERE game_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`
    )
    .all(gameId, limit) as Array<{
    status: string;
    home_score: number | null;
    away_score: number | null;
    timestamp: number;
  }>;

  return rows.map((row) => ({
    status: row.status,
    score: row.home_score !== null ? [row.home_score, row.away_score!] : null,
    timestamp: row.timestamp,
  }));
}

// Odds operations
export function saveOdds(odds: OddsData): void {
  getDB().run(
    `INSERT INTO odds (game_id, market, home_odds, away_odds, spread, over_under, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      odds.gameId,
      odds.market,
      odds.homeOdds,
      odds.awayOdds,
      odds.spread ?? null,
      odds.overUnder ?? null,
      odds.timestamp,
    ]
  );
}

export function getLatestOdds(gameId: string): OddsData | null {
  const row = getDB()
    .query(
      `SELECT game_id, market, home_odds, away_odds, spread, over_under, timestamp
       FROM odds
       WHERE game_id = ?
       ORDER BY timestamp DESC
       LIMIT 1`
    )
    .get(gameId) as {
    game_id: string;
    market: string;
    home_odds: number;
    away_odds: number;
    spread: number | null;
    over_under: number | null;
    timestamp: number;
  } | null;

  if (!row) return null;

  return {
    gameId: row.game_id,
    market: row.market,
    homeOdds: row.home_odds,
    awayOdds: row.away_odds,
    spread: row.spread ?? undefined,
    overUnder: row.over_under ?? undefined,
    timestamp: row.timestamp,
  };
}

export function getOddsHistory(
  gameId: string,
  limit: number = 100
): OddsData[] {
  const rows = getDB()
    .query(
      `SELECT game_id, market, home_odds, away_odds, spread, over_under, timestamp
       FROM odds
       WHERE game_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`
    )
    .all(gameId, limit) as Array<{
    game_id: string;
    market: string;
    home_odds: number;
    away_odds: number;
    spread: number | null;
    over_under: number | null;
    timestamp: number;
  }>;

  return rows.map((row) => ({
    gameId: row.game_id,
    market: row.market,
    homeOdds: row.home_odds,
    awayOdds: row.away_odds,
    spread: row.spread ?? undefined,
    overUnder: row.over_under ?? undefined,
    timestamp: row.timestamp,
  }));
}

// Stats
export function getStats(): {
  totalGames: number;
  liveGames: number;
  totalOddsRecords: number;
  totalHistoryRecords: number;
} {
  const db = getDB();

  const totalGames = (db.query("SELECT COUNT(*) as count FROM games").get() as { count: number }).count;
  const liveGames = (db.query("SELECT COUNT(*) as count FROM games WHERE status = 'live'").get() as { count: number }).count;
  const totalOddsRecords = (db.query("SELECT COUNT(*) as count FROM odds").get() as { count: number }).count;
  const totalHistoryRecords = (db.query("SELECT COUNT(*) as count FROM game_history").get() as { count: number }).count;

  return { totalGames, liveGames, totalOddsRecords, totalHistoryRecords };
}

// Cleanup old data
export function cleanupOldData(daysToKeep: number = 7): { deleted: number } {
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const db = getDB();

  const result1 = db.run("DELETE FROM odds WHERE timestamp < ?", [cutoff]);
  const result2 = db.run("DELETE FROM game_history WHERE timestamp < ?", [cutoff]);

  return { deleted: (result1.changes || 0) + (result2.changes || 0) };
}
