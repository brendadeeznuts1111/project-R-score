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
 *     set; automatic lockout escalation is Phase 1 (columns already exist).
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
}

export interface AuthEventInput {
  nodeId?: TreeNodeId | null;
  action: string;
  details?: Record<string, unknown>;
  ip?: string;
  success?: boolean;
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

  constructor(tenantId: PortalTenantId = asPortalTenantId('operations'), dbPath?: string) {
    this.tenantId = tenantId;
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
      this.db
        .query(
          'UPDATE auth_alias_credentials SET failed_attempts = failed_attempts + 1 WHERE alias_slug = $slug'
        )
        .run({ $slug: slug });
      this.logAuthEvent({
        nodeId,
        action: 'login_failed',
        details: { slug, failedAttempts: cred.failedAttempts + 1 },
        ip: ctx.ip,
        success: false,
      });
      throw new InvalidCredentialsError();
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
      .query('SELECT node_id, expires_at, revoked_at FROM auth_sessions WHERE token_hash = $hash')
      .get({ $hash: tokenHash }) as Record<string, unknown> | null;

    if (!row) return null;
    if (row.revoked_at !== null) return null;
    if ((row.expires_at as number) <= unixNow()) return null;

    const nodeId = asTreeNodeId(row.node_id as string);
    return {
      sessionId: asSessionId(tokenHash),
      nodeId,
      role: this.getRole(nodeId) ?? 'operator',
    };
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

  // ── Audit ─────────────────────────────────────────────────────────────

  logAuthEvent(entry: AuthEventInput): IdentityId {
    const id = asIdentityId(Bun.randomUUIDv7());
    this.db
      .query(
        `INSERT INTO auth_audit (id, node_id, action, details_json, ip, success, created_at)
         VALUES ($id, $node, $action, $details, $ip, $success, $created)`
      )
      .run({
        $id: id,
        $node: entry.nodeId ?? null,
        $action: entry.action,
        $details: entry.details ? JSON.stringify(entry.details) : null,
        $ip: entry.ip ?? null,
        $success: entry.success === false ? 0 : 1,
        $created: new Date().toISOString(),
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

  // ── Internals ─────────────────────────────────────────────────────────

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
