/**
 * IP Surveillance Service
 *
 * Tracks IP usage patterns, maintains denylist, auto-flags shared IPs,
 * and manages IP reputation scoring. Designed for multi-account detection,
 * VPN/proxy identification, and automated threat response.
 *
 * Checked at middleware level for immediate blocking.
 * Auto-flagging runs every 15 minutes via cron.
 *
 * Tables: ip_tracking, ip_denylist, ip_flags, ip_reputation_log
 */

import { getDb } from "@db/index";
import { logHealth, logCron, logViolation } from "@utils/tableLogger";
import type { SQLQueryBindings } from "bun:sqlite";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IPTracking {
  id: number;
  ipAddress: string;
  playerId: string;
  agentLogin: string;
  wagerId?: string;
  firstSeenAt: number;
  lastSeenAt: number;
  sightingCount: number;
  countryCode?: string;
  regionCode?: string;
  city?: string;
  isp?: string;
  isVpn: boolean;
  isProxy: boolean;
  isTor: boolean;
  isMobile: boolean;
  riskScore: number;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface IPDenylistEntry {
  id: number;
  ipAddress: string;
  ipRangeStart?: number;
  ipRangeEnd?: number;
  listType: "manual" | "auto" | "threat_intel" | "compliance";
  reason: string;
  source?: string;
  blockedBy?: string;
  expiryAt?: number;
  isActive: boolean;
  hitCount: number;
  lastHitAt?: number;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface IPFlag {
  id: number;
  ipAddress: string;
  playerId: string;
  agentLogin: string;
  flagType: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  evidence?: Record<string, unknown>;
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: number;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface IPReputation {
  ipAddress: string;
  score: number;
  factors: Array<{ factor: string; weight: number; description: string }>;
  isBlocked: boolean;
  isFlagged: boolean;
  flaggedReasons: string[];
  lastCheckedAt: number;
}

export interface TrackIPInput {
  ip: string;
  playerId: string;
  agentLogin: string;
  wagerId?: string;
  userAgent?: string;
  countryCode?: string;
  city?: string;
  isp?: string;
  isVpn?: boolean;
  isProxy?: boolean;
  isTor?: boolean;
  context?: Record<string, unknown>;
}

export interface AddToDenylistInput {
  ip: string;
  reason: string;
  listType?: IPDenylistEntry["listType"];
  source?: string;
  blockedBy?: string;
  expiryAt?: number;
}

// ---------------------------------------------------------------------------
// IP Tracking
// ---------------------------------------------------------------------------

/**
 * Track an IP address usage. Creates or updates the tracking record.
 */
export function trackIP(input: TrackIPInput): IPTracking {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  try {
    // Check if this IP + player combo already exists
    const existing = db
      .query("SELECT * FROM ip_tracking WHERE ip_address = ? AND player_id = ?")
      .get(input.ip, input.playerId) as Record<string, unknown> | null;

    if (existing) {
      // Update existing record
      db.run(
        `UPDATE ip_tracking SET
         last_seen_at = ?, sighting_count = sighting_count + 1,
         wager_id = COALESCE(?, wager_id),
         is_vpn = COALESCE(?, is_vpn), is_proxy = COALESCE(?, is_proxy),
         is_tor = COALESCE(?, is_tor), updated_at = ?
         WHERE id = ?`,
        [
          now,
          input.wagerId || null,
          input.isVpn !== undefined ? (input.isVpn ? 1 : 0) : null,
          input.isProxy !== undefined ? (input.isProxy ? 1 : 0) : null,
          input.isTor !== undefined ? (input.isTor ? 1 : 0) : null,
          now,
          existing.id,
        ] as SQLQueryBindings[]
      );

      const updated = db
        .query("SELECT * FROM ip_tracking WHERE id = ?")
        .get(existing.id as number) as Record<string, unknown>;

      return rowToTracking(updated);
    }

    // Create new tracking record
    db.run(
      `INSERT INTO ip_tracking
       (ip_address, player_id, agent_login, wager_id, first_seen_at, last_seen_at,
        sighting_count, country_code, city, isp, is_vpn, is_proxy, is_tor, is_mobile,
        risk_score, metadata_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.ip,
        input.playerId,
        input.agentLogin,
        input.wagerId || null,
        now,
        now,
        input.countryCode || null,
        input.city || null,
        input.isp || null,
        input.isVpn ? 1 : 0,
        input.isProxy ? 1 : 0,
        input.isTor ? 1 : 0,
        0, // is_mobile
        0, // risk_score
        JSON.stringify(input.context || {}),
        now,
        now,
      ]
    );

    const row = db
      .query("SELECT * FROM ip_tracking WHERE ip_address = ? AND player_id = ? ORDER BY id DESC LIMIT 1")
      .get(input.ip, input.playerId) as Record<string, unknown>;

    return rowToTracking(row);
  } catch (err: any) {
    logHealth({
      component: "IPSurveillance",
      status: "error",
      error: `trackIP failed: ${err.message}`,
    });
    throw err;
  }
}

/**
 * Check if an IP is on the denylist. Returns the entry if blocked.
 */
export function checkDenylist(ip: string): IPDenylistEntry | null {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const row = db
    .query(
      `SELECT * FROM ip_denylist
       WHERE ip_address = ? AND is_active = 1
       AND (expiry_at IS NULL OR expiry_at > ?)
       LIMIT 1`
    )
    .get(ip, now) as Record<string, unknown> | null;

  if (row) {
    // Increment hit count
    db.run(
      "UPDATE ip_denylist SET hit_count = hit_count + 1, last_hit_at = ? WHERE id = ?",
      [now, row.id] as SQLQueryBindings[]
    );
    return rowToDenylist(row);
  }

  return null;
}

/**
 * Check if an IP should be blocked (denylist + reputation check).
 */
export function shouldBlockIP(ip: string): { blocked: boolean; reason?: string } {
  // 1. Check denylist first (fast path)
  const denied = checkDenylist(ip);
  if (denied) {
    return { blocked: true, reason: `Denylist: ${denied.reason}` };
  }

  // 2. Check reputation
  const reputation = checkIPReputation(ip);
  if (reputation.score >= 80) {
    return { blocked: true, reason: `High risk score: ${reputation.score}` };
  }

  return { blocked: false };
}

// ---------------------------------------------------------------------------
// IP Reputation
// ---------------------------------------------------------------------------

/**
 * Check the reputation score for an IP address.
 */
export function checkIPReputation(ip: string): IPReputation {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const factors: Array<{ factor: string; weight: number; description: string }> = [];
  let score = 0;
  let isBlocked = false;
  let isFlagged = false;
  const flaggedReasons: string[] = [];

  try {
    // 1. Check denylist
    const denied = checkDenylist(ip);
    if (denied) {
      score += 100;
      isBlocked = true;
      factors.push({
        factor: "denylist",
        weight: 1.0,
        description: `IP is on denylist: ${denied.reason}`,
      });
      flaggedReasons.push("denylist");
    }

    // 2. Count unique players using this IP
    const playerCount = db
      .query("SELECT COUNT(DISTINCT player_id) as cnt FROM ip_tracking WHERE ip_address = ?")
      .get(ip) as { cnt: number } | null;

    if (playerCount && playerCount.cnt > 1) {
      const sharedScore = Math.min(playerCount.cnt * 15, 50);
      score += sharedScore;
      factors.push({
        factor: "shared_ip",
        weight: sharedScore / 100,
        description: `${playerCount.cnt} players share this IP`,
      });
      isFlagged = true;
      flaggedReasons.push("shared_ip");
    }

    // 3. Check for VPN/proxy/Tor
    const riskRow = db
      .query(
        "SELECT is_vpn, is_proxy, is_tor FROM ip_tracking WHERE ip_address = ? ORDER BY updated_at DESC LIMIT 1"
      )
      .get(ip) as { is_vpn: number; is_proxy: number; is_tor: number } | null;

    if (riskRow) {
      if (riskRow.is_vpn) {
        score += 25;
        factors.push({ factor: "vpn", weight: 0.25, description: "VPN detected" });
        flaggedReasons.push("vpn");
      }
      if (riskRow.is_proxy) {
        score += 30;
        factors.push({ factor: "proxy", weight: 0.3, description: "Proxy detected" });
        flaggedReasons.push("proxy");
      }
      if (riskRow.is_tor) {
        score += 50;
        factors.push({ factor: "tor", weight: 0.5, description: "Tor exit node detected" });
        flaggedReasons.push("tor");
      }
      if (riskRow.is_vpn || riskRow.is_proxy || riskRow.is_tor) {
        isFlagged = true;
      }
    }

    // 4. Count active flags
    const flagCount = db
      .query(
        "SELECT COUNT(*) as cnt FROM ip_flags WHERE ip_address = ? AND is_active = 1"
      )
      .get(ip) as { cnt: number } | null;

    if (flagCount && flagCount.cnt > 0) {
      score += Math.min(flagCount.cnt * 10, 30);
      factors.push({
        factor: "active_flags",
        weight: Math.min(flagCount.cnt * 0.1, 0.3),
        description: `${flagCount.cnt} active flags`,
      });
      isFlagged = true;
    }

    // Cap score at 100
    score = Math.min(score, 100);

    // Log reputation check
    db.run(
      `INSERT INTO ip_reputation_log
       (ip_address, old_score, new_score, score_delta, reason, source, triggered_by, created_at)
       SELECT ?, COALESCE((SELECT risk_score FROM ip_tracking WHERE ip_address = ? ORDER BY updated_at DESC LIMIT 1), 0),
       ?, ?, 'reputation_check', 'ip-surveillance-service', 'system', ?`,
      [ip, ip, score, score, now]
    );

    // Update risk_score on ip_tracking
    db.run(
      "UPDATE ip_tracking SET risk_score = ? WHERE ip_address = ?",
      [score, ip]
    );

    return {
      ipAddress: ip,
      score,
      factors,
      isBlocked,
      isFlagged,
      flaggedReasons,
      lastCheckedAt: now,
    };
  } catch (err: any) {
    logHealth({
      component: "IPSurveillance",
      status: "error",
      error: `checkIPReputation failed: ${err.message}`,
    });
    return {
      ipAddress: ip,
      score: 0,
      factors: [],
      isBlocked: false,
      isFlagged: false,
      flaggedReasons: [],
      lastCheckedAt: now,
    };
  }
}

// ---------------------------------------------------------------------------
// Denylist Management
// ---------------------------------------------------------------------------

/**
 * Add an IP to the denylist.
 */
export function addToDenylist(input: AddToDenylistInput): IPDenylistEntry {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  try {
    db.run(
      `INSERT INTO ip_denylist
       (ip_address, reason, list_type, source, blocked_by, expiry_at, is_active, hit_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
       ON CONFLICT(ip_address) DO UPDATE SET
       reason = excluded.reason, list_type = excluded.list_type,
       source = excluded.source, blocked_by = excluded.blocked_by,
       expiry_at = excluded.expiry_at, is_active = 1, updated_at = excluded.updated_at`,
      [
        input.ip,
        input.reason,
        input.listType || "manual",
        input.source || null,
        input.blockedBy || null,
        input.expiryAt || null,
        now,
        now,
      ]
    );

    const row = db
      .query("SELECT * FROM ip_denylist WHERE ip_address = ?")
      .get(input.ip) as Record<string, unknown>;

    logViolation({
      violationType: "ip_denylist",
      severity: "MEDIUM",
      ruleId: "manual_block",
      details: { ip: input.ip, reason: input.reason, by: input.blockedBy },
    });

    return rowToDenylist(row);
  } catch (err: any) {
    logHealth({
      component: "IPSurveillance",
      status: "error",
      error: `addToDenylist failed: ${err.message}`,
    });
    throw err;
  }
}

/**
 * Remove an IP from the denylist (soft delete by setting inactive).
 */
export function removeFromDenylist(ip: string): boolean {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  try {
    const result = db.run(
      "UPDATE ip_denylist SET is_active = 0, updated_at = ? WHERE ip_address = ?",
      [now, ip]
    );

    return result.changes > 0;
  } catch (err: any) {
    logHealth({
      component: "IPSurveillance",
      status: "error",
      error: `removeFromDenylist failed: ${err.message}`,
    });
    return false;
  }
}

/**
 * List denylist entries with optional filtering.
 */
export function listDenylist(opts: {
  active?: boolean;
  listType?: string;
  limit?: number;
  offset?: number;
} = {}): { items: IPDenylistEntry[]; total: number } {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const conditions: string[] = ["1=1"];
  const params: SQLQueryBindings[] = [];

  if (opts.active !== undefined) {
    conditions.push("is_active = ?");
    params.push(opts.active ? 1 : 0);
  }
  if (opts.listType) {
    conditions.push("list_type = ?");
    params.push(opts.listType);
  }

  const whereClause = conditions.join(" AND ");

  const countRow = db
    .query(`SELECT COUNT(*) as total FROM ip_denylist WHERE ${whereClause}`)
    .get(...params) as { total: number } | null;

  let sql = `SELECT * FROM ip_denylist WHERE ${whereClause} ORDER BY created_at DESC`;
  if (opts.limit) {
    sql += " LIMIT ?";
    params.push(opts.limit);
  }
  if (opts.offset) {
    sql += " OFFSET ?";
    params.push(opts.offset);
  }

  const rows = db.query(sql).all(...params) as Record<string, unknown>[];

  return {
    items: rows.map(rowToDenylist),
    total: countRow?.total || 0,
  };
}

// ---------------------------------------------------------------------------
// IP Flags
// ---------------------------------------------------------------------------

/**
 * Get all IP flags for a player.
 */
export function getIPFlags(playerId: string): IPFlag[] {
  const db = getDb();

  const rows = db
    .query("SELECT * FROM ip_flags WHERE player_id = ? ORDER BY created_at DESC")
    .all(playerId) as Record<string, unknown>[];

  return rows.map(rowToFlag);
}

/**
 * Create an IP flag manually or via automation.
 */
export function createIPFlag(input: {
  ip: string;
  playerId: string;
  agentLogin: string;
  flagType: string;
  severity: IPFlag["severity"];
  description: string;
  evidence?: Record<string, unknown>;
}): IPFlag {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  db.run(
    `INSERT INTO ip_flags
     (ip_address, player_id, agent_login, flag_type, severity, description, evidence_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.ip,
      input.playerId,
      input.agentLogin,
      input.flagType,
      input.severity,
      input.description,
      JSON.stringify(input.evidence || {}),
      now,
      now,
    ]
  );

  const row = db
    .query("SELECT * FROM ip_flags WHERE ip_address = ? AND player_id = ? ORDER BY id DESC LIMIT 1")
    .get(input.ip, input.playerId) as Record<string, unknown>;

  return rowToFlag(row);
}

// ---------------------------------------------------------------------------
// Auto-Flag Shared IPs (Cron job — runs every 15 minutes)
// ---------------------------------------------------------------------------

/**
 * Automatically flag IPs shared by multiple players.
 * Called by cron job every 15 minutes.
 */
export function flagSharedIPs(): { flagged: number; errors: number } {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  let flagged = 0;
  let errors = 0;

  try {
    // Find IPs shared by more than 1 player
    const sharedIPs = db
      .query(
        `SELECT ip_address, COUNT(DISTINCT player_id) as player_count,
         GROUP_CONCAT(DISTINCT player_id) as player_ids,
         GROUP_CONCAT(DISTINCT agent_login) as agent_logins
         FROM ip_tracking
         WHERE ip_address NOT IN (
           SELECT ip_address FROM ip_denylist WHERE is_active = 1
         )
         GROUP BY ip_address
         HAVING player_count > 1`
      )
      .all() as Array<{
        ip_address: string;
        player_count: number;
        player_ids: string;
        agent_logins: string;
      }>;

    for (const row of sharedIPs) {
      try {
        // Check if already flagged
        const existingFlag = db
          .query(
            "SELECT 1 FROM ip_flags WHERE ip_address = ? AND flag_type = 'shared_ip' AND is_active = 1"
          )
          .get(row.ip_address) as { "1": number } | null;

        if (existingFlag) continue;

        const playerIds = row.player_ids.split(",");
        const agentLogins = row.agent_logins.split(",");

        for (let i = 0; i < playerIds.length; i++) {
          createIPFlag({
            ip: row.ip_address,
            playerId: playerIds[i],
            agentLogin: agentLogins[i] || agentLogins[0],
            flagType: "shared_ip",
            severity: row.player_count > 3 ? "high" : "medium",
            description: `IP ${row.ip_address} shared by ${row.player_count} players`,
            evidence: {
              playerCount: row.player_count,
              playerIds,
              detectedAt: new Date().toISOString(),
            },
          });
        }

        flagged++;
      } catch (err: any) {
        errors++;
      }
    }

    logCron({
      jobName: "ip_surveillance",
      recordsProcessed: sharedIPs.length,
      durationMs: 0,
      error: errors > 0 ? `${errors} flag errors` : undefined,
    });

    return { flagged, errors };
  } catch (err: any) {
    logHealth({
      component: "IPSurveillance",
      status: "error",
      error: `flagSharedIPs failed: ${err.message}`,
    });
    return { flagged, errors: errors + 1 };
  }
}

// ---------------------------------------------------------------------------
// Listing / Queries
// ---------------------------------------------------------------------------

/**
 * List tracked IPs with optional filtering.
 */
export function listTrackedIPs(opts: {
  ip?: string;
  playerId?: string;
  flagged?: boolean;
  limit?: number;
  offset?: number;
} = {}): { items: IPTracking[]; total: number } {
  const db = getDb();
  const conditions: string[] = ["1=1"];
  const params: SQLQueryBindings[] = [];

  if (opts.ip) {
    conditions.push("ip_address = ?");
    params.push(opts.ip);
  }
  if (opts.playerId) {
    conditions.push("player_id = ?");
    params.push(opts.playerId);
  }

  const whereClause = conditions.join(" AND ");

  const countRow = db
    .query(`SELECT COUNT(*) as total FROM ip_tracking WHERE ${whereClause}`)
    .get(...params) as { total: number } | null;

  let sql = `SELECT * FROM ip_tracking WHERE ${whereClause} ORDER BY last_seen_at DESC`;
  if (opts.limit) {
    sql += " LIMIT ?";
    params.push(opts.limit);
  }
  if (opts.offset) {
    sql += " OFFSET ?";
    params.push(opts.offset);
  }

  const rows = db.query(sql).all(...params) as Record<string, unknown>[];

  let items = rows.map(rowToTracking);

  if (opts.flagged) {
    items = items.filter((item) => item.riskScore > 0);
  }

  return {
    items,
    total: countRow?.total || 0,
  };
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function rowToTracking(row: Record<string, unknown>): IPTracking {
  return {
    id: row.id as number,
    ipAddress: row.ip_address as string,
    playerId: row.player_id as string,
    agentLogin: row.agent_login as string,
    wagerId: row.wager_id as string | undefined,
    firstSeenAt: (row.first_seen_at as number) * 1000,
    lastSeenAt: (row.last_seen_at as number) * 1000,
    sightingCount: (row.sighting_count as number) || 1,
    countryCode: row.country_code as string | undefined,
    regionCode: row.region_code as string | undefined,
    city: row.city as string | undefined,
    isp: row.isp as string | undefined,
    isVpn: (row.is_vpn as number) === 1,
    isProxy: (row.is_proxy as number) === 1,
    isTor: (row.is_tor as number) === 1,
    isMobile: (row.is_mobile as number) === 1,
    riskScore: (row.risk_score as number) || 0,
    metadata: parseJson(row.metadata_json),
    createdAt: (row.created_at as number) * 1000,
    updatedAt: (row.updated_at as number) * 1000,
  };
}

function rowToDenylist(row: Record<string, unknown>): IPDenylistEntry {
  return {
    id: row.id as number,
    ipAddress: row.ip_address as string,
    ipRangeStart: row.ip_range_start as number | undefined,
    ipRangeEnd: row.ip_range_end as number | undefined,
    listType: (row.list_type || "manual") as "manual" | "auto" | "compliance" | "threat_intel",
    reason: row.reason as string,
    source: row.source as string | undefined,
    blockedBy: row.blocked_by as string | undefined,
    expiryAt: row.expiry_at as number | undefined,
    isActive: (row.is_active as number) === 1,
    hitCount: (row.hit_count as number) || 0,
    lastHitAt: row.last_hit_at as number | undefined,
    metadata: parseJson(row.metadata_json),
    createdAt: (row.created_at as number) * 1000,
    updatedAt: (row.updated_at as number) * 1000,
  };
}

function rowToFlag(row: Record<string, unknown>): IPFlag {
  return {
    id: row.id as number,
    ipAddress: row.ip_address as string,
    playerId: row.player_id as string,
    agentLogin: row.agent_login as string,
    flagType: row.flag_type as string,
    severity: (row.severity as IPFlag["severity"]) || "medium",
    description: row.description as string,
    evidence: parseJson(row.evidence_json),
    resolution: row.resolution as string | undefined,
    resolvedBy: row.resolved_by as string | undefined,
    resolvedAt: row.resolved_at as number | undefined,
    isActive: (row.is_active as number) === 1,
    metadata: parseJson(row.metadata_json),
    createdAt: (row.created_at as number) * 1000,
    updatedAt: (row.updated_at as number) * 1000,
  };
}

function parseJson(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, unknown>;
  try {
    return JSON.parse(value as string) as Record<string, unknown>;
  } catch {
    return {};
  }
}
