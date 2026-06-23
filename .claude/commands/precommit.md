---
description: Run husky pre-commit gates — hygiene, harness lint, ast-grep rules, semver policy
user_invocable: true
---

Run pre-commit quality gates before committing. Never use `--no-verify`.

## Full hook chain (same as commit)

```bash
bun scripts/repo-hygiene.ts --staged
bun scripts/pre-commit-harness.ts
bun scripts/pre-commit-ast-grep.ts
```

Or run the hook directly:

```bash
.husky/pre-commit
```

## Targeted gates

```bash
bun run precommit:ast-grep
cd .agents/skills/ast-grep && bun run precommit
cd .agents/skills/ast-grep && bun run precommit:rules
cd .agents/skills/ast-grep && bun run precommit:semver
cd .agents/skills/ast-grep && bun run precommit:packages
```

## MCP

If `ast-grep` MCP is available, call `ast_grep_precommit` with `staged: true` (default) or `full: true` to force all gates.

## On failure

1. Read which step failed (hygiene · harness · ast-grep rules · semver · supply-chain packages).
2. Fix the issue in source.
3. Re-run the failing gate until green.
4. Re-stage affected files before commit.

Shared reference: `.agents/skills/references/agent-tooling.md`