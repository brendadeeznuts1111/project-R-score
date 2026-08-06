# Tenant: cloudflare-pages

**Tenant** `cloudflare-pages` (Git-integrated Pages · not `deploy:production`)  
**Project** `project-r-score` → https://project-r-score.pages.dev  
**Custom domain** `score.factory-wager.com` (live · proxied; CNAME `score` → `project-r-score.pages.dev`)  
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
3. Build settings: command `bun tools/optimize-portal-assets.ts --no-report`, output directory `tmp/pages-optimized`, production branch `main`
4. Retry the failed deployment (dashboard or API). Do **not** pin local `packageManager` to 1.3.14 to “fix” Pages.
5. Local pin check (no API): `bun run cloudflare:env:assert`
6. Apex HTTP check (no API token): `bun run cloudflare:env:assert-apex`
7. Live dashboard drift + apex (API token or wrangler OAuth): `bun run cloudflare:env:assert-live`
8. Token scope probe (Layer 2 — permissions + Pages/zone reachability): `bun run cloudflare:env:validate`

### Token permissions (Layer 2)

MCP HTTP servers in [`.mcp.json`](../../../.mcp.json) send `Authorization: Bearer ${CLOUDFLARE_API_TOKEN}` to Cloudflare-hosted endpoints. **There is no Cloudflare Access or Worker proxy** — the only runtime boundary is the token minted in the [Cloudflare dashboard](https://dash.cloudflare.com/profile/api-tokens).

**Cursor vs VS Code auth:** Cursor reads `.mcp.json` directly and resolves the token via `envFile` (project `.env`) + `${CLOUDFLARE_API_TOKEN}`. VS Code uses generated [`.vscode/mcp.json`](../../../.vscode/mcp.json) (`bun run mcp:sync`) — HTTP servers have no `envFile` in the VS Code schema, so sync rewrites Cloudflare headers to `Bearer ${input:cloudflare-api-token}` (prompt once; IDE stores the value).

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

**7. Store (Proton Pass only — vault SSOT)**

```bash
# After mint: put the value in Proton Pass item
#   pass://factorywager/Cloudflare API Token/password
# Never echo tokens into shell history or treat ~/.reasonix/.env as authority.

# Resolve vault → project .env + derived ~/.reasonix/.env (strips duplicate CF lines)
bun run proton:inject:factorywager:reasonix

# Or guided inject + verify + harness gates
bash scripts/cloudflare-env-setup.sh
```

Full vault map: [`docs/harness/tenants/proton-integration.md`](./proton-integration.md).

**8. Verify**

```bash
# Account tokens (cfat_…) fail /user/tokens/verify by design — use account path or:
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
| `cloudflare:deploy:verify` | Wait + `verify:pages-edge` + live Tennis SSOT tarball parity (core checks; `--taxonomy` for full 13-contract gate) |
| `cloudflare:deploy:verify:taxonomy` | Wait + full edge taxonomy gate |
| `verify:weave` | Post-deploy weave smoke (`portal-weave.json` surfaces/artifacts/components); SSOT [`lib/verification/pages-edge-weave.ts`](../../../lib/verification/pages-edge-weave.ts) |
| `cloudflare:publish` | `ops:snapshot` → registry git gate → optional `--commit --push` → deploy + taxonomy |
| `cloudflare:publish:push` | Same with commit + push |

Discovery manifest (Layer 5): `/.well-known/mcp.json` on Pages (see [`public/.well-known/mcp.json`](../../../public/.well-known/mcp.json)). Regenerate: `bun run sync:well-known-mcp`. Proof artifact: `bun run verify:cloudflare-token:save` → [`public/registry/cloudflare-token-scope-proof.json`](../../../public/registry/cloudflare-token-scope-proof.json).

`verify:pages-edge` also checks the shared browser-security header contract on a
static asset and a Pages Function response. `_headers` does not apply to
Functions, so both checks are required. The shared contract also restricts
form targets and frames through CSP and disables unused motion, capture, camera,
location, microphone, payment, and USB capabilities through Permissions Policy.
Portal asset checks accept an unauthenticated Cloudflare Access 302 as protected;
public-plane header probes add a cache-busting query so a just-deployed contract
is not compared with a stale 60-second registry response.

### Local CI and Pages deploys

GitHub Actions is disabled repository-wide; `bun run bun:ci` is the merge proof.
Cloudflare Pages remains an external Git integration and continues to build
commits without GitHub-hosted runners. Do not use `[CI Skip]` or `[Skip CI]`
when a Pages preview or production deployment is required because Cloudflare
reserves those prefixes as deployment skips.

Publish source is `public/` (includes `index.html` + registry/robots/sitemaps + portal); `portal:optimize` copies and minifies it into the Pages output `tmp/pages-optimized`. Root `functions/` remains the Pages Functions source. Apex 404 means `index.html` is missing from the output dir. Pack/release/changelog R2 URLs resolve via `r2BucketUrlFromEnv()` in `config/r2-env.ts`. Registry apps import root `lib/` / `config/` at **7** `../` levels from `apps/*/src` and `packages/*/src`.

### Ops portal + prediction (static)

| Path | Asset |
|------|--------|
| `/portal/ops/` | Operations dashboard (experiments + prediction + TOC rollup card) |
| `/portal/toc/` | TOC Ops board (fixture Drum/Buffer/Rope · Soft/Gate 12) |
| `/registry/toc-ops.json` | Baked TOC fixture (`bun run ops:seed:toc` / `ops:snapshot`) |
| `/api/toc` | Pages Function GET snapshot; POST → 503 (mutations = toc-ops-repo `ct`) |
| `/registry/ops-summary.json` | Snapshot from `bun run ops:snapshot` (includes optional `toc` slice) |
| `/registry/proof-taxonomy-audit.json` | Subsystem contracts + cross-proof consistency |
| `/registry/prediction/report/` | Backtest report (+ `coverage-chart.svg`); legacy `report.html` → 301 |

TOC tenant runbook: [`toc-ops.md`](toc-ops.md). **MCP does not serve TOC desk data** — use MCP for Pages deploy/logs; use `/portal/toc` or `ct` for partner ops.

**Do not enable Pages “Single-page application” rewrites** (`/* → /index.html 200`). That serves the landing shell for every path (including `.json`) and hides the portal. Prefer real files + `public/_redirects` (trailing-slash only) + `public/_headers` (JSON content-type and static security headers). Root `functions/_middleware.ts` applies the same browser-security contract to Pages Functions while preserving route CORS and cache headers.

Before deploy (or in CI):

```bash
bun run ops:prediction backtest --from 2024-01-01 --to 2024-12-31   # optional
bun run ops:snapshot   # summary JSON + prediction SVG/HTML under public/registry/
```

Local ops station chart PNG (optional): `bun run ops:prediction report --webview` (Bun.WebView screenshot → Bun.Image).

### Pages Functions (edge-safe only)

Root `functions/` is bundled by Wrangler for Workers — **no `bun:sqlite`**, **no `import 'bun'`**, **no `lib/verification/*` via `config/r2-env.ts`**. Guards: `tests/functions-edge-safety.test.ts` · `tests/functions-import-graph.test.ts` (static allowlist in `lib/verification/cloudflare-pages-preflight.ts`).

**Allowed transitive imports (2026-07):** `lib/http/verification-scripts.ts` → `sha256.ts` + `repo-docs.ts` → `config/r2-env.ts`; `lib/http/portal-env-edge.ts`; `lib/factory/http-keys.ts`. Key inventory:

| Path | Role |
|------|------|
| `functions/_middleware.ts` | Applies the shared browser-security headers to Pages Function responses |
| `functions/api/operations/summary.ts` | Serves `public/registry/ops-summary.json` (C4/C5 portal data) |
| `functions/api/agents/v1/limits/raises.ts` | Serves limit raises and CSV/JSONL betlog exports |
| `functions/api/registry/[[path]].ts` | R2 registry proxy (`REGISTRY_BUCKET` binding) |
| `functions/api/telegram/webhook/[[tenant]].ts` | Telegram edge enqueue → R2 `telegram-updates` (needs `TELEGRAM_WEBHOOK_SECRET`) |
| `functions/api/registry/health.ts` | Registry health probe |
| `functions/api/health.ts` | Portal health schema v1 (`/api/health`) |
| `functions/health/index.ts` | Same snapshot as JSON at `/health` |
| `functions/health/pre.ts` | Plain-text diagnostics at `/health/pre` (curl / Accept: text/plain) |
| `lib/http/portal-health-edge.ts` | Shared edge collect + plain renderer + ETag |
| `lib/http/cloudflare-security-headers.ts` | Shared static/Function browser-security header contract |
| `lib/operations/limit-betlog-export.ts` | Edge-safe betlog export formatter used by the raises route |
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

Static routing: [`public/_redirects`](../../../public/_redirects) (trailing-slash 301 only) · [`public/_headers`](../../../public/_headers) (JSON content-type, cache, security headers) · [`functions/_middleware.ts`](../../../functions/_middleware.ts) (edge parity). **No SPA rewrite.**

Preview deployments are public by default. Protect them with Workers & Pages →
`project-r-score` → Settings → General → Enable access policy. This Pages-owned
control protects branch/hash previews without altering the production
`project-r-score.pages.dev` or custom domains. Confirm a real preview returns an
Access 302; `bun run cloudflare:access:edge:validate` discovers and checks the
newest preview. See [`cloudflare-access.md`](cloudflare-access.md).

Routing map: [`docs/platform-routing.md`](../../platform-routing.md).

Ops experiments/prediction on the portal:

1. Local: `bun run ops:snapshot` → writes `public/registry/ops-summary.json`
2. Commit/deploy: GitHub → Pages (or `bun run cloudflare:deploy`)
3. Live: https://project-r-score.pages.dev/portal/ops/ and `/api/operations/summary`

**Submodule:** `Kalshi-bot` gitlink must resolve on GitHub or Pages `clone_repo` fails.

### Custom domain: `score.factory-wager.com`

Custom domain is **live** (HTTP 200 on apex; portal paths may 302 Access). **Verify or repair DNS** if drift appears (token needs Zone.DNS Edit):

```bash
bash scripts/cloudflare-pages-domain-dns.sh
# or manually in Cloudflare DNS for factory-wager.com:
#   CNAME  score  →  project-r-score.pages.dev  (proxied)
```

| Surface | URL |
|---------|-----|
| Production (custom) | https://score.factory-wager.com/ |
| Pages hostname | https://project-r-score.pages.dev/ |
| Ops dashboard (C4/C5) | https://score.factory-wager.com/portal/ops/ (or pages.dev) |
| Ops summary API | https://score.factory-wager.com/api/operations/summary |
| Ops summary static | https://score.factory-wager.com/registry/ops-summary.json |

`wiki.factory-wager.com` remains **GitHub Pages** (separate content). Do not repoint it without a deliberate content migration.

### Factory registry portal (claim `factory-registry-pages-proxy-v1`)

1. Pages → Settings → Bindings → R2: `REGISTRY_BUCKET` → `factory-wager-registry`  
   (also declared in root [`wrangler.toml`](../../../wrangler.toml) for Pages Functions).
2. Env `REGISTRY_CORS_ORIGINS` (prod+preview):  
   `https://factory-wager.com,https://project-r-score.pages.dev,https://score.factory-wager.com,https://wiki.factory-wager.com`
3. Do **not** put `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` on the Pages Function for `/api/registry` — the proxy uses the R2 binding.
4. CLI publish/install still needs local R2 S3 keys (`bun run factory:env`) via SigV4 `S3Client`.
5. Portal static fallback: `bun run factory:snapshot` → `public/registry/registry.json` (committed empty seed; refresh after publishes).

This is **not** `bun run deploy:production` (Bun.secrets + R2). Root [`wrangler.toml`](../../../wrangler.toml) is now the `project-r-score` Pages Functions config (`name = "project-r-score"`) — there is no `tier1380-production` Worker at repo root. R2 S3 keys ≠ `CLOUDFLARE_API_TOKEN` (`requireR2Config` vs `requireCloudflareApiToken`). Never hardcode R2 access keys in scripts — use env / Bun.secrets / `requireR2Config`.

## Retirement

Remove when `project-r-score` is disconnected from Git or replaced by an in-repo Pages project with its own Wrangler config under `config/cloudflare/` (not root).

**Retirement verified** `false`  
**Retirement check** `bun test tests/r2-env.test.ts`

**Owner** `// owner: platform / cloudflare-pages`  
**Fresh-rerun** `bun test tests/r2-env.test.ts`

### Live proof (ops portal)

After deploy (SPA rewrite **off**, output dir `tmp/pages-optimized`):

```bash
curl -sS -o /dev/null -w "%{http_code} %{content_type}\n" https://project-r-score.pages.dev/portal/ops/
curl -sS -o /dev/null -w "%{http_code} %{content_type}\n" https://project-r-score.pages.dev/registry/ops-summary.json
curl -sS -o /dev/null -w "%{http_code} %{content_type}\n" https://project-r-score.pages.dev/registry/prediction/coverage-chart.svg
curl -sS -o /dev/null -w "%{http_code} %{content_type}\n" https://project-r-score.pages.dev/portal/data.js
bun run verify:pages-edge
bun run verify:weave -- --summary
```

Expect: ops HTML title `Operations · FactoryWager`; JSON `application/json`; SVG `image/svg+xml` (not the landing-page HTML shell). Weave summary: group pass/fail for surfaces · artifacts · components against live `portal-weave.json`.

### Weave verify

SSOT: [`lib/verification/pages-edge-weave.ts`](../../../lib/verification/pages-edge-weave.ts) · script `bun run verify:weave`. Script-level flags; Bun CLI flags stay orthogonal ([`config/runtime-flags.json`](../../../config/runtime-flags.json) · `bun run portal:flags`).

```bash
bun run verify:weave
bun run verify:weave -- --retries 3 --backoff 1000 --output table
bun run verify:weave -- --output json
bun run verify:weave -- --summary
bun run verify:weave -- --correlation-id run-1 --no-orphans --summary
bun run verify:weave -- --orphans=group --summary    # categorized inventory (default)
bun run verify:weave -- --orphans=report --summary   # flat unlinked path list
bun run verify:weave -- --summary                    # summary only (CI): groups + latency/size/errors
bun run verify:weave -- --no-subdomains --summary    # skip cross-host probes
bun run verify:weave -- --columns path,group,latency,detail
bun run verify:weave -- --no-surfaces --no-artifacts --no-docs --no-meta --no-orphans --summary

# Orphans: --orphans=group (default) · --orphans=report · --orphans=warn · --orphans=off / --no-orphans
# Intentional orphans: artifact.purpose shared|script|audit (SSOT lib/http/portal-weave.ts) — skipped
# Subdomains (default on): --no-subdomains · --subdomains-config <path> (default config/subdomains.json)
# Host inventory SSOT: config/surfaces.toml · probe matrix: config/subdomains.json
# Parallel: surfaces · artifacts · components · subdomains via Promise.all (per-path latency kept)
# Columns: --columns path,group,httpStatus,latency,size,contentType,detail
# See also: set WEAVE_DASHBOARD_URL for an extra Dashboard link
# Toggles (default on): --no-surfaces · --no-artifacts · --no-docs · --no-meta · --no-orphans · --no-subdomains
# Also: --retries N · --backoff MS · --output table|json · --summary · --correlation-id <id>
# Table mode: header (id · shortcode · timestamp · elapsed) + rich group summary + per-path details.
```

Dev loop / debug (Bun runtime flags before `run`; `--watch` re-fires probes — prefer `--no-clear-screen`):

```bash
bun --watch --no-clear-screen run verify:weave
bun --inspect-brk run verify:weave
```

### Runtime flags for edge verification

```bash
bun --silent run verify:pages-edge
bun --silent run verify:pages-edge:taxonomy
bun --env-file=.env run verify:pages-edge
bun --smol run verify:pages-edge
```

Repo policy notes:

- **`-i` ≡ `--install=fallback`, never `--no-install`** — `frozenLockfile = true` already fails on lockfile drift; the production deploy proof needs `CLOUDFLARE_API_TOKEN` from env to select the latest successful deployment, then verifies content through its public apex alias because Pages Access protects branch/hash previews.
- **`--console-depth=N`** overrides bunfig `[console] depth` (repo pin 6) for native `console.log` object depth; the policy layer in `lib/console-depth.ts` reads it too.
