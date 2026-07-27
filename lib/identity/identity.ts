// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password (argon2id)
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Identity/auth subsystem (Phase 0) — alias credentials, sessions, audit.
 *
 * Lives in the SAME SQLite file as AccountSystem (`data/accounts-<tenant>.db`)
 * so `REFERENCES tree_nodes(id)` resolves against the account tree.
 *
 * Security invariants:
 *   - Passwords: argon2id via Bun.password; verified with Bun.password.verify
 *     (constant-time). Plaintext passwords never touch the DB.
 *   - Sessions: the raw bearer token (branded TokenId) is NEVER stored —
 *     only its SHA-256 hex digest (token_hash PK). SessionId is derived
 *     from that digest, so resolveSession round-trips without an id column.
 *   - Lockout: failed_attempts is tracked and locked_until is HONORED when
 *     set; login() escalates to a lock at LOCKOUT_THRESHOLD consecutive
 *     failures (see lockout.ts). Expired locks stop rejecting automatically
 *     and the next successful login resets failed_attempts.
 *   - Anomaly scoring: after password verification, login() runs
 *     checkAnomaly() (anomaly.ts) when ctx.ip is present — high risk audits
 *     login_blocked_anomaly and throws AnomalyBlockedError, medium audits
 *     login_suspicious and allows. No ctx.ip → check skipped ('no-ip', low).
 *
 * Note: parameterized writes use `db.query(sql).run(params)` — the typed
 * pattern (bun-types: `db.run(sql, paramsObj)` trips TS2353).
 */

import { Database } from 'bun:sqlite';
import {
  asIdentityId,
  asPortalTenantId,
  asSessionId,
  asTokenId,
  asTreeNodeId,
  type IdentityId,
  type PortalTenantId,
  type SessionId,
  type TokenId,
  type TreeNodeId,
} from '../types/branded.ts';
import { checkAnomaly, type GeoResolver } from './anomaly.ts';
import { LOCKOUT_DURATION_SECONDS, LOCKOUT_THRESHOLD } from './lockout.ts';
import { migrateIdentity } from './schema.ts';

// ── Types ────────────────────────────────────────────────────────────────

export type IdentityRole = 'operator' | 'admin' | 'superadmin';

const ROLE_RANK: Record<IdentityRole, number> = { operator: 0, admin: 1, superadmin: 2 };

export const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8h

const SLUG_PATTERN = /^[a-z0-9_-]{3,32}$/;

export interface LoginContext {
  ip?: string;
  userAgent?: string;
}

export interface LoginResult {
  token: TokenId;
  sessionId: SessionId;
  expiresAt: number; // unix seconds
}

export interface SessionInfo {
  sessionId: SessionId;
  nodeId: TreeNodeId;
  role: IdentityRole;
  /** Set when the session was minted via impersonation (impersonate.ts); null for normal logins. */
  impersonatorId: TreeNodeId | null;
}

export interface AuthEventInput {
  nodeId?: TreeNodeId | null;
  action: string;
  details?: Record<string, unknown>;
  ip?: string;
  success?: boolean;
  /**
   * Stamps the audit row's impersonator_id column. Passed EXPLICITLY by the
   * caller (no ambient context propagation) — see impersonate.ts.
   */
  impersonatorId?: TreeNodeId | null;
}

export interface AuthAuditEntry {
  id: IdentityId;
  nodeId: TreeNodeId | null;
  action: string;
  details: Record<string, unknown> | null;
  ip: string | null;
  success: boolean;
  createdAt: string;
}

export interface AuditQuery {
  action?: string;
  limit?: number;
}

/** Deserialized auth_device_fingerprints row (returned by fingerprint queries). */
export interface DeviceFingerprint {
  fingerprintHash: string;
  firstSeen: number; // unix seconds
  lastSeen: number; // unix seconds
  countryCode: string | null;
  trusted: boolean;
}

/** GDPR-style export row for auth_sessions — NEVER includes token_hash. */
export interface SessionExportRow {
  createdAt: string;
  expiresAt: number; // unix seconds
  revokedAt: number | null; // unix seconds
  ip: string | null;
  userAgent: string | null;
}

/** GDPR-style export row for auth_alias_credentials — NEVER includes password_hash. */
export interface AliasSummary {
  slug: string;
  role: IdentityRole;
  createdAt: string;
  rotatedAt: string | null;
}

