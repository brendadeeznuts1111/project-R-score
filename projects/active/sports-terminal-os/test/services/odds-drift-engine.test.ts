/**
 * OddsDriftEngine Unit Tests
 *
 * Validates:
 *   - resolveTopics() with fuzzy matcher + alias map
 *   - process() pipeline: snapshot → detect → dedup → resolve
 *   - Snapshot maintenance
 *   - Dedup window enforcement
 *   - Immutability of emitted alerts
 */

process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-that-is-at-least-32-chars-long";
process.env.NODE_ENV = "test";

import { describe, it, expect, beforeEach } from "bun:test";
import { OddsDriftEngine, initOddsDriftEngine } from "../../src/services/odds-drift-engine";
import { clearScoreCache } from "../../src/utils/fuzzy-matcher";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CANONICAL_TEAMS = [
  "Manchester City",
  "Manchester United",
  "Liverpool",
  "Arsenal",
  "Chelsea",
  "Tottenham Hotspur",
  "Newcastle United",
  "Brighton & Hove Albion",
  "Aston Villa",
  "West Ham United",
];

const ALIAS_MAP = new Map<string, string>([
  ["man-city", "Manchester City"],
  ["man city", "Manchester City"],
  ["man-utd", "Manchester United"],
  ["man utd", "Manchester United"],
  ["man united", "Manchester United"],
  ["spurs", "Tottenham Hotspur"],
]);

