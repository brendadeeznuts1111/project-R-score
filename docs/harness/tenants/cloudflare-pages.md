# Tenant: cloudflare-pages

**Tenant** `cloudflare-pages` (Git-integrated Pages · not `deploy:production`)  
**Project** `project-r-score` → https://project-r-score.pages.dev  
**Custom domain** `score.factory-wager.com` (Pages project domain attached; **needs zone DNS CNAME**)  
**Proof** `cloudflare-pages-env-ssot`  
**Owner** [`config/r2-env.ts`](../../../config/r2-env.ts) · [`.env.example`](../../../.env.example)

## Signal (failure)

GitHub check **Cloudflare Pages** fails, or `bun test tests/r2-env.test.ts` / `bun run cloudflare:env` disagree with live pins.

Common root causes:

1. Pages tried to install `bun@1.4.0` from root `packageManager` (canary) → GitHub release **404**
2. `destination_dir` was `/` (monorepo symlinks) → asset validation failed
3. Dashboard env lost `BUN_VERSION` / `SKIP_DEPENDENCY_INSTALL`

## Intervention (repair)

1. Confirm SSOT: `bun run cloudflare:env` and `bun test tests/r2-env.test.ts`
2. Pages → Settings → Environment variables (prod + preview):
   - `BUN_VERSION=1.3.14`
   - `SKIP_DEPENDENCY_INSTALL=true`
3. Build settings: command `exit 0`, output directory `public`, production branch `main`
4. Retry the failed deployment (dashboard or API). Do **not** pin local `packageManager` to 1.3.14 to “fix” Pages.
5. Local pin check (no API): `bun run cloudflare:env:assert`
6. Apex HTTP check (no API token): `bun run cloudflare:env:assert-apex`
7. Live dashboard drift + apex (API token or wrangler OAuth): `bun run cloudflare:env:assert-live`
8. Token scope probe (Layer 2 — permissions + Pages/zone reachability): `bun run cloudflare:env:validate`

### Token permissions (Layer 2)

