// HFT Freeze Predictor - SQLite Storage
//
// Tables:
// - events: FreezeEvent history
// - predictions: Prediction log
// - config: Threshold settings
//
// Uses: bun:sqlite

import { Database } from "bun:sqlite";
import type { FreezeEvent, Prediction, Config } from "./types";
import { DEFAULT_CONFIG } from "./predictor";

let db: Database;

export function init(dbPath: string = ":memory:"): Database {
  db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      velocity REAL NOT NULL,
      latency REAL NOT NULL,
      sharpe_ratio REAL NOT NULL,
      frozen INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      probability REAL NOT NULL,
      confidence REAL NOT NULL,
      predicted_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      velocity_threshold REAL NOT NULL,
      latency_threshold REAL NOT NULL,
      sharpe_threshold REAL NOT NULL
    );

    INSERT OR IGNORE INTO config (id, velocity_threshold, latency_threshold, sharpe_threshold)
    VALUES (1, ${DEFAULT_CONFIG.velocityThreshold}, ${DEFAULT_CONFIG.latencyThreshold}, ${DEFAULT_CONFIG.sharpeThreshold});
  `);

  return db;
}

export function getDb(): Database {
  if (!db) {
    throw new Error("Database not initialized. Call init() first.");
  }
  return db;
}

export function store(event: FreezeEvent): void {
  const stmt = getDb().prepare(`
    INSERT INTO events (id, timestamp, velocity, latency, sharpe_ratio, frozen)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(event.id, event.timestamp, event.velocity, event.latency, event.sharpeRatio, event.frozen ? 1 : 0);
}

export function storePrediction(prediction: Prediction): void {
  const stmt = getDb().prepare(`
    INSERT INTO predictions (id, event_id, probability, confidence, predicted_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(prediction.id, prediction.eventId, prediction.probability, prediction.confidence, prediction.predictedAt);
}

export function query(since: number): FreezeEvent[] {
  const stmt = getDb().prepare(`
    SELECT id, timestamp, velocity, latency, sharpe_ratio as sharpeRatio, frozen
    FROM events
    WHERE timestamp >= ?
    ORDER BY timestamp DESC
  `);
  const rows = stmt.all(since) as Array<{
    id: string;
    timestamp: number;
    velocity: number;
    latency: number;
    sharpeRatio: number;
    frozen: number;
  }>;

  return rows.map((row) => ({
    ...row,
    frozen: row.frozen === 1,
  }));
}

export function getConfig(): Config {
  const stmt = getDb().prepare(`
    SELECT velocity_threshold, latency_threshold, sharpe_threshold
    FROM config
    WHERE id = 1
  `);
  const row = stmt.get() as {
    velocity_threshold: number;
    latency_threshold: number;
    sharpe_threshold: number;
  } | null;

  if (!row) {
    return DEFAULT_CONFIG;
  }

  return {
    velocityThreshold: row.velocity_threshold,
    latencyThreshold: row.latency_threshold,
    sharpeThreshold: row.sharpe_threshold,
  };
}

export function close(): void {
  if (db) {
    db.close();
  }
}
