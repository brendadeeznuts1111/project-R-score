# lib/identity — Identity & Auth

Authentication layer for the operations platform. Lives in the **same SQLite
file** as `AccountSystem` (`data/accounts-<tenant>.db`, WAL) so auth tables can
`REFERENCES tree_nodes(id)`.

Phase 0: alias credentials (argon2id), sessions (hash-only storage), audit log,
role hierarchy. Phase 1a: lockout enforcement (`lockout.ts`). Phase 2: login
anomaly detection (`anomaly.ts`) and GDPR-style export (`export.ts` +
`GET /auth/export`); high-risk ops alerts via `telegram-alerts.ts`
(`createHighRiskTelegramHook` → `IdentityOptions.onHighRisk`). Phase 2b: geo
blocking (`geo-policy.ts`), password strength (`password-strength.ts`), JIT
provisioning (`jit.ts`). Phase 3: audit-safe impersonation (`impersonate.ts`)
and activity timeline (`timeline.ts` · `getTimeline`). Phase 4: self-service
security (`self-service.ts` — password change, session revoke, device untrust,
IP allowlist; HTTP under `/auth/me/*`). Phase 5: TOTP MFA (`mfa.ts` +
`totp-core.ts` — RFC 6238 enroll/confirm/disable, recovery codes, login
`ctx.otp` gate; HTTP under `/auth/me/totp/*`). Phase 6: WebAuthn/passkeys
(`webauthn.ts` — passwordless login + self-service registration; HTTP under
`/auth/passkey/*` and `/auth/me/passkeys*`).

## Schema (`schema.ts` — `migrateIdentity(db)`, idempotent)

| Table | Purpose |
|---|---|
| `auth_alias_credentials` | `node_id → alias_slug` login, argon2id `password_hash`, `role` (`operator`/`admin`/`superadmin`), lockout columns (`failed_attempts`, `locked_until`, `lock_reason`) |
| `auth_sessions` | `token_hash` (SHA-256) PK — **raw bearer tokens are never stored** — `node_id`, `expires_at` (unix s), `revoked_at`, `ip`, `user_agent`, `impersonator_id` |
| `auth_audit` | Append-only auth event log (`id`, `node_id`, `action`, `details_json`, `ip`, `success`, `created_at`, `impersonator_id`) |
| `auth_device_fingerprints` | `(node_id, fingerprint_hash)` trust registry — `first_seen`/`last_seen`, `country_code`, `trusted` |
| `auth_ip_allowlist` | `(node_id, cidr)` self-service login allowlist — plain IPv4 or IPv4 `/24`, `label`, `created_at` |
| `auth_totp` | TOTP enrollment (mfa.ts) — `node_id` PK, `secret` (plaintext, see tradeoff below), `enabled` (0 pending / 1 confirmed), `created_at`, `verified_at` |
| `auth_totp_recovery` | `(node_id, code_hash)` single-use recovery codes — SHA-256 hashes only, `used_at` stamps consumption |
| `auth_passkeys` | WebAuthn credentials (webauthn.ts) — `credential_id` PK (authenticator-minted), `node_id`, `public_key` (base64url COSE), `counter` (sign counter), `device_name`, `transports` (JSON), `created_at`, `last_used_at` |
| `auth_webauthn_challenges` | Ceremony challenges — `challenge` PK, `node_id` (NULL for authentication: node unknown until the assertion), `kind` (`registration`/`authentication`), `expires_at` (5min TTL), single-use (deleted on consume), expired rows swept lazily |

## Anomaly detection (`anomaly.ts`)

`login()` scores every attempt that carries `ctx.ip` via `checkAnomaly()`:
trusted device → `low`; geo country outside the node's country baseline →
`high` (audits `login_blocked_anomaly`, throws `AnomalyBlockedError`);
first-ever device or known-but-untrusted → `medium` (audits
`login_suspicious`, allowed). An empty country baseline is never anomalous.
Geo is best-effort: constructor option `geoResolver` (production:
`defaultGeoResolver()`, ipapi.co with a 2s timeout, failures → null); no
resolver → no geo signal. `onHighRisk(nodeId, reason)` is a best-effort
alert hook (errors swallowed). `trustDevice(identity, nodeId, hash)` marks a
fingerprint trusted (audits `device_trusted`).

## Geo blocking (`geo-policy.ts`)

