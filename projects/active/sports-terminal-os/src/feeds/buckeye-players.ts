/**
 * Buckeye Player Feed
 *
 * Polls the Buckeye proxy for player roster data, maps to raw_players
 * table schema, and upserts into the database. Follows the standard
 * feed pattern: fetch → map → refresh.
 *
 * Cron: player_refresh (every 6 hours via cron.ts)
 * Gate: BUCKEYE_LIVE_MODE
 */

import { createLogger } from "@utils/logger";
import { logHealth, logBuckeye } from "@utils/tableLogger";
import { getDb } from "@db/index";
import { env } from "@utils/env";
import { fetchInternalProxy, INTERNAL_PROXY_ROUTES } from "@utils/internal-proxy-client";

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const logger = createLogger("BuckeyePlayers");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BuckeyePlayer {
  playerId?: string;
  player_id?: string;
  login?: string;
  name?: string;
  email?: string;
  phone?: string;
  balance?: number;
  status?: string;
  riskTier?: string;
  risk_tier?: string;
  archetype?: string;
  lastWagerAt?: number;
  last_wager_at?: number;
  wagerCount?: number;
  wager_count?: number;
  winRate?: number;
  win_rate?: number;
  pnlLifetime?: number;
  pnl_lifetime?: number;
  agentLogin?: string;
  agent_login?: string;
}

interface BuckeyePlayerResponse {
  players?: BuckeyePlayer[];
  total?: number;
}

export interface PlayerFeedResult {
  fetched: number;
  inserted: number;
  updated: number;
  errors: string[];
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------

function mapPlayer(raw: BuckeyePlayer, sessionId: string): Record<string, unknown> {
  return {
    player_id: raw.playerId || raw.player_id || "",
    session_id: sessionId,
    agent_login: raw.agentLogin || raw.agent_login || "",
    name: raw.name || raw.login || null,
    email: raw.email || null,
    phone: raw.phone || null,
    balance: raw.balance ?? 0,
    status: raw.status || "active",
    risk_tier: raw.riskTier || raw.risk_tier || "GREEN",
    archetype: raw.archetype || null,
    last_wager_at: raw.lastWagerAt || raw.last_wager_at || null,
    wager_count: raw.wagerCount || raw.wager_count || 0,
    win_rate: raw.winRate || raw.win_rate || null,
    pnl_lifetime: raw.pnlLifetime || raw.pnl_lifetime || 0,
    ingested_at: Math.floor(Date.now() / 1000),
  };
}

// ---------------------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------------------

export async function refresh(): Promise<PlayerFeedResult> {
  const result: PlayerFeedResult = {
    fetched: 0,
    inserted: 0,
    updated: 0,
    errors: [],
    timestamp: Math.floor(Date.now() / 1000),
  };

  if (!env.BUCKEYE_LIVE_MODE) {
    logger.debug("BUCKEYE_LIVE_MODE disabled — skipping player refresh");
    return result;
  }

  const apiKey = process.env.PROXY_API_KEY;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["X-API-Key"] = apiKey;

  // Use a synthetic session ID for player ingestion
  const sessionId = `player-refresh-${result.timestamp}`;

  try {
    const resp = await fetchInternalProxy(INTERNAL_PROXY_ROUTES.players, {
      method: "GET",
      headers,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      result.errors.push(`Proxy returned ${resp.status}: ${text.slice(0, 200)}`);
      return result;
    }

    const data = (await resp.json()) as BuckeyePlayerResponse;
    const players = data.players || [];
    result.fetched = players.length;

    if (players.length === 0) {
      logger.debug("No players returned from Buckeye proxy");
      return result;
    }

    const db = getDb();
    const upsert = db.query(
      `INSERT INTO raw_players
       (player_id, session_id, agent_login, name, email, phone, balance, status,
        risk_tier, archetype, last_wager_at, wager_count, win_rate, pnl_lifetime, ingested_at)
       VALUES ($player_id, $session_id, $agent_login, $name, $email, $phone, $balance, $status,
               $risk_tier, $archetype, $last_wager_at, $wager_count, $win_rate, $pnl_lifetime, $ingested_at)
       ON CONFLICT(player_id, session_id) DO UPDATE SET
         agent_login = excluded.agent_login,
         name = excluded.name,
         email = excluded.email,
         phone = excluded.phone,
         balance = excluded.balance,
         status = excluded.status,
         risk_tier = excluded.risk_tier,
         archetype = excluded.archetype,
         last_wager_at = excluded.last_wager_at,
         wager_count = excluded.wager_count,
         win_rate = excluded.win_rate,
         pnl_lifetime = excluded.pnl_lifetime,
         ingested_at = excluded.ingested_at`
    );

    for (const player of players) {
      try {
        const mapped = mapPlayer(player, sessionId);
        upsert.run(mapped as any);
        result.inserted++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upsert error";
        result.errors.push(`${player.playerId || player.player_id}: ${msg}`);
      }
    }

    logBuckeye({
      endpoint: "/api/proxy/players",
      method: "GET",
      statusCode: resp.status,
      playerCount: result.fetched,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Fetch error";
    result.errors.push(msg);
    logger.error(`Player refresh failed: ${msg}`);
  }

  logHealth({
    component: "BuckeyePlayers",
    fetched: result.fetched,
    inserted: result.inserted,
    errors: result.errors.length,
  });

  logger.info(
    `Player refresh: ${result.fetched} fetched → ${result.inserted} upserted` +
    (result.errors.length > 0 ? ` [${result.errors.length} errors]` : "")
  );

  return result;
}
