# Bun-native security (no wrappers)

Use Bun APIs and types from `bun` / `Bun` directly.

| Concern | Primitive | Docs |
|---------|-----------|------|
| Cookie | `Bun.Cookie`, `Bun.CookieMap` | https://bun.com/docs/runtime/cookies |
| Serve cookies | `req.cookies` on `Bun.serve` routes | same |
| CSRF | `Bun.CSRF.generate` / `verify` | https://bun.com/docs/runtime/csrf |
| Secrets | `Bun.secrets.get/set/delete` | https://bun.com/docs/runtime/secrets |
| Hash / HMAC | `new Bun.CryptoHasher(algo[, key])` | https://bun.com/docs/runtime/hashing#bun-cryptohasher |
| Password | `Bun.password.hash` / `verify` | https://bun.com/docs/runtime/hashing#bun-password |
| UUID | `Bun.randomUUIDv7()` | https://bun.com/docs/runtime/utils#bun-randomuuidv7 |
| Env | `Bun.env` | https://bun.com/docs/runtime/environment-variables |

```ts
import { Cookie, CookieMap } from "bun";

// Bun.serve: req.cookies is a CookieMap (Set-Cookie applied automatically)
cookies.set("session", id, { httpOnly: true, secure: true });

// CSRF — always bind sessionId
const token = Bun.CSRF.generate(Bun.env.CSRF_SECRET!, { sessionId });
Bun.CSRF.verify(token, { secret: Bun.env.CSRF_SECRET!, sessionId });

// Secrets (local/CLI) + env fallback for CI
const secret =
  (await Bun.secrets.get({ service: "com.factorywager.app", name: "CSRF_SECRET" })) ??
  Bun.env.CSRF_SECRET;

// Crypto
new Bun.CryptoHasher("sha256", key).update(data).digest("hex");
await Bun.password.hash(password);
```

Migrate env → keychain: `bun run secrets:migrate`

Inspector / A/B helpers live in `lib/security/cookie-security.ts` but still call `Cookie` / `CookieMap` / `Bun.CSRF` from bun.
