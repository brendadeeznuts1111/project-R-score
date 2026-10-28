<<<<<<< HEAD
# Project R targets and navigation
||||||| 1d43d1476
# Monorepo map — `/Users/nolarose/Projects`
=======
# Project R monorepo map
>>>>>>> codex/agent-guidance-consolidation

`repo-map.json` is the executable source of truth for optional cross-target
navigation. This reference explains how to use it without copying target counts,
anchors, or the package script catalog.

Direct `outline`, `files`, `search`, `scan`, and `replace` commands accept paths
and do not require the map or symbol index.

## Choose the smallest route

| Need                             | Route                                     |
| -------------------------------- | ----------------------------------------- |
| One file or directory            | `outline <path>`                          |
| Files containing a syntax shape  | `files <pattern> --path <path>`           |
| Matched lines and context        | `search <pattern> --path <path>`          |
| Curated target inventory         | `map --list`                              |
| Guided read order for one domain | `nav --zone <zone>`                       |
| Cross-target symbol lookup       | `index --refresh`, then `jump` or `index` |
| Imports and declared edges       | `graph --zone <zone>`                     |
| Stale map entries                | `discover --zone <zone>`                  |

Run examples from the repository root:

```bash
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py map --list
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py zones --stats
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py nav --zone agents --digest
```

## Zones

The current map groups targets by ownership rather than filesystem depth:

| Zone              | Scope                                              |
| ----------------- | -------------------------------------------------- |
| `sports-terminal` | Runtime entrypoints and connected active products  |
| `kimi`            | Sports plugin scripts, shared code, and MCP server |
| `packages`        | Shared packages and selected `lib/` foundations    |
| `agents`          | Repository-owned agent skills                      |
| `toolchain`       | Explicit adjacent toolchain repositories           |

List the live targets instead of relying on a copied count:

```bash
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py zones --zone agents
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py discover --zone agents
```

`discover` reports candidates that are not mapped. A missing target and an
unmapped target are different conditions; inspect both before editing
`repo-map.json`.

## Navigation cache

The symbol index is a disposable cache for cross-target operations only. Build
it immediately before index-backed work:

```bash
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py index --refresh
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py index --status
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py jump --name resolveBinary --zone agents
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py anchors --zone agents --fail-on
```

Use:

- `index --name <symbol>` for occurrences across targets.
- `exports` for exported declarations.
- `collisions` for names appearing in multiple targets.
- `anchors --fail-on` to validate curated navigation anchors.
- `graph` for imports plus explicit `depends_on` edges.

Refresh the cache after source or map changes. A clean index is navigation
evidence, not type resolution or project proof.

## Bun-aware outlines and scans

`outline-rules/bun-monorepo.yml` adds Bun API and repository-specific extractors
to ordinary structure output:

```bash
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py outline scripts/rate-removal-candidates.ts --bun-rules --view digest
```

The bundled scan configuration and rules are repository-local:

```bash
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py rules
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py scan --path scripts
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py audit --only agents --fail-on
```

Preview autofixes before applying them. YAML rule snapshots prove rule matching;
the affected project still owns formatting, types, tests, and merge proof.

## Package-owned specialized lanes

The ast-grep package also contains supply-chain, workflow, network, benchmark,
and test-profile experiments. They are not general AST-navigation prerequisites.
When a task explicitly names one of those lanes, inspect the current package
scripts instead of using a copied command list:

```bash
cd .agents/skills/ast-grep
bun run
```

Keep specialized fixture failures attributed to that lane. Do not weaken the
core doctor, smoke, rule snapshots, or repository merge proof to accommodate an
absent generated artifact.

## Map maintenance

When adding or changing a target:

1. Confirm the path and owner.
2. Prefer a narrow entry file or directory.
3. Put it in one primary zone.
4. Add anchors only for stable, useful symbols.
5. Declare `depends_on` only for an intentional target edge.
6. Refresh the index and run `anchors --fail-on`.
7. Run `bun run skills:validate` and the owning repository proof.

<<<<<<< HEAD
See [pattern guidance](patterns.md) for structural queries and safe rewrites.
||||||| 1d43d1476
```bash
bun run supply-chain:network:validate   # 12 ground-truth checks + live pinned counts
bun run supply-chain:network:dry-run -- --validate-ground-truth
```

Flow: **seed** → **dry-run** (debug) → **validate** (gate) → **loop** (watch drift). Full index: `bun run supply-chain:network:help`.

**Cache:** `.bun-inventory-cache.json` (gitignored) — `bun score`/`report`/`matrix` reuse it; `--refresh` rebuilds.

