# Barbershop Demo

This directory contains the barbershop demo apps, support modules, and tests.

## Run

### Quick Start

```bash
# Start the demo
bun run start

# Start with hot reload
bun run dev

# Start specific components
bun run start:server      # API server with WebSocket
bun run start:dashboard   # Dashboard only
bun run start:tickets     # Ticketing demo

# Development with hot reload
bun run dev:server
bun run dev:dashboard
```

## Host/Port/URL Config

Both dashboard and server support:

- `SERVER_NAME`: display/server label in logs/docs
- `HOST`: bind host (default `0.0.0.0`)
- `BUN_PORT` / `PORT`: bind port (Bun native), checked in this order, defaults to `3000`
- `PUBLIC_BASE_URL`: external URL shown in docs/log output
- `KEEP_ALIVE_TIMEOUT_SEC`: keep-alive timeout header value (default `5`)
- `KEEP_ALIVE_MAX`: keep-alive max header value (default `1000`)
- `FETCH_TIMEOUT_MS`: outbound fetch timeout used by shared helper (default `5000`)
- `FETCH_VERBOSE`: when `true`, enables Bun fetch verbose request/response logging
- `OUTBOUND_PROXY_URL`: optional outbound proxy URL
- `OUTBOUND_PROXY_AUTH`: optional `Proxy-Authorization` header value
- `OUTBOUND_PROXY_HEADERS_JSON`: optional JSON object of additional proxy headers
- `LIFECYCLE_KEY`: key required for `/ops/lifecycle` actions (default `godmode123`)
- `AUTO_UNREF`: when `true`, calls `server.unref()` on startup
- `UPLOAD_TIMEOUT_SEC`: per-request timeout for `/action` form uploads (default `60`)
- `DNS_PREFETCH_HOSTS`: comma-separated hosts used for `<link rel="dns-prefetch">` and `<link rel="preconnect">`
- `DNS_WARMUP_HOSTS`: comma-separated hosts resolved at startup (defaults to `DNS_PREFETCH_HOSTS`)
- `DNS_WARMUP_TIMEOUT_MS`: timeout per DNS warmup lookup (default `500`)

R2 mirror can be configured via `Bun.secrets` (macOS-backed):

- Service: `r2`
- Names:
  - `BUCKET` (required)
  - `PREFIX` (optional, defaults to `barbershop`)
  - `ACCESS_KEY_ID` (optional bridge to `R2_ACCESS_KEY_ID`)
  - `SECRET_ACCESS_KEY` (optional bridge to `R2_SECRET_ACCESS_KEY`)
  - `ENDPOINT` (optional bridge to `R2_ENDPOINT`)
  - `ACCOUNT_ID` (optional bridge to `CLOUDFLARE_ACCOUNT_ID`)

Runtime upload modes:

- `bun-r2`: uses Bun `r2_upload` / `r2_status` APIs
- `s3client`: falls back to Bun `S3Client` (R2 S3-compatible endpoint) when direct R2 APIs are unavailable

Secrets behavior:

- Runtime will **not write** secrets automatically (prevents repeated OS popup prompts).
- Bun.secrets reads are opt-in via `USE_BUN_SECRETS=true`.
- One-time setup command:
  - `bun run setup:r2`
- Check secrets:
  - `bun run src/secrets/secrets-doctor.ts`

Namespaced service pattern used:

- `factorywager.abtest.<component>.<env>`
- examples:
  - `factorywager.abtest.pty.local`
  - `factorywager.abtest.r2.local`
  - `factorywager.abtest.csrf.local`
  - `factorywager.abtest.barber.local`
  - `factorywager.abtest.admin.local`

Example:

```bash
SERVER_NAME="Barbershop Local" HOST=127.0.0.1 PORT=3010 PUBLIC_BASE_URL=http://127.0.0.1:3010 bun run start:barbershop:dashboard
```

## Test

```bash
bun run test              # All tests
bun run test:unit         # Unit tests only
bun run test:integration  # Integration tests only
```

```bash
bun run build:meta        # Build with metafile analysis
bun run build:prod        # Production build with minification
```

```bash
bun run profile:barbershop:sampling
```

