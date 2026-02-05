# Cross-Reference Guide

## Project Structure Map

### Core Arbitrage Logic

| File | Key Functions | Purpose |
|---|---|---|
| [src/types.rs](src/types.rs#L155) | `check_arbs()` | Arbitrage detection engine (SIMD vectorized) |
| [src/types.rs](src/types.rs#L101) | `update_yes/no()` | Atomic orderbook updates |
| [src/types.rs](src/types.rs#L468) | `test_*` (15+ tests) | Arb detection test suite |
| [src/execution.rs](src/execution.rs) | `execute_arb()` | Trade placement logic |
| [src/circuit_breaker.rs](src/circuit_breaker.rs) | `check_limits()` | Risk management |

### Market Discovery & Mapping

| File | Key Functions | Purpose |
|---|---|---|
| [src/discovery.rs](src/discovery.rs#L655) | `discover_markets()` | Market pair discovery |
| [src/discovery.rs](src/discovery.rs#L658) | `parse_kalshi_ticker()` | Ticker parsing |
| [src/cache.rs](src/cache.rs#L49) | `load()/save()` | Cache management |
| [src/cache.rs](src/cache.rs#L142) | `test_cache_lookup` | Cache tests |

### Position & P&L Tracking

| File | Key Functions | Purpose |
|---|---|---|
| [src/position_tracker.rs](src/position_tracker.rs#L499) | `update_position()` | Track active trades |
| [src/position_tracker.rs](src/position_tracker.rs#L512) | `calculate_pnl()` | Profit/loss calculation |
| [src/position_tracker.rs](src/position_tracker.rs#L532) | `resolve_position()` | Settlement logic |

### WebSocket & API

| File | Key Functions | Purpose |
|---|---|---|
| [src/main.rs](src/main.rs#L83) | `poly_async.load_cache()` | Polymarket cache loading |
| [src/main.rs](src/main.rs#L92) | `TeamCache::load()` | Kalshi team mapping |
| [src/main.rs](src/main.rs#L150) | WebSocket orchestration | Live market feeds |

### Bun Integration

| File | Key Functions | Purpose |
|---|---|---|
| [bot-controller.ts](bot-controller.ts#L20) | `BotController.start()` | Start Rust bot via spawn |
| [bot-controller.ts](bot-controller.ts#L72) | REST API server | Control endpoints |
| [bot-monitor.ts](bot-monitor.ts#L15) | `startMonitoring()` | Live metrics dashboard |
| [BUN_INTEGRATION.md](BUN_INTEGRATION.md) | Setup guide | Bun documentation |

---

## Configuration & Setup

| File | Purpose | Key Variables |
|---|---|---|
| [.env](/.env) | Environment secrets | `KALSHI_API_KEY_ID`, `POLY_PRIVATE_KEY`, `DRY_RUN` |
| [Cargo.toml](Cargo.toml) | Rust dependencies | 358 crates, release profile |
| [.vscode/settings.json](.vscode/settings.json) | IDE configuration | Rust-analyzer, formatter |
| [.vscode/launch.json](.vscode/launch.json) | Debug configs | 4 launch profiles |

---

## Testing & Benchmarking

| File | Tests | Purpose |
|---|---|---|
| [src/types.rs](src/types.rs#L459) | 25 unit tests | Fee calc, arb detection, ordering |
| [src/position_tracker.rs](src/position_tracker.rs#L496) | 4 unit tests | Position tracking |
| [src/discovery.rs](src/discovery.rs#L655) | 2 unit tests | Ticker/date parsing |
| [benches/arbitrage_detection.rs](benches/arbitrage_detection.rs) | 3 benchmarks | Performance metrics |

**Run tests:**
```bash
cargo test --lib                    # 42 unit tests
cargo bench --bench arbitrage_detection  # Performance benchmarks
```

---

## Key Algorithms

### Arbitrage Detection (Line 155-220 of types.rs)

```rust
pub fn check_arbs(&self, threshold_cents: PriceCents) -> u8 {
    // SIMD vectorized check for 4 arb patterns:
    // 1. Poly YES + Kalshi NO
    // 2. Kalshi YES + Poly NO  
    // 3. Both same-side profitable
    // 4. Cross-exchange profit
}
```

**Performance:** 645 picoseconds per check (sub-nanosecond!)

### Fee Calculation (Line 1000+ of types.rs)

```rust
KALSHI_FEE_TABLE[price as usize]  // Lookup table (0-7% fees)
// vs
Polymarket: 0% taker fee (free!)
```

### Position Tracking (position_tracker.rs:50+)

```rust
pub struct ArbPosition {
    poly_contracts: i32,      // YES/NO count
    kalshi_contracts: i32,
    entry_price: f64,
    current_pnl: i64,        // in cents
}
```

---

## Environment Variables

| Variable | Type | Example | Required |
|---|---|---|---|
| `KALSHI_API_KEY_ID` | UUID | `92c18e54-...` | ✅ Yes |
| `KALSHI_PRIVATE_KEY_PATH` | Path | `/Users/.kalshi/key.pem` | ✅ Yes |
| `POLY_PRIVATE_KEY` | Hex | `0x28b9df8...` | ✅ Yes |
| `POLY_FUNDER` | Address | `0x71cF45B6...` | ✅ Yes |
| `DRY_RUN` | Bool | `1` or `0` | Default: `1` |
| `RUST_LOG` | Level | `info`, `debug` | Default: `info` |
| `FORCE_DISCOVERY` | Bool | `1` | Default: `0` |
| `CB_ENABLED` | Bool | `true` | Default: `true` |
| `CB_MAX_DAILY_LOSS` | Cents | `5000` ($50) | Default: `5000` |

---

## API Endpoints (Bun)

| Method | Path | Response | Notes |
|---|---|---|---|
| `GET` | `/` | HTML | Web dashboard |
| `GET` | `/api/status` | JSON | Bot status + PID |
| `POST` | `/api/start` | JSON | Start bot |
| `POST` | `/api/stop` | JSON | Stop bot |
| `POST` | `/api/restart` | JSON | Restart bot |

**Example:**
```bash
curl http://localhost:3000/api/status
# {"running": true, "pid": 12345, "uptime": 120, "memory": 45.2}
```

---

## Performance Profiles

| Operation | Time | File | Benchmark |
|---|---|---|---|
| Arb Detection | 645 ps | types.rs:155 | check_arbs_detection |
| Orderbook Update | 401 ns | types.rs:101 | orderbook_yes_updates |
| Concurrent Load | 710 ps | types.rs:120 | orderbook_concurrent_load |
| REST API | <10 ms | bot-controller.ts | Real-world |
| Market Discovery | ~2-5s | discovery.rs | On startup |

---

## Git History

| Commit | Message | Changes |
|---|---|---|
| Latest | Add Bun integration | 4 files, process control + monitoring |
| Previous | Add performance benchmarks | benches/, Cargo.toml |
| Initial setup | Setup: VS Code config, scripts | .vscode/, SETUP.md, run.sh |

View: `git log --oneline`

---

## Module Dependencies

```
main.rs
├── cache.rs (TeamCache, market mapping)
├── discovery.rs (Market discovery)
├── types.rs (Core arbitrage logic, SIMD)
├── execution.rs (Order placement)
├── circuit_breaker.rs (Risk management)
├── position_tracker.rs (P&L tracking)
└── async/WebSocket orchestration

(Bun files - standalone)
├── bot-controller.ts (REST API)
└── bot-monitor.ts (Live dashboard)
```

---

## Quick Links

**Documentation:**
- [README.md](README.md) - Project overview
- [SETUP.md](SETUP.md) - Installation guide
- [START.sh](START.sh) - Quick start
- [BUN_INTEGRATION.md](BUN_INTEGRATION.md) - Bun setup

**Key Files:**
- [src/types.rs](src/types.rs) - **All arbitrage logic**
- [src/main.rs](src/main.rs) - **Bot orchestration**
- [Cargo.toml](Cargo.toml) - **Dependencies**
- [.env](/.env) - **Configuration**

**Running:**
```bash
./run.sh              # Start bot (paper trading by default)
bun bot-controller.ts # Start control panel
bun bot-monitor.ts    # Start live dashboard
cargo test --lib      # Run tests
cargo bench           # Run benchmarks
```