Constructor option `geoPolicy: { mode: 'off' | 'allowlist' | 'blocklist';
countries: string[] }` (ISO alpha-2, case-insensitive). Config only — nothing
persisted. `login()` enforces it BEFORE password verification (fail cheap, no
credential oracle): a blocked country audits `login_blocked_geo` (success 0)
and throws `GeoBlockedError` (carries `country`; HTTP → 403). **Offline-allow:**
skipped when the policy is off, `ctx.ip` is absent, no `geoResolver` is
configured, or the resolver returns null — a missing geo signal never blocks.

## Password strength (`password-strength.ts`)

Bun-native scorer (no npm deps): score 0-4 from length, character-class
variety, repeat/sequence penalties, and a small embedded top-100 common-
password blocklist (clearly marked as minimal). `validatePasswordStrength(pw)`
→ `{ score, ok, feedback }` (`ok` = score ≥ 3). `createAlias` enforces the
constructor option `minPasswordScore` (default 3, `0` disables) and throws
`WeakPasswordError` (carries `feedback`; HTTP → 400 via `IdentityError`).

## JIT provisioning (`jit.ts`)

`jitProvision(identity, accounts, profile, opts?)` — provisions an agent tree
node + alias credentials from an OIDC profile.

> ⚠ **The caller MUST verify the OIDC token** (signature, `iss`, `aud`, `exp`)
> before calling — `OidcProfile` is the shape AFTER verification; JWKS/OIDC
> verification is out of scope here. The returned `password` is PLAINTEXT,
> shown once: deliver it over a secure channel, never log it.

- Existing node (`oidc_subject = sub`) → ensures alias credentials exist
  (mints when missing), returns `created: false`.
- No node → creates `type: 'agent'`, `status: 'active'` node + alias (email
  local-part, sanitized, numeric-suffix dedup) + random 20-char password
  (generated until it clears `minPasswordScore`), returns `created: true`.
- **telegram_id placeholder:** `tree_nodes.telegram_id` is UNIQUE NOT NULL, so
  OIDC-only nodes carry the deterministic placeholder `oidc:<sub>`.
- Always audits `jit_provision` (details: `sub`, `email`, `created`).
- Standalone function — `IdentitySystem` and `AccountSystem` stay
  constructor-decoupled.

## Export (`export.ts`)

`exportData(identity, nodeId)` → `{ alias, sessions, audit, deviceFingerprints }`.
`password_hash` / `token_hash` are NEVER selected (explicit column lists).

## Impersonation (`impersonate.ts`)

Superadmin → partner support access, fully audited:

- `impersonate(identity, adminNodeId, targetNodeId)` — caller must be
  `superadmin`; the target must have an identity and must NOT be a superadmin.
  Mints a session for the TARGET with `impersonator_id = adminNodeId` and a
  **1h TTL** (`IMPERSONATION_TTL_SECONDS`, vs the 8h login TTL). Audits
  `impersonation_start` on the target with `details.adminNodeId` +
  `details.sessionId`, and stamps the audit row's `impersonator_id` column.
- `endImpersonation(identity, token)` — revokes the impersonated session,
  audits `impersonation_end` (also `impersonator_id`-stamped).
- `resolveSession` returns `impersonatorId` (null for normal logins).
  `SessionInfo`/`AuthEventInput.impersonatorId` are additive.
- **No ambient context:** when auditing inside an impersonated flow, callers
  pass `impersonatorId` explicitly to `logAuthEvent` — nothing is propagated
  magically.

## Self-service security (`self-service.ts`)

Thin wrapper over narrow `IdentitySystem` accessors — partners manage THEIR
OWN security only (every function takes the caller's own `nodeId`; there is
no target-node parameter). HTTP routes are all Bearer-required under
`/auth/me/*`, scoped to the resolved session's node.

| Route | Body → Response |
|---|---|
| `POST /auth/me/password` | `{ currentPassword, newPassword }` → `{ ok, revoked }` · 400 weak (`feedback`) / 401 bad current |
| `GET /auth/me/sessions` | → `{ sessions: [...] }` (active only; ip, UA, `impersonated` flag — never `token_hash`) |
| `POST /auth/me/sessions/revoke-others` | → `{ revoked: n }` (current token survives) |
| `GET /auth/me/devices` | → `{ devices: [...] }` (fingerprint hash truncated to 12 chars) |
| `POST /auth/me/devices/untrust` | `{ fingerprintHash }` → `{ ok: true }` (full hash or unique ≥12-char prefix) |
| `GET /auth/me/ip-allowlist` | → `{ entries: [...] }` |
| `PUT /auth/me/ip-allowlist` | `{ cidrs: string[] }` → `{ ok, count }` · 400 invalid entry |
| `POST /auth/me/totp/enroll` | → `{ secret, uri, recoveryCodes }` (plaintext once) · 409 already enabled |
| `POST /auth/me/totp/confirm` | `{ code }` → `{ ok: true }` · 400 invalid code / nothing pending |
| `POST /auth/me/totp/disable` | `{ code }` → `{ ok: true }` (TOTP or recovery code) · 400 invalid |