```bash
bun run profile:barbershop:sampling --upload-r2=true --require-r2=true
```

```bash
bun run profile:barbershop:quick
bun run profile:barbershop:shot
bun run profile:barbershop:shot:r2
bun run profile:barbershop:local
bun run profile:barbershop:r2
bun run profile:barbershop:latest
bun run profile:barbershop:status
bun run profile:barbershop:upload-latest
bun run profile:barbershop:list-r2
bun run profile:barbershop:cpu-md
bun run profile:barbershop:heap-md
```

Profiler R2 upload accepts either env style:
- `R2_ACCOUNT_ID` + `R2_BUCKET_NAME` + `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY`
- or `R2_ENDPOINT` + `R2_BUCKET` + `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY`

## Demo Flows

1. Open admin dashboard: `http://localhost:3000/admin`
2. Open client portal: `http://localhost:3000/client`
3. Open barber station: `http://localhost:3000/barber`
4. Create a ticket from client, confirm assignment in barber station.
5. Complete ticket from barber station, confirm updates in admin.
6. Use bundled checkout with `%` or flat tip and optional shampoo add-on, then verify split tips in `GET /admin/orders`.

## In-App Docs

- Dashboard docs index: `http://localhost:3000/docs`
- Server docs index: `http://localhost:3000/docs`
- Manifest TOML: `http://localhost:3000/docs/manifest`
- Manifest JSON (loader parsed): `http://localhost:3000/docs/manifest.json`
- Readme (raw markdown): `http://localhost:3000/docs/readme`
- Client-facing guide: `http://localhost:3000/docs/client`
- Admin guide: `http://localhost:3000/docs/admin`

## Runtime Notes

- Dashboard and server install graceful shutdown handlers (`SIGINT`, `SIGTERM`).
- Startup logs include resolved host/port/base URL and server protocol.
- Main docs/html/api responses include keep-alive + `X-Server-Name` headers.
- Shared `fetchWithDefaults()` utility is available in `/Users/nolarose/Projects/barbershop/src/utils/fetch-utils.ts`.
- Profile CLI uses `Bun.wrapAnsi()` when available for ANSI-safe wrapped terminal output.
- Runtime profiling shortcuts generate markdown via `--cpu-prof-md` and `--heap-prof-md` into `logs/profiles/runtime`.
- Diagnostics endpoint: `GET /ops/fetch-check?url=https://example.com`.
- Per-request verbose debugging: add `&verbose=1` to `/ops/fetch-check` in Bun.
- Runtime metrics endpoint: `GET /ops/runtime`.
- R2 mirror status endpoint: `GET /ops/r2-status`.
- Lifecycle controls endpoint: `GET /ops/lifecycle?action=status|ref|unref|stop|stop_force&key=...`.
- Fetch diagnostics supports:
  - `url`
  - `method` (GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS)
  - `headers` (JSON object)
  - `body` (raw string)
  - `body_json` (JSON string, auto sets `content-type: application/json` if missing)
  - `verbose=1` (Bun fetch header trace)
- Barber stats endpoint: `GET /barber/stats?barberId=barber_om`.

## Bun References

