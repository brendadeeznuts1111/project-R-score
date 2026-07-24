# Portal foundation

Single source of truth for the FactoryWager static portal (`public/portal/`). New pages and edits must follow these patterns so health, env, and navigation stay consistent.

**Template:** [`public/portal/_page-template.html`](../public/portal/_page-template.html)  
**Verify:** `bun run verify:portal:static` (CI) · `bun run verify:portal` (live server)

---

## Data flow

```text
data.js  ──fetch──►  /api/health  (schemaVersion: 1)
    │
    ├── sessionStorage (SWR cache: portal_health_cache)
    ├── portal:data  { status, data?, error? }
    │       status: loading | ok | stale | error
    │
    ├── topbar.js   → health dot + ARIA
    ├── env page    → health.env or /api/env fallback
    └── page scripts → listen portal:data, render locally
```

Pages **must not** poll `/api/health` directly for the topbar dot. Use `portal:data` or `getHealthData()` from [`public/portal/data.js`](../public/portal/data.js).

Exception: [`public/portal/health/index.html`](../public/portal/health/index.html) is a diagnostic surface that probes `/api/health` and `/health` for its own banner.

---

## API contracts

### `GET /api/health` (schema v1)

Origin: `collectHealthData()` in [`scripts/serve-public.ts`](../scripts/serve-public.ts). Pages Function: [`functions/api/health.ts`](../functions/api/health.ts).

| Field | Type | Notes |
|-------|------|-------|
| `schemaVersion` | `1` | Required; clients warn on mismatch |
| `status` | `'ok' \| 'degraded'` | Topbar dot mapping |
| `env` | object | `{ summary, table, requiredMissingKeys }` |
| `registry` | object | `{ packages, versions }` |
| `artifacts` | object | ops summary, proofs |

### `GET /api/env`

SSOT: [`lib/http/portal-env-status.ts`](../lib/http/portal-env-status.ts) → env-check table (redacted).

| Field | Type |
|-------|------|
| `ok` | boolean |
| `checkedAt` | ISO string |
| `summary` | `{ total, ok, missing, requiredMissing, … }` |
| `table` | `{ Key, Group, Severity, Status, Detail }[]` |

No raw `process.env` on the client.

### `GET /api/content-type`

Content-Type matrix rows for env page CT section.

---

## Component responsibilities

| Module | Role |
|--------|------|
| [`data.js`](../public/portal/data.js) | SWR, backoff, abort, `portal:data`, `startDataService()`, `getHealthData()` |
| [`topbar.js`](../public/portal/topbar.js) | Health dot (rAF + ARIA), lazy sidebar/notif bootstrap |
| [`components/sidebar.js`](../public/portal/components/sidebar.js) | Tenant manifest, `?tenant=` switch, keyboard a11y |
| [`components/notification.js`](../public/portal/components/notification.js) | `<notification-center>` toasts via `/api/channels/events` |
| [`app.js`](../public/portal/app.js) | Registry grid; listens `portal:tenant` |

---

## New page checklist

1. Copy [`public/portal/_page-template.html`](../public/portal/_page-template.html).
2. Include in `<head>` or before `</body>`:
   ```html
   <script type="module" src="/portal/data.js"></script>
   <script type="module" src="/portal/topbar.js"></script>
   ```
3. Use shared topbar nav (Home · Registry · Ops · Catalog · DOD · Health · Env · **Dashboard** · Monitoring · Wiki).
4. Add topbar status: MD link (if applicable) + health link with `#health-dot` / `#health-label`.
5. Subscribe to `portal:data` for data; do not inline-fetch `/api/health` for the dot.
6. Register route in [`scripts/serve-public.ts`](../scripts/serve-public.ts) `buildPublicRoutes()` if needed.
7. Run `bun run verify:portal:static`.

---

## Anti-patterns

