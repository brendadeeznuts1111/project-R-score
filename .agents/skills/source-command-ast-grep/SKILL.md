---
name: "source-command-ast-grep"
description: "ast-grep structural tools — outline, search, audit, semver gates, skill loop"
---

# source-command-ast-grep

Use this skill when the user asks to run the migrated source command `ast-grep`.

## Command Template

Use ast-grep for syntax-aware exploration before broad file reads. Prefer MCP `ast-grep` tools when available.

## Quick start

```bash
cd .agents/skills/ast-grep
bun run doctor
AG=scripts/ast_grep_helper.py
python3 $AG outline projects/active/sports-terminal-os/src/index.ts --view digest
python3 $AG search 'Bun.serve($$$)' --path projects/active/sports-terminal-os --lang ts
python3 $AG audit --profile ci --only sports-terminal --fail-on
```

## Pre-commit + semver

```bash
bun run precommit
bun run precommit:packages -- --fail-on
bun run supply-chain:packages -- --domain agents-ast-grep --fail-on
```

## Loops

```bash
bun run loop:quick
bun run close-loop:ci
bun run skill-loop:matrix -- --phases doctor,precommit,rate
```

## MCP tools

`ast_grep_outline`, `ast_grep_search`, `ast_grep_audit`, `ast_grep_test`, `ast_grep_network`, `ast_grep_skill_loop`, `ast_grep_precommit`, `ast_grep_workflow`

Full skill: `.agents/skills/ast-grep/SKILL.md` · shared tooling: `.agents/skills/references/agent-tooling.md`
