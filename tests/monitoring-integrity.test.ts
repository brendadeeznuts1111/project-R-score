// @see https://bun.com/docs/test/index#run-tests
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { runIntegrityCheck } from "../lib/monitoring/integrity.ts";
import { ensureMonitoringSchema } from "../lib/monitoring/schema.ts";

const SCRATCH = ".tmp/monitoring-integrity-test";
const DB = `${SCRATCH}/registry.db`;

beforeEach(async () => {
  await Bun.$`rm -rf ${SCRATCH} && mkdir -p ${SCRATCH}`.quiet();
});

afterEach(async () => {
  await Bun.$`rm -rf ${SCRATCH}`.quiet();
});

describe("monitoring integrity check", () => {
  test("records an ok row when live artifacts satisfy contracts", async () => {
    const result = await runIntegrityCheck(DB);
    expect(result.status).toBe("ok");
    expect(result.failures).toBe(0);

    const db = new Database(DB);
    ensureMonitoringSchema(db);
    const row = db
      .query("SELECT status, failures FROM integrity_checks ORDER BY timestamp DESC LIMIT 1")
      .get() as { status: string; failures: number };
    db.close();
    expect(row.status).toBe("ok");
  });

  test("second run is idempotent (schema + insert both safe)", async () => {
    await runIntegrityCheck(DB);
    const second = await runIntegrityCheck(DB);
    expect(second.status).toBe("ok");
    const db = new Database(DB);
    const count = (db.query("SELECT COUNT(*) as c FROM integrity_checks").get() as { c: number }).c;
    db.close();
    expect(count).toBe(2);
  });
});
