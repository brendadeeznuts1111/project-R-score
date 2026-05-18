---
name: tier1380-infra
description: |
  Tier-1380 Infrastructure Management - Service control, health monitoring,
  context awareness, and resource management for the OMEGA protocol.

  Use when: managing services, checking health, viewing infrastructure context,
  or controlling resources across dev/staging/prod environments.

  Triggers: "infra", "infrastructure", "service", "health", "monitoring",
  "start", "stop", "restart", "status", "logs", "diagnose"
---

# Tier-1380 Infrastructure Management Skill

> **Version:** 1.0.0
> **Tier:** 1380%
> **Domain:** factory-wager.com
> **Purpose:** Comprehensive infrastructure management, monitoring, and control

## Overview

This skill provides advanced infrastructure management capabilities for the Tier-1380 OMEGA protocol, including service control, health monitoring, context awareness, and resource management.

## Capabilities

### 🏗️ Service Management
- Start/stop/restart services (dashboard, MCP servers, workers)
- Service dependency management
- Auto-restart on failure
- Service status aggregation

### 📊 Health & Monitoring
- Real-time health checks across all components
- Resource utilization tracking (CPU, memory, disk)
- Alert management and threshold monitoring
- Historical metrics and trending

### 🌐 Infrastructure Context
- Domain configuration viewing and validation
- CDN/R2 bucket status and management
- Environment-aware operations (dev/staging/prod)
- Multi-region awareness

### 🎛️ Control Operations
- Graceful shutdown sequences
- Rolling restarts with health verification
- Circuit breaker patterns
- Emergency stop procedures

## Commands

### Service Control

```bash
# Service status overview
infra status                    # Show all services status
infra status dashboard          # Dashboard specific
infra status mcp                # MCP servers status

# Service control
infra start dashboard           # Start dashboard server
infra stop dashboard            # Stop dashboard server
infra restart dashboard         # Restart with health check
infra restart --all             # Restart all services

# Emergency operations
infra emergency-stop            # Immediate shutdown of all services
```

### Health Monitoring

```bash
# Health checks
infra health                    # Full health report
infra health --watch            # Continuous monitoring
infra health --json             # JSON output for piping

# Resource monitoring
infra resources                 # CPU/Memory/Disk usage
infra resources --alerts        # Show only alerts
```

### Context & Information

```bash
# Domain context
infra context                   # Show current domain context
infra context --full            # Full configuration dump

# CDN/Bucket information
infra cdn                       # CDN domain status
infra buckets                   # R2 bucket status
```

### Diagnostic Tools

```bash
# Diagnostics
infra diagnose                  # Run full diagnostic suite
infra logs dashboard            # Tail dashboard logs
infra logs --all                # All service logs
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `infra status` | Overall infrastructure status |
| `infra start dashboard` | Start dashboard server |
| `infra health` | Health check all components |
| `infra context` | Show domain context |
| `infra diagnose` | Run diagnostics |
| `infra emergency-stop` | Emergency shutdown |
| `infra status openclaw` | OpenClaw infrastructure status |
| `infra restart openclaw` | Restart OpenClaw services |
| `infra health openclaw` | OpenClaw health check |

## Integration Points

- **Dashboard:** http://localhost:3333
- **MCP Server:** apps/dashboard/mcp-server.ts
- **Config:** domain-config.json5
- **Logs:** apps/dashboard/logs/
- **OpenClaw Gateway:** ws://127.0.0.1:18789
- **Matrix Agent:** ~/.matrix/agent/config.json
- **Prometheus:** http://localhost:9090

## OpenClaw Integration

The infrastructure skill integrates with OpenClaw/Matrix Agent:

```bash
# Check all OpenClaw components
infra status openclaw

# View OpenClaw logs
infra logs openclaw

# Restart OpenClaw services
infra restart openclaw

# OpenClaw health with infrastructure context
infra health openclaw --resources
```

### OpenClaw Components Managed

| Component | Status Command | Restart Command |
|-----------|---------------|-----------------|
| Gateway | `infra status openclaw:gateway` | `infra restart openclaw:gateway` |
| Matrix Agent | `infra status openclaw:agent` | `infra restart openclaw:agent` |
| Telegram Bot | `infra status openclaw:telegram` | N/A (via config) |
| Prometheus | `infra status openclaw:metrics` | `infra restart openclaw:metrics` |

## Environment Variables

```bash
DASHBOARD_PORT=3333             # Dashboard port
MCP_ENABLED=true                # Enable MCP
INFRA_LOG_LEVEL=info            # Log verbosity
```

## Files

- `~/.kimi/bin/kimi` - Main CLI tool (unified)
- `~/.kimi/bin/kimi-cli.ts` - CLI source
- `~/.kimi/lib/status-tracker.ts` - Status tracking module
- `~/.kimi/lib/reference-validator.ts` - Reference validation
- `~/.kimi/skills/tier1380-infra/` - This skill

## Related Skills

| Skill | Path | Integration |
|-------|------|-------------|
| tier1380-openclaw | `~/.kimi/skills/tier1380-openclaw/` | `infra status openclaw` |
| tier1380-omega | `~/.kimi/skills/tier1380-omega/` | `infra status omega` |
| tier1380-commit-flow | `~/.kimi/skills/tier1380-commit-flow/` | `/governance infra` |

### OpenClaw Integration Commands
```bash
# Check all OpenClaw components
infra status openclaw

# Specific components
infra status openclaw:gateway
infra status openclaw:agent
infra status openclaw:telegram
infra status openclaw:metrics

# Control operations
infra restart openclaw
infra logs openclaw
infra health openclaw --resources
```

### Cross-Skill Workflow
```bash
# Full infrastructure check
infra status && ocstatus && omega registry check

# Health check all components
infra health && bun run matrix:openclaw:health

# Emergency procedures
infra emergency-stop
infra restart --all
```
