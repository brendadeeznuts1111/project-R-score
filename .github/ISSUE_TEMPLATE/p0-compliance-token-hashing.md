---
name: "[P0][COMPLIANCE] Hash escalation tokens in audit logs"
about: Fix plaintext token logging for compliance
title: "[P0][COMPLIANCE] Hash escalation tokens in audit logs"
labels: compliance, security, p0, logging
assignees: dev-team
---

## 📋 Description
Audit logs contain plaintext escalation tokens (`--force` flags), creating credential leak risk.

**File**: `pm.ts:581-590`

## ❌ Current Code
```typescript
console.log(`Escalation used: ${token}`); // ❌ Plaintext
```

## ✅ Expected Fix
```typescript
import { createHash } from 'crypto';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 16);
}

console.log(`Escalation used: token_hash: ${hashToken(token)}`);
// Output: "Escalation used: token_hash: abc123def456..."
```

## 📋 Acceptance Criteria
- [ ] Hash tokens with SHA-256 before logging
- [ ] Log format: `token_hash: abc123... (first 16 chars)`
- [ ] Maintain separate secure vault for token→user mapping (if needed)
- [ ] Verify no plaintext tokens in existing logs (rotate if found)
- [ ] Update logging documentation
- [ ] Add audit log retention policy

## 🔍 Search for Affected Code
```bash
# Find all token logging
grep -r "Escalation.*token" .
grep -r "console.log.*token" .
grep -r "logger.*token" .
```

## 🧪 Test Cases
```typescript
// Test: Token is hashed
const token = "secret-token-123";
const logOutput = captureLog(() => {
  logEscalation(token);
});

expect(logOutput).toContain('token_hash:');
expect(logOutput).not.toContain('secret-token-123');
```

## 📊 Compliance Requirements
- **GDPR Article 32**: Security of processing requires credential protection
- **SOC2**: Audit logs must not contain sensitive credentials
- **PCI-DSS**: Tokenized data only in logs

## 🔐 Security Impact
- **Before**: Plaintext tokens in logs (credential leak risk)
- **After**: Hashed tokens only (irreversible)

## 📝 Log Format Example
```
[2026-01-23 12:00:00] INFO: Escalation used: token_hash: a1b2c3d4e5f6g7h8 (user: admin@example.com)
```

## 🔗 Related
- Required for: GDPR compliance
- Required for: SOC2 audit
- Part of: Security audit compliance
