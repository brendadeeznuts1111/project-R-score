 🟩 **DuoPlus Server Spec Tokens v3.6 (Extracted from Health Endpoint)**

*Configuration values extracted from `/health` endpoint - production-ready constants for Cash App Green + Lightning integration*

---

## 🔧 **Environment & Runtime Tokens**

```typescript
// Core server identity
BUN_ENVIRONMENT: "development"                      // Set to "production" in prod
BUN_DEBUG: "true"                                   // Enable verbose logging
BUN_METRICS_ENABLED: "true"                         // Prometheus metrics endpoint

// Server metadata
BUN_SERVER_PORT: 3227                               // DuoPlus default (env: PORT)
BUN_SERVER_PID: 88907                               // Process ID for monitoring
BUN_PLATFORM: "darwin"                              // macOS ARM64 in dev
BUN_ARCH: "arm64"                                   // Apple Silicon optimization
BUN_VERSION: "1.3.6"                                // Current runtime
NODE_VERSION: "v24.3.0"                             // Node.js compatibility layer

// Uptime tracking
BUN_UPTIME_SECONDS: "9"                             // Seconds since start
BUN_UPTIME_DAYS: "0"                                // 0 days in dev
BUN_UPTIME_FORMATTED: "0h 0m 9s"                    // Human-readable
```

---

## 🚀 **Feature Gate Tokens (bun:bundle)**

```typescript
// Compile-time feature flags
BUN_FEATURE_AI_RISK_PREDICTION: "true"              // ML-based SSRF detection
BUN_FEATURE_FAMILY_CONTROLS: "true"                 // Parental spending limits
BUN_FEATURE_CASHAPP_PRIORITY: "true"                // Fast-track Green deposits
BUN_FEATURE_LIGHTNING: "true"                       // LND node integration
BUN_FEATURE_CASHAPP_GREEN: "true"                   // 3.25% APY routing
BUN_FEATURE_KYC_ENFORCED: "false"                  // Set "true" in production
```

---

## 📊 **Performance & Health Thresholds**

```typescript
// Memory limits (auto-scaling triggers)
BUN_MEMORY_RSS_LIMIT: "25MB"                       // Resident set size
BUN_MEMORY_HEAP_USED: "1MB"                        // Current heap usage
BUN_MEMORY_HEAP_TOTAL: "2MB"                       // Pre-allocated heap
BUN_MEMORY_EXTERNAL: "0MB"                         // Non-JS memory
BUN_MEMORY_USAGE_PERCENT: "72"                     // Trigger GC at 85%

// CPU throttling
BUN_CPU_USER_MS: "0ms"                            // CPU time in user space
BUN_CPU_SYSTEM_MS: "0ms"                          // CPU time in kernel
BUN_CPU_ESTIMATED_PERCENT: "0"                    // Load average (scale at 75%)

// Request pooling
BUN_REQUESTS_TOTAL: "2"                           // Lifetime request count
BUN_REQUESTS_ACTIVE: "1"                          // Currently processing
BUN_REQUESTS_PENDING: "1"                         // In queue (auto-scale at 10)
```

---

## 🏥 **Health Check Specs**

```typescript
// Health probe URLs
BUN_HEALTH_ENDPOINT: "http://localhost:3227/health"
BUN_HEALTH_STATUS: "healthy"                      // "degraded" | "unhealthy"
BUN_HEALTH_SCORE: "100"                           // 0-100 scale

// Health check components
BUN_HEALTH_CHECKS: {
  memory: "optimal",                              // "warning" | "critical"
  cpu: "optimal",
  connections: "optimal"
}
```

---

## 🔐 **Cash App Green API Specs**

