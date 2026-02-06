# Hyper-Bun: Bun-Native API Integration Manifesto

**Version**: 18.0.0.0.0.0.0  
**Purpose**: API boundary documentation and integration patterns  
**Status**: ✅ Complete  
**Last Updated**: 2024-12-07

---

This document establishes explicit API boundaries and responsibilities between Bun's native runtime capabilities and Hyper-Bun's domain-specific implementations.

**Cross-References**:
- `7.0.0.0.0.0.0` → Bun Runtime Utilities
- `10.0.0.0.0.0.0` → Authentication & Session Management
- `11.0.0.0.0.0.0` → Terminal Environment
- `17.0.0.0.0.0.0` → Design System & Theming Subsystem
- `commands/VERSIONING.md` → CLI Commands versioning system

## **API Boundary Philosophy**

```text
┌─────────────────────────────────────────────────────────┐
│                    HYPER-BUN CORE                        │
│  Domain-Specific Market Intelligence & Trading Logic    │
├─────────────────────────────────────────────────────────┤
│              CUSTOM HYPER-BUN APIs                       │
│  • Market simulation/probing                           │
│  • Arbitrage detection                                 │
│  • Covert pattern analysis                             │
│  • Trading strategy execution                          │
├─────────────────────────────────────────────────────────┤
│             BUN NATIVE RUNTIME APIs                      │
│  • HTTP/WebSocket (fetch, WebSocket)                   │
│  • Database (SQLite via Bun.sqlite)                    │
│  • File I/O (Bun.file, CompressionStream)              │
│  • Process control (Bun.spawn, bun run)                │
│  • Crypto/hashing                                      │
└─────────────────────────────────────────────────────────┘
```

## **Explicit API Responsibilities Matrix**

### **Bun-Native API Responsibilities**

| API Category | Specific Functions | Usage Pattern in Hyper-Bun |
|--------------|-------------------|----------------------------|
| **HTTP/Network** | `fetch()`, `Response.json()`, `Headers`, `Request` | External bookmaker API calls, webhook dispatch |
| **Database** | `new Database()`, `.query()`, `.all()`, `.get()` | SQLite operations for market data storage |
| **File I/O** | `Bun.file()`, `.writer()`, `.text()` | Logging, configuration loading, data export |
| **Compression** | `new CompressionStream('zstd')` | Efficient storage of market data snapshots |
| **Process** | `bun run`, `Bun.spawn()` | Scheduled job execution, external tool orchestration |
| **Crypto** | `crypto.subtle`, `Bun.password` | API authentication, secure credential storage |
| **Utilities** | `Date`, `TextEncoder`, `console` | Timestamping, data serialization, debugging |

### **Hyper-Bun Custom API Responsibilities**

| API Category | Specific Functions | Bun-Native Dependencies |
|--------------|-------------------|--------------------------|
| **Market Probing** | `simulateMicroBetAttempt()`, `executeBookmakerApiProbe()` | `fetch()`, Headers, Response.json() |
| **Graph Building** | `generateEventMarketGraph()`, `deepProbeMarketOfferings()` | Database.query(), fetch() |
| **Pattern Detection** | `identifyDeceptiveLine()`, `assessMarketVisibility()` | Database.query(), Date.now() |
| **Arbitrage** | `calculateActualArbProfit()`, `detectConcealedArbitrage()` | Pure calculations, Database.query() |
| **Alerting** | `sendUrgentAlert()`, `pauseMarketData()` | fetch() (webhooks), internal state management |
| **Rate Limiting** | `acquireToken()`, RateLimiter class | `Bun.sleep()`, internal counters |
| **Authentication** | `getAuthToken()`, AuthService class | `crypto.subtle`, secure storage |

## **Key Integration Patterns**

