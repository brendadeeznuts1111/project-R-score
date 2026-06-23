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

## Outline rules (Bun runtime)

Load extra extractors for `Bun.serve`, `createLogger`, route handlers:

```bash
python3 $AG outline projects/active/sports-terminal-os/src/index.ts --bun-rules --view names
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
python3 $AG index                        # top symbols by occurrence
python3 $AG index --name WebSocket       # find symbol across all targets
python3 $AG index --exports --type function --zone kimi
```

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