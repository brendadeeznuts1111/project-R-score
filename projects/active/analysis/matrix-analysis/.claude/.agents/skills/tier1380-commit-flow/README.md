# Tier-1380 OMEGA Commit Flow

A comprehensive Bun-native commit governance system for Tier-1380 OMEGA projects.

## Features

- **🤖 Automated Git Hooks** - Pre-commit, commit-msg, post-commit, pre-push
- **✅ Message Validation** - Tier-1380 format enforcement
- **🔒 Security Scanning** - Secrets detection before commit
- **📊 Analytics Dashboard** - Real-time commit quality metrics
- **🌿 Branch Validation** - Naming convention enforcement
- **🔀 Interactive Squash** - Guided commit squashing
- **📦 PR Creation** - GitHub PR templates
- **⚙️ Configuration** - User and project-level settings

## Quick Start

```bash
# Run setup
bun ~/.kimi/skills/tier1380-commit-flow/setup.ts

# Or use the CLI directly
bun ~/.kimi/skills/tier1380-commit-flow/cli.ts <command>
```

## Installation

### Option 1: Full Setup (Recommended)

```bash
bun ~/.kimi/skills/tier1380-commit-flow/setup.ts
```

This will:
- Check prerequisites (Bun, Git)
- Install all git hooks
- Initialize configuration
- Create shell alias (`tier1380`)

### Option 2: Manual Setup

```bash
# Install hooks only
bun ~/.kimi/skills/tier1380-commit-flow/scripts/install-hooks.ts install

# Initialize config
bun ~/.kimi/skills/tier1380-commit-flow/lib/config.ts
```

## Usage

### CLI Commands

```bash
# Using full path
bun ~/.kimi/skills/tier1380-commit-flow/cli.ts <command>

# Or with alias (after setup)
tier1380 <command>
```

### Available Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `commit` | `c` | Create commit with validation |
| `generate-msg` | `g` | Auto-generate commit message |
| `validate` | `v` | Validate message format |
| `check` | `chk` | Run pre-commit checks |
| `branch` | `b` | Validate branch name |
| `squash` | `sq` | Squash commits interactively |
| `pr` | `p` | Create GitHub PR |
| `dashboard` | `d` | Open governance dashboard |
| `config` | `cfg` | Manage configuration |
| `hooks` | `h` | Manage git hooks |

### Examples

```bash
# Generate a commit message
tier1380 g

# Create a commit
tier1380 c "[RUNTIME][CHROME][TIER:1380] Add entropy caching"

# Validate branch name
tier1380 b

# Run pre-commit checks with auto-fix
tier1380 chk --fix

# Create a PR
tier1380 p --draft
```

## Commit Message Format

```
[DOMAIN][COMPONENT:NAME][TIER:1380] Brief description

Examples:
[RUNTIME][COMPONENT:CHROME][TIER:1380] Add entropy caching
[PLATFORM][COMPONENT:REGISTRY][TIER:1380] Fix R2 upload
[SKILLS][COMPONENT:FLOW][TIER:1380] Update pre-commit hook
```

### Domains

- `RUNTIME` - Bun runtime, core features
- `PLATFORM` - Infrastructure, deployment
- `SECURITY` - Authentication, encryption
- `API` - Endpoints, schemas
- `UI` - Frontend, dashboards
- `DOCS` - Documentation
- `TEST` - Test files

### Components

- `CHROME` - Chrome State (Cols 71-75)
- `MATRIX` - Matrix columns
- `REGISTRY` - R2, Bun.s3
- `BLAST` - Bun BLAST suite
- `SKILLS` - Skills registry
- `SSE` - Event streaming
- `MCP` - Model Context Protocol

## Branch Naming

```
feature/TIER-XXXX-short-description
fix/TIER-XXXX-short-description
hotfix/TIER-XXXX-short-description
release/vX.Y.Z
docs/short-description
```

## Git Hooks

The following hooks are installed:

| Hook | Purpose |
|------|---------|
| `pre-commit` | Lint, type check, secrets scan, Col-89 |
| `commit-msg` | Validate message format |
| `post-commit` | Record to analytics |
| `pre-push` | Branch validation, WIP check, sync check |

## Configuration

Configuration is stored in `~/.config/tier1380-commit-flow/config.json`.

```bash
# View configuration
tier1380 cfg show

# Set a value
tier1380 cfg set autoFix true

# Reset to defaults
tier1380 cfg reset
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `autoFix` | `false` | Auto-fix lint issues |
| `enableLint` | `true` | Run Biome lint |
| `enableTypeCheck` | `true` | Run TypeScript check |
| `enableTests` | `true` | Run tests |
| `enableSecretsScan` | `true` | Scan for secrets |
| `enableCol89` | `true` | Check line width |
| `signCommits` | `false` | GPG sign commits |
| `autoStage` | `true` | Auto-stage changes |

## Dashboard

Interactive terminal dashboard for monitoring commit quality:

```bash
tier1380 dashboard
```

Features:
- Real-time metrics (commits, valid format rate)
- Compliance trend (7-day history)
- Failed check tracking
- Interactive controls (r=refresh, s=sync, q=quit)

## Testing

```bash
cd ~/.kimi/skills/tier1380-commit-flow
bun test
```

## Documentation

- [SKILL.md](SKILL.md) - Complete documentation
- [QUICKREF.md](QUICKREF.md) - Quick reference
- [references/COMMIT_FORMAT.md](references/COMMIT_FORMAT.md) - Commit format spec
- [references/GOVERNANCE.md](references/GOVERNANCE.md) - Governance rules

## Requirements

- Bun >= 1.3.0
- Git >= 2.0
- GitHub CLI (optional, for PR creation)

## License

MIT - Part of the Tier-1380 OMEGA project
