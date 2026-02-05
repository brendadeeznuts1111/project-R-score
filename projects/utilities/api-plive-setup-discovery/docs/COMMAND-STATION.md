# 🎯 Command Station - Central Hub

## Overview

The Command Station is your central dashboard for managing the Syndicate GOV Monorepo. It provides quick access to all project commands, scripts, status checks, and documentation.

## Quick Start

```bash
# Show dashboard
bun run station

# List all commands
bun run station:list

# Filter commands
bun run station:list --filter=ai

# Run a specific command
bun run station <command-name>
```

## Features

### 📊 Project Status
- **Git Status**: Current branch, ahead/behind commits, modified files
- **Dependencies**: Installation status
- **Services**: API, Redis, Database health checks
- **Build Status**: Build artifacts availability

### 🚀 Command Categories

- **Development**: `dev`, `build`, `start`, `watch`, `hot`
- **Testing**: `test`, `coverage`, `validate`, `check`
- **AI & Registry**: `ai:`, `registry:`, `dashboard:`, `endpoint:`
- **Database**: `db:`, `migrate`, `seed`, `backup`
- **Deployment**: `deploy`, `production:`, `docker:`, `repo:`
- **Monitoring**: `health`, `metrics`, `monitor`, `logs`
- **CI/CD**: `ci:`, `validate:`, `lint`, `format`
- **Utilities**: `clean`, `install`, `bun:`, `demo`, `smoke`

### ⌨️ Keyboard Shortcuts

- `[d]` - Development commands
- `[t]` - Testing commands
- `[a]` - AI/Registry commands
- `[h]` - Health Check
- `[b]` - Build commands
- `[s]` - Status details
- `[c]` - CI/CD commands
- `[x]` - Exit

## Usage Examples

```bash
# View dashboard
bun run station

# List AI commands
bun run station:list --filter=ai

# List dashboard commands
bun run station:list --filter=dashboard

# Run health check
bun run station health-check

# Run CI validation
bun run station ci:validate

# Run AI unified benchmark
bun run station ai:unified:benchmark
```

## Safety Features

⚠️ **Dangerous Commands** are marked with a warning icon. These include:
- `clean` - Removes build artifacts
- `install:clean` - Removes node_modules
- `monorepo:clean` - Removes all packages

Always review dangerous commands before execution.

## Integration

The Command Station automatically:
- Scans `package.json` for all scripts
- Categorizes commands by type
- Checks service health
- Monitors git status
- Provides safe command execution

## Tips

1. **Quick Access**: Use `bun run station` to see all available commands
2. **Filtering**: Use `--filter=<keyword>` to narrow down commands
3. **Direct Execution**: Run commands directly: `bun run station <command>`
4. **Status Check**: Always check project status before running commands

## Contributing

To add new commands to the Command Station:
1. Add scripts to `package.json`
2. Use descriptive names with prefixes (e.g., `ai:`, `dashboard:`, `registry:`)
3. The Command Station will automatically detect and categorize them

## Commands Reference

See `bun run station:list` for a complete list of all available commands.

---

**Version**: 3.0.1  
**Last Updated**: October 29, 2025

