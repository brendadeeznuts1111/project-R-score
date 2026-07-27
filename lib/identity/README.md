# lib/identity — Identity & Auth

Authentication layer for the operations platform. Lives in the **same SQLite
file** as `AccountSystem` (`data/accounts-<tenant>.db`, WAL) so auth tables can
`REFERENCES tree_nodes(id)`.

Phase 0: alias credentials (argon2id), sessions (hash-only storage), audit log,
role hierarchy. Phase 1a: lockout enforcement (`lockout.ts`). Phase 2: login
anomaly detection (`anomaly.ts`) and GDPR-style export (`export.ts` +
`GET /auth/export`). Phase 3: audit-safe impersonation (`impersonate.ts`).

## Schema (`schema.ts` — `migrateIdentity(db)`, idempotent)

| Table | Purpose |
|---|---|
| `auth_alias_credentials` | `node_id → alias_slug` login, argon2id `password_hash`, `role` (`operator`/`admin`/`superadmin`), lockout columns (`failed_attempts`, `locked_until`, `lock_reason`) |
| `auth_sessions` | `token_hash` (SHA-256) PK — **raw bearer tokens are never stored** — `node_id`, `expires_at` (unix s), `revoked_at`, `ip`, `user_agent`, `impersonator_id` |
| `auth_audit` | Append-only auth event log (`id`, `node_id`, `action`, `details_json`, `ip`, `success`, `created_at`, `impersonator_id`) |
| `auth_device_fingerprints` | `(node_id, fingerprint_hash)` trust registry — `first_seen`/`last_seen`, `country_code`, `trusted` |

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

## API (`identity.ts`)

```ts
const identity = new IdentitySystem();                        // default tenant 'operations'
const identity = new IdentitySystem(tenantId, dbPath);        // explicit DB (tests)
const identity = new IdentitySystem(tenantId, dbPath, {       // Phase 2 options
  geoResolver: defaultGeoResolver(),                          //   geo signal for anomaly scoring
  onHighRisk: (nodeId, reason) => { /* ops alert */ },        //   best-effort, errors swallowed
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

Failures: `InvalidCredentialsError` (unknown slug **or** wrong password — never
distinguish), `AccountLockedError` (carries `lockedUntil`), `IdentityError`
(validation, duplicate slug, unknown node).

## HTTP (`http.ts`)

`createIdentityHandler(identity)` → `(req) => Promise<Response | null>`;
returns `null` for non-`/auth/` paths so hosts can chain. This file is the
**wire boundary** — bodies are parsed/type-guarded here, branded values flow
inward.

- `POST /auth/login` `{ slug, password }` → `{ token, sessionId, expiresAt }` · 400/401/403 (anomaly-blocked)/423
- `POST /auth/logout` `Authorization: Bearer <token>` → `{ ok: true }`
- `GET /auth/session` `Authorization: Bearer <token>` → `{ sessionId, nodeId, role }` · 401
- `GET /auth/export` `Authorization: Bearer <token>` → JSON attachment `export-<nodeId>.json`;
  `?node=<TreeNodeId>` for another node requires admin|superadmin · 401/403
- `POST /auth/impersonate` `Authorization: Bearer <token>` (superadmin) + `{ nodeId }`
  → `{ token, expiresAt }` (1h TTL, impersonated session for the target) · 400/401/403/404
- `POST /auth/impersonate/end` `Authorization: Bearer <impersonated token>` → `{ ok: true }` · 401

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
