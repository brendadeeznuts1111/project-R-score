# Enterprise Dashboard

Real-time git repository monitoring dashboard with Bun server and React frontend.

## Features

- **Live Git Monitoring** - Scans `~/Projects` for git repositories
- **WebSocket Updates** - Real-time updates via WebSocket
- **Health Scoring** - Project health based on uncommitted changes and remote divergence
- **CLI Tables** - Terminal output using `Bun.inspect.table()`
- **Smart Alerts** - Notifications for conflicts, stale branches, health drops
- **API Key RBAC** - Role-based access control with granular permissions
- **PTY Terminal** - In-browser terminal sessions
- **R2/S3 Snapshots** - Backup state to Cloudflare R2

## Quick Start

```bash
bun install
bun run dev
```

Open http://localhost:8080

## Scripts

```bash
bun run dev          # Start with watch mode
bun run start        # Production server
bun run build        # Build React client
bun run test         # Run tests
bun run bench        # Run all benchmarks
bun run bench:json   # Run benchmarks with JSON output (CI/CD)
```

## API

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check with build info |
| `GET /api/dashboard` | Full dashboard data |
| `GET /api/projects` | Project list |
| `POST /api/rescan` | Trigger repository scan |
| `WS /dashboard` | Real-time WebSocket updates |

## Project Structure

```
src/
  server/
    index.ts          # Bun.serve() entry point
    router.ts         # URLPattern-based routing
    config.ts         # Environment configuration
    db.ts             # SQLite database
    git-scanner.ts    # Repository discovery
    auth/             # API key RBAC
    pty-*.ts          # Terminal handling
  client/
    Dashboard.tsx     # Main React app
    *Tab.tsx          # Tab components
  macros/
    build-info.ts     # Bundle-time macros
  types.ts            # Shared types
scripts/
  bench/              # Benchmarks
  hooks/              # Git hooks
docs/                 # Documentation (see docs/README.md)
  analysis/           # Code analysis reports
  benchmarks/        # Performance benchmarks
  cli/                # CLI documentation
  implementation/     # Implementation status
  kyc/                # KYC system docs
examples/             # Demo scripts
```

## Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:
- [CLI Tools](./docs/cli/CLI_TOOLS.md) - Command-line tool reference
- [Contributing](./docs/CONTRIBUTING.md) - Contribution guidelines
- [Migration Guide](./docs/MIGRATION_GUIDE.md) - Upgrade and migration docs
- [Code Analysis](./docs/analysis/) - Architecture and analysis reports
- [Benchmarks](./docs/benchmarks/) - Performance benchmarks

## Configuration

Environment variables:

```bash
PORT=8080                    # Server port
PROJECTS_DIR=~/Projects      # Scan directory
ADMIN_API_KEY=...            # Bootstrap admin key
S3_BUCKET=...                # R2/S3 bucket for snapshots
```

See `src/server/config.ts` for full options.

## License

MIT
