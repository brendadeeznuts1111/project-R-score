# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install          # Install dependencies
bun run dev          # Start API server (port 3000)
bun run test         # Run tests
bun run typecheck    # TypeScript type checking
bun run lint         # Run Biome linter
```

### CLI Tools

```bash
bun run dashboard    # Live trading dashboard (or `bun run dash`)
bun run fetch        # Trading data import CLI
bun run security     # Security testing CLI (pentest, headers, sri)
```

**Note**: Security Scanner runs automatically during `bun install` and `bun add` operations when configured in `bunfig.toml`.

## Architecture

**NEXUS Trading Intelligence Platform**: A Bun-native CLI/API application for cross-market arbitrage detection and trading analytics across crypto exchanges, prediction markets, and sports betting.

### Project Structure

```text
src/
├── api/routes.ts      # Hono REST API (3000+ lines)
├── cli/
│   ├── dashboard.ts   # Live trading dashboard
│   ├── fetch.ts       # Data import CLI
│   └── security.ts    # Security testing CLI
├── security/
│   ├── pentest.ts     # Web/API penetration tester
│   ├── headers.ts     # Security headers analyzer
│   ├── sri.ts         # Subresource Integrity automation
│   └── bun-scanner.ts # Bun 1.3 Security Scanner (CVE, malware detection)
├── secrets/           # Bun.secrets integration (Bun 1.3+)
│   ├── index.ts       # Core secrets API
│   └── mcp.ts         # MCP secrets management
├── middleware/
│   └── csrf.ts        # Bun.CSRF protection middleware (Bun 1.3+)
├── arbitrage/         # Cross-market arbitrage detection
├── providers/         # Exchange connectors (CCXT, Polymarket, Kalshi, Deribit)
├── orca/              # Sports betting normalizer (985 teams, 150 sports)
├── analytics/         # Trading statistics and profiling
├── utils/bun.ts       # Bun-native utilities
└── types/             # TypeScript type definitions
```

### Key API Endpoints

- `/health` - System health check
- `/streams` - Trade data streams management
- `/arbitrage/*` - Arbitrage scanner and executor
- `/deribit/*` - Options chain and Greeks
- `/orca/*` - Sports betting taxonomy
- `/cache/*` - Cache statistics
- `/api/miniapp/*` - Factory Wager Mini App monitoring
- `/api/mcp/secrets` - MCP secrets management status

### CLI Dashboard

```bash
bun run dashboard --help   # Show options
bun run dashboard --once   # One-shot render
bun run dashboard          # Live mode (q to quit, r to refresh)
```

Displays: system health, trade streams, arbitrage opportunities, executor status, cache stats.

### Data Flow

1. Import trades via `bun run fetch` or POST `/streams/file`
2. API provides analytics via `/stats`, `/profile` endpoints
3. Arbitrage scanner monitors opportunities across venues
4. Dashboard displays real-time system status

### Bun-Native Features

**Core APIs** (Bun 1.1+):
- `Bun.serve()` for HTTP/WebSocket
- `Bun.CryptoHasher` for hashing
- `Bun.nanoseconds()` for timing
- `Bun.file()` / `Bun.write()` for I/O
- `Bun.Glob` for file matching
- `Bun.inspect()` for debugging

**Bun 1.3+ Security APIs**:
- `Bun.secrets` - OS-native encrypted credential storage (macOS Keychain, Linux libsecret, Windows Credential Manager)
- `Bun.CSRF` - CSRF token generation and verification
- `Bun.Security.Scanner` - Custom security scanner API for package vulnerability detection
- `Bun.semver.satisfies()` - Semantic version matching for vulnerability range checking

**Performance & Observability**:
- `Bun.nanoseconds()` - High-resolution timing for performance monitoring (nanosecond precision)
- `PerformanceMonitor` - Operation tracking with statistical anomaly detection

## Data Files

Place in project root:
- `bitmex_executions.csv` - Main trade data
- `data/` - Persistent storage (streams, credentials)
