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
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py doctor
./scripts/smoke.sh
```

## Primary entry: `ast_grep_helper.py`

Agent default — validates patterns, truncates huge output, two-pass replace, **outline**:

```bash
AG=.agents/skills/ast-grep/scripts/ast_grep_helper.py

# Monorepo orientation (repo-map.json)
python3 $AG map
python3 $AG map --only sports-terminal

# Structure map (0.44+)
python3 $AG outline src/file.ts --view digest
python3 $AG outline src --view names --items exports
python3 $AG outline src --match 'Effect' --types function

# Files-with-matches only (cheap)
python3 $AG files 'Bun.serve($$$)' --path projects/active/sports-terminal-os --lang ts

# Structural search
python3 $AG search 'fetch($$$)' --path kimi-plugin/ --lang ts
python3 $AG search 'console.log($MSG)' --path src/ --lang ts -C 2

# Codemod (dry-run, then --apply)
python3 $AG replace 'foo($A)' 'bar($A)' --path src/ --lang ts
python3 $AG replace 'foo($A)' 'bar($A)' --path src/ --lang ts --apply

# Offline pattern check (before debugging "no matches")
python3 $AG validate 'console.log($MSG)' --lang ts

# YAML rules (skill sgconfig.yml is default for scan)
python3 $AG scan --path projects/active/sports-terminal-os/src
python3 $AG scan --path src/ --rule .agents/skills/ast-grep/rules/no-as-any.yml
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
| `ast_grep_map` | `map` |
| `ast_grep_scan` | `scan` |
| `ast_grep_doctor` | `doctor` |

Reload MCP after install. Test: `./scripts/test-mcp.sh`

## Workflow checklist

1. **Orient** — `map` or `map --only <zone>` for unfamiliar monorepo areas
2. **Explore** — `outline --view names` or `digest` on target path
3. **Narrow** — `files` for path list only; then `search` for line matches
4. **Lint** — `scan` with bundled rules before broad edits
5. **Rewrite** — preview `replace`, then `--apply` (prints `git diff` when in repo)
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