

---

## 4. Integration Points Matrix

### 4.1 Cross-Subsystem Integration Map

| Source Subsystem | Target Subsystem | Integration Point | Direction | Mechanism | File Path |
|---|---|---|---|---|---|
| **Core Terminal** | **Partner Profile OS** | Risk signals feed into partner cascade | -> | Function call: `processSignal()` | `src/zones/partner-profile/cascade-engine-integration.ts` |
| **Core Terminal** | **Telegram Hub** | Risk/payment/agent events published to Redis | -> | `publishEvent()` to Redis Stream | `src/queue/publisher.ts` |
| **Partner Profile OS** | **Core Terminal** | Gate decisions logged to core audit tables | -> | SQLite INSERT | `partner_gate_log`, `partner_lifecycle_log` |
| **Partner Profile OS** | **Telegram Hub** | Alerts dispatched via auto-created groups | -> | `dispatchToTelegram()` | `src/zones/partner-profile/telegram-integration.ts` |
| **Telegram Hub** | **Core Terminal** | Delivery stats available via API endpoints | <- | GET `/api/telegram/delivery-stats` | `src/api/telegram/delivery-stats.ts` |
| **Telegram Hub** | **Partner Profile OS** | Partner group auto-provisioning | -> | `autoCreateTelegramGroups()` | `src/zones/partner-profile/telegram-integration.ts` |

### 4.2 Detailed Integration: Core Terminal -> Partner Profile OS

```
Core Terminal RiskScoringService
    |
    v
Risk alert detected (severity: CRITICAL/HIGH)
    |
    v
Format as SignalContext:
    {
      signalId: "risk-123",
      partnerId: "HYBRID_001",
      bookId: "PINNACLE",
      tier: "T1",
      type: "steam",
      suggestedStake: 15000,
      eventId: "EVT_456",
      market: "spread",
      sport: "NBA",
      confidence: 0.95,
      urgencyMs: 5000
    }
    |
    v
processSignal(signal)  [cascade-engine-integration.ts]
    |
    v
PartnerGateway.evaluate(signal)  [partner-gateway.ts]
    |-- 10-step evaluation (state, book, type, tier, KYC, balance, OpSec, market, exposure, adjust)
    |
    +---> allowed=true  --> recordExposure(stake) --> persist to partner_gate_log
    |                       --> trigger settlement if bet placed
    |                       --> alert via Telegram if threshold met
    |
    +---> allowed=false --> persist to partner_gate_log with reason
    |                       --> alert admin if critical
    |
    +---> action=adjust   --> recordExposure(adjustedStake)
```

### 4.3 Detailed Integration: Core Terminal -> Telegram Hub

```
Core Terminal Services
    |
    +-- RiskScoringService.onRiskAlert()
    |     |
    |     v
    |   publishEvent('risk_alerts', {
    |     type: 'risk_alert',
    |     agentLogin: alert.agentLogin,
    |     purpose: 'riskAlerts',
    |     priority: alert.severity === 'CRITICAL' ? 'critical' : 'normal',
    |     payload: { severity, playerId, message, wagerNumber, riskScore }
    |   })
    |
    +-- PaymentService.onDepositRequest()
    |     |
    |     v
    |   publishEvent('payment_events', {
    |     type: 'deposit_request',
    |     agentLogin: deposit.agentLogin,
    |     purpose: 'deposits',
    |     priority: deposit.amount > 10000 ? 'critical' : 'normal',
    |     payload: { playerId, amount, currency, method, transactionId }
    |   })
    |
    +-- AgentService.onPerformanceUpdate()
          |
          v
        publishEvent('agent_events', {
          type: 'performance_update',
          agentLogin: update.agentLogin,
          purpose: 'reports',
          payload: { ggr, ngr, activePlayers, period }
        })

All publishEvent() calls are:
  - NON-BLOCKING (fire-and-forget)
  - Internal error caught and logged, never thrown to caller
  - Auto-enriched with ISO timestamp
  - Written with MAXLEN ~ 10000 to prevent unbounded growth
```

### 4.4 Detailed Integration: Partner Profile OS -> Telegram Hub

```
PartnerGateway.shouldAlert(type, stake)
    |
    +-- Checks alert_types (from TOML profile.telegram.alert_types)
    +-- Checks alert_stake_minimum
    |
    v
gateway.getAlertGroups(signalType)
    |-- Returns matching groups from profile.telegram.groups[]
    |-- Routes steam -> steam group, arb -> arb group, etc.
    |
    v
dispatchToTelegram(group, alertPayload)
    |-- Resolves chat_id from partner_telegram_topics
    |-- Formats message based on alert type
    |-- Sends via Telegram Bot API
    |-- Logs to partner_telegram_dispatch_log
```

### 4.5 Cross-Zone Consumption Matrix (Partner Profile OS)

| From Zone | To Zone | Gateway Method | Data | Frequency |
|---|---|---|---|---|
| **Profile** | Zone 1 Sportsbook | `evaluate(signal)` + `currentLimit` | Gate decision | Per signal |
| **Profile** | Zone 3 Telegram | `shouldAlert(type, stake)` + `getAlertGroups()` | Filter + routing | Per event |
| **Profile** | Zone 4 Risk | `setRisk()` + `runtime.riskLevel` | OpSec updates | Every 30s |
| **Profile** | Zone 6 Accounting | `calculateCommission()` + `recordSettlement()` | Commission + balance | Per settlement |
| **Profile** | Zone 9 Market | `isBookAllowed()` + `isSteamAllowed()` | Source filtering | Per tick |
| **Profile** | SDN | `evaluate(signal)` | GateResult | Per signal |
| **Profile** | Zone 22 Partner Command | `getGateway()` + `renderDashboard()` | Full state | On demand |
| **Profile** | Dashboard | `recordGateEvent()` | Block reasons | Real-time |
| **Telegram** | Profile | `autoCreateTelegramGroups()` | Group thread IDs | On materialize |
| **Settlement** | Profile | `recordDeposit()` + `recordWithdrawal()` | Balance updates | Per transaction |
| **Risk** | Profile | `setKyc()` + `setRisk()` | Compliance state | Per check |
| **Source Router** | Profile | `routeSignal()` + `refreshBookIndex()` | Signal distribution | Per signal |

