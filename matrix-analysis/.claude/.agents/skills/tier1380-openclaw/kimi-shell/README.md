# Kimi Shell Metrics & Management

Complete metrics collection and shell management system for Kimi Shell.

## 📊 Metrics Collector

Collect and track system performance metrics.

### Usage

```bash
# Show metrics dashboard
bun kimi-cli.ts metrics dashboard

# Collect system metrics
bun kimi-cli.ts metrics collect

# Record custom metric
bun kimi-cli.ts metrics record usage command_executed 1 count

# Export all metrics as JSON
bun kimi-cli.ts metrics export
```

### Metrics Tracked

| Category | Metrics |
|----------|---------|
| **System** | memory_usage_mb, disk_usage_percent |
| **Performance** | stats_collection_time, command_execution |
| **Usage** | command_count, profile_switches |
| **Error** | error_rate, failed_commands |

### Storage

Metrics stored in: `~/.kimi/metrics/shell-metrics.jsonl`

## 🐚 Shell Manager

Manage shell sessions, profiles, and integrations.

### Usage

```bash
# Show shell status
bun kimi-cli.ts shell status

# Execute command with context
bun kimi-cli.ts shell exec "openclaw status" --profile=dev --openclaw

# Switch profile
bun kimi-cli.ts shell switch prod

# List active integrations
bun kimi-cli.ts shell integrations
```

### Features

- **Session Tracking**: Uptime, command count, last command
- **Profile Management**: Switch profiles with environment loading
- **Integration Detection**: Auto-detects OpenClaw, Matrix, MCP
- **Command Execution**: Run commands with full context

## 🔐 Vault

Secure credential management.

### Usage

```bash
# Check vault health
bun kimi-cli.ts vault health

# List credentials
bun kimi-cli.ts vault list
```

### Credentials

| Name | Service | Purpose |
|------|---------|---------|
| registry.token | com.factory-wager.registry | Registry auth |
| r2.secret_key | com.factory-wager.r2 | R2 storage |
| domain.ssl_cert | com.factory-wager.ssl | SSL certificate |

## 🎛️ Settings Dashboard

Visual system overview with code metrics.

```bash
bun kimi-cli.ts settings
```

Shows:
- System status (OpenClaw, Matrix Agent, Kimi Skills)
- Codebase metrics (files, lines, classes, interfaces)
- Active skills with test counts
- MCP tools available
- Quick commands reference

## 🔄 Workflow Visualizer

View MCP and ACP integration flows.

```bash
# MCP workflow
bun kimi-cli.ts workflow mcp

# ACP workflow
bun kimi-cli.ts workflow acp

# Integrated workflow
bun kimi-cli.ts workflow integrated

# Tool matrix
bun kimi-cli.ts workflow matrix

# All workflows
bun kimi-cli.ts workflow all
```

## 📁 File Structure

```
.claude/.agents/skills/tier1380-openclaw/kimi-shell/
├── README.md                 # This file
├── kimi-cli.ts              # Unified CLI
├── metrics-collector.ts     # Metrics collection
├── kimi-shell-manager.ts    # Shell management
├── settings-dashboard.ts    # Settings visualization
├── workflow-visualizer.ts   # Workflow diagrams
├── shell-workflow-mcp-acp.md # Documentation
└── unified-shell-bridge.ts  # MCP/ACP bridge
```

## 🚀 Quick Start

```bash
# 1. Check system status
bun kimi-cli.ts shell status

# 2. View metrics
bun kimi-cli.ts metrics dashboard

# 3. Check vault
bun kimi-cli.ts vault health

# 4. View workflows
bun kimi-cli.ts workflow all
```

## 🔗 Integration Points

```
Kimi CLI → Metrics Collector (JSONL storage)
        → Shell Manager (State file)
        → Vault (Bun.secrets)
        → Settings Dashboard (Visual output)
        → Workflow Visualizer (Terminal UI)
```

## 📝 Environment Variables

```bash
# Auto-loaded by shell manager
export MATRIX_PROFILES_DIR="$HOME/.matrix/profiles"
export OPENCLAW_GATEWAY_TOKEN=$(bun -e '...')
export KIMI_MCP_CONFIG="$HOME/.kimi/mcp.json"
```

## 🎯 Common Workflows

### Profile Switch + Health Check
```bash
bun kimi-cli.ts shell switch prod
bun kimi-cli.ts vault health
bun kimi-cli.ts metrics collect
```

### Execute with Full Context
```bash
bun kimi-cli.ts shell exec "bun run deploy" --profile=prod --openclaw
```

### Monitor System
```bash
# Collect metrics every minute
while true; do
  bun kimi-cli.ts metrics collect
  sleep 60
done
```

## 📈 Metrics API

```typescript
import { MetricsCollector } from "./metrics-collector";

const collector = new MetricsCollector();
await collector.init();

// Record metric
collector.record({
  category: "usage",
  name: "api_call",
  value: 1,
  unit: "count",
  metadata: { endpoint: "/api/v1/status" }
});

// Save to file
await collector.save();
```

## 🔧 Shell Manager API

```typescript
import { KimiShellManager } from "./kimi-shell-manager";

const manager = new KimiShellManager();
await manager.init();

// Execute with context
const result = await manager.execute("openclaw status", {
  profile: "prod",
  openclaw: true
});

// Switch profile
await manager.switchProfile("dev");
```

---

*Part of Tier-1380 OpenClaw Integration Skill*
