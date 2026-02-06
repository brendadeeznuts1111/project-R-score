# Developer Workspace - Onboarding & Interview System

**Last Updated**: 2025-01-16  
**Purpose**: Secure, time-sensitive API key management for developer onboarding and interviews

## Overview

The Developer Workspace system provides secure API key management for:
- **New Developer Onboarding** - Temporary API access for new team members
- **Interview Candidates** - Time-limited access for technical interviews
- **Trial Access** - Short-term access for evaluation

## Features

✅ **Time-Sensitive Keys** - Automatic expiration (24h for interviews, 7 days for onboarding)  
✅ **Rate Limiting** - Configurable per-key rate limits (100-1000 requests/hour)  
✅ **Secure Storage** - Uses Bun.secrets for OS-native encrypted storage  
✅ **Usage Tracking** - Real-time analytics and request counting  
✅ **Automatic Cleanup** - Expired keys are automatically revoked  

---

## Quick Start

### Create an Interview Key

```bash
# Create 24-hour interview key
bun run devworkspace create candidate@example.com interview 24

# Output:
# ✅ Created workspace key for candidate@example.com
#    Key ID: key_1737123456789_abc123def456
#    Purpose: interview
#    Expires: 2025-01-17T12:00:00Z
#    Rate Limit: 100 requests/hour
```

### Create an Onboarding Key

```bash
# Create 7-day onboarding key
bun run devworkspace create newdev@company.com onboarding 168

# Output:
# ✅ Created workspace key for newdev@company.com
#    Key ID: key_1737123456790_xyz789ghi012
#    Purpose: onboarding
#    Expires: 2025-01-23T12:00:00Z
#    Rate Limit: 1000 requests/hour
```

---

## API Usage

### Using the API Key

Include the API key in requests:

```bash
# Method 1: X-API-Key header
curl -H "X-API-Key: dev_abc123..." \
     http://localhost:3001/api/v1/health

# Method 2: Bearer token
curl -H "Authorization: Bearer dev_abc123..." \
     http://localhost:3001/api/v1/health
```

### Rate Limit Headers

Responses include rate limit information:

```http
HTTP/1.1 200 OK
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 2025-01-16T13:00:00Z
Content-Type: application/json

{"status": "ok"}
```

### Rate Limit Exceeded

When rate limit is exceeded:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": "Rate limit exceeded",
  "message": "API key has exceeded rate limit",
  "resetAt": "2025-01-16T13:00:00Z"
}
```

---

## CLI Commands

### Create Key

```bash
bun run devworkspace create <email> [purpose] [expirationHours]

# Examples:
bun run devworkspace create candidate@example.com interview 24
bun run devworkspace create newdev@company.com onboarding 168
bun run devworkspace create trial@example.com trial 72
```

**Options:**
- `email` - Developer/candidate email (required)
- `purpose` - `onboarding` | `interview` | `trial` (default: `interview`)
- `expirationHours` - Hours until expiration (default: 24 for interview, 168 for onboarding)

### Get Statistics

```bash
bun run devworkspace stats <keyId>

# Example:
bun run devworkspace stats key_1737123456789_abc123def456
```

**Output:**
```text
📊 Key Statistics:
   Key ID: key_1737123456789_abc123def456
   Total Requests: 42
   Requests (Last Hour): 15
   Requests (Today): 42
   Last Used: 2025-01-16T11:30:00Z
   Created: 2025-01-16T10:00:00Z
   Expires: 2025-01-17T10:00:00Z
   Time Remaining: 1380 minutes
   Status: ✅ Active
```

### Revoke Key

```bash
bun run devworkspace revoke <keyId>

# Example:
bun run devworkspace revoke key_1737123456789_abc123def456
```

### List Keys

```bash
bun run devworkspace list [purpose]

# Examples:
bun run devworkspace list
bun run devworkspace list interview
bun run devworkspace list onboarding
```

---

## API Endpoints

### Create Key

```http
POST /api/workspace/keys
Content-Type: application/json

