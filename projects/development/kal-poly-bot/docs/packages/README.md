# Polymarket-Kalshi Arbitrage Bot

A arbitrage system for cross-platform prediction market trading between Kalshi and Polymarket.

## Quick Start

### 1. Install Dependencies

```bash
# Rust 1.75+
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Build
cd poly-kalshi-arb
cargo build --release
```

### 2. Set Up Credentials

Create a `.env` file:

```bash
# === KALSHI CREDENTIALS ===
KALSHI_API_KEY_ID=your_kalshi_api_key_id
KALSHI_PRIVATE_KEY_PATH=/path/to/kalshi_private_key.pem

# === POLYMARKET CREDENTIALS ===
POLY_PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY
POLY_FUNDER=0xYOUR_WALLET_ADDRESS

# === BOT CONFIGURATION ===
DRY_RUN=1
RUST_LOG=info
```

### 3. Run

```bash
# Dry run (paper trading)
dotenvx run -- cargo run --release

# Live execution
DRY_RUN=0 dotenvx run -- cargo run --release
```

---

## Environment Variables

### Required

| Variable                  | Description                                                 |
| ------------------------- | ----------------------------------------------------------- |
| `KALSHI_API_KEY_ID`       | Your Kalshi API key ID                                      |
| `KALSHI_PRIVATE_KEY_PATH` | Path to RSA private key (PEM format) for Kalshi API signing |
| `POLY_PRIVATE_KEY`        | Ethereum private key (with 0x prefix) for Polymarket wallet |
| `POLY_FUNDER`             | Your Polymarket wallet address (with 0x prefix)             |

### Bot Configuration

| Variable          | Default | Description                                           |
| ----------------- | ------- | ----------------------------------------------------- |
| `DRY_RUN`         | `1`     | `1` = paper trading (no orders), `0` = live execution |
| `RUST_LOG`        | `info`  | Log level: `error`, `warn`, `info`, `debug`, `trace`  |
| `FORCE_DISCOVERY` | `0`     | `1` = re-fetch market mappings (ignore cache)         |
| `PRICE_LOGGING`   | `0`     | `1` = verbose price update logging                    |

### Test Mode

| Variable        | Default              | Description                                                                                    |
| --------------- | -------------------- | ---------------------------------------------------------------------------------------------- |
| `TEST_ARB`      | `0`                  | `1` = inject synthetic arb opportunity for testing                                             |
| `TEST_ARB_TYPE` | `poly_yes_kalshi_no` | Arb type: `poly_yes_kalshi_no`, `kalshi_yes_poly_no`, `poly_same_market`, `kalshi_same_market` |

### Circuit Breaker

| Variable                     | Default | Description                                 |
| ---------------------------- | ------- | ------------------------------------------- |
| `CB_ENABLED`                 | `true`  | Enable/disable circuit breaker              |
| `CB_MAX_POSITION_PER_MARKET` | `100`   | Max contracts per market                    |
| `CB_MAX_TOTAL_POSITION`      | `500`   | Max total contracts across all markets      |
| `CB_MAX_DAILY_LOSS`          | `5000`  | Max daily loss in cents before halt         |
| `CB_MAX_CONSECUTIVE_ERRORS`  | `5`     | Consecutive errors before halt              |
| `CB_COOLDOWN_SECS`           | `60`    | Cooldown period after circuit breaker trips |

---

## Obtaining Credentials

### Kalshi