| Do not | Do instead |
|--------|------------|
| `fetch('/api/health')` in page scripts (dot) | `portal:data` or `getHealthData()` |
| `process.env` in `public/portal/` | `/api/env` |
| Duplicate topbar health-dot logic | Rely on `topbar.js` |
| Hash for tenant (`#factory`) | `?tenant=factory` (hash is for search filters) |
| Skip `data.js` / `topbar.js` on HTML pages | Required on every portal page |

---

## Verification

```bash
bun run verify:portal:static   # anti-patterns + script includes (no server)
bun run verify:portal          # static + live nav/API (needs serve-public)
```

Wired into `ci:harness` as gate `portal-foundation` and appended to `verify-all` for live checks.

### Local dev: restart when Home shows `{"error":"Package not found"}`

Two stale `serve-public` PIDs on `:3000` can race — the old one treats `/` as an npm package name. Fix:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN | awk 'NR>1 {print $2}' | sort -u | xargs kill -9
bun run serve:public
```

Then `curl -s http://localhost:3000/ | head -1` should show `<!doctype html>`, not JSON.

### Port configuration

`serve-public` omits `port` and `hostname` on `Bun.serve` so bind matches [Bun’s server docs](https://bun.com/docs/runtime/http/server#configuration) mechanically:

| Knob | Behavior |
|------|----------|
| **`port`** | Omitted — Bun resolves `--port` → `BUN_PORT` → `PORT` → `NODE_PORT` → `3000` |
| **`hostname`** | Omitted unless `HOST` / `BIND_HOST` is set (Bun default bind) |
| **Busy default port** | One retry with `port: 0` (ephemeral); startup logs the chosen port |

```bash
bun --port=3099 run serve:public
BUN_PORT=3099 bun run serve:public
HOST=0.0.0.0 bun run serve:public   # optional LAN bind override
bun run verify:portal               # probes resolveBunServeDefaultPort() or PORTAL_VERIFY_BASE
```

Verify helper: `resolveBunServeDefaultPort()` in `lib/http/bun-serve-shape.ts` (includes `--port` for probes only; bind is native Bun).

### Dev reload (`--watch`, `--hot`, browser SSE)

Three independent layers — do not conflate them. See [Bun watch mode](https://bun.com/docs/runtime/watch-mode) and [runtime `--watch`](https://bun.com/docs/runtime#watch).

| Layer | Command / mechanism | Reloads |
|-------|---------------------|---------|
| **Server soft reload** | `bun run serve:public:hot` → `bun --hot scripts/serve-public.ts` | Server TS (`routes`, `fetchHandler`, APIs) without process restart |
| **Server hard restart** | `bun run serve:public:watch` → `bun --watch scripts/serve-public.ts` | Full process (env, cron, DB, SSE hub) |
| **Browser page reload** | SSE `/__hmr` (default on loopback) | `public/` HTML/CSS/JS — full page refresh, not bundler HMR |

**Bun flags must come immediately after `bun`**, not after `run` or the script name ([docs](https://bun.com/docs/runtime#watch)):

```bash
# ✅ Correct
bun --hot scripts/serve-public.ts
bun --watch scripts/serve-public.ts
bun --port=3099 --hot run serve:public
bun run serve:public:hot      # safe: --hot is inside the npm script definition

# ❌ Wrong — flag ignored by Bun, passed to the script
bun run serve:public --watch
bun run serve:public:hot --hot
```

**Day-to-day:** `bun run serve:public:hot` for server edits; browser updates for static portal files come from SSE. Use `--watch` when you need a clean process restart.

Disable browser SSE: `SERVE_PUBLIC_HMR=0`. Force on when bound `0.0.0.0`: `SERVE_PUBLIC_HMR=1` or `HOST=127.0.0.1`.

**Verification:** `bun run verify:flag-order` scans all `package.json` scripts for `bun run --watch|--hot` (anti-pattern). Grandfathered entries live in `tools/verify-script-flags-baseline.json`; new violations fail CI/`verify-all`. Use `--strict` for a repo-wide cleanup pass.