{
  "email": "candidate@example.com",
  "purpose": "interview",
  "expirationHours": 24,
  "rateLimitPerHour": 100,
  "metadata": {
    "interviewId": "INT-2025-001",
    "position": "Senior Backend Engineer"
  }
}
```

**Response:**
```json
{
  "success": true,
  "key": {
    "id": "key_1737123456789_abc123",
    "apiKey": "dev_abc123...",
    "email": "candidate@example.com",
    "purpose": "interview",
    "createdAt": "2025-01-16T10:00:00Z",
    "expiresAt": "2025-01-17T10:00:00Z",
    "rateLimitPerHour": 100,
    "metadata": {
      "interviewId": "INT-2025-001"
    }
  }
}
```

### Get Key Statistics

```http
GET /api/workspace/keys/:keyId/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "keyId": "key_1737123456789_abc123",
    "totalRequests": 42,
    "requestsLastHour": 15,
    "requestsToday": 42,
    "lastUsedAt": "2025-01-16T11:30:00Z",
    "createdAt": "2025-01-16T10:00:00Z",
    "expiresAt": "2025-01-17T10:00:00Z",
    "timeRemaining": 1380,
    "isExpired": false,
    "isRateLimited": false
  }
}
```

### Revoke Key

```http
DELETE /api/workspace/keys/:keyId
```

### List Keys

```http
GET /api/workspace/keys?purpose=interview
```

---

## Default Settings

### Expiration Times

| Purpose | Default Expiration | Customizable |
|---------|-------------------|--------------|
| Interview | 24 hours | ✅ Yes |
| Onboarding | 7 days (168 hours) | ✅ Yes |
| Trial | 3 days (72 hours) | ✅ Yes |

### Rate Limits

| Purpose | Default Rate Limit | Customizable |
|---------|-------------------|--------------|
| Interview | 100 requests/hour | ✅ Yes |
| Onboarding | 1000 requests/hour | ✅ Yes |
| Trial | 500 requests/hour | ✅ Yes |

---

## Security Features

### Bun.secrets Integration

All API keys are stored securely using Bun.secrets:
- **macOS**: Keychain
- **Linux**: libsecret
- **Windows**: Credential Manager

### Key Format

API keys use the format: `dev_<32-byte-hex>`

Example: `dev_a1b2c3d4e5f6...`

### Automatic Expiration

Keys automatically expire based on their `expiresAt` timestamp. Expired keys are rejected with:

```json
{
  "error": "Unauthorized",
  "message": "API key expired"
}
```

### Rate Limiting

Rate limits are enforced per key using a sliding window:
- Window: 1 hour
- Counter resets at window start
- Headers indicate remaining requests and reset time

---

## Use Cases

### Interview Process

1. **Create Interview Key**
   ```bash
   bun run devworkspace create candidate@example.com interview 24
   ```

2. **Share Key with Candidate**
   - Send API key via secure channel
   - Provide API documentation
   - Set expectations (24-hour validity, 100 req/hour)

3. **Monitor Usage**
   ```bash
   bun run devworkspace stats key_123...
   ```

4. **Revoke After Interview**
   ```bash
   bun run devworkspace revoke key_123...
   ```

### Developer Onboarding

1. **Create Onboarding Key**
   ```bash
   bun run devworkspace create newdev@company.com onboarding 168
   ```

2. **Provide Access**
   - Include in onboarding documentation
   - 7-day validity for setup and exploration
   - Higher rate limit (1000 req/hour) for development

3. **Track Usage**
   - Monitor API usage during onboarding
   - Identify areas needing documentation
   - Ensure proper API usage patterns

---

## Integration with API Routes

### Using the Middleware

```typescript
import { devWorkspaceAuth } from "../workspace/devworkspace";
import { Hono } from "hono";

const api = new Hono();

// Protect route with developer workspace auth
api.get("/protected", devWorkspaceAuth(), async (c) => {
  return c.json({ message: "Access granted!" });
});
```

### Manual Validation

```typescript
import { DevWorkspaceManager } from "../workspace/devworkspace";

const manager = new DevWorkspaceManager();

const validation = await manager.validateKey(apiKey);
if (!validation.valid) {
  return new Response("Unauthorized", { status: 401 });
}