---

## 5. Technology Stack

### 5.1 Complete Stack Overview

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Bun | 1.0+ | JavaScript/TypeScript runtime with native APIs |
| **Language** | TypeScript | 5.x | Type-safe development |
| **Server** | `Bun.serve()` | Built-in | Single-port HTTP + WebSocket + SSE |
| **Frontend Framework** | React | 19 | SPA UI |
| **Build Tool** | Vite | 5.x | Frontend bundling + dev server |
| **Database** | `bun:sqlite` | Built-in | Primary data store (44 tables) |
| **Message Queue** | Redis Streams | 7.x+ | Telegram event routing |
| **Redis Client** | ioredis | ^5.x | Production-stable Redis client |
| **Validation** | Zod | ^3.23.x | Runtime schema validation (Partner Profile OS) |
| **JWT** | jose | ^5.x | HS256 signing/verification |
| **Metrics** | prom-client | ^15.x | Prometheus-compatible metrics |
| **TOML Parsing** | `Bun.TOML.parse()` | Built-in | Partner template loading |
| **Template Discovery** | `new Glob()` | Built-in | Template file discovery |
| **Object Cloning** | `structuredClone()` | Built-in | Template isolation |
| **HTTP Client** | `fetch()` | Built-in | All external API calls |
| **Cron** | `Bun.cron` | Built-in | 8 scheduled jobs |
| **Process Management** | PM2 | 5.x+ | Production process management |
| **Systemd** | systemd | Any | Alternative to PM2 |

### 5.2 Zero-Dependency Design (Partner Profile OS)

The Partner Profile OS uses **zero non-Bun dependencies** except Zod:

| What | Used | Instead of |
|------|------|-----------|
| TOML parsing | `Bun.TOML.parse()` | `smol-toml` |
| File discovery | `new Glob()` from `"bun"` | `glob` npm package |
| Deep clone | `structuredClone()` | `lodash.cloneDeep` |
| HTTP requests | `fetch()` | `axios` |
| Database | `bun:sqlite` | Better-sqlite3 |
| Cron | `Bun.cron` | `node-cron` |

### 5.3 Dependencies by Zone

| Zone | Package | Purpose |
|------|---------|---------|
| Zone 4 | `prom-client` | Prometheus metrics |
| Zone 4 | `jose` | JWT signing/verification |
| Zone 8 | Built-in `fetch` | Webhook dispatch |
| All backend | `bun:sqlite` | Database access |
| Partner Profile | `zod` | Schema validation |
| Telegram Hub | `ioredis` | Redis Streams |
| Frontend | `react@19`, `vite` | SPA framework |

---

## 6. Port Layout & Endpoints

### 6.1 Single-Port Bun.serve

All traffic — HTTP, WebSocket, and SSE — runs on a single port via `Bun.serve()`:

```typescript
// src/index.ts
Bun.serve({
  port: process.env.PORT || 3000,
  
  // HTTP routes
  async fetch(req, server) {
    const url = new URL(req.url);
    
    // WebSocket upgrade
    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(req);
      if (upgraded) return undefined;
    }
    
    // SSE endpoint
    if (url.pathname === '/api/stream/live-wagers') {
      return handleSSE(req, server);
    }
    
    // Regular HTTP API routes
    return routeRequest(req);
  },
  
  // WebSocket handlers
  websocket: {
    open(ws) { /* register client */ },
    message(ws, message) { /* handle WS message */ },
    close(ws) { /* unregister client */ },
  },
});
```

### 6.2 93 Proxy Endpoints (16 Categories)

| Category | Count | Key Endpoints | Skill Reference |
|----------|-------|--------------|-----------------|
| Authentication | 3 | `POST /api/proxy/auth`, `/renewToken`, `/accountInfo` | `SKILL.md` Section 5.1 |
| Secrets Vault | 3 | Vault CRUD | `SKILL.md` Section 5.1 |
| Buckeye Live Data | 4 | `/players`, `/wagers`, `/agentPerformance`, `/pending` | `SKILL.md` Section 5.1 |
| Agent Decisions | 5 | `/agent/analyze-live`, `/extract-features`, `/rules` | `SKILL.md` Section 5.1 |
| IP Intelligence | 8 | `/agent/ip-block`, IP tracking, denylist, flags | `SKILL.md` Section 5.1 |
| Rules Engine | 5 | `/agent/rules` CRUD + execution | `SKILL.md` Section 5.1 |
| Player Intelligence | 7 | `/players/search`, `/performancePlayer` | `SKILL.md` Section 5.1 |
| Sandbox v1 | 6 | `/sandbox/v1/*` legacy | `SKILL.md` Section 5.1 |
| Sandbox v2 | 7 | `/sandbox/v2/save`, `/ab-test`, `/generate-summaries` | `SKILL.md` Section 5.1 |
| Export | 1 | `/export/*` CSV | `SKILL.md` Section 5.1 |
| Kimi AI | 1 | `/kimi/chat` completions | `SKILL.md` Section 5.1 |
| Risk Command Center | 19 | `/positions/generate`, `/dashboard/metrics`, SSE `/stream/live-wagers` | `SKILL.md` Section 5.1 |
| Enforcement | 8 | `/enforcement/apply-limit`, `/auto-enforce` | `SKILL.md` Section 5.1 |
| Player Search | 3 | `/players/search` with filters | `SKILL.md` Section 5.1 |
| Agent Hub | 12 | `/proxy/agentDownline`, `/agentBilling`, hierarchy | `SKILL.md` Section 5.1 |
| Benchmark | 1 | `/benchmark` | `SKILL.md` Section 5.1 |

