/**
 * Database Types and Utilities
 *
 * Centralized types for SQLite database operations with Bun.
 * Provides type-safe query wrappers and common database row types.
 */

import { Database } from "bun:sqlite";

/**
 * Base database row type
 * All columns from SQLite queries are strings, numbers, or null
 */
export interface DatabaseRow {
  [key: string]: string | number | null;
}

/**
 * Typed query wrapper - returns single row or undefined
 *
 * @example
 * ```typescript
 * interface UserRow { id: number; name: string; email: string; }
 * const user = queryOne<UserRow>(db, "SELECT * FROM users WHERE id = ?", 1);
 * ```
 */
export function queryOne<T extends DatabaseRow>(
  db: Database,
  sql: string,
  ...params: (string | number)[]
): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

/**
 * Typed query wrapper - returns multiple rows
 *
 * @example
 * ```typescript
 * interface UserRow { id: number; name: string; email: string; }
 * const users = queryMany<UserRow>(db, "SELECT * FROM users LIMIT ?", 10);
 * ```
 */
export function queryMany<T extends DatabaseRow>(
  db: Database,
  sql: string,
  ...params: (string | number)[]
): T[] {
  return db.prepare(sql).all(...params) as T[];
}

/**
 * Typed query wrapper - run operation (INSERT, UPDATE, DELETE)
 *
 * @example
 * ```typescript
 * const result = queryRun(db, "INSERT INTO users (name) VALUES (?)", "Alice");
 * console.log(result.changes); // 1
 * ```
 */
export function queryRun(
  db: Database,
  sql: string,
  ...params: (string | number)[]
): { changes: number; lastInsertRowid: number } {
  return db.prepare(sql).run(...params);
}

/**
 * Alert database row type
 */
export interface AlertRow {
  id: number;
  timestamp: number;
  type: string;
  severity: "info" | "warning" | "error" | "critical";
  title: string;
  description: string;
  ip: string;
  environment: string;
  details: string; // JSON string
  resolved: number; // 0 or 1
  resolvedAt: number | null;
  resolvedBy: string | null;
}

/**
 * Anomaly database row type
 */
export interface AnomalyRow {
  id: number;
  timestamp: number;
  type: string;
  severity: string;
  title: string;
  description: string;
  ip: string;
  environment: string;
  details: string; // JSON string
}

/**
 * IP Stats database row type
 */
export interface IPStatsRow {
  ip: string;
  environment: string;
  requestCount: number;
  lastRequest: number;
  avgResponseTime: number;
  statusCodes: string; // JSON string
}

/**
 * Upload telemetry database row type
 */
export interface UploadTelemetryRow {
  uploadId: string;
  filename: string;
  fileSize: number;
  duration: number;
  status: "success" | "failure";
  provider: "s3" | "r2" | "local";
  timestamp: number;
}

/**
 * Auth user database row type
 */
export interface AuthUserRow {
  username: string;
  hashedPassword: string;
  role: "admin" | "viewer" | "auditor";
  createdAt: number;
}

/**
 * Metrics database row type
 */
export interface MetricsRow {
  timestamp: number;
  metricType: string;
  value: number;
  labels: string; // JSON string
}

/**
 * Socket event database row type
 */
export interface SocketEventRow {
  id: number;
  timestamp: number;
  type: string;
  sourceIP: string;
  destination: string;
  details: string; // JSON string
  environment: string;
}

/**
 * Geolocation database row type
 */
export interface GeolocationRow {
  ip: string;
  country: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timestamp: number;
}

/**
 * Helper to parse JSON column from database
 *
 * @example
 * ```typescript
 * const row = queryOne<AlertRow>(db, "SELECT * FROM alerts WHERE id = ?", 1);
 * const details = parseJSONColumn(row.details);
 * ```
 */
export function parseJSONColumn<T>(jsonString: string): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return {} as T;
  }
}

/**
 * Helper to stringify value for JSON column
 *
 * @example
 * ```typescript
 * const details = { endpoint: "/api/test", errorRate: 0.5 };
 * const jsonString = stringifyJSONColumn(details);
 * ```
 */
export function stringifyJSONColumn<T>(value: T): string {
  return JSON.stringify(value);
}