// Use key
console.log(`Remaining requests: ${validation.remainingRequests}`);
```

---

## Examples

### Interactive Demo

```bash
# Run interactive demo
bun run examples/devworkspace-interactive.ts
```

The interactive demo includes examples for:
- Creating API keys (interview, onboarding, trial)
- Validating keys
- Getting statistics
- Performance benchmarking

### Programmatic Usage

```typescript
import { DevWorkspaceManager } from "./workspace/devworkspace";

const manager = new DevWorkspaceManager();

// Create interview key
const key = await manager.createKey({
  email: "candidate@example.com",
  purpose: "interview",
  expirationHours: 24,
  metadata: {
    interviewId: "INT-2025-001",
    position: "Senior Backend Engineer",
  },
});

// Validate key
const validation = await manager.validateKey(key.apiKey);
if (validation.valid) {
  console.log(`Remaining: ${validation.remainingRequests}`);
}

// Get statistics
const stats = await manager.getKeyStats(key.id);
console.log(`Total requests: ${stats?.totalRequests}`);
```

---

## Best Practices

### For Interviews

1. **Create keys 1 hour before interview** - Gives candidate time to set up
2. **Use 24-hour expiration** - Covers interview + follow-up questions
3. **Monitor usage during interview** - Track API calls in real-time
4. **Revoke immediately after** - Don't leave keys active

### For Onboarding

1. **Create keys on first day** - Include in welcome package
2. **Use 7-day expiration** - Enough time for setup and exploration
3. **Higher rate limits** - Allow experimentation (1000 req/hour)
4. **Track usage patterns** - Identify documentation gaps

### Security

1. **Never commit keys** - Use Bun.secrets for storage
2. **Rotate regularly** - Create new keys for extended access
3. **Monitor for abuse** - Watch for unusual usage patterns
4. **Revoke immediately** - If key is compromised or no longer needed

---

## Troubleshooting

### Key Not Found

**Error**: `Key metadata not found`

**Solution**: Key may have been deleted or never created. Verify key ID and check Bun.secrets.

### Rate Limit Exceeded

**Error**: `Rate limit exceeded`

**Solution**: Wait until rate limit window resets (check `X-RateLimit-Reset` header) or request higher limit.

### Key Expired

**Error**: `API key expired`

**Solution**: Create a new key with appropriate expiration time.

---

## Performance Benchmarking

### Creating Benchmarks

Track performance improvements and detect regressions:

```bash
# Create a benchmark from a CPU profile
bun run scripts/benchmarks/create-benchmark.ts \
  --profile=profiles/my-profile.cpuprofile \
  --name="Workspace API Baseline" \
  --description="Baseline performance for workspace API endpoints" \
  --tags="workspace,api,baseline"

# Compare benchmarks
bun run scripts/benchmarks/compare.ts \
  --baseline=workspace-api-baseline \
  --current=workspace-api-optimized \
  --threshold=5
```

### Benchmark API Endpoint

Get benchmark information via API:

```http
GET /api/workspace/benchmarks
```

**Response:**
```json
{
  "success": true,
  "benchmarks": {
    "directory": "benchmarks/",
    "readme": "benchmarks/README.md",
    "tools": {
      "create": "scripts/benchmarks/create-benchmark.ts",
      "compare": "scripts/benchmarks/compare.ts"
    },
    "documentation": {
      "guide": "docs/BUN-V1.51-IMPACT-ANALYSIS.md",
      "cpuProfiling": "docs/BUN-CPU-PROFILING.md"
    }
  }
}
```

### Performance Best Practices

1. **Profile before optimizing** - Use CPU profiling to identify bottlenecks
2. **Create baseline benchmarks** - Establish performance baselines before changes
3. **Compare after changes** - Validate improvements with benchmark comparisons
4. **Track over time** - Use benchmarks to detect performance regressions

See [Benchmarks README](../benchmarks/README.md) for complete benchmarking guide.

---

## Error Handling Best Practices

Following Bun's defensive error handling pattern ensures robust, production-ready code that never crashes on malformed errors.

### Rule 1: Always Normalize

```typescript
import { normalizeError } from '../utils/error-wrapper';