export interface IdentityOptions {
  /**
   * Geo resolver used by login anomaly scoring. Undefined → no geo signal
   * (hermetic default — tests and offline deploys never touch the network).
   * Production wires `defaultGeoResolver()` from anomaly.ts.
   */
  geoResolver?: GeoResolver;
  /**
   * Best-effort hook fired when a high-risk login is blocked (e.g. a
   * Telegram ops alert). Invoked inside try/catch — alerting must never
   * break or mask the login flow.
   */
  onHighRisk?: (nodeId: TreeNodeId, reason: string) => void;
}

// ── Errors ───────────────────────────────────────────────────────────────

export class IdentityError extends Error {}

/** Unknown slug OR wrong password — callers must not distinguish (no user enumeration). */
export class InvalidCredentialsError extends IdentityError {
  constructor() {
    super('Invalid credentials');
    this.name = 'InvalidCredentialsError';
  }
}

export class AccountLockedError extends IdentityError {
  readonly lockedUntil: number; // unix seconds
  constructor(lockedUntil: number) {
    super('Account is locked');
    this.name = 'AccountLockedError';
    this.lockedUntil = lockedUntil;
  }
}

/** High-risk login (new country, …) blocked by anomaly scoring. Carries the human reason. */
export class AnomalyBlockedError extends IdentityError {
  readonly reason: string;
  constructor(reason: string) {
    super('Login blocked by anomaly detection');
    this.name = 'AnomalyBlockedError';
    this.reason = reason;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function sha256Hex(input: string): string {
  return new Bun.CryptoHasher('sha256').update(input).digest('hex');
}

function unixNow(): number {
  return Math.floor(Date.now() / 1000);
}

function mintBearerToken(): TokenId {
  const suffix = new Uint8Array(24);
  crypto.getRandomValues(suffix);
  const hex = Array.from(suffix, b => b.toString(16).padStart(2, '0')).join('');
  return asTokenId(`${Bun.randomUUIDv7()}.${hex}`);
}

/** Deserialized credential record — DB rows stay `Record<string, unknown>` (repo convention). */
interface Credential {
  nodeId: TreeNodeId;
  slug: string;
  passwordHash: string;
  role: IdentityRole;
  failedAttempts: number;
  lockedUntil: number | null;
  lockReason: string | null;
}

// ── IdentitySystem ───────────────────────────────────────────────────────

export class IdentitySystem {
  private db: Database;
  private tenantId: PortalTenantId;
  private geoResolver: GeoResolver | undefined;
  private onHighRisk: ((nodeId: TreeNodeId, reason: string) => void) | undefined;

  constructor(
    tenantId: PortalTenantId = asPortalTenantId('operations'),
    dbPath?: string,
    options: IdentityOptions = {}
  ) {
    this.tenantId = tenantId;
    this.geoResolver = options.geoResolver;
    this.onHighRisk = options.onHighRisk;
    if (dbPath) {
      this.db = new Database(dbPath);
    } else {
      this.db = new Database(`data/accounts-${tenantId as string}.db`, { create: true });
    }
    this.db.run('PRAGMA journal_mode=WAL');
    migrateIdentity(this.db);
  }

  // ── Credentials ───────────────────────────────────────────────────────

  async createAlias(
    nodeId: TreeNodeId,
    slug: string,
    password: string,
    role: IdentityRole = 'operator'
  ): Promise<void> {
    if (!SLUG_PATTERN.test(slug)) {
      throw new IdentityError(
        'Invalid alias slug: 3-32 chars, lowercase alphanumeric plus - and _'
      );
    }

    const node = this.db
      .query('SELECT id FROM tree_nodes WHERE id = $id')
      .get({ $id: nodeId }) as Record<string, unknown> | null;
    if (!node) throw new IdentityError('Node not found');

    const existing = this.db
      .query('SELECT alias_slug FROM auth_alias_credentials WHERE alias_slug = $slug')
      .get({ $slug: slug }) as Record<string, unknown> | null;
    if (existing) throw new IdentityError('Alias slug already taken');

    const passwordHash = await Bun.password.hash(password, { algorithm: 'argon2id' });

    this.db
      .query(
        `INSERT INTO auth_alias_credentials (node_id, alias_slug, password_hash, role, created_at)
         VALUES ($node, $slug, $hash, $role, $created)`
      )
      .run({
        $node: nodeId,
        $slug: slug,
        $hash: passwordHash,
        $role: role,
        $created: new Date().toISOString(),
      });

    this.logAuthEvent({ nodeId, action: 'alias_created', details: { slug, role } });
  }

  // ── Login / Logout / Sessions ─────────────────────────────────────────

  async login(slug: string, password: string, ctx: LoginContext = {}): Promise<LoginResult> {
    const cred = this.credentialBySlug(slug);

    if (!cred) {
      this.logAuthEvent({ action: 'login_failed', details: { slug }, ip: ctx.ip, success: false });
      throw new InvalidCredentialsError();
    }

    const nodeId = cred.nodeId;
    const now = unixNow();

    if (cred.lockedUntil !== null && cred.lockedUntil > now) {
      this.logAuthEvent({
        nodeId,
        action: 'login_locked',
        details: { slug, lockedUntil: cred.lockedUntil, reason: cred.lockReason },
        ip: ctx.ip,
        success: false,
      });
      throw new AccountLockedError(cred.lockedUntil);
    }

    const ok = await Bun.password.verify(password, cred.passwordHash);
    if (!ok) {
      const failedAttempts = cred.failedAttempts + 1;
      this.db
        .query(
          'UPDATE auth_alias_credentials SET failed_attempts = failed_attempts + 1 WHERE alias_slug = $slug'
        )
        .run({ $slug: slug });
      this.logAuthEvent({
        nodeId,
        action: 'login_failed',
        details: { slug, failedAttempts },
        ip: ctx.ip,
        success: false,
      });
      if (failedAttempts >= LOCKOUT_THRESHOLD) {
        const lockedUntil = now + LOCKOUT_DURATION_SECONDS;
        this.db
          .query(
            `UPDATE auth_alias_credentials SET locked_until = $until, lock_reason = $reason
             WHERE alias_slug = $slug`
          )
          .run({ $until: lockedUntil, $reason: 'too_many_failed_attempts', $slug: slug });
        this.logAuthEvent({
          nodeId,
          action: 'account_locked',
          details: {
            slug,
            reason: 'too_many_failed_attempts',
            failedAttempts,
            durationSeconds: LOCKOUT_DURATION_SECONDS,
            lockedUntil,
          },
          ip: ctx.ip,
        });
      }
      // The escalating attempt itself stays InvalidCredentialsError (no
      // enumeration); subsequent attempts hit AccountLockedError above.
      throw new InvalidCredentialsError();
    }

    // Anomaly scoring (anomaly.ts) — runs only when ctx.ip is present; no ip
    // is treated as low/'no-ip' and the check is skipped entirely.
    if (ctx.ip) {
      const risk = await checkAnomaly(this, nodeId, ctx.ip, ctx.userAgent ?? '', this.geoResolver);
      if (risk.risk === 'high') {
        const reason = risk.reason ?? 'high-risk login';
        this.logAuthEvent({
          nodeId,
          action: 'login_blocked_anomaly',
          details: { slug, reason, risk: risk.risk },
          ip: ctx.ip,
          success: false,
        });
        this.notifyHighRisk(nodeId, reason);
        throw new AnomalyBlockedError(reason);
      }
      if (risk.risk === 'medium') {
        this.logAuthEvent({
          nodeId,
          action: 'login_suspicious',
          details: { slug, reason: risk.reason },
          ip: ctx.ip,
          success: true,
        });
      }
    }

    this.db
      .query('UPDATE auth_alias_credentials SET failed_attempts = 0 WHERE alias_slug = $slug')
      .run({ $slug: slug });

    const token = mintBearerToken();
    const tokenHash = sha256Hex(token as string);
    const expiresAt = now + SESSION_TTL_SECONDS;

    this.db
      .query(
        `INSERT INTO auth_sessions (token_hash, node_id, created_at, expires_at, ip, user_agent)
         VALUES ($hash, $node, $created, $expires, $ip, $ua)`
      )
      .run({
        $hash: tokenHash,
        $node: nodeId,
        $created: new Date().toISOString(),
        $expires: expiresAt,
        $ip: ctx.ip ?? null,
        $ua: ctx.userAgent ?? null,
      });

    this.logAuthEvent({ nodeId, action: 'login_success', details: { slug }, ip: ctx.ip });

    return { token, sessionId: asSessionId(tokenHash), expiresAt };
  }

  logout(token: TokenId): void {
    const tokenHash = sha256Hex(token as string);
    const row = this.db
      .query('SELECT node_id FROM auth_sessions WHERE token_hash = $hash')
      .get({ $hash: tokenHash }) as Record<string, unknown> | null;

    this.db
      .query(
        'UPDATE auth_sessions SET revoked_at = $at WHERE token_hash = $hash AND revoked_at IS NULL'
      )
      .run({ $at: unixNow(), $hash: tokenHash });

    this.logAuthEvent({
      nodeId: row ? asTreeNodeId(row.node_id as string) : null,
      action: 'logout',
      success: row !== null,
    });
  }

  resolveSession(token: TokenId): SessionInfo | null {
    const tokenHash = sha256Hex(token as string);
    const row = this.db
      .query(
        'SELECT node_id, expires_at, revoked_at, impersonator_id FROM auth_sessions WHERE token_hash = $hash'
      )
      .get({ $hash: tokenHash }) as Record<string, unknown> | null;

    if (!row) return null;
    if (row.revoked_at !== null) return null;
    if ((row.expires_at as number) <= unixNow()) return null;

    const nodeId = asTreeNodeId(row.node_id as string);
    return {
      sessionId: asSessionId(tokenHash),
      nodeId,
      role: this.getRole(nodeId) ?? 'operator',
      impersonatorId: row.impersonator_id ? asTreeNodeId(row.impersonator_id as string) : null,
    };
  }

  /**
   * Mint a session directly (no password check) — used by impersonation
   * (impersonate.ts). Same storage invariant as login(): the raw token is
   * returned once, only its SHA-256 digest is stored. `impersonatorId` marks
   * the session as impersonated; `ttlSeconds` overrides the 8h default.
   */
  createSession(
    nodeId: TreeNodeId,
    opts: {
      impersonatorId?: TreeNodeId | null;
      ttlSeconds?: number;
      ip?: string;
      userAgent?: string;
    } = {}
  ): LoginResult {
    const token = mintBearerToken();
    const tokenHash = sha256Hex(token as string);
    const expiresAt = unixNow() + (opts.ttlSeconds ?? SESSION_TTL_SECONDS);

    this.db
      .query(
        `INSERT INTO auth_sessions (token_hash, node_id, created_at, expires_at, ip, user_agent, impersonator_id)
         VALUES ($hash, $node, $created, $expires, $ip, $ua, $impersonator)`
      )
      .run({
        $hash: tokenHash,
        $node: nodeId,
        $created: new Date().toISOString(),
        $expires: expiresAt,
        $ip: opts.ip ?? null,
        $ua: opts.userAgent ?? null,
        $impersonator: opts.impersonatorId ?? null,
      });

    return { token, sessionId: asSessionId(tokenHash), expiresAt };
  }

  // ── Roles / Lockout helpers ───────────────────────────────────────────

  getRole(nodeId: TreeNodeId): IdentityRole | null {
    const row = this.db
      .query('SELECT role FROM auth_alias_credentials WHERE node_id = $id')
      .get({ $id: nodeId }) as Record<string, unknown> | null;
    return (row?.role as IdentityRole | undefined) ?? null;
  }

  requireRole(nodeId: TreeNodeId, minimum: IdentityRole): boolean {
    const role = this.getRole(nodeId);
    if (!role) return false;
    return ROLE_RANK[role] >= ROLE_RANK[minimum];
  }

  isLocked(slug: string): boolean {
    const cred = this.credentialBySlug(slug);
    return cred !== null && cred.lockedUntil !== null && cred.lockedUntil > unixNow();
  }

  /** Manually lock an alias. Audits `account_locked` (success: true). */
  lockAccount(slug: string, reason: string, durationSeconds: number): void {
    const cred = this.credentialBySlug(slug);
    if (!cred) throw new IdentityError('Alias not found');

    const lockedUntil = unixNow() + durationSeconds;
    this.db
      .query(
        `UPDATE auth_alias_credentials SET locked_until = $until, lock_reason = $reason
         WHERE alias_slug = $slug`
      )
      .run({ $until: lockedUntil, $reason: reason, $slug: slug });

    this.logAuthEvent({
      nodeId: cred.nodeId,
      action: 'account_locked',
      details: { slug, reason, durationSeconds, lockedUntil },
    });
  }

  /**
   * Admin-only unlock: clears locked_until / lock_reason / failed_attempts.
   * Audits `account_unlocked` with details.adminNodeId.
   */
  unlockAccount(adminNodeId: TreeNodeId, slug: string): void {
    const role = this.getRole(adminNodeId);
    if (role !== 'admin' && role !== 'superadmin') {
      throw new IdentityError('Admin role required to unlock accounts');
    }

    const cred = this.credentialBySlug(slug);
    if (!cred) throw new IdentityError('Alias not found');

    this.db
      .query(
        `UPDATE auth_alias_credentials
         SET locked_until = NULL, lock_reason = NULL, failed_attempts = 0
         WHERE alias_slug = $slug`
      )
      .run({ $slug: slug });

    this.logAuthEvent({
      nodeId: cred.nodeId,
      action: 'account_unlocked',
      details: { slug, adminNodeId },
    });
  }

  // ── Audit ─────────────────────────────────────────────────────────────

  logAuthEvent(entry: AuthEventInput): IdentityId {
    const id = asIdentityId(Bun.randomUUIDv7());
    this.db
      .query(
        `INSERT INTO auth_audit (id, node_id, action, details_json, ip, success, created_at, impersonator_id)
         VALUES ($id, $node, $action, $details, $ip, $success, $created, $impersonator)`
      )
      .run({
        $id: id,
        $node: entry.nodeId ?? null,
        $action: entry.action,
        $details: entry.details ? JSON.stringify(entry.details) : null,
        $ip: entry.ip ?? null,
        $success: entry.success === false ? 0 : 1,
        $created: new Date().toISOString(),
        $impersonator: entry.impersonatorId ?? null,
      });
    return id;
  }

  auditFor(nodeId: TreeNodeId, opts: AuditQuery = {}): AuthAuditEntry[] {
    const limit = Math.max(1, Math.min(opts.limit ?? 50, 500));
    const rows = (
      opts.action
        ? this.db
            .query(
              `SELECT * FROM auth_audit WHERE node_id = $node AND action = $action
               ORDER BY created_at DESC, id DESC LIMIT $limit`
            )
            .all({ $node: nodeId, $action: opts.action, $limit: limit })
        : this.db
            .query(
              `SELECT * FROM auth_audit WHERE node_id = $node
               ORDER BY created_at DESC, id DESC LIMIT $limit`
            )
            .all({ $node: nodeId, $limit: limit })
    ) as Record<string, unknown>[];

    return rows.map(row => ({
      id: asIdentityId(row.id as string),
      nodeId: row.node_id ? asTreeNodeId(row.node_id as string) : null,
      action: row.action as string,
      details: this.parseDetails(row.details_json),
      ip: (row.ip as string) ?? null,
      success: row.success === 1,
      createdAt: row.created_at as string,
    }));
  }

  close(): void {
    this.db.close();
  }

  // ── Device fingerprints / export (narrow typed accessors for anomaly.ts / export.ts) ──

  fingerprintFor(nodeId: TreeNodeId, fingerprintHash: string): DeviceFingerprint | null {
    const row = this.db
      .query(
        `SELECT fingerprint_hash, first_seen, last_seen, country_code, trusted
         FROM auth_device_fingerprints WHERE node_id = $node AND fingerprint_hash = $hash`
      )
      .get({ $node: nodeId, $hash: fingerprintHash }) as Record<string, unknown> | null;
    return row ? this.toDeviceFingerprint(row) : null;
  }

  /**
   * Insert a new fingerprint (first_seen = last_seen = now) or refresh an
   * existing one (last_seen = now). country_code is only overwritten when a
   * non-null country is known — a missing geo signal never erases history.
   */
  upsertFingerprint(nodeId: TreeNodeId, fingerprintHash: string, countryCode: string | null): void {
    const now = unixNow();
    this.db
      .query(
        `INSERT INTO auth_device_fingerprints
           (node_id, fingerprint_hash, first_seen, last_seen, country_code)
         VALUES ($node, $hash, $now, $now, $country)
         ON CONFLICT(node_id, fingerprint_hash) DO UPDATE SET
           last_seen = $now,
           country_code = COALESCE($country, auth_device_fingerprints.country_code)`
      )
      .run({ $node: nodeId, $hash: fingerprintHash, $now: now, $country: countryCode });
  }

  trustFingerprint(nodeId: TreeNodeId, fingerprintHash: string): void {
    this.db
      .query(
        `UPDATE auth_device_fingerprints SET trusted = 1
         WHERE node_id = $node AND fingerprint_hash = $hash`
      )
      .run({ $node: nodeId, $hash: fingerprintHash });
  }

  /** Distinct non-null historical country codes for a node (geo baseline). */
  countriesFor(nodeId: TreeNodeId): string[] {
    const rows = this.db
      .query(
        `SELECT DISTINCT country_code FROM auth_device_fingerprints
         WHERE node_id = $node AND country_code IS NOT NULL`
      )
      .all({ $node: nodeId }) as Record<string, unknown>[];
    return rows.map(row => row.country_code as string);
  }

  fingerprintsFor(nodeId: TreeNodeId): DeviceFingerprint[] {
    const rows = this.db
      .query(
        `SELECT fingerprint_hash, first_seen, last_seen, country_code, trusted
         FROM auth_device_fingerprints WHERE node_id = $node ORDER BY first_seen ASC`
      )
      .all({ $node: nodeId }) as Record<string, unknown>[];
    return rows.map(row => this.toDeviceFingerprint(row));
  }

  /** Export-safe alias summary — explicit columns, password_hash never selected. */
  aliasSummaryFor(nodeId: TreeNodeId): AliasSummary | null {
    const row = this.db
      .query(
        `SELECT alias_slug, role, created_at, rotated_at
         FROM auth_alias_credentials WHERE node_id = $node`
      )
      .get({ $node: nodeId }) as Record<string, unknown> | null;
    if (!row) return null;
    return {
      slug: row.alias_slug as string,
      role: row.role as IdentityRole,
      createdAt: row.created_at as string,
      rotatedAt: (row.rotated_at as string | null) ?? null,
    };
  }

  /** Export-safe session list — explicit columns, token_hash never selected. */
  sessionsFor(nodeId: TreeNodeId): SessionExportRow[] {
    const rows = this.db
      .query(
        `SELECT created_at, expires_at, revoked_at, ip, user_agent
         FROM auth_sessions WHERE node_id = $node ORDER BY created_at ASC`
      )
      .all({ $node: nodeId }) as Record<string, unknown>[];
    return rows.map(row => ({
      createdAt: row.created_at as string,
      expiresAt: row.expires_at as number,
      revokedAt: (row.revoked_at as number | null) ?? null,
      ip: (row.ip as string | null) ?? null,
      userAgent: (row.user_agent as string | null) ?? null,
    }));
  }

  // ── Internals ─────────────────────────────────────────────────────────

  private toDeviceFingerprint(row: Record<string, unknown>): DeviceFingerprint {
    return {
      fingerprintHash: row.fingerprint_hash as string,
      firstSeen: row.first_seen as number,
      lastSeen: row.last_seen as number,
      countryCode: (row.country_code as string | null) ?? null,
      trusted: row.trusted === 1,
    };
  }

  /** Best-effort high-risk notification — hook errors are swallowed by design. */
  private notifyHighRisk(nodeId: TreeNodeId, reason: string): void {
    if (!this.onHighRisk) return;
    try {
      this.onHighRisk(nodeId, reason);
    } catch {
      // Alerting must never break or mask the login flow.
    }
  }

  private credentialBySlug(slug: string): Credential | null {
    const row = this.db
      .query(
        `SELECT node_id, alias_slug, password_hash, role, failed_attempts, locked_until, lock_reason
         FROM auth_alias_credentials WHERE alias_slug = $slug`
      )
      .get({ $slug: slug }) as Record<string, unknown> | null;
    if (!row) return null;
    return {
      nodeId: asTreeNodeId(row.node_id as string),
      slug: row.alias_slug as string,
      passwordHash: row.password_hash as string,
      role: row.role as IdentityRole,
      failedAttempts: row.failed_attempts as number,
      lockedUntil: (row.locked_until as number | null) ?? null,
      lockReason: (row.lock_reason as string | null) ?? null,
    };
  }

  private parseDetails(raw: unknown): Record<string, unknown> | null {
    if (typeof raw !== 'string') return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
}
