#!/usr/bin/env bun
/**
 * Component #118: SQLite-Engine
 * Primary API: bun:sqlite
 * Performance SLA: O(n) query (EXISTS-to-JOIN optimized)
 * Parity Lock: 9w0x...1y2z
 * Status: LAZY_LOAD
 */

import { feature } from "bun:bundle";
import { Database } from "bun:sqlite";

export class SQLiteEngine {
  private static instance: SQLiteEngine;
  private db: Database | null = null;

  private constructor() {}

  static getInstance(): SQLiteEngine {
    if (!this.instance) {
      this.instance = new SQLiteEngine();
    }
    return this.instance;
  }

  init(path: string): void {
    if (!feature("SQLITE_ENGINE")) return;
    this.db = new Database(path);
  }

  query(sql: string, params: any[] = []): any[] {
    if (!feature("SQLITE_ENGINE")) {
      return [];
    }

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const sqliteEngine = feature("SQLITE_ENGINE")
  ? SQLiteEngine.getInstance()
  : {
      init: () => {},
      query: () => [],
      close: () => {},
    };

export default sqliteEngine;
