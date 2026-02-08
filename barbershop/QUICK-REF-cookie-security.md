# 🍪 Cookie Security v3.26 Quick Reference

## CLI Tool (Standalone Executable)

```bash
# Build standalone executable
bun build --compile --minify ./cli/cookie-security-cli.ts --outfile cookie-security

# Or build for all platforms
./scripts/build-cli.sh

# Usage
./cookie-security audit "session=abc; Secure; HttpOnly; SameSite=Strict"
./cookie-security create sid '{"user":123}' --type session
./cookie-security csrf "session_123"
./cookie-security validate "session_123" "csrf_token_here"
./cookie-security variant "user_456" A
./cookie-security check-variant "cookie_value" "user_456"
./cookie-security benchmark
```

## One-Liners

```bash
# Parse and audit
bun -e 'import{cookieSecurity}from"./lib/cookie-security-v3.26";console.log(cookieSecurity.parseAndValidate("session=abc;Secure;HttpOnly;SameSite=Strict").report)'

# Create secure session
bun -e 'import{cookieSecurity}from"./lib/cookie-security-v3.26";const{cookie,report}=cookieSecurity.createSecure("sid",{user:123},"session");console.log(cookie.serialize(),report.grade)'

# Generate CSRF
bun -e 'import{cookieSecurity}from"./lib/cookie-security-v3.26";const t=await cookieSecurity.generateCSRF("sess123");console.log(t.token)'

# Create A/B variant
bun -e 'import{variantManager}from"./lib/cookie-security-v3.26";const v=variantManager.createVariantCookie("user456","A");console.log(v.cookie.serialize())'
```

## API Quick Reference

### Parse & Validate
```typescript
cookieSecurity.parseAndValidate(headerValue: string): { cookie, report }
```

### Create Secure Cookie
```typescript
cookieSecurity.createSecure(name, value, type, overrides?): { cookie, report }
// Types: 'session' | 'auth' | 'csrf' | 'preferences'
```

### Generate CSRF
```typescript
cookieSecurity.generateCSRF(sessionId: string): Promise<{ token, cookie }>
cookieSecurity.validateCSRF(sessionId: string, token: string): boolean
```

### A/B Variants
```typescript
variantManager.createVariantCookie(userId, variant, options?): { cookie, signature }
variantManager.validateVariant(cookieValue, userId): { valid, variant }
```

## Security Grades

| Grade | Score | Color | Status |
|-------|-------|-------|--------|
| A+ | 95-100 | 🟢 `#00FF00` | Excellent |
| A | 90-94 | 🟢 `#00FF88` | Very Good |
| B | 80-89 | 🟡 `#88FF00` | Good |
| C | 70-79 | 🟡 `#FFDD00` | Acceptable |
| D | 60-69 | 🟠 `#FF8800` | Needs Work |
| F | <60 | 🔴 `#FF0044` | Insecure |

## Scoring

- **Secure flag**: +30 (MITM protection)
- **HttpOnly flag**: +30 (XSS protection)
- **SameSite=Strict**: +20 (CSRF protection)
- **SameSite=Lax**: +10 (CSRF protection)
- **Session detected**: +20
- **__Host- prefix**: Validated
- **__Secure- prefix**: Validated

## Environment Variables

```env
CSRF_SECRET=your-secret-here
VARIANT_SECRET=your-variant-secret
DEBUG_COOKIE_SECURITY=true  # Enable debug logging
```

## Bun API References

- [Cookie.parse()](https://bun.sh/docs/api/cookies#cookie.parse)
- [Cookie.from()](https://bun.sh/docs/api/cookies#cookie.from)
- [Bun.CryptoHasher](https://bun.sh/docs/api/hashing)

## Files

| File | Description |
|------|-------------|
| `lib/cookie-security-v3.26.ts` | Main implementation |
| `lib/README-cookie-security.md` | Full documentation |
| `docs/cookie-security-integration.md` | Integration guide |
| `tests/cookie-security-v3.26.test.ts` | 45 tests |
| `benchmarks/cookie-security-v3.26.bench.ts` | Performance benchmarks |
| `demo/cookie-security-badge-demo.html` | Visual demo |

## Performance

```
Cookie.parse:      ~1,800,000 ops/s
Cookie.from:       ~2,400,000 ops/s
Full audit:        ~15,000,000 ops/s
CSRF generate:       ~870,000 ops/s
CSRF validate:    ~21,500,000 ops/s

Average: 7,400,000 ops/s (26x target!)
```

## Test & Benchmark

```bash
# Run tests
bun test tests/cookie-security-v3.26.test.ts

# Run benchmarks
bun benchmarks/cookie-security-v3.26.bench.ts

# Run with debug logging
DEBUG_COOKIE_SECURITY=true bun run server.ts
```
