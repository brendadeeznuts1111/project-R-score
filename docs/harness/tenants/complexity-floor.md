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

Two different Bun stdin features ([runtime](https://bun.com/docs/runtime)):

| Feature | Meaning | Complexity-floor use |
|---------|---------|----------------------|
| [`bun run -`](https://bun.com/docs/runtime) | Execute JS/TS/JSX from stdin (no temp file) | Not used here — that runs *code*, not a path list |
| [`Bun.stdin`](https://bun.com/docs/runtime/console#reading-from-stdin) | Read bytes/text the process receives on fd 0 | Staged path list into `complexity-check.ts` |

```bash
bun run check:harness-complexity:staged
# equivalent:
git diff --cached --name-only --diff-filter=ACM -- 'lib/harness/**/*.ts' \
  | bun scripts/complexity-check.ts --stdin --json --baseline lib/harness/complexity-baseline.json
```

With `--stdin`: empty or out-of-scope paths → skip (exit 0). Without `--stdin`: TTY or empty non-TTY → full `lib/harness` glob (freshRerun / CI).

## Bun runtime knobs

Put Bun flags **immediately after** `bun` (before `run`); trailing flags go to the script ([runtime note](https://bun.com/docs/runtime)):

| Flag | Use |
|------|-----|
| [`bun --smol run test:code-quality`](https://bun.com/docs/runtime) | Memory-tight CI / containers; GC runs more often so the heap grows slower. Alias: `bun run test:code-quality:smol`. |
| [`bun --console-depth 4 run check:harness-complexity -- --report`](https://bun.com/docs/runtime/console#object-inspection-depth) | Deeper `console.log` object inspection for debug dumps of hits / AST-shaped objects (default depth `2`). |
| [`--cwd` / `--env-file` / `--config`](https://bun.com/docs/runtime) | Global context if you ever invoke the probe outside the repo root; freshRerun assumes workspace cwd + default `bunfig.toml`. |

Neither flag changes the floor or proof; they are environment tunings only.

## Retirement

Remove when complexity is enforced by pre-commit (or ESLint `complexity`) for the same `lib/harness` floor without this tenant.

**Retirement verified** `false`  
**Retirement check** `bun run check:harness-complexity`

**Owner** `// owner: platform / harness`  
**Fresh-rerun** `bun run check:harness-complexity`
