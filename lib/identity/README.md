# lib/identity — Identity & Auth (Phase 0)

Authentication layer for the operations platform. Lives in the **same SQLite
file** as `AccountSystem` (`data/accounts-<tenant>.db`, WAL) so auth tables can
`REFERENCES tree_nodes(id)`.

Phase 0 scope: alias credentials (argon2id), sessions (hash-only storage),
audit log, role hierarchy, lockout *columns* (enforcement escalation is Phase 1 —
`failed_attempts` is tracked and a set `locked_until` is honored, but nothing
sets it automatically yet).

## Schema (`schema.ts` — `migrateIdentity(db)`, idempotent)

| Table | Purpose |
|---|---|
| `auth_alias_credentials` | `node_id → alias_slug` login, argon2id `password_hash`, `role` (`operator`/`admin`/`superadmin`), lockout columns (`failed_attempts`, `locked_until`, `lock_reason`) |
| `auth_sessions` | `token_hash` (SHA-256) PK — **raw bearer tokens are never stored** — `node_id`, `expires_at` (unix s), `revoked_at`, `ip`, `user_agent` |
| `auth_audit` | Append-only auth event log (`id`, `node_id`, `action`, `details_json`, `ip`, `success`, `created_at`) |
| `auth_device_fingerprints` | `(node_id, fingerprint_hash)` trust registry — Phase 1+ |

## API (`identity.ts`)

```ts
const identity = new IdentitySystem();                        // default tenant 'operations'
const identity = new IdentitySystem(tenantId, dbPath);        // explicit DB (tests)

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

- `POST /auth/login` `{ slug, password }` → `{ token, sessionId, expiresAt }` · 400/401/423
- `POST /auth/logout` `Authorization: Bearer <token>` → `{ ok: true }`
- `GET /auth/session` `Authorization: Bearer <token>` → `{ sessionId, nodeId, role }` · 401

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
