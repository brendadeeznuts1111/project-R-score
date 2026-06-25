# /cmd - Unified Command System v6.0

Tier-1380 OMEGA's unified command router with modular architecture, intelligent completions, and context-aware routing.

## Quick Reference

### 🎯 Command Structure
```bash
cmd <namespace> <command> [args...]
```

### 📚 Namespaces
| Namespace | Description | Example |
|-----------|-------------|---------|
| `infra` | Service management, health checks | `cmd infra status` |
| `pm` | Bun package management | `cmd pm audit` |
| `matrix` | Lockfile health matrix | `cmd matrix scan .` |
| `projects` | Git project management | `cmd projects sync --all` |
| `omega` | Core OMEGA protocol | `cmd omega dashboard` |
| `chrome` | Chrome state management | `cmd chrome query` |
| `skill` | Tier-1380 skills | `cmd skill list` |
| `dash` | Dashboard quick control | `cmd dash start` |

## Infrastructure Commands

```bash
cmd infra status                    # Full infrastructure status
cmd infra start dashboard          # Start dashboard server
cmd infra stop dashboard           # Stop dashboard server
cmd infra restart dashboard        # Restart with health check
cmd infra health                   # Health check all components
cmd infra context                  # Show domain context
cmd infra logs dashboard           # Show dashboard logs
cmd infra diagnose                 # Run diagnostic suite
cmd infra emergency-stop           # Emergency shutdown
```

### Quick Aliases
```bash
is              # infra status
ish             # infra health
ic              # infra context
idiag           # infra diagnose
idstart         # infra start dashboard
idstop          # infra stop dashboard
idrestart       # infra restart dashboard
```

## Package Manager Commands

```bash
cmd pm install                      # Install dependencies
cmd pm install --frozen-lockfile    # CI mode
cmd pm add <pkg>                    # Add package
cmd pm add <pkg> -D                 # Add dev dependency
cmd pm add <pkg> -E                 # Exact version
cmd pm remove <pkg>                 # Remove package
cmd pm audit                        # Security audit
cmd pm outdated                     # Check for updates
cmd pm ls                           # List packages
cmd pm why <pkg>                    # Why is this installed?
cmd pm cache clear                  # Clear cache
cmd pm hash                         # Lockfile hash
cmd pm graph                        # Dependency graph
```

### Quick Aliases
```bash
cpm             # cmd pm
cpm audit       # Security audit
cpm hash        # Lockfile hash
```

## Chrome State Commands

```bash
cmd chrome persist <profile> <cookies> <stores> <checksum> <domains> <duration>
cmd chrome query [profile]          # Query Chrome state
cmd chrome seal                     # Seal operations
cmd chrome vault                    # Vault operations
cmd chrome bridge                   # Bridge operations
```

## Skill Commands

```bash
cmd skill list                      # List all Tier-1380 skills
cmd skill load <name>               # Load a skill (Kimi CLI)
cmd skill status                    # Show skills status
```

### Quick Aliases
```bash
cskill          # cmd skill
cskill list     # List skills
```

## Discovery & Help

```bash
cmd --help                          # Show main help
cmd --list                          # List all namespaces and commands
cmd --version                       # Show version
cmd <namespace> --help             # Namespace help
cmd --complete <namespace>         # List completions for shell
```

## Shell Completions

### Zsh
```bash
source <(cmd --init-zsh)
```

### Bash
```bash
source <(cmd --init-bash)
```

### FZF Integration
```bash
# Add to .zshrc or .bashrc
source <(cmd --init-zsh)
eval "$(fzf --zsh)"  # or --bash
```

## Integration with Kimi Shell

When you initialize shell mode, these aliases are automatically available:

```bash
# Unified command aliases
alias cmd='./bin/cmd'
alias c='./bin/cmd'

# Quick shortcuts
alias cstatus='cmd infra status'
alias chealth='cmd infra health'
alias cpm='cmd pm'
alias cskill='cmd skill'
alias cmatrix='cmd matrix'
alias cprojects='cmd projects'
```

## Architecture

The cmd system uses a modular plugin architecture:

```typescript
// Command namespace definition
const NAMESPACES = {
  infra: {
    name: "Infrastructure",
    bin: "./bin/infra",           // Passthrough to binary
    commands: ["status", "start", "stop", ...]
  },
  pm: {
    name: "Package Manager",
    handler: handlePmCommand,     // Custom handler function
    commands: ["install", "add", "audit", ...]
  },
  matrix: {
    name: "Lockfile Matrix",
    script: "./scripts/lockfile-matrix.ts",  // Bun script
    commands: ["scan", "health", "migrate"]
  }
};
```

## Bun APIs Used

| API | Purpose |
|-----|---------|
| `Bun.spawn` | Execute subprocesses |
| `Bun.file` | Check file existence |
| `Bun.Glob` | Directory scanning |
| `process.argv` | CLI argument parsing |

## Examples

### Daily Workflow
```bash
# Morning sync
cmd infra status                    # Check infrastructure
cmd health                          # Quick health check
cmd pm outdated                     # Check for updates

# Development
cmd dash start                      # Start dashboard
cmd pm add zod -D                   # Add dependency
cmd skill list                      # List available skills

# End of day
cmd projects sync --all             # Sync all projects
cmd infra health                    # Final health check
```

### CI/CD Pipeline
```bash
# Verify lockfile
cmd pm install --frozen-lockfile

# Security audit
cmd pm audit

# Health check
cmd infra health
```

## Migration from Legacy Commands

| Legacy | New Unified |
|--------|-------------|
| `infra status` | `cmd infra status` or `is` |
| `bun pm audit` | `cmd pm audit` or `cpm audit` |
| `bun run matrix` | `cmd matrix scan` |
| `./bin/omega dashboard` | `cmd omega dashboard` |

## Version History

- **v6.0** - Unified command system with namespaces, completions, and modular architecture
- **v5.0** - Infrastructure management with `infra` command
- **v4.0** - OMEGA CLI core