- [Bun.file (runtime file I/O)](https://bun.com/docs/runtime/file-io#reading-files-bun-file)
- [Bun.Archive API (v1.3.6)](https://bun.com/blog/bun-v1.3.6#bun-archive-api-creates-extracts-tarballs)
- [Bun.JSONC.parse (v1.3.6)](https://bun.com/blog/bun-v1.3.6#bun-jsonc-api-for-parsing-json-with-comments)
- [Bun.build metafile (v1.3.6)](https://bun.com/blog/bun-v1.3.6#metafile-in-bun-build)
- [Bun.jsc.SamplingProfile](https://bun.com/reference/bun/jsc/SamplingProfile)
- [HTTP file uploads (`Request.formData`)](https://bun.com/docs/guides/http/file-uploads)
- [HTTP proxy options in `fetch`](https://bun.com/docs/guides/http/proxy)
- [Bun.serve reference](https://bun.com/reference/bun/serve)

## Bun-Native APIs

This project leverages Bun's native high-performance APIs:

### Available Utilities

```typescript
// Import from centralized utils
import { 
  fastHash,           // 25x faster than crypto (Bun.hash)
  hashPassword,       // Native Argon2 (Bun.password)
  verifyPassword,
  compressData,       // Native gzip/zstd (Bun.gzip/Bun.zstd)
  decompressData,
  nanoseconds,        // High-res timing (Bun.nanoseconds)
  fastWrite,          // Fast file I/O (Bun.write)
  fastReadText,       // (Bun.file)
  fastReadJSON,
  sleep,              // Async delays (Bun.sleep)
  parseSemver,        // Version parsing (Bun.semver)
  compareVersions,
  satisfiesVersion,
  escapeHTML,         // HTML sanitization (Bun.escapeHTML)
} from './src/utils';

// WebAssembly.Table for dynamic compute
import { WASMMachine, createDefaultMachine } from './src/utils/wasm-table';

// Bun-optimized config loading
import { loadConfig, getConfig } from './src/config/bun-config';
```

### Performance Comparison

| Operation | Bun API | Speedup |
|-----------|---------|---------|
| Hashing | `Bun.hash()` | **25x** |
| File Write | `Bun.write()` | **2-3x** |
| Compression | `Bun.gzip()` | **1.5x** |
| Password Hash | `Bun.password` | Built-in Argon2 |
| Timing | `Bun.nanoseconds()` | Nanosecond precision |

### Running Demos

```bash
# Bun API demo
bun run src/utils/bun-enhanced.ts

# Performance benchmarks
bun run src/utils/bun-benchmark.ts

# WebAssembly.Table demo
bun run src/utils/wasm-table.ts

# Theme showcase
open demo/theme-showcase.html
```

## Project Structure

```
barbershop/
├── src/
│   ├── core/           # Main business logic
│   │   ├── barbershop-dashboard.ts  # Full 3-view dashboard demo
│   │   ├── barbershop-tickets.ts    # Ticketing and assignment flow
│   │   ├── barber-server.ts         # Telemetry, WS, auth/cookie + report endpoints
│   │   └── barber-fusion-*.ts       # Fusion runtime, schema, types
│   ├── secrets/        # Secrets management
│   ├── r2/             # R2/cloud storage
│   ├── profile/        # Profile management
│   ├── build/          # Build system
│   ├── utils/          # Utilities (fetch-utils.ts, logger.ts, etc.)
│   └── debug/          # Debug/diagnostics
├── lib/
│   ├── api/            # API endpoints
│   ├── r2/             # R2 authentication
│   ├── secrets/        # Secrets modules (core, config)
│   └── utils/          # Documentation utilities
├── scripts/            # CLI scripts (categorized)
│   ├── secrets/        # Secret management tools
│   ├── security/       # Security auditing
│   ├── operations/     # DevOps/Lifecycle
│   ├── dashboard/      # Dashboard serving
│   ├── analysis/       # Analysis tools
│   └── shared/         # Shared utilities
├── tests/
│   ├── unit/           # Unit tests
│   └── integration/    # Integration tests
├── demo/               # Demo frontend files
├── docs/               # Documentation
├── config/             # Configuration files
└── reports/            # Generated reports
```

## Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
# Required: R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY

# Or use Bun.secrets (macOS Keychain)
bun run src/secrets/setup-secrets.ts
```

## Key Files

- `src/core/barbershop-dashboard.ts`: Full 3-view dashboard demo (admin/client/barber)
- `src/core/barber-server.ts`: API server with WebSocket, telemetry, auth endpoints
- `src/core/ui-v2.ts`: React-style admin/client portal components
- `src/utils/bun-enhanced.ts`: Bun-native API wrappers (hash, compress, timing)
- `src/utils/wasm-table.ts`: WebAssembly.Table for dynamic compute hooks
- `src/config/bun-config.ts`: Bun-optimized configuration loader
- `config/manifest.toml`: Demo manifest and route/script index
- `demo/theme-showcase.html`: Interactive theme switcher demo
- `src/profile/sampling-profile.ts`: on-demand CPU sampling profile capture.
- `tests/`: barbershop-focused test suite (unit/ + integration/).
