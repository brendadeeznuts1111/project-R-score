---
name: "[P0][SECURITY] Add authentication to feedback endpoints"
about: Add authentication to prevent unauthorized access
title: "[P0][SECURITY] Add authentication to feedback endpoints"
labels: security, auth, p0, api
assignees: backend-team
---

## Routing (optional — human queue)

| Field | Value |
|-------|-------|
| **Domain** | `partner` · `control` · `trading` · `identity` · `knowledge` · `platform` · or n/a |
| **Tracker** | tenant open-issue id · or n/a |
| **Concept** | vocabulary id only if chrome/wire changes · or n/a |

See [ISSUE-ROUTING.md](../../docs/harness/ISSUE-ROUTING.md).

## 🔐 Description
Feedback API endpoints (`/submit`, `/admin`) have no authentication, allowing anonymous data submission and admin access.

**File**: `feedback-server.ts:77-127`

## 📋 Acceptance Criteria
- [ ] Add JWT or API key validation middleware
- [ ] Require `Authorization: Bearer <token>` header
- [ ] Return 401 for missing/invalid tokens
- [ ] Add token rotation mechanism (TTL 24h)
- [ ] Update API documentation with auth requirements
- [ ] Add rate limiting for auth endpoints

## 🔧 Implementation Options

### Option A: JWT Tokens
```typescript
// Middleware
function requireAuth(req: Request): boolean {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return false;
  
  try {
    const payload = Bun.jwt.verify(token, process.env.JWT_SECRET!);
    return payload.valid;
  } catch {
    return false;
  }
}
```

### Option B: API Keys
```typescript
// Middleware
function requireApiKey(req: Request): boolean {
  const apiKey = req.headers.get('X-API-Key');
  const validKeys = process.env.API_KEYS?.split(',') || [];
  return validKeys.includes(apiKey || '');
}
```

## 🧪 Test Cases
```typescript
// Test 1: Missing token
const res = await fetch('/api/feedback/submit', {
  method: 'POST',
  body: JSON.stringify({ message: 'test' })
});
// Should: 401 Unauthorized

// Test 2: Invalid token
const res = await fetch('/api/feedback/submit', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer invalid-token' },
  body: JSON.stringify({ message: 'test' })
});
// Should: 401 Unauthorized

// Test 3: Valid token
const res = await fetch('/api/feedback/submit', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer valid-token' },
  body: JSON.stringify({ message: 'test' })
});
// Should: 200 OK
```

## 📝 API Documentation Update
```markdown
## Authentication

All feedback endpoints require authentication via Bearer token:

```
Authorization: Bearer <your-token>
```

Tokens can be obtained from `/api/auth/login` endpoint.
Token TTL: 24 hours
```

## 🔗 Related
- Blocks: Production deployment
- Required for: SOC2 audit trail
- Part of: Security audit compliance
