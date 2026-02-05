import { Database } from "bun:sqlite";

// 1. HSL Terminal Theming
export function colorize(text: string, h: number, s: number, l: number): string {
  return `${Bun.color(`hsl(${h}, ${s}%, ${l}%)`, "ansi") || ""}${text}\x1b[0m`;
}

export const theme = {
  success: (t: string) => colorize(t, 120, 70, 45),
  warning: (t: string) => colorize(t, 45, 90, 50),
  error: (t: string) => colorize(t, 0, 80, 50),
  info: (t: string) => colorize(t, 210, 70, 55),
  muted: (t: string) => colorize(t, 0, 0, 60),
} as const;

// 2. Nanosecond Benchmarking
export async function bench<T>(label: string, fn: () => T | Promise<T>) {
  const start = Bun.nanoseconds();
  const result = await fn();
  const ns = Bun.nanoseconds() - start;
  return { result, timing: { label, ns, ms: ns / 1e6 } };
}

// 3. Fast Checksums
export const checksum = {
  crc32: (data: string | Uint8Array | ArrayBuffer) => Bun.hash.crc32(data).toString(16),
  hash: (data: string | Uint8Array | ArrayBuffer) => Bun.hash(data).toString(16),
};

// 4. Embedded SQLite
export function openDB(path: string, wal = true): Database {
  const db = new Database(path);
  if (wal) db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA foreign_keys = ON");
  return db;
}

export function kvStore(db: Database, table = "kv") {
  db.run(`CREATE TABLE IF NOT EXISTS ${table} (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER)`);
  const get = db.prepare(`SELECT value FROM ${table} WHERE key = ?`);
  const set = db.prepare(`INSERT OR REPLACE INTO ${table} (key, value, updated_at) VALUES (?, ?, ?)`);
  const del = db.prepare(`DELETE FROM ${table} WHERE key = ?`);
  return {
    get: (k: string) => (get.get(k) as { value: string } | null)?.value ?? null,
    set: (k: string, v: string) => set.run(k, v, Date.now()),
    delete: (k: string) => del.run(k),
  };
}
