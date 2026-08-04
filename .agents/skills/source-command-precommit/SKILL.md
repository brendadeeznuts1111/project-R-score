---
name: source-command-precommit
description: Run Husky pre-commit gates for repository hygiene, harness lint, skill structure, ast-grep rules, semver policy, secrets, and staged tests. Use before committing or when diagnosing a local gate failure.
---

# source-command-precommit

Use this skill when the user asks to run the migrated source command `precommit`.

## Command Template

Run pre-commit quality gates before committing. Never use `--no-verify`.

## Full hook chain (same as commit)

```bash
bun run precommit
```

`.husky/pre-commit` delegates to `scripts/pre-commit.ts`. The runner uses Bun Shell array
interpolation for escaped commands, `.nothrow()` for explicit exit handling, and `Bun.env` for
`SKIP_GITLEAKS`, `SKIP_TEST_CHANGED`, and `SKIP_QUALITY_CONCEPT`.

Or run the hook directly:

```bash
.husky/pre-commit
```

## Targeted gates

```bash
bun run precommit                       # complete Bun-native hook chain
bun run precommit:ast-grep              # full: doctor + rules + semver + packages
bun run precommit:ast-grep:changed      # when ast-grep paths changed vs HEAD
bun run precommit:ast-grep:staged       # husky-equivalent (staged paths only)
bun run skills:validate                 # repository skill structure + registry
cd .agents/skills/ast-grep && bun run precommit
cd .agents/skills/ast-grep && bun run precommit:rules
cd .agents/skills/ast-grep && bun run precommit:semver
cd .agents/skills/ast-grep && bun run precommit:packages
```

## MCP

If `ast-grep` MCP is available, call `ast_grep_precommit` with `staged: true` (default) or `full: true` to force all gates.

## On failure

1. Read which step failed (hygiene · harness · skills · ast-grep rules · semver · secrets · staged tests · supply-chain packages).
2. Fix the issue in source.
3. Re-run the failing gate until green.
4. Re-stage affected files before commit.

Shared reference: `.agents/skills/references/agent-tooling.md`
