# 🍪 Cookie Security v3.26 - Tier-1380 OMEGA Protocol

> **Bun-native, zero-overhead cookie security architecture with A+ to F grading**

[![Bun Version](https://img.shields.io/badge/bun-%3E%3D1.1.0-black?style=flat-square)](https://bun.sh)
[![Tests](https://img.shields.io/badge/tests-45%20passing-brightgreen?style=flat-square)](./tests/cookie-security-v3.26.test.ts)
[![Performance](https://img.shields.io/badge/performance-7.4M%20ops%2Fs-blueviolet?style=flat-square)](./benchmarks/cookie-security-v3.26.bench.ts)
[![Coverage](https://img.shields.io/badge/coverage-97.2%25-brightgreen?style=flat-square)]()

## 📚 Documentation References

### Bun API Documentation
- **[`Cookie.parse()`](https://bun.sh/docs/api/cookies#cookie.parse)** - Parse cookie header strings at C++ speed
- **[`Cookie.from()`](https://bun.sh/docs/api/cookies#cookie.from)** - Create cookies with native performance
- **[`Cookie.serialize()`](https://bun.sh/docs/api/cookies#cookie.prototype.serialize)** - Serialize to Set-Cookie header
- **[`CookieMap`](https://bun.sh/docs/api/cookies#cookiemap)** - Manage multiple cookies efficiently
- **[`Bun.CryptoHasher`](https://bun.sh/docs/api/hashing)** - High-performance SHA-256 HMAC
- **[`bun build --compile`](https://bun.sh/docs/bundler/executables)** - Build standalone executables

### Security Standards
- **[OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)**
- **[OWASP SameSite Guide](https://owasp.org/www-community/SameSite)**
- **[MDN HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)**
- **[RFC 6265bis - Cookie Prefixes](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-cookie-prefixes)**

## 🚀 Quick Start

### CLI Tool (Standalone Executable)

```bash
# Build the CLI tool
bun build --compile --minify ./cli/cookie-security-cli.ts --outfile cookie-security

# Audit a cookie
./cookie-security audit "session=abc123; Secure; HttpOnly; SameSite=Strict"
# → Grade: A+ (100/100) ✓

# Create secure cookie
./cookie-security create sid '{"user":123}' --type session
# → Grade: A+

# Generate CSRF token
./cookie-security csrf "session_123"
# → Token: xyz789...

# Run benchmarks
./cookie-security benchmark
```

### TypeScript API

```typescript
import { cookieSecurity, variantManager } from './cookie-security-v3.26';

// Parse and validate incoming cookie
const { cookie, report } = cookieSecurity.parseAndValidate(
  'session=abc123; Secure; HttpOnly; SameSite=Strict'
);

console.log(report.grade); // 'A+'
console.log(report.score); // 100
```

## ✨ Features

| Feature | Implementation | Performance |
|---------|----------------|-------------|
| **Cookie Parsing** | `Bun.Cookie.parse()` | 1.8M ops/s |
| **Cookie Creation** | `Bun.Cookie.from()` | 2.2M ops/s |
| **Security Audit** | Multi-factor scoring | 17.7M ops/s |
| **CSRF Tokens** | `Bun.CryptoHasher` SHA-256 | 848K ops/s |
| **A/B Variants** | HMAC-SHA256 signed | 999K ops/s |

## 📖 API Reference

### `Tier1380CookieSecurity`

Main security engine for cookie validation and creation.

#### `parseAndValidate(headerValue: string)`

Parse a cookie header and immediately validate security.

```typescript
const { cookie, report } = cookieSecurity.parseAndValidate(
  'session=abc123; Secure; HttpOnly; SameSite=Strict; Path=/'
);

if (!report.valid) {
  console.error('Security issues:', report.issues);
  // ['Missing Secure flag (MITM vulnerability)']
}
```

**Returns:**
- `cookie` - Bun Cookie instance (or null if parse failed)
- `report` - SecurityReport with grade, score, issues, warnings

#### `audit(cookie: Cookie)`

Perform comprehensive security audit on a Bun Cookie.

```typescript
const cookie = Cookie.from('session', 'value', { secure: true });
const report = cookieSecurity.audit(cookie);
```

**Scoring System:**
| Grade | Score | Description |
|-------|-------|-------------|
| A+ | 95-100 | Excellent security |
| A | 90-94 | Very good |
| B | 80-89 | Good |
| C | 70-79 | Acceptable |
| D | 60-69 | Needs improvement |
| F | <60 | Insecure |

**Security Checks:**
- ✅ `Secure` flag (HTTPS requirement)
- ✅ `HttpOnly` flag (XSS prevention)
- ✅ `SameSite` attribute (CSRF protection)
- ✅ `__Host-` prefix validation
- ✅ `__Secure-` prefix validation
- ✅ Maximum age validation
- ✅ Partitioned attribute (CHIPS)

#### `createSecure(name, value, type, overrides?)`

Create a secure cookie with pre-configured defaults.

```typescript
// Session cookie (1 day, HttpOnly, SameSite=Strict)
const { cookie } = cookieSecurity.createSecure('sid', 'abc123', 'session');

// Auth cookie (4 hours, HttpOnly)
const { cookie } = cookieSecurity.createSecure('auth', token, 'auth');

// Preferences (1 year, JS-accessible, SameSite=Lax)
const { cookie } = cookieSecurity.createSecure('prefs', { theme: 'dark' }, 'preferences');

// CSRF token cookie (session, HttpOnly)
const { cookie } = cookieSecurity.createSecure('csrf', token, 'csrf');
```

**Types:**
- `session` - 1 day, HttpOnly, Strict
- `auth` - 4 hours, HttpOnly, Strict
- `csrf` - Session, HttpOnly, Strict
- `preferences` - 1 year, JS-accessible, Lax

#### `generateCSRF(sessionId: string)`

Generate cryptographically secure CSRF token.

```typescript
const { token, cookie } = await cookieSecurity.generateCSRF('user_session_123');

// Send in response
response.headers.set('X-CSRF-Token', token);
response.headers.set('Set-Cookie', cookie.serialize());
```

Uses `Bun.CryptoHasher` with SHA-256 for high-performance HMAC.

#### `validateCSRF(sessionId: string, token: string)`

Validate submitted CSRF token.

```typescript
const isValid = cookieSecurity.validateCSRF(
  request.cookies.get('session'),
  request.headers.get('X-CSRF-Token')
);

if (!isValid) {
  return new Response('Invalid CSRF token', { status: 403 });
}
```

### `SecureVariantManager`

Cryptographically signed A/B testing variant management.

#### `createVariantCookie(userId, variant, options?)`

Create signed variant assignment.

```typescript
const variant = Math.random() > 0.5 ? 'A' : 'B';
const { cookie, signature } = variantManager.createVariantCookie(
  'user_123',
  variant,
  { maxAge: 60 * 60 * 24 * 30 } // 30 days
);
```

#### `validateVariant(cookieValue, userId)`

Validate variant cookie against tampering.

```typescript
const result = variantManager.validateVariant(
  request.cookies.get('ab_variant'),
  session.userId
);

if (result.valid) {
  console.log('Variant:', result.variant); // 'A' or 'B'
}
```

## 🔧 Integration Examples

### Bun.serve Integration

```typescript
import { serve } from 'bun';
import { cookieSecurity } from './cookie-security-v3.26';

serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Parse all cookies
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = cookieHeader.split(';').map(c => c.trim()).filter(Boolean);
    
    // Audit all cookies
    const reports = cookies.map(c => cookieSecurity.parseAndValidate(c).report);
    const failed = reports.filter(r => !r.valid);
    
    if (failed.length > 0) {
      return Response.json({ 
        error: 'Insecure cookies detected',
        issues: failed.flatMap(f => f.issues)
      }, { status: 400 });
    }
    
    // Create secure session
    if (url.pathname === '/login') {
      const sessionId = crypto.randomUUID();
      
      const { cookie: sessionCookie } = cookieSecurity.createSecure(
        'session', { id: sessionId }, 'session'
      );
      
      const { token, cookie: csrfCookie } = await cookieSecurity.generateCSRF(sessionId);
      
      return new Response('Logged in', {
        headers: {
          'Set-Cookie': [
            sessionCookie.serialize(),
            csrfCookie.serialize()
          ].join(', '),
          'X-CSRF-Token': token
        }
      });
    }
    
    return new Response('OK');
  }
});
```

### Elysia Integration

```typescript
import { Elysia } from 'elysia';
import { cookieSecurity } from './cookie-security-v3.26';

new Elysia()
  .onBeforeHandle(({ request, set }) => {
    // Check cookie security on every request
    const cookieHeader = request.headers.get('cookie') || '';
    const { report } = cookieSecurity.parseAndValidate(cookieHeader);
    
    if (!report.valid) {
      set.status = 400;
      return { error: 'Insecure cookies', issues: report.issues };
    }
  })
  .get('/csrf', async ({ set }) => {
    const { token, cookie } = await cookieSecurity.generateCSRF('session_123');
    set.headers['X-CSRF-Token'] = token;
    set.headers['Set-Cookie'] = cookie.serialize();
    return { token };
  });
```

### Dashboard Badge Integration

The badge appears automatically in all FactoryWager dashboards:

```typescript
// In ui-components.ts header
<span class="cookie-security-badge" id="cookie-security-badge">
  🔒 🍪 v3.26 ?
</span>

// Client-side check updates badge color
const badge = document.getElementById('cookie-security-badge');
// ... checks Secure, HttpOnly, SameSite ...
// Updates to: 🍪 v3.26 A+ (green)
```

## 🎨 Badge Colors

| Grade | Color | Hex | Glow |
|-------|-------|-----|------|
| A+ | Neon Green | `#00FF00` | ✅ |
| A | Bright Green | `#00FF88` | ✅ |
| B | Lime | `#88FF00` | ✅ |
| C | Yellow | `#FFDD00` | ✅ |
| D | Orange | `#FF8800` | ✅ |
| F | Bright Red | `#FF0044` | ✅ |
| ? | Cyan | `#00DDFF` | ✅ |

## 🐛 Debug Mode

Enable debug logging:

```bash
DEBUG_COOKIE_SECURITY=true bun run server.ts
```

Output:
```
[🍪 CookieSecurity] Parsing cookie header: session=abc...
[🍪 CookieSecurity] Parsed cookie: session | Grade: A+ | Score: 100
[🍪 CookieSecurity] Creating session cookie: sid
[🍪 CookieSecurity] Cookie created: sid | Grade: A+
```

## 📊 Performance Benchmarks

Run benchmarks:

```bash
bun benchmarks/cookie-security-v3.26.bench.ts
```

Results on M3 Mac:
```
Cookie.parse (secure)               1,789,229 ops/s
Cookie.from (session)               2,204,330 ops/s
Full audit                         17,742,029 ops/s
CSRF generate                         848,536 ops/s
CSRF validate                      20,867,382 ops/s
Variant create                        998,553 ops/s
Variant validate                    1,359,267 ops/s

Average: 7,440,957 ops/s (Target: 285K) ✅ 26x faster
```

## 🧪 Testing

Run test suite:

```bash
bun test tests/cookie-security-v3.26.test.ts
```

- **45 tests** covering all functionality
- **97.2%** line coverage
- Edge cases: malformed cookies, unicode, rapid generation, expiration

## 🔒 Security Considerations

1. **CSRF Secrets** - Set `CSRF_SECRET` environment variable in production
2. **Variant Secrets** - Set `VARIANT_SECRET` for A/B testing
3. **HTTPS** - Always use `Secure` flag in production
4. **Token Cleanup** - Call `startCleanup()` to prevent memory leaks
5. **Session Storage** - CSRF tokens are stored in memory (Map)

## 📄 License

MIT © FactoryWager Engineering

---

**Tier-1380 OMEGA Protocol** - Built with ❤️ using [Bun](https://bun.sh)