```typescript
// Core API endpoints
CASHAPP_API_BASE: "https://api.cash.app/v1"
CASHAPP_ACCOUNT_ID: "acc_${ACCOUNT_ID}"          // From Square Dashboard
CASHAPP_ACCESS_TOKEN: "CA_access_${TOKEN}"       // OAuth2 Bearer token
CASHAPP_PARTNER_TOKEN: "partner_${TOKEN}"        // Business application token

// Deposit endpoint
CASHAPP_DEPOSIT_URL: "https://api.cash.app/v1/accounts/${ACCOUNT_ID}/deposits"

// Required headers
CASHAPP_HEADERS: {
  "Authorization": "Bearer ${CASHAPP_ACCESS_TOKEN}",
  "Content-Type": "application/json",
  "X-Idempotency-Key": "deposit-${traceId}",
  "X-User-Id": "${userId}"                        // Per-user segmentation
}

// Deposit payload template
CASHAPP_DEPOSIT_BODY: {
  account_id: "${CASHAPP_ACCOUNT_ID}",
  amount: {
    amount_cents: "${amountUsd * 100}",
    currency: "USD"
  },
  destination: "CASHAPP_GREEN",                   // Routes to 3.25% APY
  reference_id: "${traceId}",
  metadata: {
    source: "lightning_settlement",
    quest_id: "${questId}",
    yield_rate: 0.0325,
    projected_daily_yield: "${amountUsd * 0.0325 / 365}"
  }
}

// Green balance endpoint
CASHAPP_BALANCE_URL: "https://api.cash.app/v1/accounts/${ACCOUNT_ID}/balances"
```

---

## ⚡ **LND Node Specs**

```typescript
// Lightning Network Daemon
LND_REST_URL: "https://lnd.duoplus.internal:8080"
LND_MACAROON: "${HEX_ENCODED_MACAROON}"          // admin.macaroon hex
LND_TLS_CERT_PATH: "/secure/lnd.cert"            

// Invoice generation
LND_INVOICE_ENDPOINT: "${LND_REST_URL}/v1/invoices"
LND_INVOICE_HEADERS: {
  "Grpc-Metadata-macaroon": "${LND_MACAROON}",
  "Content-Type": "application/json"
}
LND_INVOICE_BODY: {
  value: "${amountSats}",
  memo: "Quest:${questId}",
  expiry: "1800",
  private: true
}

// Balance monitoring
LND_BALANCE_ENDPOINT: "${LND_REST_URL}/v1/balance/channels"
LND_BALANCE_RESPONSE: {
  local_balance: { sat: "1000000" },
  remote_balance: { sat: "500000" },
  pending_open_balance: { sat: "0" }
}

// Channel rebalance endpoint
LND_REBALANCE_ENDPOINT: "${LND_REST_URL}/v2/router/route"
```

---

## 📁 **S3 Path Templates**

```typescript
// Compressed audit logs (zstd -19 --stream-size=128K)
S3_LOG_LIGHTNING: "logs/lightning/${traceId}.json.zst"
S3_LOG_CASHAPP: "logs/cashapp-green/${traceId}.json.zst"
S3_LOG_REBALANCING: "logs/rebalancing/${timestamp}.json.zst"
S3_LOG_KYC: "audit/kyc/${timestamp}.json.zst"
S3_LOG_CTR: "compliance/ctr/${timestamp}.json.zst"

// Cache storage
S3_CACHE_LEADERBOARD: "cache/leaderboard/${scope}-${timestamp}.json.zst"

// Security artifacts
S3_TOTP_VAULT: "vault/seeds/unit-${unitId}.toml.zst"
S3_QR_BACKUP: "duoplus/families/${familyId}/qr-codes/${filename}.png"
S3_QR_DATA: "duoplus/families/${familyId}/qr-codes/${filename}.json"

// Compliance
S3_FINCEN_CTRS: "compliance/ctr/${year}/${month}/"
S3_OFAC_SCREENING: "compliance/ofac/${timestamp}.json.zst"
```

---

## 🧪 **Test Spec Tokens**

