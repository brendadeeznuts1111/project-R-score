# Shell Mode - Tier-1380 OMEGA Enhanced v5.1

Production-grade shell integration with REPL mode, TUI dashboard, enhanced git operations, Fish/Zsh/Bash completions, intelligent aliases, and OMEGA pipeline integration.

## Quick Start

```bash
# One-line setup
source <(./bin/kimi-shell init) && eval "$(./bin/kimi-completion.bash)"

# Launch TUI (interactive dashboard)
omega tui

# Or use individual commands
omega shell init
omega dashboard
omega health watch
omega git status
```

## What's New in v5.0

### 🎨 TUI (Text User Interface)
Interactive terminal dashboard for OMEGA operations:
- Visual menu with keyboard shortcuts
- One-key access to common operations
- Real-time status display
- No mouse required

```bash
omega tui        # Launch TUI
# Or: ot
```

### 🔧 Enhanced Git Commands
Smart git operations with OMEGA integration:

```bash
omega git status        # Show status with colors
omega git sync          # Fetch + pull from origin
omega git push          # Push current branch
omega git commit        # Stage all and commit
omega git bump patch    # Version bump commit
omega git log           # Pretty log with graph
omega git cleanup       # Delete merged branches
omega git pr            # Create pull request
```

Aliases: `og`, `ogst`, `ogsync`, `ogpush`, `ogci`, `ogbump`, `oglog`, `ogcleanup`, `ogpr`

### 🚀 Quick Aliases (40+)

| Alias | Command | Description |
|-------|---------|-------------|
| `osi` | `omega shell init` | Initialize shell |
| `oss` | `omega shell status` | Show status |
| `ods` | `omega deploy staging` | Deploy staging |
| `odp` | `omega deploy production` | Deploy production |
| `orb` | `omega registry bump` | Bump version |
| `ohc` | `omega health check` | Health check |
| `obk` | `omega backup` | Backup |
| `od` | `omega dashboard` | Dashboard |
| `ot` | `omega tui` | TUI mode |
| `og` | `omega git` | Git helper |
| `or` | `omega repl` | REPL mode |
| `orepl` | `omega repl` | REPL mode |

### 📂 Directory Navigation

```bash
ocd-chrome       # cd chrome-state
ocd-matrix       # cd matrix
ocd-config       # cd config
ocd-omega        # cd omega-blast
ocd-tension      # cd tension-field
ocd-mcp          # cd mcp_servers
ocd-skills       # cd skills
ocd-tests        # cd tests
ocd-scripts      # cd scripts
ocd-linker       # cd linker
```

## Installation

### Bash

```bash
# Add to ~/.bashrc
source <(./bin/kimi-shell init)
source ./bin/kimi-completion.bash
```

### Zsh

```bash
# Add to ~/.zshrc
source <(./bin/kimi-shell init)
```

### Fish

```bash
# Source the init
./bin/kimi-shell init | source
```

## Command Reference

### Core Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `omega shell init` | `osi` | Initialize shell mode |
| `omega shell status` | `oss` | Show shell status |
| `omega shell doctor` | `osd` | Diagnose issues |
| `omega dashboard` | `od` | Visual dashboard |
| `omega tui` | `ot` | Interactive TUI |

### Deployment

| Command | Alias | Description |
|---------|-------|-------------|
| `omega deploy staging` | `ods` | Deploy to staging |
| `omega deploy production` | `odp` | Deploy to production |
| `omega deploy dry` | `odd` | Dry run |
| `omega registry bump` | `orb` | Bump version |
| `omega health check` | `ohc` | Check health |

### Git Operations

| Command | Alias | Description |
|---------|-------|-------------|
| `omega git status` | `ogst` | Git status |
| `omega git sync` | `ogsync` | Fetch + pull |
| `omega git push` | `ogpush` | Push branch |
| `omega git commit` | `ogci` | Commit changes |
| `omega git bump` | `ogbump` | Version bump |
| `omega git log` | `oglog` | Commit log |
| `omega git cleanup` | `ogcleanup` | Clean branches |
| `omega git pr` | `ogpr` | Create PR |

### Monitoring

| Command | Alias | Description |
|---------|-------|-------------|
| `omega health watch` | `ohw` | Watch health |
| `omega monitor` | `omn` | Monitor staging |
| `omega monitor:prod` | `omp` | Monitor production |
| `omega logs` | `ol` | View logs |
| `omega metrics` | `om` | Metrics server |

## REPL Mode

Interactive Read-Eval-Print Loop for OMEGA:

```bash
omega repl        # Launch REPL
# Or: or, orepl
```

REPL Commands:
- `help` - Show available commands
- `version` - Show version
- `health` - Check health status
- `status` - Show full status
- `deploy <env>` - Deploy to environment
- `test` - Run tests
- `bench` - Run benchmarks
- `backup` - Create backup
- `set <key> <value>` - Set variable
- `get <key>` - Get variable
- `history` - Show command history
- `clear` - Clear screen
- `exit` or `quit` - Exit REPL

Features:
- Tab completion for commands
- Command history
- Variable storage
- Shell command execution

## TUI Mode

The TUI provides a visual interface for OMEGA operations:

```
╔══════════════════════════════════════════════════════════╗
║         🔥 TIER-1380 OMEGA CONTROL CENTER 🔥          ║
╚══════════════════════════════════════════════════════════╝

Quick Actions:

  [d] Dashboard              [h] Health Check
  [v] Version                [t] Run Tests
  [b] Benchmarks             [s] Deploy Staging
  [p] Deploy Production      [l] View Logs
  [m] Metrics                [c] Clear Screen
  [q] Quit

Status: Ready | Press a key to select an action
```

Keys work instantly - no Enter required!

## Git Workflow Example

```bash
# Check status
ogst

# Make changes...
# Then commit with bump
ogbump patch

# Push and create PR
ogpush
ogpr

# Or sync with main
ogsync
```

## Files

| File | Purpose |
|------|---------|
| `bin/omega` | Unified CLI |
| `bin/omega-tui` | TUI dashboard |
| `bin/omega-git` | Git helper |
| `bin/kimi-shell` | Shell initialization |
| `bin/kimi-completion.bash` | Tab completions |
| `skills/shell-mode.md` | This documentation |

## Environment

The shell mode sets these variables:
- `OMEGA_SHELL=1` - Shell mode enabled
- `OMEGA_VERSION` - Current version
- `OMEGA_THEME` - Theme preference

## Updates

To update shell mode:

```bash
omega update
omega shell reload
```

---

**Version:** 5.0 | **Aliases:** 40+ | **Commands:** 30+
