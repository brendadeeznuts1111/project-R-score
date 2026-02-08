# 🍪 Cookie Analytics & Zero-Copy Cookie Factory

## Overview

The FactoryWager dashboard now implements **Zero-Copy Cookie Factory** using Bun's native `Cookie` class and `CookieMap` interface. This provides high-performance cookie management with automatic response synchronization and comprehensive cookie analytics.

## 🚀 Features

### 1. Zero-Copy Cookie Factory

**Location**: `src/fraud/session.ts` - `createSecureCookie()`

Uses Bun's native `Cookie` class for optimal performance:

```typescript
const cookie = createSecureCookie('fraud_sid', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  partitioned: true, // CHIPS for cross-site privacy
});
```

**Benefits**:
- **Zero-copy**: Native Bun implementation (no string concatenation)
- **SIMD-optimized**: Bun's CookieMap uses SIMD for parsing
- **Automatic sync**: Changes to `req.cookies` automatically flush to Response
- **Type-safe**: Full TypeScript support with Bun's Cookie class

### 2. Cookie Analytics

**Location**: `src/fraud/session.ts` - `getCookieTelemetry()`

Lightweight cookie audit to track session bloat:

```typescript
const telemetry = getCookieTelemetry(req);
// Returns:
// {
//   count: 5,
//   isSecure: true,
//   totalBytes: 1024,
//   cookieNames: ['fraud_sid', 'd_id', 'v_ts', ...],
//   hasFraudSession: true,
//   hasPartitioned: true,
//   warning: undefined
// }
```

**Metrics Tracked**:
- Cookie count
- Total cookie header size (bytes)
- Security status (HTTPS/TLS)
- Fraud session presence
- Partitioned cookie support (CHIPS)
- Warnings for bloat (>4KB or >20 cookies)

### 3. Dashboard Pulse Integration

**Location**: `src/ui/fraud.html` + `src/ui/dashboard.html`

Real-time cookie analytics displayed in Fraud Intelligence tab:

- **Cookie Count**: Number of cookies
- **Total Size**: Cookie header size in KB (color-coded)
- **Security**: HTTPS/TLS status
- **Fraud Session**: Active session indicator
- **Warnings**: Alerts for cookie bloat

## 📊 Performance Comparison

| Feature | Legacy Node.js | **Bun Zen Way** |
|---------|----------------|-----------------|
| **Parsing** | `cookie` package (Regex) | `new CookieMap(header)` (Native/SIMD) |
| **Response** | `res.setHeader('Set-Cookie', ...)` | `Cookie.toString()` (**Auto-sync**) |
| **Security** | Manual flag management | `Cookie` class with enforced defaults |
| **Storage** | String concatenation | `CookieMap` iteration (Zero-copy) |
| **Analytics** | Manual parsing | `CookieMap.size` + iteration |

## 🔐 Security Features

### CHIPS Support (Partitioned Cookies)

Cookies are created with `partitioned: true` for cross-site privacy:

```typescript
new Bun.Cookie('fraud_sid', token, {
  partitioned: true, // CHIPS: Cookies Having Independent Partitioned State
});
```

This ensures cookies are only accessible within the same top-level site, preventing cross-site tracking.

### Hardened Defaults

All session cookies are hardened by default:

- `httpOnly: true` - Prevents XSS
- `secure: true` - TLS-only (production)
- `sameSite: 'strict'` - CSRF protection
- `partitioned: true` - Cross-site privacy

## 📈 Cookie Analytics API

### Endpoint: `GET /api/fraud/cookie-telemetry`

Returns comprehensive cookie statistics:

```json
{
  "count": 5,
  "isSecure": true,
  "totalBytes": 1024,
  "cookieNames": ["fraud_sid", "d_id", "v_ts", "theme", "lang"],
  "hasFraudSession": true,
  "hasPartitioned": true,
  "warning": null
}
```

**Warning Conditions**:
- `totalBytes > 4096`: High cookie overhead detected
- `count > 20`: Too many cookies

## 🎨 Dashboard Widget

### Cookie Analytics Widget

Located in Fraud Intelligence tab, displays:

