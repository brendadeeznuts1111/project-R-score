# [BUNFIG.CONFIGURATION.RG] bunfig.toml Configuration Reference

**Last Updated**: 2025-01-27  
**Bun Version**: 1.3.3+  
**Ripgrep Pattern**: `BUNFIG.CONFIGURATION.RG|bunfig.toml|Bun Configuration`

## [BUNFIG.OVERVIEW.RG] Overview

**Scope**: This document describes the `bunfig.toml` configuration used in the NEXUS Trading Intelligence Platform, with special focus on settings that enhance correlation graph logging and debugging.

**Ripgrep Pattern**: `BUNFIG.OVERVIEW.RG|bunfig.toml Configuration`

## Official Documentation

- **[Bun bunfig.toml Documentation](https://bun.com/docs/cli/bunfig)** - Complete reference
- **[Bun Console Depth](https://bun.com/docs/runtime/console#object-inspection-depth)** - Console depth configuration

## Key Configuration Sections

### Console Configuration

```toml
[console]
depth = 5
```

**Purpose**: Controls object inspection depth for `console.log()`, `console.debug()`, `console.info()`, etc.

**Benefits for Correlation Graph**:
- Shows full nested performance breakdown structures
- Displays complete layer summary arrays
- Reveals detailed operation result objects
- Enables comprehensive debugging of complex data structures

**CLI Override**:
```bash
bun --console-depth 10 run dev  # Temporary override
```

### [RUNTIME.CONFIGURATION.RG] Runtime Configuration

**Ripgrep Pattern**: `RUNTIME.CONFIGURATION.RG|logLevel|runtime config`

```toml
logLevel = "warn"
```

**Options**: `"debug"` | `"warn"` | `"error"`

**Usage**: Set to `"debug"` for development to see all correlation graph debug logs.

### [RUN.CONFIGURATION.RG] Run Configuration

**Ripgrep Pattern**: `RUN.CONFIGURATION.RG|run.silent|bun run config`

```toml
[run]
silent = false
```

**Purpose**: Controls whether `bun run` commands report what they're executing.

**For Correlation Graph**: Keep `false` to see command execution during development.

## [BUNFIG.PRECEDENCE.RG] Configuration File Precedence

**Ripgrep Pattern**: `BUNFIG.PRECEDENCE.RG|config precedence|bunfig priority`

1. **CLI Flags** (highest priority)
   - `--console-depth <N>` overrides `[console] depth`
   - `--silent` overrides `[run] silent`

2. **Local bunfig.toml** (`./bunfig.toml` in project root)
   - Current configuration file location
   - Takes precedence over global config

3. **Global bunfig.toml**
   - `$HOME/.bunfig.toml`
   - `$XDG_CONFIG_HOME/.bunfig.toml`

## [BUNFIG.CORRELATION.GRAPH.RG] Correlation Graph Optimizations

**Ripgrep Pattern**: `BUNFIG.CORRELATION.GRAPH.RG|correlation graph|console depth`

### [BUNFIG.RECOMMENDED.SETTINGS.RG] Recommended Settings

For correlation graph development and debugging:

```toml
[console]
depth = 5  # Shows full nested structures

[run]
silent = false  # See command execution

# For verbose debugging:
logLevel = "debug"  # See all debug logs
```

### [BUNFIG.CLI.OVERRIDES.RG] CLI Overrides for Debugging

**Ripgrep Pattern**: `BUNFIG.CLI.OVERRIDES.RG|console-depth|CLI override`

```bash
# Deep inspection for complex graph structures
bun --console-depth 10 run dev

# See all debug logs
LOG_LEVEL=debug bun run dev

# Combine both
LOG_LEVEL=debug bun --console-depth 10 run dev
```

## [TEST.CONFIGURATION.RG] Testing Configuration

**Ripgrep Pattern**: `TEST.CONFIGURATION.RG|test.coverage|test configuration`

The `[test]` section includes coverage and execution settings optimized for correlation graph tests:

```toml
[test]
timeout = 5000
coverage = false
coverageSkipTestFiles = true
```

## [INSTALL.CONFIGURATION.RG] Package Installation

**Ripgrep Pattern**: `INSTALL.CONFIGURATION.RG|install.auto|install.linker|package installation`

The `[install]` section configures package management:

```toml
[install]
auto = "fallback"  # Check node_modules first, then auto-install
linker = "isolated"  # Isolated installs for workspaces
```

## [SECURITY.SCANNER.RG] Security Scanner

**Ripgrep Pattern**: `SECURITY.SCANNER.RG|install.security.scanner|security scanner`

Custom security scanner configured:

```toml
[install.security]
scanner = "./src/security/bun-scanner.ts"
```

## Related Documentation

- [Correlation Graph Console Logging](./CORRELATION-GRAPH-CONSOLE-LOGGING.md)
- [Correlation Graph Logging](./CORRELATION-GRAPH-LOGGING.md)
- [Console Depth Debugging Features](./7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md)
