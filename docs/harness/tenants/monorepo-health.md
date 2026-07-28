# Tenant: monorepo-health

**Tenant** `monorepo-health`  
**Runs** `bun run monorepo:health` · `bun tools/monorepo-health.ts`  
**Proof** `reports/monorepo-health-latest.json` · formula unit tests  
**Catalog** Bun-native Glob · build metafile · optional Archive  

## Formula (0–100)

```
Health = 100
  − (duplicateDepCount × 2)
  − (deadCodePercent × 0.5)
  − (largeFilePercent × 1)
  − (testFailureRate × 5)
  − (cyclicDependencyCount × 1.5)
  + (testCoveragePercent × 0.2)
```

| Grade | Score |
|-------|-------|
| healthy | ≥ 90 |
| needs-improvement | 60–89.9 |
| critical | &lt; 60 (CLI exit 1) |

## Collection (Bun APIs)

| Metric | Source |
|--------|--------|
| duplicateDepCount | workspace + root `package.json` dependency version sets |
| deadCodePercent / cycles | **`Bun.Transpiler.scanImports`** (prefers over `scan` — captures `require()` on Bun 1.4) · ESM + dynamic `import()` · type-only ignored · relative edges for orphans/cycles |
| largeFilePercent | `Bun.Glob` + line count (&gt; 200 default) |
| testFailureRate | optional `--with-tests` focused `bun test` sample |
| testCoveragePercent | reserved (0 until coverage parse wired) |

**Not a full AST.** Bun has no public ESTree walk API; `scan` / `scanImports` are the native module-graph surface ([transpiler](https://bun.com/docs/runtime/transpiler)). Cyclomatic complexity still uses the TypeScript compiler API.

## CLI

```bash
bun run monorepo:health              # human table + latest JSON
bun run monorepo:health:json         # stdout JSON only
bun tools/monorepo-health.ts --no-build
bun tools/monorepo-health.ts --with-tests
bun tools/monorepo-health.ts --archive   # tar report when Bun.Archive available
```

## Code

| Path | Role |
|------|------|
| [`lib/harness/monorepo-health.ts`](../../../lib/harness/monorepo-health.ts) | formula + collect |
| [`tools/monorepo-health.ts`](../../../tools/monorepo-health.ts) | CLI |
| [`tests/monorepo-health.test.ts`](../../../tests/monorepo-health.test.ts) | pure formula + helpers |

## Related: packages metafile audit

Focused `packages/*/src` graph (Bun.build metafile), complementary to this tenant:

```bash
bun run audit:packages           # score/grade + deep map (schema v11)
bun run audit:packages:full      # --cross-check --diff --md --map --bake --vault --env
bun run audit:packages:env       # --env --vault-gap + bake packages + env-inventory
bun run audit:packages:vault     # --vault --vault-gap (live pass-cli status) + bake
bun run audit:packages:apply     # wire open wire-root-dep actions + bake
bun run env:inventory            # scans packages/ · owners · packages plane
bun run env:inventory:bake       # → /registry/env-inventory.json (schemaVersion 2)
```

| Path | Role |
|------|------|
| [`tools/packages-metafile-audit.ts`](../../../tools/packages-metafile-audit.ts) | orphans · cycles · hubs · scores · vault · env owners · apply · bake |
| [`lib/harness/packages-graph-map.ts`](../../../lib/harness/packages-graph-map.ts) | coupling · archive probes · quarantine · summary · applyWireRootDeps |
| [`lib/harness/packages-vault-map.ts`](../../../lib/harness/packages-vault-map.ts) | Bun.env ↔ `env.template` / Proton Pass · inTemplate · runtimePresent |
| [`scripts/lib/env-inventory-compact.ts`](../../../scripts/lib/env-inventory-compact.ts) | owners · root/product runtime · defaults issues · packages plane |
| [`public/registry/packages-graph-map.json`](../../../public/registry/packages-graph-map.json) | baked map |
| [`public/registry/env-inventory.json`](../../../public/registry/env-inventory.json) | baked env inventory |
| [`public/portal/packages/`](../../../public/portal/packages/) · [`/portal/env/`](../../../public/portal/env/) | boards (schema pin · quarantine · env owners) |

**Claim** `packages-graph-map-v11` · ratchet: `bun test tests/packages-graph-map.test.ts tests/packages-metafile-audit.test.ts tests/packages-vault-map.test.ts tests/env-inventory-compact.test.ts tests/packages-board.test.ts` · `bun run audit:packages:env`

`--env` attaches compact inventory (owners reverse index, root vs product runtime, defaults issues) and bakes `/registry/env-inventory.json`. Archive placeholders stay as `quarantine[]` until boundary refs are removed. Companion: [`proton-integration.md`](proton-integration.md) · `bun run env:inventory:ratchet` · `bun run proton:inject:factorywager`.