// Source team name normalizer (matches engine's normalizeKey)
function nk(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, "-");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("OddsDriftEngine", () => {
  let engine: OddsDriftEngine;
  let emittedAlerts: Array<ReturnType<typeof engine["process"]>>;

  beforeEach(() => {
    clearScoreCache();
    emittedAlerts = [];
    engine = new OddsDriftEngine({
      canonicalTeams: CANONICAL_TEAMS,
      aliasMap: ALIAS_MAP,
      threshold: 0.88,
      minDrift: 0.01,
      dedupWindowMs: 0, // No dedup for most tests
      onAlert: (alert) => {
        emittedAlerts.push(alert);
      },
    });
  });

  // -------------------------------------------------------------------
  // resolveTopics
  // -------------------------------------------------------------------

  describe("resolveTopics", () => {
    it("always returns the raw source topic", () => {
      const topics = engine.resolveTopics("fantasy402", "Man City");
      expect(topics).toContain(`sources:fantasy402:team:Man City`);
    });

    it("resolves Man City → teams:Manchester City via alias map", () => {
      const topics = engine.resolveTopics("fantasy402", "Man City");
      expect(topics).toContain("teams:Manchester City");
    });

    it("resolves Man Utd → teams:Manchester United via alias map", () => {
      const topics = engine.resolveTopics("pinnacle", "Man Utd");
      expect(topics).toContain("teams:Manchester United");
    });

    it("resolves via fuzzy matching when alias map misses but canonical name is close", () => {
      // "Manchester United" → normalizes to "manchester united"
      // The alias map has "man united" but NOT "manchester united"
      // "Manchester United" should fuzzy-match to "Manchester United" exactly
      const fuzzyEngine = new OddsDriftEngine({
        canonicalTeams: CANONICAL_TEAMS,
        aliasMap: new Map([["manchester utd", "Manchester United"]]), // close but not exact
        threshold: 0.70,
        minDrift: 0.01,
      });
      const topics = fuzzyEngine.resolveTopics("fantasy402", "Manchester Untd");
      expect(topics).toContain("teams:Manchester United");
    });

    it("does NOT add canonical topic when no match found", () => {
      const topics = engine.resolveTopics("fantasy402", "Xylophone FC");
      // Only the raw source topic
      expect(topics.length).toBe(1);
      expect(topics[0]).toBe("sources:fantasy402:team:Xylophone FC");
    });

    it("exact canonical name returns canonical topic", () => {
      const topics = engine.resolveTopics("fantasy402", "Liverpool");
      expect(topics).toContain("teams:Liverpool");
    });
  });

  // -------------------------------------------------------------------
  // process() — full pipeline
  // -------------------------------------------------------------------

  describe("process", () => {
    it("returns null on first observation (no baseline)", () => {
      const result = engine.process({
        source: "fantasy402",
        rawTeam: "Man City",
        market: "ml",
        fromOdds: 1.95,
        toOdds: 1.91,
        timestamp: 1000,
      });
      expect(result).toBeNull();
    });

    it("detects a downward drift on second observation", () => {
      engine.process({
        source: "fantasy402",
        rawTeam: "Man City",
        market: "ml",
        fromOdds: 1.95,
        toOdds: 1.95, // baseline
        timestamp: 1000,
      });
      const result = engine.process({
        source: "fantasy402",
        rawTeam: "Man City",
        market: "ml",
        fromOdds: 1.95,
        toOdds: 1.91, // drifted
        timestamp: 1001,
      });
      expect(result).not.toBeNull();
      expect(result!.drift).toBe(-0.04);
      expect(result!.direction).toBe("down");
      expect(result!.canonicalTeam).toBe("Manchester City");
    });

    it("detects an upward drift", () => {
      engine.process({
        source: "pinnacle",
        rawTeam: "Liverpool",
        market: "spread",
        fromOdds: -110,
        toOdds: -110,
        timestamp: 1000,
      });
      const result = engine.process({
        source: "pinnacle",
        rawTeam: "Liverpool",
        market: "spread",
        fromOdds: -110,
        toOdds: -105,
        timestamp: 1001,
      });
      expect(result).not.toBeNull();
      expect(result!.drift).toBe(5);
      expect(result!.direction).toBe("up");
    });

    it("suppresses drift below minDrift threshold", () => {
      engine.process({
        source: "fantasy402",
        rawTeam: "Man City",
        market: "ml",
        fromOdds: 1.95,
        toOdds: 1.95,
        timestamp: 1000,
      });
      const result = engine.process({
        source: "fantasy402",
        rawTeam: "Man City",
        market: "ml",
        fromOdds: 1.95,
        toOdds: 1.949, // drift = -0.001 < minDrift=0.01
        timestamp: 1001,
      });
      expect(result).toBeNull();
    });

    it("invokes onAlert callback when an alert is emitted", () => {
      engine.process({
        source: "fantasy402",
        rawTeam: "Man City",
        market: "ml",
        fromOdds: 1.95,
        toOdds: 1.95,
        timestamp: 1000,
      });
      engine.process({
        source: "fantasy402",
        rawTeam: "Man City",
        market: "ml",
        fromOdds: 1.95,
        toOdds: 1.85,
        timestamp: 1001,
      });
      expect(emittedAlerts.length).toBe(1);
      expect(emittedAlerts[0]!.canonicalTeam).toBe("Manchester City");
      expect(emittedAlerts[0]!.topics).toContain("teams:Manchester City");
    });

    it("emits both raw and canonical topics in the alert", () => {
      engine.process({
        source: "fantasy402",
        rawTeam: "Man City",
        market: "ml",
        fromOdds: 1.95,
        toOdds: 1.95,
        timestamp: 1000,
      });
      const result = engine.process({
        source: "fantasy402",
        rawTeam: "Man City",
        market: "ml",
        fromOdds: 1.95,
        toOdds: 1.80,
        timestamp: 1001,
      });
      expect(result!.topics).toContain("sources:fantasy402:team:Man City");
      expect(result!.topics).toContain("teams:Manchester City");
    });
  });

  // -------------------------------------------------------------------
  // Dedup
  // -------------------------------------------------------------------

  describe("dedup", () => {
    it("suppresses re-alert within dedup window", () => {
      const dedupEngine = new OddsDriftEngine({
        canonicalTeams: CANONICAL_TEAMS,
        aliasMap: ALIAS_MAP,
        dedupWindowMs: 60_000, // 1 minute
        minDrift: 0.01,
      });

      dedupEngine.process({
        source: "fantasy402",
        rawTeam: "Man City",
        market: "ml",
        fromOdds: 1.95,
        toOdds: 1.95,
        timestamp: 1000,
      });
      const first = dedupEngine.process({
        source: "fantasy402",
        rawTeam: "Man City",
        market: "ml",
        fromOdds: 1.95,
        toOdds: 1.85,
        timestamp: 1001,
      });
      expect(first).not.toBeNull();

      // Immediately re-process same drift — should be deduped
      const second = dedupEngine.process({
        source: "fantasy402",
        rawTeam: "Man City",
        market: "ml",
        fromOdds: 1.85,
        toOdds: 1.75,
        timestamp: 1002,
      });
      expect(second).toBeNull(); // Suppressed
    });
  });

  // -------------------------------------------------------------------
  // Snapshot
  // -------------------------------------------------------------------

  describe("snapshot", () => {
    it("returns empty snapshot initially", () => {
      expect(engine.snapshot().size).toBe(0);
    });

    it("tracks snapshots after process() calls", () => {
      engine.process({
        source: "fantasy402",
        rawTeam: "Man City",
        market: "ml",
        fromOdds: 1.95,
        toOdds: 1.95,
        timestamp: 1000,
      });
      expect(engine.snapshot().size).toBe(1);

      engine.process({
        source: "pinnacle",
        rawTeam: "Liverpool",
        market: "spread",
        fromOdds: -110,
        toOdds: -110,
        timestamp: 1000,
      });
      expect(engine.snapshot().size).toBe(2);
    });

    it("snapshot values match the latest odds", () => {
      engine.process({
        source: "fantasy402",
        rawTeam: "Man City",
        market: "ml",
        fromOdds: 1.95,
        toOdds: 1.95,
        timestamp: 1000,
      });
      engine.process({
        source: "fantasy402",
        rawTeam: "Man City",
        market: "ml",
        fromOdds: 1.95,
        toOdds: 1.80,
        timestamp: 1001,
      });

      const snap = engine.snapshot();
      const key = `fantasy402:ml:man-city`;
      expect(snap.get(key)!.odds).toBe(1.80);
    });
  });

  // -------------------------------------------------------------------
  // Metrics
  // -------------------------------------------------------------------

  describe("getMetrics", () => {
    it("reports snapshot count and canonical team count", () => {
      const metrics = engine.getMetrics();
      expect(metrics.canonicalTeamCount).toBe(10);
      expect(metrics.snapshotCount).toBe(0);
      expect(metrics.aliasMapSize).toBe(6);
      expect(metrics.fuzzyIndexEnabled).toBe(false); // 10 < 100
    });
  });

  // -------------------------------------------------------------------
  // reload
  // -------------------------------------------------------------------

  describe("reload", () => {
    it("updates canonical teams and alias map", () => {
      engine.reload({
        canonicalTeams: ["Real Madrid", "Barcelona"],
        aliasMap: new Map([["barca", "Barcelona"]]),
      });

      const metrics = engine.getMetrics();
      expect(metrics.canonicalTeamCount).toBe(2);
      expect(metrics.aliasMapSize).toBe(1);
    });
  });

  // -------------------------------------------------------------------
  // Immutability
  // -------------------------------------------------------------------

  describe("immutability", () => {
    it("frozen alert cannot be mutated", () => {
      engine.process({
        source: "fantasy402",
        rawTeam: "Man City",
        market: "ml",
        fromOdds: 1.95,
        toOdds: 1.95,
        timestamp: 1000,
      });
      const result = engine.process({
        source: "fantasy402",
        rawTeam: "Man City",
        market: "ml",
        fromOdds: 1.95,
        toOdds: 1.80,
        timestamp: 1001,
      });

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result!.topics)).toBe(true);
      expect(() => {
        (result as any).drift = 999;
      }).toThrow();
    });
  });
});
