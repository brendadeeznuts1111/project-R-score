import { describe, it, expect, afterAll } from "bun:test";
import {
  open,
  transaction,
  migrate,
  queryAll,
  queryOne,
  exec,
  close,
  tableExists,
  tables,
} from "../src/core/db.ts";
import { rmSync } from "node:fs";
import { join } from "node:path";

const TMP_DB = join(import.meta.dir, ".tmp-db-test.sqlite");

describe("db", () => {
  afterAll(() => {
    rmSync(TMP_DB, { force: true });
    rmSync(TMP_DB + "-wal", { force: true });
    rmSync(TMP_DB + "-shm", { force: true });
  });

  describe("BN-065: Open with Pragmas", () => {
    it("should open in-memory database", () => {
      const db = open(":memory:");
      expect(db).not.toBeNull();
      db!.close();
    });

    it("should set WAL mode by default on file db", () => {
      const db = open(TMP_DB);
      expect(db).not.toBeNull();
      const result = db!.query("PRAGMA journal_mode").get() as { journal_mode: string };
      expect(result.journal_mode).toBe("wal");
      db!.close();
    });

    it("should skip WAL when disabled", () => {
      const db = open(":memory:", { wal: false });
      expect(db).not.toBeNull();
      const result = db!.query("PRAGMA journal_mode").get() as { journal_mode: string };
      expect(result.journal_mode).toBe("memory");
      db!.close();
    });

    it("should return null for invalid db path", () => {
      const db = open("/nonexistent/deeply/nested/impossible/path/db.sqlite");
      expect(db).toBeNull();
    });
  });

  describe("BN-066: Transaction Wrapper", () => {
    it("should execute transaction and return result", () => {
      const db = open(":memory:")!;
      db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY, val TEXT)");

      const result = transaction(db, (d) => {
        d.exec("INSERT INTO t VALUES (1, 'a')");
        d.exec("INSERT INTO t VALUES (2, 'b')");
        return d.query("SELECT COUNT(*) as cnt FROM t").get() as { cnt: number };
      });

      expect(result).not.toBeNull();
      expect(result!.cnt).toBe(2);
      db.close();
    });

    it("should rollback on error and return null", () => {
      const db = open(":memory:")!;
      db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY)");
      db.exec("INSERT INTO t VALUES (1)");

      const result = transaction(db, (d) => {
        d.exec("INSERT INTO t VALUES (2)");
        throw new Error("rollback");
      });

      expect(result).toBeNull();
      const count = db.query("SELECT COUNT(*) as cnt FROM t").get() as { cnt: number };
      expect(count.cnt).toBe(1);
      db.close();
    });
  });

  describe("BN-067: Schema Migration", () => {
    it("should run migration statements", () => {
      const db = open(":memory:")!;
      const ok = migrate(db, [
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)",
        "CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER, title TEXT)",
      ]);
      expect(ok).toBe(true);

      const tables = queryAll<{ name: string }>(
        db, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      );
      expect(tables.map(t => t.name)).toContain("users");
      expect(tables.map(t => t.name)).toContain("posts");
      db.close();
    });

    it("should return false on invalid SQL", () => {
      const db = open(":memory:")!;
      expect(migrate(db, ["NOT VALID SQL"])).toBe(false);
      db.close();
    });
  });

  describe("BN-068: Query Helpers", () => {
    it("should queryAll with params", () => {
      const db = open(":memory:")!;
      db.exec("CREATE TABLE t (id INTEGER, val TEXT)");
      db.exec("INSERT INTO t VALUES (1, 'a')");
      db.exec("INSERT INTO t VALUES (2, 'b')");
      db.exec("INSERT INTO t VALUES (3, 'a')");

      const rows = queryAll<{ id: number; val: string }>(db, "SELECT * FROM t WHERE val = ?", ["a"]);
      expect(rows.length).toBe(2);
      expect(rows[0].val).toBe("a");
      db.close();
    });

    it("should return empty array on error", () => {
      const db = open(":memory:")!;
      expect(queryAll(db, "SELECT * FROM nonexistent")).toEqual([]);
      db.close();
    });

    it("should queryOne", () => {
      const db = open(":memory:")!;
      db.exec("CREATE TABLE t (id INTEGER, val TEXT)");
      db.exec("INSERT INTO t VALUES (1, 'hello')");

      const row = queryOne<{ id: number; val: string }>(db, "SELECT * FROM t WHERE id = ?", [1]);
      expect(row).not.toBeNull();
      expect(row!.val).toBe("hello");
      db.close();
    });

    it("should return null when no rows match", () => {
      const db = open(":memory:")!;
      db.exec("CREATE TABLE t (id INTEGER)");
      expect(queryOne(db, "SELECT * FROM t WHERE id = ?", [999])).toBeNull();
      db.close();
    });

    it("should return null for queryOne on invalid SQL", () => {
      const db = open(":memory:")!;
      expect(queryOne(db, "SELECT * FROM nonexistent_table")).toBeNull();
      db.close();
    });
  });

  describe("BN-069b: Lifecycle & Convenience", () => {
    it("should close a database", () => {
      const db = open(":memory:")!;
      expect(close(db)).toBe(true);
    });

    it("should check if table exists", () => {
      const db = open(":memory:")!;
      db.exec("CREATE TABLE users (id INTEGER)");
      expect(tableExists(db, "users")).toBe(true);
      expect(tableExists(db, "posts")).toBe(false);
      db.close();
    });

    it("should list all tables", () => {
      const db = open(":memory:")!;
      db.exec("CREATE TABLE alpha (id INTEGER)");
      db.exec("CREATE TABLE beta (id INTEGER)");
      const t = tables(db);
      expect(t).toContain("alpha");
      expect(t).toContain("beta");
      expect(t.length).toBe(2);
      db.close();
    });
  });

  describe("BN-069: Exec", () => {
    it("should execute write statements", () => {
      const db = open(":memory:")!;
      db.exec("CREATE TABLE t (id INTEGER, val TEXT)");
      expect(exec(db, "INSERT INTO t VALUES (?, ?)", [1, "x"])).toBe(true);

      const row = queryOne<{ val: string }>(db, "SELECT val FROM t WHERE id = ?", [1]);
      expect(row!.val).toBe("x");
      db.close();
    });

    it("should execute without params", () => {
      const db = open(":memory:")!;
      expect(exec(db, "CREATE TABLE t (id INTEGER)")).toBe(true);
      db.close();
    });

    it("should return false on error", () => {
      const db = open(":memory:")!;
      expect(exec(db, "INSERT INTO nonexistent VALUES (1)")).toBe(false);
      db.close();
    });
  });
});