```typescript
// Test timeout for async operations
TEST_TIMEOUT_MS: 10000                            // 10 seconds
TEST_S3_BUCKET: "duoplus-test-bucket"            // CI-only test bucket

// Mock dependencies (DI pattern)
TEST_MOCK_DEPS: {
  feature: (flag: string) => flag === "PREMIUM",
  s3Write: async (_path: string, _data: Uint8Array, opts?: any) => {
    testMockCalls.push({ path: _path, opts });
    return { success: true };
  },
  greenDeposit: async (params: any) => ({
    success: true,
    depositId: "dep_mock",
    yieldProjection: params.amountUsd * 0.0325
  }),
  generateInvoice: async (params: any) => "lnbc1xxxx"
}
```

---

## 🎮 **ADB Command Specs (Phase-02)**

```bash
# Lightning wallet detection
ADB_PKG_LIST: "adb shell pm list packages | grep -E 'zap|blixt|nayuta|mutiny|zeus'"

# Launch WalletConnect Lightning
ADB_WALLET_CONNECT: 'adb shell am start -a android.intent.action.VIEW \
  -d "lightning:${INVOICE}" \
  --eu walletconnect 1'

# Normalized tap coordinates (Android 13, 1080x1920 normalized)
ADB_COORD_SCALE: "norm_tap() { \
  local x=$1 y=$2; \
  local w=$(adb shell wm size | grep -oP 'Physical size: \\K\\d+'); \
  local h=$(adb shell wm size | grep -oP 'x\\K\\d+'); \
  adb shell input tap $((x * w / 1080)) $((y * h / 1920)); \
}"
ADB_TAP_SIGNUP: "norm_tap 540 1200"                # Gmail signup button
ADB_TAP_NEXT: "norm_tap 900 1800"                  # Next button
ADB_TAP_PASSWORD: "norm_tap 540 1400"              # Password field

# UI state verification
ADB_UI_VERIFY: "adb logcat -d | grep -q 'SignupSuccess' && echo 'success'"

# Broadcast feedback to Bun
ADB_BROADCAST_SUCCESS: 'adb shell am broadcast -a duoplus.payment.success --es trace "${TRACE_ID}"'
ADB_BROADCAST_FAILED: 'adb shell am broadcast -a duoplus.payment.failed --es trace "${TRACE_ID}"'
```

---

## 📜 **Database Schema Tokens**

```sql
-- Table: cashapp_green_deposits
CREATE TABLE cashapp_green_deposits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount_usd DECIMAL(10,2) NOT NULL,
  yield_projection DECIMAL(10,2),
  deposit_id TEXT UNIQUE,
  trace_id TEXT,
  source TEXT CHECK(source IN ('lightning_settlement', 'manual', 'pool_rebalance', 'quest_reward')),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'completed',
  metadata JSONB
);

-- Table: user_lightning_balances
CREATE TABLE user_lightning_balances (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  balance_sats INTEGER DEFAULT 0,
  last_settled TIMESTAMP,
  total_yield_usd DECIMAL(10,2) DEFAULT 0,
  pending_sats INTEGER DEFAULT 0
);

-- Table: lightning_payments
CREATE TABLE lightning_payments (
  payment_hash TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  quest_id TEXT REFERENCES quests(id),
  amount_sats INTEGER NOT NULL,
  amount_usd DECIMAL(10,2) NOT NULL,
  invoice TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending', 'settled', 'failed', 'expired')),
  settled_at TIMESTAMP,
  routing_fee_sats INTEGER DEFAULT 0,
  channel_id TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: pool_rebalancing_log
CREATE TABLE pool_rebalancing_log (
  id TEXT PRIMARY KEY,
  source_pool_id TEXT REFERENCES pools(id),
  target_pool_id TEXT REFERENCES pools(id),
  amount_usd DECIMAL(10,2) NOT NULL,
  yield_impact DECIMAL(10,2),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  trace_id TEXT
);
```

---

## 🚀 **Build & Deploy Tokens**

