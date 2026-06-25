# Tier-1380 OMEGA Commit Flow - Quick Reference

## One-Liners

```bash
# Install hooks
bun ~/.kimi/skills/tier1380-commit-flow/scripts/install-hooks.ts install

# Generate commit message
bun ~/.kimi/skills/tier1380-commit-flow/scripts/generate-message.ts

# Validate message
bun ~/.kimi/skills/tier1380-commit-flow/scripts/validate-message.ts "[RUNTIME][CHROME][TIER:1380] Fix entropy"

# Run pre-commit checks
bun ~/.kimi/skills/tier1380-commit-flow/scripts/pre-commit-hook.ts

# Create commit
bun ~/.kimi/skills/tier1380-commit-flow/scripts/git-commit.ts "[MSG]"

# View dashboard
bun ~/.kimi/skills/tier1380-commit-flow/scripts/governance-dashboard.ts --once

# Sync history
bun ~/.kimi/skills/tier1380-commit-flow/scripts/commit-history.ts sync

# Validate branch
bun ~/.kimi/skills/tier1380-commit-flow/scripts/branch-validator.ts

# Create PR
bun ~/.kimi/skills/tier1380-commit-flow/scripts/pr-create.ts

# Squash commits
bun ~/.kimi/skills/tier1380-commit-flow/scripts/commit-squash.ts 3 "[MSG]" --confirm
```

## Unified CLI

```bash
# Using the CLI
bun cli.ts <command>

# Or create a shortcut
alias tier1380="bun ~/.kimi/skills/tier1380-commit-flow/cli.ts"

# Shortcuts
tier1380 c "[MSG]"      # commit
tier1380 g              # generate-msg
tier1380 v "[MSG]"      # validate
tier1380 chk --fix      # check
tier1380 b              # branch
tier1380 sq 3 "[MSG]"   # squash
tier1380 p --draft      # pr
tier1380 cfg show       # config
```

## Commit Format

```
[DOMAIN][COMPONENT:NAME][TIER:1380] Description

Examples:
[RUNTIME][COMPONENT:CHROME][TIER:1380] Add entropy caching
[PLATFORM][COMPONENT:REGISTRY][TIER:1380] Fix R2 upload
[SKILLS][COMPONENT:FLOW][TIER:1380] Update pre-commit hook
```

## Branch Naming

```
feature/TIER-XXXX-short-description
fix/TIER-XXXX-short-description
hotfix/TIER-XXXX-short-description
release/vX.Y.Z
docs/short-description
```

## Domains

| Domain | Use For |
|--------|---------|
| RUNTIME | Bun runtime, tools/ |
| PLATFORM | Skills, Matrix, Infra |
| SECURITY | Auth, encryption |
| DOCS | Documentation |
| TEST | Tests, coverage |

## Components

| Component | Use For |
|-----------|---------|
| REGISTRY | R2, Bun.s3, upload/download |
| MATRIX | Matrix columns, analysis |
| CHROME | Chrome State (cols 71-75) |
| SSE | Event streaming, alerts |
| MCP | Model Context Protocol |
| SKILLS | Skills registry |
| FLOW | Commit flow, governance |

## Git Hook Scripts

| Script | Hook | Purpose |
|--------|------|---------|
| pre-commit-hook.ts | pre-commit | Lint, type check, secrets scan |
| validate-message.ts | commit-msg | Validate message format |
| commit-history.ts | post-commit | Record to analytics |
| pre-push-hook.ts | pre-push | Branch validation, WIP check |
| branch-validator.ts | - | Branch naming validation |

## Pre-Commit Options

```bash
--fix      Auto-fix lint issues
--quick    Skip tests and type check
```

## Pre-Push Options

```bash
--force    Bypass push checks (emergency)
```

## Git Commit Options

```bash
--sign, -S     GPG sign commit
--amend        Amend last commit
--no-verify    Skip validation
--co-author    Add co-author
```

## Configuration

```bash
# Show config
bun ~/.kimi/skills/tier1380-commit-flow/lib/config.ts show

# Set value
bun ~/.kimi/skills/tier1380-commit-flow/lib/config.ts set autoFix true

# Reset to defaults
bun ~/.kimi/skills/tier1380-commit-flow/lib/config.ts reset
```

## Environment Variables

```bash
TIER1380_AUTO_FIX=true    # Auto-fix lint
TIER1380_SKIP_TESTS=true  # Skip tests
TIER1380_GPG_SIGN=true    # Sign commits
```

## Emergency Bypass

```bash
# Skip all hooks (use sparingly)
git commit -m "[URGENT] Fix" --no-verify
git push --no-verify
```