## Outline rules (Bun runtime)

Load extra extractors for `Bun.serve`, `Bun.file`, `Bun.spawn`, `bun:sqlite`, `createLogger`, route handlers:

```bash
python3 $AG outline projects/active/sports-terminal-os/src/index.ts --bun-rules --view names
bun scripts/bun-cli.ts outline projects/active/sports-terminal-os/src/index.ts --bun-rules --view digest
```

File: `outline-rules/bun-monorepo.yml`

## Scan rules (bundled)

| Rule | File | Finds |
|---|---|---|
| `no-console-log` | `rules/no-console-log.yml` | `console.*($$$)` |
| `no-as-any` | `rules/no-as-any.yml` | `$EXPR as any` (autofix) |
| `no-double-cast` | `rules/no-double-cast.yml` | `$EXPR as unknown as $T` (autofix) |
| `empty-catch` | `rules/empty-catch.yml` | empty `catch {}` blocks |
| `hardcoded-fetch-url` | `rules/hardcoded-fetch-url.yml` | `fetch('https://...')` literals |

Preview only unless you pass `--apply` or `--fix` to `scan`. Rules with a `fix:` field (e.g. `no-as-any`) can be applied in bulk:

```bash
python3 $AG fix --path projects/active/sports-terminal-os/src --dry-run
python3 $AG fix --path projects/active/sports-terminal-os/src
```

## Audit across targets

```bash
python3 $AG audit                    # all repo-map.json targets
python3 $AG audit --only kimi        # kimi-plugin zones only
python3 $AG audit --fail-on          # non-zero exit for CI gates
./scripts/baseline.sh sports-terminal
```

Rule tests live in `tests/` — run `python3 $AG test` before changing YAML rules.

## Scan profiles (`scan-profiles.json`)

| Profile | Rules | Use |
|---|---|---|
| `ci` | no-as-any, no-double-cast, empty-catch | CI gate (`./scripts/ci.sh`) |
| `autofix` | no-as-any, no-double-cast | Safe mechanical fixes |
| `bun` | node-fs-in-bun + ci rules | Bun-native hygiene (`audit --profile bun`) |
| `strict` | all rules | Full lint inventory |

## Named codemods (`codemods.json`)

```bash
python3 $AG codemod strip-as-any --only kimi-mcp        # preview 6 fixes in tools.ts
python3 $AG fix --only kimi-mcp --rule no-as-any.yml    # YAML autofix equivalent
```

## Navigation (`repo-map.json` → `navigation`)

Each zone has a curated read order. Targets may include `anchors` — symbol names to grep for in outlines.

```bash
python3 $AG nav --zone kimi              # step-by-step with cmds + anchors
python3 $AG nav --zone sports-terminal --digest   # inline outline previews
```

## Symbol index (cross-target)

Builds `.outline-index.json` (gitignored) from repo-map outlines:

```bash
python3 $AG index --refresh              # rebuild cache
python3 $AG index --status               # cache age + stale targets
python3 $AG index                        # top symbols by occurrence
python3 $AG index --name WebSocket       # find symbol across all targets
python3 $AG index --exports --type function --zone kimi
```

## Symbol intelligence

| Command | Use |
|---|---|
| `anchors --zone kimi` | Verify repo-map `anchors` resolve in symbol index |
| `exports --zone kimi` | Public API surface (exported symbols) |
| `collisions` | Names duplicated across targets (e.g. `main`, `logger`) |
| `graph --zone kimi` | Import paths + `depends_on` edges between targets |
| `jump --name f402Fetch` | Best file:line for agent `Read` |

Targets may declare `depends_on: ["kimi-shared"]` in `repo-map.json` for explicit graph edges.

## Agent workflow for unfamiliar zones

1. `python3 $AG nav --zone <zone>` — guided read order with anchors
2. `python3 $AG index --name <symbol>` — locate symbol across targets
3. `outline --view digest` on the 1–2 files that matter
4. `search` with syntax pattern from [recipes.md](recipes.md)
5. `Read` only the matched line ranges — not whole directories

## Globs that reduce noise

```bash
--globs '!**/*.test.ts' --globs '!**/node_modules/**' --globs '!**/demos/**'
```

Use demos exclusion when exploring production `src/` only.
=======
```bash
bun run supply-chain:network:validate   # 12 ground-truth checks + live pinned counts
bun run supply-chain:network:dry-run -- --validate-ground-truth
```

