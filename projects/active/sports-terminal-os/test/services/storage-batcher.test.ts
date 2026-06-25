/**
 * Storage Batcher tests
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { StorageBatcher } from "../../src/services/storage-batcher";

describe("StorageBatcher", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.run(`
      CREATE TABLE test_feed (
        id INTEGER PRIMARY KEY,
        site TEXT,
        team_name TEXT,
        odds_value TEXT,
        confidence REAL,
        timestamp INTEGER
      )
    `);
  });

  afterEach(() => {
    db.close();
  });

  it("inserts rows and flushes to DB", async () => {
    const batcher = new StorageBatcher(db, {
      table: "test_feed",
      columns: ["site", "team_name", "odds_value", "confidence", "timestamp"],
      flushIntervalMs: 0, // manual
    });

    batcher.insert(["pinnacle", "Arsenal", "2.10", 0.96, 1000]);
    batcher.insert(["pinnacle", "Liverpool", "1.95", 0.99, 1000]);
    expect(batcher.buffered).toBe(2);

    const flushed = await batcher.flush();
    expect(flushed).toBe(2);
    expect(batcher.buffered).toBe(0);

    const rows = db.query("SELECT * FROM test_feed").all() as Record<string, unknown>[];
    expect(rows.length).toBe(2);
    expect(rows[0].team_name).toBe("Arsenal");
    expect(rows[1].team_name).toBe("Liverpool");
  });

  it("auto-flushes when buffer exceeds maxBatch", async () => {
    const batcher = new StorageBatcher(db, {
      table: "test_feed",
      columns: ["site", "team_name", "odds_value", "confidence", "timestamp"],
      maxBatch: 3,
      flushIntervalMs: 0,
    });

    // Insert 5 rows — should auto-flush at 3
    for (let i = 0; i < 5; i++) {
      batcher.insert(["demo", `Team${i}`, "2.00", 0.9, Date.now()]);
    }

    // After 5 inserts with maxBatch=3: first 3 flushed, 2 remain buffered
    expect(batcher.buffered).toBe(2);

    // Flush remaining
    await batcher.flush();
    expect(batcher.buffered).toBe(0);

    const count = (db.query("SELECT COUNT(*) as cnt FROM test_feed").get() as { cnt: number }).cnt;
    expect(count).toBe(5);
  });

  it("uses transactions for atomicity", async () => {
    // Create a table with a UNIQUE constraint to test rollback
    db.run("CREATE TABLE unique_feed (id INTEGER PRIMARY KEY, key TEXT UNIQUE)");
    const batcher = new StorageBatcher(db, {
      table: "unique_feed",
      columns: ["key"],
      flushIntervalMs: 0,
    });

    batcher.insert(["a"]);
    batcher.insert(["b"]);
    batcher.insert(["a"]); // duplicate — should rollback the whole batch

    try {
      await batcher.flush();
    } catch {
      // Expected — unique constraint violation
    }

    // All rows should be re-queued
    expect(batcher.buffered).toBe(3);

    const count = (db.query("SELECT COUNT(*) as cnt FROM unique_feed").get() as { cnt: number }).cnt;
    expect(count).toBe(0);
  });

  it("tracks metrics", async () => {
    const batcher = new StorageBatcher(db, {
      table: "test_feed",
      columns: ["site", "team_name", "odds_value", "confidence", "timestamp"],
      flushIntervalMs: 0,
    });

    batcher.insert(["a", "b", "c", 1.0, 1]);
    await batcher.flush();

    const m = batcher.getMetrics();
    expect(m.table).toBe("test_feed");
    expect(m.totalInserted).toBe(1);
    expect(m.flushCount).toBe(1);
    expect(m.buffered).toBe(0);
  });

  it("flushes synchronously with flushNow", () => {
    const batcher = new StorageBatcher(db, {
      table: "test_feed",
      columns: ["site", "team_name", "odds_value", "confidence", "timestamp"],
      flushIntervalMs: 0,
    });

    batcher.insert(["sync", "Team", "3.00", 0.5, 1]);
    const flushed = batcher.flushNow();
    expect(flushed).toBe(1);

    const rows = db.query("SELECT * FROM test_feed").all() as Record<string, unknown>[];
    expect(rows.length).toBe(1);
    expect(rows[0].team_name).toBe("Team");
  });

  it("stops auto-flush timer", () => {
    const batcher = new StorageBatcher(db, {
      table: "test_feed",
      columns: ["site", "team_name", "odds_value", "confidence", "timestamp"],
      flushIntervalMs: 100,
      maxBatch: 100,
    });

    batcher.stop();
    // No assertion needed — just verifying stop() doesn't throw
    expect(typeof batcher.stop).toBe("function");
  });

  it("rejects inserts when queue exceeds maxQueue (backpressure)", () => {
    const batcher = new StorageBatcher(db, {
      table: "test_feed",
      columns: ["site", "team_name", "odds_value", "confidence", "timestamp"],
      maxQueue: 3,
      flushIntervalMs: 0,
    });

    // Fill the queue
    expect(batcher.insert(["a", "b", "c", 1, 1])).toBe(true);
    expect(batcher.insert(["a", "b", "c", 2, 2])).toBe(true);
    expect(batcher.insert(["a", "b", "c", 3, 3])).toBe(true);

    // Queue is full — should reject
    expect(batcher.buffered).toBe(3);
    expect(batcher.insert(["a", "b", "c", 4, 4])).toBe(false);
    expect(batcher.buffered).toBe(3); // Still 3, rejected

    const m = batcher.getMetrics();
    expect(m.rejected).toBe(1);
    expect(m.maxQueue).toBe(3);
  });
});