Library API: `changePassword` (verify current → strength-check new → argon2id
rehash + `rotated_at` → revoke all OTHER sessions; audits
`password_change_failed` / `password_changed` / `sessions_revoked`),
`listSessions`, `revokeOwnSession` ("log out this device"),
`revokeOtherSessions`, `listDevices`, `untrustDevice` (audits
`device_untrusted`; `trustDevice` is re-exported from `anomaly.ts`, not
duplicated), `setIpAllowlist` / `getIpAllowlist`.

**IP allowlist semantics.** Entries are plain IPv4 (`203.0.113.7`) or IPv4
`/24` (`203.0.113.0/24`) only — other prefix lengths and IPv6 are rejected at
write time. Enforcement in `login()` runs AFTER the geo gate and BEFORE
password verification (fail cheap): with ≥1 entries, a `ctx.ip` matching none
(exact IPv4, or /24 prefix — the documented approximation, same granularity
as anomaly fingerprints) audits `login_blocked_ip` (success 0) and throws
`IpNotAllowedError` (HTTP → 403). Empty allowlist → no restriction; absent
`ctx.ip` → allowed (a missing IP signal never blocks).
`setIpAllowlist` is replace-all (audits `ip_allowlist_updated` with count).

## TOTP MFA (`mfa.ts` / `totp-core.ts`)

Bun-native RFC 6238 TOTP (no npm deps): HMAC-SHA1 via `crypto.subtle`, 20-byte
secrets from `crypto.getRandomValues`, base32 (RFC 4648) hand-rolled in
`totp-core.ts` (pure — no identity.ts imports; `identity.ts` imports it for
the login gate, keeping the module graph cycle-free). `mfa.ts` is the thin
policy/audit wrapper; `generateTotp` / `verifyTotp` are re-exported from it.

Flow (self-service, own node; routes are Bearer-required under
`/auth/me/totp/*`):

1. `enrollTotp` (`POST /auth/me/totp/enroll`) → `{ secret, uri, recoveryCodes }`.
   160-bit base32 secret + `otpauth://totp/FactoryWager:<slug>?secret=…&issuer=FactoryWager`
   URI + 8 single-use recovery codes (10-char alnum, rejection-sampled).
   Returned plaintext ONCE; the DB stores the secret + SHA-256 code hashes.
   Row starts `enabled=0` — a pending enrollment never gates login. Audits
   `totp_enrolled`. 409 when already enabled.
2. `confirmTotp` (`POST …/confirm`, `{ code }`) → verifies a live code,
   flips `enabled=1` + `verified_at`. Audits `totp_enabled`, or
   `totp_confirm_failed` (0) + `IdentityError`.
3. `disableTotp` (`POST …/disable`, `{ code }`) → requires a valid TOTP code
   OR an unused recovery code (a password-only attacker cannot strip MFA).
   Deletes enrollment + all codes. Audits `totp_disabled` /
   `totp_disable_failed` (0) / `totp_recovery_used`.

**Login with MFA.** When the node has an ENABLED enrollment, `login()`
requires `ctx.otp` AFTER password verification and BEFORE the anomaly hook:
missing → `login_totp_required` (0) + `TotpRequiredError` (HTTP 401
`{ error: 'totp_required' }` — same status as bad creds, distinct
machine-readable code, no enumeration); wrong code → `login_totp_failed`
through the SAME `failed_attempts`/lockout escalation as a bad password,
then `InvalidCredentialsError` (no MFA oracle). A recovery code in
`ctx.otp` is consumed (`used_at`) and audits `totp_recovery_used`; replays
are rejected. HTTP login body accepts optional `otp`.

**At-rest tradeoff (deliberate).** The TOTP shared secret is stored
PLAINTEXT in `auth_totp.secret` — unlike passwords it cannot be
salted-hashed (the server must compute the same HMAC as the authenticator),
and encryption with a same-host key is theatre. This is the pragmatic norm
for TOTP; mitigation is DB file permissions + backup hygiene.

## WebAuthn/passkeys (`webauthn.ts`)

Passwordless login + self-service passkey management. Thin policy/audit
wrapper over narrow `IdentitySystem` accessors (same pattern as `mfa.ts`).