Flow: **seed** → **dry-run** (debug) → **validate** (gate) → **loop** (watch drift). Full index: `bun run supply-chain:network:help`.

**Cache:** `.bun-inventory-cache.json` (gitignored) — `bun score`/`report`/`matrix` reuse it; `--refresh` rebuilds.

## Outline rules (Bun runtime)

Load extra extractors for `Bun.serve`, `Bun.file`, `Bun.spawn`, `bun:sqlite`, `createLogger`, route handlers:

```bash
python3 $AG outline projects/active/sports-terminal-os/src/index.ts --bun-rules --view names
bun scripts/bun-cli.ts outline projects/active/sports-terminal-os/src/index.ts --bun-rules --view digest
```

File: `outline-rules/bun-monorepo.yml`

## Scan rules (bundled)

| Rule | File | Finds |
|---|---|---|
| `no-console-log` | `rules/no-console-log.yml` | `console.*($$$)` |
| `no-as-any` | `rules/no-as-any.yml` | `$EXPR as any` (autofix) |
| `no-double-cast` | `rules/no-double-cast.yml` | `$EXPR as unknown as $T` (autofix) |
| `empty-catch` | `rules/empty-catch.yml` | empty `catch {}` blocks |
| `hardcoded-fetch-url` | `rules/hardcoded-fetch-url.yml` | `fetch('https://...')` literals |

Preview only unless you pass `--apply` or `--fix` to `scan`. Rules with a `fix:` field (e.g. `no-as-any`) can be applied in bulk:

```bash
python3 $AG fix --path projects/active/sports-terminal-os/src --dry-run
python3 $AG fix --path projects/active/sports-terminal-os/src
```

## Audit across targets

```bash
python3 $AG audit                    # all repo-map.json targets
python3 $AG audit --only kimi        # kimi-plugin zones only
python3 $AG audit --fail-on          # non-zero exit for CI gates
./scripts/baseline.sh sports-terminal
```

Rule tests live in `tests/` — run `python3 $AG test` before changing YAML rules.

## Scan profiles (`scan-profiles.json`)

| Profile | Rules | Use |
|---|---|---|
| `ci` | no-as-any, no-double-cast, empty-catch | CI gate (`./scripts/ci.sh`) |
| `autofix` | no-as-any, no-double-cast | Safe mechanical fixes |
| `bun` | node-fs-in-bun + ci rules | Bun-native hygiene (`audit --profile bun`) |
| `strict` | all rules | Full lint inventory |

## Named codemods (`codemods.json`)

```bash
python3 $AG codemod strip-as-any --only kimi-mcp        # preview 6 fixes in tools.ts
python3 $AG fix --only kimi-mcp --rule no-as-any.yml    # YAML autofix equivalent
```

## Navigation (`repo-map.json` → `navigation`)

Each zone has a curated read order. Targets may include `anchors` — symbol names to grep for in outlines.

```bash
python3 $AG nav --zone kimi              # step-by-step with cmds + anchors
python3 $AG nav --zone sports-terminal --digest   # inline outline previews
```

## Symbol index (cross-target)

Builds `.outline-index.json` (gitignored) from repo-map outlines:

```bash
python3 $AG index --refresh              # rebuild cache
python3 $AG index --status               # cache age + stale targets
python3 $AG index                        # top symbols by occurrence
python3 $AG index --name WebSocket       # find symbol across all targets
python3 $AG index --exports --type function --zone kimi
```

## Symbol intelligence

| Command | Use |
|---|---|
| `anchors --zone kimi` | Verify repo-map `anchors` resolve in symbol index |
| `exports --zone kimi` | Public API surface (exported symbols) |
| `collisions` | Names duplicated across targets (e.g. `main`, `logger`) |
| `graph --zone kimi` | Import paths + `depends_on` edges between targets |
| `jump --name f402Fetch` | Best file:line for agent `Read` |

Targets may declare `depends_on: ["kimi-shared"]` in `repo-map.json` for explicit graph edges.

## Agent workflow for unfamiliar zones

1. `python3 $AG nav --zone <zone>` — guided read order with anchors
2. `python3 $AG index --name <symbol>` — locate symbol across targets
3. `outline --view digest` on the 1–2 files that matter
4. `search` with syntax pattern from [recipes.md](recipes.md)
5. `Read` only the matched line ranges — not whole directories

## Globs that reduce noise

```bash
--globs '!**/*.test.ts' --globs '!**/node_modules/**' --globs '!**/demos/**'
```

Use demos exclusion when exploring production `src/` only.
>>>>>>> codex/agent-guidance-consolidation
