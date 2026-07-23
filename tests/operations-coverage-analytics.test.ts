// @see https://bun.com/docs/test/index#run-tests
import { beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { initSchema } from "../lib/operations/schema.ts";
import { ensurePlatformCoverageSchema } from "../lib/operations/platform-coverage.ts";
import {
  dueCompliance,
  ensureCoverageAnalyticsSchema,
  getExpertPlatformPrefs,
  getPlatformLimit,
  getPlatformPerformance,
  predictCoverage,
  recordPlatformCost,
  setPlatformLimit,
  upsertPlatformPerformance,
} from "../lib/operations/coverage-analytics.ts";

let db: Database;

beforeEach(() => {
  db = new Database(":memory:");
  initSchema(db);
  ensurePlatformCoverageSchema(db);
  ensureCoverageAnalyticsSchema(db);
});

function seedPlatform(id: string, name: string): void { // brand-ok — test fixture persistence key
  db.run(
    "INSERT INTO platforms (id, name, category, status, created_at) VALUES (?, ?, 'sportsbook', 'active', datetime('now'))",
    [id, name],
  );
}

function seedAccount(platformId: string, partnerId: string, openedAt: string): void { // brand-ok — test fixture persistence keys
  // FK enforcement is off in bun:sqlite; tree_nodes rows not needed for these tests.
  db.run(
    "INSERT INTO partner_platform_accounts (id, platform_id, partner_id, account_identifier, opened_at, created_at, status) VALUES (?, ?, ?, ?, ?, datetime('now'), 'active')",
    [Bun.randomUUIDv7(), platformId, partnerId, `${partnerId}-acct`, openedAt],
  );
}

describe("coverage-analytics — schema", () => {
  test("analytics tables are created idempotently", () => {
    expect(() => ensureCoverageAnalyticsSchema(db)).not.toThrow();
  });
});

describe("coverage-analytics — predictor", () => {
  test("computes date to reach target from trailing onboarding rate", () => {
    for (let i = 0; i < 10; i++) seedPlatform(`plat-${i}`, `Platform ${i}`);
    // 5 covered: 4 opened this week, 1 older
    for (let i = 0; i < 4; i++) {
      seedAccount(`plat-${i}`, `partner-${i}`, new Date().toISOString().slice(0, 10));
    }
    seedAccount("plat-4", "partner-4", new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10));

    const pred = predictCoverage(db, 80);
    expect(pred.currentCoverage).toBe(50);
    expect(pred.requiredNewAccounts).toBe(3); // 80% of 10 = 8, covered 5
    expect(pred.weeklyOnboardingRate).toBe(1); // 4 in 4 weeks / 4
    expect(pred.dateToReach).not.toBeNull();
  });

  test("returns null date when onboarding rate is zero", () => {
    seedPlatform("plat-0", "Platform 0");
    seedPlatform("plat-1", "Platform 1");
    const pred = predictCoverage(db, 80);
    expect(pred.dateToReach).toBeNull();
    expect(pred.weeklyOnboardingRate).toBe(0);
  });
});

describe("coverage-analytics — risk limits", () => {
  test("partner-specific limit wins over global", () => {
    seedPlatform("dk", "DraftKings");
    setPlatformLimit(db, { platformId: "dk", maxStakePerPlay: 1000 });
    setPlatformLimit(db, { platformId: "dk", partnerId: "p1", maxStakePerPlay: 250 });

    expect(getPlatformLimit(db, "dk", "p1")?.maxStakePerPlay).toBe(250);
    expect(getPlatformLimit(db, "dk", "p2")?.maxStakePerPlay).toBe(1000);
    expect(getPlatformLimit(db, "dk")?.maxStakePerPlay).toBe(1000);
    expect(getPlatformLimit(db, "unknown")).toBeNull();
  });
});

describe("coverage-analytics — expert prefs", () => {
  test("returns prefs ordered by priority, filtered by sport", () => {
    seedPlatform("dk", "DraftKings");
    seedPlatform("fd", "FanDuel");
    db.run(
      "INSERT INTO expert_platform_prefs (expert_id, platform_id, sport, market, priority) VALUES ('exp-1', 'dk', 'NBA', 'totals', 10)",
    );
    db.run(
      "INSERT INTO expert_platform_prefs (expert_id, platform_id, sport, market, priority) VALUES ('exp-1', 'fd', 'NBA', 'totals', 5)",
    );
    const prefs = getExpertPlatformPrefs(db, "exp-1", "NBA", "totals");
    expect(prefs.map(p => p.platformId)).toEqual(["dk", "fd"]);
    expect(getExpertPlatformPrefs(db, "exp-1", "NFL", "totals")).toEqual([]);
  });
});

describe("coverage-analytics — compliance", () => {
  test("dueCompliance returns items due within the window only", () => {
    seedPlatform("dk", "DraftKings");
    const soon = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    const later = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    db.run("INSERT INTO compliance_deadlines (id, platform_id, partner_id, requirement, due_date) VALUES ('c1', 'dk', 'p1', 'kyc_expiry', ?)", [soon]);
    db.run("INSERT INTO compliance_deadlines (id, platform_id, partner_id, requirement, due_date) VALUES ('c2', 'dk', 'p1', 'tax_form', ?)", [later]);

    const due = dueCompliance(db, 7);
    expect(due.map(d => d.id)).toEqual(["c1"]);
    expect(due[0]?.requirement).toBe("kyc_expiry");
  });

  test("recordPlatformCost stores a row", () => {
    seedPlatform("dk", "DraftKings");
    recordPlatformCost(db, { platformId: "dk", costType: "monthly_fee", amount: 250 });
    const row = db.query("SELECT * FROM platform_costs WHERE platform_id = 'dk'").get() as Record<string, unknown>;
    expect(row.amount).toBe(250);
  });
});

describe("coverage-analytics — performance", () => {
  test("aggregates trailing N days", () => {
    seedPlatform("dk", "DraftKings");
    const today = new Date().toISOString().slice(0, 10);
    const old = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    upsertPlatformPerformance(db, { platformId: "dk", date: today, totalWagers: 10, totalStake: 5000, netPnl: 250, winRate: 55 });
    upsertPlatformPerformance(db, { platformId: "dk", date: old, totalWagers: 99, totalStake: 99999, netPnl: -1, winRate: 1 });

    const perf = getPlatformPerformance(db, "dk", 30);
    expect(perf.totalWagers).toBe(10);
    expect(perf.netPnl).toBe(250);

    // upsert on conflict
    upsertPlatformPerformance(db, { platformId: "dk", date: today, totalWagers: 12, totalStake: 6000, netPnl: 300, winRate: 56 });
    expect(getPlatformPerformance(db, "dk", 30).totalWagers).toBe(12);
  });
});
