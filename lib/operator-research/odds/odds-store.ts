// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
import { Database } from 'bun:sqlite';
import { ensureParentDirSync } from '../../bun-fs-utils.ts';
import { joinPath } from '../../path-bun.ts';
import { DATA_DIR, ensureResearchDirs } from '../paths.ts';
import type { HostId } from '../../types/branded.ts';
import type { EdgeSignal, OddsSnapshot } from './types.ts';
import { parseOddsJson } from './odds-parser.ts';

export const ODDS_DB_PATH = joinPath(DATA_DIR, 'odds.db');
export const ODDS_SNAPSHOTS_DIR = joinPath(DATA_DIR, 'odds-snapshots');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS odds_snapshots (
  id TEXT PRIMARY KEY,
  host TEXT NOT NULL,
  sportsbook_id TEXT,
  timestamp INTEGER NOT NULL,
  source TEXT NOT NULL,
  content_hash TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_odds_host_ts ON odds_snapshots(host, timestamp DESC);

CREATE TABLE IF NOT EXISTS edge_signals (
  id TEXT PRIMARY KEY,
  host TEXT NOT NULL,
  type TEXT NOT NULL,
  confidence REAL NOT NULL,
  details TEXT NOT NULL,
  market_id TEXT,
  selection TEXT,
  observed_at INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_edge_host_obs ON edge_signals(host, observed_at DESC);
`;

let dbSingleton: Database | null = null;

export function openOddsDb(path = ODDS_DB_PATH): Database {
  if (dbSingleton && path === ODDS_DB_PATH) return dbSingleton;
  ensureParentDirSync(path);
  const db = new Database(path, { create: true });
  db.exec('PRAGMA busy_timeout = 5000');
  try {
    db.exec(`BEGIN IMMEDIATE;\n${SCHEMA}\nCOMMIT;`);
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      /* transaction may not have started */
    }
    db.close();
    throw error;
  }
  if (path === ODDS_DB_PATH) dbSingleton = db;
  return db;
}

export async function ensureOddsStore(path = ODDS_DB_PATH): Promise<Database> {
  await ensureResearchDirs();
  await Bun.write(joinPath(ODDS_SNAPSHOTS_DIR, '.gitkeep'), '');
  return openOddsDb(path);
}

export type StoredSnapshotMeta = {
  id: string; // brand-ok — opaque research/wire id
  host: string;
  sportsbookId: string | null; // brand-ok — opaque research/wire id
  timestamp: number;
  source: string;
  contentHash: string | null;
  createdAt: string;
};

export function storeSnapshot(snapshot: OddsSnapshot, db = openOddsDb()): StoredSnapshotMeta {
  const id = Bun.randomUUIDv7();
  const createdAt = new Date().toISOString();
  const payload = JSON.stringify(snapshot);
  db.query(
    `INSERT INTO odds_snapshots (
      id, host, sportsbook_id, timestamp, source, content_hash, payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    String(snapshot.host),
    snapshot.sportsbookId ? String(snapshot.sportsbookId) : null,
    snapshot.timestamp,
    snapshot.source,
    snapshot.contentHash ?? null,
    payload,
    createdAt
  );

  // Also drop a JSONL-friendly file for offline inspect
  const day = new Date(snapshot.timestamp).toISOString().slice(0, 10);
  const filePath = joinPath(ODDS_SNAPSHOTS_DIR, `${String(snapshot.host)}-${day}.jsonl`);
  void appendJsonl(filePath, { id, ...snapshot });

  return {
    id,
    host: String(snapshot.host),
    sportsbookId: snapshot.sportsbookId ? String(snapshot.sportsbookId) : null,
    timestamp: snapshot.timestamp,
    source: snapshot.source,
    contentHash: snapshot.contentHash ?? null,
    createdAt,
  };
}

// eslint-disable-next-line harness/no-unknown-function-param -- JSONL sink accepts any serializable row
async function appendJsonl(path: string, row: unknown): Promise<void> {
  const line = `${JSON.stringify(row)}\n`;
  const existing = (await Bun.file(path).exists()) ? await Bun.file(path).text() : '';
  await Bun.write(path, existing + line);
}

function rowToSnapshot(payloadJson: string, hostFallback: string): OddsSnapshot {
  try {
    const parsed = JSON.parse(payloadJson) as OddsSnapshot;
    if (parsed && Array.isArray(parsed.markets)) return parsed;
  } catch {
    /* fall through */
  }
  return parseOddsJson(payloadJson, { host: hostFallback, source: 'live' });
}

export function getLastSnapshot(host: HostId | string, db = openOddsDb()): OddsSnapshot | null {
  const row = db
    .query(
      `SELECT payload_json, host FROM odds_snapshots
       WHERE host = ?
       ORDER BY timestamp DESC
       LIMIT 1`
    )
    .get(String(host)) as { payload_json: string; host: string } | null;
  if (!row) return null;
  return rowToSnapshot(row.payload_json, row.host);
}

export function getLastSnapshots(
  host: HostId | string,
  limit = 5,
  db = openOddsDb()
): OddsSnapshot[] {
  const rows = db
    .query(
      `SELECT payload_json, host FROM odds_snapshots
       WHERE host = ?
       ORDER BY timestamp DESC
       LIMIT ?`
    )
    .all(String(host), limit) as { payload_json: string; host: string }[];
  // chronological oldest → newest for pattern windows
  return rows.map(r => rowToSnapshot(r.payload_json, r.host)).reverse();
}

export function storeEdgeSignals(signals: EdgeSignal[], db = openOddsDb()): number {
  if (signals.length === 0) return 0;
  const insert = db.query(
    `INSERT INTO edge_signals (
      id, host, type, confidence, details, market_id, selection,
      observed_at, payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const createdAt = new Date().toISOString();
  let n = 0;
  for (const s of signals) {
    insert.run(
      Bun.randomUUIDv7(),
      String(s.host),
      s.type,
      s.confidence,
      s.details,
      s.marketId ?? null,
      s.selection ?? null,
      s.observedAt,
      JSON.stringify(s),
      createdAt
    );
    n++;
  }
  return n;
}

export function listRecentEdges(
  host: HostId | string | null,
  limit = 20,
  db = openOddsDb()
): EdgeSignal[] {
  const rows = host
    ? (db
        .query(
          `SELECT payload_json FROM edge_signals
           WHERE host = ?
           ORDER BY observed_at DESC
           LIMIT ?`
        )
        .all(String(host), limit) as { payload_json: string }[])
    : (db
        .query(
          `SELECT payload_json FROM edge_signals
           ORDER BY observed_at DESC
           LIMIT ?`
        )
        .all(limit) as { payload_json: string }[]);
  return rows.map(r => JSON.parse(r.payload_json) as EdgeSignal);
}