MCP HTTP servers in [`.mcp.json`](../../../.mcp.json) send `Authorization: Bearer ${CLOUDFLARE_API_TOKEN}` to Cloudflare-hosted endpoints. **There is no Cloudflare Access or Worker proxy** — the only runtime boundary is the token minted in the [Cloudflare dashboard](https://dash.cloudflare.com/profile/api-tokens).

**Operational confidence vs runtime authorization:** Harness commands (`cloudflare:env:assert-live`, `cloudflare:env:validate`) prove local pins and declared token scope. They do **not** restrict what MCP can do at runtime — that remains dashboard-only.

SSOT: [`CLOUDFLARE_TOKEN_PERMISSIONS`](../../../config/r2-env.ts) in `config/r2-env.ts`.

| Tier | Permissions | Use |
|------|-------------|-----|
| **Minimal** | Cloudflare Pages:Read + Edit (project `project-r-score`), Zone:Read + DNS:Edit (`factory-wager.com`) | `assert-live`, DNS CNAME script, Pages deploy repair |
| **MCP-full** | Minimal + Workers Scripts/R2/Observability read (as needed for optional MCP servers) | All five HTTP MCP servers in `.mcp.json` |

**Why not mint through MCP?** Hosted MCP servers consume `Authorization: Bearer ${CLOUDFLARE_API_TOKEN}` — they do not expose token creation. Minting requires the [dashboard](https://dash.cloudflare.com/profile/api-tokens) (human authority boundary); `cloudflare:env:validate` proves the mint worked (operational confidence).

**Token kinds:** User tokens (`cfut_…`) verify at `/user/tokens/verify` and return permission policies. **Account tokens** (`cfat_…`, Manage Account → API Tokens) verify at `/accounts/{account_id}/tokens/verify` — validate uses probe-based scope for those (Pages + zone API), which matches why `assert-live` can pass while an old user-verify curl fails.

| Aspect | Dashboard | MCP |
|--------|-----------|-----|
| Mint new token | Yes — human-only, auditable | No — not exposed |
| Narrow scope | Yes — explicit resources/permissions | No — behaviour follows token only |
| Validate scope | Manual | `bun run cloudflare:env:validate` (+ `--strict`) |
| Rotate tokens | Dashboard | No |

#### Dashboard checklist (copy-paste)

Open **[Cloudflare → My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens)** → **Create Token** → **Create Custom Token**.

**1. Token name**

```
MCP-Portal-Scoped
```

(or any label you will recognize at rotation time)

**2. Permissions — minimal harness tier**

| Resource type | Permission | Resource restriction |
|---------------|------------|-------------------|
| Account → `7a470541a704caaf91e71efccc78fd36` | **Cloudflare Pages** → Read | **Specific project** → `project-r-score` |
| Account → `7a470541a704caaf91e71efccc78fd36` | **Cloudflare Pages** → Edit | **Specific project** → `project-r-score` |
| Zone → `factory-wager.com` | **Zone** → Read | *(inherits zone restriction)* |
| Zone → `factory-wager.com` | **DNS** → Edit | *(inherits zone restriction)* |

Pages **Read** is required for `cloudflare:env:assert-live` and the Pages probe inside `cloudflare:env:validate` (GET project settings). Edit alone is not enough for the harness gates.

If you use **all five** HTTP MCP servers in [`.mcp.json`](../../../.mcp.json) (`cloudflare`, `cloudflare-docs`, `cloudflare-bindings`, `cloudflare-builds`, `cloudflare-observability`), add the **MCP-full** extras from [`CLOUDFLARE_TOKEN_PERMISSIONS.mcpOptional`](../../../config/r2-env.ts) (Workers Scripts/R2/Observability as needed). Minimal tier is sufficient for Pages + DNS CNAME work only.

**3. Account resources**

- Include **only** account `7a470541a704caaf91e71efccc78fd36`
- Not “All accounts”

**4. Zone resources**

- Include **only** zone `factory-wager.com`
- Not “All zones”

**5. TTL**

- 1 year (or your rotation policy). Shorter if you rotate often.

**6. Create and copy**

- **Create Token** → copy the value immediately (shown once).

**7. Store**

```bash
# Reasonix / Cursor (AGENTS.md default)
echo 'CLOUDFLARE_API_TOKEN=…' >> ~/.reasonix/.env

# Or project .env for CI
# Guided setup: bash scripts/cloudflare-env-setup.sh
```

**8. Verify**

```bash
bun run cloudflare:env:validate
bun run cloudflare:env:validate --strict   # fail if permissions are over-broad
bun run verify:cloudflare-token:save       # optional proof artifact (live probe when token set)
bun run cloudflare:preflight               # static gate before deploy (well-known + edge safety)
```

**9. Deploy + smoke (prefer MCP or CLI — no manual curl polling)**

```bash
bun run cloudflare:deploy:verify           # trigger → poll → core edge checks
curl https://project-r-score.pages.dev/.well-known/mcp.json
```

Use Cloudflare MCP `execute` in Cursor to inspect failed builds (`deployments/{id}/history/logs`) when `cloudflare:deploy:verify` fails at the build stage. **Do not** import `lib/verification/*` or `lib/types/branded.ts` from `config/r2-env.ts` — Pages Functions bundle it transitively (`repo-docs` ← `functions/api/*/script.ts`).

| Script | Role |
|--------|------|
| `cloudflare:preflight` | Static: well-known parity, token proof (no live), edge-safety test |
| `cloudflare:deploy` | Trigger deploy only |
| `cloudflare:deploy:wait` | Trigger + poll until success/failure (log tail on fail) |
| `cloudflare:deploy:verify` | Wait + `verify:pages-edge` (core checks; `--taxonomy` for full 13-contract gate) |
| `cloudflare:deploy:verify:taxonomy` | Wait + full edge taxonomy gate |
| `cloudflare:publish` | `ops:snapshot` → registry git gate → optional `--commit --push` → deploy + taxonomy |
| `cloudflare:publish:push` | Same with commit + push |

Discovery manifest (Layer 5): `/.well-known/mcp.json` on Pages (see [`public/.well-known/mcp.json`](../../../public/.well-known/mcp.json)). Regenerate: `bun run sync:well-known-mcp`. Proof artifact: `bun run verify:cloudflare-token:save` → [`public/registry/cloudflare-token-scope-proof.json`](../../../public/registry/cloudflare-token-scope-proof.json).

Publish surface is `public/` (includes `index.html` + registry/robots/sitemaps + portal) plus root `functions/` (Pages Functions). Apex 404 means `index.html` is missing from that dir. Pack/release/changelog R2 URLs resolve via `r2BucketUrlFromEnv()` in `config/r2-env.ts`. Registry apps import root `lib/` / `config/` at **7** `../` levels from `apps/*/src` and `packages/*/src`.

### Ops portal + prediction (static)

| Path | Asset |
|------|--------|
| `/portal/ops/` | Operations dashboard (experiments + prediction + TOC rollup card) |
| `/portal/toc/` | TOC Ops board (fixture Drum/Buffer/Rope · Soft/Gate 12) |
| `/registry/toc-ops.json` | Baked TOC fixture (`bun run ops:seed:toc` / `ops:snapshot`) |
| `/api/toc` | Pages Function GET snapshot; POST → 503 (mutations = toc-ops-repo `ct`) |
| `/registry/ops-summary.json` | Snapshot from `bun run ops:snapshot` (includes optional `toc` slice) |
| `/registry/proof-taxonomy-audit.json` | Subsystem contracts + cross-proof consistency |
| `/registry/prediction/report.html` | Backtest report (+ `coverage-chart.svg`) |

TOC tenant runbook: [`toc-ops.md`](toc-ops.md). **MCP does not serve TOC desk data** — use MCP for Pages deploy/logs; use `/portal/toc` or `ct` for partner ops.

**Do not enable Pages “Single-page application” rewrites** (`/* → /index.html 200`). That serves the landing shell for every path (including `.json`) and hides the portal. Prefer real files + `public/_redirects` (trailing-slash only) + `public/_headers` (JSON content-type).

Before deploy (or in CI):

```bash
bun run ops:prediction backtest --from 2024-01-01 --to 2024-12-31   # optional
bun run ops:snapshot   # summary JSON + prediction SVG/HTML under public/registry/
```

Local ops station chart PNG (optional): `bun run ops:prediction report --webview` (Bun.WebView screenshot → Bun.Image).

### Pages Functions (edge-safe only)

Root `functions/` is bundled by Wrangler for Workers — **no `bun:sqlite`**, **no `import 'bun'`**, **no `lib/verification/*` via `config/r2-env.ts`**. Guards: `tests/functions-edge-safety.test.ts` · `tests/functions-import-graph.test.ts` (static allowlist in `lib/verification/cloudflare-pages-preflight.ts`).

**Allowed transitive imports (2026-07):** `lib/http/verification-scripts.ts` → `sha256.ts` + `repo-docs.ts` → `config/r2-env.ts`; `lib/http/portal-env-edge.ts`; `lib/factory/http-keys.ts`. Full inventory:

| Path | Role |
|------|------|
| `functions/api/operations/summary.ts` | Serves `public/registry/ops-summary.json` (C4/C5 portal data) |
| `functions/api/registry/[[path]].ts` | R2 registry proxy (`REGISTRY_BUCKET` binding) |
| `functions/api/telegram/webhook/[[tenant]].ts` | Telegram edge enqueue → R2 `telegram-updates` (needs `TELEGRAM_WEBHOOK_SECRET`) |
| `functions/api/registry/health.ts` | Registry health probe |
| `functions/api/health.ts` | Portal health schema v1 (`/api/health`) |
| `functions/health/index.ts` | Same snapshot as JSON at `/health` |
| `functions/health/pre.ts` | Plain-text diagnostics at `/health/pre` (curl / Accept: text/plain) |
| `lib/http/portal-health-edge.ts` | Shared edge collect + plain renderer + ETag |
| `functions/api/env.ts` | Env-check table (redacted) |
| `functions/api/monitoring.ts` | Monitoring snapshot |
| `functions/api/content-type.ts` | Content-Type matrix |
| `functions/api/proof.ts` | Proof metadata |
| `functions/api/defaults.ts` · `defaults/script.ts` | Defaults proof scripts |
| `functions/api/networking/script.ts` · `script.meta.ts` | Networking proof scripts |
| `functions/api/release/script.ts` · `script.meta.ts` | Release proof scripts |
| `functions/api/doc-refs/index.ts` · `script.ts` · `script.meta.ts` | Doc refs API |
| `functions/api/sqlite/version.ts` | SQLite version (edge-safe) |
| `functions-bun-only/` | Local Bun handlers (auth/DOD/catalog) — **not** deployed to Pages |

Static routing: [`public/_redirects`](../../../public/_redirects) (trailing-slash 301 only) · [`public/_headers`](../../../public/_headers) (JSON content-type, cache). **No SPA rewrite.**

Routing map: [`docs/platform-routing.md`](../../platform-routing.md).

Ops experiments/prediction on the portal:

1. Local: `bun run ops:snapshot` → writes `public/registry/ops-summary.json`
2. Commit/deploy: GitHub → Pages (or `bun run cloudflare:deploy`)
3. Live: https://project-r-score.pages.dev/portal/ops/ and `/api/operations/summary`

**Submodule:** `Kalshi-bot` gitlink must resolve on GitHub or Pages `clone_repo` fails.

### Custom domain: `score.factory-wager.com`

Pages project domain is registered. **Activate DNS** (token needs Zone.DNS Edit):

```bash
bash scripts/cloudflare-pages-domain-dns.sh
# or manually in Cloudflare DNS for factory-wager.com:
#   CNAME  score  →  project-r-score.pages.dev  (proxied)
```

Until DNS exists, use:

| Surface | URL |
|---------|-----|
| Pages production | https://project-r-score.pages.dev/ |
| Ops dashboard (C4/C5) | https://project-r-score.pages.dev/portal/ops/ |
| Ops summary API | https://project-r-score.pages.dev/api/operations/summary |
| Ops summary static | https://project-r-score.pages.dev/registry/ops-summary.json |

`wiki.factory-wager.com` remains **GitHub Pages** (separate content). Do not repoint it without a deliberate content migration.

### Factory registry portal (claim `factory-registry-pages-proxy-v1`)

1. Pages → Settings → Bindings → R2: `REGISTRY_BUCKET` → `factory-wager-registry`  
   (also declared in root [`wrangler.toml`](../../../wrangler.toml) for Pages Functions).
2. Env `REGISTRY_CORS_ORIGINS` (prod+preview):  
   `https://factory-wager.com,https://project-r-score.pages.dev,https://score.factory-wager.com,https://wiki.factory-wager.com`
3. Do **not** put `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` on the Pages Function for `/api/registry` — the proxy uses the R2 binding.
4. CLI publish/install still needs local R2 S3 keys (`bun run factory:env`) via SigV4 `S3Client`.
5. Portal static fallback: `bun run factory:snapshot` → `public/registry/registry.json` (committed empty seed; refresh after publishes).

This is **not** `bun run deploy:production` (Bun.secrets + R2). Root `wrangler.toml` is Worker `tier1380-production`, not Pages. R2 S3 keys ≠ `CLOUDFLARE_API_TOKEN` (`requireR2Config` vs `requireCloudflareApiToken`). Never hardcode R2 access keys in scripts — use env / Bun.secrets / `requireR2Config`.

## Retirement

Remove when `project-r-score` is disconnected from Git or replaced by an in-repo Pages project with its own Wrangler config under `config/cloudflare/` (not root).

**Retirement verified** `false`  
**Retirement check** `bun test tests/r2-env.test.ts`

**Owner** `// owner: platform / cloudflare-pages`  
**Fresh-rerun** `bun test tests/r2-env.test.ts`

### Live proof (ops portal)

After deploy (SPA rewrite **off**, output dir `public`):

```bash
curl -sS -o /dev/null -w "%{http_code} %{content_type}\n" https://project-r-score.pages.dev/portal/ops/
curl -sS -o /dev/null -w "%{http_code} %{content_type}\n" https://project-r-score.pages.dev/registry/ops-summary.json
curl -sS -o /dev/null -w "%{http_code} %{content_type}\n" https://project-r-score.pages.dev/registry/prediction/coverage-chart.svg
curl -sS -o /dev/null -w "%{http_code} %{content_type}\n" https://project-r-score.pages.dev/portal/data.js
bun run verify:pages-edge
```

Expect: ops HTML title `Operations · FactoryWager`; JSON `application/json`; SVG `image/svg+xml` (not the landing-page HTML shell).
