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
 *   - Passwords: argon2id via Bun.password with OWASP-aligned defaults
 *     (`lib/security/password-hash.ts`); verified with Bun.password.verify
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
 *   - IP allowlist: when the node has ≥1 auth_ip_allowlist entries (managed
 *     via self-service.ts), login() enforces it AFTER the geo gate and BEFORE
 *     password verification — a non-matching ctx.ip audits login_blocked_ip
 *     (success 0) and throws IpNotAllowedError. Empty allowlist → no
 *     restriction; no ctx.ip → allowed. Match is exact IPv4 or /24 prefix
 *     (documented approximation, same granularity as anomaly fingerprints).
 *   - TOTP MFA (mfa.ts / totp-core.ts): when the node has an ENABLED
 *     enrollment, login() requires ctx.otp AFTER password verification and
 *     BEFORE the anomaly hook. Missing → login_totp_required (success 0) +
 *     TotpRequiredError (HTTP 401 { error: 'totp_required' }). Wrong code →
 *     login_totp_failed via the SAME failed_attempts/lockout path as a bad
 *     password, then InvalidCredentialsError (no MFA oracle). A single-use
 *     recovery code in ctx.otp is consumed (used_at) and audits
 *     totp_recovery_used. Pending (unconfirmed) enrollments never gate.
 *
 * Note: parameterized writes use `db.query(sql).run(params)` — the typed
 * pattern (bun-types: `db.run(sql, paramsObj)` trips TS2353).
 */

import { Database } from 'bun:sqlite';
import { hashPassword } from '../security/password-hash.ts';
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
import { checkAnomaly, safeResolveCountry, type GeoResolver } from './anomaly.ts';
import { isGeoBlocked, type GeoPolicy } from './geo-policy.ts';
import { LOCKOUT_DURATION_SECONDS, LOCKOUT_THRESHOLD } from './lockout.ts';
import { validatePasswordStrength } from './password-strength.ts';
import { migrateIdentity } from './schema.ts';
import { verifyTotp } from './totp-core.ts';

// ── Types ────────────────────────────────────────────────────────────────

export type IdentityRole = 'operator' | 'admin' | 'superadmin';

const ROLE_RANK: Record<IdentityRole, number> = { operator: 0, admin: 1, superadmin: 2 };

export const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8h

const SLUG_PATTERN = /^[a-z0-9_-]{3,32}$/;