**Upstream:** `fantasy402.com:443` (Cloudflare-protected). Auth modes: public, apikey (`X-API-Key`), or session (Buckeye JWT + `cf_clearance`).

### 6.3 Telegram Hub API Endpoints

| Method | Endpoint | Description | Auth | Reference |
|--------|----------|-------------|------|-----------|
| `GET` | `/api/health/system-status` | Overall health + per-bot status | Public | `api-extensions.md` |
| `POST` | `/api/admin/bots/refresh` | Trigger topic reconciliation | Admin role | `api-extensions.md` |
| `GET` | `/api/telegram/delivery-stats` | Aggregated delivery metrics | Admin | `api-extensions.md` |
| `GET` | `/api/telegram/bot/:botId/stats` | Per-bot real-time stats | Admin | `api-extensions.md` |

### 6.4 Partner Profile OS Endpoints

The Partner Profile OS does not expose direct HTTP endpoints. It is consumed via:

1. **Function calls** from other zones (see Section 4.5 Cross-Zone Consumption Matrix)
2. **Cascade engine** — `processSignal(signal)` as single entry point
3. **Dashboard** — `renderDashboard(termWidth)` for ANSI terminal views
4. **Hot reload** — `fs.watch` on `./profiles/*.toml` for zero-downtime updates

### 6.5 WebSocket Message Registry

WebSocket messages follow `{ type, provider, data }` format:

| Message Type | Direction | Description |
|---|---|---|
| `lineMove` | Server -> Client | Odds line movement from Zone 1 |
| `riskAlert` | Server -> Client | Risk alert from Command Center |
| `wagerTick` | Server -> Client | Live wager from SSE stream |
| `positionUpdate` | Server -> Client | Risk position change |
| `agentUpdate` | Server -> Client | Agent hierarchy/performance change |

### 6.6 SSE Endpoints

| Endpoint | Description | Output Format |
|----------|-------------|---------------|
| `/api/stream/live-wagers` | Real-time wager stream | SSE `text/event-stream` |

---

## 7. Auth Matrix

### 7.1 Authentication Modes

| Mode | Mechanism | When Used | Dev Override |
|------|-----------|-----------|-------------|
| **JWT** | HS256 signed tokens via `jose` library | Production default | `DEV_BYPASS_JWT=true` skips verification |
| **API Key** | `X-API-Key` header to proxy bridge | Internal service calls | — |
| **Session (Buckeye)** | Cloudflare-protected session cookie | Direct Buckeye API access | — |
| **Dev Bypass** | All auth checks return true | Local development | `DEV_BYPASS_JWT=true` |

### 7.2 Auth Decision Flow

```
Incoming Request
    |
    +---> Has X-API-Key header? ------> Validate against ADMIN_API_TOKEN
    |                                    -> pass to next handler
    |
    +---> Has Authorization header? ---> Extract Bearer token
    |                                    -> jose jwtVerify() with JWT_SECRET
    |                                    -> Attach req.user = decoded
    |                                    -> pass to next handler
    |
    +---> Has session cookie? --------> Validate Buckeye session
    |                                    -> pass to next handler
    |
    +---> DEV_BYPASS_JWT=true? --------> req.user = { role: 'dev', id: 'dev' }
    |                                    -> pass (development only)
    |
    +---> None of above? --------------> 401 Unauthorized
```

### 7.3 Role-Based Access

| Role | Description | Can Access |
|------|-------------|-----------|
| `public` | No auth required | `/`, `/openapi`, `/health` |
| `user` | Authenticated user | All read endpoints |
| `admin` | Admin user | `/api/admin/*`, bot refresh, delivery stats |
| `superadmin` | Full system access | Everything + user management |
| `dev` | Dev bypass mode | Everything (local only) |

### 7.4 Buckeye Integration

```
Buckeye (fantasy402.com:443, Cloudflare-protected)
    |
    +-- Auth flow:
    |     POST /api/proxy/auth -> returns JWT + cf_clearance cookie
    |     POST /api/proxy/renewToken -> refreshes JWT
    |     POST /api/proxy/accountInfo -> validates session
    |
    +-- Data flow:
          All proxied through Core Terminal with session forwarding
          cf_clearance cookie passed transparently
```

---

## 8. Environment Variables

### 8.1 Core Terminal Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | — | HS256 secret for JWT signing |
| `IDLE_TIMEOUT_MS` | No | `300000` | Shutdown delay when no WS clients |
| `DEV_BYPASS_JWT` | No | `false` | Skip JWT verification in development |
| `ADMIN_API_TOKEN` | No | — | Guards sensitive mutation endpoints |
| `PROXY_INTERNAL_URL` | No | `http://localhost:3001` | Proxy bridge URL |
| `PROXY_API_KEY` | No | — | `X-API-Key` header for proxy bridge |
| `REDIS_URL` | No | — | Redis connection URL (enables Telegram Hub) |
| `TELEGRAM_BOT_TOKEN` | No | — | Primary Telegram bot token |
| `ENABLE_ANALYTICS` | No | `false` | Enable analytics endpoints |
| `ENABLE_RISK_ENGINE` | No | `false` | Enable risk scoring engine |
| `KIMI_API_KEY` | No | — | Kimi AI API key for risk analysis |

