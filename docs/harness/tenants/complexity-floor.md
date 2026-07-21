# Tenant: complexity-floor

**Tenant** `complexity-floor` (code-quality · not a spine cron)  
**Runs** `bun run check:harness-complexity`  
**Proof** `harness-complexity-floor`  
**Catalog** `lib/harness/code-quality.ts` · baseline [`complexity-baseline.json`](../../../lib/harness/complexity-baseline.json)  
**Probe** [`scripts/complexity-check.ts`](../../../scripts/complexity-check.ts)

## Signal (failure)

`bun run check:harness-complexity` exits non-zero — a `lib/harness` function’s McCabe complexity exceeds `maxComplexity` in `complexity-baseline.json`.

## Intervention (repair)

Prefer refactor; raise the floor only when the complexity is intentional:

1. Reproduce: `bun run check:harness-complexity -- --report`
2. Split or simplify the offending function(s), **or** accept a higher floor:
   `bun run check:harness-complexity -- --update-baseline --yes`
3. Re-prove: `bun run check:harness-complexity`

`--update-baseline` sets `maxComplexity` to the current max seen (raises only; pass `--allow-lower` to lower). Non-TTY runs require `--yes`. Do not pipe a file list with `--update-baseline` (full-tree only).

## Changed-files (stdin)

For pre-commit / staged speed, pipe a newline-delimited path list into the probe (`Bun.stdin` — not `bun run -`, which executes a *script* from stdin):

```bash
bun run check:harness-complexity:staged
# equivalent:
git diff --cached --name-only --diff-filter=ACM -- 'lib/harness/**/*.ts' \
  | bun scripts/complexity-check.ts --stdin --json --baseline lib/harness/complexity-baseline.json
```

With `--stdin`: empty or out-of-scope paths → skip (exit 0). Without `--stdin`: TTY or empty non-TTY → full `lib/harness` glob (freshRerun / CI).

## Bun runtime knobs

| Flag | Use |
|------|-----|
| `bun --smol run test:code-quality` | Memory-tight CI / containers; eager GC on spawn-heavy suites (`test:tenant-runbooks`). Alias: `bun run test:code-quality:smol`. |
| `bun --console-depth=4 run check:harness-complexity -- --report` | Deeper object inspection if you add debug `console` dumps of AST / hit objects ([console depth](https://bun.com/docs/runtime/console#object-inspection-depth)). |

Neither flag changes the floor or proof; they are environment tunings only.

## Retirement

Remove when complexity is enforced by pre-commit (or ESLint `complexity`) for the same `lib/harness` floor without this tenant.

**Retirement verified** `false`  
**Retirement check** `bun run check:harness-complexity`

**Owner** `// owner: platform / harness`  
**Fresh-rerun** `bun run check:harness-complexity`
