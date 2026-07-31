// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * State-level regulatory compliance (MA / NJ) + granular geo dimensions.
 *
 * Geo columns are **always separate** — never packed into one string/JSON for filters:
 *   state_code | age | location | zip_code
 *
 * Isolation: license/violation/scope rows filter by discrete columns only
 * inside this module / ScopedRepository — no raw dimension filters at call sites.
 */
import type { Database } from 'bun:sqlite';
import {
  asStateCode,
  asTreeNodeId,
  asZipCode,
  tryZipCode,
  type StateCode,
  type TreeNodeId,
  type ZipCode,
} from '../types/branded.ts';
import { REGULATED_STATE_CODES } from '../types/branded/operations.ts';
import {
  findRegulationPolicy,
  findRegulationPolicyForDimensions,
  isPolicyEffective,
  REGULATION_POLICY_CATALOG,
  resolveRegulationPolicy,
} from './regulation-policy-catalog.ts';

// ── Schema ─────────────────────────────────────────────────────────

/**
 * Discrete geo/demographic columns.
 * Order is intentional for docs/UX: state → age → location → zip.
 */
export const GEO_DIMENSION_COLUMNS = [
  ['state_code', 'TEXT'],
  ['age', 'INTEGER'],
  ['location', 'TEXT'],
  ['zip_code', 'TEXT'],
] as const;

export type GeoDimensions = {
  stateCode?: StateCode | null;
  /** Whole years (e.g. 21). Null = unknown — not packed into location. */
  age?: number | null;
  /** Locality / city only — not "City, ST 02101". */
  location?: string | null;
  /** US ZIP or ZIP+4 — discrete from location. */
  zipCode?: ZipCode | string | null;
};

const GEO_SURFACE_TABLES = [
  'plays',
  'play_distribution',
  'play_analysis',
  'market_snapshots',
  'play_zip_enrichment',
  'regulatory_violations',
] as const;

function tableExists(db: Database, name: string): boolean {
  const row = db
    .query(`SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = $n`)
    .get({ $n: name }) as { ok: number } | null;
  return row != null;
}

