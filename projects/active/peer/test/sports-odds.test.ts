import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterAll, describe, expect, test } from "bun:test";

const tempDir = mkdtempSync(join(tmpdir(), "peer-sports-odds-"));
process.env.NODE_ENV = "test";
process.env.PEER_DATA_DIR = tempDir;
process.env.PEER_DB_PATH = `${tempDir}/peer.sqlite`;
process.env.ODDS_SNAPSHOT_PATH = `${tempDir}/odds.jsonl`;
process.env.PEER_BUILD_ON_START = "0";
delete process.env.ODDS_API_KEY;

const {
  americanToImpliedProbability,
  appendOddsSnapshots,
  getOddsHistory,
  getPatternSummary,
  makeDemoSnapshots,
  normalizeOddsApiEvents,
} = await import("../src/sports-odds");
const { handleRequest } = await import("../src/server");

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("sports odds normalization and movement", () => {
  test("converts American odds to implied probability", () => {
    expect(americanToImpliedProbability(-150)).toBeCloseTo(0.6, 4);
    expect(americanToImpliedProbability(150)).toBeCloseTo(0.4, 4);
  });

  test("normalizes The Odds API events into snapshot rows", () => {
    const snapshots = normalizeOddsApiEvents("nfl", [
      {
        id: "evt_1",
        commence_time: "2026-05-01T22:00:00Z",
        home_team: "Philadelphia",
        away_team: "Kansas City",
        bookmakers: [
          {
            title: "DraftKings",
            markets: [
              {
                key: "h2h",
                outcomes: [
                  { name: "Philadelphia", price: -125 },
                  { name: "Kansas City", price: 105 },
                ],
              },
              {
                key: "spreads",
                outcomes: [{ name: "Philadelphia", price: -110, point: -2.5 }],
              },
              {
                key: "totals",
                outcomes: [{ name: "Over", price: -108, point: 47.5 }],
              },
            ],
          },
        ],
      },
    ]);

    expect(snapshots).toHaveLength(4);
    expect(snapshots.map((snapshot) => `${snapshot.market}:${snapshot.side}`)).toContain("h2h:home");
    expect(snapshots.find((snapshot) => snapshot.market === "spreads")?.point).toBe(-2.5);
  });

  test("persists snapshots and calculates same-day movement deltas", async () => {
    const first = makeDemoSnapshots("nfl", "2026-05-01T12:00:00.000Z").slice(0, 4);
    const second = first.map((snapshot) => ({
      ...snapshot,
      timestamp: "2026-05-01T12:01:00.000Z",
      americanPrice: snapshot.americanPrice + 10,
      impliedProbability: americanToImpliedProbability(snapshot.americanPrice + 10),
    }));

    await appendOddsSnapshots(first);
    const persisted = await appendOddsSnapshots(second);
    expect(persisted.some((snapshot) => snapshot.priceDelta === 10)).toBe(true);
    expect(persisted.some((snapshot) => snapshot.centsDelta !== 0)).toBe(true);

    const history = await getOddsHistory(first[0]!.eventId, "2026-05-01");
    expect(history.snapshots.length).toBeGreaterThanOrEqual(8);

    const patterns = await getPatternSummary("nfl", "2026-05-01");
    expect(patterns.biggestMovers.length).toBeGreaterThan(0);
  });
});

describe("sports odds API routes", () => {
  test("serves sports metadata and demo fallback refresh without an API key", async () => {
    const sports = await handleRequest(new Request("http://peer.test/api/odds/sports"));
    expect(sports.status).toBe(200);
    const sportsJson = await sports.json() as { liveConfigured: boolean; sports: Array<{ key: string }> };
    expect(sportsJson.liveConfigured).toBe(false);
    expect(sportsJson.sports.some((sport) => sport.key === "nfl")).toBe(true);

    const refresh = await handleRequest(new Request("http://peer.test/api/odds/refresh?sport=nfl", { method: "POST" }));
    expect(refresh.status).toBe(200);
    const refreshJson = await refresh.json() as { status: string; coverage: { sportsbookCount: number }; events: unknown[] };
    expect(refreshJson.status).toBe("api_key_missing");
    expect(refreshJson.coverage.sportsbookCount).toBeGreaterThanOrEqual(8);
    expect(refreshJson.events.length).toBeGreaterThan(0);
  });
});