### 8.2 Partner Profile OS Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_PATH` | Yes | `./data/sports-terminal.db` | SQLite database path |
| `PROFILE_TEMPLATE_DIR` | No | `./profiles` | TOML template directory |
| `PROFILE_HOT_RELOAD` | No | `true` | Enable template hot-reload watcher |
| `TELEGRAM_ADMIN_GROUP_ID` | No | — | Admin alert group chat ID |

### 8.3 Per-Template Environment Variables (from TOML)

API keys are referenced by environment variable name in TOML templates — never hardcoded:

| Template Field | Env Var Example | Description |
|---|---|---|
| `api_key_env` | `DK_API_KEY` | DraftKings API key |
| `api_key_env` | `PIN_API_KEY` | Pinnacle API key |
| `api_secret_env` | `PIN_API_SECRET` | Pinnacle API secret |
| `admin_bot_token_env` | `TELEGRAM_BOT_TOKEN` | Telegram bot token reference |

### 8.4 Telegram Hub Variables

#### Backend API (port 3000)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `production` | Runtime environment |
| `PORT` | No | `3000` | Server port |
| `DB_PATH` | Yes | `/data/terminal.db` | SQLite database path |
| `REDIS_URL` | Yes | `redis://localhost:6379` | Redis connection URL |
| `REDIS_MAX_RETRIES` | No | `3` | Max Redis retry attempts |
| `REDIS_RETRY_DELAY_MS` | No | `1000` | Redis retry delay base |
| `RISK_BOT_TOKEN` | No | — | Risk bot Telegram token |
| `PAYMENT_BOT_TOKEN` | No | — | Payment bot Telegram token |
| `AGENT_BOT_TOKEN` | No | — | Agent bot Telegram token |
| `WEBHOOK_SECRET` | No | — | Webhook validation secret |

#### Bot Workers (separate processes)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BOT_ID` | Yes | — | Worker bot ID (`risk_bot`, `payment_bot`, `agent_bot`) |
| `BOT_TOKEN` | Yes | — | Telegram bot token |
| `STREAMS` | Yes | — | Comma-separated Redis stream names |
| `DB_PATH` | Yes | — | SQLite database path |
| `REDIS_URL` | Yes | — | Redis connection URL |
| `BLOCK_TIMEOUT_MS` | No | `1000` | `XREADGROUP BLOCK` timeout |
| `HEARTBEAT_INTERVAL_MS` | No | `30000` | Heartbeat write interval |
| `STALE_CLAIM_INTERVAL_MS` | No | `30000` | Stale entry reaper interval |
| `MAX_BATCH_SIZE` | No | `10` | Max entries per read |

---

## 9. Error Handling Strategy

### 9.1 Error Severity Levels

| Level | Description | Example | Handling |
|-------|-------------|---------|----------|
| **Fatal** | System cannot continue | SQLite unreachable, Zod schema mismatch | Throw immediately, abort boot |
| **Operational** | Expected failure mode | Partner not found, blacklisted book | Return structured error, log to audit |
| **Warning** | Degraded but functional | Slow source response, stale template | Log, continue, alert if persistent |

### 9.2 Consistent Error Response Format

```typescript
// API endpoint wrapper
// Location: Used across all src/api/*.ts handlers
try {
  const result = await operation();
  return Response.json(result, { status: 200 });
} catch (err: any) {
  recordError(source);
  return Response.json({ error: err.message, code: 'ERROR_CODE' }, { status: 500 });
}

// WebSocket handler — never let one message crash the handler
// Location: src/index.ts websocket.message handler
try {
  await processMessage(msg);
} catch (err: any) {
  console.error(`[WS] Error processing ${msg.type}:`, err);
}

// Background service — never crash the service
// Location: All Bun.cron handlers
try {
  await pollAll();
} catch (err: any) {
  console.error(`[Service] Polling error:`, err);
}
```

### 9.3 Partner Profile OS Error Patterns

| Scenario | Behavior | Logged To |
|---|---|---|
| Malformed TOML template | Throw with line/column, skip template | `stderr` |
| Missing required profile field | Zod validation error, template skipped | `stderr` |
| Unknown `bookId` in `routeSignal()` | Returns empty array `[]` | — |
| Partner not found for `processSignal()` | `GateResult` with `action: "block"`, `reason: "Partner not found"` | `partner_gate_log` |
| Frozen partner evaluates signal | Always blocks with `reason: "Partner frozen"` | `partner_gate_log` |
| Exceeds max daily exposure | `action: "adjust"`, stake reduced to `remainingDaily` | `partner_gate_log` |
| Blacklisted book | `action: "block"`, `reason: "Book BLACKLISTED"` | `partner_gate_log` |
| KYC not verified | `action: "block"`, `reason: "KYC pending"` | `partner_gate_log` |
| OpSec score exceeded | `action: "block"`, triggers auto-suspend | `partner_gate_log`, `partner_lifecycle_log` |

### 9.4 GateResult Error Semantics

```typescript
// All signal evaluation errors captured in GateResult — they NEVER throw
interface GateResult {
  allowed: boolean;
  action: "allow" | "block" | "adjust" | "defer";
  reason?: string;        // Human-readable reason for block/defer
  adjustedStake?: number; // Reduced stake when action is "adjust"
  deferredUntil?: number; // Unix timestamp for deferred re-evaluation
  metadata: {
    originalStake: number;
    maxExposure: number;
    maxDaily: number;
    remainingDaily: number;
    tier: string;
    template: string;
    bookAllowed: boolean;
    typeAllowed: boolean;
    kycPass: boolean;
    balancePass: boolean;
    opsecPass: boolean;
    marketLimit?: number;
  };
}
```

### 9.5 Telegram Hub Error Handling