```bash
# Build command with features
bun build --feature=LIGHTNING --feature=CASHAPP_GREEN \
  --target=bun --minify --sourcemap \
  ./src/main.ts --outdir=./dist/prod

# Run with complete environment
NODE_ENV=production \
PORT=3227 \
CASHAPP_ACCESS_TOKEN=CA_xxx \
LND_MACAROON=$(xxd -ps -c 1000 admin.macaroon) \
CHAINALYSIS_API_KEY=chain_xxx \
bun run --feature=KYC_ENFORCED ./dist/prod/main.js

# Cron: Auto-rebalance hourly
BUN_REBALANCE_CRON: "0 * * * * /usr/bin/bun /app/pools/rebalancingEngine.ts"

# Cron: CTR report daily (2 AM UTC)
BUN_CTR_CRON: "0 2 * * * /usr/bin/bun /app/compliance/ctr-generator.ts"

# Cron: Leaderboard refresh every 5 minutes
BUN_LEADERBOARD_CRON: "*/5 * * * * /usr/bin/bun /app/pools/leaderboard.ts"

# Process manager (PM2)
PM2_CONFIG: {
  name: "duoplus-green",
  script: "dist/prod/main.js",
  env: {
    NODE_ENV: "production",
    CASHAPP_ACCESS_TOKEN: "${CASHAPP_ACCESS_TOKEN}",
    LND_MACAROON: "${LND_MACAROON}",
    CHAINALYSIS_API_KEY: "${CHAINALYSIS_API_KEY}"
  },
  instances: "max",
  exec_mode: "cluster",
  log_file: "./logs/combined.zst",
  error_file: "./logs/errors.zst"
}
```

---

## 📜 **Compliance & Regulatory Tokens**

```typescript
// FinCEN thresholds
FINCEN_CTR_THRESHOLD: 10000                        // $10,000 daily (Currency Transaction Report)
FINCEN_RECORDKEEPING_THRESHOLD: 3000               // $3,000 (recordkeeping requirement)
FINCEN_SAR_THRESHOLD: 5000                        // $5,000 (Suspicious Activity Report)

// OFAC screening
OFAC_API_URL: "https://api.chainalysis.com/api/addresses"
OFAC_API_HEADERS: {
  "Token": "${CHAINALYSIS_API_KEY}",
  "Content-Type": "application/json"
}
OFAC_RISK_LEVELS: ["low", "medium", "high", "severe"]

// KYC verification
KYC_DOCUMENT_REQUIRED: ["id", "proof_of_address", "selfie"]
KYC_RISK_LEVELS: {
  low: { daily_limit: 10000, lightning_limit: 10000 },
  medium: { daily_limit: 5000, lightning_limit: 5000 },
  high: { daily_limit: 1000, lightning_limit: 1000 }
}

// MSB registration
MSB_REGISTRATION_NUMBER: "${MSB_NUMBER}"          // FinCEN MSB license
MSB_REGISTRATION_DATE: "${MSB_DATE}"              // Registration date
MSB_AGENT: "${COMPLIANCE_OFFICER}"                // Registered agent
```

---

## 🎯 **Quick Reference Card**

| Token | Value/Pattern | Use Case |
|-------|---------------|----------|
| `BUN_SERVER_PORT` | `3227` | Default DuoPlus port |
| `CASHAPP_API_BASE` | `https://api.cash.app/v1` | REST API endpoint |
| `LND_REST_URL` | `https://lnd.duoplus.internal:8080` | Lightning node |
| `FINCEN_CTR_THRESHOLD` | `10000` | Daily reporting limit |
| `TEST_TIMEOUT_MS` | `10000` | Async test timeout |
| `S3_LOG_CASHAPP` | `logs/cashapp-green/${traceId}.zst` | Compressed audit logs |
| `ADB_COORD_SCALE` | `norm_tap()` | Android coordinate scaling |
| `MSB_REGISTRATION_NUMBER` | `${MSB_NUMBER}` | FinCEN license |

---

**Inject these tokens into your `.env` and `bun run --feature=CASHAPP_GREEN --feature=LIGHTNING` to ignite the yield engine.**