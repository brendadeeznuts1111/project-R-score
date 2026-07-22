# Tenant: cloudflare-pages

**Tenant** `cloudflare-pages` (Git-integrated Pages · not `deploy:production`)  
**Project** `project-r-score` → https://project-r-score.pages.dev  
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
6. Live dashboard drift check (API token or wrangler OAuth): `bun run cloudflare:env:assert-live`

Publish surface is `public/` (includes `index.html` + registry/robots/sitemaps). Apex 404 means `index.html` is missing from that dir.

This is **not** `bun run deploy:production` (Bun.secrets + R2). Root `wrangler.toml` is Worker `tier1380-production`, not Pages. R2 S3 keys ≠ `CLOUDFLARE_API_TOKEN` (`requireR2Config` vs `requireCloudflareApiToken`).

## Retirement

Remove when `project-r-score` is disconnected from Git or replaced by an in-repo Pages project with its own Wrangler config under `config/cloudflare/` (not root).

**Retirement verified** `false`  
**Retirement check** `bun test tests/r2-env.test.ts`

**Owner** `// owner: platform / cloudflare-pages`  
**Fresh-rerun** `bun test tests/r2-env.test.ts`