| Scenario | Behavior |
|---|---|
| `publishEvent()` fails | Caught internally, logged to `stderr`, returns `null` — **never throws to caller** |
| Redis connection lost | Auto-retry with exponential backoff (via ioredis) |
| Bot worker crashes | PM2/systemd auto-restart; stale entries reclaimed by other workers |
| Topic resolution fails | Logged to `telegram_dispatch_log` with `status='failed'` |
| Rate limit hit (429) | SendMessageClient auto-retry with backoff |
| `XACK` failure | Logged, continue processing next entry |

---

## 10. Logging Strategy

### 10.1 Domain Log Functions (23 Functions)

All 23 domain log functions live in `src/utils/tableLogger.ts`. Each function uses a specific prefix:

| # | Prefix | Function | Description | Used By |
|---|--------|----------|-------------|---------|
| 1 | `[WagerTicker]` | `logWager()` | Individual wager events | Ingest stage |
| 2 | `[AgentHierarchy]` | `logAgent()` | Agent CRUD and hierarchy | Agent Domain |
| 3 | `[PlayerRisk]` | `logPlayerRisk()` | Player risk classification | Risk & Analytics |
| 4 | `[RiskScore]` | `logRiskScore()` | Risk score calculations | Risk scoring |
| 5 | `[OpenPosition]` | `logPosition()` | Risk position changes | Risk & Analytics |
| 6 | `[RiskAlert]` | `logRiskAlert()` | Risk alert triggers | Command Center |
| 7 | `[PluginExecution]` | `logPlugin()` | Rules engine execution | Rules Engine |
| 8 | `[AgentAction]` | `logAgentAction()` | Agent-initiated actions | Agent Domain |
| 9 | `[Enforcement]` | `logEnforcement()` | Limit enforcement events | Enforcement |
| 10 | `[HealthCheck]` | `logHealth()` | System health checks | Backend Ops |
| 11 | `[CronSchedule]` | `logCron()` | Cron job execution | All cron jobs |
| 12 | `[BuckeyeAudit]` | `logBuckeye()` | Buckeye API audit trail | Proxy layer |
| 13 | `[TelegramRoute]` | `logTelegram()` | Telegram message routing | Telegram Hub |
| 14 | `[WebhookStatus]` | `logWebhook()` | Webhook delivery status | Webhook Dispatcher |
| 15 | `[ArchetypeBatch]` | `logArchetype()` | Archetype classification | Extract stage |
| 16 | `[PlayerNote]` | `logPlayerNote()` | Player note CRUD | Player Domain |
| 17 | `[Transaction]` | `logTransaction()` | Financial transactions | Settlement |
| 18 | `[Violation]` | `logViolation()` | Wager violation detection | Stream stage |
| 19 | `[PlayerFlag]` | `logPlayerFlag()` | Player flag management | Player Domain |
| 20 | `[SportEvent]` | `logSportEvent()` | Sporting event tracking | Odds/scrapers |
| 21 | `[MarketDepth]` | `logMarketDepth()` | Market depth changes | Prediction Markets |
| 22 | `[Telemetry]` | `logTelemetry()` | System telemetry | Backend Ops |
| 23 | `[ActionQueue]` | `logQueue()` | Async job processing | Action Queue |

### 10.2 Partner Profile OS Log Prefixes

Additional prefixes used by the Partner Profile OS (from `src/zones/partner-profile/*.ts`):

```
[PARTNER:<partnerId>]    -- All gateway method calls
[INDEX]                  -- Book index operations
[CASCADE]                -- Signal cascade processing
[LIFECYCLE]              -- State machine transitions
[SETTLEMENT]             -- Commission and payout operations
[SOURCE]                 -- Source authorization and health checks
[TELEGRAM]               -- Group creation and message dispatch
[RELOAD]                 -- Template hot-reload events
```

### 10.3 Audit Tables

#### Core Terminal Audit Tables

| Table | Events Tracked | Retention |
|---|---|---|
| `request_log` | Every HTTP request | 90 days |
| `alert_log` | Every risk alert triggered | 90 days (purged by cron) |
| `webhook_delivery_log` | Every webhook delivery attempt | Per config |
| `limit_enforcement_log` | Every enforcement action | Per config |
| `wager_violations` | Every wager violation detected | Per config |
| `ip_reputation_log` | Every IP reputation change | Per config |

#### Partner Profile OS Audit Tables (Immutable)

| Table | Events Tracked | Retention |
|---|---|---|
| `partner_gate_log` | Every gate allow/block/adjust/defer | 7 years (`audit_retention_days = 2555`) |
| `partner_lifecycle_log` | Every state transition with guard results | 7 years |
| `partner_settlement_log` | Every bet settlement with P&L | 7 years |

#### Telegram Hub Audit Tables

| Table | Events Tracked | Retention |
|---|---|---|
| `telegram_dispatch_log` | Every event processed by bot workers | Per config |
| `bot_heartbeat` | Every worker heartbeat (every 30s) | Per config |

### 10.4 Log Format Configuration

```env
LOG_FORMAT=json|text     # Production uses JSON, dev uses text
LOG_LEVEL=debug|info|warn|error  # Minimum log level
```

**Text format (development):**
```
[PARTNER:HYBRID_001] evaluate: allowed=true action=allow stake=10000 book=PINNACLE type=steam
```

**JSON format (production):**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO",
  "component": "PartnerGateway",
  "partner_id": "HYBRID_001",
  "event": "evaluate",
  "result": {
    "allowed": true,
    "action": "allow",
    "stake": 10000,
    "book": "PINNACLE",
    "type": "steam",
    "duration_ms": 0.05
  }
}
```

### 10.5 Dual Cache Architecture

Two in-memory caches work together for performance:

```
+------------------+     +----------------------+
| tableLogger.ts   |     | agentSnapshot.ts     |
| Local cache      |     | Agent state cache    |
| (log entries)    |     | (agent metadata)     |
+------------------+     +----------------------+
         |                        |
         +----------+-------------+
                    |
                    v
              bun:sqlite
         (persistent store)
