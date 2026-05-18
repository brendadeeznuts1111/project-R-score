# Tier-1380 OMEGA Slash Commands

## Commit Workflow Commands

### `/commit [message]`

Execute perfect commit workflow.

**Examples:**
```
/commit
/commit "[RUNTIME][CHROME][TIER:1380] Fix entropy calc"
```

**Flow:**
1. Stage changes
2. Run lint
3. Run tests
4. Type check
5. Generate/validate message
6. Create commit

### `/governance [scope]`

Run governance checks.

**Scopes:**
- `all` - Full codebase check
- `staged` - Only staged files
- `file <path>` - Specific file
- `matrix` - Matrix columns only
- `skills` - Skills compliance only

**Examples:**
```
/governance
/governance staged
/governance file chrome-state/entropy.ts
/governance matrix
```

### `/flow [step]`

Execute specific flow step.

**Steps:**
- `lint` - Run Biome lint
- `test` - Run tests
- `type-check` - TypeScript check
- `commit-msg` - Generate message
- `full` - Complete workflow

**Examples:**
```
/flow lint
/flow full
```

## Quick Action Commands

### Code Quality

| Command | Description |
|---------|-------------|
| `/lint` | Run Biome lint on staged files |
| `/test` | Run relevant test suite |
| `/typecheck` | Run TypeScript type check |
| `/format` | Run Biome format |
| `/check` | Run all checks (lint + test + type) |

### Git Operations

| Command | Description |
|---------|-------------|
| `/stage` | Stage all changes (`git add -A`) |
| `/unstage` | Unstage all changes (`git reset`) |
| `/status` | Show git status |
| `/diff` | Show staged diff |
| `/log` | Show recent commits |

### Validation

| Command | Description |
|---------|-------------|
| `/matrix-check` | Validate matrix column definitions |
| `/skills-check` | Run skills compliance tests |
| `/blast-check` | Validate Bun BLAST suite |
| `/chrome-check` | Run Chrome State tests |
| `/validate-msg "msg"` | Validate commit message format |

### Helpers

| Command | Description |
|---------|-------------|
| `/suggest-domain` | Suggest domain for current changes |
| `/suggest-component` | Suggest component for current changes |
| `/commit-msg` | Generate commit message from changes |
| `/tier` | Show current tier level |
| `/omega-status` | Show OMEGA protocol status |

## Special Commands

### `/yolo`

Toggle YOLO mode (auto-approve all operations).

**Warning:** Use with caution. Skips all confirmations.

### `/skill:tier1380-commit-flow`

Load this skill manually.

### `/flow:tier1380-commit-flow`

Execute the complete commit flow.

## Command Aliases

| Alias | Full Command |
|-------|--------------|
| `/c` | `/commit` |
| `/g` | `/governance` |
| `/l` | `/lint` |
| `/t` | `/test` |
| `/s` | `/status` |
| `/d` | `/diff` |

## Usage Examples

### Daily Workflow

```
# Make changes to code...

/stage
/lint
/test
/commit
```

### Quick Fix

```
# Fix linting issues
/lint
/format
/commit "[STYLE][COMPONENT][TIER:1380] Fix formatting"
```

### Matrix Work

```
# Update matrix columns
/matrix-check
/governance matrix
/commit "[PLATFORM][COMPONENT:MATRIX][TIER:1380] Update col 45 threshold"
```

### Skills Compliance

```
# Before committing skills
/skills-check
/governance skills
/commit "[PLATFORM][COMPONENT:SKILLS][TIER:1380] Add new skill"
```

## Configuration

### Default Behavior

Commands respect project configuration:
- Uses `biome.json` for linting
- Uses `tsconfig.json` for type checking
- Uses `bun.json5` for task definitions

### Environment Variables

| Variable | Effect |
|----------|--------|
| `TIER_LEVEL` | Override tier level |
| `SKIP_TESTS` | Skip test execution |
| `SKIP_LINT` | Skip linting |
| `AUTO_PUSH` | Auto-push after commit |

## Troubleshooting

### Command Not Found

If slash command not recognized:
1. Ensure skill is loaded: `/skill:tier1380-commit-flow`
2. Check command spelling
3. Use full command name (not alias)

### Flow Fails

If `/flow` fails:
1. Check individual steps: `/lint`, `/test`, `/typecheck`
2. Fix issues in failing step
3. Re-run `/flow`

### Governance Failures

If `/governance` fails:
1. Check specific scope: `/governance matrix` or `/governance skills`
2. Review [GOVERNANCE.md](GOVERNANCE.md)
3. Fix issues and re-run
