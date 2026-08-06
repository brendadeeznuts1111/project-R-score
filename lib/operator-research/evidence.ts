// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
import { Database } from 'bun:sqlite';
import { DB_PATH, ensureResearchDirs } from './paths.ts';
import type { EvidenceRow, EnrichResult, StackDetection } from './types.ts';

let dbSingleton: Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  host TEXT NOT NULL,
  operator_id TEXT,
  type TEXT NOT NULL,
  claim TEXT NOT NULL,
  provider TEXT,
  confidence REAL,
  fingerprint TEXT,
  markets_json TEXT,
  geo_json TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_evidence_host ON evidence(host);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence(type);
CREATE INDEX IF NOT EXISTS idx_evidence_operator ON evidence(operator_id);
`;

export function openEvidenceDb(path = DB_PATH): Database {
  if (dbSingleton && path === DB_PATH) return dbSingleton;
  const db = new Database(path, { create: true });
  db.exec(SCHEMA);
  if (path === DB_PATH) dbSingleton = db;
  return db;
}

export async function ensureEvidenceStore(): Promise<Database> {
  await ensureResearchDirs();
  return openEvidenceDb();
}

/** Wipe evidence rows (full research runs start clean). */
export function resetEvidenceStore(db = openEvidenceDb()): void {
  db.exec('DELETE FROM evidence');
}

export type AddEvidenceInput = {
  url: string;
  host: string;
  operatorId?: string | null; // brand-ok — opaque research/wire id
  type: EvidenceRow['type'];
  claim: string;
  provider?: string | null;
  confidence?: number | null;
  fingerprint?: string | null;
  markets?: string[];
  geo?: string[];
  payload: unknown;
  id?: string; // brand-ok — opaque research/wire id
  createdAt?: string;
};

export function addEvidence(input: AddEvidenceInput, db = openEvidenceDb()): EvidenceRow {
  const id = input.id ?? Bun.randomUUIDv7();
  const createdAt = input.createdAt ?? new Date().toISOString();
  const row: EvidenceRow = {
    id,
    url: input.url,
    host: input.host,
    operatorId: input.operatorId ?? null,
    type: input.type,
    claim: input.claim,
    provider: input.provider ?? null,
    confidence: input.confidence ?? null,
    fingerprint: input.fingerprint ?? null,
    marketsJson: input.markets ? JSON.stringify(input.markets) : null,
    geoJson: input.geo ? JSON.stringify(input.geo) : null,
    payloadJson: JSON.stringify(input.payload),
    createdAt,
  };
  db.query(
    `INSERT INTO evidence (
      id, url, host, operator_id, type, claim, provider, confidence,
      fingerprint, markets_json, geo_json, payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      claim = excluded.claim,
      provider = excluded.provider,
      confidence = excluded.confidence,
      fingerprint = excluded.fingerprint,
      markets_json = excluded.markets_json,
      payload_json = excluded.payload_json,
      created_at = excluded.created_at`
  ).run(
    row.id,
    row.url,
    row.host,
    row.operatorId,
    row.type,
    row.claim,
    row.provider,
    row.confidence,
    row.fingerprint,
    row.marketsJson,
    row.geoJson,
    row.payloadJson,
    row.createdAt
  );
  return row;
}

export function storeEnrichEvidence(result: EnrichResult, db = openEvidenceDb()): void {
  addEvidence(
    {
      id: result.taskId,
      url: result.url,
      host: result.host,
      operatorId: result.operatorId,
      type: 'enrich',
      claim: `enriched ${result.host} fetch=${result.fetch.ok} screenshot=${result.screenshot.ok}`,
      provider: result.stack?.provider ?? null,
      confidence: result.stack?.confidence ?? null,
      fingerprint: result.stack?.fingerprint ?? null,
      markets: result.stack?.marketsObserved,
      payload: result,
    },
    db
  );
  if (result.screenshot.ok) {
    addEvidence(
      {
        url: result.url,
        host: result.host,
        operatorId: result.operatorId,
        type: 'screenshot',
        claim: `screenshot ${result.screenshot.source} for ${result.host}`,
        payload: result.screenshot,
        id: result.screenshot.evidenceId,
      },
      db
    );
  }
}

export function storeStackEvidence(stack: StackDetection, operatorId?: string | null): EvidenceRow {
  // brand-ok — opaque research/wire id
  return addEvidence({
    url: stack.url,
    host: stack.host,
    operatorId,
    type: 'stack',
    claim: `stack ${stack.provider} @ ${stack.confidence}% for ${stack.host}`,
    provider: stack.provider,
    confidence: stack.confidence,
    fingerprint: stack.fingerprint,
    markets: stack.marketsObserved,
    payload: stack,
  });
}

export function getEvidence(db = openEvidenceDb()): EvidenceRow[] {
  const rows = db
    .query(
      `SELECT id, url, host, operator_id as operatorId, type, claim, provider, confidence,
              fingerprint, markets_json as marketsJson, geo_json as geoJson,
              payload_json as payloadJson, created_at as createdAt
       FROM evidence ORDER BY created_at ASC`
    )
    .all() as EvidenceRow[];
  return rows;
}

export function getEvidenceForHost(host: string, db = openEvidenceDb()): EvidenceRow[] {
  return getEvidence(db).filter(e => e.host === host || e.url.includes(host));
}

export function parseMarketsJson(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
