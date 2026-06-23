---
name: ast-grep
description: |
  AST-aware code outline, structural search, rewrite, and rule scans via ast-grep 0.44+.
  Use when exploring unfamiliar code, mapping symbols/imports/exports before broad file reads,
  finding syntax-shaped patterns (calls, classes, JSX), writing codemods, or when rg is too noisy.
  Requires scripts/sg.sh (pins @ast-grep/cli@0.44.0 for the outline command).
---

# ast-grep (outline + structural tools)

Syntax-aware layer between `rg` and a full LSP. **No index to maintain.**

## Setup

**Global (preferred):**

```bash
npm install -g @ast-grep/cli@0.44.0
ast-grep outline --help   # must work
```

**Skill fallback** (if global is older or missing):

```bash
cd .agents/skills/ast-grep && ./scripts/install.sh
```

Verify:

```bash
.agents/skills/ast-grep/scripts/doctor.sh
```

Use `scripts/sg.sh` — it picks the first binary with `outline` support (global 0.44+ or skill pin).

## Default moves

1. **`outline`** — map structure before reading large files/dirs
2. **`run`** — read-only structural search
3. **`run --rewrite`** — preview codemod (add `--update-all` to apply)
4. **`scan`** — YAML rules / `sgconfig.yml`
5. **`doctor`** — if outline fails

## Outline (new in 0.44 — pi-ast-grep's killer feature)

Start cheap:

```bash
SG=.agents/skills/ast-grep/scripts/sg.sh

# File skeleton
$SG outline src/file.ts --view digest --color never

# Symbol names only
$SG outline src --view names --color never

# Exports across a tree
$SG outline src --items exports --view names --color never

# Filter symbols
$SG outline src --match 'Effect' --types function,class --color never
```

Views: `auto`, `names`, `signatures`, `digest`, `expanded`  
Items: `auto`, `structure`, `exports`, `imports`, `all`

## Structural search

```bash
$SG run --pattern 'fetch($$$)' --lang ts --color never kimi-plugin/
$SG run --pattern 'console.log($$$)' --lang ts --files-with-matches src/
$SG run --kind 'function_declaration' --lang ts --color never src/
```

Patterns use `$VAR` (one node) and `$$$` (many nodes) — **not regex**.

## Rewrite (preview first)

```bash
# Preview diff (default)
$SG run --pattern 'foo($A)' --rewrite 'bar($A)' --lang ts --color never src/

# Apply
$SG run --pattern 'foo($A)' --rewrite 'bar($A)' --lang ts --update-all src/
git diff
```

`--json` and `--update-all` are mutually exclusive — run two passes if scripting.

## Scan (YAML rules)

```bash
$SG scan --rule rules/no-console.yml --color never src/
$SG scan --config sgconfig.yml --color never .
$SG scan --config sgconfig.yml --update-all src/   # trusted fixes only
```

## When to use what

| Question | Tool |
|---|---|
| What symbols/exports exist? | `outline --view names` |
| Quick file skeleton | `outline --view digest` |
| Find every `fetch()` call | `run --pattern` |
| Codemod across files | `run --rewrite` then `--update-all` |
| Project lint rules | `scan` |
| String in comments/filenames | `rg` (not ast-grep) |

## Agent guidelines

- Run `outline` before reading files >200 lines or unfamiliar directories.
- Narrow with `--match`, `--types`, `--globs`, or explicit paths — avoid dumping whole monorepos.
- Preview broad rewrites; apply only when paths/globs/patterns are narrow and intentional.
- After `--update-all`, inspect `git diff` and run project checks.

## Lazycodex helper (optional)

For offline pattern validation and two-pass replace automation, see  
`lazycodex/plugins/omo/skills/ast-grep/scripts/ast_grep_helper.py` — it does not yet wrap `outline`; use `scripts/sg.sh` for that.

## Pi install (separate harness)

If using [Pi](https://github.com/earendil-works/pi-coding-agent):

```bash
pi install git:github.com/joelhooks/pi-ast-grep@main
```

That exposes `ast_grep_outline`, `ast_grep_search`, etc. as native Pi tools. This skill is the Cursor/Grok/Kimi port.