// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * State-level regulatory compliance (MA / NJ).
 *
 * Schema: state_code on core play surfaces + regulatory_limits,
 * partner_state_licenses, regulatory_violations.
 *
 * Isolation: license/violation rows are always filtered by (node_id, state_code)
 * inside this module / ScopedRepository — no raw dimension filters at call sites.
 */
import type { Database } from 'bun:sqlite';
import { asStateCode, asTreeNodeId, type StateCode, type TreeNodeId } from '../types/branded.ts';
import { REGULATED_STATE_CODES } from '../types/branded/operations.ts';

// ── Schema ─────────────────────────────────────────────────────────

const PLAY_STATE_TABLES = [
  'plays',
  'play_distribution',
  // Optional analysis / snapshot surfaces if present (no-op when missing).
  'play_analysis',
  'market_snapshots',
  'play_zip_enrichment',
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

/** Add state_code + regulatory tables (idempotent). */
export function ensureStateRegulationSchema(db: Database): void {
  for (const table of PLAY_STATE_TABLES) {
    if (!tableExists(db, table)) continue;
    const cols = columnNames(db, table);
    if (!cols.has('state_code')) {
      db.run(`ALTER TABLE ${table} ADD COLUMN state_code TEXT`);
    }
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS regulatory_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      effective_to INTEGER
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
      reason TEXT NOT NULL,
      details TEXT,
      blocked_at INTEGER DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_reg_violations_node_state
      ON regulatory_violations(node_id, state_code, blocked_at);
  `);
}

// ── Seeds (MA / NJ reference limits) ───────────────────────────────

/** Seed shared MA/NJ regulatory limits (idempotent on natural key). */
export function seedStateRegulations(db: Database): void {
  ensureStateRegulationSchema(db);
  const rows: Array<{
    state_code: string;
    sport_id: string; // brand-ok — regulatory catalog key (matches plays.sport text)
    market_id: string; // brand-ok — regulatory catalog key (matches plays.market text)
    max_wager: number;
    min_wager: number;
    allowed_bet_types: string;
    special_rules: string | null;
  }> = [
    {
      state_code: 'MA',
      sport_id: 'soccer',
      market_id: 'match_winner',
      max_wager: 5000,
      min_wager: 0.5,
      allowed_bet_types: '["straight","parlay"]',
      special_rules: '{"max_daily_total":25000}',
    },
    {
      state_code: 'MA',
      sport_id: 'basketball',
      market_id: 'over_under',
      max_wager: 10000,
      min_wager: 1,
      allowed_bet_types: '["straight"]',
      special_rules: null,
    },
    {
      state_code: 'NJ',
      sport_id: 'soccer',
      market_id: 'match_winner',
      max_wager: 10000,
      min_wager: 1,
      allowed_bet_types: '["straight","parlay","teaser"]',
      special_rules: '{"require_identity_verification":true}',
    },
  ];

  for (const r of rows) {
    const exists = db
      .query(
        `SELECT 1 AS ok FROM regulatory_limits
         WHERE state_code = $st AND sport_id = $sp AND market_id = $mk
           AND node_id IS NULL
         LIMIT 1`
      )
      .get({ $st: r.state_code, $sp: r.sport_id, $mk: r.market_id }) as { ok: number } | null;
    if (exists) continue;
    db.run(
      `INSERT INTO regulatory_limits (
         state_code, sport_id, market_id, node_id,
         max_wager, min_wager, allowed_bet_types, special_rules
       ) VALUES ($st, $sp, $mk, NULL, $max, $min, $types, $rules)`,
      {
        $st: r.state_code,
        $sp: r.sport_id,
        $mk: r.market_id,
        $max: r.max_wager,
        $min: r.min_wager,
        $types: r.allowed_bet_types,
        $rules: r.special_rules,
      }
    );
  }
}

// ── Scope + repository ─────────────────────────────────────────────

export type Scope = {
  nodeId: TreeNodeId;
  /** When set, all queries include state_code = state. When null/omitted, state not filtered. */
  state?: StateCode | null;
  country?: string | null;
  sport?: string | null;
  market?: string | null;
};

/** Dimension columns that must not appear as raw filters outside scope injection. */
const SCOPED_DIMENSIONS = [
  'node_id',
  'state_code',
  'country_code',
  'sport_id',
  'market_id',
] as const;

/**
 * Repository that injects partner (+ optional state) scope into every query.
 * Rejects SQL that already filters on scoped dimensions (no raw node/state leaks).
 */
export class ScopedRepository {
  constructor(
    private readonly db: Database,
    private readonly scope: Scope
  ) {}

  private scopeParams(): Record<string, string> {
    const p: Record<string, string> = { $scope_node_id: this.scope.nodeId };
    if (this.scope.state) p.$scope_state_code = this.scope.state;
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

// ── Compliance ─────────────────────────────────────────────────────

export type BetComplianceInput = {
  nodeId: TreeNodeId | string;
  stateCode: StateCode | string;
  sportId: string; // brand-ok — sport catalog key on wire
  marketId: string; // brand-ok — market catalog key on wire
  wagerAmount: number;
  betType: string;
};

export type BetComplianceResult = { allowed: true } | { allowed: false; reason: string };

type LimitsRow = {
  max_wager: number | null;
  min_wager: number | null;
  allowed_bet_types: string | null;
  special_rules: string | null;
};

export class ComplianceRepository {
  constructor(private readonly db: Database) {
    ensureStateRegulationSchema(db);
  }

  /**
   * Validate a wager against partner license + state limits.
   * Prefer partner-specific limit rows when present; else global state rules.
   */
  isBetAllowed(params: BetComplianceInput): BetComplianceResult {
    const nodeId = asTreeNodeId(params.nodeId);
    const stateCode = asStateCode(params.stateCode);

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
        `SELECT max_wager, min_wager, allowed_bet_types, special_rules
         FROM regulatory_limits
         WHERE state_code = $st AND sport_id = $sp AND market_id = $mk
           AND (node_id IS NULL OR node_id = $nid)
           AND effective_from <= $now
           AND (effective_to IS NULL OR effective_to > $now)
         ORDER BY CASE WHEN node_id IS NOT NULL THEN 0 ELSE 1 END,
                  effective_from DESC
         LIMIT 1`
      )
      .get({
        $st: stateCode,
        $sp: params.sportId,
        $mk: params.marketId,
        $nid: nodeId,
        $now: now,
      }) as LimitsRow | null;

    if (!limits) {
      // No explicit rule → allow (license already required)
      return { allowed: true };
    }

    if (limits.max_wager != null && params.wagerAmount > limits.max_wager) {
      return { allowed: false, reason: `Exceeds max wager $${limits.max_wager}` };
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

    if (limits.special_rules) {
      try {
        const rules = JSON.parse(limits.special_rules) as Record<string, unknown>;
        if (rules.require_identity_verification === true) {
          // Soft flag — identity verified is partner vault concern; do not block here.
        }
      } catch {
        // ignore malformed special_rules
      }
    }

    return { allowed: true };
  }

  /** Record a blocked / violated wager attempt (repository layer). */
  logViolation(
    nodeId: TreeNodeId | string,
    stateCode: StateCode | string,
    reason: string,
    opts?: { playId?: string; details?: string } // brand-ok — optional play ref on audit row
  ): void {
    const nid = asTreeNodeId(nodeId);
    const st = asStateCode(stateCode);
    this.db.run(
      `INSERT INTO regulatory_violations (node_id, play_id, state_code, reason, details, blocked_at)
       VALUES ($nid, $pid, $st, $reason, $details, unixepoch())`,
      {
        $nid: nid,
        $pid: opts?.playId ?? null,
        $st: st,
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
    SELECT sport_id, market_id, max_wager, min_wager, allowed_bet_types, special_rules, node_id
    FROM regulatory_limits
    WHERE state_code = $st
      AND (node_id IS NULL OR node_id = $nid)
      AND effective_from <= $now
      AND (effective_to IS NULL OR effective_to > $now)
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
      ? '<tr><td colspan="4">No active limits</td></tr>'
      : status.limits
          .map(
            l =>
              `<tr><td>${escapeHtml(l.sport_id)}</td><td>${escapeHtml(l.market_id)}</td>` +
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
    `<table><tr><th>Sport</th><th>Market</th><th>Max Wager</th><th>Allowed Bet Types</th></tr>`,
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
