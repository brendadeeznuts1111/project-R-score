# Kimi Shell Integration v2.0

## Unified Shell Bridge

The unified shell bridge integrates **Kimi Shell**, **OpenClaw**, and **Profile Terminal** into a single MCP interface with Bun-native signal handling and graceful shutdown.

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

### Quick Commands

```bash
# Start Kimi MCP server
kimi mcp serve

# Or use unified bridge directly
bun run ~/.kimi/tools/unified-shell-bridge.ts

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
