# Bun Documentation Manager

A beautiful, self-contained documentation browser for the entire Bun ecosystem.

This tool is also a **living demonstration** of modern Bun capabilities — advanced `fetch`, `Bun.serve` (routes, reload, console streaming, WebSocket pub/sub), and `Bun.build` features.

## Features

- Fetches the live documentation index from the official source: `https://bun.com/docs/llms.txt`
- Parses and categorizes all ~200+ documentation pages
- Generates a single-file, fully interactive `bun-docs.html`
- Fast search, category filtering, keyboard shortcuts (`/` to search)
- Dark theme matching modern Bun aesthetics
- Zero dependencies at runtime

## Usage

```bash
# Generate the dashboard (default source: https://bun.com/docs/llms.txt)
bun run generate

# Open the generated dashboard
open dist/bun-docs.html
```

### CLI Options

All options can be passed as `--flag value` or `--no-flag` booleans. The parser is intentionally lightweight (pure Bun.argv).

| Flag                  | Default                    | Description |
|-----------------------|----------------------------|-------------|
| `--source`            | `https://bun.com/llm.txt`  | URL to the markdown documentation index (supports https, http, file://) |
| `--outdir`            | `dist`                     | Output directory |
| `--filename`          | `bun-docs.html`            | Output HTML filename |
| `--registry`          | `true`                     | Also emit `bun-docs-registry.json` |
| `--minify`              | `true`                     | Minify the bundled JS |
| `--verbose`             | `false`                    | **Primary debugging tool** — enables Bun's native `fetch(..., { verbose: true })` |
| `--timeout`             | `30000`                    | AbortSignal timeout in ms |
| `--proxy`               | —                          | HTTP/S proxy URL |
| `--insecure`            | `false`                    | Disable TLS cert validation |
| `--tls-ca <file>`       | —                          | Client CA bundle |
| `--tls-cert <file>`     | —                          | Client certificate (mTLS) |
| `--tls-key <file>`      | —                          | Client private key (mTLS) |
| `--dry-run` / `--check` | `false`                    | **Best debugging command** — minimal fetch + diagnostics |
| `--serve`               | `false`                    | Start a `Bun.serve` dev server after generating |
| `--port`                | random                     | Port when using `--serve` |
| `--watch`               | `false`                    | Hot-reload routes using `server.reload()` when files change |
| `--console`             | `false`                    | Stream browser `console.*` to terminal (`development: { console: true }`) |
| `--ws`, `--websocket`   | `false`                    | Enable WebSocket pub/sub demo (`/ws` + `server.publish` + `subscriberCount`) |
| `--idle-timeout <sec>`  | `60`                       | Global `Bun.serve({ idleTimeout })` (0 disables; 0-255) |
| `--idle-timeout-per-request <sec>` | `0`                | Demo of `server.timeout(req, sec)` for SSE/long-lived conns (0 = infinite) |
| `--unref`               | `false`                    | Call `server.unref()` so server does not keep the process alive (⚠️ warning) |
| `--env`                 | —                          | Bundler env mode: `inline`, `PUBLIC_*`, or `disable` |
| `--sourcemap`           | `none`                     | Generate sourcemaps: `linked`, `external`, or `inline` |
| `--help`, `-h`          | —                          | Show this help |

**Recommended debugging workflow when you hit `ConnectionRefused` or `FailedToOpenSocket`:**

```bash
# 1. Fastest way to diagnose (uses the exact advice from the Bun fetch guide)
bun run generate --source "https://custom.example/llm.txt" --dry-run --verbose

# 2. With corporate proxy + relaxed TLS
bun run generate --source "https://internal.company/bun-llms.txt" \
  --dry-run --verbose --proxy "http://proxy:3128" --insecure

# 3. Once the dry-run succeeds, do the real build
bun run generate --source "https://internal.company/bun-llms.txt" --verbose
```

## How This Tool Uses Bun

This project is designed as a **practical showcase** of several Bun capabilities working together:

- **Networking** — Advanced `fetch` usage (`--verbose`, `--dry-run`, `preconnect`, proxy, TLS, `file://` support)
- **Server** — Modern `Bun.serve` + full `Server` interface (`stop`, `reload`, `ref/unref`, `timeout(req)`, `requestIP`, `pending*`, `upgrade`/`publish`, `subscriberCount`, `idleTimeout` controls, WebSocket pub/sub)
- **Bundler** — `Bun.build()` with environment inlining (`--env`) and all sourcemap modes (`--sourcemap`)
- **Developer Experience** — Hot reloading, request logging, and first-class debugging tools

It shows how these pieces can be combined to build a useful, production-style documentation tool with excellent local development ergonomics.

## Generated Output

- `dist/bun-docs.html` — Self-contained documentation browser (open in any browser)

## Debugging Fetch Issues

When using a custom `--source` URL you may encounter `ConnectionRefused` / `FailedToOpenSocket` errors. This is the most common class of `fetch` failure in Bun.

### Quick Diagnosis (Recommended)

```bash
# Step 1 (best): Use --dry-run + --verbose — this is the fastest way to reproduce and see the exact error
bun run generate --source "https://your-custom-host/llms.txt" --dry-run --verbose

# Alternative: just verbose during a real run
bun run generate --source "https://your-custom-host/llm.txt" --verbose
```

The `--dry-run` mode runs a minimal connection test with full Bun fetch diagnostics and exits before any HTML generation or parsing. `--verbose` maps directly to Bun's native `fetch(url, { verbose: true })`.

### Common Causes & Fixes

- **Wrong hostname / server not running** — Verify the URL works in `curl` or a browser from the same machine.
- **Corporate proxy / firewall** — Use `--proxy http://proxy.company:3128`
- **Timeout on long markdown responses** — Increase with `--timeout 120000`
- **Self-signed TLS certificates (dev)** — Not yet exposed via CLI; you can temporarily patch `generate.ts` with a `tls` option.

### Testing the Official Source

Always confirm your environment works with the default:

```bash
bun run generate --source "https://bun.com/docs/llms.txt" --verbose
```

If the official source succeeds but your custom one fails, the problem is isolated to the target server or your network path to it.

### Bun `fetch` Capabilities Used Here

This generator demonstrates several powerful Bun extensions to the WHATWG Fetch API:

- `verbose: true` — Detailed header logging for debugging
- `proxy` — Transparent HTTP proxy support
- `signal` + `AbortController` — Clean timeout handling
- Streaming `.text()` consumption on large markdown indexes
- Native support for `file://` (local files), `data:`, `s3://` and regular HTTP/HTTPS using the exact same `fetch()` call
- Local paths (`./my-llm.txt`, `/absolute/path`) are automatically converted to `file://` URLs
- Zero-dependency native implementation (faster and more capable than Node's)

For the full reference, see the Bun docs on [Sending an HTTP request](https://bun.com/docs/runtime/networking/fetch#sending-an-http-request) and the dedicated [Proxy](https://bun.com/docs/guides/http/proxy.md) and [TLS](https://bun.com/docs/runtime/http/tls.md) guides.

## Bun Features This Tool Demonstrates

This generator is intentionally built as a **living showcase** of modern Bun capabilities:

### Networking (`fetch`)
- `fetch` with `verbose: true`
- `AbortSignal` + timeout handling
- `proxy` support
- TLS customization (`rejectUnauthorized`, client certificates, custom CA)
- Native `file://` protocol support (local files work the same as HTTP)
- `fetch.preconnect()` for early DNS + TCP + TLS warmup (`--preconnect`)
- Robust error handling and diagnostics for `FailedToOpenSocket` / `ConnectionRefused`

### Server (`Bun.serve` + full `Server` interface)
- Modern `routes` API (static, dynamic `:param`, wildcards, method handlers) + optional `websocket` handler
- `server.reload()` for zero-downtime hot-reloading of routes/handlers (`--watch`)
- `server.stop(force?)` — graceful (drain connections) or forced shutdown with SIGINT/SIGTERM handling and distinct logging
- `server.ref()` / `server.unref()` + `--unref` flag for process lifetime control
- `server.timeout(req, seconds)` — dynamic per-request idle timeout override (powers SSE demo)
- `server.requestIP(req)` + `pendingRequests` / `pendingWebSockets` for introspection
- `server.upgrade()`, `server.publish()`, `subscriberCount()`, `ws.data`, topic subscription (`--ws`)
- Configurable global `idleTimeout` (`--idle-timeout`) + per-request control (`--idle-timeout-per-request`)
- Efficient static file serving via `Bun.file()`
- Native `development: { console: true }` for streaming browser `console.*` (`--console`)
- Request logging + rich debug endpoints (`/api/status`, `/api/sse`, `/ws`, `/api/ws-status`)

### Bundler (`Bun.build`)
- Environment variable inlining (`--env inline` and prefix matching like `PUBLIC_*`)
- All sourcemap modes (`linked`, `external`, `inline`)
- `define` for injecting data at build time
- Single-file output patterns

The goal is that by using this tool (especially with `--dry-run --verbose`, `--serve --watch`, `--env inline --sourcemap linked`, etc.), you get hands-on experience with real Bun APIs.

## Development Server Experience

When you run `bun run generate --serve --ws --console --watch --idle-timeout 120 --unref`, you get a first-class development server powered by `Bun.serve` and the full `Server` interface:

- **Modern routing** using Bun’s `routes` API
- **Hot reloading** via `server.reload()` — edit files in `dist/` and routes update instantly without dropping connections
- **Browser console streaming** — any `console.log`, `console.warn`, or `console.error` from the client appears in your terminal (powered by Bun’s native `development: { console: true }`)
- **Useful debug endpoints**:
  - `GET /api/status` — server metrics + your client IP
  - `POST /api/echo` — test request body handling
  - `GET /api/page/:slug` — dynamic route example
  - `GET /api/sse?timeout=0` — long-lived SSE using `server.timeout(req, 0)`
  - `WS /ws` + `GET /api/ws-status` — WebSocket pub/sub room using `upgrade`, `publish`, `subscriberCount` (when `--ws`)

This setup demonstrates how Bun intends developers to build and debug full-stack applications during development.

## Related

This was built as part of the larger monorepo organization effort to demonstrate practical, production-grade usage of Bun for documentation tooling.