> **One-dep justification.** Attestation/assertion verification is delegated
> to `@simplewebauthn/server` — the ONE approved runtime dependency for this
> subsystem. WebAuthn verification (COSE key parsing, attestation formats,
> signature checks) must NOT be hand-rolled; the subsystem stays
> Bun-native/zero-dep everywhere else (TOTP, password strength, base32 are
> all hand-rolled because they are small, stable, and auditable — WebAuthn
> is not). Only the options/response JSON wire types are re-exported.

Relying-party config via `IdentityOptions.webauthn` (resolved on
`identity.webauthnConfig`): `rpName` (default `'FactoryWager'`), `rpID`
(default `'factory-wager.com'`), `origin` (default
`'https://factory-wager.com'`).

**Registration** (Bearer self-scope, caller's own node):

1. `startPasskeyRegistration(identity, nodeId, deviceName?)`
   (`POST /auth/passkey/register-options`, body `{ deviceName? }`) →
   `PublicKeyCredentialCreationOptionsJSON` — `excludeCredentials` = existing
   passkeys, `userID` = nodeId bytes; challenge stored (kind `registration`,
   5min TTL, node-scoped).
2. `finishPasskeyRegistration(identity, nodeId, response, deviceName?)`
   (`POST /auth/passkey/register-verify`, body `{ response, deviceName? }`)
   → verifies via `verifyRegistrationResponse` against the stored challenge
   (single-use: consumed via the `expectedChallenge` callback, so a failed
   verify also burns the challenge), then stores the credential (id, base64url
   public key, counter, transports, device name). Audits `passkey_registered`
   / `passkey_register_failed` (0).

**Authentication** (passwordless login, public routes):

1. `startPasskeyAuthentication(identity, slug)`
   (`POST /auth/passkey/auth-options`, body `{ slug }`) →
   `PublicKeyCredentialRequestOptionsJSON` scoped to the slug's credentials.
   Unknown slug → empty `allowCredentials` + a stored challenge anyway (**no
   user enumeration**). Challenge stored with NULL `node_id` (node unknown
   until the assertion) and consumed by challenge value.
2. `finishPasskeyAuthentication(identity, slug, response, { ip?, userAgent? }?)`
   (`POST /auth/passkey/auth-verify`, body `{ slug, response }`) →
   `{ token, expiresAt }` — verifies via `verifyAuthenticationResponse`
   (`requireUserVerification: false`), advances the sign counter, audits
   `login_success` with `details.via='passkey'`, and mints the session via
   `IdentitySystem.createSession` (same hash-only storage invariant as
   `login()`). A counter REGRESSION audits `passkey_counter_regression` (0)
   and blocks; other failures audit `passkey_auth_failed` (0).

**Management** (Bearer self): `listPasskeys(identity, nodeId)`
(`GET /auth/me/passkeys` — credential id truncated to 12 chars, `public_key`
NEVER included), `revokePasskey(identity, nodeId, credentialId)`
(`POST /auth/me/passkeys/revoke` — full id or unique ≥12-char prefix; audits
`passkey_revoked`).

**Errors** (all 400, machine-readable): `PasskeyChallengeError` →
`passkey_challenge_invalid` (unknown/used/expired challenge),
`PasskeyVerificationError` → `passkey_verification_failed` (unknown
credential or failed attestation/assertion),
`PasskeyCounterRegressionError` → `passkey_counter_regression` (cloned
authenticator signal).

**Testability seam.** The four @simplewebauthn calls are injectable via
`PasskeyOverrides` on every start/finish function — tests run with fakes
(zero real attestation crypto); production passes nothing.

## API (`identity.ts`)

```ts
const identity = new IdentitySystem();                        // default tenant 'operations'
const identity = new IdentitySystem(tenantId, dbPath);        // explicit DB (tests)
const identity = new IdentitySystem(tenantId, dbPath, {       // Phase 2 options
  geoResolver: defaultGeoResolver(),                          //   geo signal for anomaly scoring
  onHighRisk: (nodeId, reason) => { /* ops alert */ },        //   best-effort, errors swallowed
  geoPolicy: { mode: 'blocklist', countries: ['KP'] },        //   Phase 2b geo blocking (default off)
  minPasswordScore: 3,                                        //   Phase 2b strength bar (0 disables)
});

await identity.createAlias(nodeId, 'slug-name', 'password', 'operator');
const { token, sessionId, expiresAt } = await identity.login('slug-name', 'password', { ip, userAgent });
const session = identity.resolveSession(token);               // SessionInfo | null (unknown/expired/revoked)
identity.logout(token);

identity.requireRole(nodeId, 'admin');                        // operator < admin < superadmin
identity.getRole(nodeId);                                     // IdentityRole | null
identity.isLocked('slug-name');
identity.logAuthEvent({ nodeId, action, details, ip, success });
identity.auditFor(nodeId, { action, limit });                 // newest-first
identity.close();
```

Failures: `InvalidCredentialsError` (unknown slug **or** wrong password **or**
wrong TOTP code — never distinguish), `AccountLockedError` (carries
`lockedUntil`), `GeoBlockedError`
(carries `country`, HTTP 403), `IpNotAllowedError` (carries `ip`, HTTP 403),
`TotpRequiredError` (MFA enabled, `ctx.otp` missing — HTTP 401
`{ error: 'totp_required' }`),
`WeakPasswordError` (carries `feedback`),
`IdentityError` (validation, duplicate slug, unknown node, TOTP
enroll/confirm/disable policy).

## HTTP (`http.ts`)

`createIdentityHandler(identity)` → `(req) => Promise<Response | null>`;
returns `null` for non-`/auth/` paths so hosts can chain. This file is the
**wire boundary** — bodies are parsed/type-guarded here, branded values flow
inward.

- `POST /auth/login` `{ slug, password, otp? }` → `{ token, sessionId, expiresAt }` · 400/401 (`Invalid credentials` or `totp_required`)/403 (anomaly-blocked)/423
- `POST /auth/logout` `Authorization: Bearer <token>` → `{ ok: true }`
- `GET /auth/session` `Authorization: Bearer <token>` → `{ sessionId, nodeId, role }` · 401
- `GET /auth/export` `Authorization: Bearer <token>` → JSON attachment `export-<nodeId>.json`;
  `?node=<TreeNodeId>` for another node requires admin|superadmin · 401/403
- `POST /auth/impersonate` `Authorization: Bearer <token>` (superadmin) + `{ nodeId }`
  → `{ token, expiresAt }` (1h TTL, impersonated session for the target) · 400/401/403/404
- `POST /auth/impersonate/end` `Authorization: Bearer <impersonated token>` → `{ ok: true }` · 401
- `POST /auth/passkey/register-options` `Authorization: Bearer <token>` + `{ deviceName? }`
  → `PublicKeyCredentialCreationOptionsJSON` · 400/401/403
- `POST /auth/passkey/register-verify` `Authorization: Bearer <token>` + `{ response, deviceName? }`
  → `{ ok: true }` · 400 (`passkey_challenge_invalid` / `passkey_verification_failed`)/401/403
- `POST /auth/passkey/auth-options` (public) `{ slug }` → `PublicKeyCredentialRequestOptionsJSON`
  (unknown slug → empty `allowCredentials`, no enumeration) · 400
- `POST /auth/passkey/auth-verify` (public) `{ slug, response }` → `{ token, expiresAt }`
  · 400 (`passkey_challenge_invalid` / `passkey_verification_failed` / `passkey_counter_regression`)
- `GET /auth/me/passkeys` `Authorization: Bearer <token>` → `{ passkeys: [...] }`
  (credential id truncated to 12 chars, never `public_key`) · 401
- `POST /auth/me/passkeys/revoke` `Authorization: Bearer <token>` + `{ credentialId }`
  → `{ ok: true }` · 400/401

Session-resolving routes (`/auth/session`, `/auth/export`,
`/auth/impersonate/end`) set the response header `X-Impersonator: <nodeId>`
when the resolved session is impersonated; absent otherwise.

Client IP from `CF-Connecting-IP`, else `X-Forwarded-For`.

## Smoke

```ts
import { IdentitySystem } from './lib/identity/identity.ts';
import { createIdentityHandler } from './lib/identity/http.ts';

const identity = new IdentitySystem();
await identity.createAlias(nodeId, 'ops-admin', 's3cret', 'admin'); // nodeId from AccountSystem
Bun.serve({ port: 8080, fetch: createIdentityHandler(identity) });
```

```bash
TOKEN=$(curl -s localhost:8080/auth/login \
  -H 'content-type: application/json' \
  -d '{"slug":"ops-admin","password":"s3cret"}' | jq -r .token)
curl -s localhost:8080/auth/session -H "Authorization: Bearer $TOKEN"
curl -s -X POST localhost:8080/auth/logout -H "Authorization: Bearer $TOKEN"
```

## Deployment note

`bun:sqlite` is server-side only — **not compatible with Cloudflare Pages
Functions / Workers**. Host behind a Bun server (`Bun.serve`), never from the
edge bundle.
