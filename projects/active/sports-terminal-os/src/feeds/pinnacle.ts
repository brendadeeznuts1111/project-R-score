/**
 * Zone 9: Market Intelligence — Real Odds Feed
 *
 * Fetches live odds from the Pinnacle Sports API and feeds them
 * into the sportsbook service. Auto-detects line movements,
 * calculates CLV (Closing Line Value), and triggers steam
 * detection when multiple books move the same line rapidly.
 *
 * Pinnacle API docs: https://pinnacleapi.com/
 * Rate limit: 1 request per 2 seconds (polite polling).
 *
 * Gated on BUCKEYE_LIVE_MODE + PINNACLE_API_KEY.
 */

import { updateBookOdds, getBestLines, calculateCLV, detectSteamMoves } from "../services/sportsbook-service";
import { createLogger } from "@utils/logger";
import { logHealth, logMarketDepth } from "@utils/tableLogger";
import { env } from "@utils/env";
import { findBestMatch, normalizeTeam } from "@utils/fuzzy-matcher";

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const logger = createLogger("OddsFeed");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Pinnacle API odds snapshot for a single event/market. */
interface PinnacleOddsEntry {
  eventId: string;
  sport: string;
  market: string;
  period?: string;
  homeTeam?: string;
  awayTeam?: string;
  odds: number;
  line?: number;
  overUnder?: "over" | "under";
  timestamp?: number;
}

