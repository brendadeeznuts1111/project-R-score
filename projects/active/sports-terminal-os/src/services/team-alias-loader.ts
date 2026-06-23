/**
 * Team Alias Loader
 *
 * Hydrates the alias map used by OddsDriftEngine from the
 * source_team_aliases database table. Runs once at startup
 * and optionally on a hot-reload interval.
 *
 * Used by:
 *   - initOddsDriftEngine() (startup wiring)
 *   - Partner profile hot-reload (TOMLEngine → aliases reload)
 */

import { getDb } from "../db/index";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AliasRow {
  canonical_team: string;
  alias: string;
  source: string;
  verified: number;
  score: number;
}

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

let cachedAliasMap: Map<string, string> = new Map();
let cachedCanonicalTeams: string[] = [];
let lastLoadedAt = 0;

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

/**
 * Load the alias map and canonical team list from the database.
 * Safe to call multiple times — replaces the in-memory cache.
 */
export function loadAliasMap(): { aliasMap: Map<string, string>; canonicalTeams: string[] } {
  const db = getDb();

  // Query all verified aliases
  const rows = db
    .query(
      `SELECT canonical_team, alias, source, verified, score
       FROM source_team_aliases
       ORDER BY verified DESC, score DESC`
    )
    .all() as AliasRow[];

  const aliasMap = new Map<string, string>();
  const canonicalSet = new Set<string>();

  for (const row of rows) {
    const normAlias = normalizeTeamName(row.alias);
    const normCanonical = normalizeTeamName(row.canonical_team);

    // Only add if not already mapped (first-wins: verified + score DESC)
    if (!aliasMap.has(normAlias)) {
      aliasMap.set(normAlias, row.canonical_team);
    }

    canonicalSet.add(row.canonical_team);
  }

  // Derive canonical team list from the alias table + any additional
  // canonical names that appear as values but not keys
  const canonicalTeams = [...canonicalSet];

  // Update cache
  cachedAliasMap = aliasMap;
  cachedCanonicalTeams = canonicalTeams;
  lastLoadedAt = Date.now();

  return { aliasMap, canonicalTeams };
}

// ---------------------------------------------------------------------------
// Cache accessors
// ---------------------------------------------------------------------------

/**
 * Get the currently-cached alias map. Returns empty map if not loaded.
 */
export function getAliasMap(): Map<string, string> {
  return new Map(cachedAliasMap);
}

/**
 * Get the currently-cached canonical team list. Returns empty array if not loaded.
 */
export function getCanonicalTeams(): string[] {
  return [...cachedCanonicalTeams];
}

/**
 * When the alias cache was last loaded (epoch ms). 0 if never loaded.
 */
export function getAliasLoadTimestamp(): number {
  return lastLoadedAt;
}

/**
 * Number of aliases currently cached.
 */
export function getAliasCount(): number {
  return cachedAliasMap.size;
}

// ---------------------------------------------------------------------------
// Hot-reload
// ---------------------------------------------------------------------------

/**
 * Interval (ms) between hot-reload refreshes. 0 = disabled.
 * Controlled by environment variable for easy tuning.
 */
const HOT_RELOAD_INTERVAL_MS = parseInt(
  process.env.TEAM_ALIAS_HOT_RELOAD_MS ?? "0",
  10
);

let reloadTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start periodic hot-reload of the alias map.
 * Safe to call even if already running.
 */
export function startAliasHotReload(): void {
  if (HOT_RELOAD_INTERVAL_MS <= 0) return;
  if (reloadTimer) return;

  reloadTimer = setInterval(() => {
    try {
      loadAliasMap();
    } catch {
      // Best-effort — keep serving stale cache on error
    }
  }, HOT_RELOAD_INTERVAL_MS);
}

/**
 * Stop hot-reload (called during graceful shutdown).
 */
export function stopAliasHotReload(): void {
  if (reloadTimer) {
    clearInterval(reloadTimer);
    reloadTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeTeamName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "-");
}
