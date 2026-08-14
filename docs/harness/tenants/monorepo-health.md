# Tenant: monorepo-health

**Tenant** `monorepo-health`  
**Runs** `bun run monorepo:health` · `bun run check:monorepo-health` ·
`bun tools/monorepo-health.ts`
**Proof** claim `monorepo-health-score` · `reports/monorepo-health-latest.json`
· formula unit tests
**Gates** pre-commit `--tests-only` when health sources staged · **ci:core**
full ratchet · import-graph shares `scanSourceImports`
**Catalog** Bun-native Glob · build metafile · optional Archive · SQLite trend  
**Workspace graph / catalog policy** sibling
[monorepo-workspaces.md](./monorepo-workspaces.md) ·
`bun run validate:workspaces`

## Formula (0–100)

```
Structural health = 100
  − min(20, duplicateDepCount × 5)
  − min(25, deadCodePercent × 1)
  − min(35, largeFilePercent × 0.75)
  − min(20, cyclicDependencyCount × 5)
```

Formula v2 scores only metrics collected on every normal run. Test failure and
coverage observations remain in the report as nullable evidence; they never
change the structural score. This makes fast-ratchet and `--with-coverage`
scores comparable. `null` means not measured; zero means measured and zero.

| Grade             | Score                |
| ----------------- | -------------------- |
| healthy           | ≥ 90                 |
| needs-improvement | 60–89.9              |
| critical          | &lt; 60 (CLI exit 1) |

## Collection (Bun APIs)

| Metric                   | Source                                                                                                                                                                                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| duplicateDepCount        | workspace + root `package.json` dependency version sets                                                                                                                                                                                                        |
| deadCodePercent / cycles | **`Bun.Transpiler.scanImports`** (prefers over `scan` — captures `require()` on Bun 1.4) · ESM + dynamic `import()` · type-only ignored · relative edges for orphans; cycles use the same classifier and `lib/` + `scripts/` perimeter as `check:import-graph` |
| largeFilePercent         | `Bun.Glob` + line count (&gt; 200 default)                                                                                                                                                                                                                     |
| testFailureRate          | optional, nullable evidence from `--with-tests` / `--with-coverage`; not scored                                                                                                                                                                                |
| testCoveragePercent      | optional, nullable `--with-coverage` evidence from Bun's `All files` **line %**; not scored                                                                                                                                                                    |