1. **Cookie Count**: Total number of cookies
2. **Total Size**: Cookie header size in KB
   - Green: < 2KB (Optimal)
   - Yellow: 2-4KB (Acceptable)
   - Red: > 4KB (Bloat warning)
3. **Security**: HTTPS/TLS status
   - ✅ Secure: HTTPS connection
   - ⚠️ Insecure: HTTP connection
4. **Fraud Session**: Active session indicator
   - ✅ Active: Session cookie present
   - ❌ None: No session cookie

### Auto-Refresh

Widget automatically refreshes every 5 seconds when Fraud Intelligence tab is active.

## 🔧 Usage Examples

### Creating Secure Cookies

```typescript
import { createSecureCookie } from './fraud/session.ts';

// Session cookie (httpOnly)
const sessionCookie = createSecureCookie('fraud_sid', token, {
  httpOnly: true,
  maxAge: 7 * 24 * 60 * 60, // 7 days
});

// Device cookie (readable)
const deviceCookie = createSecureCookie('d_id', deviceId, {
  httpOnly: false,
  maxAge: 14 * 24 * 60 * 60, // 14 days
});
```

### Getting Cookie Telemetry

```typescript
import { getCookieTelemetry } from './fraud/session.ts';

const telemetry = getCookieTelemetry(req);

if (telemetry.warning) {
  console.warn(telemetry.warning);
}

if (telemetry.totalBytes > 4096) {
  // Alert: Cookie bloat detected
}
```

### Automatic Response Sync

When using Bun's routes API, cookies are automatically synchronized:

```typescript
Bun.serve({
  routes: {
    "/api/fraud/login": async (req) => {
      // Set cookies using CookieMap
      const cookies = new Bun.CookieMap(req.headers.get('cookie') || '');
      cookies.set('fraud_sid', token, { httpOnly: true });
      
      // Bun automatically adds Set-Cookie headers to response
      return new Response("Authenticated");
    }
  }
});
```

## 📊 Monitoring Integration

### Health Check Integration

Cookie telemetry can be integrated into health checks:

```typescript
// In health check endpoint
const cookieTelemetry = getCookieTelemetry(req);
const health = {
  cookies: {
    count: cookieTelemetry.count,
    size: cookieTelemetry.totalBytes,
    secure: cookieTelemetry.isSecure,
    warning: cookieTelemetry.warning,
  },
  // ... other health metrics
};
```

### Alerting

Set up alerts for cookie bloat:

```typescript
if (telemetry.totalBytes > 4096) {
  // Send alert: Cookie overhead > 4KB
  sendAlert('Cookie bloat detected', {
    size: telemetry.totalBytes,
    count: telemetry.count,
  });
}
```

## 🎯 Best Practices

### 1. Minimize Cookie Count

Keep cookie count under 20 to avoid performance degradation.

### 2. Minimize Cookie Size

Keep total cookie header size under 4KB for optimal performance.

### 3. Use Partitioned Cookies

Enable `partitioned: true` for cross-site privacy (CHIPS).

### 4. Secure by Default

Always use `secure: true` in production and `httpOnly: true` for sensitive cookies.

### 5. Monitor Cookie Bloat

Regularly check cookie telemetry to detect bloat early.

## 🔍 Debugging

### Enable Cookie Debugging

```typescript
const telemetry = getCookieTelemetry(req);
console.log('Cookie names:', telemetry.cookieNames);
console.log('Total size:', telemetry.totalBytes, 'bytes');
console.log('Warning:', telemetry.warning);
```

### Check Cookie Attributes

```typescript
const cookieHeader = req.headers.get('cookie');
const cookies = new Bun.CookieMap(cookieHeader);

for (const [name, value] of cookies) {
  console.log(`${name}=${value}`);
}
```

## 📚 References

- [Bun Cookie API](https://bun.com/docs/api/cookies)
- [CHIPS Specification](https://developer.mozilla.org/en-US/docs/Web/Privacy/Partitioned_cookies)
- [Cookie Best Practices](https://owasp.org/www-community/HttpOnly)

---

**Your cookie management is now zero-copy, secure, and fully monitored!** 🍪✨