/** Pinnacle odds API v1 response shape. */
interface PinnacleResponse {
  sportId?: number;
  leagues?: Array<{
    id: number;
    events: Array<{
      id: number;
      name?: string;
      homeTeam?: string;
      awayTeam?: string;
      startTime?: string;
      periods?: Array<{
        periodId?: number;
        moneyline?: { home: number; away: number; draw?: number };
        spreads?: Array<{ hdp: number; home: number; away: number }>;
        totals?: Array<{ points: number; over: number; under: number }>;
      }>;
    }>;
  }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PINNACLE_BASE = "https://api.pinnacle.com/v1";
const BOOK_ID = "PINNACLE";
const RATE_LIMIT_MS = 2000; // 1 request per 2 seconds

/** Map Pinnacle sport IDs to our sport names. */
const SPORT_MAP: Record<number, string> = {
  1: "NFL", 2: "NFL", 3: "NCAAF",
  4: "NBA", 5: "NBA", 6: "NCAAB",
  7: "MLB", 8: "MLB",
  9: "NHL", 10: "NHL",
  11: "EPL", 12: "UCL", 13: "LaLiga", 14: "SerieA",
  15: "Tennis", 16: "Golf",
  17: "UFC", 18: "Boxing",
};

/** Map Pinnacle market types to our MarketType enum. */
const MARKET_MAP: Record<string, "spread" | "ml" | "total"> = {
  moneyline: "ml",
  spreads: "spread",
  totals: "total",
};

// ---------------------------------------------------------------------------
// Pinnacle API fetch
// ---------------------------------------------------------------------------

/**
 * Fetch live odds from Pinnacle for the given sport IDs.
 * Returns a flat array of odds entries ready for updateBookOdds().
 */
async function fetchPinnacleOdds(sportIds: number[]): Promise<PinnacleOddsEntry[]> {
  const apiKey = env.PINNACLE_API_KEY;
  if (!apiKey) {
    throw new Error("PINNACLE_API_KEY not configured");
  }

  // Build URL — Pinnacle v1 odds endpoint
  const sportParam = sportIds.join(",");
  const url = `${PINNACLE_BASE}/odds?sportIds=${sportParam}&oddsFormat=AMERICAN`;

  logger.debug(`Fetching Pinnacle odds: ${url}`);

  const resp = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Accept": "application/json",
    },
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Pinnacle API returned ${resp.status}: ${text.slice(0, 200)}`);
  }

  const data = (await resp.json()) as PinnacleResponse;
  const entries: PinnacleOddsEntry[] = [];
  const now = Date.now();

  // Parse leagues → events → periods → markets
  for (const league of data.leagues || []) {
    for (const event of league.events || []) {
      const sport = SPORT_MAP[data.sportId || 0] || "OTHER";
      const eventId = `pinnacle_${event.id}`;
      const home = event.homeTeam || "";
      const away = event.awayTeam || "";
      const eventName = `${away} @ ${home}`;

      for (const period of event.periods || []) {
        // Moneyline
        if (period.moneyline) {
          const odds = period.moneyline;
          [["home", odds.home], ["away", odds.away]].forEach(([side, value]) => {
            if (value != null) {
              entries.push({
                eventId,
                sport,
                market: "ml",
                odds: value as number,
                homeTeam: home,
                awayTeam: away,
                timestamp: now,
              });
            }
          });
          if (odds.draw != null) {
            entries.push({
              eventId,
              sport,
              market: "ml",
              odds: odds.draw,
              homeTeam: home,
              awayTeam: away,
              timestamp: now,
            });
          }
        }

        // Spreads
        for (const spread of period.spreads || []) {
          entries.push({
            eventId,
            sport,
            market: "spread",
            odds: spread.home,
            line: spread.hdp,
            homeTeam: home,
            awayTeam: away,
            timestamp: now,
          });
          entries.push({
            eventId,
            sport,
            market: "spread",
            odds: spread.away,
            line: -spread.hdp,
            homeTeam: home,
            awayTeam: away,
            timestamp: now,
          });
        }

        // Totals
        for (const total of period.totals || []) {
          entries.push({
            eventId,
            sport,
            market: "total",
            odds: total.over,
            line: total.points,
            overUnder: "over",
            homeTeam: home,
            awayTeam: away,
            timestamp: now,
          });
          entries.push({
            eventId,
            sport,
            market: "total",
            odds: total.under,
            line: total.points,
            overUnder: "under",
            homeTeam: home,
            awayTeam: away,
            timestamp: now,
          });
        }
      }
    }
  }

  logger.debug(`Parsed ${entries.length} odds entries from Pinnacle`);
  return entries;
}

// ---------------------------------------------------------------------------
// Main feed pipeline
// ---------------------------------------------------------------------------

export interface OddsFeedResult {
  fetched: number;
  inserted: number;
  updated: number;
  movements: number;
  errors: string[];
  timestamp: number;
}

/**
 * Fetch odds from Pinnacle, feed into sportsbook-service.
 * updateBookOdds() auto-detects line movements.
 */
export async function refreshOddsFeed(): Promise<OddsFeedResult> {
  const result: OddsFeedResult = {
    fetched: 0,
    inserted: 0,
    updated: 0,
    movements: 0,
    errors: [],
    timestamp: Math.floor(Date.now() / 1000),
  };

  if (!env.PINNACLE_API_KEY) {
    logger.debug("PINNACLE_API_KEY not configured — skipping odds refresh");
    return result;
  }

  if (!env.BUCKEYE_LIVE_MODE) {
    logger.debug("BUCKEYE_LIVE_MODE disabled — skipping odds refresh");
    return result;
  }

  try {
    // Fetch from Pinnacle (active sports: 1-18)
    const sportIds = [1, 2, 3, 4, 5, 7, 9, 11, 12, 15, 17];
    const entries = await fetchPinnacleOdds(sportIds);
    result.fetched = entries.length;

    // Load existing DB event IDs for fuzzy matching (cached per sport)
    const dbEventCache = new Map<string, string[]>();
    const { getDb } = await import("@db/index");

    // Feed each entry into updateBookOdds
    for (const entry of entries) {
      try {
        // Fuzzy match: resolve Pinnacle eventId → canonical DB eventId
        let eventId = entry.eventId;

        if (!dbEventCache.has(entry.sport)) {
          const rows = getDb()
            .query(`SELECT DISTINCT event_id FROM sportsbook_odds WHERE sport = ?`)
            .all(entry.sport) as Array<{ event_id: string }>;
          dbEventCache.set(entry.sport, rows.map((r) => r.event_id));
        }

        const candidates = dbEventCache.get(entry.sport) ?? [];
        if (candidates.length > 0) {
          const match = findBestMatch(entry.eventId, candidates, 0.85);
          if (match && match.score >= 0.85) {
            eventId = match.match;
          }
        }

        const outcome = updateBookOdds({
          bookId: BOOK_ID,
          sport: entry.sport,
          eventId,
          market: entry.market as "spread" | "ml" | "total",
          odds: entry.odds,
          line: entry.line,
          overUnder: entry.overUnder,
          timestamp: entry.timestamp || Date.now(),
          source: "api",
        });

        if (outcome.id) result.inserted++;
        else result.updated++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Update error";
        result.errors.push(`${entry.eventId}/${entry.market}: ${msg}`);
      }
    }

    // Calculate CLV for recent line movements
    const clvResults = calculateCLV();
    if (clvResults.length > 0) {
      logger.info(`CLV: ${clvResults.length} markets with measurable closing line value`);
    }

    // Check for steam moves
    const steamMoves = detectSteamMoves();
    if (steamMoves.length > 0) {
      for (const steam of steamMoves) {
        logger.warn(`STEAM DETECTED: ${steam.sport}/${steam.eventId} — ${steam.direction} move across ${steam.bookCount} books`);
        logMarketDepth({
          eventId: steam.eventId,
          market: steam.eventId,
          book: "STEAM",
          homeOdds: steam.bookCount,
          lastUpdated: new Date().toISOString(),
        });
      }
    }

    // Recalculate best lines after feed
    try {
      getBestLines();
    } catch {
      // best-effort
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Feed error";
    result.errors.push(msg);
    logger.error(`Odds feed failed: ${msg}`);
  }

  logHealth({
    component: "OddsFeed",
    fetched: result.fetched,
    inserted: result.inserted,
    updated: result.updated,
    movements: result.movements,
    errors: result.errors.length,
  });

  return result;
}