1. Log in to [Kalshi](https://kalshi.com)
2. Go to **Settings → API Keys**
3. Create a new API key with trading permissions
4. Download the private key (PEM file)
5. Note the API Key ID

### Polymarket

1. Create or import an Ethereum wallet (MetaMask, etc.)
2. Export the private key (include `0x` prefix)
3. Fund your wallet on Polygon network with USDC
4. The wallet address is your `POLY_FUNDER`

---

## Usage Examples

### Paper Trading (Development)

```bash
# Full logging, dry run
RUST_LOG=debug DRY_RUN=1 dotenvx run -- cargo run --release
```

### Test Arbitrage Execution

```bash
# Inject synthetic arb to test execution path
TEST_ARB=1 DRY_RUN=0 dotenvx run -- cargo run --release
```

### Production

```bash
# Live trading with circuit breaker
DRY_RUN=0 CB_MAX_DAILY_LOSS=10000 dotenvx run -- cargo run --release
```

### Force Market Re-Discovery

```bash
# Clear cache and re-fetch all market mappings
FORCE_DISCOVERY=1 dotenvx run -- cargo run --release
```

---

## CLI Usage

The arbitrage bot supports several CLI options for different operational modes. All commands should be prefixed with environment variable configuration.

### `cargo run --release`

Run the arbitrage bot with live market data and execution capabilities.

```bash
# Basic usage with dotenvx for environment management
dotenvx run -- cargo run --release

# With specific configuration
DRY_RUN=1 RUST_LOG=debug dotenvx run -- cargo run --release

# Production mode with circuit breaker settings
DRY_RUN=0 CB_MAX_DAILY_LOSS=10000 RUST_LOG=warn dotenvx run -- cargo run --release
```

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `DRY_RUN` | `1` | Set to `0` for live trading execution |
| `RUST_LOG` | `info` | Set to `debug`, `warn`, `error`, etc. for verbose output |
| `FORCE_DISCOVERY` | `0` | Set to `1` to refresh market cache on startup |
| `PRICE_LOGGING` | `0` | Set to `1` for detailed price update logging |
| `TEST_ARB` | `0` | Set to `1` to inject synthetic arbitrage opportunities |

**Examples:**

```bash
# Paper trading (default mode)
dotenvx run -- cargo run --release

# Live trading
DRY_RUN=0 dotenvx run -- cargo run --release

# Development with full logging
RUST_LOG=debug DRY_RUN=1 PRICE_LOGGING=1 dotenvx run -- cargo run --release

# Production with conservative risk limits
DRY_RUN=0 CB_MAX_DAILY_LOSS=5000 CB_MAX_TOTAL_POSITION=250 RUST_LOG=warn dotenvx run -- cargo run --release

# Force market discovery
FORCE_DISCOVERY=1 dotenvx run -- cargo run --release
```

### `cargo test`

Run the test suite to validate functionality.

```bash
# Run all tests
cargo test

# Run with output capturing disabled for debugging
cargo test -- --nocapture

# Run specific test module
cargo test circuit_breaker

# Run benchmarks
cargo bench
```

### `cargo build --release`

Compile the project for production deployment.

```bash
# Build optimized binary
cargo build --release

# Build with profiling features enabled
cargo build --release --features profiling

# Build in development mode (slower but with debug symbols)
cargo build
```

**Feature flags:**

| Feature | Description |
|---------|-------------|
| `profiling` | Enable CPU profiling instrumentation |
| - | Default build excludes profiling for performance |

---

## How It Works

### Arbitrage Mechanics

In prediction markets, YES + NO = $1.00 guaranteed.

**Arbitrage exists when:**

```text
Best YES ask (platform A) + Best NO ask (platform B) < $1.00
```

**Example:**

```text
Kalshi YES ask:  42¢
Poly NO ask:     56¢
Total cost:      98¢
Guaranteed:     100¢
Profit:           2¢ per contract
```

### Four Arbitrage Types

| Type                 | Buy                 | Sell          |
| -------------------- | ------------------- | ------------- |
| `poly_yes_kalshi_no` | Polymarket YES      | Kalshi NO     |
| `kalshi_yes_poly_no` | Kalshi YES          | Polymarket NO |
| `poly_same_market`   | Polymarket YES + NO | (rare)        |
| `kalshi_same_market` | Kalshi YES + NO     | (rare)        |

### Fee Handling

- **Kalshi**: `ceil(0.07 × contracts × price × (1-price))` - factored into arb detection
- **Polymarket**: Zero trading fees

---

## Architecture

```text
src/
├── main.rs              # Entry point, WebSocket orchestration
├── types.rs             # MarketArbState
├── execution.rs         # Concurrent leg execution, in-flight deduplication
├── position_tracker.rs  # Channel-based fill recording, P&L tracking
├── circuit_breaker.rs   # Risk limits, error tracking, auto-halt
├── discovery.rs         # Kalshi↔Polymarket market matching
├── cache.rs             # Team code mappings (EPL, NBA, etc.)
├── kalshi.rs            # Kalshi REST/WS client
├── polymarket.rs        # Polymarket WS client
├── polymarket_clob.rs   # Polymarket CLOB order execution
└── config.rs            # League configs, thresholds
```

---

## Development

### Run Tests

```bash
cargo test
```

### Enable Profiling

```bash
cargo build --release --features profiling
```

### Benchmarks

```bash
cargo bench
```

---

## Enterprise Operations with Surgical Precision Platform

For **production-grade arbitrage operations**, integrate with the Surgical Precision Platform - an enterprise microservices infrastructure delivering **28.5% performance improvement** through Bun-native implementations.

### 🚀 Platform Integration
https://bun.com/docs/pm/cli/install#global-packages
```bash
# Install Surgical Precision Platform
bun install -g @surgical-precision/platform

# Deploy enterprise-grade observation for arbitrage bot
surgical-precision deploy

# Use bunx for MCP CLI integration (no installation required)
bunx @surgical-precision/platform deploy

# Run MCP CLI commands without global installation
bunx @surgical-precision/platform status
bunx @surgical-precision/platform health

# Start TMUX development environment with bot monitoring
surgical-precision tmux --environment prod --team trading
```

### 🏗️ Enterprise Architecture Integration

| **Component** | **Bot Integration Benefit** | **Memorandum Compliant** |
|---------------|----------------------------|--------------------------|
| **Service Mesh (Istio)** | Intelligent traffic routing, circuit breaker enhancement | ✅ 100% Bun-native |
| **Observability Stack** | Real-time arbitrage metrics, ELK stack for trade analysis | ✅ ELK + Prometheus + Grafana |
| **Disaster Recovery** | Automatic failover, position recovery within 30min RTO | ✅ Multi-region active-active |
| **Component Coordination** | Bot orchestration with SQLite state management | ✅ Zero external dependencies |
| **Hot Reload** | Zero-downtime strategy updates in production | ✅ <30ms operation windows |

### 📊 Production Monitoring Dashboard

The Surgical Precision Platform provides enterprise-grade monitoring for arbitrage operations:

- **Real-time P&L Tracking**: Integrated with platform observability stack
- **Circuit Breaker Enhancement**: Multi-layer risk management
- **Trade Execution Analytics**: ELK stack for comprehensive trade analysis
- **Health Monitoring**: Component-level health checks and alerting
- **Performance Metrics**: Sub-30ms operation validation

### 🛡️ Risk Management Enhancement

```text
Default Circuit Breaker + Surgical Precision Platform =
┌─────────────────────────────────────────────────┐
│ Circuit Breaker (Local)                    ✅ │
│ ├─ Position Limits                              │
│ ├─ Daily Loss Limits                           │
│ └─ Error Rate Monitoring                       │
├─────────────────────────────────────────────────┤
│ Surgical Precision Platform (Enterprise)   🚀 │
├─ Multi-region Disaster Recovery (30min RTO)    │
├─ Service Mesh Traffic Shaping                 │
├─ ELK Stack Anomaly Detection                  │
├─ Prometheus Predictive Alerting               │
├─ Grafana Visual Risk Dashboard                │
└─ TMUX Real-time Health Monitoring            │
└─────────────────────────────────────────────────┘
```

### 🔄 Development Workflow Integration

```bash
# Start integrated development environment
surgical-precision tmux --environment dev

# TMUX windows automatically created:
# - precision-core: Bot development console
# - arbitrage-monitor: Real-time trade monitoring
# - pnl-dashboard: Position and profit tracking
# - alert-stream: Circuit breaker status
```

### ⚡ Performance Optimization

The Surgical Precision Platform delivers **28.5% performance improvement** through:

- **Bun-native APIs**: Zero external runtime dependencies
- **SQLite State Management**: Built-in database coordination
- **Concurrent Processing**: Optimized execution pipelines
- **Memory Efficient**: <150MB footprint optimization

### 🎯 Production Deployment

```bash
# Deploy bot with enterprise observability
surgical-precision deploy

# Health check validation
surgical-precision health

# Production status monitoring
surgical-precision status
```

### 🔗 API Integration Example

```typescript
import {
  SurgicalPrecisionPlatformIntegrationEngine,
  ComponentCoordinator
} from '@surgical-precision/platform';

// Initialize enterprise coordination
const coordinator = new ComponentCoordinator();
const platform = new SurgicalPrecisionPlatformIntegrationEngine();

// Register arbitrage bot with enterprise health monitoring
coordinator.registerComponent('arbitrage-bot', {
  componentName: 'arbitrage-bot',
  status: 'RUNNING',
  version: '1.0.0-prod',
  healthMetrics: {
    responseTime: 15,
    errorRate: 0,
    resourceUsage: { cpu: 25, memory: 150 }
  }
});

// Monitor bot health through enterprise platform
const health = coordinator.checkSystemHealth();
```

---

## Project Status

- [x] Kalshi REST/WebSocket client
- [x] Polymarket REST/WebSocket client
- [x] Lock-free orderbook cache
- [x] SIMD arb detection
- [x] Concurrent order execution
- [x] Position & P&L tracking
- [x] Circuit breaker
- [x] Market discovery & caching
- [ ] Risk limit configuration UI
- [ ] Multi-account support
- [ ] Enterprise Surgical Precision Platform integration

# poly-kalshi-arb
