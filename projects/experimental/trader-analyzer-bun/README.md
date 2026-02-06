# NEXUS

**Unified Trading Intelligence Platform**

Cross-market arbitrage detection connecting crypto exchanges, prediction markets, and sports betting with deterministic identity resolution across 100+ venues.

## [features]

- **ORCA Identity Layer** - UUIDv5-based canonical IDs for events across all venues
- **Cross-Market Arbitrage** - Detect price discrepancies between Polymarket, Kalshi, Deribit, and sports books
- **Real-Time Streaming** - WebSocket feeds for live price updates
- **Trader Profiling** - Behavioral analytics and performance tracking
- **100+ Exchange Support** - Via CCXT integration
- **Interactive Showcase** - Browser UI for API exploration at `/showcase`
- **Bun 1.3 Security** - Runtime flags for `eval()` blocking and system CA
- **Redis Hybrid Cache** - SQLite + Bun.Redis with automatic failover
- **Secrets Management** - `Bun.secrets` integration with migration tooling

## [quickstart]

```bash
# Install dependencies
bun install

# Start development server (with HMR)
bun run dev

# Run production (with security flags)
bun run start

# Run maximum security mode
bun run start:secure

# Run tests
bun test

# Type check
bun run typecheck
```

## [api.endpoints]

| Endpoint | Description |
|----------|-------------|
| `GET /showcase` | Interactive API explorer UI |
| `GET /api/health` | Health check |
| `GET /api/orca/stats` | ORCA normalizer statistics |
| `GET /api/orca/normalize` | Normalize event data |
| `GET /api/arbitrage/status` | Arbitrage scanner status |
| `GET /api/arbitrage/crypto/stats` | Crypto matcher statistics |
| `GET /api/deribit/index/:asset` | Deribit index price |
| `GET /api/deribit/expirations/:asset` | Options expirations |
| `GET /api/cache/stats` | Cache statistics |
| `GET /api/debug/memory` | Memory diagnostics |
| `GET /api/debug/runtime` | Runtime info |
| `GET /docs` | OpenAPI documentation |
| `GET /docs/errors` | Error registry |

## [architecture]

```text
src/
├── analytics/      # Trading analytics & profiling
├── api/            # Hono route handlers
│   ├── routes.ts   # Main API router
│   ├── docs.ts     # OpenAPI documentation
│   └── showcase.ts # Interactive UI
├── arbitrage/      # Cross-market arbitrage detection
├── cache/          # SQLite + Redis hybrid caching
├── errors/         # Error registry (NX-xxx codes)
├── middleware/     # CSRF, auth, logging
├── orca/           # ORCA identity normalization (UUIDv5)
├── providers/      # Exchange & venue integrations
├── secrets/        # Bun.secrets management
├── types/          # TypeScript definitions
└── utils/          # Bun-native utilities
```

## [stack]

- **Runtime**: [Bun](https://bun.sh) >= 1.3.0
- **Framework**: [Hono](https://hono.dev) - Fast web framework
- **Exchanges**: [CCXT](https://ccxt.com) - 100+ crypto exchanges
- **Database**: `bun:sqlite` - Native SQLite binding
- **Cache**: `Bun.Redis` - Native Redis client (optional)
- **Language**: TypeScript (strict mode)

## [config]

Environment variables:

```bash
PORT=3001              # Server port
NODE_ENV=development   # Environment
REDIS_URL=redis://...  # Redis connection (optional)
```

## [security]

Bun 1.3+ runtime security flags:

| Flag | Description |
|------|-------------|
| `--disable-eval` | Block `eval()` and `new Function()` |
| `--disable-wasm` | Block WebAssembly execution |
| `--use-system-ca` | Use system CA certificates |

```bash
# Production (recommended)
bun --disable-eval --use-system-ca run src/index.ts

# Maximum security
bun --disable-eval --disable-wasm --use-system-ca run src/index.ts
```

## [performance]

| Metric | Target |
|--------|--------|
| Latency | p95 < 150ms |
| Throughput | 1000 rps |
| Cache hit ratio | > 80% |
| Memory usage | < 512MB |
| Startup time | < 5s |
| Query response | < 3ms |

See `nexus.toml` for full performance configuration and alerting thresholds.

## [development]

```bash
# Run benchmarks
bun run bench

# Lint code
bun run lint

# Fetch market data
bun run fetch
```

## [license]

MIT