```

**Rule:** Modifying one cache requires checking the other. Both flush to SQLite on interval.

---

## 11. Deployment Architecture

### 11.1 Process Topology

```
+--------------------------------------------------------------+
|                         HOST                                 |
|                                                              |
|  +------------------+                                        |
|  | Bun.serve()      |  Port 3000                             |
|  | st-api process   |  HTTP + WebSocket + SSE               |
|  |                  |                                        |
|  | + Core Terminal  |                                        |
|  | + Partner OS     |                                        |
|  | + Queue Publisher|                                        |
|  +--------+---------+                                        |
|           ^                                                  |
|           | SQLite (WAL mode)                                |
|           v                                                  |
|  +--------+---------+    +------------------+                |
|  | Redis            |<-->| Bot Workers      |                |
|  | localhost:6379   |    | (3 processes)    |                |
|  +------------------+    |                  |                |
|                          | + risk_bot       |                |
|                          | + payment_bot    |                |
|                          | + agent_bot      |                |
|                          +------------------+                |
|                                                              |
|  Supporting services:                                        |
|  - PM2 (process management)                                  |
|  - systemd (alternative)                                     |
|  - Cron (health checks every 2 min)                          |
+--------------------------------------------------------------+
```

### 11.2 PM2 Configuration

```javascript
// ecosystem.config.js — from telegram-hub-integrator/references/deployment.md
module.exports = {
  apps: [
    {
      name: 'st-api',
      script: 'bun',
      args: 'run src/server.ts',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production', PORT: 3000 },
      log_file: './logs/api.log',
      error_file: './logs/api.error.log',
    },
    {
      name: 'st-risk-bot',
      script: 'bun',
      args: 'run workers/TelegramBotWorker.ts',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: { NODE_ENV: 'production', BOT_ID: 'risk_bot', STREAMS: 'risk_alerts' },
      log_file: './logs/risk-bot.log',
      error_file: './logs/risk-bot.error.log',
    },
    {
      name: 'st-payment-bot',
      script: 'bun',
      args: 'run workers/TelegramBotWorker.ts',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: { NODE_ENV: 'production', BOT_ID: 'payment_bot', STREAMS: 'payment_events' },
      log_file: './logs/payment-bot.log',
      error_file: './logs/payment-bot.error.log',
    },
    {
      name: 'st-agent-bot',
      script: 'bun',
      args: 'run workers/TelegramBotWorker.ts',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: { NODE_ENV: 'production', BOT_ID: 'agent_bot', STREAMS: 'agent_events' },
      log_file: './logs/agent-bot.log',
      error_file: './logs/agent-bot.error.log',
    },
  ],
};
```

**Commands:**
```bash
pm2 start ecosystem.config.js           # Start all processes
pm2 reload ecosystem.config.js          # Zero-downtime reload
pm2 logs st-risk-bot                    # Tail risk bot logs
pm2 monit                               # Interactive monitor
```

### 11.3 systemd Services

#### API Service

```ini
# /etc/systemd/system/st-api.service
[Unit]
Description=Sports Terminal API
After=network.target redis.service

[Service]
Type=simple
User=st
WorkingDirectory=/opt/sports-terminal
ExecStart=/usr/local/bin/bun run src/server.ts
Restart=always
RestartSec=5
Environment="NODE_ENV=production"
Environment="PORT=3000"
Environment="DB_PATH=/data/terminal.db"
Environment="REDIS_URL=redis://localhost:6379"

[Install]
WantedBy=multi-user.target
```

#### Bot Worker Template (Parameterized)

```ini
# /etc/systemd/system/st-bot@.service
[Unit]
Description=Sports Terminal Bot Worker (%i)
After=network.target redis.service st-api.service

[Service]
Type=simple
User=st
WorkingDirectory=/opt/sports-terminal
ExecStart=/usr/local/bin/bun run workers/TelegramBotWorker.ts
Restart=always
RestartSec=10
Environment="NODE_ENV=production"
Environment="DB_PATH=/data/terminal.db"
Environment="REDIS_URL=redis://localhost:6379"
Environment="BOT_ID=%i"
# BOT_TOKEN and STREAMS set via instance-specific drop-in

[Install]
WantedBy=multi-user.target
```

#### Instance Drop-ins

```ini
# /etc/systemd/system/st-bot@risk_bot.service.d/override.conf
[Service]
Environment="BOT_TOKEN=YOUR_RISK_BOT_TOKEN"
Environment="STREAMS=risk_alerts"
```

```ini
# /etc/systemd/system/st-bot@payment_bot.service.d/override.conf
[Service]
Environment="BOT_TOKEN=YOUR_PAYMENT_BOT_TOKEN"
Environment="STREAMS=payment_events"
```

```ini
# /etc/systemd/system/st-bot@agent_bot.service.d/override.conf
[Service]
Environment="BOT_TOKEN=YOUR_AGENT_BOT_TOKEN"
Environment="STREAMS=agent_events"
```

**Enable and start:**
```bash
systemctl daemon-reload
systemctl enable st-api.service
systemctl enable st-bot@risk_bot.service
systemctl enable st-bot@payment_bot.service
systemctl enable st-bot@agent_bot.service

systemctl start st-api.service
systemctl start st-bot@risk_bot.service
systemctl start st-bot@payment_bot.service
systemctl start st-bot@agent_bot.service
```

### 11.4 Health Monitoring

#### Health Check Script

```typescript
// scripts/health-check.ts — from telegram-hub-integrator/references/deployment.md
import { Database } from 'bun:sqlite';

