# MCP Secrets API Testing Guide

## Endpoint: GET /api/mcp/secrets/:server/api-key

### Security Test: Unauthorized Access

**Test Command:**
```bash
curl -X GET http://localhost:3000/api/mcp/secrets/nexus/api-key \
  -H "Authorization: Bearer invalid-token"
```

**Expected Response:**
- **Status Code:** `401 Unauthorized`
- **Response Body:**
  ```json
  {
    "error": "Unauthorized",
    "code": "HBSE-006",
    "message": "Authentication required"
  }
  ```
- **Audit Log:** HBSE-006 logged with details:
  - `operator: 'anonymous'`
  - `operatorRole: 'none'`
  - `service: 'nexus'`
  - `operation: 'read'`
  - `action: 'unauthorized_access_attempt'`
  - `reason: 'no_authentication_token'`

### Test Cases

#### 1. No Authorization Header
```bash
curl -X GET http://localhost:3000/api/mcp/secrets/nexus/api-key
```
**Expected:** `401 Unauthorized` + HBSE-006 log

#### 2. Invalid Token
```bash
curl -X GET http://localhost:3000/api/mcp/secrets/nexus/api-key \
  -H "Authorization: Bearer invalid-token"
```
**Expected:** `401 Unauthorized` + HBSE-006 log

#### 3. Valid Token, Insufficient Permissions
```bash
curl -X GET http://localhost:3000/api/mcp/secrets/nexus/api-key \
  -H "Authorization: Bearer <valid-token-with-analyst-role>"
```
**Expected:** `403 Forbidden` + HBSE-006 log (analyst role only has read, but needs proper mapping)

#### 4. Valid Token, Sufficient Permissions
```bash
curl -X GET http://localhost:3000/api/mcp/secrets/nexus/api-key \
  -H "Authorization: Bearer <valid-token-with-admin-role>"
```
**Expected:** `200 OK` with masked API key

### Running Tests

**Unit Tests:**
```bash
bun test test/api/mcp-secrets-auth.test.ts
```

**Security Penetration Tests:**
```bash
bash test/security/secrets-penetration.test.sh
```

**Manual Testing:**
```bash
# Start server first
bun run src/index.ts

# Then test in another terminal
curl -X GET http://localhost:3000/api/mcp/secrets/nexus/api-key \
  -H "Authorization: Bearer invalid-token"
```

### Authorization Roles

| User Role | Operator Role | Permissions |
|-----------|---------------|-------------|
| `admin` | `senior-engineer` | read, write, delete |
| `senior-engineer` | `senior-engineer` | read, write, delete |
| `engineer` | `engineer` | read |
| `analyst` | `analyst` | read |
| `trader` | `analyst` | read |
| `user` | `analyst` | read |

### Log Codes

- **HBSE-006**: Unauthorized secret access attempt (ERROR level)
- **HBSE-007**: Invalid secret format rejected (WARN level)