**Not a full AST.** Bun has no public ESTree walk API; `scan` / `scanImports`
are the native module-graph surface
([transpiler](https://bun.com/docs/runtime/transpiler)). Cyclomatic complexity
still uses the TypeScript compiler API.

## Health score vs import-graph gate

Two tools consume one import SSOT — `scanSourceImports` in
[`lib/harness/monorepo-health.ts`](../../../lib/harness/monorepo-health.ts)
(`Bun.Transpiler.scanImports`: ESM + `require()` + dynamic `import()`, type-only
ignored). They own different decisions:

| Tool                                                                                             | Owns                                                                                                              | Verdict feeds                                             |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `monorepo:health` / `check:monorepo-health`                                                      | **Advisory structural trend** — 0–100 score; cycles use the shared classifier and a bounded penalty               | dashboards · SQLite trend · `/api/health` · portal boards |
| `check:import-graph` ([`scripts/check-import-graph.ts`](../../../scripts/check-import-graph.ts)) | **Hard fail** — strong/weak cycle + deep-relative counts vs `scripts/import-graph-baseline.json` may only go down | commit blocking (pre-commit + ci:core)                    |

- Both surfaces now report the same cycle population. The score summarizes its
  bounded structural cost; the import gate still blocks any new strong or weak
  cycle.
- Use `monorepo-health` for trends and operator triage; use `check:import-graph`
  when deciding whether a commit may land.
- Never hand-roll import scanning in a third tool — extend `scanSourceImports`
  so cycle definitions (strong = all-static edges, weak = ≥1 lazy `import()`
  edge) cannot drift between tools.
- Re-pin authority is separate per tool: `check-import-graph --write-baseline`
  (owners, after intentional restructuring) never re-pins the score baseline,
  and vice versa.

## CLI

```bash
# Continuous gate (ci:core + claim monorepo-health-score)
bun run check:monorepo-health                    # unit tests + collect + schema + baseline ratchet
bun scripts/check-monorepo-health.ts --tests-only  # pre-commit when health files staged
bun scripts/check-monorepo-health.ts --write-baseline  # owners: re-pin floors after intentional change
bun run check:import-graph                       # cycle/deep-relative (shares scanSourceImports)

# Operator CLI (not a commit gate by itself)
bun run monorepo:health              # human table + latest JSON + SQLite trend
bun run monorepo:health:json         # stdout JSON only
bun run monorepo:health:full         # --with-coverage --archive
bun run monorepo:health:watch
bun tools/monorepo-health.ts --no-build
bun tools/monorepo-health.ts --with-tests
bun tools/monorepo-health.ts --with-coverage  # tests + All-files line % evidence
bun tools/monorepo-health.ts --archive        # tar report when Bun.Archive available
bun tools/monorepo-health.ts --watch --interval=30
bun tools/monorepo-health.ts --interactive
bun tools/monorepo-health.ts --inspect
bun tools/monorepo-health.ts --validate reports/monorepo-health-latest.json
```

The ratchet and target are separate verdicts. The ratchet fails only when the
observed structure regresses beyond the pinned baseline. The target remains 90;
the gate prints the target gap without pretending a below-target tree is
healthy. Formula-v2 baseline generation pins counts exactly and percentage
ceilings to the next tenth; it no longer grants `+2` cycles/dependencies or
`+1%` dead/large-file headroom.

### Integration

| Surface            | Behavior                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Husky pre-commit   | When `lib/harness/monorepo-health*` / `tools/monorepo-health.ts` / gate/baseline/tests staged → `check-monorepo-health --tests-only` |
| Husky pre-commit   | Always (lib/scripts staged): `check:import-graph` (same Transpiler SSOT)                                                             |
| `ci:core`          | Full `check:monorepo-health` after import-graph (+ writes `/registry/monorepo-health.json`)                                          |
| `ops:snapshot`     | Bakes monorepo-health before ops-summary (`--no-monorepo-health` to skip)                                                            |
| `ops-summary.json` | `monorepoHealth` compact slice                                                                                                       |
| `/api/health`      | `artifacts.monorepoHealth` + top-level `monorepoHealth` (Pages edge)                                                                 |
| TOC portal         | [`/portal/toc/`](https://score.factory-wager.com/portal/toc/) **Harness** glance · footer links                                      |
| Packages portal    | [`/portal/packages/`](https://score.factory-wager.com/portal/packages/) graph map                                                    |
| Proton / vault     | Separate plane — `audit:packages:env` · `env:inventory` · `vault:gap:*` · [`proton-integration.md`](proton-integration.md)           |

```bash
bun run monorepo:health:bake                 # → public/registry/monorepo-health.json
bun run ops:snapshot --no-routing            # includes monorepo-health + ops-summary.monorepoHealth
bun run check:monorepo-health                # gate + bake
```

### CLI I/O model

| Surface                     | Use                                                                 |
| --------------------------- | ------------------------------------------------------------------- |
| `process.stdout` / `stderr` | tables, help, host spinner (not `Bun.Terminal`)                     |
| `Bun.inspect` / `.table`    | structured dumps; depth via `BUN_CONSOLE_DEPTH` / `--console-depth` |
| `Bun.Terminal`              | **child** PTY only — [`lib/terminal.ts`](../../../lib/terminal.ts)  |
| `bun:sqlite`                | `reports/monorepo-health-history.sqlite` score trend                |
| `Bun.semver`                | warn if runtime &lt; 1.3.0                                          |
| `Bun.which`                 | probe `bun` / `git` / `tar` on PATH                                 |
| `Bun.sleep`                 | `--watch` interval                                                  |
| `Bun.stdin`                 | `--interactive` prompts                                             |

## Code

| Path                                                                                        | Role                                |
| ------------------------------------------------------------------------------------------- | ----------------------------------- |
| [`lib/harness/monorepo-health.ts`](../../../lib/harness/monorepo-health.ts)                 | formula + collect                   |
| [`lib/harness/monorepo-health-history.ts`](../../../lib/harness/monorepo-health-history.ts) | SQLite trend                        |
| [`lib/harness/monorepo-health-ui.ts`](../../../lib/harness/monorepo-health-ui.ts)           | spinner · tables · schema · prompts |
| [`tools/monorepo-health.ts`](../../../tools/monorepo-health.ts)                             | CLI                                 |
| [`tests/monorepo-health.test.ts`](../../../tests/monorepo-health.test.ts)                   | pure formula + helpers              |
| [`tests/monorepo-health-ui.test.ts`](../../../tests/monorepo-health-ui.test.ts)             | UI + history                        |

## Related: packages metafile audit

Focused `packages/*/src` graph (Bun.build metafile), complementary to this
tenant:

```bash
bun run audit:packages           # score/grade + deep map (schema v13; board accepts v12+)
bun run audit:packages:full      # --cross-check --diff --md --map --bake --vault --env
bun run audit:packages:env       # --env --vault-gap + bake packages + env-inventory
bun run audit:packages:vault     # --vault --vault-gap (live pass-cli status) + bake
bun run audit:packages:apply     # wire open wire-root-dep actions + bake
bun run env:inventory            # scans packages/ · owners · packages plane
bun run env:inventory:bake       # → /registry/env-inventory.json (schemaVersion 4, +toml plane)
```

| Path                                                                                                          | Role                                                                                                       |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [`tools/packages-metafile-audit.ts`](../../../tools/packages-metafile-audit.ts)                               | orphans · cycles · hubs · scores · vault · env owners · apply · bake                                       |
| [`lib/harness/packages-graph-map.ts`](../../../lib/harness/packages-graph-map.ts)                             | coupling · archive probes · quarantine · summary · applyWireRootDeps                                       |
| [`lib/harness/packages-vault-map.ts`](../../../lib/harness/packages-vault-map.ts)                             | Bun.env ↔ `env.template` / Proton Pass · inTemplate · runtimePresent                                       |
| [`scripts/lib/env-inventory-compact.ts`](../../../scripts/lib/env-inventory-compact.ts)                       | owners · needsInject vs template defaults · packages plane                                                 |
| [`public/registry/packages-graph-map.json`](../../../public/registry/packages-graph-map.json)                 | baked map                                                                                                  |
| [`public/registry/env-inventory.json`](../../../public/registry/env-inventory.json)                           | baked env inventory                                                                                        |
| [`public/portal/packages/`](../../../public/portal/packages/) · [`/portal/env/`](../../../public/portal/env/) | boards (schema pin v13 · SVG dep graph · quarantine · env owners) · `portal-cli dashboard --view=packages` |

**Claim** `packages-graph-map-v13` · multi-surface inventory **v3** (workspaces,
`lib/` dirs, STO nested, portal chrome/brand/theme, registry families,
**page→registry edges**, **lib import hubs**, **orphan triage**
wire/document/review) via
[`lib/harness/monorepo-surfaces.ts`](../../../lib/harness/monorepo-surfaces.ts)
· ratchet:
`bun test tests/packages-graph-map.test.ts tests/monorepo-surfaces.test.ts tests/packages-metafile-audit.test.ts tests/packages-vault-map.test.ts tests/env-inventory-compact.test.ts tests/packages-board.test.ts tests/env-defaults-scan.test.ts`
· `bun run audit:packages:env` · `bun run portal-cli pm graph`

`--env` attaches compact inventory (owners, `missingNeedsInject` vs
`coveredByTemplateDefault`) and bakes `/registry/env-inventory.json`.
Placeholder `@factorywager/package` removed. Companion:
[`proton-integration.md`](proton-integration.md) ·
`bun run env:inventory:ratchet` · `bun run proton:inject:factorywager`.