const db = new Database(process.env.DB_PATH || '/data/terminal.db');
const STALE_MS = 120000;  // 2 minutes

function checkBots(): boolean {
  const rows = db.query(`
    SELECT bot_id, (julianday('now') - julianday(last_seen)) * 86400000 as age_ms
    FROM bot_heartbeat
  `).all() as Array<{ bot_id: string; age_ms: number }>;

  let allHealthy = true;
  for (const row of rows) {
    if (row.age_ms > STALE_MS) {
      console.error(`[Health] ${row.bot_id} STALE (${Math.round(row.age_ms / 1000)}s ago)`);
      allHealthy = false;
    } else {
      console.log(`[Health] ${row.bot_id} OK (${Math.round(row.age_ms / 1000)}s ago)`);
    }
  }
  return allHealthy;
}

const ok = checkBots();
process.exit(ok ? 0 : 1);
```

#### Cron Health Check

```bash
# crontab -e
*/2 * * * * cd /opt/sports-terminal && bun run scripts/health-check.ts || systemctl restart 'st-bot@*'
```

### 11.5 Monitoring Metrics

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| Bot heartbeat age | `bot_heartbeat.last_seen` | > 60s |
| Queue depth | `XLEN stream` | > 100 |
| Pending entries | `XPENDING` | > 10 for > 30s |
| Delivery failure rate | `telegram_dispatch_log` | > 1% |
| Avg delivery latency | `telegram_dispatch_log.latency_ms` | > 2000ms |
| Bot memory usage | Process metric | > 200MB |
| Bot CPU usage | Process metric | > 80% sustained |
| Partner mass-freeze | `partner_lifecycle_log` | > 10 in 1 min |
| Daily exposure > 90% | `partner_profiles.daily_used` | Per partner |

### 11.6 Gradual Rollout Plan

| Phase | Timeline | What | Verification |
|-------|----------|------|-------------|
| 1 | Day 1-3 | Risk bot only | Topics created, messages delivered, heartbeats updating |
| 2 | Day 4-5 | Add payment bot | Queue depths stable, delivery rates good |
| 3 | Day 6-7 | Add agent bot | No cross-bot conflicts |
| 4 | Day 8+ | Full PM2/systemd | All checks pass |

### 11.7 Database Migration Strategy

Migrations follow strict naming: `migrations/NNN-zone-description.sql`

```sql
-- Every migration has -- UP and -- DOWN sections
-- Example: migrations/005_telegram_hub.sql
-- UP
CREATE TABLE IF NOT EXISTS bot_heartbeat (...);
CREATE TABLE IF NOT EXISTS telegram_dispatch_log (...);
ALTER TABLE agent_supergroups ADD COLUMN bot_id TEXT;
CREATE INDEX IF NOT EXISTS ...;

