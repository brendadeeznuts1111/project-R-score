# NEXUS Trading Dashboard - Data Sources

**Complete documentation of all data sources feeding into the dashboard.**

---

## 📊 Dashboard Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    NEXUS Trading Dashboard                   │
│                  (src/cli/dashboard.ts)                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP API Calls
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              API Server (src/api/routes.ts)                  │
│                  http://localhost:3000                       │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Storage    │   │   Providers  │   │   Analytics  │
│   (SQLite)   │   │  (Exchanges) │   │  (Calculated)│
└──────────────┘   └──────────────┘   └──────────────┘
```

---

## 🔌 API Endpoints (Dashboard Data Sources)

### 1. `/health` - System Health
**Source**: API server status  
**Data**:
```typescript
{
  status: "ok",
  timestamp: "2024-12-19T15:45:23.000Z"
}
```
**Storage**: None (real-time)  
**Update Frequency**: On-demand

---

### 2. `/streams` - Trade Data Streams
**Source**: SQLite database (`data/streams.db`)  
**Data**:
```typescript
{
  streams: [
    {
      id: "stream-uuid",
      name: "BTC/USDT",
      source: "api" | "file",
      symbol: "BTC/USDT",
      count: 12543,
      from: "2024-12-01T00:00:00Z",
      to: "2024-12-19T23:59:59Z"
    }
  ],
  total: 32263,
  dateRange: { from: "...", to: "..." }
}
```

**Data Sources**:
- **File Import**: CSV files (e.g., `bitmex_executions.csv`)
  - Endpoint: `POST /streams/file`
  - Storage: SQLite via `store.loadTradesFromFile()`
  
- **API Import**: Exchange APIs via CCXT
  - Endpoint: `POST /streams/api`
  - Exchanges: Binance, BitMEX, Deribit, etc.
  - Storage: SQLite via `CCXTProvider.fetchTrades()`

**Storage**: `src/data/store.ts` → SQLite WAL mode  
**Update Frequency**: On import, displayed from cache

---

### 3. `/arbitrage/status` - Arbitrage Scanner Status
**Source**: In-memory `ArbitrageScanner` instance  
**Data**:
```typescript
{
  running: boolean,
  scanCount?: number,
  opportunities?: number,
  arbitrageOpportunities?: number,
  lastScanTime?: number | null,
  alerts?: {
    running: boolean,
    port: number,
    clients: number
  }
}
```

**Data Sources**:
- **Prediction Markets**: Polymarket, Kalshi
  - Providers: `PolymarketProvider`, `KalshiProvider`
  - Endpoints: `/api/polymarket/markets`, `/api/kalshi/markets`
  
- **Crypto Exchanges**: Deribit, Binance
  - Providers: `DeribitProvider`, `CCXTProvider`
  - Endpoints: `/api/deribit/*`, `/api/ohlcv`
  
- **Sports Betting**: Betfair, PS3838 (via ORCA)
  - Provider: ORCA streaming server
  - Endpoint: `ws://localhost:3002` (WebSocket)

**Storage**: In-memory scanner state  
**Update Frequency**: Real-time (scanner polls every 5-30s)

---

### 4. `/arbitrage/executor/status` - Trade Executor Status
**Source**: In-memory `ArbitrageExecutor` instance  
**Data**:
```typescript
{
  initialized: boolean,
  dryRun?: boolean,
  stats?: {
    totalExecutions: number,
    successfulExecutions: number,
    failedExecutions: number,
    totalCapitalDeployed: number,
    totalExpectedProfit: number,
    avgExecutionTimeMs: number
  }
}
```

**Data Sources**:
- **Execution History**: In-memory executor state
- **Opportunity Data**: From arbitrage scanner
- **Venue APIs**: Polymarket, Kalshi, Deribit (for execution)

**Storage**: In-memory executor state  
**Update Frequency**: Real-time (on execution)

---

### 5. `/cache/stats` - Cache Statistics
**Source**: Redis cache (`src/cache/redis.ts`) or in-memory cache  
**Data**:
```typescript
{
  totalEntries: number,
  totalHits: number,
  avgHits: number,
  expiredEntries: number,
  sizeBytes: number,
  oldestEntry: number | null,
  newestEntry: number | null,
  compressedEntries: number,
  compressionRatio: number
}
```

**Data Sources**:
- **API Response Cache**: Cached API responses
- **Market Data Cache**: Cached exchange data
- **Analytics Cache**: Cached calculated metrics

**Storage**: Redis or in-memory Map  
**Update Frequency**: Real-time (on cache operations)

---

## 🌐 External Data Providers

### Crypto Exchanges (CCXT)
**Provider**: `src/providers/ccxt.ts`  
**Exchanges**: Binance, BitMEX, Deribit, Coinbase, etc.  
**Data Types**:
- Trade history
- OHLCV candles
- Order book
- Ticker data

**Endpoints**:
- `POST /streams/api` - Import trades
- `GET /ohlcv` - Fetch candles
- `GET /balance` - Account balance

---

### Prediction Markets

#### Polymarket
**Provider**: `src/providers/polymarket.ts`  
**Data Types**:
- Market listings
- Market prices (YES/NO)
- Market resolution

**Endpoints**:
- `GET /polymarket/markets`
- `POST /polymarket/fetch`

#### Kalshi
**Provider**: `src/providers/kalshi.ts`  
**Data Types**:
- Event markets
- Market prices
- Market resolution

**Endpoints**:
- `GET /kalshi/markets`
- `POST /kalshi/fetch`

---

### Options & Derivatives

#### Deribit
**Provider**: `src/providers/deribit.ts`  
**Data Types**:
- Options chain
- Greeks (delta, gamma, theta, vega)
- Implied volatility
- Option prices

**Endpoints**:
- `GET /deribit/instruments`
- `GET /deribit/options/:currency`
- `GET /deribit/greeks/:instrument`

---

### Sports Betting (ORCA)

#### Betfair
**Provider**: `src/orca/streaming/clients/betfair.ts`  
**Data Types**:
- Sports odds
- Market prices
- Event data

#### PS3838
**Provider**: `src/orca/streaming/clients/ps3838.ts`  
**Data Types**:
- Sports odds
- Spreads
- Totals

**Streaming**: WebSocket server (`ws://localhost:3002`)  
**Endpoints**:
- `POST /orca/stream/start`
- `GET /orca/stream/status`
- `GET /orca/storage/stats`

---

## 💾 Storage Backends

### SQLite (Trade Data)
**Location**: `data/streams.db`  
**Mode**: WAL (Write-Ahead Logging)  
**Data**:
- Trade history
- Stream metadata
- Date ranges

**Access**: `src/data/store.ts`

---

### Redis (Cache)
**Location**: Redis server (optional)  
**Data**:
- API response cache
- Market data cache
- Analytics cache

**Access**: `src/cache/redis.ts`

---

### In-Memory (Runtime State)
**Data**:
- Arbitrage scanner state
- Executor state
- Alert server state
- ORCA streaming state

**Access**: Global variables in `src/api/routes.ts`

---

## 📈 Calculated Data (Analytics)

### Trading Statistics
**Source**: `src/analytics/stats.ts`  
**Endpoints**: `/api/stats`, `/api/profile`  
**Calculations**:
- Win rate
- Average hold time
- Sharpe ratio
- P&L metrics

**Input**: Trade history from SQLite  
**Output**: Calculated metrics

---

### Market Making Analytics
**Source**: `src/analytics/marketmaking.ts`  
**Endpoints**: `/api/mm/stats`, `/api/mm/sessions`  
**Calculations**:
- Spread analysis
- Inventory metrics
- Risk metrics

**Input**: Trade history  
**Output**: Market making statistics

---

### Prediction Market Analytics
**Source**: `src/analytics/prediction.ts`  
**Endpoints**: `/api/prediction/stats`  
**Calculations**:
- Edge analysis
- Sizing recommendations
- Market statistics

**Input**: Prediction market data  
**Output**: Analytics metrics

---

## 🔄 Data Flow Summary

### Trade Streams Flow
```
CSV File / Exchange API
    ↓
POST /streams/file or /streams/api
    ↓
store.loadTradesFromFile() or CCXTProvider.fetchTrades()
    ↓
SQLite Database (data/streams.db)
    ↓
GET /streams
    ↓
Dashboard Display
```

### Arbitrage Detection Flow
```
Polymarket API / Kalshi API / Deribit API
    ↓
ArbitrageScanner.scan()
    ↓
Match events across venues
    ↓
Calculate opportunities
    ↓
GET /arbitrage/status
    ↓
Dashboard Display
```

### Execution Flow
```
Arbitrage Opportunity
    ↓
ArbitrageExecutor.execute()
    ↓
Venue APIs (Polymarket/Kalshi/Deribit)
    ↓
Execution result
    ↓
GET /arbitrage/executor/status
    ↓
Dashboard Display
```

---

## 🎯 Data Freshness

| Data Source | Update Frequency | Storage |
|-------------|------------------|---------|
| **Health** | On-demand | None (real-time) |
| **Streams** | On import | SQLite (persistent) |
| **Arbitrage Status** | 5-30s (scanner) | In-memory |
| **Executor Status** | On execution | In-memory |
| **Cache Stats** | Real-time | Redis/in-memory |
| **ORCA Odds** | 5s (polling) | In-memory + SQLite |

---

## 🔐 Authentication & Credentials

### Exchange Credentials
**Storage**: `data/credentials.json` (encrypted)  
**Access**: `store.loadCredentials()`  
**Required For**:
- API-based trade imports
- Live trading execution
- Account balance checks

### Public APIs (No Auth)
- Deribit (public endpoints)
- Polymarket (public markets)
- Kalshi (public markets)
- ORCA streaming (public)

---

## 📝 Data Import Methods

### 1. File Import
```bash
# Import CSV file
POST /streams/file
{
  "path": "bitmex_executions.csv",
  "name": "BitMEX Historical",
  "symbol": "BTC/USD"
}
```

### 2. API Import
```bash
# Import from exchange API
POST /streams/api
{
  "exchange": "binance",
  "symbol": "BTC/USDT",
  "since": "2024-12-01T00:00:00Z"
}
```

### 3. Real-Time Streaming
```bash
# Start ORCA streaming
POST /orca/stream/start
{
  "port": 3002,
  "pollInterval": 5000,
  "bookmakers": ["betfair", "ps3838"]
}
```

---

**Status**: Data sources documented  
**Version**: NEXUS Trading Dashboard  
**Coverage**: All 5 dashboard endpoints + external providers