### **Pattern 1: Database-Aware Market Operations**
```typescript
// Hyper-Bun abstracts complex market logic
class SubMarketShadowGraphBuilder {
  private async retrieveHistoricalLineData(nodeId: string) {
    // Bun-native: SQLite query
    return this.data_store.query(`
      SELECT * FROM line_movements 
      WHERE nodeId = ?1 
      ORDER BY timestamp DESC 
      LIMIT 100
    `).all(nodeId);
  }
  
  // Custom domain logic builds on raw data
  private analyzeTrendPatterns(historicalData) {
    // Hyper-Bun specific: market trend detection
    return this.detectHiddenMomentum(historicalData);
  }
}
```

### **Pattern 2: HTTP + Domain Logic Composition**
```typescript
// Bun-native HTTP handling wrapped in domain-specific context
class MarketProbeService {
  async probeDarkPoolMarket(bookmaker: string, marketId: string) {
    // Custom rate limiting
    await this.rateLimiter.waitForSlot(bookmaker);
    
    // Bun-native HTTP call
    const response = await fetch(
      `https://api.${bookmaker}.com/dark-pool/${marketId}`,
      {
        headers: this.authService.getHeaders(bookmaker),
        signal: AbortSignal.timeout(5000) // Bun-native timeout
      }
    );
    
    // Domain-specific response processing
    return this.parseDarkPoolResponse(await response.json());
  }
}
```

### **Pattern 3: Scheduled Operations with Bun Execution**
```typescript
// Production deployment leverages Bun's runtime
// In package.json scripts:
{
  "scripts": {
    "nightly-scan": "bun run src/scanners/covert-steam-nightly.ts",
    "real-time-monitor": "bun run src/monitors/market-propagation.ts"
  }
}

// Bun executes with optimized performance
$ bun run nightly-scan --output=compressed.zst
```

## **Critical Bun-Native Optimizations**

### **1. SQLite Performance**
```typescript
// Leveraging Bun's direct SQLite integration
const db = new Database('markets.db');

// WAL mode for concurrent reads/writes
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');

// Prepared statement reuse
const nodeQuery = db.query(
  'SELECT * FROM market_nodes WHERE eventId = ? AND timestamp > ?'
);
```

### **2. HTTP Connection Pooling**
```typescript
// Bun automatically pools HTTP connections
const controller = new AbortController();

// Concurrent market data fetching
const promises = bookmakers.map(async (bookmaker) => {
  return fetch(bookmaker.apiUrl, {
    signal: controller.signal,
    // Bun handles connection reuse
  });
});

// Timeout entire batch
setTimeout(() => controller.abort(), 10000);
```

### **3. Efficient Data Serialization**
```typescript
// Using Bun's optimized file operations
async function exportMarketGraph(graph) {
  const file = Bun.file('export.jsonl.zst');
  const writer = file.writer();
  
  // Stream compression
  const compressed = new CompressionStream('zstd');
  await writer.pipeTo(compressed.writable);
  
  // Efficient JSON serialization
  const encoder = new TextEncoder();
  for (const node of graph.nodes) {
    await compressed.writable.write(
      encoder.encode(JSON.stringify(node) + '\n')
    );
  }
}
```

## **API Security Boundaries**

### **Secure Credential Handling**
```typescript
class SecureAuthService {
  private encryptedCredentials: Uint8Array;
  
  async initialize() {
    // Bun-native crypto for secure storage
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(process.env.ENCRYPTION_KEY),
      'AES-GCM',
      false,
      ['encrypt', 'decrypt']
    );
    
    // Custom Hyper-Bun logic for credential rotation
    this.encryptedCredentials = await this.rotateCredentials(key);
  }
  
  // Domain-specific authentication logic
  async getAuthToken(bookmaker: string): Promise<string> {
    const credentials = await this.decryptCredentials();
    return this.generateJWT(credentials[bookmaker]);
  }
}
```

## **Monitoring and Observability**

### **Bun-Native Performance Tracking**
```typescript
class PerformanceMonitor {
  private timings = new Map<string, number[]>();
  
  async trackOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const start = performance.now(); // Bun-native high-res timer
    
