# Developer Workspace Quick Start

**Perfect for**: Interview candidates, new developer onboarding, trial access

## 🚀 Quick Start (5 minutes)

### 1. Create Interview Key

```bash
# Create 24-hour interview key
bun run devworkspace create candidate@example.com interview 24
```

**Output:**
```
✅ Created workspace key for candidate@example.com
   Key ID: key_1737123456789_abc123def456
   Purpose: interview
   Expires: 2025-01-17T12:00:00Z
   Rate Limit: 100 requests/hour

📋 API Key Details:
   Key ID: key_1737123456789_abc123def456
   API Key: dev_a1b2c3d4e5f6...
   Email: candidate@example.com
   Purpose: interview
   Expires: 2025-01-17T12:00:00Z
   Rate Limit: 100 requests/hour

💡 Use this API key in requests:
   curl -H "X-API-Key: dev_a1b2c3d4e5f6..." http://localhost:3001/api/v1/health
```

### 2. Share Key with Candidate

Send the API key via secure channel (encrypted email, secure chat, etc.)

**Include:**
- API key: `dev_a1b2c3d4e5f6...`
- API base URL: `http://localhost:3001/api/v1`
- Documentation: `http://localhost:3001/docs`
- Expiration: 24 hours
- Rate limit: 100 requests/hour

### 3. Monitor Usage

```bash
# Check key statistics
bun run devworkspace stats key_1737123456789_abc123def456
```

**Output:**
```
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

### 4. Revoke After Interview

```bash
# Revoke key immediately
bun run devworkspace revoke key_1737123456789_abc123def456
```

---

## 📋 Use Cases

### Interview Process

```bash
# 1. Create key 1 hour before interview
bun run devworkspace create candidate@example.com interview 24

# 2. Share key with candidate
# Send: API key, documentation URL, expiration time

# 3. Monitor during interview
bun run devworkspace stats <keyId>

# 4. Revoke after interview
bun run devworkspace revoke <keyId>
```

### Developer Onboarding

```bash
# 1. Create onboarding key (7 days)
bun run devworkspace create newdev@company.com onboarding 168

# 2. Include in welcome package
# - API key
# - Documentation
# - Example requests
# - Support channel

# 3. Track usage patterns
bun run devworkspace stats <keyId>

# 4. Extend if needed (create new key)
bun run devworkspace create newdev@company.com onboarding 336  # 14 days
```

---

## 🔐 Security Features

✅ **Bun.secrets Storage** - OS-native encrypted storage (Keychain/libsecret)  
✅ **Time-Sensitive** - Automatic expiration (24h-7d)  
✅ **Rate Limiting** - Prevents abuse (100-1000 req/hour)  
✅ **Usage Tracking** - Real-time analytics  
✅ **Fast Revocation** - Instant key deactivation  

---

## 📊 API Usage Examples

### Using the API Key

```bash
# Method 1: X-API-Key header
curl -H "X-API-Key: dev_abc123..." \
     http://localhost:3001/api/v1/health

# Method 2: Bearer token
curl -H "Authorization: Bearer dev_abc123..." \
     http://localhost:3001/api/v1/health
```

### Rate Limit Headers

Every response includes rate limit information:

```http
HTTP/1.1 200 OK
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 2025-01-16T13:00:00Z
Content-Type: application/json

{"status": "ok"}
```

### Rate Limit Exceeded

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

## 🎯 Why This Matters

### For Interviews

- **Time-Limited Access** - Keys expire automatically (no manual cleanup)
- **Rate Limiting** - Prevents candidates from overwhelming the API
- **Usage Tracking** - See how candidates use the API
- **Secure** - Bun.secrets ensures keys are encrypted

### For Onboarding

- **Extended Access** - 7-day keys for setup and exploration
- **Higher Limits** - 1000 req/hour for development
- **Usage Analytics** - Identify documentation gaps
- **Easy Management** - Simple CLI for key management
- **Performance Tracking** - Benchmark workspace operations for optimization

---

## 📊 Performance Benchmarking

### Benchmark Workspace Operations

Track performance of key creation, validation, and statistics:

```bash
# Profile key creation performance
bun --cpu-prof run devworkspace create test@example.com interview 24

# Create benchmark entry
bun run scripts/benchmarks/create-benchmark.ts \
  --profile=workspace-key-creation.cpuprofile \
  --name="Workspace Key Creation" \
  --description="Performance of creating workspace API keys" \
  --tags="workspace,key-creation"
```

### Benchmark API Validation

Track middleware performance:

```bash
# Profile API key validation
bun --cpu-prof run dev

# Make requests with API key
curl -H "X-API-Key: dev_abc123..." http://localhost:3001/api/workspace/me

# Create benchmark for validation performance
bun run scripts/benchmarks/create-benchmark.ts \
  --profile=workspace-validation.cpuprofile \
  --name="Workspace Key Validation" \
  --tags="workspace,validation,middleware"
```

### Compare Performance Improvements

```bash
# Compare benchmarks
bun run scripts/benchmarks/compare.ts \
  --baseline=workspace-key-creation-baseline \
  --current=workspace-key-creation-optimized \
  --threshold=5
```

See [Benchmarks README](../benchmarks/README.md) for complete benchmarking guide.

---

## 📚 Full Documentation

- [WORKSPACE-DEVELOPER-ONBOARDING.md](../docs/WORKSPACE-DEVELOPER-ONBOARDING.md) - Complete documentation
- [Bun v1.51 Impact Analysis](../docs/BUN-V1.51-IMPACT-ANALYSIS.md) - Performance optimizations
- [Benchmarks README](../benchmarks/README.md) - Benchmark-driven development

---

## 🔍 Quick Commands

```bash
# Create key
bun run devworkspace create <email> [purpose] [hours]

# Get stats
bun run devworkspace stats <keyId>

# Revoke key
bun run devworkspace revoke <keyId>

# List keys
bun run devworkspace list [purpose]

# Interactive demo
bun run workspace:demo

# Performance metrics
# Get performance metrics for benchmarking
# See: src/workspace/devworkspace.ts getPerformanceMetrics()
```

---

**Ready to use!** 🚀
