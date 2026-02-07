# AGENTS.md - Barbershop Demo Project

This file provides essential context for AI coding agents working on the Barbershop Demo project.

## Project Overview

**Barbershop Demo** is a Bun-based TypeScript demonstration project showcasing a multi-view dashboard system for a barbershop business. It includes:

- **3-View Dashboard System**: Admin (God View), Client (Customer), and Barber (Worker) portals
- **Ticketing System**: Service assignment and completion flow
- **API Server**: REST API with WebSocket support, telemetry, and R2 cloud storage integration
- **Theme System**: FactoryWager-branded UI with 4 themes (factorywager, light, dark, professional)
- **Secrets Management**: Namespace-aware secret lifecycle with Bun.secrets integration
- **Cloudflare Integration**: Domain management, DNS, SSL, caching, and analytics via CLI tools

### Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Bun >=1.3.6 |
| Language | TypeScript (ES2022, ESNext modules) |
| Database | SQLite (via `bun:sqlite`) |
| Cache | Redis (via `bun:redis`) |
| Storage | Cloudflare R2 (S3-compatible) |
| Frontend | Vanilla HTML/JS with Bun-bundled assets |
| Config | TOML (loaded via Bun's native TOML loader) |

## Project Structure

```
barbershop/
├── src/
│   ├── core/              # Main business logic
│   │   ├── barber-server.ts         # API server (HTTP + WebSocket)
│   │   ├── barbershop-dashboard.ts  # 3-view dashboard server
│   │   ├── barbershop-tickets.ts    # Ticketing demo
│   │   ├── ui-v2.ts                 # React-style UI components
│   │   ├── barber-fusion-*.ts       # Fusion runtime, schema, types
│   │   └── barber-fusion-runtime.ts # +OpenClaw Context integration
│   ├── dashboard/         # Dashboard System v2
│   │   ├── index.ts                 # Unified exports
│   │   ├── builder.ts               # Dashboard builder API
│   │   ├── types.ts                 # Type definitions
│   │   ├── sync.ts                  # Real-time sync engine
│   │   └── composables/useDashboard.ts
│   ├── profile/           # Profile management
│   │   ├── index.ts
│   │   ├── sampling-profile.ts
│   │   └── core/profile-engine.ts
│   ├── secrets/           # Secrets management
│   │   ├── factory-secrets.ts       # FactoryWager secrets
│   │   └── setup-secrets.ts
│   ├── r2/                # R2/cloud storage
│   ├── build/             # Build system (metadata, virtual files)
│   ├── utils/             # Utilities
│   │   ├── bun-enhanced.ts          # Bun-native API wrappers
│   │   ├── fetch-utils.ts
│   │   ├── cookie-manager.ts
│   │   ├── cli-table.ts             # Unicode-aware table formatting
│   │   └── wasm-table.ts            # WebAssembly.Table compute hooks
│   ├── config/            # Configuration
│   └── debug/             # Debug/diagnostics
├── openclaw/              # Matrix profile gateway (Bun-native)
│   ├── gateway.ts                 # Core API with context binding
│   ├── cli.ts                     # CLI interface (11 commands)
│   ├── oneliner.ts                # One-liner CLI (--cwd, --env-file)
│   ├── dashboard-server.ts        # HTTP dashboard server
│   ├── context-table-v3.28.ts     # Table engine integration
│   └── README.md
├── lib/
│   ├── bun-context.ts     # Bun Context v3.28 - Global config + context resolution
│   ├── table-engine-v3.28.ts      # Enhanced table engine (20-col, Unicode, HSL)
│   ├── cloudflare/        # Cloudflare API client
│   │   ├── client.ts
│   │   ├── cached-client.ts
│   │   ├── unified-client.ts
│   │   ├── unified-versioning.ts
│   │   ├── bun-data-api.ts
│   │   └── registry.ts
│   ├── secrets/           # Secret modules
│   │   └── core/
│   ├── api/               # API endpoints
│   └── utils/             # Documentation utilities
├── scripts/               # CLI scripts (categorized)
│   ├── secrets/           # Secret management
│   ├── security/          # Security auditing
│   ├── operations/        # DevOps/Lifecycle
│   ├── dashboard/         # Dashboard serving
│   ├── analysis/          # Analysis tools
│   ├── domain/            # Cloudflare domain CLI tools
│   └── shared/            # Shared utilities
├── tests/
│   ├── unit/              # Unit tests (Bun test runner)
│   └── integration/       # Integration tests
├── demo/                  # Demo frontend files
├── themes/                # Theme system
│   ├── config/            # Theme definitions (TOML)
│   ├── css/
│   └── js/
├── docs/                  # Documentation
├── config/                # Configuration files
└── dist/                  # Build output
```

## Build and Run Commands

### Quick Start
```bash
# Start the demo
bun run start              # Serves demo-pro.html

# Development with hot reload
bun run dev                # Hot reload mode
bun run dev:server         # Server hot reload
bun run dev:dashboard      # Dashboard hot reload
```

### Component-Specific
```bash
# Start individual components
bun run start:server       # API server with WebSocket
bun run start:dashboard    # Dashboard only
bun run start:tickets      # Ticketing demo
```

### Building
```bash
# Standard builds
bun run build              # Browser bundle
bun run build:server       # Server build (bun target)

# Production
bun run build:prod         # Minified + sourcemap
bun run build:meta         # With metafile analysis

# Optimized v2 builds
bun run build:dashboard:v2
bun run build:profile
bun run build:cloudflare
```

### Testing
```bash
bun run test               # All tests
bun run test:unit          # Unit tests only
bun run test:integration   # Integration tests only
bun run test:r2            # R2 connection test
bun run test:dashboard     # Dashboard tests
bun run test:profile       # Profile tests
bun run test:types         # TypeScript type checking
```

### Profiling & Performance
```bash
# Runtime profiling (generates markdown)
bun run profile:cpu        # CPU profile
bun run profile:heap       # Heap profile

# Sampling profiles
bun run profile:sampling
bun run profile:quick
bun run profile:upload     # Upload to R2
bun run profile:list       # List R2 profiles

# Benchmarks
bun run benchmark
bun run benchmark:websocket
```

### Monitoring & Operations
```bash
# Health checks
bun run monitor:status     # /api/health
bun run monitor:runtime    # /ops/runtime
bun run monitor:r2         # /ops/r2-status

# Operations
bun run ops:monitor        # Monitor expirations
bun run ops:lifecycle      # FactoryWager lifecycle
bun run ops:rollback       # Test rollback
```

### Cloudflare Domain Management
```bash
# Domain operations
bun run domain:zones       # List zones
bun run domain:dns         # DNS records
bun run domain:ssl         # SSL/TLS status
bun run domain:cache       # Cache management
bun run domain:analytics   # Analytics
bun run domain:setup       # Setup factory-wager
bun run domain:verify      # Verify configuration

# Unified CLI (themed)
bun run cf:unified
bun run cf:themed:light
bun run cf:themed:dark
bun run cf:themed:pro

# Version management
bun run cf:version
bun run cf:version:compare
bun run cf:version:bump
```

### OpenClaw Gateway (Matrix Profiles) v3.28
```bash
# Gateway status
bun run openclaw:status          # Check gateway status + context hash
bun run openclaw:bridge          # Check Matrix bridge status (table view)
bun run openclaw:version         # Show version info

# Profile management
bun run openclaw:profiles        # List available profiles
bun run openclaw:bind <profile>  # Bind directory to profile
bun run openclaw:switch <profile># Switch active profile
bun run openclaw:profile_status  # Show binding status

# Shell execution with context
bun run openclaw:exec <command>  # Execute with profile context

# Bun Context integration (v3.28)
bun run openclaw:context <cmd>   # Execute with bun-context resolution
bun run openclaw:config          # Show bun-context config

# One-Liner CLI (context switching)
bun run openclaw/oneliner.ts --cwd ./apps/api --env-file .env.local run dev
bun run openclaw/oneliner.ts --env-file .env --env-file .env.local run build
bun run openclaw/oneliner.ts --config ./ci.bunfig.toml run test
bun run openclaw/oneliner.ts --cwd ./packages/core --watch run index.ts

# Context Dashboard Server
bun run openclaw:dashboard       # Start dashboard server (port 8765)
# API: GET/POST /context-run, GET /context-cache, POST /context-clear

# Table Engine v3.28 (Enhanced Table Architecture)
bun run openclaw:table           # Show full dashboard with tables
bun run openclaw:table:compact   # Show compact dashboard
# Features: 20-column max, Unicode-aware, HSL colors, dynamic status

# Direct bun-context usage
bun run lib/bun-context.ts exec <cmd>     # Execute with context
bun run lib/bun-context.ts config         # Show loaded configuration
bun run lib/bun-context.ts cache          # Show cache status
bun run lib/bun-context.ts clear-cache    # Clear context cache
```

### Barber-Fusion Runtime Integration
The barber-fusion-runtime.ts is integrated with OpenClaw Context v3.16:

```bash
# Run Fusion demo with context resolution
bun run src/core/barber-fusion-runtime.ts
```

**FusionContext Classes:**
```typescript
import { FusionContextResolver, FusionContextExecutor } from './src/core/barber-fusion-runtime.ts';

// Resolve context with bun-context integration
const context = await FusionContextResolver.resolveContext();
// { environment, contextHash, globalConfig, featureFlags }

// Execute with context
const result = await FusionContextExecutor.executeWithContext(async () => {
  return await someOperation();
});
// { data, context, durationMs, session }

// Database with tenant context
await FusionContextExecutor.executeDbWithContext(db, async (database) => {
  return database.getAllAccountAges();
});
```

**Context-Aware Cache:**
```typescript
import { FusionCache } from './src/core/barber-fusion-runtime.ts';

// Cache with automatic context hash
await FusionCache.cacheWithContext('key', data, 3600);
const data = await FusionCache.getWithContext('key');
```

## Environment Configuration

### Required Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_NAME` | `Barbershop Dev` | Display name in logs/headers |
| `HOST` | `0.0.0.0` | Bind host |
| `PORT` / `BUN_PORT` | `3000` | Bind port (BUN_PORT checked first) |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | External URL for docs |
| `NODE_ENV` | `development` | Environment mode |

### R2 / S3 Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `R2_ACCOUNT_ID` | Yes* | Cloudflare account ID |
| `R2_BUCKET_NAME` | Yes* | R2 bucket name |
| `R2_ACCESS_KEY_ID` | Yes* | S3-compatible access key |
| `R2_SECRET_ACCESS_KEY` | Yes* | S3-compatible secret |
| `R2_ENDPOINT` | Optional | Custom endpoint URL |

*Or use Bun.secrets with `USE_BUN_SECRETS=true`

### Security Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LIFECYCLE_KEY` | `godmode123` | Key for `/ops/lifecycle` actions |
| `JWT_SECRET` | - | JWT signing secret |
| `MANAGER_KEY` | - | Required in production |
| `PAYPAL_SECRET` | - | PayPal API secret |

### Other Important Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KEEP_ALIVE_TIMEOUT_SEC` | `5` | Keep-alive timeout |
| `KEEP_ALIVE_MAX` | `1000` | Keep-alive max requests |
| `FETCH_TIMEOUT_MS` | `5000` | Outbound fetch timeout |
| `FETCH_VERBOSE` | `false` | Verbose fetch logging |
| `UPLOAD_TIMEOUT_SEC` | `60` | Form upload timeout |
| `AUTO_UNREF` | `false` | Call `server.unref()` on startup |
| `USE_BUN_SECRETS` | `false` | Enable Bun.secrets (macOS Keychain) |

### Setup
```bash
# Copy template
cp .env.example .env

# Edit with your values
# Or use Bun.secrets setup
bun run setup:r2
```

## Key Runtime Endpoints

### Main Dashboard URLs
- `/admin` - Admin dashboard (God View)
- `/client` - Client portal
- `/barber` - Barber station
- `/docs` - Documentation index

### API Endpoints
- `GET /health` - Health check
- `GET /telemetry` - Runtime telemetry (JSON)
- `GET /telemetry?format=html` - Telemetry (HTML)
- `GET /admin/data` - Sessions, telemetry, financial snapshot
- `GET /admin/orders` - Orders with tip breakdown
- `GET /barbers` - Available barbers list
- `POST /checkout/bundle` - Bundled checkout with tip
- `POST /ticket/create` - Create booking ticket
- `POST /action` - Multipart form upload
- `GET /tickets/pending` - Pending queue count
- `GET /barber/stats?barberId=xxx` - Barber statistics

### Operations Endpoints
- `GET /ops/runtime` - Runtime metrics
- `GET /ops/r2-status` - R2 mirror status
- `GET /ops/lifecycle?action=...&key=...` - Lifecycle controls
- `GET /ops/fetch-check?url=...` - Fetch diagnostics

### WebSocket
- `ws://localhost:3000/ws/dashboard` - Admin real-time stream
- `ws://localhost:3000/admin/ws?key=godmode123` - Authenticated admin stream

## Code Style Guidelines

### TypeScript Configuration
- **Target**: ES2022
- **Module**: ESNext with bundler resolution
- **Strict mode**: Enabled (all strict flags on)
- **Unused**: Locals and parameters must be used or removed
- **Casing**: Force consistent casing in file names

### Naming Conventions
- **Files**: kebab-case (e.g., `barber-server.ts`)
- **Types/Interfaces**: PascalCase (e.g., `BarberRecord`, `DashboardConfig`)
- **Functions**: camelCase (e.g., `fetchWithDefaults`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Private methods**: Prefixed with `_` when needed

### Import Patterns
```typescript
// Bun-native APIs
import { serve, redis, env } from 'bun';
import { Database } from 'bun:sqlite';

// Node.js APIs
import crypto from 'node:crypto';
import { lookup } from 'node:dns/promises';

// TOML manifest
import manifestData from '../../manifest.toml' with { type: 'toml' };

// Project modules
import { fetchWithDefaults } from '../utils/fetch-utils';
```

### Bun-Native APIs (Preferred)
| Operation | Bun API | Benefit |
|-----------|---------|---------|
| Hashing | `Bun.hash()` | 25x faster |
| Password | `Bun.password` | Native Argon2 |
| Compression | `Bun.gzip()` / `Bun.zstd()` | 1.5x faster |
| File I/O | `Bun.file()` / `Bun.write()` | 2-3x faster |
| Timing | `Bun.nanoseconds()` | Nanosecond precision |
| Sleep | `Bun.sleep()` | Native async delay |
| Semver | `Bun.semver` | Version parsing |
| HTML | `Bun.escapeHTML()` | XSS protection |

### Error Handling
```typescript
// Structured logging
function logInfo(event: string, details: Record<string, unknown>) {
  console.log(JSON.stringify({ event, ...details }));
}

// Validation functions
function requireEnv(name: string, value: string) {
  if (!value) throw new Error(`Missing required env: ${name}`);
}
```

## Testing Strategy

### Test Framework
- **Runner**: Bun's built-in test runner (`bun:test`)
- **Pattern**: `*.test.ts`
- **Location**: `tests/unit/` and `tests/integration/`

### Test Structure
```typescript
import { describe, expect, test } from 'bun:test';

describe('feature-name', () => {
  test('should behave correctly', () => {
    expect(result).toBe(expected);
  });
});
```

### Integration Tests
- Start actual server on test port
- Test HTTP endpoints
- Test WebSocket upgrades
- Clean up in `afterAll`

### Running Tests
```bash
# Specific test file
bun test tests/unit/barber-server.test.ts

# All unit tests
bun run test:unit

# All integration tests
bun run test:integration
```

## Security Considerations

### Secrets Management
- Use namespaced pattern: `factorywager.abtest.<component>.<env>`
- Bun.secrets integration for macOS Keychain
- Environment variable fallback
- No automatic secret writing (prevents OS popup spam)

### Production Requirements
```typescript
// Enforced in barber-server.ts
if (NODE_ENV === 'production') {
  requireEnv('MANAGER_KEY', MANAGER_KEY);
  if (!PAYPAL_SECRET_ENV) throw new Error('Missing PAYPAL_SECRET');
  if (ALLOW_INSECURE_WS) throw new Error('ALLOW_INSECURE_WS not permitted');
}
```

### Authentication
- `LIFECYCLE_KEY` required for `/ops/lifecycle` actions
- `MANAGER_KEY` required in production
- Cookie-based sessions with httpOnly/secure flags

### Input Validation
- Always validate query parameters
- Sanitize user input with `Bun.escapeHTML()`
- Validate multipart form uploads

## Deployment Notes

### Docker
```bash
bun run docker:build
bun run docker:run
```

### R2 Mirror
Two modes supported:
1. **bun-r2**: Direct `r2_upload` / `r2_status` APIs
2. **s3client**: Fallback to Bun `S3Client` for S3-compatible endpoints

### Lifecycle Controls
```bash
# Available actions
curl "http://localhost:3000/ops/lifecycle?action=status&key=godmode123"
curl "http://localhost:3000/ops/lifecycle?action=ref&key=godmode123"
curl "http://localhost:3000/ops/lifecycle?action=unref&key=godmode123"
curl "http://localhost:3000/ops/lifecycle?action=stop&key=godmode123"
curl "http://localhost:3000/ops/lifecycle?action=stop_force&key=godmode123"
```

## Theme System

### FactoryWager Palette (5 colors, NO purple/indigo)
| Semantic | Color | Hue | Hex |
|----------|-------|-----|-----|
| primary | Blue | 210° | `#007FFF` |
| secondary | Teal | 175° | `#17B8A6` |
| success | Green | 145° | `#14B866` |
| warning | Orange | 30° | `#FF8000` |
| error | Red | 0° | `#E64C4C` |

### Available Themes
- `factorywager` - Official brand theme (default)
- `light` - Clean light theme
- `dark` - Professional dark theme
- `professional` - Corporate blue-gray

### Theme Testing
```bash
bun test tests/theme-palette.test.ts
```

## Documentation References

- `README.md` - Main project documentation
- `CLIENT.md` - Client-facing flow documentation
- `ADMIN.md` - Admin flow documentation
- `QUICK-REF.md` - Quick reference commands
- `THEME_PALETTE.md` - Theme system documentation
- `docs/` - Extended documentation directory

## Key Files for Agents

| Purpose | File |
|---------|------|
| Server entry | `src/core/barber-server.ts` |
| Dashboard server | `src/core/barbershop-dashboard.ts` |
| Dashboard v2 API | `src/dashboard/index.ts` |
| Utilities | `src/utils/index.ts` |
| Bun-native APIs | `src/utils/bun-enhanced.ts` |
| Cloudflare lib | `lib/cloudflare/index.ts` |
| Secrets | `src/secrets/factory-secrets.ts` |
| Manifest | `manifest.toml` |
| Env template | `.env.example` |
