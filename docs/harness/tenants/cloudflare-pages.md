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

Publish surface is `public/` (includes `index.html` + registry/robots/sitemaps + portal) plus root `functions/` (Pages Functions). Apex 404 means `index.html` is missing from that dir. Pack/release/changelog R2 URLs resolve via `r2BucketUrlFromEnv()` in `config/r2-env.ts`. Registry apps import root `lib/` / `config/` at **7** `../` levels from `apps/*/src` and `packages/*/src`.

### Ops portal + prediction (static)

| Path | Asset |
|------|--------|
| `/portal/ops/` | Operations dashboard (experiments + prediction panels) |
| `/registry/ops-summary.json` | Snapshot from `bun run ops:snapshot` |
| `/registry/prediction/report.html` | Backtest report (+ `coverage-chart.svg`) |

**Do not enable Pages “Single-page application” rewrites** (`/* → /index.html 200`). That serves the landing shell for every path (including `.json`) and hides the portal. Prefer real files + `public/_redirects` (trailing-slash only) + `public/_headers` (JSON content-type).

Before deploy (or in CI):

```bash
bun run ops:prediction backtest --from 2024-01-01 --to 2024-12-31   # optional
bun run ops:snapshot   # summary JSON + prediction SVG/HTML under public/registry/
```

Local ops station chart PNG (optional): `bun run ops:prediction report --webview` (Bun.WebView screenshot → Bun.Image).

### Pages Functions (edge-safe only)

Root `functions/` is bundled by Wrangler for Workers — **no `bun:sqlite`**.

| Path | Role |
|------|------|
| `functions/api/operations/summary.ts` | Serves `public/registry/ops-summary.json` (C4/C5 portal data) |
| `functions/api/registry/[[path]].ts` | R2 registry proxy (`REGISTRY_BUCKET` binding) |
| `functions-bun-only/` | Local Bun handlers (auth/DOD/catalog) — **not** deployed to Pages |

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
```

Expect: ops HTML title `Operations · FactoryWager`; JSON `application/json`; SVG `image/svg+xml` (not the landing-page HTML shell).
