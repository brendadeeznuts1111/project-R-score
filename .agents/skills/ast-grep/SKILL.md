---
name: ast-grep
description: |
  AST-aware code outline, structural search, rewrite, and rule scans via ast-grep 0.44+.
  Use when exploring unfamiliar code, mapping symbols/imports/exports before broad file reads,
  finding syntax-shaped patterns (calls, classes, JSX), writing codemods, or when rg is too noisy.
  Primary entry point: scripts/ast_grep_helper.py (outline, search, replace, scan, validate).
---

# ast-grep (outline + structural tools)

Syntax-aware layer between `rg` and a full LSP. **No index to maintain.**

## Setup

**Global (preferred):**

```bash
npm install -g @ast-grep/cli@0.44.0
ast-grep outline --help   # must work
```

**Skill fallback:**

```bash
cd .agents/skills/ast-grep && ./scripts/install.sh
```

Verify:

```bash
cd .agents/skills/ast-grep && bun run doctor          # Bun-native entry (preferred)
python3 scripts/ast_grep_helper.py doctor --fix       # install skill pin if missing
./scripts/smoke.sh
```

## Bun native (preferred entry)

Use `bun scripts/bun-cli.ts` or `bun run` from the skill directory — same subcommands, spawned via `Bun.spawn`:

```bash
cd .agents/skills/ast-grep
bun run doctor
bun run bun:inventory                    # Bun API counts (sports-terminal)
bun scripts/bun-cli.ts bun patterns      # catalog: Bun.serve, Bun.file, bun:sqlite, ...
bun scripts/bun-cli.ts bun search bun-serve --zone sports-terminal
bun scripts/bun-cli.ts outline projects/active/sports-terminal-os/src/index.ts --bun-rules --view digest
bun scripts/bun-cli.ts audit --profile bun --only sports-terminal
```

`--bun-rules` loads `outline-rules/bun-monorepo.yml` — extractors for `Bun.serve`, `Bun.file`, `Bun.spawn`, `bun:sqlite`, route handlers, MCP tools.

## Primary entry: `ast_grep_helper.py`

Agent default — validates patterns, truncates huge output, two-pass replace, **outline**:

```bash
AG=.agents/skills/ast-grep/scripts/ast_grep_helper.py

# Monorepo orientation (repo-map.json v2 — zones: sports-terminal, kimi, agents)
python3 $AG map --list                              # inventory, no outline
python3 $AG map --compact --zone kimi               # symbol counts per target
python3 $AG map --heatmap                           # ASCII symbol density chart
python3 $AG map --only sports-terminal             # full outline per target
python3 $AG map --json-out --zone kimi              # structured report

# Cross-target symbol index + zone navigation
python3 $AG zones --stats                           # zones with symbol totals
python3 $AG index --refresh                         # build .outline-index.json cache
python3 $AG index --status                          # cache age + stale targets
python3 $AG index --name fetch --zone kimi          # find symbols across targets
python3 $AG index --exports --type function         # exported functions repo-wide
python3 $AG nav --zone sports-terminal --digest     # guided read order + previews

# Symbol intelligence (index-powered)
python3 $AG anchors --zone kimi                     # validate repo-map anchors
python3 $AG exports --zone kimi                       # public export surface
python3 $AG collisions --zone kimi                  # duplicate names across targets
python3 $AG graph --zone kimi                         # import + depends_on edges
python3 $AG jump --name f402Fetch --zone kimi         # file:line for agent Read

# Bun native API (bun-patterns.json v4 — aligned with bun.sh/docs/runtime/bun-apis)
python3 $AG bun docs                                # official topic coverage map
python3 $AG bun bundles                             # server-boot, networking, data-stores, ...
python3 $AG bun patterns --bundle full-stack        # curated API subset
python3 $AG bun score --zone sports-terminal        # adoption % (native vs anti-pattern)
python3 $AG bun migrate --zone sports-terminal      # node:fs -> bun-file hints
python3 $AG bun report --zone sports-terminal       # unified intelligence report
python3 $AG bun matrix --zone sports-terminal       # group x target grid
python3 $AG bun heatmap --tier core                 # ASCII density chart
python3 $AG bun inventory --refresh                 # rebuild .bun-inventory-cache.json
./scripts/bun-ci.sh                                 # score gate + bun audit profile

# Structure map (0.44+)
python3 $AG outline src/file.ts --view digest
python3 $AG outline --zone kimi --view names        # all kimi repo-map paths
python3 $AG outline --only sports-terminal-entry --bun-rules --view digest
python3 $AG outline src --match 'Effect' --types function --json-out

# Files-with-matches only (cheap)
python3 $AG files 'Bun.serve($$$)' --path projects/active/sports-terminal-os --lang ts

# Structural search
python3 $AG search 'fetch($$$)' --path kimi-plugin/ --lang ts
python3 $AG search 'console.log($MSG)' --path src/ --lang ts -C 2

# Codemod (dry-run, then --apply or --fix)
python3 $AG replace 'foo($A)' 'bar($A)' --path src/ --lang ts
python3 $AG replace 'foo($A)' 'bar($A)' --path src/ --lang ts --fix

# Autofix bundled rules (no-as-any strips `as any`)
python3 $AG fix --path src/ --dry-run
python3 $AG fix --path src/

# Offline pattern check (before debugging "no matches")
python3 $AG validate 'console.log($MSG)' --lang ts

# YAML rules (skill sgconfig.yml is default for scan)
python3 $AG scan --path projects/active/sports-terminal-os/src
python3 $AG scan --path src/ --rule .agents/skills/ast-grep/rules/no-as-any.yml --fix

# Rule inventory + monorepo audit (repo-map.json targets)
python3 $AG rules
python3 $AG audit --only kimi
python3 $AG audit --profile ci --only kimi --fail-on   # CI gate
python3 $AG audit --verbose --only kimi-mcp            # per-file breakdown

# Named codemods (codemods.json)
python3 $AG codemods
python3 $AG codemod strip-as-any --only kimi-mcp       # dry-run
python3 $AG codemod strip-as-any --only kimi-mcp --fix

# Autofix across repo-map zone
python3 $AG fix --only kimi --dry-run

# Rule snapshot tests (tests/ + __snapshots__)
python3 $AG test
./scripts/baseline.sh kimi           # test + rules + audit
./scripts/ci.sh                      # test + profile audit --fail-on
```