// ❌ Bad: Assumes error.message exists
catch (err) { 
  logger.error(err.message); 
}

// ✅ Good: Normalize any error value
catch (err) { 
  const normalized = normalizeError(err);
  logger.error('Context', normalized);
}
```

### Rule 2: Provide Fallbacks

```typescript
// ❌ Bad: Assumes property exists
const message = error.message;

// ✅ Good: Bun pattern (event.error || event.message)
const message = error?.message || error?.toString() || 'Unknown error';
```

### Rule 3: Log Full Context

```typescript
import { logError } from '../utils/error-wrapper';

// ❌ Bad: Minimal context
logger.error(`Failed: ${error.message}`);

// ✅ Good: Full context with metadata
logError(logger, 'Failed to process graph layer', error, {
  layer: 4,
  nodeCount: graph.nodes.size,
  timestamp: Date.now()
});
```

### Rule 4: Don't Crash on Malformed Errors

```typescript
import { normalizeError, logError } from '../utils/error-wrapper';

// ❌ Bad: Throws and crashes
ws.on('error', (err) => { 
  throw err; 
});

// ✅ Good: Defensive handling with graceful recovery
ws.on('error', (event) => {
  const error = normalizeError(event.error || event);
  logError(logger, 'WebSocket error', error, {
    url: ws.url,
    readyState: ws.readyState
  });
  this.reconnect();
});
```

### Error Wrapper Utility

The `src/utils/error-wrapper.ts` utility provides:

- **`normalizeError(error)`**: Converts any error value to structured format
- **`getErrorMessage(error)`**: Safely extracts error message (never throws)
- **`getErrorStack(error)`**: Safely extracts stack trace
- **`logError(logger, context, error, metadata)`**: Logs error with full context
- **`createErrorHandler(logger, context)`**: Creates reusable error handler

**Supported Error Types:**
- Error instances (with cause chains)
- ErrorEvent objects (`event.error || event.message`)
- String errors
- Numeric error codes
- Null/undefined
- Objects with message property

**Performance**:
- `normalizeError()`: ~0.02ms per call
- `getErrorMessage()`: ~0.01ms per call
- `logError()`: ~0.05ms per call (includes JSON serialization)

**Trade-off**: `+0.05ms per error vs never crashing on malformed errors = massive reliability win`

**Reference**: [Bun HMR Error Handling Guide](./BUN-HMR-ERROR-HANDLING.md)  
**Pattern**: [Bun Commit 05508a6](https://github.com/oven-sh/bun/commit/05508a627d299b78099a39b1cfb571373c5656d0)  
**Benchmark**: Run `bun run bench/error-normalization.ts` to verify performance

---

## Related Documentation

- [Bun.secrets API](https://bun.com/docs/runtime/bun-apis#secrets)
- [Bun Workspaces](./BUN-WORKSPACES.md) - Monorepo workspace management
- [Bun v1.2.11 Improvements](./BUN-1.2.11-IMPROVEMENTS.md) - KeyObject improvements
- [Bun v1.51 Impact Analysis](./BUN-V1.51-IMPACT-ANALYSIS.md) - Performance optimizations
- [CPU Profiling Guide](./BUN-CPU-PROFILING.md) - Performance analysis
- [Benchmarks README](../benchmarks/README.md) - Benchmark-driven development
- [Bun HMR Error Handling](./BUN-HMR-ERROR-HANDLING.md) - Defensive error handling patterns
- [Version & Metadata Standards](./VERSION-METADATA-STANDARDS.md) - Code standards and conventions
- [Security Examples](../examples/bun-security-examples.ts)
- [API Routes](../src/api/workspace-routes.ts)
- [Bun Workspaces Official Docs](https://bun.com/docs/pm/workspaces)

---

## Search Commands

```bash
# Find workspace implementation
rg "DevWorkspaceManager|devworkspace" src/

# Find API routes
rg "workspace" src/api/

# Find examples
rg "devworkspace" examples/
```

---

**Status**: ✅ Production Ready  
**Security**: ✅ Bun.secrets encrypted storage  
**Rate Limiting**: ✅ Per-key sliding window  
**Expiration**: ✅ Automatic cleanup
