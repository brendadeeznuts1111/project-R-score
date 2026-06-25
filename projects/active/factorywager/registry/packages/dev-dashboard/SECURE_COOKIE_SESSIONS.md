# 🛡️ Secure Cookie-Based Fraud Session Management

## Overview

The FactoryWager dashboard now implements **hardened cookie-based session management** using Bun's built-in Cookie API. This provides automatic response synchronization, XSS protection, CSRF protection, and secure state management between the dashboard and fraud engine.

## 🎯 Features

### 1. Secure Fraud-Session Management

**Location**: `src/fraud/session.ts` - `setFraudSession()`

When a user authenticates, the system sets hardened cookies with:

- **`fraud_sid`**: Session hash (httpOnly, secure, strict)
- **`d_id`**: Device fingerprint (readable, secure, strict)
- **`v_ts`**: Visit timestamp (readable, secure, strict)

**Security Flags**:
- `httpOnly: true` - Prevents XSS-based cookie theft
- `secure: true` - TLS-only transmission (production)
- `sameSite: strict` - CSRF protection
- `maxAge: 7 days` - Session expiry

### 2. Context-Aware Fraud Detection

**Location**: `src/fraud/session.ts` - `extractFraudContext()`

Automatically extracts fraud context from cookies for enhanced event tracking:

```typescript
const context = extractFraudContext(req);
// Returns: { deviceId, sessionId, lastVisit, ipAddress, userAgent }
```

This context is automatically injected into fraud events, linking browser sessions to user accounts for better fraud detection.

### 3. Nuclear Logout

**Location**: `src/fraud/session.ts` - `revokeFraudSession()`

One-line session revocation for suspicious accounts:

```typescript
// Immediately deletes all fraud-related cookies
revokeFraudSession(req);
```

Sets `max-age=0` on all fraud cookies, instantly invalidating the session.

## 🔧 API Endpoints

### POST `/api/fraud/login`

Creates a secure fraud session with hardened cookies.

**Request**:
```json
{
  "userId": "@username",
  "deviceId": "optional-device-id"
}
```

**Response**:
```json
{
  "ok": true,
  "sessionId": "abc12345...",
  "deviceId": "device-fingerprint"
}
```

**Cookies Set**:
- `fraud_sid` - Session hash (httpOnly)
- `d_id` - Device fingerprint
- `v_ts` - Visit timestamp

### POST `/api/fraud/revoke`

Immediately revokes all fraud-related cookies (Nuclear Logout).

**Response**:
```json
{
  "ok": true,
  "message": "Session revoked"
}
```

**Cookies Deleted**:
- All `fraud_sid`, `d_id`, and `v_ts` cookies are set to `max-age=0`

### POST `/api/fraud/event` (Enhanced)

Now automatically includes cookie-based context:

**Enhanced Event**:
```json
{
  "userId": "@username",
  "eventType": "transaction",
  "deviceHash": "extracted-from-cookie",
  "metadata": {
    "sessionId": "from-cookie",
    "lastVisit": 1707436800000,
    "ipAddress": "from-headers",
    "userAgent": "from-headers"
  }
}
```

## 🔐 Security Architecture

### Cookie Security Model

| Cookie | Purpose | httpOnly | secure | sameSite | maxAge |
|--------|---------|----------|--------|-----------|--------|
| `fraud_sid` | Session hash | ✅ Yes | ✅ Yes | Strict | 7 days |
| `d_id` | Device fingerprint | ❌ No | ✅ Yes | Strict | 14 days |
| `v_ts` | Visit timestamp | ❌ No | ✅ Yes | Strict | 7 days |

### Protection Mechanisms

1. **XSS Protection**: Session cookie is httpOnly, preventing JavaScript access
2. **CSRF Protection**: SameSite=Strict prevents cross-site requests
3. **TLS Enforcement**: Secure flag ensures cookies only travel over HTTPS (production)
4. **Session Hashing**: SHA-256 hashed session IDs prevent session fixation
5. **Device Fingerprinting**: Unique device IDs for anomaly detection

## 📊 Integration with Fraud Engine

### Automatic Context Injection

When recording fraud events, the system automatically extracts and includes:

```typescript
// Before (manual)
fraudEngine.recordEvent({
  userId: '@user',
  eventType: 'transaction',
  deviceHash: 'manual-hash',
});

// After (automatic)
fraudEngine.recordEvent({
  userId: '@user',
  eventType: 'transaction',
  deviceHash: context.deviceId, // From cookie
  metadata: {
    sessionId: context.sessionId, // From cookie
    lastVisit: context.lastVisit, // From cookie
    ipAddress: context.ipAddress, // From headers
  },
});
```

### WebSocket Integration

WebSocket connections automatically inherit fraud session cookies:

```typescript
// WebSocket upgrade includes fraud context
const fraudContext = extractFraudContext(req);
ws.data.sessionId = fraudContext.sessionId;
ws.data.deviceId = fraudContext.deviceId;
```

## 🚀 Usage Examples

### Login Flow

```typescript
// Client-side login
const response = await fetch('/api/fraud/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: '@username' }),
});

// Cookies are automatically set by browser
// No manual header parsing needed!
```

### Event Recording

```typescript
// Event automatically includes cookie context
await fetch('/api/fraud/event', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: '@username',
    eventType: 'transaction',
    amountCents: 10000,
  }),
  // Cookies automatically sent by browser
});
```

### Session Revocation

```typescript
// Nuclear logout for suspicious accounts
await fetch('/api/fraud/revoke', {
  method: 'POST',
});

// All fraud cookies immediately deleted
```

## 🏗️ Architecture

### Cookie Flow

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ POST /api/fraud/login
       │ { userId: "@user" }
       ▼
┌─────────────────┐
│  setFraudSession │
│  - Generate hash │
│  - Set cookies   │
└──────┬──────────┘
       │ Response + Set-Cookie headers
       ▼
┌─────────────┐
│   Browser   │
│ Stores cookies│
└──────┬──────┘
       │ Subsequent requests
       │ Include cookies automatically
       ▼
┌─────────────────┐
│ extractFraudContext│
│ - Read cookies   │
│ - Extract context│
└──────┬──────────┘
       │ Enhanced event data
       ▼
┌─────────────────┐
│  fraudEngine    │
│  recordEvent()  │
└─────────────────┘
```

## 🔍 Monitoring

### Session Health

Check active sessions via health endpoint:

```bash
curl http://localhost:3008/api/health/webhook
```

### Cookie Validation

Verify cookies are set correctly:

```javascript
// In browser console
document.cookie
// Should show: d_id=...; v_ts=...
// Note: fraud_sid won't appear (httpOnly)
```

## 📝 Configuration

### Session Expiry

Default: 7 days (configurable in `src/fraud/session.ts`):

```typescript
const SESSION_CONFIG = {
  EXPIRY_SECONDS: 7 * 24 * 60 * 60, // 7 days
  // ...
};
```

### Security Flags

Production vs Development:

```typescript
const SESSION_CONFIG = {
  SECURE: process.env.NODE_ENV === 'production', // TLS-only in production
  // ...
};
```

## ✅ Benefits

1. **Automatic Synchronization**: Bun's Cookie API handles Set-Cookie headers automatically
2. **XSS Protection**: httpOnly cookies prevent JavaScript access
3. **CSRF Protection**: SameSite=Strict blocks cross-site requests
4. **Enhanced Tracking**: Device fingerprints and session IDs improve fraud detection
5. **Easy Revocation**: One-line nuclear logout for suspicious accounts
6. **Zero Manual Parsing**: No need to manually construct cookie headers

## 🎯 Next Steps

1. **JWT-in-Cookie**: Add JWT signing for admin dashboard authentication
2. **Session Refresh**: Implement automatic session refresh before expiry
3. **Multi-Device Tracking**: Track sessions across multiple devices
4. **Session Analytics**: Monitor session patterns for fraud detection

## 📚 References

- [Bun Cookie API](https://bun.com/docs/api/cookies)
- [OWASP Cookie Security](https://owasp.org/www-community/HttpOnly)
- [SameSite Cookie Attribute](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)

---

**Your fraud prevention system is now secured with hardened cookie-based sessions!** 🛡️