function columnNames(db: Database, table: string): Set<string> {
  return new Set(
    (db.query(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(c => c.name)
  );
}

/** Ensure each discrete geo column exists on a table (idempotent ALTER). */
function ensureGeoColumns(db: Database, table: string): void {
  if (!tableExists(db, table)) return;
  const cols = columnNames(db, table);
  for (const [name, def] of GEO_DIMENSION_COLUMNS) {
    if (!cols.has(name)) {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`);
    }
  }
}

/** Add geo columns + regulatory tables (idempotent). */
export function ensureStateRegulationSchema(db: Database): void {
  // Dedicated enrichment surface (create before column ensure).
  db.run(`
    CREATE TABLE IF NOT EXISTS play_zip_enrichment (
      play_id TEXT NOT NULL,
      node_id TEXT NOT NULL REFERENCES tree_nodes(id),
      state_code TEXT,
      age INTEGER,
      location TEXT,
      zip_code TEXT,
      enriched_at TEXT NOT NULL,
      PRIMARY KEY (play_id, node_id)
    );
    CREATE INDEX IF NOT EXISTS idx_play_zip_enrich_node_state
      ON play_zip_enrichment(node_id, state_code);
    CREATE INDEX IF NOT EXISTS idx_play_zip_enrich_zip
      ON play_zip_enrichment(zip_code);
  `);

  for (const table of GEO_SURFACE_TABLES) {
    ensureGeoColumns(db, table);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS regulatory_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      policy_key TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      state_code TEXT NOT NULL,
      sport_id TEXT NOT NULL,
      market_id TEXT NOT NULL,
      -- NULL = global state rule; set = partner-specific override
      node_id TEXT REFERENCES tree_nodes(id),
      max_wager REAL,
      min_wager REAL DEFAULT 0,
      allowed_bet_types TEXT,
      special_rules TEXT,
      effective_from INTEGER NOT NULL DEFAULT (unixepoch()),
      effective_to INTEGER,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_reg_limits_state
      ON regulatory_limits(state_code, sport_id, market_id, effective_from);

    CREATE TABLE IF NOT EXISTS partner_state_licenses (
      node_id TEXT NOT NULL REFERENCES tree_nodes(id),
      state_code TEXT NOT NULL,
      license_number TEXT,
      status TEXT NOT NULL CHECK(status IN ('active', 'suspended', 'revoked')),
      granted_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (node_id, state_code)
    );

    CREATE TABLE IF NOT EXISTS regulatory_violations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id TEXT NOT NULL REFERENCES tree_nodes(id),
      play_id TEXT,
      state_code TEXT NOT NULL,
      age INTEGER,
      location TEXT,
      zip_code TEXT,
      reason TEXT NOT NULL,
      details TEXT,
      blocked_at INTEGER DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_reg_violations_node_state
      ON regulatory_violations(node_id, state_code, blocked_at);

    -- Partner-level geo profile: four discrete columns (state, age, location, zip).
    CREATE TABLE IF NOT EXISTS partner_geo_profiles (
      node_id TEXT PRIMARY KEY REFERENCES tree_nodes(id),
      state_code TEXT NOT NULL,
      age INTEGER,
      location TEXT,
      zip_code TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_partner_geo_state ON partner_geo_profiles(state_code);
    CREATE INDEX IF NOT EXISTS idx_partner_geo_zip ON partner_geo_profiles(zip_code);
  `);

  // Legacy DBs created regulatory_violations without geo cols — backfill columns.
  ensureGeoColumns(db, 'regulatory_violations');
  const limitColumns = columnNames(db, 'regulatory_limits');
  if (!limitColumns.has('policy_key')) {
    db.run(`ALTER TABLE regulatory_limits ADD COLUMN policy_key TEXT`);
  }
  if (!limitColumns.has('status')) {
    db.run(`ALTER TABLE regulatory_limits ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`);
  }
  if (!limitColumns.has('updated_at')) {
    db.run(`ALTER TABLE regulatory_limits ADD COLUMN updated_at TEXT`);
  }
  db.run(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_limits_policy_key
     ON regulatory_limits(policy_key) WHERE policy_key IS NOT NULL`
  );
}

// ── Catalog normalization (play wire → regulatory keys) ────────────

const SPORT_CATALOG: Record<string, string> = {
  nba: 'basketball',
  wnba: 'basketball',
  ncaab: 'basketball',
  cbb: 'basketball',
  basketball: 'basketball',
  soccer: 'soccer',
  football: 'soccer', // association football alias
  epl: 'soccer',
  mls: 'soccer',
  ucl: 'soccer',
  nfl: 'american_football',
  ncaaf: 'american_football',
  mlb: 'baseball',
  nhl: 'hockey',
};

const MARKET_CATALOG: Record<string, string> = {
  totals: 'over_under',
  total: 'over_under',
  ou: 'over_under',
  over_under: 'over_under',
  moneyline: 'match_winner',
  ml: 'match_winner',
  h2h: 'match_winner',
  match_winner: 'match_winner',
  spread: 'spread',
  handicap: 'spread',
};

/** Map play.sport (e.g. NBA) → regulatory_limits.sport_id. */
export function normalizeSportCatalogKey(sport: string): string {
  const key = sport.trim().toLowerCase();
  return SPORT_CATALOG[key] ?? key.replace(/\s+/g, '_');
}

/** Map play.market (e.g. totals) → regulatory_limits.market_id. */
export function normalizeMarketCatalogKey(market: string): string {
  const key = market.trim().toLowerCase().replace(/\s+/g, '_');
  return MARKET_CATALOG[key] ?? key;
}

// ── Seeds (MA / NJ reference limits) ───────────────────────────────

/** Materialize the governed MA/NJ reference policy catalog into SQLite. */
export function seedStateRegulations(db: Database): void {
  ensureStateRegulationSchema(db);
  for (const policy of REGULATION_POLICY_CATALOG) {
    const resolved = resolveRegulationPolicy(policy);
    const effectiveFrom = Math.floor(
      new Date(`${policy.effectiveDate}T00:00:00.000Z`).getTime() / 1000
    );
    const effectiveTo = policy.expirationDate
      ? Math.floor(new Date(`${policy.expirationDate}T00:00:00.000Z`).getTime() / 1000)
      : null;
    const rules = JSON.stringify({
      ...(resolved.dailyLimit == null ? {} : { max_daily_total: resolved.dailyLimit }),
      ...(resolved.weeklyLimit == null ? {} : { max_weekly_total: resolved.weeklyLimit }),
      min_age: resolved.playerAgeMin,
      require_identity_verification: resolved.identityRequired,
    });
    const existing = db
      .query(
        `SELECT id FROM regulatory_limits
         WHERE state_code = $st AND sport_id = $sp AND market_id = $mk
           AND node_id IS NULL
         LIMIT 1`
      )
      .get({
        $st: policy.jurisdiction,
        $sp: policy.sport,
        $mk: policy.market,
      }) as { id: number } | null; // brand-ok — SQLite row primary key
    if (existing) {
      db.run(
        `UPDATE regulatory_limits
         SET policy_key = $key, status = $status, max_wager = $max, min_wager = $min,
             allowed_bet_types = $types, special_rules = $rules,
             effective_from = $from, effective_to = $to, updated_at = datetime('now')
         WHERE id = $id`,
        {
          $key: policy.key,
          $status: policy.status,
          $max: policy.maxBet,
          $min: policy.minBet,
          $types: JSON.stringify(policy.allowedBetTypes),
          $rules: rules,
          $from: effectiveFrom,
          $to: effectiveTo,
          $id: existing.id,
        }
      );
      continue;
    }
    db.run(
      `INSERT INTO regulatory_limits (
         policy_key, status, state_code, sport_id, market_id, node_id,
         max_wager, min_wager, allowed_bet_types, special_rules,
         effective_from, effective_to, updated_at
       ) VALUES ($key, $status, $st, $sp, $mk, NULL, $max, $min, $types, $rules,
                 $from, $to, datetime('now'))`,
      {
        $key: policy.key,
        $status: policy.status,
        $st: policy.jurisdiction,
        $sp: policy.sport,
        $mk: policy.market,
        $max: policy.maxBet,
        $min: policy.minBet,
        $types: JSON.stringify(policy.allowedBetTypes),
        $rules: rules,
        $from: effectiveFrom,
        $to: effectiveTo,
      }
    );
  }
}

// ── Scope + repository ─────────────────────────────────────────────

export type Scope = {
  nodeId: TreeNodeId;
  /** When set → filter state_code (exact). */
  state?: StateCode | null;
  /** When set → filter age (exact whole years). */
  age?: number | null;
  /** When set → filter location (exact locality string). */
  location?: string | null;
  /** When set → filter zip_code (exact). */
  zip?: ZipCode | string | null;
  country?: string | null;
  sport?: string | null;
  market?: string | null;
};

/** Dimension columns that must not appear as raw filters outside scope injection. */
const SCOPED_DIMENSIONS = [
  'node_id',
  'state_code',
  'age',
  'location',
  'zip_code',
  'country_code',
  'sport_id',
  'market_id',
] as const;

/**
 * Repository that injects partner + optional geo/sport scope into every query.
 * Rejects SQL that already filters on scoped dimensions (no raw dimension leaks).
 */
export class ScopedRepository {
  constructor(
    private readonly db: Database,
    private readonly scope: Scope
  ) {}

  private scopeParams(): Record<string, string | number> {
    const p: Record<string, string | number> = { $scope_node_id: this.scope.nodeId };
    if (this.scope.state) p.$scope_state_code = this.scope.state;
    if (this.scope.age != null && Number.isFinite(this.scope.age)) {
      p.$scope_age = Math.trunc(this.scope.age);
    }
    if (this.scope.location?.trim()) p.$scope_location = this.scope.location.trim();
    if (this.scope.zip) {
      const z = tryZipCode(String(this.scope.zip)) ?? String(this.scope.zip).trim();
      if (z) p.$scope_zip_code = z;
    }
    if (this.scope.country) p.$scope_country_code = this.scope.country;
    if (this.scope.sport) p.$scope_sport_id = this.scope.sport;
    if (this.scope.market) p.$scope_market_id = this.scope.market;
    return p;
  }

  private injectScope(sql: string): string {
    const stripped = sql.replace(/\([^()]*\)/g, '');
    for (const dim of SCOPED_DIMENSIONS) {
      const re = new RegExp(`${dim}\\s*=\\s*[$@:?]`, 'i');
      if (re.test(stripped) && !sql.includes('/*scope-injected*/')) {
        throw new Error(
          `Direct dimension filter detected (${dim}); use ScopedRepository scope only`
        );
      }
    }

    const parts = ['node_id = $scope_node_id'];
    if (this.scope.state) parts.push('state_code = $scope_state_code');
    if (this.scope.age != null && Number.isFinite(this.scope.age)) {
      parts.push('age = $scope_age');
    }
    if (this.scope.location?.trim()) parts.push('location = $scope_location');
    if (this.scope.zip) parts.push('zip_code = $scope_zip_code');
    if (this.scope.country) parts.push('country_code = $scope_country_code');
    if (this.scope.sport) parts.push('sport_id = $scope_sport_id');
    if (this.scope.market) parts.push('market_id = $scope_market_id');

    const fullWhere = `WHERE ${parts.join(' AND ')} /*scope-injected*/ `;
    if (/WHERE\s+/i.test(sql)) {
      return sql.replace(/WHERE\s+/i, fullWhere);
    }
    return sql.replace(/\s*(ORDER\s+BY|LIMIT|GROUP\s+BY|HAVING|$)/i, ` ${fullWhere}$1`);
  }

  all<T = Record<string, unknown>>(sql: string, params: Record<string, unknown> = {}): T[] {
    return this.db.query(this.injectScope(sql)).all({ ...this.scopeParams(), ...params }) as T[];
  }

  get<T = Record<string, unknown>>(sql: string, params: Record<string, unknown> = {}): T | null {
    return this.db
      .query(this.injectScope(sql))
      .get({ ...this.scopeParams(), ...params }) as T | null;
  }

  run(sql: string, params: Record<string, unknown> = {}): void {
    this.db.run(this.injectScope(sql), { ...this.scopeParams(), ...params });
  }
}

// ── Partner geo profile (state | age | location | zip) ──────────────

export type PartnerGeoProfile = {
  nodeId: TreeNodeId;
  stateCode: StateCode;
  age: number | null;
  location: string | null;
  zipCode: ZipCode | null;
  updatedAt: string;
};

/** Upsert discrete geo columns for a partner — never merges into a single blob. */
export function upsertPartnerGeoProfile(
  db: Database,
  nodeId: TreeNodeId | string,
  geo: {
    stateCode: StateCode | string;
    age?: number | null;
    location?: string | null;
    zipCode?: ZipCode | string | null;
  }
): PartnerGeoProfile {
  ensureStateRegulationSchema(db);
  const nid = asTreeNodeId(nodeId);
  const state = asStateCode(geo.stateCode);
  const age = geo.age == null || !Number.isFinite(geo.age) ? null : Math.trunc(Number(geo.age));
  if (age != null && (age < 0 || age > 150)) {
    throw new Error(`partner-geo: invalid age ${age}`);
  }
  const location = geo.location?.trim() || null;
  // Guard: location must not smuggle zip/state ("Boston, MA 02108" is wrong shape).
  if (location && /\b\d{5}(-\d{4})?\b/.test(location)) {
    throw new Error('partner-geo: location must not contain a ZIP — use discrete zipCode column');
  }
  let zip: string | null = null;
  if (geo.zipCode != null && String(geo.zipCode).trim()) {
    zip = asZipCode(String(geo.zipCode));
  }
  const updatedAt = new Date().toISOString();
  db.run(
    `INSERT INTO partner_geo_profiles (node_id, state_code, age, location, zip_code, updated_at)
     VALUES ($nid, $st, $age, $loc, $zip, $upd)
     ON CONFLICT(node_id) DO UPDATE SET
       state_code = excluded.state_code,
       age = excluded.age,
       location = excluded.location,
       zip_code = excluded.zip_code,
       updated_at = excluded.updated_at`,
    {
      $nid: nid,
      $st: state,
      $age: age,
      $loc: location,
      $zip: zip,
      $upd: updatedAt,
    }
  );
  return {
    nodeId: nid,
    stateCode: state,
    age,
    location,
    zipCode: zip as ZipCode | null,
    updatedAt,
  };
}

export function getPartnerGeoProfile(
  db: Database,
  nodeId: TreeNodeId | string
): PartnerGeoProfile | null {
  ensureStateRegulationSchema(db);
  const nid = asTreeNodeId(nodeId);
  const row = db
    .query(
      `SELECT node_id, state_code, age, location, zip_code, updated_at
       FROM partner_geo_profiles WHERE node_id = $nid`
    )
    .get({ $nid: nid }) as {
    node_id: string; // brand-ok — TreeNodeId via asTreeNodeId below
    state_code: string;
    age: number | null;
    location: string | null;
    zip_code: string | null;
    updated_at: string;
  } | null;
  if (!row) return null;
  return {
    nodeId: asTreeNodeId(row.node_id),
    stateCode: asStateCode(row.state_code),
    age: row.age,
    location: row.location,
    zipCode: row.zip_code ? (tryZipCode(row.zip_code) ?? null) : null,
    updatedAt: row.updated_at,
  };
}

/**
 * Stamp discrete geo columns onto play_zip_enrichment (create/replace).
 * Columns stay separate: state_code, age, location, zip_code.
 */
export function upsertPlayZipEnrichment(
  db: Database,
  playId: string, // brand-ok — plays.id
  nodeId: TreeNodeId | string,
  geo: GeoDimensions
): void {
  ensureStateRegulationSchema(db);
  const nid = asTreeNodeId(nodeId);
  const state = geo.stateCode ? asStateCode(geo.stateCode) : null;
  const age = geo.age == null || !Number.isFinite(geo.age) ? null : Math.trunc(Number(geo.age));
  const location = geo.location?.trim() || null;
  if (location && /\b\d{5}(-\d{4})?\b/.test(location)) {
    throw new Error('play-zip-enrichment: location must not contain a ZIP — use discrete zipCode');
  }
  const zip =
    geo.zipCode != null && String(geo.zipCode).trim() ? asZipCode(String(geo.zipCode)) : null;
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO play_zip_enrichment
       (play_id, node_id, state_code, age, location, zip_code, enriched_at)
     VALUES ($pid, $nid, $st, $age, $loc, $zip, $now)
     ON CONFLICT(play_id, node_id) DO UPDATE SET
       state_code = excluded.state_code,
       age = excluded.age,
       location = excluded.location,
       zip_code = excluded.zip_code,
       enriched_at = excluded.enriched_at`,
    {
      $pid: playId,
      $nid: nid,
      $st: state,
      $age: age,
      $loc: location,
      $zip: zip,
      $now: now,
    }
  );
}

// ── Compliance ─────────────────────────────────────────────────────

export type BetComplianceInput = {
  nodeId: TreeNodeId | string;
  stateCode: StateCode | string;
  /** Sport wire or catalog key — normalized via {@link normalizeSportCatalogKey}. */
  sportId: string; // brand-ok — sport catalog key on wire
  /** Market wire or catalog key — normalized via {@link normalizeMarketCatalogKey}. */
  marketId: string; // brand-ok — market catalog key on wire
  wagerAmount: number;
  betType: string;
  /** When true (default), map NBA→basketball, totals→over_under, etc. */
  normalizeCatalog?: boolean;
  /** Whole years; falls back to partner_geo_profiles.age when omitted. */
  age?: number | null;
  /** Locality only; falls back to partner profile. Must not embed ZIP. */
  location?: string | null;
  /** Discrete ZIP; falls back to partner profile. */
  zipCode?: ZipCode | string | null;
  /** Optional account tier for governed tiered max-bet overrides. */
  accountTier?: string;
  /** Exclusion groups already present in the pending parlay or event bundle. */
  exclusionGroups?: readonly string[];
};

export type BetComplianceResult =
  | { allowed: true; cappedWagerAmount?: number; warnings?: string[] }
  | { allowed: false; reason: string };

export type SpecialRules = {
  max_daily_total?: number;
  max_weekly_total?: number;
  require_identity_verification?: boolean;
  /** Minimum legal age for wagers (MA/NJ sports: 21). */
  min_age?: number;
  /** Optional zip prefixes allowed in-state (e.g. ["021","022"] for Boston area demos). */
  allowed_zip_prefixes?: string[];
};

type LimitsRow = {
  policy_key: string | null;
  max_wager: number | null;
  min_wager: number | null;
  allowed_bet_types: string | null;
  special_rules: string | null;
};

/** Parse special_rules JSON (fail open to empty object). */
export function parseSpecialRules(raw: string | null | undefined): SpecialRules {
  if (!raw?.trim()) return {};
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    const out: SpecialRules = {};
    if (typeof v.max_daily_total === 'number' && Number.isFinite(v.max_daily_total)) {
      out.max_daily_total = v.max_daily_total;
    }
    if (typeof v.max_weekly_total === 'number' && Number.isFinite(v.max_weekly_total)) {
      out.max_weekly_total = v.max_weekly_total;
    }
    if (v.require_identity_verification === true) {
      out.require_identity_verification = true;
    }
    if (typeof v.min_age === 'number' && Number.isFinite(v.min_age)) {
      out.min_age = Math.trunc(v.min_age);
    }
    if (Array.isArray(v.allowed_zip_prefixes)) {
      out.allowed_zip_prefixes = v.allowed_zip_prefixes
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map(x => x.trim());
    }
    return out;
  } catch {
    return {};
  }
}

/** Resolve age/location/zip from request, else partner_geo_profiles. */
export function resolveGeoForNode(
  db: Database,
  nodeId: TreeNodeId | string,
  input?: Pick<BetComplianceInput, 'age' | 'location' | 'zipCode' | 'stateCode'>
): {
  age: number | null;
  location: string | null;
  zipCode: string | null;
  stateCode: StateCode | null;
} {
  const profile = getPartnerGeoProfile(db, nodeId);
  const age =
    input?.age != null && Number.isFinite(input.age)
      ? Math.trunc(Number(input.age))
      : (profile?.age ?? null);
  const location = input?.location?.trim() || profile?.location || null;
  const zipRaw = input?.zipCode != null ? String(input.zipCode).trim() : profile?.zipCode;
  const zipCode = zipRaw ? (tryZipCode(zipRaw) ?? zipRaw) : null;
  const stateCode = input?.stateCode ? asStateCode(input.stateCode) : (profile?.stateCode ?? null);
  return { age, location, zipCode, stateCode };
}

/**
 * Partner identity verification from profile metadata.
 * Accepts identity_verified | identityVerified | kyc_verified boolean flags.
 */
export function isPartnerIdentityVerified(db: Database, nodeId: TreeNodeId | string): boolean {
  const nid = asTreeNodeId(nodeId);
  const row = db
    .query(`SELECT metadata_json FROM partner_profile_bindings WHERE tree_node_id = $id`)
    .get({ $id: nid }) as { metadata_json: string | null } | null;
  if (!row?.metadata_json) return false;
  try {
    const meta = JSON.parse(row.metadata_json) as Record<string, unknown>;
    return (
      meta.identity_verified === true ||
      meta.identityVerified === true ||
      meta.kyc_verified === true
    );
  } catch {
    return false;
  }
}

/** Stamp identity_verified into partner profile metadata (repository layer). */
export function setPartnerIdentityVerified(
  db: Database,
  nodeId: TreeNodeId | string,
  verified: boolean
): void {
  const nid = asTreeNodeId(nodeId);
  const row = db
    .query(`SELECT metadata_json FROM partner_profile_bindings WHERE tree_node_id = $id`)
    .get({ $id: nid }) as { metadata_json: string | null } | null;
  let meta: Record<string, unknown> = {};
  if (row?.metadata_json) {
    try {
      meta = JSON.parse(row.metadata_json) as Record<string, unknown>;
    } catch {
      meta = {};
    }
  }
  meta.identity_verified = verified;
  const now = new Date().toISOString();
  db.run(
    `UPDATE partner_profile_bindings
     SET metadata_json = $meta, updated_at = $now
     WHERE tree_node_id = $id`,
    { $meta: JSON.stringify(meta), $now: now, $id: nid }
  );
}

/**
 * Sum stake_actual for a partner in a state since local day start.
 * Uses play_distribution.state_code when set, else plays.state_code.
 */
export function sumDailyStateWagerVolume(
  db: Database,
  nodeId: TreeNodeId | string,
  stateCode: StateCode | string
): number {
  const nid = asTreeNodeId(nodeId);
  const st = asStateCode(stateCode);
  const row = db
    .query(
      `SELECT COALESCE(SUM(d.stake_actual), 0) AS total
       FROM play_distribution d
       LEFT JOIN plays p ON p.id = d.play_id
       WHERE d.node_id = $nid
         AND COALESCE(d.state_code, p.state_code) = $st
         AND d.received_at >= datetime('now', 'start of day')
         AND COALESCE(d.ack_status, d.status, 'pending') NOT IN ('passed', 'skipped', 'missed')`
    )
    .get({ $nid: nid, $st: st }) as { total: number };
  return Number(row?.total ?? 0);
}

export function sumRollingStateWagerVolume(
  db: Database,
  nodeId: TreeNodeId | string,
  stateCode: StateCode | string,
  days: number
): number {
  const nid = asTreeNodeId(nodeId);
  const st = asStateCode(stateCode);
  const safeDays = Math.max(1, Math.min(31, Math.trunc(days)));
  const row = db
    .query(
      `SELECT COALESCE(SUM(d.stake_actual), 0) AS total
       FROM play_distribution d
       LEFT JOIN plays p ON p.id = d.play_id
       WHERE d.node_id = $nid
         AND COALESCE(d.state_code, p.state_code) = $st
         AND d.received_at >= datetime('now', $window)
         AND COALESCE(d.ack_status, d.status, 'pending') NOT IN ('passed', 'skipped', 'missed')`
    )
    .get({ $nid: nid, $st: st, $window: `-${safeDays} days` }) as { total: number };
  return Number(row?.total ?? 0);
}

export class ComplianceRepository {
  constructor(private readonly db: Database) {
    ensureStateRegulationSchema(db);
  }

  /**
   * Validate a wager against partner license + state limits.
   * Prefer partner-specific limit rows when present; else global state rules.
   * Sport/market wire values are normalized to catalog keys by default.
   */
  isBetAllowed(params: BetComplianceInput): BetComplianceResult {
    const nodeId = asTreeNodeId(params.nodeId);
    const stateCode = asStateCode(params.stateCode);
    const sportId =
      params.normalizeCatalog === false ? params.sportId : normalizeSportCatalogKey(params.sportId);
    const marketId =
      params.normalizeCatalog === false
        ? params.marketId
        : normalizeMarketCatalogKey(params.marketId);

    const geo = resolveGeoForNode(this.db, nodeId, params);

    const license = this.db
      .query(
        `SELECT status FROM partner_state_licenses
         WHERE node_id = $nid AND state_code = $st`
      )
      .get({ $nid: nodeId, $st: stateCode }) as { status: string } | null;

    if (!license || license.status !== 'active') {
      return { allowed: false, reason: `Partner not licensed in ${stateCode}` };
    }

    const now = Math.floor(Date.now() / 1000);
    const limits = this.db
      .query(
        `SELECT policy_key, max_wager, min_wager, allowed_bet_types, special_rules
         FROM regulatory_limits
         WHERE state_code = $st AND sport_id = $sp AND market_id = $mk
           AND (node_id IS NULL OR node_id = $nid)
           AND effective_from <= $now
           AND (effective_to IS NULL OR effective_to > $now)
           AND COALESCE(status, 'active') = 'active'
         ORDER BY CASE WHEN node_id IS NOT NULL THEN 0 ELSE 1 END,
                  effective_from DESC
         LIMIT 1`
      )
      .get({
        $st: stateCode,
        $sp: sportId,
        $mk: marketId,
        $nid: nodeId,
        $now: now,
      }) as LimitsRow | null;

    if (!limits) {
      // No explicit rule → still enforce default legal age when age known
      if (geo.age != null && geo.age < 21) {
        return { allowed: false, reason: `Minimum age 21 required in ${stateCode}` };
      }
      return { allowed: true };
    }

    const governed =
      (limits.policy_key ? findRegulationPolicy(limits.policy_key) : null) ??
      findRegulationPolicyForDimensions({
        jurisdiction: stateCode,
        sport: sportId,
        market: marketId,
        treeNodeId: nodeId,
      });
    const activeGoverned =
      governed && isPolicyEffective(governed, new Date(now * 1000)) ? governed : null;
    const tierLimit = activeGoverned?.tieredLimits.find(
      tier => tier.tier === params.accountTier
    )?.maxBet;
    const effectiveMax = tierLimit ?? limits.max_wager;
    if (effectiveMax != null && params.wagerAmount > effectiveMax) {
      if (activeGoverned?.enforcementAction === 'cap') {
        return { allowed: true, cappedWagerAmount: effectiveMax };
      }
      if (
        activeGoverned?.enforcementAction === 'warn' ||
        activeGoverned?.enforcementAction === 'report'
      ) {
        return {
          allowed: true,
          warnings: [`Exceeds governed max wager $${effectiveMax}`],
        };
      }
      return { allowed: false, reason: `Exceeds max wager $${effectiveMax}` };
    }
    if (limits.min_wager != null && params.wagerAmount < limits.min_wager) {
      return { allowed: false, reason: `Below min wager $${limits.min_wager}` };
    }

    let allowedTypes: string[] = [];
    try {
      allowedTypes = JSON.parse(limits.allowed_bet_types || '[]') as string[];
    } catch {
      allowedTypes = [];
    }
    if (allowedTypes.length > 0 && !allowedTypes.includes(params.betType)) {
      return {
        allowed: false,
        reason: `Bet type '${params.betType}' not allowed in ${stateCode}`,
      };
    }

    const rules = parseSpecialRules(limits.special_rules);
    const identityRequired =
      activeGoverned?.identityRequired ?? rules.require_identity_verification === true;
    if (identityRequired) {
      if (!isPartnerIdentityVerified(this.db, nodeId)) {
        return {
          allowed: false,
          reason: `Identity verification required in ${stateCode}`,
        };
      }
    }
    const minAge = activeGoverned?.playerAgeMin ?? rules.min_age ?? 21;
    if (geo.age != null && geo.age < minAge) {
      return {
        allowed: false,
        reason: `Minimum age ${minAge} required in ${stateCode} (got ${geo.age})`,
      };
    }
    if (rules.allowed_zip_prefixes?.length && geo.zipCode) {
      const ok = rules.allowed_zip_prefixes.some(pfx => String(geo.zipCode).startsWith(pfx));
      if (!ok) {
        return {
          allowed: false,
          reason: `ZIP ${geo.zipCode} not in allowed prefixes for ${stateCode}`,
        };
      }
    }
    if (
      activeGoverned?.exclusionGroups.length &&
      params.exclusionGroups?.some(group => activeGoverned.exclusionGroups.includes(group))
    ) {
      return {
        allowed: false,
        reason: `Policy exclusion group conflict: ${activeGoverned.exclusionGroups.join(', ')}`,
      };
    }
    if (rules.max_daily_total != null && rules.max_daily_total > 0) {
      const used = sumDailyStateWagerVolume(this.db, nodeId, stateCode);
      if (used + params.wagerAmount > rules.max_daily_total) {
        return {
          allowed: false,
          reason: `Exceeds max daily total $${rules.max_daily_total} (used $${used})`,
        };
      }
    }
    const weeklyLimit = activeGoverned?.weeklyLimit ?? rules.max_weekly_total;
    if (weeklyLimit != null && weeklyLimit > 0) {
      const used = sumRollingStateWagerVolume(this.db, nodeId, stateCode, 7);
      if (used + params.wagerAmount > weeklyLimit) {
        return {
          allowed: false,
          reason: `Exceeds rolling weekly total $${weeklyLimit} (used $${used})`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check + log violation when blocked. Used by play dispatcher / HTTP gate.
   */
  checkAndRecord(
    params: BetComplianceInput & { playId?: string /* brand-ok — optional play ref */ }
  ): BetComplianceResult {
    const result = this.isBetAllowed(params);
    if (!result.allowed) {
      const geo = resolveGeoForNode(this.db, params.nodeId, params);
      this.logViolation(params.nodeId, params.stateCode, result.reason, {
        playId: params.playId,
        age: geo.age,
        location: geo.location,
        zipCode: geo.zipCode,
        details: JSON.stringify({
          sportId: params.sportId,
          marketId: params.marketId,
          wagerAmount: params.wagerAmount,
          betType: params.betType,
          age: geo.age,
          location: geo.location,
          zipCode: geo.zipCode,
        }),
      });
    }
    return result;
  }

  /** Record a blocked / violated wager attempt (repository layer). */
  logViolation(
    nodeId: TreeNodeId | string,
    stateCode: StateCode | string,
    reason: string,
    opts?: {
      playId?: string; // brand-ok — optional play ref on audit row
      details?: string;
      age?: number | null;
      location?: string | null;
      zipCode?: string | null;
    }
  ): void {
    const nid = asTreeNodeId(nodeId);
    const st = asStateCode(stateCode);
    this.db.run(
      `INSERT INTO regulatory_violations
         (node_id, play_id, state_code, age, location, zip_code, reason, details, blocked_at)
       VALUES ($nid, $pid, $st, $age, $loc, $zip, $reason, $details, unixepoch())`,
      {
        $nid: nid,
        $pid: opts?.playId ?? null,
        $st: st,
        $age: opts?.age ?? null,
        $loc: opts?.location ?? null,
        $zip: opts?.zipCode ?? null,
        $reason: reason,
        $details: opts?.details ?? null,
      }
    );
  }

  /** Grant or update a partner license for a state. */
  upsertLicense(
    nodeId: TreeNodeId | string,
    stateCode: StateCode | string,
    opts?: { licenseNumber?: string; status?: 'active' | 'suspended' | 'revoked' }
  ): void {
    const nid = asTreeNodeId(nodeId);
    const st = asStateCode(stateCode);
    this.db.run(
      `INSERT INTO partner_state_licenses (node_id, state_code, license_number, status, granted_at)
       VALUES ($nid, $st, $lic, $status, unixepoch())
       ON CONFLICT(node_id, state_code) DO UPDATE SET
         license_number = excluded.license_number,
         status = excluded.status`,
      {
        $nid: nid,
        $st: st,
        $lic: opts?.licenseNumber ?? null,
        $status: opts?.status ?? 'active',
      }
    );
  }
}

// ── Dashboard status ───────────────────────────────────────────────

export type PartnerRegulatoryStatus = {
  state: StateCode;
  license: {
    status: string;
    license_number: string | null;
    granted_at: number | null;
  } | null;
  limits: Array<{
    policy_key: string | null;
    status: string;
    sport_id: string; // brand-ok — regulatory catalog key
    market_id: string; // brand-ok — regulatory catalog key
    max_wager: number | null;
    min_wager: number | null;
    allowed_bet_types: string | null;
    special_rules: string | null;
    node_id: string | null; // brand-ok — optional partner override key
  }>;
  violations: Array<{
    id: number;
    play_id: string | null; // brand-ok — optional play ref from sqlite
    reason: string;
    details: string | null;
    blocked_at: number;
  }>;
};

/** Ops partner dashboard slice for one state (MA/NJ). */
export function getPartnerRegulatoryStatus(
  db: Database,
  nodeId: TreeNodeId | string,
  stateCode: StateCode | string,
  opts?: { sport?: string; market?: string; violationLimit?: number }
): PartnerRegulatoryStatus {
  ensureStateRegulationSchema(db);
  const nid = asTreeNodeId(nodeId);
  const st = asStateCode(stateCode);
  const scope = new ScopedRepository(db, { nodeId: nid, state: st });

  const license = scope.get<{
    status: string;
    license_number: string | null;
    granted_at: number | null;
  }>(`SELECT status, license_number, granted_at FROM partner_state_licenses`);

  const now = Math.floor(Date.now() / 1000);
  // Limits are state-wide (optional partner override) — not pure node-scoped table.
  let limitsSql = `
    SELECT policy_key, status, sport_id, market_id, max_wager, min_wager,
           allowed_bet_types, special_rules, node_id
    FROM regulatory_limits
    WHERE state_code = $st
      AND (node_id IS NULL OR node_id = $nid)
      AND effective_from <= $now
      AND (effective_to IS NULL OR effective_to > $now)
      AND COALESCE(status, 'active') = 'active'
  `;
  const limitParams: Record<string, unknown> = { $st: st, $nid: nid, $now: now };
  if (opts?.sport) {
    limitsSql += ` AND sport_id = $sp`;
    limitParams.$sp = opts.sport;
  }
  if (opts?.market) {
    limitsSql += ` AND market_id = $mk`;
    limitParams.$mk = opts.market;
  }
  limitsSql += ` ORDER BY sport_id, market_id`;
  const limits = db.query(limitsSql).all(limitParams) as PartnerRegulatoryStatus['limits'];

  const violLimit = opts?.violationLimit ?? 20;
  const violations = scope.all<{
    id: number;
    play_id: string | null; // brand-ok — optional play ref from sqlite
    reason: string;
    details: string | null;
    blocked_at: number;
  }>(
    `SELECT id, play_id, reason, details, blocked_at
     FROM regulatory_violations
     ORDER BY blocked_at DESC
     LIMIT $lim`,
    { $lim: violLimit }
  );

  return {
    state: st,
    license: license
      ? {
          status: license.status,
          license_number: license.license_number,
          granted_at: license.granted_at,
        }
      : null,
    limits,
    violations,
  };
}

/** HTML fragment for MA/NJ regulatory panel (ops portal bake-friendly). */
export function renderRegulatoryPanelHtml(status: PartnerRegulatoryStatus): string {
  const licenseLabel = status.license?.status ?? 'none';
  const limitsRows =
    status.limits.length === 0
      ? '<tr><td colspan="5">No active limits</td></tr>'
      : status.limits
          .map(
            l =>
              `<tr><td>${escapeHtml(l.policy_key ?? 'legacy')}</td>` +
              `<td>${escapeHtml(l.sport_id)}</td><td>${escapeHtml(l.market_id)}</td>` +
              `<td>$${l.max_wager ?? '—'}</td><td>${escapeHtml(l.allowed_bet_types ?? '')}</td></tr>`
          )
          .join('');
  const violItems =
    status.violations.length === 0
      ? '<li>None</li>'
      : status.violations
          .map(v => {
            const when = new Date(v.blocked_at * 1000).toISOString();
            return `<li>${escapeHtml(v.reason)} (${when})</li>`;
          })
          .join('');

  return [
    `<h3>Regulatory – ${escapeHtml(status.state)}</h3>`,
    `<p>License Status: ${escapeHtml(licenseLabel)}</p>`,
    `<h4>Active Limits</h4>`,
    `<table><tr><th>Policy</th><th>Sport</th><th>Market</th><th>Max Wager</th><th>Allowed Bet Types</th></tr>`,
    limitsRows,
    `</table>`,
    `<h4>Recent Violations</h4>`,
    `<ul>${violItems}</ul>`,
  ].join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── HTTP helper (Bun Request) ──────────────────────────────────────

export type StateComplianceBody = {
  wagerAmount: number;
  betType: string;
  sportId: string; // brand-ok — wire sport catalog key
  marketId: string; // brand-ok — wire market catalog key
  stateCode: string;
  playId?: string; // brand-ok — optional wire play ref
  nodeId?: string; // brand-ok — optional wire node; minted via asTreeNodeId
};

/**
 * Fail-closed state compliance for bet placement.
 * Returns a 403 Response when blocked; null when allowed.
 */
export async function requireStateCompliance(
  db: Database,
  req: Request,
  opts: { nodeId: TreeNodeId | string }
): Promise<Response | null> {
  const compliance = new ComplianceRepository(db);
  let body: StateComplianceBody;
  try {
    body = (await req.json()) as StateComplianceBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.stateCode || !body.sportId || !body.marketId || body.wagerAmount == null) {
    return Response.json(
      { error: 'stateCode, sportId, marketId, wagerAmount required' },
      { status: 400 }
    );
  }

  const nodeId = body.nodeId ?? opts.nodeId;
  const check = compliance.isBetAllowed({
    nodeId,
    stateCode: body.stateCode,
    sportId: body.sportId,
    marketId: body.marketId,
    wagerAmount: Number(body.wagerAmount),
    betType: body.betType ?? 'straight',
  });

  if (!check.allowed) {
    compliance.logViolation(nodeId, body.stateCode, check.reason, {
      playId: body.playId,
      details: JSON.stringify(body),
    });
    return Response.json({ error: check.reason }, { status: 403 });
  }

  return null;
}

export { REGULATED_STATE_CODES };