-- DOWN
DROP TABLE IF EXISTS telegram_dispatch_log;
DROP TABLE IF EXISTS bot_heartbeat;
-- (bot_id column removal is SQLite-restricted)
```

**Commands:**
```bash
bun run db:migrate              # Apply all pending UP migrations
bun run db:rollback <NNN>       # Rollback specific DOWN migration
```

**Critical rules:**
- Every migration has `-- UP` and `-- DOWN` sections
- Use `IF NOT EXISTS` for safety
- Never drop tables with production data
- Run `PRAGMA foreign_keys = ON` on every connection
- Use WAL mode for concurrent reads/writes: `PRAGMA journal_mode = WAL`

---

## 12. Appendix: File Path Registry

### 12.1 All Skill Source Files

| File | Absolute Path | Description |
|------|--------------|-------------|
| Core Skill | `/app/.user/skills/sports-terminal-v52-builder/SKILL.md` | Main sports terminal builder skill |
| Core Quick Ref | `/app/.user/skills/sports-terminal-v52-builder/references/quick-reference.md` | One-page cheat sheet |
| Core Session Template | `/app/.user/skills/sports-terminal-v52-builder/references/session-state-template.md` | MEMORY.md template |
| Partner Skill | `/app/.user/skills/partner-profile-os/SKILL.md` | Partner Profile OS skill |
| Partner Architecture | `/app/.user/skills/partner-profile-os/references/architecture.md` | Data source separation, routing |
| Partner Schema | `/app/.user/skills/partner-profile-os/references/schema.md` | 10 SQLite tables |
| Partner Gateway API | `/app/.user/skills/partner-profile-os/references/gateway-api.md` | Kernel API + GateResult |
| Partner Service API | `/app/.user/skills/partner-profile-os/references/service-api.md` | Service CRUD + routing |
| Partner Templates | `/app/.user/skills/partner-profile-os/references/templates.md` | TOML schema + examples |
| Partner Lifecycle | `/app/.user/skills/partner-profile-os/references/lifecycle.md` | State machine + guards |
| Partner Cross-Zone | `/app/.user/skills/partner-profile-os/references/cross-zone.md` | Cross-zone consumption |
| Partner Integrations | `/app/.user/skills/partner-profile-os/references/integrations.md` | All integration patterns |
| Partner Error Handling | `/app/.user/skills/partner-profile-os/references/error-handling.md` | Error patterns |
| Partner Security | `/app/.user/skills/partner-profile-os/references/security.md` | Security model |
| Partner Observability | `/app/.user/skills/partner-profile-os/references/observability.md` | Metrics + logging |
| Partner Build/Validate | `/app/.user/skills/partner-profile-os/references/build-and-validate.md` | Build order + validation |
| Partner Barrel | `/app/.user/skills/partner-profile-os/references/barrel-export.md` | index.ts exports |
| Partner Testing | `/app/.user/skills/partner-profile-os/references/testing.md` | Test patterns |
| Telegram Skill | `/app/.user/skills/telegram-hub-integrator/SKILL.md` | Telegram Hub Integrator skill |
| Telegram Queue | `/app/.user/skills/telegram-hub-integrator/references/queue-publisher.md` | Redis Streams publisher |
| Telegram Bot Worker | `/app/.user/skills/telegram-hub-integrator/references/bot-worker.md` | Bot worker class |
| Telegram Topic Mgr | `/app/.user/skills/telegram-hub-integrator/references/topic-manager.md` | Topic resolution |
| Telegram API Ext | `/app/.user/skills/telegram-hub-integrator/references/api-extensions.md` | Health + stats endpoints |
| Telegram DB Schema | `/app/.user/skills/telegram-hub-integrator/references/database-schema.md` | Migration SQL |
| Telegram Deployment | `/app/.user/skills/telegram-hub-integrator/references/deployment.md` | PM2 + systemd configs |

### 12.2 Implementation File Paths (to be created)

#### Core Terminal

```
src/
  index.ts                          # Bun.serve() bootstrap
  api/
    router.ts                       # 93 endpoint router
    proxy/
      auth.ts                       # Buckeye auth proxy
      players.ts                    # Player data proxy
      wagers.ts                     # Wager ingestion proxy
      agent-performance.ts          # Agent performance proxy
    middleware/
      jwt.ts                        # JWT verification (jose)
      rate-limit.ts                 # Rate limiting
    metrics.ts                      # Prometheus /metrics
    webhook-dispatcher.ts           # Webhook CRUD + dispatch
    rules-engine.ts                 # Rules CRUD + execution
    sandbox-v2.ts                   # Sandbox A/B testing
    export.ts                       # CSV export
    kimi.ts                         # Kimi AI chat
    ip-intelligence.ts              # IP tracking + denylist
    health/
      system-status.ts              # Extended health (from Telegram Hub)
    admin/
      bots/
        refresh.ts                  # Bot topic reconciliation
    telegram/
      delivery-stats.ts             # Delivery metrics
      bot-stats.ts                  # Per-bot stats
  services/
    odds-scraper.ts                 # Multi-provider odds
    classifyArchetype.ts            # Customer archetype classification
    RiskScoringService.ts           # AI risk analysis
    PaymentService.ts               # Payment event publishing
    AgentService.ts                 # Agent event publishing
  risk/
    scoring.ts                      # Risk scoring engine
    enforcement.ts                  # Limit enforcement
    command-center.ts               # Risk RCC
  prediction-markets/               # Prediction market providers
  utils/
    tableLogger.ts                  # 23 domain log functions
    agentSnapshot.ts                # Agent state cache
    idle-shutdown.ts                # Auto-shutdown
    action-queue.ts                 # Background job queue
    escape.ts                       # HTML escaping for Telegram
  queue/
    redis.ts                        # ioredis connection factory
    publisher.ts                    # publishEvent(), publishEvents()
    consumer.ts                     # ensureConsumerGroup(), claimStaleEntries()
    validate.ts                     # Event schema validation
  zones/
    partner-profile/                # Partner Profile OS (see below)
  db.ts                             # SQLite database factory
  App.tsx                           # React app shell
  pages/                            # 14 frontend pages
  components/                       # Reusable React components
assets/
  base.css                          # CSS conventions (.panel, .data-table, etc.)
  zone-showcase.html                # Zone visual showcase
  index.html                        # Vite entry HTML
migrations/
  001-zone-4-backend-ops.sql
  002-zone-1-sportsbook-grid.sql
  003-zone-8-webhook-alerts.sql
  004-zone-2-3-patterns-markets.sql
  005-telegram-hub.sql             # From telegram-hub-integrator/references/database-schema.md
  006-partner-profile-os.sql       # From partner-profile-os/references/schema.md
  007-player-domain.sql
  008-agent-domain.sql
  009-risk-analytics.sql
  010-operational-features.sql
workers/
  TelegramBotWorker.ts             # Bot worker class
  TopicManager.ts                  # Topic resolution
  SendMessageClient.ts             # Rate-limited Telegram sender
  shutdown.ts                      # Graceful shutdown handler
  launcher.ts                      # Multi-bot launcher
  risk-bot.ts                      # Single-bot entry point
scripts/
  validate.sh                      # 16-step smoke validation
  health-check.ts                  # Bot health checker
data/
  terminal.db                      # SQLite database (WAL mode)
profiles/                          # TOML partner templates
  hybrid-sharp.toml
  legal-us-retail.toml
  offshore-crypto.toml
logs/
  api.log
  api.error.log
  risk-bot.log
  payment-bot.log
  agent-bot.log
```

#### Partner Profile OS

```
src/zones/partner-profile/
  partner-profile-schema.ts        # Zod schemas
  partner-profile-loader.ts        # TOML discovery + parsing
  partner-profile-materializer.ts  # structuredClone + lifecycle
  partner-gateway.ts               # THE KERNEL: evaluate(signal)
  partner-profile-service.ts       # In-memory Map + SQLite + bookIndex
  partner-source-router.ts         # Book index routing
  cascade-engine-integration.ts    # processSignal() one-call entry
  telegram-integration.ts          # Auto-create groups, dispatch
  source-integration.ts            # Authorize + health check
  settlement-integration.ts        # Commission, makeup, balance
  dashboard-integration.ts         # Gate log, ANSI views
  hot-reload.ts                    # Template file watcher
  index.ts                         # Barrel export
```

---

*End of Integrated Sports Terminal OS Architecture Blueprint v5.2.0*

*This document is the single source of truth for all implementation agents. Any architectural changes must be reflected here before code changes are made.*
