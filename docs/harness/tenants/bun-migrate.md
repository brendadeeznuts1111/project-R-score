# Tenant: bun-migrate

**Tenant** `bun-migrate` (migrate · not a spine cron)  
**Runs** `bun run migrate:status`  
**Proof** `bun-migrate-status`  
**Catalog** `lib/harness/ci-deploy.ts`

## Signal (failure)

`bun run migrate:status` exits non-zero (Bun usage inventory / migration drift).

## Intervention (repair)

1. Reproduce: `bun run migrate:status`
2. Refresh inventory if needed: `bun run migrate:inventory`
3. Address reported drift in `scripts/bun-migrate.ts` consumers
4. Re-run: `bun run migrate:status`

## Retirement

Remove when bun-migrate inventory is owned by a different operate gate.

**Retirement verified** `false`  
**Retirement check** `bun run docs:ci-deploy`

**Owner** `// owner: platform / bun-migrate`  
**Fresh-rerun** `bun run docs:ci-deploy`