    try {
      const result = await operation();
      const duration = performance.now() - start;
      
      // Custom Hyper-Bun analytics
      this.recordTiming(operationName, duration);
      this.checkForAnomalies(operationName, duration);
      
      return result;
    } catch (error) {
      // Bun-native error handling with domain context
      this.recordFailure(operationName, error);
      throw new MarketOperationError(operationName, error);
    }
  }
}
```

## **Deployment Configuration**

### **Bun Configuration (bunfig.toml)**
```toml
# Optimized for Hyper-Bun's workload
[build]
target = "bun"

[bun]
# SQLite optimization
sqlite = { extension = "full" }

# Memory limits for large market graphs
memoryLimit = "2G"

# HTTP timeouts aligned with bookmaker APIs
http.timeout = 30000
http.idleTimeout = 60000

# Production logging
logLevel = "warn"
```

## **Development Workflow Integration**

### **Testing Strategy**
```typescript
// Bun-native test runner with Hyper-Bun extensions
import { test, expect, mock } from 'bun:test';
import { MarketProbeService } from './hyper-bun/probe';

test('micro bet simulation', async () => {
  // Mock Bun-native fetch
  const mockFetch = mock(() => 
    Promise.resolve(new Response(JSON.stringify({ success: true })))
  );
  
  // Test Hyper-Bun domain logic
  const service = new MarketProbeService();
  const result = await service.simulateMicroBetAttempt(testNode);
  
  expect(result.rejection_reason).toBeNull();
});
```

## **Current API Endpoint Categories**

### **Core API Endpoints** (`/api/*`)

**Health & Status**:
- `GET /health` - System health check with Bun server metrics
- `GET /metrics` - Prometheus metrics (includes Bun server metrics)
- `GET /api/orca/stats` - ORCA normalizer statistics
- `GET /api/arbitrage/status` - Arbitrage scanner status
- `GET /api/arbitrage/crypto/stats` - Crypto matcher statistics

**Data Import & Streams**:
- `GET /api/streams` - List trade data streams
- `POST /api/streams/file` - Import trades from CSV/JSON file
- `POST /api/streams/api` - Import trades via exchange API
- `POST /api/sync` - Sync latest trades from exchanges

**Analytics**:
- `GET /api/trades` - Query trades with pagination and filters
- `GET /api/stats` - Trading statistics
- `GET /api/profile` - Trader profile analysis
- `GET /api/sessions` - Trading session analysis

**Prediction Markets**:
- `GET /api/polymarket/markets` - Polymarket markets
- `POST /api/polymarket/fetch` - Fetch Polymarket data
- `GET /api/kalshi/markets` - Kalshi markets
- `POST /api/kalshi/fetch` - Fetch Kalshi data
- `GET /api/prediction/stats` - Prediction market statistics

**ORCA Sports Betting**:
- `POST /api/orca/normalize` - Normalize sports betting data
- `POST /api/orca/normalize/batch` - Batch normalization
- `GET /api/orca/arbitrage/opportunities` - Query arbitrage opportunities
- `POST /api/orca/arbitrage/store` - Store arbitrage opportunity
- `GET /api/orca/arbitrage/book-pairs` - Book pair statistics

**Registry System** (`/api/registry/*`):
- `GET /api/registry/properties` - Property registry
- `GET /api/registry/data-sources` - Data source registry
- `GET /api/registry/sharp-books` - Sharp books registry
- `GET /api/registry/errors` - Error registry
- `GET /api/registry/mcp-tools` - MCP tools registry
- `GET /api/registry/cli-commands` - CLI commands registry
- `GET /api/registry/css-bundler` - CSS bundler registry
- `GET /api/registry/bun-apis` - Bun APIs registry
- `GET /api/registry/bookmaker-profiles` - Bookmaker profiles
- `GET /api/registry/security-threats` - Security threats registry
- `GET /api/registry/url-anomaly-patterns` - URL anomaly patterns
- `GET /api/registry/tension-patterns` - Tension patterns
- `GET /api/registry/team-departments` - Team departments
- `GET /api/registry/topics` - Topics registry
- `GET /api/registry/api-examples` - API examples registry
- `GET /api/registry/mini-app` - Mini app registry

**MCP Integration** (`/api/mcp/*`):
- `GET /api/mcp/secrets` - MCP secrets management status
- `GET /api/mcp/secrets/:server` - Get secrets for specific server
- `POST /api/mcp/secrets/:server/api-key` - Set API key for server

**UI Policy Management** (`/api/ui-policy/*`):
- `GET /api/ui-policy/metrics` - UI policy metrics
- `GET /api/policies/binary` - Binary policy manifest
- `GET /api/policies/digest` - Policy digest
- `POST /api/policies/sync` - Sync policies

**User Management** (`/api/users/*`):
- `POST /api/users/sign-in` - User sign-in
- `POST /api/users/sign-out` - User sign-out
- `GET /api/users/session` - Get current session
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user

**Research & Pattern Discovery** (`/research/*`):
- `GET /research/url-anomalies` - Discover URL anomaly patterns
- `GET /research/url-anomalies/:bookmaker` - Get bookmaker anomalies
- `GET /research/url-anomalies/:bookmaker/false-steam-rate` - Calculate false steam rate
- `GET /research/sitemap/:eventId` - Generate node sitemap

**Documentation**:
- `GET /docs` - OpenAPI documentation
- `GET /docs/errors` - Error registry
- `GET /docs/openapi.json` - OpenAPI specification

**Design System Integration** (`/public/*`):
- `GET /public/manifest.json` - Registry browser manifest (17.0.2.0.0.0.0)
- `GET /dashboard/manifest.json` - Dashboard manifest (17.0.1.0.0.0.0)

---

## **API Integration with Design System**

### **HTMLRewriter Integration** (`6.1.1.2.2.1.0`)

The API server uses `UIContextRewriter` to inject UI context into HTML responses:

```typescript
// Server-side HTML transformation
const rewriter = new HTMLRewriter()
  .on('head', {
    element(element) {
      // Inject design system metadata
      element.append(`<meta name="design-system-version" content="17.0.0.0.0.0.0">`, { html: true });
      element.append(`<meta name="terminal-integration" content="11.4.4.0.0.0.0">`, { html: true });
    }
  });
```

**Cross-Reference**: `docs/6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md`

---

## **API Integration with Terminal Environment**

### **Terminal Access Patterns** (`11.4.4.0.0.0.0`)

API endpoints are accessible from terminal environments:

```bash
# From tmux module sessions
curl http://localhost:3000/health
curl http://localhost:3000/api/streams
curl http://localhost:3000/api/registry/properties | jq
```

**Integration**: Terminal Environment (11.4.x) ↔ API Server (18.0.0.0.0.0.0)

**Cross-Reference**: `docs/11.0.0.0.0.0.0-TERMINAL-ENVIRONMENT.md`

---

## **Conclusion**

Hyper-Bun leverages Bun's native APIs for:
1. **Performance-critical operations** (HTTP, Database, File I/O)
2. **Runtime infrastructure** (process control, scheduling)
3. **Security primitives** (crypto, secure storage)

While implementing domain-specific logic for:
1. **Market intelligence algorithms**
2. **Trading pattern detection**
3. **Risk management strategies**
4. **Bookmaker-specific adaptations**

This clear separation ensures optimal performance through Bun's optimized runtime while maintaining the sophisticated market analysis capabilities that define Hyper-Bun's competitive advantage.

---

## **Related Documentation**

- `commands/VERSIONING.md` - CLI Commands versioning system
- `docs/17.0.0.0.0.0.0-DESIGN-SYSTEM.md` - Design System & Theming Subsystem
- `docs/11.0.0.0.0.0.0-TERMINAL-ENVIRONMENT.md` - Terminal Environment documentation
- `docs/10.0.0.0.0.0.0-AUTHENTICATION-SESSION-MANAGEMENT.md` - Authentication & Session Management
- `docs/HYPER-BUN-PHILOSOPHY-ARCHITECTURE.md` - Philosophy & Architecture
- `src/api/routes.ts` - API routes implementation
- `src/api/docs.ts` - OpenAPI documentation

---

**Version**: 18.0.0.0.0.0.0  
**Status**: ✅ Complete