// @see https://bun.com/docs/test/index#run-tests
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { runHealthTick } from "../tools/ops-health-tick.ts";

const SCRATCH = ".tmp/ops-health-tick-test";
const DB = `${SCRATCH}/operations.db`;

beforeEach(async () => {
  await Bun.$`rm -rf ${SCRATCH} && mkdir -p ${SCRATCH}`.quiet();
});

afterEach(async () => {
  await Bun.$`rm -rf ${SCRATCH}`.quiet();
});

describe("ops health tick", () => {
  test("runs integrity + cleanup + coverage snapshot in one pass", async () => {
    const result = await runHealthTick(DB);

    expect(result.integrity.status).toBe("ok");
    expect(result.dodCleaned).toBe(0);

    const db = new Database(DB);
    const integrityRows = (
      db.query("SELECT COUNT(*) as c FROM integrity_checks").get() as { c: number }
    ).c;
    const coverageRows = (
      db.query("SELECT COUNT(*) as c FROM coverage_snapshots").get() as { c: number }
    ).c;
    db.close();
    expect(integrityRows).toBe(1);
    expect(coverageRows).toBe(1);
  });

  test("cleanup purges stale pending DODs", async () => {
    // Seed an 8-day-old pending DOD directly
    const seed = new Database(DB);
    seed.run(`CREATE TABLE IF NOT EXISTS dod_submissions (
      id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, type TEXT NOT NULL,
      status TEXT DEFAULT 'pending', submitted_at TEXT NOT NULL)`);
    seed.run(
      "INSERT INTO dod_submissions (id, agent_id, type, status, submitted_at) VALUES ('old-1', 'a1', 'slip', 'pending', datetime('now', '-8 days'))",
    );
    seed.close();

    const result = await runHealthTick(DB);
    expect(result.dodCleaned).toBe(1);
  });
});
