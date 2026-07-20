# Bun-native security patterns

> FactoryWager SSOT for cookies, CSRF, crypto, and secrets on Bun.

## Cookies

- **API:** `Bun.Cookie` / `Bun.CookieMap`
- **Helpers:** `lib/security/cookies-native.ts`, re-exported from `lib/security`
- **Docs:** https://bun.com/docs/runtime/cookies

```ts
import { Cookie, cookieMapFromRequest, applyCookieMap } from '../lib/security';

const jar = cookieMapFromRequest(req);
const session = jar.get('session');
jar.set('session', id, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });

const headers = new Headers();
applyCookieMap(headers, jar);
```

Defaults: `path: '/'`, `sameSite: 'lax'` (Bun); secure factory via `Cookie.from` uses `httpOnly` + `sameSite: 'strict'`.

## CSRF

- **API:** `Bun.CSRF.generate` / `Bun.CSRF.verify`
- **Wrapper:** `CSRFProtection` in `lib/security/cookie-security.ts`
- **Docs:** https://bun.com/docs/runtime/csrf

**Always pass `sessionId`** to both generate and verify (prevents cross-session replay).

```ts
const token = await CSRFProtection.generateToken(sessionId);
const ok = await CSRFProtection.verify(token, sessionId);
```

Secret: `CSRF_SECRET` via env or `Bun.secrets` (`bun run secrets:migrate`).

## Crypto / hashing

- **Helpers:** `lib/security/crypto-native.ts`
- **Docs:** https://bun.com/docs/runtime/hashing · https://bun.com/docs/runtime/utils#bun-randomuuidv7

| Need | Use |
|------|-----|
| SHA-256 / HMAC | `sha256Hex` / `hmacSha256Hex` (`Bun.CryptoHasher`) |
| Password | `hashPassword` / `verifyPassword` (`Bun.password`, argon2id) |
| UUID | `randomId()` → `Bun.randomUUIDv7()` |
| Bytes | `randomBytes` → `crypto.getRandomValues` |

## Secrets

- **API:** `Bun.secrets` (OS keychain / libsecret / Credential Manager)
- **SSOT:** `lib/security/secrets-manager.ts` (+ `bun-secrets-adapter.ts`)
- **Docs:** https://bun.com/docs/runtime/secrets

```bash
# Copy well-known env secrets into OS store
bun run secrets:migrate
bun run secrets:migrate:dry
```

Names: `MASTER_TOKEN_HMAC_KEY`, `CSRF_SECRET`, `COOKIE_SECRET`, `JWT_SECRET`, `REGISTRY_JWT_SECRET`, `VARIANT_SECRET`.

Resolution order: **Bun.secrets → Bun.env → fail** (dev/test may use `ALLOW_INSECURE_DEFAULTS=1`).

Production deployment secrets may still use vault/CI providers; `Bun.secrets` is primary for local tools and host-bound credentials.

## Related

- Env style: `Bun.env` (not `process.env`) under `lib/`
- Doc refs: `bun tools/bun-doc-refs.ts suggest "Bun.Cookie"`
