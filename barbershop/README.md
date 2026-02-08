# Barbershop

A Bun-native barbershop demo with real-time dashboard, WebSocket, and R2 integration.

## Quick Start

```bash
bun run start           # Start demo
bun run dev             # Start with hot reload
bun run start:server    # API server with WebSocket
bun run start:dashboard # Dashboard only
bun run test            # Run tests
```

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `HOST` | Bind host | `0.0.0.0` |
| `PORT` | Bind port | `3000` |
| `PUBLIC_BASE_URL` | External URL | `http://localhost:3000` |
| `LIFECYCLE_KEY` | Key for `/ops/lifecycle` | `godmode123` |

R2 configuration via `Bun.secrets` (macOS Keychain):

```bash
bun run setup:r2  # One-time setup
```

## Project Structure

```
barbershop/
├── src/
│   ├── core/        # Main business logic
│   │   ├── barber-server.ts         # API server
│   │   ├── barbershop-dashboard.ts  # 3-view dashboard
│   │   ├── barbershop-tickets.ts    # Ticketing flow
│   │   ├── metrics.ts               # Prometheus metrics
│   │   ├── realtime-dashboard.ts    # WebSocket hub
│   │   ├── fusion-runtime.ts        # Predictive analytics
│   │   ├── edge-router.ts           # Geo routing
│   │   ├── streams.ts               # WebSocket streaming
│   │   ├── wasm-engine.ts           # WASM compute
│   │   └── ui.ts                    # UI components
│   ├── utils/       # Utilities
│   │   ├── security.ts              # Password/token management
│   │   ├── circuit-breaker.ts       # Resilience pattern
│   │   ├── rate-limiter.ts          # Rate limiting
│   │   ├── structured-logger.ts     # Async logging
│   │   ├── config-loader.ts         # Type-safe config
│   │   ├── feature-flags.ts         # A/B testing
│   │   ├── scheduler.ts             # Cron jobs
│   │   └── graphql.ts               # GraphQL schema
│   ├── secrets/     # Secrets management
│   ├── r2/          # R2/cloud storage
│   └── profile/     # Profile management
├── lib/
│   ├── cookie-security.ts  # Cookie handling
│   ├── table-engine.ts     # WASM tables
│   └── cloudflare/         # CF API clients
├── tests/
│   ├── unit/        # Unit tests
│   └── integration/ # Integration tests
├── demo/            # Demo frontend
├── docs/            # Documentation
└── config/          # Configuration files
```

## Demo Flows

1. Admin dashboard: `http://localhost:3000/admin`
2. Client portal: `http://localhost:3000/client`
3. Barber station: `http://localhost:3000/barber`
4. Create ticket from client → assignment in barber station
5. Complete ticket → updates in admin

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /docs` | Docs index |
| `GET /ops/runtime` | Runtime metrics |
| `GET /ops/r2-status` | R2 mirror status |
| `GET /ops/fetch-check?url=...` | Fetch diagnostics |
| `GET /barber/stats?barberId=...` | Barber stats |

## Bun APIs Used

| API | Use |
|-----|-----|
| `Bun.hash()` | Fast non-crypto hashing (25x faster) |
| `Bun.password` | Argon2id password hashing |
| `Bun.gzip()` | Native compression |
| `Bun.nanoseconds()` | High-res timing |
| `Bun.write()` | Fast file I/O |
| `Bun.serve()` | HTTP/WebSocket server |

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/OPERATIONS.md`](docs/OPERATIONS.md) | Operations guide |
| [`docs/THEMES.md`](docs/THEMES.md) | Theme system |
| [`docs/OPTIMIZATION.md`](docs/OPTIMIZATION.md) | Performance |
| [`AGENTS.md`](AGENTS.md) | AI agent context |

## Development

```bash
bun run lint      # Lint code
bun run fmt       # Format code
bun run typecheck # Type check
bun run build:prod # Production build