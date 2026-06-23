# Monorepo map — `/Users/nolarose/Projects`

Curated ast-grep targets for this workspace. Run via helper `map` or one-off `outline`/`search`.

## Quick orientation

```bash
AG=.agents/skills/ast-grep/scripts/ast_grep_helper.py

python3 $AG map --list                   # zone inventory (no outline)
python3 $AG map --compact --zone kimi    # symbol counts
python3 $AG map --heatmap                # symbol density bar chart
python3 $AG map --only sports-terminal   # full outline per target
python3 $AG nav --zone sports-terminal --digest   # guided read order
python3 $AG zones --stats                # zone totals from symbol index
python3 $AG index --name fetch --zone kimi        # cross-target symbol lookup
python3 $AG outline --zone kimi --view names   # outline all kimi paths
python3 $AG outline --only sports-terminal-entry --bun-rules
python3 $AG scan --config .agents/skills/ast-grep/sgconfig.yml \
  --path projects/active/sports-terminal-os/src
```

## Zones (`repo-map.json` v2)

| Zone | Targets | Start here |
|---|---|---|
| `sports-terminal` | entry, api, services, router | `map --zone sports-terminal --list` |
| `kimi` | plugin scripts, f402, shared, mcp-server | `map --compact --zone kimi` |
| `agents` | ast-grep skill bundle | `outline --zone agents --view names` |

## High-value outline paths

| Area | Path | Why |
|---|---|---|
| Sports terminal entry | `projects/active/sports-terminal-os/src/index.ts` | `Bun.serve`, boot wiring (`bun_rules`) |
| Sports terminal API | `projects/active/sports-terminal-os/src/api` | Route handlers, proxy endpoints |
| Sports terminal services | `projects/active/sports-terminal-os/src/services` | Domain logic, WS handlers |
| Kimi sports plugin | `kimi-plugin/sports-odds-plugin/scripts` | Odds/scores CLI scripts |
| Kimi MCP server | `kimi-plugin/sports-mcp-server` | MCP tools + WS handlers |
| Shared constants | `kimi-plugin/shared` | Cross-plugin types/constants |

## Verified search patterns (this repo)

```bash
# Bun HTTP servers
python3 $AG search 'Bun.serve($$$)' --path projects/active/sports-terminal-os --lang ts

# Structured loggers
python3 $AG search 'createLogger($$$)' --path projects/active/sports-terminal-os/src --lang ts

# Outbound fetch (plugin + services)
python3 $AG search 'fetch($$$)' --path kimi-plugin/sports-odds-plugin --lang ts

# WebSocket clients
python3 $AG search 'new WebSocket($$$)' --path projects/active/sports-terminal-os --lang ts

# Route table shape (router.ts)
python3 $AG outline projects/active/sports-terminal-os/src/api/router.ts --view digest
```

## Bun native

**Preferred entry:** `bun scripts/bun-cli.ts` from `.agents/skills/ast-grep/`

```bash
bun run bun:inventory                              # API counts for sports-terminal
python3 $AG bun patterns                           # catalog (bun-patterns.json)
python3 $AG bun search bun-file --zone sports-terminal
python3 $AG audit --profile bun --only sports-terminal   # node:fs hints + CI rules
```

**Docs index:** [bun.sh/docs/runtime/bun-apis](https://bun.sh/docs/runtime/bun-apis) — `python3 $AG bun docs` reports topic coverage.

**Bun v1.3.13:** [release blog](https://bun.com/blog/bun-v1.3.13) — `bun features` + `bun-test-profiles.json` for `--parallel`, `--isolate`, `--shard=M/N`, `--changed`. CI matrix: `BUN_TEST_SHARD=2/3 ./scripts/bun-test-ci.sh`.

**Bun install:** `bun install-docs` + `bun-install-profiles.json` — non-npm deps, `--linker`, `--cpu`/`--os`, backends, `bun.lock`/`bun.lockb`, pnpm auto-migration, `catalog:` deps. `bun install-scan` reports lockfiles + migration hints. CI: `BUN_INSTALL_PROFILE=cross-linux-x64 ./scripts/bun-install-ci.sh`.

**Groups:** `http`, `io`, `process`, `db`, `crypto`, `runtime`, `display`, `secrets`, `shell`, `test`, `modules`, `networking`, `bundler`, `data-stores`, `routing`, `html`, `workers`, `cookies`, `compression`, `streams`, `parsing`, `utils`, `low-level`, `anti-pattern`

| Tier | Examples |
|---|---|
| `core` | `bun-serve`, `bun-file`, `bun-spawn`, `bun-sqlite`, `fetch-native` |
| `extended` | `bun-glob`, `bun-password`, `bun-markdown-ansi`, `bun-inspect-table` |
| `migrate` | `node-fs`, `node-child-process`, `node-http` |

```bash
python3 $AG bun bundles                          # server-boot, cli, persistence, hygiene
python3 $AG bun score --zone sports-terminal     # adoption grade A–F per target
python3 $AG bun migrate --zone sports-terminal   # anti-pattern files + migrate_to
python3 $AG bun report --zone sports-terminal    # scores + groups + top APIs
python3 $AG bun matrix --zone sports-terminal
./scripts/bun-ci.sh                              # score + migrate + parallel audit
./scripts/ci.sh                                # auto --parallel when bun is on PATH
```

**Bundles:** `server-boot`, `cli`, `persistence`, `core`, `hygiene`, `networking`, `bundler`, `data-stores`, `full-stack`, `security`, `doctor-utils`

**Security roadmap** (`bun roadmap`): most APIs are cataloged; **`Worker` is integrated** via `audit --parallel` (Bun Worker pool in `scripts/audit-pool.ts`). Transpiler/HTMLRewriter/WebView/Redis remain catalog-only.

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