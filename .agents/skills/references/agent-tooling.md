# Agent tooling (husky · semver · ast-grep · workflow)

Shared gates and MCP tools for all `.agents/skills/*` skills. Prefer MCP over shell when the `ast-grep` server is enabled in `.cursor/mcp.json`.

## Pre-commit (husky)

Hook chain at `.husky/pre-commit`:

| Step | Command | When |
|------|---------|------|
| Hygiene | `bun scripts/repo-hygiene.ts --staged` | Always |
| Harness | `bun scripts/pre-commit-harness.ts` | Staged root harness `.ts` |
| ast-grep + semver | `bun scripts/pre-commit-ast-grep.ts` | Staged `.agents/skills/ast-grep/**`, lockfiles, or `security.policy.toml` |

Setup after clone: `bun run prepare`

Manual gates:

```bash
bun run precommit:ast-grep              # full: doctor + rules + semver + packages
bun run precommit:ast-grep:changed      # only when ast-grep paths differ from HEAD
bun run precommit:ast-grep:staged       # same logic as husky hook
cd .agents/skills/ast-grep && bun run precommit           # rules + semver (skill-local)
cd .agents/skills/ast-grep && bun run precommit:packages  # supply-chain semver policy
```

Never use `git commit --no-verify` unless the user explicitly requests it.

## Semver policy

Policy file: `.agents/skills/ast-grep/policies/security.policy.toml`

```bash
cd .agents/skills/ast-grep
bun run precommit:semver
python3 scripts/ast_grep_helper.py -q bun supply-chain semver --version 1.5.0 --range '<1.6.0'
bun run supply-chain:packages -- --fail-on
```

Uses `Bun.semver.satisfies` via `SemverMatcher` (Layer 5 Registry).

## Workflow loop (effect plugins)

Continuous scan + drift + pluggable effects (`log`, `alert`, `fix`, `report`, custom):

```bash
cd .agents/skills/ast-grep
bun run workflow:plan
bun run workflow:start -- --seed --fail-on-drift
bun run workflow:effects
bun scripts/skill-loop-cli.ts workflow --domain sports-terminal-os \
  --scan-path projects/active/sports-terminal-os/dist/frontend --dry-run --explain
```

Effect flags: `--effect alert.url=...`, `--effect fix`, `--effects-dir effects --effect custom`

## Skill loop registry

Matrix across all agent skills:

```bash
cd .agents/skills/ast-grep
bun run skill-loop:list
bun run skill-loop:matrix -- --phases doctor,precommit,rate
bun run loop:quick
bun run close-loop:ci
```

Registry: `skill-loop-registry.json` · presets: `quick`, `full`, `ci`, `close-loop`

## Two skills planes

| Plane | Catalog | Source |
|-------|---------|--------|
| Kimi Daimon | `/registry/skills-catalog.json` | `PORTAL_SKILLS_DIR` (Kimi Work managed dir) |
| Harness agents | `/registry/harness-skills-catalog.json` | repo `.agents/skills/` + `skill-loop-registry.json` |

Bake both: `bun run ops:snapshot --no-routing` (skills section). Do not conflate Kimi `cascade-mover` with repo `cascade-mover-v3`.

## MCP tools (`ast-grep` server)

| MCP tool | Use when |
|----------|----------|
| `ast_grep_outline` | Map symbols before reading large files |
| `ast_grep_search` / `ast_grep_files` | Structural pattern find |
| `ast_grep_audit` | Rule scan with `--fail-on` |
| `ast_grep_test` | Rule snapshot tests |
| `ast_grep_network` | Dist surface + ground-truth gate |
| `ast_grep_skill_loop` | `list`, `run`, `matrix`, `close-loop`, `workflow`, `precommit` |
| `ast_grep_precommit` | Run staged or full precommit gates |
| `ast_grep_workflow` | Workflow loop with effect plugins |

Reload MCP after skill changes: `cd .agents/skills/ast-grep && ./scripts/verify-mcp.sh`

## Commit agent checklist

Before commit:

1. `bun run precommit:ast-grep` if ast-grep / lockfile paths changed
2. Stage by filename only (`git add <file> ...`)
3. Let husky run — fix failures, re-stage, new commit (no `--amend` unless asked)

On hook failure, read stderr for which gate failed (hygiene · harness · rules · semver · packages).