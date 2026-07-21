# Tenant: deploy-staging

**Tenant** `deploy-staging` (deploy · not a spine cron)  
**Runs** `bun run deploy:staging`  
**Proof** `deploy-staging-script`  
**Catalog** `lib/harness/ci-deploy.ts`

## Signal (failure)

`bun run deploy:staging` exits non-zero.

## Intervention (repair)

1. Reproduce: `bun run deploy:staging`
2. Inspect `scripts/shell/deploy-staging.sh` and staging credentials
3. Fix and re-run: `bun run deploy:staging`

## Retirement

Remove when staging deploy is retired or folded into deploy-production.

**Retirement verified** `false`  
**Retirement check** `bun run docs:ci-deploy`

**Owner** `// owner: platform / deploy`  
**Fresh-rerun** `bun run docs:ci-deploy`
