# Tenant: deploy-production

**Tenant** `deploy-production` (deploy · not a spine cron)  
**Runs** `bun run deploy:production` — Bun.secrets + R2 preflight  
**Proof** `deploy-production-preflight`  
**Catalog** `lib/harness/ci-deploy.ts`

## Signal (failure)

`bun run deploy:production` exits non-zero (missing Bun.secrets / R2 credentials), or a post-deploy health check fails after a real release.

## Intervention (repair)

1. Reproduce preflight: `bun run deploy:production`
2. Restore Bun.secrets / R2 credentials (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`)
3. If a release already shipped unhealthy: roll back via the owning CD path, then re-run preflight
4. Re-run: `bun run deploy:production`

Do **not** treat a green docs render as a production deploy.

Cloudflare Pages (`project-r-score`) is a **separate** surface — see [`cloudflare-pages.md`](cloudflare-pages.md) · claim `cloudflare-pages-env-ssot`. Do not conflate Pages Git deploys with `deploy:production`.

## Retirement

Remove when production deploy is owned by an external CD system with its own runbook.

**Retirement verified** `false`  
**Retirement check** `bun run docs:ci-deploy`

**Owner** `// owner: platform / deploy`  
**Fresh-rerun** `bun run docs:ci-deploy`
