# 🎛️ Dev HQ CLI Reference

**Complete CLI** for **Dev HQ workspace** using **Bun runtime flags** based on [official Bun documentation](https://bun.com/docs/runtime#runtime-%26-process-control).

## 🏗️ **Perfect Separation Pattern**

Dev HQ CLI follows **THE** fundamental architectural pattern for Bun-based CLIs:

```bash
# Perfect separation: Bun handles Bun flags, CLI handles CLI flags
bun [bun-flags] script.ts [command] [cli-flags]
```

### **📋 Pattern Breakdown**

```bash
bun --hot --watch dev-hq-cli.ts insights --table --json
└─┬─┘ └────┬─────┘ └──────┬──────┘ └──┬──┘ └────┬────┘
  │        │              │           │         └── CLI flags (what)
  │        │              │           └── Command
  │        │              └── Script
  │        └── Bun runtime flags (how)
  └── Bun executable
```

**RULE**: If it affects **how Bun runs** the script → **Bun flag**. If it affects **what the script does** → **CLI flag**.

### **✅ Correct Usage**

```bash
# Development with hot reload (Bun handles --hot, CLI handles --table)
bun --hot --watch packages/cli/src/index.ts insights --table

# Production profiling (Bun handles --smol, CLI handles --json)
bun --smol packages/cli/src/index.ts insights --json

# Debug session (Bun handles --inspect, CLI handles commands)
bun --inspect=9229 packages/cli/src/index.ts serve --port=3000
```

### **❌ Incorrect Usage**

```bash
# Mixed concerns - don't do this
bun packages/cli/src/index.ts --hot --table  # ❌ --hot is Bun flag, --table is CLI flag
```

**Benefits:**
- ✅ **Clear Responsibility**: No ambiguity about which tool handles what
- ✅ **Predictable Behavior**: Users learn once, apply everywhere  
- ✅ **Tool Evolution**: Bun can add runtime flags without breaking CLIs
- ✅ **CLI Flexibility**: CLIs can add features without Bun changes

## 🏃 Usage

```bash
# Global install (when published)
bun add -g @dev-hq/cli
dev-hq --help

# Local workspace - run CLI directly
bun packages/cli/src/index.ts insights --table

# Run Dev HQ CLI with bun run (similar to bun run ./index.js)
# Syntax: bun [bun flags] run <script> [script flags]
bun run ./packages/cli/src/index.ts insights --table
bun ./packages/cli/src/index.ts serve --hot

# Run as package.json script (recommended)
# Syntax: bun [bun flags] run <script> [script flags]
bun run insights
bun run serve
bun --watch run serve  # Bun flags after 'bun', not after script
```

## 📋 Commands

### `dev-hq insights`
Analyze codebase with multiple output formats.

**Options:**
- `--json` - JSON output (for CLI scripting)
- `--table` - Bun.inspect.table output (formatted tables)

**Examples:**
```bash
# Table output
dev-hq insights --table --console-depth=4

# JSON output
dev-hq insights --json | jq '.stats.healthScore'

# With Bun flags
dev-hq insights --smol --prefer-offline --table
```

### `dev-hq serve`
Start Dev HQ server with hot reload and debugging.

**Options:**
- `--port <port>` - Port number (0 for random, default: 0)

**Examples:**
```bash
# Dev server with hot reload
dev-hq serve --hot --watch --inspect

# Production server
dev-hq serve --smol --port=8080

# With debugging
dev-hq serve --inspect-brk --port=3000

# When using bun run, put Bun flags after bun:
bun --watch run serve    # ✔️ watch mode enabled
bun --hot run serve      # ✔️ hot reload enabled
bun run serve --watch    # ❌ --watch ignored, passed to script
```

### `dev-hq health`
Quick health check with exit codes.

**Examples:**
```bash
# Health check (exit 0 if healthy, 1 if degraded)
dev-hq health --smol --no-install

# For CI/CD
dev-hq health || echo "Health check failed"
```

### `dev-hq test`
Run tests with feature flags.

**Options:**
- `--feature <features>` - Feature flags (comma-separated)

**Examples:**
```bash
# Run tests with features
dev-hq test --feature=MOCK_API,TEST_MODE

# With Bun flags
dev-hq test --smol --prefer-offline
```

### `dev-hq run <cmd...>`
Run any command with Dev HQ monitoring.

**Options:**
- `-m, --metrics` - Capture metrics after command execution

**Examples:**
```bash
# Run a command
dev-hq run echo "Hello World"

# Run with metrics
dev-hq run --metrics bun test

# Run complex commands
dev-hq run --metrics bun build --outdir=dist

# With Bun flags
dev-hq run --smol --metrics npm run build
```

## 🎛️ Bun Runtime Flags

All flags from [Bun Runtime documentation](https://bun.com/docs/runtime#runtime-%26-process-control) are supported:

### Runtime & Process Control

| Flag | Description | Example |
|------|-------------|---------|
| `-b, --bun` | Force script to use Bun's runtime instead of Node.js | `dev-hq serve --bun` |
| `--shell <shell>` | Control shell for package.json scripts (`bun` or `system`) | `dev-hq serve --shell=bun` |
| `--smol` | Use less memory, run GC more often | `dev-hq insights --smol` |
| `--expose-gc` | Expose `gc()` on global object | `dev-hq serve --expose-gc` |
| `--no-deprecation` | Suppress deprecation warnings | `dev-hq serve --no-deprecation` |
| `--throw-deprecation` | Throw errors on deprecation warnings | `dev-hq serve --throw-deprecation` |
| `--title <title>` | Set process title | `dev-hq serve --title="Dev HQ"` |
| `--zero-fill-buffers` | Force zero-filled buffers | `dev-hq serve --zero-fill-buffers` |
| `--no-addons` | Disable Node.js addons | `dev-hq serve --no-addons` |
| `--unhandled-rejections <mode>` | Handle unhandled rejections (`strict`, `throw`, `warn`, `none`, `warn-with-error-code`) | `dev-hq serve --unhandled-rejections=strict` |
| `--console-depth <depth>` | Console inspection depth (default: 2) | `dev-hq insights --console-depth=5` |

### Development Workflow

| Flag | Description | Example |
|------|-------------|---------|
| `--watch` | Automatically restart on file change | `dev-hq serve --watch` |
| `--hot` | Enable hot reload | `dev-hq serve --hot` |
| `--no-clear-screen` | Disable clearing screen on reload | `dev-hq serve --hot --no-clear-screen` |

### Debugging

| Flag | Description | Example |
|------|-------------|---------|
| `--inspect [port]` | Activate Bun's debugger | `dev-hq serve --inspect` |
| `--inspect-wait [port]` | Debugger, wait for connection | `dev-hq serve --inspect-wait` |
| `--inspect-brk [port]` | Debugger with breakpoint on first line | `dev-hq serve --inspect-brk` |

### Dependency & Module Resolution

All flags from [Bun Dependency & Module Resolution docs](https://bun.com/docs/runtime#dependency-%26-module-resolution):

| Flag | Description | Example |
|------|-------------|---------|
| `-r, --preload <module>` | Import a module before other modules are loaded | `dev-hq insights --preload=./setup.ts` |
| `--require <module>` | Alias of --preload, for Node.js compatibility | `dev-hq insights --require=dotenv/config` |
| `--import <module>` | Alias of --preload, for Node.js compatibility | `dev-hq insights --import=./init.js` |
| `--no-install` | Disable auto-install | `dev-hq insights --no-install` |
| `--install <mode>` | Auto-install behavior (`auto`, `fallback`, `force`) | `dev-hq insights --install=fallback` |
| `-i` | Auto-install (equivalent to `--install=fallback`) | `dev-hq insights -i` |
| `--prefer-offline` | Skip staleness checks, use cache | `dev-hq insights --prefer-offline` |
| `--prefer-latest` | Always use latest matching versions | `dev-hq insights --prefer-latest` |
| `--conditions <conditions>` | Pass custom conditions to resolve | `dev-hq insights --conditions=production` |
| `--main-fields <fields>` | Main fields to lookup in package.json | `dev-hq insights --main-fields=browser,module` |
| `--preserve-symlinks` | Preserve symlinks when resolving | `dev-hq insights --preserve-symlinks` |
| `--preserve-symlinks-main` | Preserve symlinks for main entry | `dev-hq insights --preserve-symlinks-main` |
| `--extension-order <order>` | Extension resolution order (default: `.tsx,.ts,.jsx,.js,.json`) | `dev-hq insights --extension-order=.tsx,.ts,.jsx,.js` |

### Global Configuration & Context

All flags from [Bun Global Configuration & Context docs](https://bun.com/docs/runtime#global-configuration-%26-context):

| Flag | Description | Example |
|------|-------------|---------|
| `--env-file <file>` | Load environment variables from the specified file(s) | `dev-hq insights --env-file=.env.local` |
| `--cwd <path>` | Absolute path to resolve files & entry points from. This just changes the process' cwd | `dev-hq insights --cwd=/path/to/project` |
| `-c, --config <path>` | Specify path to Bun config file. Default `$cwd/bunfig.toml` | `dev-hq insights --config=./custom-bunfig.toml` |

## 🚀 Examples

### Basic Usage (Similar to `bun run`)

Run Dev HQ CLI commands similar to running Bun files:

```bash
# Run insights command (similar to bun run ./index.js)
dev-hq insights --table

# Run serve command (similar to bun run ./server.ts)
dev-hq serve --hot --watch

# Run health check (similar to bun run ./health.ts)
dev-hq health
```

**Important:** Bun flag syntax: `bun [bun flags] run <script> [script flags]`

This follows **THE Perfect Separation Pattern**:

```bash
# Architecture: Bun flags (how) → Script → CLI flags (what)
bun [bun-flags] script.ts [command] [cli-flags]
```

When using `bun run` with Bun flags, put flags immediately after `bun`:

```bash
# ✅ Correct: Bun flags control HOW Bun runs the script
bun --watch run dev                    # Bun handles --watch
bun --hot --watch run serve            # Bun handles --hot, --watch
bun --inspect run dev                  # Bun handles --inspect
bun --smol run insights --table        # Bun handles --smol, CLI handles --table

# ❌ Incorrect: Flags after script are passed to script, not Bun
bun run dev --watch                    # --watch ignored by Bun, passed to script
bun run serve --hot                    # --hot ignored by Bun, passed to script
```

**Architectural Rule:**
- **Bun flags** (before script): Control runtime behavior (--hot, --watch, --smol, --inspect)
- **CLI flags** (after command): Control script behavior (--table, --json, --port, --metrics)

**Syntax:** `bun [bun flags] run <script> [script flags]`

Flags at the end will be ignored by Bun and passed through to the script itself.

Run from package.json scripts (just like `bun run dev` or `bun run lint`):

```bash
# Your package.json includes:
# "scripts": {
#   "insights": "dev-hq insights --table",
#   "serve": "dev-hq serve --hot --watch",
#   "health": "dev-hq health",
#   "lint": "dev-hq insights --json | jq '.stats'"
# }

# Then run (similar to bun run dev):
bun run insights
bun run serve
bun run health
bun run lint
```

### Development Workflow
```bash
# Hot reload dev server with debugging
dev-hq serve --hot --watch --inspect

# Test with mocks
dev-hq test --feature=MOCK --smol

# Insights with deep console inspection
dev-hq insights --table --console-depth=5
```

### Production/CI
```bash
# Minimal CLI (no UI)
dev-hq insights --json --prefer-offline | jq '.stats.healthScore'

# Health check (exit code)
dev-hq health --smol --no-install

# Low memory production server
dev-hq serve --smol --port=8080 --no-clear-screen
```

### Install & Resolution
```bash
# Offline mode (CI)
dev-hq insights --prefer-offline --no-install

# Latest deps
dev-hq insights --prefer-latest

# Custom conditions
dev-hq insights --conditions=production --main-fields=main
```

## 📊 Output Formats

### Table Output (`--table`)
Uses Bun's native `inspect.table()` for beautiful formatted tables:

```bash
dev-hq insights --table
```

Shows:
- Files table (Path, Lines, Size, Language)
- Statistics table (Total Files, Total Lines, Total Size, Health Score)

### JSON Output (`--json`)
Structured JSON output for CLI scripting:

```bash
dev-hq insights --json | jq '.stats.healthScore'
```

Returns:
```json
{
  "files": [...],
  "stats": {
    "totalFiles": 123,
    "totalLines": 4567,
    "totalSize": 123456,
    "healthScore": 85,
    "languages": {...}
  }
}
```

### Default Dashboard
Rich formatted output with emojis and structure:

```bash
dev-hq insights
```

## 🎯 Use Cases

1. **Codebase Analysis** - `dev-hq insights --table`
2. **Development Server** - `dev-hq serve --hot --watch`
3. **CI/CD Health Checks** - `dev-hq health --smol --no-install`
4. **Debugging** - `dev-hq serve --inspect-brk`
5. **Low Memory Environments** - `dev-hq serve --smol`
6. **Offline CI** - `dev-hq insights --prefer-offline --no-install`

## 🔗 References

- [Bun Runtime Documentation](https://bun.com/docs/runtime#runtime-%26-process-control)
- [Bun Runtime & Process Control](https://bun.com/docs/runtime#runtime-%26-process-control)
- [Bun Development Workflow](https://bun.com/docs/runtime#development-workflow)
- [Bun Debugging](https://bun.com/docs/runtime#debugging)

