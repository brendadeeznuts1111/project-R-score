# AGENTS.md - Barbershop Demo Project

This file provides essential context for AI coding agents working on the Barbershop Demo project.

## Project Overview

**Barbershop Demo** is a Bun-based TypeScript demonstration project showcasing a multi-view dashboard system for a barbershop business. It demonstrates modern Bun-native APIs, real-time WebSocket communication, cloud storage integration, advanced theming, and a unified payment gateway system.

### Key Features

- **3-View Dashboard System**: Admin (God View), Client (Customer), and Barber (Worker) portals
- **Payment Gateway Integration**: Unified payment system supporting PayPal, CashApp, and Venmo
- **Ticketing System**: Service assignment and completion flow with ticket lifecycle management
- **API Server**: REST API with WebSocket support, telemetry, and R2 cloud storage integration
- **Theme System**: FactoryWager-branded UI with multiple themes (factorywager, light, dark, professional)
- **Secrets Management**: Namespace-aware secret lifecycle with Bun.secrets integration
- **Cloudflare Integration**: Domain management, DNS, SSL, caching, and analytics via CLI tools
- **OpenClaw Gateway**: Matrix profile system with Bun Context v3.28 and Enhanced Table Engine
- **Profile System**: Sampling profiler with R2 upload capabilities

## Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Bun >=1.3.6 |
| Language | TypeScript (ES2022, ESNext modules) |
| Database | SQLite (via `bun:sqlite`) - in-memory |
| Cache | Redis (via `bun:redis`) |
| Storage | Cloudflare R2 (S3-compatible) |
| Frontend | Vanilla HTML/JS with Bun-bundled assets |
| Config | TOML (loaded via Bun's native TOML loader) |
| Testing | Bun's built-in test runner (`bun:test`) |

## Project Structure

```
barbershop/
├── src/
│   ├── core/                   # Main business logic
│   │   ├── barber-server.ts           # API server (HTTP + WebSocket)
│   │   ├── barbershop-dashboard.ts    # 3-view dashboard server
│   │   ├── barbershop-tickets.ts      # Ticketing demo
│   │   ├── gateway-dashboard.ts       # Payment gateway dashboard
│   │   ├── barber-cashapp-protips.ts  # CashApp integration
│   │   ├── barber-fusion-runtime.ts   # Fusion runtime with OpenClaw
│   │   ├── barber-fusion-schema.ts    # Fusion schema definitions
│   │   ├── barber-fusion-types.ts     # Fusion type definitions
│   │   ├── ui-v2.ts                   # React-style UI components
│   │   ├── ui-v3.ts                   # Enhanced UI components
│   │   ├── bunlock.ts                 # Bun-native lock system
│   │   └── theme-loader.ts            # Dynamic theme loading
│   ├── dashboard/              # Dashboard System v2
│   │   ├── index.ts                   # Unified exports
│   │   ├── builder.ts                 # Dashboard builder API
│   │   ├── types.ts                   # Type definitions
│   │   ├── sync.ts                    # Real-time sync engine
│   │   └── composables/useDashboard.ts
│   ├── profile/                # Profile management
│   │   ├── index.ts
│   │   ├── sampling-profile.ts
│   │   ├── profile-cli.ts
│   │   └── core/profile-engine.ts
│   ├── secrets/                # Secrets management
│   │   ├── factory-secrets.ts         # FactoryWager secrets
│   │   ├── setup-secrets.ts
│   │   └── secrets-doctor.ts
│   ├── r2/                     # R2/cloud storage
│   │   ├── r2-connection-test.ts
│   │   ├── upload-latest-profile.ts
│   │   └── list-r2-profiles.ts
│   ├── build/                  # Build system
│   │   ├── build-metadata.ts
│   │   └── build-virtual.ts
│   ├── utils/                  # Utilities
│   │   ├── bun-enhanced.ts            # Bun-native API wrappers
│   │   ├── fetch-utils.ts
│   │   ├── cookie-manager.ts
│   │   ├── cookie-security.ts
│   │   ├── cli-table.ts               # Unicode-aware table formatting
│   │   ├── wasm-table.ts              # WebAssembly.Table compute hooks
│   │   ├── header-compression.ts
│   │   ├── elite-*.ts                 # Elite utilities (circuit breaker, rate limiter, etc.)
│   │   ├── logger.ts
│   │   └── index.ts
│   ├── config/                 # Configuration
│   │   ├── bun-config.ts
│   │   ├── domain.ts
│   │   └── theme.ts
│   ├── benchmarking/           # Depth configuration & benchmarking
│   │   ├── depth-hooks.ts
│   │   └── depth-optimizer.ts
│   └── debug/                  # Debug/diagnostics
│       ├── benchmark.ts
│       ├── debug-config.ts
│       ├── test-system-gaps.ts
│       └── fix-system-gaps.ts
├── lib/                        # Shared libraries
│   ├── bun-context.ts                 # Bun Context v3.28
│   ├── table-engine-v3.28.ts          # Enhanced table engine
│   ├── cookie-security-v3.26.ts
│   ├── cloudflare/             # Cloudflare API client
│   │   ├── client.ts
│   │   ├── cached-client.ts
│   │   ├── unified-client.ts
│   │   ├── unified-versioning.ts
│   │   ├── bun-data-api.ts
│   │   ├── secrets-bridge.ts
│   │   └── registry.ts
│   ├── secrets/                # Secret modules
│   │   └── core/
│   │       ├── bun-secrets-fallback.ts
│   │       ├── factorywager-security-citadel.ts
│   │       ├── integrated-secret-manager.ts
│   │       ├── optimized-secret-manager.ts
│   │       ├── redis-vault.ts
│   │       ├── secret-lifecycle.ts
│   │       ├── secrets-field.ts
│   │       ├── secrets.ts
│   │       └── version-graph.ts
│   ├── r2/                     # R2 authentication
│   │   └── r2-auth.ts
│   ├── api/                    # API endpoints
│   │   └── secrets-field-api.ts
│   ├── cli/                    # CLI framework
│   │   ├── framework.ts
│   │   └── index.ts
│   └── utils/                  # Documentation utilities
│       └── docs/
├── openclaw/                   # Matrix profile gateway (v3.28)
│   ├── gateway.ts                     # Core API with context binding
│   ├── cli.ts                         # CLI interface (11 commands)
│   ├── oneliner.ts                    # One-liner CLI (--cwd, --env-file)
│   ├── dashboard-server.ts            # HTTP dashboard server
│   ├── context-table-v3.28.ts         # Table engine integration
│   └── README.md
├── scripts/                    # CLI scripts (categorized)
│   ├── secrets/                # Secret management
│   ├── security/               # Security auditing
│   ├── operations/             # DevOps/Lifecycle
│   ├── dashboard/              # Dashboard serving
│   ├── analysis/               # Analysis tools
│   ├── domain/                 # Cloudflare domain CLI tools
│   ├── benchmarking/           # Depth configuration CLI
│   └── shared/                 # Shared utilities
├── tests/
│   ├── unit/                   # Unit tests (Bun test runner)
│   ├── integration/            # Integration tests
│   ├── bun-cookie.test.ts
│   ├── cookie-security-v3.26.test.ts
│   ├── dashboard-system.test.ts
│   ├── optimized-secrets.test.ts
│   ├── theme-palette.test.ts
│   └── setup.ts
├── demo/                       # Demo frontend files
│   ├── demo-pro.html
│   ├── demo-scripts.js
│   ├── demo-styles.css
│   ├── theme-showcase.html
│   ├── dashboard-showcase.html
│   └── widgets-showcase.html
├── themes/                     # Theme system
│   ├── config/                 # Theme definitions (TOML)
│   ├── css/                    # Theme stylesheets
│   └── js/                     # Theme JavaScript
├── docs/                       # Documentation
├── config/                     # Configuration files
├── dist/                       # Build output
├── manifest.toml               # Project manifest
├── bunfig.toml                 # Bun configuration
└── package.json                # Package scripts
```

## Key Configuration Files

### bunfig.toml
Bun runtime configuration with serve, run, install, build, and test settings:
- Port: 3000, Host: 0.0.0.0
- Test coverage threshold: 80%
- Preload: `./src/config/bun-config.ts`
- Build target: bun

### manifest.toml
Central project configuration defining:
- Entrypoints (dashboard, tickets, server, fusion, cashapp)
- Flows (customer_booking, checkout_bundle, barber_clock_in, ticket_lifecycle)
- Dashboard configurations (admin, client, barber, analytics, payments)
- Payment gateway settings (PayPal, CashApp, Venmo)
- API routes, barber profiles, themes, security settings

### tsconfig.json
TypeScript configuration:
- Target: ES2022
- Module: ESNext with bundler resolution
- Strict mode: Enabled (all strict flags on)
- Declaration files generated with source maps

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
bun run start:gateway      # Gateway dashboard
bun run start:openclaw     # OpenClaw dashboard server
```

### Building
```bash
# Standard builds
bun run build              # Browser bundle
bun run build:server       # Server build (bun target)
 bun run build:dashboard    # Dashboard build
bun run build:meta         # With metafile analysis

# Production
bun run build:prod         # Minified + sourcemap

# Optimized v2 builds
bun run build:dashboard:v2
bun run build:profile
bun run build:cloudflare
bun run build:all          # Build all v2 components
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
bun run benchmark:vault
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

# Security
bun run security:audit     # Security audit
bun run security:citadel   # Security citadel

# Secrets
bun run secrets:field      # Secrets field
bun run secrets:server     # Secrets server
bun run secrets:boost      # Secret boost
bun run secrets:vault      # Vault simulator
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
bun run cf:themed          # Interactive themed CLI

# Cloudflare Secrets Bridge
bun run cf:secrets:status
bun run cf:secrets:setup
bun run cf:secrets:set-token
bun run cf:secrets:history
bun run cf:secrets:rotate
bun run cf:secrets:schedule
```

### OpenClaw Gateway (Matrix Profiles) v3.28
```bash
# Gateway status
bun run openclaw:status          # Check gateway status + context hash
bun run openclaw:bridge          # Check Matrix bridge status
bun run openclaw:version         # Show version info

# Profile management
bun run openclaw:profiles        # List available profiles
bun run openclaw:bind <profile>  # Bind directory to profile
bun run openclaw:switch <profile># Switch active profile
bun run openclaw:profile_status  # Show binding status

# Shell execution with context
bun run openclaw:exec <command>  # Execute with profile context
bun run openclaw:context <cmd>   # Execute with bun-context resolution

# Dashboard Server
bun run openclaw:dashboard       # Start dashboard server (port 8765)

# Table Engine
bun run openclaw:table           # Show full dashboard with tables
bun run openclaw:table:compact   # Show compact dashboard
```

## Code Style Guidelines

### TypeScript Configuration
- **Target**: ES2022
- **Module**: ESNext with bundler resolution
- **Strict mode**: Enabled (all strict flags on)
- **Unused**: Locals and parameters must be used or removed
- **Casing**: Force consistent casing in file names
- **Declaration**: Generate `.d.ts` files with source maps

### Naming Conventions
- **Files**: kebab-case (e.g., `barber-server.ts`)
- **Types/Interfaces**: PascalCase (e.g., `BarberRecord`, `DashboardConfig`)
- **Functions**: camelCase (e.g., `fetchWithDefaults`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Private methods**: Prefixed with `_` when needed
- **Exported functions**: Use `export function` or `export const`

### Import Patterns
```typescript
// Bun-native APIs
import { serve, redis, env, Glob } from 'bun';
import { Database } from 'bun:sqlite';

// Node.js APIs
import crypto from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { watch } from 'node:fs';

// TOML manifest
import manifestData from '../../manifest.toml' with { type: 'toml' };

// Project modules
import { fetchWithDefaults } from '../utils/fetch-utils';
import { logger } from '../utils/logger';
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
| Which | `Bun.which()` | Command resolution |
| Spawn | `Bun.spawn()` | Process execution |
| Glob | `Bun.Glob` | File globbing |
| CryptoHasher | `Bun.CryptoHasher` | Streaming hashes |
| Peek | `Bun.peek()` | Promise introspection |
| Secrets | `Bun.secrets` | macOS Keychain |
| stringWidth | `Bun.stringWidth` | Unicode-aware width |

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

### File Organization
- Use `index.ts` as the public API for each module
- Group related exports in the index file
- Use descriptive comments with `// ═══` separators for sections
- Document public APIs with JSDoc comments

## Testing Strategy

### Test Framework
- **Runner**: Bun's built-in test runner (`bun:test`)
- **Pattern**: `*.test.ts`
- **Location**: `tests/unit/` and `tests/integration/`
- **Setup**: `tests/setup.ts` is preloaded for all tests

### Test Setup
The test setup file (`tests/setup.ts`):
- Sets `NODE_ENV=test`
- Sets test secrets (`CSRF_SECRET`, `VARIANT_SECRET`)
- Mocks console methods unless `VERBOSE_TESTS` is set
- Provides `restoreConsole()` utility

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

# With verbose output
VERBOSE_TESTS=1 bun run test
```

### Coverage
Coverage is enabled in `bunfig.toml` with threshold 0.8 (80%).

## Security Considerations

### Secrets Management
- Use namespaced pattern: `factorywager.abtest.<component>.<env>`
- Bun.secrets integration for macOS Keychain
- Environment variable fallback
- No automatic secret writing (prevents OS popup spam)
- Secrets are read-only at runtime by default

### Secret Components
- `pty` - PTY/session secrets
- `r2` - R2 storage credentials
- `csrf` - CSRF protection
- `barber` - Barber service secrets
- `admin` - Admin service secrets

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
- CSRF protection on state-changing operations

### Input Validation
- Always validate query parameters
- Sanitize user input with `Bun.escapeHTML()`
- Validate multipart form uploads
- Use type-safe parsing for JSON payloads

### TLS/SSL
- Support for custom TLS certificates
- `TLS_KEY_PATH` and `TLS_CERT_PATH` must be set together
- Optional CA certificate via `TLS_CA_PATH`

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
| `ADMIN_KEY` | `godmode123` | Admin access key |
| `CSRF_SECRET` | - | CSRF protection secret |
| `VARIANT_SECRET` | - | A/B testing variant secret |

### Cloudflare API

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUDFLARE_API_TOKEN` | For CF ops | API token with Zone:Read, DNS:Edit, etc. |
| `CLOUDFLARE_ACCOUNT_ID` | For CF ops | Cloudflare account ID |

### Payment Gateway Configuration

| Variable | Gateway | Description |
|----------|---------|-------------|
| `PAYPAL_CLIENT_ID` | PayPal | PayPal client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal | PayPal client secret |
| `CASHAPP_BUSINESS_TAG` | CashApp | Business Cashtag |
| `CASHAPP_WEBHOOK_SECRET` | CashApp | Webhook verification |
| `VENMO_CLIENT_ID` | Venmo | Venmo client ID |
| `VENMO_ACCESS_TOKEN` | Venmo | Venmo access token |
| `VENMO_MERCHANT_ID` | Venmo | Venmo merchant ID |

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
| `METRICS_ENABLED` | `true` | Enable metrics collection |
| `LOG_LEVEL` | `info` | Logging level |
| `ALLOW_INSECURE_WS` | `false` | Allow insecure WebSocket (dev only) |
| `DNS_PREFETCH_HOSTS` | `example.com` | Comma-separated hosts for DNS prefetch |
| `DNS_WARMUP_HOSTS` | `DNS_PREFETCH_HOSTS` | Hosts to resolve at startup |

### Setup
```bash
# Copy template
cp .env.example .env

# Edit with your values
# Or use Bun.secrets setup
bun run setup:r2

# Check secrets health
bun run src/secrets/secrets-doctor.ts
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

### Payment Endpoints
- `POST /payment/process` - Unified payment gateway
- `POST /payment/paypal/create-order` - Create PayPal order
- `POST /payment/paypal/capture-order` - Capture PayPal order
- `POST /payment/cashapp/process` - Process CashApp payment
- `POST /payment/cashapp/detect-new` - Detect new CashApp account
- `POST /payment/venmo/charge` - Create Venmo charge
- `POST /payment/venmo/split` - Split payment

### Operations Endpoints
- `GET /ops/runtime` - Runtime metrics
- `GET /ops/r2-status` - R2 mirror status
- `GET /ops/lifecycle?action=...&key=...` - Lifecycle controls
- `GET /ops/fetch-check?url=...` - Fetch diagnostics
- `GET /api/health` - API health check

### WebSocket
- `ws://localhost:3000/ws/dashboard` - Admin real-time stream
- `ws://localhost:3000/admin/ws?key=godmode123` - Authenticated admin stream

### OpenClaw Dashboard Server (port 8765)
- `GET /context-run` - Execute with context
- `POST /context-run` - Execute with context (POST)
- `GET /context-cache` - View context cache
- `POST /context-clear` - Clear context cache

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

### Theme Configuration
Themes are defined in TOML files in `themes/config/`:
- `factorywager.toml` - Brand colors
- `light.toml` - Light mode
- `dark.toml` - Dark mode
- `professional.toml` - Corporate style

### Theme Testing
```bash
bun test tests/theme-palette.test.ts
open demo/theme-showcase.html
```

## Table Engine v3.28

### Features
- **20 Column Max**: Responsive overflow handling
- **Unicode-aware**: `stringWidth` support for CJK characters
- **HSL Colors**: Dynamic theming with `Bun.color`
- **Formatters**: status, health, grade, latency, bytes, score

### Formatters
```typescript
import { formatters } from '../lib/table-engine-v3.28.ts';

formatters.status(true)        // "● ACTIVE" (green)
formatters.status('warning')   // "● WARNING" (yellow)
formatters.method('GET')       // "GET" (blue)
formatters.grade('A+')         // " A+ " (bold green)
formatters.health('healthy')   // "✓ HEALTHY" (green)
formatters.trend('up')         // "↗" (green)
formatters.latency(45)         // "45ms" (green/yellow/red)
formatters.bytes(1024)         // "1.0KB"
formatters.score(95)           // "95" (green)
formatters.variant('A')        // "▣ A" (cyan)
formatters.token('abc123')     // "🔒 abc…" (masked)
```

## Bun Context v3.28

The Bun Context system provides global configuration resolution and context-aware execution:

```typescript
import {
  loadGlobalConfig,
  executeWithContext,
  parseFlags
} from './lib/bun-context.ts';

// Load global configuration
const config = await loadGlobalConfig({ cwd: './my-project' });

// Execute with full context resolution
const session = await executeWithContext(['bun', 'test'], { useCache: true });
```

### Context Resolution Order
1. package.json scripts
2. Source files (.ts, .tsx, .js, .jsx)
3. Binaries (via Bun.which)
4. System commands

## Dashboard System v2

The Dashboard System provides a unified API for creating dashboards:

```typescript
import {
  createDashboard,
  createAdminDashboard,
  createClientDashboard,
  createBarberDashboard,
  useDashboard
} from './src/dashboard';

// Create a dashboard
const dashboard = createDashboard({
  view: 'admin',
  theme: 'professional'
}).buildAdminDashboard();

// Use composition API
const { metrics, widgets, refresh } = useDashboard({
  view: 'admin',
  autoRefresh: true
});
```

## Payment Gateway Integration

### Unified Payment Endpoint
```typescript
// POST /payment/process
{
  "amount": 45.00,
  "currency": "USD",
  "customer_id": "cust_123",
  "gateway_preference": "auto",  // or "paypal", "cashapp", "venmo"
  "tip_amount": 6.75,
  "split_between": ["barber_jb"],
  "metadata": {
    "services": ["Haircut", "Beard Trim"],
    "barber_code": "JB"
  }
}
```

### Routing Logic
- Amount < $50 + CashApp preferred → CashApp
- Amount ≥ $100 OR Venmo preferred → Venmo
- New account + high amount → PayPal (buyer protection)
- Split payment → Venmo

## Documentation References

### Core Documentation
- `README.md` - Main project documentation
- `AGENTS.md` - AI agent context & coding guidelines (this file)
- `QUICK-REF.md` - Quick reference commands

### Consolidated Guides
- `docs/OPERATIONS.md` - Admin, Client, and Barber operations (merged from ADMIN.md, CLIENT.md, FACTORY_WAGER_CHEATSHEET.md)
- `docs/OPENCLAW.md` - Matrix profile gateway & Bun Context integration (merged from OPENCLAW_INTEGRATION.md, OPENCLAW_BARBERSHOP_INTEGRATION.md)
- `docs/THEMES.md` - FactoryWager theme system & brand palette (merged from THEME_PALETTE.md, THEME_UPDATE_SUMMARY.md)
- `docs/OPTIMIZATION.md` - Performance optimizations & benchmarks (merged from DASHBOARD_OPTIMIZATION_SUMMARY.md, OPTIMIZATION_COMPLETE.md)

### Reference
- `QUICK-REF-cookie-security.md` - Cookie security reference
- `openclaw/README.md` - OpenClaw gateway documentation
- `docs/` - Extended documentation directory
- `themes/BUILD.md` - Theme build documentation

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
| Bun Context | `lib/bun-context.ts` |
| Table Engine | `lib/table-engine-v3.28.ts` |
| OpenClaw Gateway | `openclaw/gateway.ts` |
| OpenClaw CLI | `openclaw/cli.ts` |
| Manifest | `manifest.toml` |
| Bun Config | `bunfig.toml` |
| Env template | `.env.example` |
| Test setup | `tests/setup.ts` |

## Lifecycle Controls

```bash
# Available actions
curl "http://localhost:3000/ops/lifecycle?action=status&key=godmode123"
curl "http://localhost:3000/ops/lifecycle?action=ref&key=godmode123"
curl "http://localhost:3000/ops/lifecycle?action=unref&key=godmode123"
curl "http://localhost:3000/ops/lifecycle?action=stop&key=godmode123"
curl "http://localhost:3000/ops/lifecycle?action=stop_force&key=godmode123"
```

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

### Fetch Diagnostics
Supports comprehensive fetch testing:
- `url` - Target URL
- `method` - GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS
- `headers` - JSON object of headers
- `body` - Raw string body
- `body_json` - JSON string (auto-sets content-type)
- `verbose=1` - Bun fetch header trace
