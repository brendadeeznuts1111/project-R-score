/**
 * Shared config, crypto and database helpers — imported by both the main
 * server (server.ts) and the task workers (worker.ts) so the two processes
 * always agree on env config, AES-GCM keying and the SQLite schema.
 */
import { Database } from "bun:sqlite";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { DEFAULT_SELECTORS, parseSiteSelectors, type LoginSelectors } from "../driver/types.ts";

// ---------------------------------------------------------------------------
// Configuration (loaded from env — Bun auto-loads .env / .env.{NODE_ENV})
// ---------------------------------------------------------------------------
export let MASTER_KEY = process.env.MASTER_KEY ?? "dev-master-key-change-me";
export const DRIVER_MODE = process.env.AUTOMATION_DRIVER === "webview" ? "webview" : "mock";
export const DB_PATH = process.env.DB_PATH ?? "agent-portal.db";
export const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR ?? "screenshots";
export const SITE_SELECTORS = parseSiteSelectors(process.env.SITE_SELECTORS);
export const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";

export const SECRETS_SERVICE = process.env.SECRETS_SERVICE ?? "bun-automation";
export const SECRETS_MASTER_KEY_NAME = "master-key";

if (!process.env.MASTER_KEY && process.env.MASTER_KEY_SOURCE !== "secrets") {
  console.warn("[config] MASTER_KEY not set — using dev default. Set MASTER_KEY or MASTER_KEY_SOURCE=secrets.");
}

mkdirSync(SCREENSHOT_DIR, { recursive: true });

/**
 * Optionally load the master key from the OS keychain (Bun.secrets,
 * experimental). Called once at startup by server.ts and worker.ts before any
 * crypto work. Falls back to the env var when the keychain is unavailable.
 *
 * @see https://bun.com/docs/runtime/secrets
 */
export async function resolveMasterKey(): Promise<void> {
  if (process.env.MASTER_KEY_SOURCE !== "secrets") return;
  try {
    let key = await Bun.secrets.get({ service: SECRETS_SERVICE, name: SECRETS_MASTER_KEY_NAME });
    if (!key) {
      key = randomUUID();
      await Bun.secrets.set({ service: SECRETS_SERVICE, name: SECRETS_MASTER_KEY_NAME, value: key });
    }
    MASTER_KEY = key;
    cryptoKey = createHash("sha256").update(key).digest();
    console.log("[config] master key loaded from Bun.secrets (" + SECRETS_SERVICE + ")");
  } catch (err) {
    console.warn(
      "[config] Bun.secrets unavailable — falling back to MASTER_KEY env:",
      (err as Error).message,
    );
  }
}

// ---------------------------------------------------------------------------
// Crypto helpers (AES-256-GCM, key derived from MASTER_KEY)
// ---------------------------------------------------------------------------
let cryptoKey: Buffer = createHash("sha256").update(MASTER_KEY).digest();

export function encrypt(text: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", cryptoKey, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return `${iv.toString("base64")}.${enc.toString("base64")}.${cipher.getAuthTag().toString("base64")}`;
}

export function decrypt(payload: string): string {
  const [ivB64, dataB64, tagB64] = payload.split(".");
  if (!ivB64 || !dataB64 || !tagB64) throw new Error("Malformed encrypted payload");
  const decipher = createDecipheriv("aes-256-gcm", cryptoKey, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------
export interface AgentRow {
  id: string;
  username: string;
  password_hash: string;
  created_at: number;
}
export interface SessionRow {
  id: string;
  agent_id: string | null;
  csrf_secret: string;
  created_at: number;
  expires_at: number;
}
export interface TaskRow {
  id: string;
  agent_id: string | null;
  url: string;
  username: string;
  password_encrypted: string;
  location: string | null;
  proxy: string | null;
  status: string;
  session_id: string | null;
  progress: number;
  progress_message: string | null;
  created_at: number;
  updated_at: number;
}
export interface SessionDetailRow {
  id: string;
  task_id: string;
  cookies: string;
  local_storage: string;
  session_storage: string;
  api_base: string;
  screenshot_path: string;
  last_healthy: number;
  expires_at: number;
  status: string;
  url: string;
}
export interface CredentialRow {
  id: string;
  agent_id: string;
  site: string;
  username: string;
  password_encrypted: string;
  created_at: number;
}
export interface LogRow {
  timestamp: number;
  action: string;
  details: string;
}

// ---------------------------------------------------------------------------
// Database (idempotent schema)
// ---------------------------------------------------------------------------
export function createDb(dbPath = DB_PATH): Database {
  const db = new Database(dbPath, { create: true });
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password_hash TEXT,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS dashboard_sessions (
      id TEXT PRIMARY KEY,
      agent_id TEXT,
      csrf_secret TEXT,
      created_at INTEGER,
      expires_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      agent_id TEXT,
      url TEXT,
      username TEXT,
      password_encrypted TEXT,
      location TEXT,
      proxy TEXT,
      status TEXT,
      session_id TEXT,
      progress INTEGER,
      progress_message TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      cookies TEXT,
      local_storage TEXT,
      session_storage TEXT,
      api_base TEXT,
      screenshot_path TEXT,
      last_healthy INTEGER,
      expires_at INTEGER,
      status TEXT,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS credentials (
      id TEXT PRIMARY KEY,
      agent_id TEXT,
      site TEXT,
      username TEXT,
      password_encrypted TEXT,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS session_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      timestamp INTEGER,
      action TEXT,
      details TEXT
    );
  `);
  return db;
}

// ---------------------------------------------------------------------------
// Task helpers
// ---------------------------------------------------------------------------
export function selectorsFor(url: string): LoginSelectors {
  return SITE_SELECTORS.get(hostnameOf(url))?.selectors ?? DEFAULT_SELECTORS;
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function logSession(db: Database, sessionId: string, action: string, details: string): void {
  db.run(
    "INSERT INTO session_logs (session_id, timestamp, action, details) VALUES (?, ?, ?, ?)",
    [sessionId, Date.now(), action, details],
  );
}
