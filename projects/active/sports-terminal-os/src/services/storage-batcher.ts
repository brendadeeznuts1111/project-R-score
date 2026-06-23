/**
 * Storage Batcher — batch DB inserts for high-throughput pipelines.
 *
 * Accumulates records in memory and flushes to SQLite in configurable
 * batches. Prevents the event loop from stalling when processing
 * 200+ crop inserts per scrape cycle.
 *
 * Pattern:
 *   const batcher = new StorageBatcher(db, "odds_feed", ["site","team_name","odds_value","confidence","screenshot_id","timestamp"]);
 *   batcher.insert(["pinnacle", "Arsenal", "2.10", 0.96, 42, Date.now()]);
 *   batcher.insert(["pinnacle", "Liverpool", "1.95", 0.99, 42, Date.now()]);
 *   await batcher.flush(); // or auto-flushes at interval
 *
 * Used by: pipeline-worker.ts (scrape evidence → batch store)
 */

import type { Database } from "bun:sqlite";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StorageBatcherOptions {
  /** Table name to insert into. */
  table: string;
  /** Column names (must match values array order). */
  columns: string[];
  /** Max records to accumulate before auto-flush. Default 100. */
  maxBatch?: number;
  /** Auto-flush interval in ms. 0 = manual flush only. Default 5000. */
  flushIntervalMs?: number;
  /** Max queue depth before rejecting inserts (backpressure). 0 = unlimited. Default 1000. */
  maxQueue?: number;
}

// ---------------------------------------------------------------------------
// Batcher
// ---------------------------------------------------------------------------

export class StorageBatcher {
  private db: Database;
  private table: string;
  private columns: string[];
  private maxBatch: number;
  private buffer: unknown[][] = [];
  private stmt: ReturnType<Database["prepare"]> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private maxQueue: number;

  /** Total records inserted since creation. */
  private totalInserted = 0;
  /** Total flush operations performed. */
  private flushCount = 0;
  /** Total records rejected due to queue full (backpressure). */
  private rejected = 0;

  constructor(db: Database, options: StorageBatcherOptions) {
    this.db = db;
    this.table = options.table;
    this.columns = options.columns;
    this.maxBatch = options.maxBatch ?? 100;
    this.maxQueue = options.maxQueue ?? 1000;

    // Prepare the statement at construction time
    const placeholders = this.columns.map(() => "?").join(", ");
    const colNames = this.columns.join(", ");
    this.stmt = db.prepare(
      `INSERT INTO ${this.table} (${colNames}) VALUES (${placeholders})`
    );

    // Auto-flush on interval
    const interval = options.flushIntervalMs ?? 5000;
    if (interval > 0) {
      this.timer = setInterval(() => this.flush(), interval);
    }
  }

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  /**
   * Queue a row for insertion. Auto-flushes if buffer exceeds maxBatch.
   * Rejects if queue exceeds maxQueue (backpressure).
   * Returns true if accepted, false if rejected.
   */
  insert(values: unknown[]): boolean {
    // Backpressure: reject if queue is full
    if (this.maxQueue > 0 && this.buffer.length >= this.maxQueue) {
      this.rejected++;
      return false;
    }

    this.buffer.push(values);
    if (this.buffer.length >= this.maxBatch) {
      this.flushNow();
    }
    return true;
  }

  /**
   * Flush all buffered rows to the database.
   * Wraps in a transaction for atomicity + performance.
   */
  async flush(): Promise<number> {
    if (this.buffer.length === 0) return 0;

    const count = this.buffer.length;
    const rows = this.buffer;
    this.buffer = [];

    try {
      this.db.run("BEGIN");
      for (const row of rows) {
        this.stmt!.run(...(row as Parameters<NonNullable<typeof this.stmt>["run"]>));
      }
      this.db.run("COMMIT");
      this.totalInserted += count;
      this.flushCount++;
    } catch (err) {
      this.db.run("ROLLBACK");
      // Re-queue failed rows at the front
      this.buffer = [...rows, ...this.buffer];
      throw err;
    }

    return count;
  }

  /**
   * Synchronous flush (for use in non-async contexts).
   */
  flushNow(): number {
    if (this.buffer.length === 0) return 0;

    const count = this.buffer.length;
    const rows = this.buffer;
    this.buffer = [];

    try {
      this.db.run("BEGIN");
      for (const row of rows) {
        this.stmt!.run(...(row as Parameters<NonNullable<typeof this.stmt>["run"]>));
      }
      this.db.run("COMMIT");
      this.totalInserted += count;
      this.flushCount++;
    } catch {
      this.db.run("ROLLBACK");
      this.buffer = [...rows, ...this.buffer];
    }

    return count;
  }

  /**
   * Stop the auto-flush timer. Call during graceful shutdown.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Metrics for observability.
   */
  getMetrics(): Record<string, unknown> {
    return {
      table: this.table,
      buffered: this.buffer.length,
      totalInserted: this.totalInserted,
      flushCount: this.flushCount,
      rejected: this.rejected,
      maxBatch: this.maxBatch,
      maxQueue: this.maxQueue > 0 ? this.maxQueue : "unlimited",
    };
  }

  /**
   * Number of rows currently buffered (not yet flushed).
   */
  get buffered(): number {
    return this.buffer.length;
  }
}
