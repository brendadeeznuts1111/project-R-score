# Scripts Directory

Shell scripts and utilities for development and maintenance.

## 🧹 Process Cleanup Scripts

### `cleanup-dev-processes.sh`
Comprehensive development process cleanup utility.
- Scans for development processes (bun, vite, node dev servers)
- Terminates zombie processes gracefully
- Checks development ports (3000, 5555, 8000, 4000, 5000, 8080, 3001)
- Preserves IDE processes (Windsurf, Cursor)
- Provides colored output and detailed feedback

**Usage:**
```bash
./scripts/cleanup-dev-processes.sh
```

### `quick-cleanup.sh`
Quick reference commands and current status.
- Shows the exact commands for manual cleanup
- Displays current running processes
- Provides copy-paste ready commands
- Quick port verification

**Usage:**
```bash
./scripts/quick-cleanup.sh
```

### `setup-aliases.sh`
Setup convenient shell aliases for cleanup commands.
- Adds aliases to ~/.zshrc
- Creates shortcuts for common cleanup tasks

**Usage:**
```bash
./scripts/setup-aliases.sh
source ~/.zshrc
```

## 🎯 Available Aliases (after setup)

```bash
cleanup-dev      # Run comprehensive cleanup
quick-cleanup    # Show quick reference commands
ps-bun          # Show running bun processes
check-ports     # Check development ports
kill-bun        # Kill all bun processes (except IDE)
```

## 📋 Manual Cleanup Commands

```bash
# Comprehensive cleanup
./scripts/cleanup-dev-processes.sh

# Quick reference and commands
./scripts/quick-cleanup.sh

# Manual cleanup
ps aux | grep bun | grep -v grep
kill <PID>
lsof -i :<port>
```

## 🔧 API Testing Scripts

### `test-blob-api.sh`
Test script for blob API functionality.

### `test-enhanced-blob-api.sh`
Enhanced blob API testing with additional features.

---
*Scripts directory organized and enhanced with process cleanup utilities.*
