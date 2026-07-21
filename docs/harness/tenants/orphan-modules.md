# Tenant: orphan-modules

**Tenant** `orphan-modules` (code-quality · not a spine cron)  
**Runs** `bun run check:harness-orphans`  
**Proof** `harness-orphan-modules`  
**Catalog** `lib/harness/code-quality.ts`

## Signal (failure)

`bun run check:harness-orphans` lists `lib/harness` modules with no importers outside themselves.

## Intervention (repair)

1. Reproduce: `bun run check:harness-orphans`
2. Wire the module into a consumer (test, spine, script, or sibling harness import) **or** delete/merge the dead module
3. Re-run: `bun run check:harness-orphans`

## Retirement

Remove when orphan detection is owned by a repo-wide unused-export gate.

**Retirement verified** `false`  
**Retirement check** `bun run check:harness-orphans`

**Owner** `// owner: platform / harness`  
**Fresh-rerun** `bun run check:harness-orphans`
