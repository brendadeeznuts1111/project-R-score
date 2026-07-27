// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7 (via AccountSystem.create)
/**
 * JIT provisioning from an OIDC profile (Phase 2b).
 *
 * ⚠ TRUST BOUNDARY: `OidcProfile` is the shape AFTER token verification.
 * Actual OIDC/JWKS verification is OUT OF SCOPE for this module — the CALLER
 * MUST verify the ID token (signature, iss, aud, exp) before calling
 * `jitProvision`. Passing an unverified profile here mints real credentials.
 *
 * Thin-wrapper module (same pattern as impersonate.ts): all DB access goes
 * through narrow typed methods — `AccountSystem.getByOidcSubject` /
 * `AccountSystem.create` and `IdentitySystem.createAlias` /
 * `aliasSlugTaken` / `aliasSummaryFor` / `logAuthEvent`. IdentitySystem and
 * AccountSystem stay constructor-decoupled; this function takes both.
 *
 * telegram_id placeholder: `tree_nodes.telegram_id` is UNIQUE NOT NULL
 * (lib/accounts/accounts.ts), and OIDC-only principals have no Telegram
 * account. JIT nodes therefore carry the deterministic placeholder
 * `oidc:<sub>` — unique per subject (satisfies UNIQUE), self-describing, and
 * trivially distinguishable from real Telegram ids when the operator later
 * links one.
 *
 * The returned `password` is PLAINTEXT, shown exactly once: the caller must
 * deliver it to the user over a secure channel and must not log it. Only the
 * argon2id hash is stored.
 */

import { asTelegramUserId, type TreeNodeId } from '../types/branded.ts';
import type { AccountSystem } from '../accounts/accounts.ts';
import type { IdentityRole, IdentitySystem } from './identity.ts';
import { validatePasswordStrength } from './password-strength.ts';

/** OIDC profile AFTER the caller has verified the token (see header warning). */
export interface OidcProfile {
  sub: string;
  email: string;
  name?: string;
}

export interface JitResult {
  nodeId: TreeNodeId;
  /** true when the tree node was created by this call. */
  created: boolean;
  /** Alias slug when credentials were (created or already) present. */
  alias?: string;
  /** Plaintext password — only when credentials were minted by this call. */
  password?: string;
}

const PASSWORD_ALPHABET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';

/** Random 20-char password across all four character classes. */
function generatePassword(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length]).join('');
}

/**
 * Derive an alias slug from the email local-part: lowercase, invalid chars
 * collapse to '-', edge dashes trimmed, padded to the 3-char minimum,
 * truncated to leave room for a numeric dedup suffix. createAlias re-validates
 * against the canonical SLUG_PATTERN, so this only needs to be well-formed.
 */
function slugFromEmail(email: string): string {
  const local = email.split('@')[0] ?? '';
  let slug = local
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length === 0) slug = 'agent';
  while (slug.length < 3) slug = `${slug}x`;
  return slug.slice(0, 30);
}

/** First free slug: base, base-2, base-3, … */
function dedupSlug(identity: IdentitySystem, base: string): string {
  let candidate = base;
  for (let n = 2; identity.aliasSlugTaken(candidate); n++) {
    candidate = `${base}-${n}`.slice(0, 32);
  }
  return candidate;
}

/** Mint credentials (alias + password) for `nodeId`; returns slug + plaintext password. */
async function mintCredentials(
  identity: IdentitySystem,
  nodeId: TreeNodeId,
  email: string,
  role: IdentityRole,
  passwordOpt?: string
): Promise<{ alias: string; password: string }> {
  const alias = dedupSlug(identity, slugFromEmail(email));
  let password = passwordOpt;
  if (password === undefined) {
    // Generate until the password clears the system's own strength bar —
    // a 20-char 4-class password passes on the first try in practice; the
    // bound only guards against pathological repeat/sequence draws.
    const minScore = identity.minPasswordScore;
    do {
      password = generatePassword();
    } while (minScore > 0 && validatePasswordStrength(password).score < minScore);
  }
  // With an explicit opts.password, createAlias itself enforces the bar
  // (throws WeakPasswordError) — no duplicate check here.
  await identity.createAlias(nodeId, alias, password, role);
  return { alias, password };
}

/**
 * Provision (or resume) an identity from a verified OIDC profile.
 *
 * - Existing node (`oidc_subject = profile.sub`) → ensures alias credentials
 *   exist (mints them when missing) and returns `created: false`.
 * - No node → creates an `agent` tree node (status `active`, placeholder
 *   telegramId `oidc:<sub>`, default rail) plus alias credentials, and
 *   returns `created: true` with the plaintext password.
 *
 * Always audits `jit_provision` (details: sub, email, created).
 */
export async function jitProvision(
  identity: IdentitySystem,
  accounts: AccountSystem,
  profile: OidcProfile,
  opts: { role?: IdentityRole; password?: string } = {}
): Promise<JitResult> {
  const role = opts.role ?? 'operator';
  const existing = accounts.getByOidcSubject(profile.sub);

  if (existing) {
    const summary = identity.aliasSummaryFor(existing.id);
    let creds: { alias: string; password: string } | null = null;
    if (summary === null) {
      creds = await mintCredentials(identity, existing.id, profile.email, role, opts.password);
    }
    identity.logAuthEvent({
      nodeId: existing.id,
      action: 'jit_provision',
      details: { sub: profile.sub, email: profile.email, created: false },
    });
    return {
      nodeId: existing.id,
      created: false,
      alias: creds?.alias ?? summary?.slug,
      password: creds?.password,
    };
  }

  const node = await accounts.create({
    type: 'agent',
    parentId: null,
    expertId: null,
    name: profile.name ?? slugFromEmail(profile.email),
    email: profile.email,
    // telegram_id is UNIQUE NOT NULL — deterministic placeholder, see header.
    telegramId: asTelegramUserId(`oidc:${profile.sub}`),
    oidcSubject: profile.sub,
    railPreference: 'paypal',
    cutPercentage: 0,
    status: 'active',
  });

  const creds = await mintCredentials(identity, node.id, profile.email, role, opts.password);

  identity.logAuthEvent({
    nodeId: node.id,
    action: 'jit_provision',
    details: { sub: profile.sub, email: profile.email, created: true },
  });

  return { nodeId: node.id, created: true, alias: creds.alias, password: creds.password };
}
