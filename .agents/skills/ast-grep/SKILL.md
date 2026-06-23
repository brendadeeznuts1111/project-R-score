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

# Structure map (0.44+)
python3 $AG outline src/file.ts --view digest
python3 $AG outline src --view names --items exports
python3 $AG outline src --match 'Effect' --types function

# Structural search
python3 $AG search 'fetch($$$)' --path kimi-plugin/ --lang ts
python3 $AG search 'console.log($MSG)' --lang ts src/ -C 2

# Codemod (dry-run, then --apply)
python3 $AG replace 'foo($A)' 'bar($A)' --lang ts src/
python3 $AG replace 'foo($A)' 'bar($A)' --lang ts src/ --apply

# Offline pattern check (before debugging "no matches")
python3 $AG validate 'console.log($MSG)' --lang ts

# YAML rules
python3 $AG scan --rule rules/no-console.yml src/
```

Low-level escape hatch: `scripts/sg.sh` (raw ast-grep argv, outline-aware binary pick).

## Workflow checklist

1. **Explore** — `outline --view names` or `digest` on target path
2. **Narrow** — add `--match`, `--types`, `--globs`, or specific files
3. **Search** — `search` with AST pattern (not regex)
4. **Rewrite** — preview replace, then `--apply` on narrow scope
5. **Verify** — `git diff` + project tests

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