Low-level escape hatch: `scripts/sg.sh` (raw ast-grep argv, outline-aware binary pick).

Deep workspace guide: [references/monorepo.md](references/monorepo.md) · patterns: [references/recipes.md](references/recipes.md)

## MCP (Cursor)

Registered in `.cursor/mcp.json` as **`ast-grep`** — pi-ast-grep tool parity:

| MCP tool | CLI equivalent |
|---|---|
| `ast_grep_outline` | `outline` (+ `bunRules: true` for Bun extractors) |
| `ast_grep_search` | `search` |
| `ast_grep_files` | `files` |
| `ast_grep_map` | `map` (`heatmap: true` for symbol density) |
| `ast_grep_zones` | `zones` (`stats: true` for symbol totals) |
| `ast_grep_index` | `index` (cross-target symbol lookup) |
| `ast_grep_nav` | `nav` (guided zone read order) |
| `ast_grep_anchors` | `anchors` (validate repo-map anchor symbols) |
| `ast_grep_exports` | `exports` (export surface per target) |
| `ast_grep_collisions` | `collisions` (duplicate symbol names) |
| `ast_grep_graph` | `graph` (import/depends_on edges) |
| `ast_grep_jump` | `jump` (symbol → file:line) |
| `ast_grep_bun` | `bun patterns/inventory/search` (Bun native APIs) |
| `ast_grep_scan` | `scan` (`fix: true` alias for `apply`) |
| `ast_grep_fix` | `fix` (all autofix rules) |
| `ast_grep_replace` | `replace` (`fix: true` to apply) |
| `ast_grep_validate` | `validate` |
| `ast_grep_rules` | `rules` |
| `ast_grep_audit` | `audit` (`profile`, `verbose`, `format`) |
| `ast_grep_codemods` | `codemods` |
| `ast_grep_codemod` | `codemod` |
| `ast_grep_test` | `test` |
| `ast_grep_doctor` | `doctor` (`fix: true` installs skill pin) |

Reload MCP after install. Test: `./scripts/verify-mcp.sh`

## Workflow checklist

1. **Orient** — `nav --zone <zone>` or `map --heatmap` for unfamiliar monorepo areas
2. **Explore** — `outline --view names` or `digest` on target path
3. **Narrow** — `files` for path list only; then `search` for line matches
4. **Lint** — `scan` with bundled rules before broad edits; `fix` for autofix rules
5. **Rewrite** — preview `replace`, then `--fix` / `--apply` (prints `git diff` when in repo)
6. **Verify** — project tests

## Outline views

| View | Use when |
|---|---|
| `names` | Symbol inventory, exports map |
| `digest` | Quick skeleton with key lines |
| `signatures` | Types + params without bodies |
| `expanded` | Members and nested detail |

## When to use what

| Question | Tool |
|---|---|
| What symbols/exports exist? | `outline --view names` |
| Quick file skeleton | `outline --view digest` |
| Find every `fetch()` call | `search` |
| Codemod across files | `replace` then `--apply` |
| Project lint rules | `scan` |
| String in comments/filenames | `rg` (not ast-grep) |

## Pattern rules (critical)

- `$VAR` = one AST node, `$$$` = zero or more nodes — **not regex**
- Patterns must be **valid parseable code** for the target language
- `--json` and `--update-all` are mutually exclusive — helper runs two passes on `--apply`

See [references/patterns.md](references/patterns.md) and [references/pitfalls.md](references/pitfalls.md).

## Agent guidelines

- Run `outline` before reading files >200 lines or unfamiliar directories.
- Call `validate` when a pattern looks like regex or returns zero matches unexpectedly.
- Preview broad rewrites; apply only when paths/globs/patterns are narrow and intentional.
- Output auto-truncates at 2,000 lines / 50 KiB — narrow scope instead of widening.

## Pi install (separate harness)

```bash
pi install git:github.com/joelhooks/pi-ast-grep@main
```

Native Pi tools: `ast_grep_outline`, `ast_grep_search`, etc.