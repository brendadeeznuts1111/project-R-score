# Kimi Shell Integration v2.0

## Overview

This package provides a **Unified Shell Bridge** that integrates **Kimi Shell**, **OpenClaw**, and **Profile Terminal** into a single MCP interface with Bun-native signal handling and graceful shutdown.

> **Note**: For Zsh integration with Kimi CLI, see the official [MoonshotAI/zsh-kimi-cli](https://github.com/MoonshotAI/zsh-kimi-cli) plugin. This bridge complements (not replaces) the official Zsh plugin by providing MCP server capabilities.

### Relationship to Official Plugins

| Component | Purpose | Repository |
|-----------|---------|------------|
| **zsh-kimi-cli** | Zsh keybindings (Ctrl-X) for Kimi CLI | [MoonshotAI/zsh-kimi-cli](https://github.com/MoonshotAI/zsh-kimi-cli) |
| **unified-shell-bridge** | MCP server with OpenClaw/Profile integration | This package |

Use both together:
1. Install official Zsh plugin for terminal interaction
2. Use unified bridge for MCP tooling and automation

### Location
- **Bridge**: `~/.kimi/tools/unified-shell-bridge.ts`
- **Config**: `~/.kimi/mcp.json`
- **Version**: 2.0.0

### Features

#### 🚀 Bun-Native Signal Handling
- **SIGINT** (Ctrl+C): Graceful shutdown with cleanup
- **SIGTERM**: Process termination with resource cleanup
- **SIGHUP**: Terminal disconnection handling
- Custom cleanup handler registration
- Configurable shutdown timeout (default: 5000ms)

#### 📊 Health Monitoring & Telemetry
- Command execution tracking
- Error rate monitoring
- Uptime reporting
- Performance metrics

#### 🛡️ Error Handling
- Uncaught exception handling
- Unhandled rejection recovery
- Graceful degradation
- Structured logging

### Available Tools

| Tool | Description | Example |
|------|-------------|---------|
| `shell_execute` | Execute with profile/OpenClaw context | `shell_execute({command: "openclaw status", openclaw: true})` |
| `shell_execute_stream` | Execute with streaming output | `shell_execute_stream({command: "tail -f log.txt"})` |
| `openclaw_status` | Check gateway status | `openclaw_status()` |
| `openclaw_gateway_restart` | Restart gateway | `openclaw_gateway_restart()` |
| `profile_list` | List profiles | `profile_list()` |
| `profile_bind` | Bind directory to profile | `profile_bind({profile: "dev"})` |
| `profile_switch` | Switch profile | `profile_switch({profile: "prod"})` |
| `profile_status` | Show binding status | `profile_status()` |
| `matrix_agent_status` | Check Matrix Agent | `matrix_agent_status()` |
| `bridge_health` | Check bridge health & telemetry | `bridge_health()` |
| `cron_list` | List cron jobs | `cron_list()` |

### Signal Handling

```typescript
// The bridge uses Bun-native signal handling
process.on('SIGINT', () => handleSignal('SIGINT'));
process.on('SIGTERM', () => handleSignal('SIGTERM'));
process.on('SIGHUP', () => handleSignal('SIGHUP'));
```

#### Graceful Shutdown Flow

```
Signal Received
      ↓
  Set shutdown flag
      ↓
  Log shutdown start
      ↓
  Run cleanup handlers
      ↓
  Wait (with timeout)
      ↓
  Exit process
```

#### Exit Codes
- `0`: Normal exit
- `130`: SIGINT (Ctrl+C) - 128 + 2
- `143`: SIGTERM - 128 + 15
- `1`: Error during shutdown

### Environment Variables

```bash
export MATRIX_PROFILES_DIR="$HOME/.matrix/profiles"
export OPENCLAW_GATEWAY_TOKEN=$(bun -e 'const t=await Bun.secrets.get({service:"com.openclaw.gateway",name:"gateway_token"});console.log(t)')
```

### Installation

#### Step 1: Install Official Zsh Plugin (Recommended)

```bash
# Oh My Zsh
git clone https://github.com/MoonshotAI/zsh-kimi-cli.git \
  ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/kimi-cli
# Add to ~/.zshrc: plugins=(... kimi-cli)

# Zinit
zinit light MoonshotAI/zsh-kimi-cli

# Manual
git clone https://github.com/MoonshotAI/zsh-kimi-cli.git ~/.zsh/kimi-cli
echo "source ~/.zsh/kimi-cli/kimi-cli.plugin.zsh" >> ~/.zshrc
```

#### Step 2: Install Unified Shell Bridge

```bash
# Copy bridge to Kimi tools directory
mkdir -p ~/.kimi/tools
cp unified-shell-bridge.ts ~/.kimi/tools/
cp mcp.json ~/.kimi/
```

### Quick Commands

```bash
# Start Kimi MCP server (unified bridge)
kimi mcp serve
# Or directly:
bun run ~/.kimi/tools/unified-shell-bridge.ts

# In Zsh: Press Ctrl-X to start Kimi CLI mode
# Then use MCP tools via unified bridge

# Run tests
bun test projects/analysis/matrix-analysis/scripts/kimi-shell-integration/unified-shell-bridge.test.ts

# Run benchmarks
bun run projects/analysis/matrix-analysis/scripts/kimi-shell-integration/unified-shell-bridge.bench.ts
```

### Integration Flow

```text
Kimi Shell → unified-shell-bridge → {OpenClaw, Profile Terminal, Matrix Agent}
                ↓
         Bun-native signals
                ↓
         Graceful shutdown
                ↓
         Environment injection
                ↓
         Command execution
```

### Health Check Response

```json
{
  "status": "healthy",
  "uptime": 3600000,
  "pid": 12345,
  "signals": ["SIGTERM"],
  "telemetry": {
    "commandsExecuted": 150,
    "errors": 2,
    "startTime": 1704067200000
  }
}
```

### Testing

#### Run All Tests
```bash
bun test projects/analysis/matrix-analysis/scripts/kimi-shell-integration/unified-shell-bridge.test.ts
```

#### Test Coverage
- ✅ Signal handling (SIGINT, SIGTERM, SIGHUP)
- ✅ Command execution with context
- ✅ Profile management
- ✅ Error handling and recovery
- ✅ Health monitoring
- ✅ Cleanup handler execution
- ✅ Bun-native API usage

### Benchmarks

#### Run Benchmarks
```bash
bun run projects/analysis/matrix-analysis/scripts/kimi-shell-integration/unified-shell-bridge.bench.ts
```

#### Benchmark Categories
- Signal handling performance
- Command execution throughput
- Memory usage patterns
- Startup/shutdown times
- Bun-native vs Node.js patterns
- Real-world scenario simulation

### Configuration

```typescript
const CONFIG = {
  gracefulShutdownTimeoutMs: 5000,  // Shutdown timeout
  enableTelemetry: true,             // Enable metrics
  logLevel: 'info',                  // debug | info | warn | error
};
```

### Cleanup Handler API

Register custom cleanup handlers:

```typescript
import { onCleanup } from './unified-shell-bridge';

onCleanup(async () => {
  // Your cleanup logic
  await closeConnections();
  await saveState();
});
```

### Logging

Structured JSON logging:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "INFO",
  "message": "Command executed",
  "durationMs": 45.2,
  "exitCode": 0
}
```

### Requirements

- **Bun**: >= 1.3.0
- **OS**: macOS, Linux
- **Node.js**: Not required (Bun-native)

### Migration from v1.x

v2.0 adds:
- Native Bun signal handling
- Graceful shutdown with cleanup
- Health monitoring endpoint
- Telemetry tracking
- Structured logging
- Improved error handling

No breaking changes to the MCP tool interface.
