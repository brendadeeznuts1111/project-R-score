---
name: "[P0][SECURITY] Restrict CORS to known origins"
about: Fix CORS wildcard vulnerability
title: "[P0][SECURITY] Restrict CORS to known origins"
labels: security, cors, p0, api
assignees: backend-team
---

## 🔒 Description
Current CORS config allows wildcard (`*`) origins, enabling XSS attacks.

**File**: `feedback-server.ts:27-31`

## ❌ Current Code
```typescript
cors: {
  origin: "*", // ❌ Vulnerable
  credentials: true
}
```

## ✅ Expected Fix
```typescript
cors: {
  origin: process.env.ALLOWED_ORIGINS?.split(",") || ["https://localhost:3000"],
  credentials: true
}
```

## 📋 Acceptance Criteria
- [ ] Replace wildcard with explicit origin list
- [ ] Load allowed origins from environment variable `ALLOWED_ORIGINS`
- [ ] Reject requests from unknown origins with 403
- [ ] Add test: preflight request from unauthorized origin fails
- [ ] Update environment variable documentation
- [ ] Add to deployment checklist

## 🧪 Test Cases
```typescript
// Test 1: Allowed origin succeeds
const res = await fetch('https://api.example.com/data', {
  headers: { 'Origin': 'https://allowed-origin.com' }
});
// Should: 200 OK

// Test 2: Unauthorized origin fails
const res = await fetch('https://api.example.com/data', {
  headers: { 'Origin': 'https://evil.com' }
});
// Should: 403 Forbidden
```

## 🔐 Security Impact
- **Before**: Any origin can make requests (XSS risk)
- **After**: Only whitelisted origins allowed

## 📝 Environment Variable
```bash
# .env.example
ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com,https://localhost:3000
```

## 🔗 Related
- Blocks: Production deployment
- Part of: Security audit compliance
