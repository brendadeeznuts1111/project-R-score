#!/usr/bin/env bun
/**
 * Fraud prevention: account history (audit trail) and cross-lookup references.
 * Phone/email/device hashes linked to userId for cross-referencing with our data.
 */

import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'path';
import {
  RecordEventInputSchema,
  RegisterReferenceInputSchema,
  type AccountHistoryEntry,
  type ReferenceLookupRow,
  type CrossLookupResult,
  type ReferenceType,
} from './types';

const DEFAULT_DB_NAME = 'fraud-prevention.db';

export function getDefaultDbPath(): string {
  try {
    return join(import.meta.dir, '..', 'data', DEFAULT_DB_NAME);
  } catch {
    return join(process.cwd(), 'data', DEFAULT_DB_NAME);
  }
}

export class FraudPreventionEngine {
  private db: Database;
  private dbPath: string;

  constructor(dbPath: string = getDefaultDbPath()) {
    this.dbPath = dbPath;
    try {
      mkdirSync(join(dbPath, '..'), { recursive: true });
    } catch {
      // dir may already exist
    }
    this.db = new Database(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA synchronous = NORMAL');
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      -- Append-only account history (audit trail)
      CREATE TABLE IF NOT EXISTS account_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        event_type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        metadata TEXT,
        ip_hash TEXT,
        device_hash TEXT,
        gateway TEXT,
        amount_cents INTEGER,
        success INTEGER DEFAULT 1
      );
      CREATE INDEX IF NOT EXISTS idx_account_history_user ON account_history(userId, timestamp);
      CREATE INDEX IF NOT EXISTS idx_account_history_event ON account_history(event_type, timestamp);
      CREATE INDEX IF NOT EXISTS idx_account_history_timestamp ON account_history(timestamp);

      -- Cross-lookup: hashed identifiers (phone, email, device) -> userId
      CREATE TABLE IF NOT EXISTS reference_lookups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference_type TEXT NOT NULL,
        value_hash TEXT NOT NULL,
        userId TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE(reference_type, value_hash, userId)
      );
      CREATE INDEX IF NOT EXISTS idx_reference_type_hash ON reference_lookups(reference_type, value_hash);
      CREATE INDEX IF NOT EXISTS idx_reference_user ON reference_lookups(userId, reference_type);
    `);
  }

  /**
   * Record an account event (append-only).
   */
  recordEvent(input: {
    userId: string;
    eventType: string;
    metadata?: Record<string, unknown>;
    ipHash?: string;
    deviceHash?: string;
    gateway?: string;
    amountCents?: number;
    success?: boolean;
  }): number {
    const parsed = RecordEventInputSchema.parse({
      ...input,
      success: input.success ?? true,
    });
    const stmt = this.db.prepare(`
      INSERT INTO account_history (userId, event_type, timestamp, metadata, ip_hash, device_hash, gateway, amount_cents, success)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const ts = Math.floor(Date.now() / 1000);
    const metadataJson = parsed.metadata ? JSON.stringify(parsed.metadata) : null;
    stmt.run(
      parsed.userId,
      parsed.eventType,
      ts,
      metadataJson,
      parsed.ipHash ?? null,
      parsed.deviceHash ?? null,
      parsed.gateway ?? null,
      parsed.amountCents ?? null,
      parsed.success ? 1 : 0
    );
    return this.db.query('SELECT last_insert_rowid()').get() as number;
  }

  /**
   * Get account history for a user (and optional event type / time range).
   */
  getAccountHistory(options: {
    userId: string;
    eventType?: string;
    since?: number; // unix seconds
    limit?: number;
  }): AccountHistoryEntry[] {
    const { userId, eventType, since, limit = 500 } = options;
    let sql = `
      SELECT id, userId, event_type AS eventType, timestamp, metadata, ip_hash AS ipHash, device_hash AS deviceHash, gateway, amount_cents AS amountCents, success
      FROM account_history
      WHERE userId = ?
    `;
    const args: (string | number)[] = [userId];
    if (eventType) {
      sql += ' AND event_type = ?';
      args.push(eventType);
    }
    if (since != null) {
      sql += ' AND timestamp >= ?';
      args.push(since);
    }
    sql += ' ORDER BY timestamp DESC LIMIT ?';
    args.push(limit);
    const rows = this.db.prepare(sql).all(...args) as AccountHistoryEntry[];
    return rows;
  }

  /**
   * Register a reference (phone_hash, email_hash, device_id) linked to userId.
   */
  registerReference(input: {
    userId: string;
    referenceType: ReferenceType;
    valueHash: string;
  }): void {
    const parsed = RegisterReferenceInputSchema.parse(input);
    const ts = Math.floor(Date.now() / 1000);
    this.db
      .prepare(
        `INSERT OR IGNORE INTO reference_lookups (reference_type, value_hash, userId, created_at) VALUES (?, ?, ?, ?)`
      )
      .run(parsed.referenceType, parsed.valueHash, parsed.userId, ts);
  }

  /**
   * Look up all userIds linked to a phone hash (cross-reference: same phone on multiple accounts).
   */
  lookupByPhoneHash(phoneHash: string): string[] {
    return this.lookupByReference('phone_hash', phoneHash);
  }

  /**
   * Look up all userIds linked to a reference (type + value hash).
   */
  lookupByReference(referenceType: ReferenceType, valueHash: string): string[] {
    const rows = this.db
      .prepare(
        `SELECT userId FROM reference_lookups WHERE reference_type = ? AND value_hash = ? ORDER BY created_at ASC`
      )
      .all(referenceType, valueHash) as ReferenceLookupRow[];
    return [...new Set(rows.map((r) => r.userId))];
  }

  /**
   * Get all references linked to a userId (for our data cross-lookup).
   */
  getReferencesForUser(userId: string): ReferenceLookupRow[] {
    return this.db
      .prepare(
        `SELECT id, reference_type AS referenceType, value_hash AS valueHash, userId, created_at AS createdAt FROM reference_lookups WHERE userId = ? ORDER BY reference_type, created_at`
      )
      .all(userId) as ReferenceLookupRow[];
  }

  /**
   * Cross-lookup: find references that are linked to more than one account (fraud signal).
   */
  getCrossLookups(options?: { referenceType?: ReferenceType; minAccounts?: number }): CrossLookupResult[] {
    const minAccounts = options?.minAccounts ?? 2;
    if (options?.referenceType) {
      const rows = this.db
        .prepare(
          `SELECT reference_type AS referenceType, value_hash AS valueHash, COUNT(DISTINCT userId) AS cnt, GROUP_CONCAT(DISTINCT userId) AS userIds
           FROM reference_lookups WHERE reference_type = ? GROUP BY reference_type, value_hash HAVING cnt >= ?`
        )
        .all(options.referenceType, minAccounts) as Array<{
        referenceType: string;
        valueHash: string;
        cnt: number;
        userIds: string;
      }>;
      return rows.map((r) => ({
        referenceType: r.referenceType as ReferenceType,
        valueHash: r.valueHash,
        userIds: r.userIds.split(',').filter(Boolean),
        count: r.cnt,
      }));
    }
    const rows = this.db.prepare(`
      SELECT reference_type AS referenceType, value_hash AS valueHash, COUNT(DISTINCT userId) AS cnt, GROUP_CONCAT(DISTINCT userId) AS userIds
      FROM reference_lookups
      GROUP BY reference_type, value_hash
      HAVING cnt >= ?
    `).all(minAccounts) as Array<{
      referenceType: string;
      valueHash: string;
      cnt: number;
      userIds: string;
    }>;
    return rows.map((r) => ({
      referenceType: r.referenceType as ReferenceType,
      valueHash: r.valueHash,
      userIds: r.userIds.split(',').filter(Boolean),
      count: r.cnt,
    }));
  }

  /** Get DB path (for tests/config). */
  getDbPath(): string {
    return this.dbPath;
  }

  close(): void {
    this.db.close();
  }
}
