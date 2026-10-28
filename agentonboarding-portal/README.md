# Agent Onboarding Portal

Enhanced Agent Dashboard (SPA) + Bun backend for the automation portal.
Single-file frontend (`index.html`), single-file backend (`server.ts`), pluggable
automation driver (`driver/`) with a real `Bun.WebView` mode and an offline mock.

Requires **Bun >= 1.3.12** (for `Bun.WebView`; `Bun.CSRF` needs >= 1.2.5).
Developed and verified against **Bun 1.3.14**.

## Quick start

```bash
bun install          # bun-types for typechecking
bun server.ts        # starts http://localhost:3000 (default driver: mock, exec: worker)
```

Open <http://localhost:3000> — the backend serves the SPA at `/`.
Any username/password works on first login (demo auto-provision via `Bun.password.hash`).
Dev mode with hot reload: `bun run dev`. Prod: `bun run start` (NODE_ENV=production).
Copy `.env.example` → `.env` and fill in `MASTER_KEY` before real use; Bun auto-loads
`.env`, `.env.local` and `.env.{NODE_ENV}`.

### Task execution modes (`AUTOMATION_EXEC`)

| Mode | Behavior |
|------|----------|
| `worker` (default) | Each task runs in a child process: `Bun.spawn({ cmd: ["bun", "worker.ts", taskId], ipc, onExit, timeout, killSignal })`. The worker runs the automation via the shared driver layer, persists the session to SQLite and reports progress over IPC (`process.send`); the parent observes IPC (`LOG_LEVEL=debug`) and marks a task `failed` in `onExit` when the worker exits non-zero while still pending (e.g. `WORKER_TIMEOUT_MS` kill). Crashes stay isolated from the server process. |
| `inline` | `processTask()` runs in-process (previous behavior). Required to keep the driver alive so `/live` can stream **real** frames from a completed session's WebView. |

> `/live` caveat: in `worker` mode the automation runs in a separate process, so the server cannot drive its WebView — `/live` streams mock frames unless you run `AUTOMATION_EXEC=inline`.

### Driver modes

| `AUTOMATION_DRIVER` | Behavior |
|---------------------|----------|
| `mock` (default)    | Simulated task timeline + fake snapshots; runs anywhere, offline |
| `webview`           | Real headless automation via `Bun.WebView` (Chrome backend) |

```bash
AUTOMATION_DRIVER=webview MASTER_KEY=change-me bun server.ts
```

## Layout

```
index.html        SPA: login, tasks (progress), sessions (expiry), credentials, live control, verify
server.ts         Bun.serve backend: routing, CSRF, auth, sqlite CRUD, WebSocket /live, cron, worker spawner
worker.ts         Task worker (Bun.spawn child): automation via driver layer + IPC progress reporting
lib/shared.ts     Shared config, AES-GCM crypto, sqlite schema, selectors (used by server + worker)
driver/types.ts   AutomationDriver interface + LoginSelectors + SITE_SELECTORS parser
driver/webview-driver.ts   Bun.WebView driver (evaluate-polling waitForSelector, click-to-focus typing)
driver/mock-driver.ts      simulated steps + valid 1x1 PNG frames
driver/factory.ts          env-based driver selection, mock fallback
.env.example      Environment template (never commit real .env files)
```

## Endpoint contract

