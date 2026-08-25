---
name: ast-grep
description: >
  Map, search, lint, and rewrite code by syntax with ast-grep 0.44+. Use for
  symbol outlines, import/export structure, call/class/JSX patterns, YAML rule
  scans, versioned Bun migration audits, or codemods when text search is too
  noisy.
---

# ast-grep

Use ast-grep for syntax-shaped questions. Use `rg` for prose, comments, raw
strings, and filenames. Use the TypeScript compiler or an LSP when the answer
depends on resolved types rather than syntax.

## Start here

Run from the Project R repository root:

```bash
bun install
.agents/skills/ast-grep/scripts/install.sh
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py doctor
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py outline scripts/rate-removal-candidates.ts --view digest
```

The root install wires repository hooks and the skill installer hydrates the
pinned local binary without writing a nested lockfile. Do not install or prefer
a global npm copy.

## Ownership boundary

- The helper is the agent entrypoint. It validates patterns, limits output, and
  keeps rewrites dry-run by default.
- `scripts/bun-cli.ts` is the Bun-native package entrypoint used by the skill's
  `bun run` scripts and MCP server.
- `repo-map.json` owns optional monorepo targets and zones. Direct path commands
  do not require an index.
- Project tests, type checks, and repository gates remain proof. An ast-grep
  match or clean scan is evidence, not merge authority.
- Supply-chain, workflow, and benchmark routes are specialized package lanes;
  use them only when the task names that concern. Discover their current
  commands with `bun run` inside `.agents/skills/ast-grep` instead of copying a
  second script catalog into this skill.

## Workflow

1. **Orient** unfamiliar code with `outline`; use `nav` or `map` only for a
   registered monorepo zone.
2. **Validate** a new pattern before assuming zero matches mean zero usage.
3. **Narrow** with `files`, then inspect matches with `search`.
4. **Scan** with the bundled rules or one explicit YAML rule.
5. **Preview** every rewrite; add `--apply` only after the path and pattern are
   intentionally narrow.
6. **Prove** the owning project with focused tests, then its repository gate.

## Core commands

```bash
# Structure
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py outline src/file.ts --view digest
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py outline src --view names --types function

# Pattern validation and search
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py validate 'fetch($$$)' --lang ts
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py files 'Bun.spawn($$$)' --path scripts --lang ts
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py search 'Bun.spawn($$$)' --path scripts --lang ts

# Rules and rewrites
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py scan --path src
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py scan --path src --rule .agents/skills/ast-grep/rules/no-as-any.yml
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py replace 'oldCall($A)' 'newCall($A)' --path src --lang ts
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py replace 'oldCall($A)' 'newCall($A)' --path src --lang ts --apply
```

Use `names` for a compact symbol inventory, `signatures` for declarations,
`digest` for a quick skeleton, and `expanded` only when member detail matters.

## Monorepo and Bun lanes

```bash
# Registered targets and navigation
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py zones --stats
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py nav --zone agents --digest
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py graph --zone agents
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py jump --name resolveBinary --zone agents

# Bun-aware outline extractors
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py outline scripts/rate-removal-candidates.ts --bun-rules --view digest
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py bun patterns

# Bun 1.4 migration inventory
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py bun patterns --bundle bun-1.4-migration
```

Run the fail-closed audit from its owning package:

```bash
cd .agents/skills/ast-grep
bun run bun:1.4:migration:check
bun run bun:1.4:migration:check -- --json
```

The audit fails for a new finding and when its one reviewed negative-contract
finding disappears. It never updates the expectation automatically. Read
[`BUN_1_4_MIGRATION.md`](../../../docs/BUN_1_4_MIGRATION.md) before interpreting
results, and use the type-aware review recipe in
[`patterns.md`](references/patterns.md#bun-14-migration-and-contract-proof) for
FFI/CString behavior that a syntax matcher cannot resolve safely.

The cross-target symbol index is a disposable navigation cache. Refresh it only
for `index`, `jump`, `anchors`, `exports`, or collision work:

```bash
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py index --refresh
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py index --status
```

## Pattern and rewrite rules

- `$VAR` matches one AST node; `$$$` matches zero or more nodes. Neither is a
  regular expression.
- A pattern must parse as the selected language. Use separate searches for
  alternatives instead of regex `|`.
- Use `--globs` or a narrow `--path` before applying a broad codemod.
- `--apply` and `--fix` mutate files. Without them, rewrite and fix commands are
  previews.
- If output hits the helper's limit, narrow the scope; do not bypass truncation
  to read an unbounded repository dump.

## MCP

`.mcp.json` owns the optional `ast-grep` MCP server. Its tools mirror the helper
commands (`outline`, `search`, `files`, `scan`, `replace`, `map`, and related
navigation operations). After changing the MCP surface, run:

```bash
.agents/skills/ast-grep/scripts/verify-mcp.sh
```

Do not treat MCP availability as a prerequisite for the CLI workflow.

## Proof

For guidance or metadata changes:

```bash
bun run skills:validate
```

For rules, helper code, package scripts, or MCP changes:

```bash
cd .agents/skills/ast-grep
bun run doctor
bun run test
bun run bun:1.4:migration:check
bun run precommit
```

Then run the owning repository's focused tests and merge proof. Shared staged
gate mechanics live in [`agent-tooling.md`](../references/agent-tooling.md); do
not duplicate them here.

## References

- [Monorepo targets and navigation](references/monorepo.md)
- [Pattern language, diagnostics, and safe recipes](references/patterns.md)