export interface LoginContext {
  ip?: string;
  userAgent?: string;
  /** TOTP authenticator code (or a single-use recovery code) when the node has MFA enabled. */
  otp?: string;
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
  impersonatorId: TreeNodeId | null;
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

/** Active session view for self-service listing — NEVER includes token_hash. */
export interface ActiveSessionInfo {
  createdAt: string;
  expiresAt: number; // unix seconds
  ip: string | null;
  userAgent: string | null;
  /** True when the session was minted via impersonation — presence flag only. */
  impersonated: boolean;
}

/** Deserialized auth_ip_allowlist row. */
export interface IpAllowlistEntry {
  cidr: string;
  label: string | null;
  createdAt: string;
}

/** GDPR-style export row for auth_alias_credentials — NEVER includes password_hash. */
export interface AliasSummary {
  slug: string;
  role: IdentityRole;
  createdAt: string;
  rotatedAt: string | null;
}

/** WebAuthn challenge kind (auth_webauthn_challenges.kind CHECK constraint). */
export type WebAuthnChallengeKind = 'registration' | 'authentication';

/**
 * Deserialized auth_passkeys row (webauthn.ts). `publicKey` is the
 * base64url-encoded COSE public key; `transports` the JSON-decoded
 * authenticator transport list (null when the authenticator reported none).
 */
export interface StoredPasskey {
  credentialId: string; // brand-ok — opaque WebAuthn credential ID (authenticator-minted base64url wire key, not a domain id)
  nodeId: TreeNodeId;
  publicKey: string;
  counter: number;
  deviceName: string | null;
  transports: string[] | null;
  createdAt: string;
  lastUsedAt: number | null; // unix seconds
}

/** Input for insertPasskey (webauthn.ts finish-registration). */
export interface NewPasskey {
  credentialId: string; // brand-ok — opaque WebAuthn credential ID (authenticator-minted base64url wire key)
  publicKey: string; // base64url-encoded COSE public key
  counter: number;
  deviceName: string | null;
  transports: string[] | null;
}

/** WebAuthn/passkey relying-party config (webauthn.ts). All fields optional — see defaults below. */
export interface WebAuthnOptions {
  /** RP ID (effective domain). Default 'factory-wager.com'. */
  rpID?: string; // brand-ok — WebAuthn RP id is a domain-name string, not a domain entity id
  /** Expected origin for attestation/assertion verification. Default 'https://factory-wager.com'. */
  origin?: string;
  /** User-visible relying-party name. Default 'FactoryWager'. */
  rpName?: string;
}

/** Resolved WebAuthn config (IdentityOptions.webauthn + defaults). */
export interface ResolvedWebAuthnConfig {
  rpID: string; // brand-ok — WebAuthn RP id is a domain-name string, not a domain entity id
  origin: string;
  rpName: string;
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
  /** Phase 2b geo blocking — default off (offline-allow when signal missing). */
  geoPolicy?: GeoPolicy;
  /** Phase 2b password bar for createAlias (default 3; 0 disables). */
  minPasswordScore?: number;
  /** WebAuthn/passkey relying-party config (webauthn.ts). */
  webauthn?: WebAuthnOptions;
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

export class GeoBlockedError extends IdentityError {
  readonly country: string;
  constructor(country: string) {
    super('Login blocked by geo policy');
    this.name = 'GeoBlockedError';
    this.country = country;
  }
}

/** Node's IP allowlist (auth_ip_allowlist) is set and ctx.ip matches no entry. */
export class IpNotAllowedError extends IdentityError {
  readonly ip: string;
  constructor(ip: string) {
    super('Login not permitted from this IP address');
    this.name = 'IpNotAllowedError';
    this.ip = ip;
  }
}

export class WeakPasswordError extends IdentityError {
  readonly feedback: string[];
  constructor(feedback: string[]) {
    super('Password does not meet strength requirements');
    this.name = 'WeakPasswordError';
    this.feedback = feedback;
  }
}

/**
 * The node has TOTP enabled but the login carried no `ctx.otp`. HTTP maps
 * this to 401 with `{ error: 'totp_required' }` — a distinct machine-readable
 * code at the SAME status as bad credentials (no account/MFA enumeration).
 */
export class TotpRequiredError extends IdentityError {
  constructor() {
    super('TOTP code required');
    this.name = 'TotpRequiredError';
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

const DEFAULT_GEO_POLICY: GeoPolicy = { mode: 'off', countries: [] };

export class IdentitySystem {
  private db: Database;
  private tenantId: PortalTenantId;
  private geoResolver: GeoResolver | undefined;
  private onHighRisk: ((nodeId: TreeNodeId, reason: string) => void) | undefined;
  private geoPolicy: GeoPolicy;
  readonly minPasswordScore: number;
  /** Resolved WebAuthn relying-party config (webauthn.ts). */
  readonly webauthnConfig: ResolvedWebAuthnConfig;

  constructor(
    tenantId: PortalTenantId = asPortalTenantId('operations'),
    dbPath?: string,
    options: IdentityOptions = {}
  ) {
    this.tenantId = tenantId;
    this.geoResolver = options.geoResolver;
    this.onHighRisk = options.onHighRisk;
    this.geoPolicy = options.geoPolicy ?? DEFAULT_GEO_POLICY;
    this.minPasswordScore = options.minPasswordScore ?? 3;
    this.webauthnConfig = {
      rpID: options.webauthn?.rpID ?? 'factory-wager.com',
      origin: options.webauthn?.origin ?? 'https://factory-wager.com',
      rpName: options.webauthn?.rpName ?? 'FactoryWager',
    };
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

    if (this.minPasswordScore > 0) {
      const strength = validatePasswordStrength(password);
      if (strength.score < this.minPasswordScore) {
        throw new WeakPasswordError(strength.feedback);
      }
    }

    const passwordHash = await hashPassword(password);

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

    if (this.geoPolicy.mode !== 'off' && ctx.ip && this.geoResolver) {
      const country = await safeResolveCountry(this.geoResolver, ctx.ip);
      if (country && isGeoBlocked(this.geoPolicy, country)) {
        this.logAuthEvent({
          nodeId,
          action: 'login_blocked_geo',
          details: { slug, country },
          ip: ctx.ip,
          success: false,
        });
        throw new GeoBlockedError(country);
      }
    }

    // IP allowlist (managed via self-service.ts): runs AFTER the geo gate and
    // BEFORE password verification (fail cheap, no credential oracle). A node
    // with no allowlist entries is unrestricted; no ctx.ip → allowed (a
    // missing IP signal never blocks, same posture as the geo gate).
    if (ctx.ip && !this.isIpAllowed(nodeId, ctx.ip)) {
      this.logAuthEvent({
        nodeId,
        action: 'login_blocked_ip',
        details: { slug },
        ip: ctx.ip,
        success: false,
      });
      throw new IpNotAllowedError(ctx.ip);
    }

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
      // The escalating attempt itself stays InvalidCredentialsError (no
      // enumeration); subsequent attempts hit AccountLockedError above.
      this.recordFailedLogin(cred, slug, now, ctx.ip, 'login_failed');
      throw new InvalidCredentialsError();
    }

    // TOTP gate (mfa.ts / totp-core.ts) — runs AFTER password verification
    // (fail cheap: no MFA work for wrong passwords) and BEFORE the anomaly
    // hook. Only an ENABLED enrollment gates; a pending (unconfirmed) one
    // never does, so enrollment can't lock the user out mid-setup.
    const totp = this.totpRecordFor(nodeId);
    if (totp?.enabled) {
      if (!ctx.otp) {
        this.logAuthEvent({
          nodeId,
          action: 'login_totp_required',
          details: { slug },
          ip: ctx.ip,
          success: false,
        });
        throw new TotpRequiredError();
      }
      let otpOk = await verifyTotp(totp.secret, ctx.otp);
      if (!otpOk && this.consumeTotpRecovery(nodeId, ctx.otp)) {
        otpOk = true;
        this.logAuthEvent({ nodeId, action: 'totp_recovery_used', details: { slug }, ip: ctx.ip });
      }
      if (!otpOk) {
        // Exactly the bad-password path: same counter, same lockout
        // escalation, same InvalidCredentialsError (no MFA oracle).
        this.recordFailedLogin(cred, slug, now, ctx.ip, 'login_totp_failed');
        throw new InvalidCredentialsError();
      }
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
      impersonatorId: row.impersonator_id ? asTreeNodeId(row.impersonator_id as string) : null,
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
  aliasSlugTaken(slug: string): boolean {
    return this.credentialBySlug(slug) !== null;
  }

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

  // ── Self-service accessors (narrow, typed — consumed by self-service.ts) ──

  /** Verify the node's current password WITHOUT minting a session. */
  async verifyNodePassword(nodeId: TreeNodeId, password: string): Promise<boolean> {
    const row = this.db
      .query('SELECT password_hash FROM auth_alias_credentials WHERE node_id = $node')
      .get({ $node: nodeId }) as Record<string, unknown> | null;
    if (!row) return false;
    return Bun.password.verify(password, row.password_hash as string);
  }

  /**
   * Replace the node's password hash and stamp rotated_at. The caller
   * (self-service.ts) hashes argon2id BEFORE calling — plaintext never
   * crosses this boundary. Throws when the node has no credentials.
   */
  rotatePasswordHash(nodeId: TreeNodeId, passwordHash: string): void {
    const result = this.db
      .query(
        `UPDATE auth_alias_credentials SET password_hash = $hash, rotated_at = $at
         WHERE node_id = $node`
      )
      .run({ $hash: passwordHash, $at: new Date().toISOString(), $node: nodeId });
    if (result.changes === 0) throw new IdentityError('Node has no credentials');
  }

  /** Active (non-revoked, non-expired) sessions — explicit columns, token_hash never selected. */
  activeSessionsFor(nodeId: TreeNodeId): ActiveSessionInfo[] {
    const rows = this.db
      .query(
        `SELECT created_at, expires_at, ip, user_agent, impersonator_id
         FROM auth_sessions
         WHERE node_id = $node AND revoked_at IS NULL AND expires_at > $now
         ORDER BY created_at DESC`
      )
      .all({ $node: nodeId, $now: unixNow() }) as Record<string, unknown>[];
    return rows.map(row => ({
      createdAt: row.created_at as string,
      expiresAt: row.expires_at as number,
      ip: (row.ip as string | null) ?? null,
      userAgent: (row.user_agent as string | null) ?? null,
      impersonated: row.impersonator_id !== null,
    }));
  }

  /**
   * Revoke every active session for the node EXCEPT the caller's current
   * token ("log out everywhere else"). Returns the number revoked.
   */
  revokeOtherSessions(nodeId: TreeNodeId, currentToken: TokenId): number {
    const keepHash = sha256Hex(currentToken as string);
    const now = unixNow();
    const result = this.db
      .query(
        `UPDATE auth_sessions SET revoked_at = $at
         WHERE node_id = $node AND revoked_at IS NULL AND expires_at > $now
           AND token_hash != $keep`
      )
      .run({ $at: now, $now: now, $node: nodeId, $keep: keepHash });
    return result.changes;
  }

  /**
   * Revoke one session by raw token, SCOPED to the node ("log out this
   * device") — a token belonging to another node is never touched. Returns
   * true when a live session was actually revoked.
   */
  revokeOwnSessionByToken(nodeId: TreeNodeId, token: TokenId): boolean {
    const tokenHash = sha256Hex(token as string);
    const result = this.db
      .query(
        `UPDATE auth_sessions SET revoked_at = $at
         WHERE node_id = $node AND token_hash = $hash AND revoked_at IS NULL`
      )
      .run({ $at: unixNow(), $node: nodeId, $hash: tokenHash });
    return result.changes > 0;
  }

  /** Mark a device fingerprint as untrusted (inverse of trustFingerprint). */
  untrustFingerprint(nodeId: TreeNodeId, fingerprintHash: string): void {
    this.db
      .query(
        `UPDATE auth_device_fingerprints SET trusted = 0
         WHERE node_id = $node AND fingerprint_hash = $hash`
      )
      .run({ $node: nodeId, $hash: fingerprintHash });
  }

  /** Node's IP allowlist entries, oldest-first. */
  ipAllowlistFor(nodeId: TreeNodeId): IpAllowlistEntry[] {
    const rows = this.db
      .query(
        `SELECT cidr, label, created_at FROM auth_ip_allowlist
         WHERE node_id = $node ORDER BY created_at ASC`
      )
      .all({ $node: nodeId }) as Record<string, unknown>[];
    return rows.map(row => ({
      cidr: row.cidr as string,
      label: (row.label as string | null) ?? null,
      createdAt: row.created_at as string,
    }));
  }

  /** Replace-all write of the node's IP allowlist (single transaction). */
  replaceIpAllowlist(nodeId: TreeNodeId, entries: { cidr: string; label?: string | null }[]): void {
    const replace = this.db.transaction((rows: { cidr: string; label?: string | null }[]) => {
      this.db.query('DELETE FROM auth_ip_allowlist WHERE node_id = $node').run({ $node: nodeId });
      const insert = this.db.query(
        `INSERT INTO auth_ip_allowlist (node_id, cidr, label, created_at)
         VALUES ($node, $cidr, $label, $created)`
      );
      for (const row of rows) {
        insert.run({
          $node: nodeId,
          $cidr: row.cidr,
          $label: row.label ?? null,
          $created: new Date().toISOString(),
        });
      }
    });
    replace(entries);
  }

  /**
   * Login enforcement: true when the node has NO allowlist entries, or the
   * IP matches an entry. Match semantics (documented approximation):
   * exact IPv4 equality, or /24 prefix (first three octets) for `a.b.c.0/24`
   * entries — the same granularity anomaly fingerprints use. Validation of
   * stored entries happens at write time (self-service.ts).
   */
  isIpAllowed(nodeId: TreeNodeId, ip: string): boolean {
    const entries = this.ipAllowlistFor(nodeId);
    if (entries.length === 0) return true;
    return entries.some(entry => {
      if (entry.cidr.endsWith('/24')) {
        const prefix = entry.cidr.slice(0, -'/24'.length).split('.').slice(0, 3).join('.');
        return ip.split('.').slice(0, 3).join('.') === prefix;
      }
      return entry.cidr === ip;
    });
  }

  // ── TOTP MFA accessors (narrow, typed — consumed by mfa.ts + the login gate) ──

  /** TOTP enrollment row (secret included — the login gate and mfa.ts verify against it). */
  totpRecordFor(nodeId: TreeNodeId): { secret: string; enabled: boolean } | null {
    const row = this.db
      .query('SELECT secret, enabled FROM auth_totp WHERE node_id = $node')
      .get({ $node: nodeId }) as Record<string, unknown> | null;
    if (!row) return null;
    return { secret: row.secret as string, enabled: row.enabled === 1 };
  }

  /**
   * Insert or replace a PENDING enrollment (enabled=0, verified_at=NULL) and
   * replace the recovery-code hash set — single transaction, so a re-enroll
   * never leaves stale codes bound to a dead secret.
   */
  upsertPendingTotp(nodeId: TreeNodeId, secret: string, recoveryCodeHashes: string[]): void {
    const upsert = this.db.transaction((hashes: string[]) => {
      this.db
        .query(
          `INSERT INTO auth_totp (node_id, secret, enabled, created_at, verified_at)
           VALUES ($node, $secret, 0, $created, NULL)
           ON CONFLICT(node_id) DO UPDATE SET
           secret = $secret, enabled = 0, created_at = $created, verified_at = NULL`
        )
        .run({ $node: nodeId, $secret: secret, $created: new Date().toISOString() });
      this.db.query('DELETE FROM auth_totp_recovery WHERE node_id = $node').run({ $node: nodeId });
      const insert = this.db.query(
        'INSERT INTO auth_totp_recovery (node_id, code_hash, used_at) VALUES ($node, $hash, NULL)'
      );
      for (const hash of hashes) insert.run({ $node: nodeId, $hash: hash });
    });
    upsert(recoveryCodeHashes);
  }

  /** Flip a pending enrollment to enabled=1 + verified_at=now. Returns false when no row exists. */
  enableTotp(nodeId: TreeNodeId): boolean {
    const result = this.db
      .query('UPDATE auth_totp SET enabled = 1, verified_at = $at WHERE node_id = $node')
      .run({ $at: unixNow(), $node: nodeId });
    return result.changes > 0;
  }

  /** Remove the enrollment and ALL recovery codes (disable). Returns true when a row existed. */
  deleteTotp(nodeId: TreeNodeId): boolean {
    const remove = this.db.transaction(() => {
      this.db.query('DELETE FROM auth_totp_recovery WHERE node_id = $node').run({ $node: nodeId });
      return this.db.query('DELETE FROM auth_totp WHERE node_id = $node').run({ $node: nodeId })
        .changes;
    });
    return remove() > 0;
  }

  /**
   * Single-use recovery code: true (and stamps used_at) when the code's
   * SHA-256 hash exists and is still unused; false otherwise — replaying a
   * consumed code never passes.
   */
  consumeTotpRecovery(nodeId: TreeNodeId, code: string): boolean {
    const result = this.db
      .query(
        `UPDATE auth_totp_recovery SET used_at = $at
         WHERE node_id = $node AND code_hash = $hash AND used_at IS NULL`
      )
      .run({ $at: unixNow(), $node: nodeId, $hash: sha256Hex(code) });
    return result.changes > 0;
  }

  // ── WebAuthn/passkey accessors (narrow, typed — consumed by webauthn.ts) ──

  /** Node behind an alias slug, or null (passkey auth-options scoping; no enumeration). */
  nodeIdForSlug(slug: string): TreeNodeId | null {
    return this.credentialBySlug(slug)?.nodeId ?? null;
  }

  /** All passkeys registered to the node, oldest-first. public_key included — internal use only. */
  passkeysFor(nodeId: TreeNodeId): StoredPasskey[] {
    const rows = this.db
      .query(
        `SELECT credential_id, node_id, public_key, counter, device_name, transports, created_at, last_used_at
         FROM auth_passkeys WHERE node_id = $node ORDER BY created_at ASC`
      )
      .all({ $node: nodeId }) as Record<string, unknown>[];
    return rows.map(row => this.toStoredPasskey(row));
  }

  /** Passkey by its authenticator-minted credential id (assertion lookup), or null. */
  passkeyByCredentialId(
    credentialId: string // brand-ok — opaque WebAuthn credential ID (authenticator-minted wire key)
  ): StoredPasskey | null {
    const row = this.db
      .query(
        `SELECT credential_id, node_id, public_key, counter, device_name, transports, created_at, last_used_at
         FROM auth_passkeys WHERE credential_id = $cred`
      )
      .get({ $cred: credentialId }) as Record<string, unknown> | null;
    return row ? this.toStoredPasskey(row) : null;
  }

  /** Store a verified credential (webauthn.ts finish-registration). */
  insertPasskey(nodeId: TreeNodeId, passkey: NewPasskey): void {
    this.db
      .query(
        `INSERT INTO auth_passkeys
           (credential_id, node_id, public_key, counter, device_name, transports, created_at, last_used_at)
         VALUES ($cred, $node, $key, $counter, $device, $transports, $created, NULL)`
      )
      .run({
        $cred: passkey.credentialId,
        $node: nodeId,
        $key: passkey.publicKey,
        $counter: passkey.counter,
        $device: passkey.deviceName,
        $transports: passkey.transports ? JSON.stringify(passkey.transports) : null,
        $created: new Date().toISOString(),
      });
  }

  /** Advance the sign counter after a verified assertion; also stamps last_used_at. */
  updatePasskeyCounter(
    credentialId: string, // brand-ok — opaque WebAuthn credential ID (authenticator-minted wire key)
    counter: number
  ): void {
    this.db
      .query(
        `UPDATE auth_passkeys SET counter = $counter, last_used_at = $at
         WHERE credential_id = $cred`
      )
      .run({ $counter: counter, $at: unixNow(), $cred: credentialId });
  }

  /** Delete a passkey, SCOPED to the node — another node's credential is never touched. */
  deletePasskey(
    nodeId: TreeNodeId,
    credentialId: string // brand-ok — opaque WebAuthn credential ID (authenticator-minted wire key)
  ): boolean {
    const result = this.db
      .query('DELETE FROM auth_passkeys WHERE credential_id = $cred AND node_id = $node')
      .run({ $cred: credentialId, $node: nodeId });
    return result.changes > 0;
  }

  /**
   * Store a WebAuthn challenge (5min TTL chosen by the caller). Registration
   * challenges are node-scoped; authentication challenges carry NULL node_id
   * (the node is unknown until the assertion arrives). INSERT OR REPLACE so
   * a re-started ceremony replaces its own challenge. Expired rows are swept
   * lazily on every call.
   */
  storeWebAuthnChallenge(
    challenge: string,
    kind: WebAuthnChallengeKind,
    nodeId: TreeNodeId | null,
    expiresAt: number
  ): void {
    this.db
      .query('DELETE FROM auth_webauthn_challenges WHERE expires_at <= $now')
      .run({ $now: unixNow() });
    this.db
      .query(
        `INSERT OR REPLACE INTO auth_webauthn_challenges (challenge, node_id, kind, expires_at, created_at)
         VALUES ($challenge, $node, $kind, $expires, $created)`
      )
      .run({
        $challenge: challenge,
        $node: nodeId,
        $kind: kind,
        $expires: expiresAt,
        $created: new Date().toISOString(),
      });
  }

  /**
   * Consume a challenge: true (and the row is DELETED — single-use) when a
   * matching, unexpired row of the right kind exists. When nodeId is given
   * the row must also belong to that node (registration); null matches any
   * node (authentication, where the row's node_id is NULL by design).
   * Expired rows are swept lazily on every call.
   */
  consumeWebAuthnChallenge(
    challenge: string,
    kind: WebAuthnChallengeKind,
    nodeId: TreeNodeId | null
  ): boolean {
    const now = unixNow();
    this.db
      .query('DELETE FROM auth_webauthn_challenges WHERE expires_at <= $now')
      .run({ $now: now });
    const result = nodeId
      ? this.db
          .query(
            `DELETE FROM auth_webauthn_challenges
             WHERE challenge = $challenge AND kind = $kind AND node_id = $node AND expires_at > $now`
          )
          .run({ $challenge: challenge, $kind: kind, $node: nodeId, $now: now })
      : this.db
          .query(
            `DELETE FROM auth_webauthn_challenges
             WHERE challenge = $challenge AND kind = $kind AND expires_at > $now`
          )
          .run({ $challenge: challenge, $kind: kind, $now: now });
    return result.changes > 0;
  }

  // ── Internals ─────────────────────────────────────────────────────────

  private toStoredPasskey(row: Record<string, unknown>): StoredPasskey {
    return {
      credentialId: row.credential_id as string,
      nodeId: asTreeNodeId(row.node_id as string),
      publicKey: row.public_key as string,
      counter: row.counter as number,
      deviceName: (row.device_name as string | null) ?? null,
      transports: this.parseTransports(row.transports),
      createdAt: row.created_at as string,
      lastUsedAt: (row.last_used_at as number | null) ?? null,
    };
  }

  /** transports column is a JSON array string (or NULL); a malformed value degrades to null. */
  private parseTransports(raw: unknown): string[] | null {
    if (typeof raw !== 'string') return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.every(t => typeof t === 'string')
        ? (parsed as string[])
        : null;
    } catch {
      return null;
    }
  }

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

  /**
   * Shared failed-attempt path (bad password AND bad TOTP code): increment
   * failed_attempts, audit the given action, then escalate to a lock at
   * LOCKOUT_THRESHOLD. Audit order matches the original bad-password flow:
   * failure event first, then account_locked.
   */
  private recordFailedLogin(
    cred: Credential,
    slug: string,
    now: number,
    ip: string | undefined,
    action: string
  ): void {
    const failedAttempts = cred.failedAttempts + 1;
    this.db
      .query(
        'UPDATE auth_alias_credentials SET failed_attempts = failed_attempts + 1 WHERE alias_slug = $slug'
      )
      .run({ $slug: slug });
    this.logAuthEvent({
      nodeId: cred.nodeId,
      action,
      details: { slug, failedAttempts },
      ip,
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
        nodeId: cred.nodeId,
        action: 'account_locked',
        details: {
          slug,
          reason: 'too_many_failed_attempts',
          failedAttempts,
          durationSeconds: LOCKOUT_DURATION_SECONDS,
          lockedUntil,
        },
        ip,
      });
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