All state-changing routes require `X-CSRF-Token` (fetched from `GET /csrf-token`).
All routes except `/csrf-token`, `/login`, static files and the `/live` WebSocket
require the `dashboard_session` cookie (set on login).

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/csrf-token` | Per-session CSRF token (`Bun.CSRF.generate(secret, { sessionId })`) |
| POST | `/login` | Agent auth (`Bun.password.verify`; auto-provisions on first login) |
| POST | `/task` | Submit task `{ url, username, password, location, proxy }` → `{ id }` |
| GET | `/tasks` | Task list: `{ id, site, status, sessionId, progress, progressMessage, createdAt }` |
| GET | `/sessions` | Session list incl. `lastHealthy`, `expiresAt` |
| GET | `/session/:id` | Session detail + cookies + action logs |
| POST | `/session/:id/refresh` | Re-run the task (re-login) |
| POST | `/session/:id/close` | Close session |
| GET | `/credentials` | Saved credentials `{ id, site, username }` (never the password) |
| POST | `/credentials` | Save credential `{ site, username, password }` |
| PUT | `/credentials/:site` | Edit username and/or password |
| DELETE | `/credentials/:site` | Delete credential |
| POST | `/credentials/:site/login` | Single-click login: enqueue a task from stored creds |
| GET | `/verify` | IP (via `server.requestIP`), location, user-agent, `Bun.hash` fingerprint |
| GET | `/health` | Public: status, uptime, exec/driver mode, `nextHealthCheck` via `Bun.cron.parse` |
| WS | `/live?sessionId=…` | Frame streaming + input forwarding (click/press/evaluate) |
| GET | `/screenshots/*` | Captured PNG screenshots |

## Environment variables

| Env | Default | Purpose |
|-----|---------|---------|
| `PORT` | `3000` | Listen port |
| `MASTER_KEY` | dev default (warns) | AES-256-GCM key for stored passwords (`encrypt`/`decrypt`) |
| `MASTER_KEY_SOURCE` | `env` | `env` \| `secrets` (load/create the key in the OS keychain via `Bun.secrets`; falls back to env) |
| `SECRETS_SERVICE` | `bun-automation` | Keychain service name for `Bun.secrets` |
| `AUTOMATION_DRIVER` | `mock` | `mock` \| `webview` |
| `AUTOMATION_EXEC` | `worker` | `worker` (Bun.spawn child) \| `inline` (in-process, keeps /live drivers) |
| `WORKER_TIMEOUT_MS` | `120000` | Kill worker after this long (0 disables); `killSignal: SIGTERM` |
| `NODE_ENV` | — | Drives `.env.{NODE_ENV}` loading + `bun run start/dev` scripts |
| `LOG_LEVEL` | `info` | `debug` shows IPC progress lines from workers |
| `DB_PATH` | `agent-portal.db` | SQLite file |
| `SCREENSHOT_DIR` | `screenshots` | Screenshot + thumbnail output |
| `SITE_SELECTORS` | defaults | Per-site login selectors, `site:user,pass,submit,success;site2:…` |
| `USE_HTTPS` | `false` | Cookie `secure` flag + TLS hooks |
| `WEBVIEW_USER_AGENT` | — | UA override for the WebView driver (CDP) |
| `BUN_OPTIONS` | — | Prepend CLI args (e.g. `--hot`) — used by `bun run dev` |
| `PROXY_POOL_URL` | — | Reserved: proxy-pool endpoint for future proxy integration |

## Bun APIs used (with canonical refs)

- `Bun.serve` + `server.upgrade` + `ServerWebSocket` — https://bun.com/docs/runtime/http · websockets
- `Bun.spawn` (`cmd`/`env`/`ipc`/`onExit`/`timeout`/`killSignal`) — https://bun.com/docs/runtime/spawn
- `Bun.CSRF` — https://bun.com/docs/runtime/csrf
- `Bun.CookieMap` — https://bun.com/docs/runtime/cookies
- `Bun.password` — https://bun.com/docs/runtime/password
- `bun:sqlite` — https://bun.com/docs/runtime/sqlite
- `Bun.WebView` (experimental) — https://bun.com/docs/runtime/webview
- `Bun.Image` — https://bun.com/docs/runtime/image
- `Bun.cron` + `Bun.cron.parse` (next-run) + `{ tz }` option — https://bun.com/docs/runtime/cron
- `Bun.secrets` (experimental, `MASTER_KEY_SOURCE=secrets`) — https://bun.com/docs/runtime/secrets
- `console` `%j` structured logging (debug worker/IPC traces) — https://bun.com/docs/runtime/console
- `Bun.hash`, `Bun.write`, `Bun.file`, `Bun.sleep` — https://bun.com/docs/runtime/bun

## Known gaps / notes

- **`Bun.WebView` is experimental** (since 1.3.12), headless-only, and the
  constructor has **no proxy/argv option** — proxy support is not available via
  the WebView API; set `AUTOMATION_DRIVER=mock` when you don't need a real browser.
- **Login selectors are site-specific** — the defaults (`input[name='username']`,
  `input[name='password']`, submit, `#dashboard`-style success marker) are
  best-effort; configure `SITE_SELECTORS` for real target sites. WebView has no
  `waitForSelector`/`type(selector)` — the driver emulates them with
  `evaluate` polling and click-to-focus typing.
- `processTask` keeps the completed driver alive (in memory) so `/live` can
  stream real frames — **inline mode only**; in worker mode the automation
  lives in a child process and `/live` streams mock frames.
- `MASTER_KEY_SOURCE=secrets` uses `Bun.secrets` (experimental, user-scoped OS
  keychain) — suitable for local/dev; production should keep `MASTER_KEY` in
  the environment or a dedicated secrets manager (AWS Secrets Manager, Vault),
  since the keychain does not scale across servers. Falls back to the env var
  when the keychain is unavailable (e.g. TCC-blocked sandboxes).
- Workers are spawned per task (`Bun.spawn`) — a worker pool / semaphore,
  health-check restarts and `Bun.Queue`-style native queuing remain future work
  (see the proposal's "Next Steps"). Workers share the SQLite DB (WAL), and
  `MASTER_KEY` is inherited via `env: { ...process.env }`.
- The `/live` WebSocket authenticates by unguessable `sessionId` (browser WS
  clients don't send the dashboard cookie cross-origin).
- CSRF secret lives in the `dashboard_sessions` row; tokens are bound to the
  session id. For multi-instance deployments share `MASTER_KEY` and move the
  session store to Redis (see "Distributed locking" gap in the design doc).
