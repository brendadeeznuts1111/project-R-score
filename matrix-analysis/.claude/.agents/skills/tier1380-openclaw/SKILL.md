---
name: tier1380-openclaw
description: |
  Tier-1380 OpenClaw Integration - Comprehensive OpenClaw Gateway, Matrix Agent,
  and Telegram Bot management with unified CLI, monitoring, and automation.
  
  Use when: managing OpenClaw infrastructure, monitoring agents, controlling
  Telegram bots, or integrating with the Matrix ecosystem.
  
  Triggers: "openclaw", "matrix agent", "telegram bot", "gateway", "monitor",
  "status", "health", "migration", "clawdbot"
---

# Tier-1380 OpenClaw Integration Skill

> **Version:** 1.0.0  
> **Tier:** 1380%  
> **Domain:** factory-wager.com  
> **Integration:** OpenClaw Gateway + Matrix Agent + Telegram Bot

## Overview

This skill provides comprehensive management capabilities for the OpenClaw/Matrix Agent infrastructure:

- **OpenClaw Gateway** - WebSocket gateway with Tailscale HTTPS
- **Matrix Agent** - AI agent management (migrated from clawdbot)
- **Telegram Bot** - @mikehuntbot_bot with 4-topic configuration
- **Kimi Shell** - Unified MCP bridge integration
- **Profile Terminal** - Per-directory profile binding

## Quick Commands

### Topic-Project-Channel Integration (NEW)

```bash
# Setup
kimi setup                    # Quick setup wizard
kimi test                     # Run integration tests

# Integration status
kimi integration              # View full integration status
kimi integration stats        # Statistics
kimi integration matrix       # Topic-project matrix

# Topic management
kimi topic list               # List Telegram topics
kimi topic super              # Show super topics
kimi topic route "message"    # Test message routing

# Project management
kimi project list             # List projects
kimi project route <msg>      # Test project routing
kimi project current          # Show current project

# Git hooks
kimi hooks install            # Install for all projects
kimi hooks list               # Show installed hooks

# File watch
kimi watch start              # Watch all projects
kimi watch status             # Show watch status

# Notifications
kimi notify rules             # Show notification rules
kimi notify test <p> <e>      # Test notification

# Performance monitoring
kimi perf memory              # JSC memory report
kimi perf snapshot            # Full JSON snapshot

# Color utility
kimi color topics             # Show topic colors
kimi color convert <c> <fmt>  # Convert color format
```

### Status & Monitoring

```bash
# Unified status display
ocstatus                      # One-shot status
ocwatch                       # Continuous monitoring (5s refresh)
ohealth                       # Raw health metrics

# Component-specific status
openclaw status               # Full OpenClaw status
openclaw health               # Health check
openclaw metrics              # Prometheus metrics

# Legacy aliases (from unified-shell-bridge)
ostat                         # One-shot status
owatch                        # Watch mode
ohealth                       # Health metrics
```

### Gateway Management

```bash
# Gateway control
openclaw gateway start        # Start gateway
openclaw gateway stop         # Stop gateway
openclaw gateway restart      # Restart gateway
openclaw gateway logs         # View gateway logs

# Gateway configuration
openclaw config show          # Show active config
openclaw config validate      # Validate configuration
openclaw config edit          # Edit configuration
```

### Matrix Agent

```bash
# Agent control
matrix-agent status           # Show agent status
matrix-agent init             # Initialize agent
matrix-agent health           # Run health check
matrix-agent migrate          # Migrate from clawdbot

# Profile management via agent
matrix-agent profile list     # List profiles
matrix-agent profile use <n>  # Use profile
matrix-agent profile show <n> # Show profile

# Tier-1380 via agent
matrix-agent tier1380 color init --team=<name> --profile=<name>
```

### Telegram Bot

```bash
# Bot management
openclaw bot status           # Check bot status
openclaw bot webhook          # Configure webhook
openclaw bot info             # Show bot info

# Send test message
openclaw bot test             # Send test to default chat
```

### Migration Tools

```bash
# Legacy migration
clawdbot migrate              # Migrate from legacy clawdbot
clawdbot status               # Check legacy status

# Migration scripts
bun ~/.kimi/skills/tier1380-openclaw/scripts/openclaw-integration.ts migrate
```

## Infrastructure Components

### OpenClaw Gateway

| Property | Value |
|----------|-------|
| Version | v2026.1.30 |
| Local URL | ws://127.0.0.1:18789 |
| Tailscale URL | https://nolas-mac-mini.tailb53dda.ts.net |
| Auth Mode | Token (Bun Secrets) |
| Service | `com.openclaw.gateway` |

### Matrix Agent

| Property | Value |
|----------|-------|
| Version | v1.0.0 |
| Migrated From | clawdbot v2026.1.17-1 |
| Config | `~/.matrix/agent/config.json` |
| Workspace | `/Users/nolarose` |

### Telegram Bot

| Property | Value |
|----------|-------|
| Username | @mikehuntbot_bot |
| Token | Stored in Bun Secrets |
| Topics | 4 configured (1, 2, 5, 7) |
| Allowlist | 8013171035 |

## Configuration Files

```
~/.openclaw/
├── openclaw.json             # Main gateway config
├── agents/                   # Agent definitions
├── devices/                  # Device pairings
├── telegram/                 # Telegram settings
├── hooks.json               # Webhook hooks
└── logs/                    # Application logs

~/.matrix/
├── agent/
│   └── config.json          # Matrix Agent config
├── profiles/                # Environment profiles
├── logs/                    # Agent logs
└── cron-jobs.txt           # Scheduled tasks
```

## Environment Variables

```bash
# Required
OPENCLAW_GATEWAY_TOKEN       # Gateway auth token (or Bun Secrets)
TELEGRAM_BOT_TOKEN          # Bot token (in config)

# Optional
OPENCLAW_PORT=18789         # Gateway port
OPENCLAW_BIND=loopback      # Bind address
OPENCLAW_LOG_LEVEL=info     # Log verbosity
```

## Bun Secrets Integration

```bash
# Store gateway token
bun secrets set com.openclaw.gateway gateway_token YOUR_TOKEN

# Retrieve
token=$(bun secrets get com.openclaw.gateway gateway_token)
```

## Health Check Endpoints

| Endpoint | URL | Purpose |
|----------|-----|---------|
| Gateway | ws://127.0.0.1:18789/health | Gateway health |
| Prometheus | http://localhost:9090/metrics | Metrics export |
| Dashboard | file://~/monitoring/dashboard/index.html | Visual dashboard |

## Automation (Cron Jobs)

Located in `~/.matrix/cron-jobs.txt`:

```bash
# 3 AM - Audit compaction
0 3 * * * bun run scripts/openclaw-cron/compact-audits.ts

# Every 30 min - RSS refresh
*/30 * * * * bun run scripts/openclaw-cron/refresh-rss.ts

# 2 AM - Session cleanup
0 2 * * * bun run scripts/openclaw-cron/cleanup-sessions.ts

# Every 5 min - Health check
*/5 * * * * bun run scripts/openclaw-cron/health-check.ts
```

## Integration with Other Skills

### tier1380-omega
```bash
# Deploy OpenClaw to Cloudflare
omega deploy openclaw:staging
omega deploy openclaw:production

# Registry integration
omega registry check
omega registry version
```

### tier1380-infra
```bash
# Infrastructure management
infra status openclaw
infra restart openclaw
infra health --watch

# Resource monitoring
infra resources openclaw
infra logs openclaw
```

### tier1380-commit-flow
```bash
# Commit with OpenClaw context
/commit "[OPENCLAW][GATEWAY][TIER:1380] Add health monitoring"

# Validate OpenClaw changes
/flow lint
/flow test
/governance openclaw
```

### Matrix Agent Bridge
```bash
# Bridge commands
bun ~/.kimi/skills/tier1380-openclaw/scripts/matrix-bridge.ts status
bun ~/.kimi/skills/tier1380-openclaw/scripts/matrix-bridge.ts proxy status
bun ~/.kimi/skills/tier1380-openclaw/scripts/matrix-bridge.ts matrix profile list

# Direct bridge usage
bun matrix-agent/integrations/openclaw-bridge.ts init
bun matrix-agent/integrations/openclaw-bridge.ts proxy profile list
bun matrix-agent/integrations/openclaw-bridge.ts matrix status
```

### Matrix CLI Integration
```bash
# Via package.json scripts
bun run matrix:openclaw:status
bun run matrix:openclaw:status:watch
bun run matrix:openclaw:health
bun run matrix:openclaw:info

# Shorthand aliases
bun run openclaw:status
bun run openclaw:health
bun run openclaw:info
```

### Kimi Shell Integration
```bash
# Via unified-shell-bridge
openclaw_status
openclaw_gateway_restart
matrix_agent_status
profile_list
cron_list
```

## Troubleshooting

### WebSocket 1008 Error
```bash
# Check device pairing
openclaw device list
openclaw device add $(hostname)
```

### Token Issues
```bash
# Verify token in Bun Secrets
bun secrets list com.openclaw.gateway

# Reset token
bun secrets delete com.openclaw.gateway gateway_token
bun secrets set com.openclaw.gateway gateway_token NEW_TOKEN
```

### Migration Issues
```bash
# Check migration marker
ls -la ~/.matrix/.migrated-from-clawdbot

# Re-run migration
matrix-agent migrate --force
```

## Topic-Project Integration Components

### Configuration Files
```
~/.kimi/skills/tier1380-openclaw/
├── config/
│   ├── telegram-topics.yaml       # 4-topic configuration
│   └── project-topics.yaml        # Project mappings
├── scripts/
│   ├── topic-manager.ts           # Topic management
│   ├── project-integration.ts     # Project mapping
│   ├── topic-git-hooks.ts         # Git hook management
│   ├── project-watch.ts           # File watcher
│   ├── github-webhook-bridge.ts   # GitHub integration
│   ├── notification-manager.ts    # Notification rules
│   ├── integration-status.ts      # Status dashboard
│   ├── test-integration.ts        # Test suite
│   ├── quick-setup.ts             # Setup wizard
│   └── lib/
│       ├── bytes.ts               # Byte-safe utilities
│       ├── jsc-monitor.ts         # JSC performance
│       └── color.ts               # Color utilities
├── completions/                    # Shell completions
│   ├── kimi-completion.bash
│   ├── kimi-completion.zsh
│   └── kimi-completion.fish
└── docs/
    ├── TOPICS-CHANNELS.md
    ├── PROJECT-INTEGRATION.md
    ├── QUICKREF.md                # CLI quick reference
    └── README.md
```

### Telegram Topics
| ID | Name | Purpose | Auto-Routing |
|----|------|---------|--------------|
| 1 | General 📢 | Status, discussion | `docs:`, `status:` |
| 2 | Alerts 🚨 | Critical errors | `fix:`, `ERROR:` |
| 5 | Logs 📊 | Monitoring output | `log:`, `chore:` |
| 7 | Development 💻 | Code, PRs | `feat:`, `test:` |

### Scripts Reference

| Script | Purpose |
|--------|---------|
| `scripts/openclaw-integration.ts` | Main integration CLI |
| `scripts/generate-commit.ts` | Commit message generator |
| `scripts/topic-manager.ts` | Telegram topic management |
| `scripts/project-integration.ts` | Project mapping |
| `scripts/topic-git-hooks.ts` | Git hook installer |
| `scripts/project-watch.ts` | File system watcher |
| `scripts/github-webhook-bridge.ts` | GitHub webhook handler |
| `scripts/notification-manager.ts` | Notification rules |
| `scripts/integration-status.ts` | Status dashboard |
| `scripts/test-integration.ts` | Integration test suite |
| `scripts/quick-setup.ts` | Setup wizard |
| `scripts/monitoring/cli-status.ts` | Real-time status display |
| `scripts/monitoring/start-monitoring.sh` | Start monitoring stack |
| `scripts/monitoring/stop-monitoring.sh` | Stop monitoring stack |
| `scripts/openclaw-cron/*.ts` | Cron job scripts |

### Using the Scripts

```bash
# Integration CLI
bun ~/.kimi/skills/tier1380-openclaw/scripts/openclaw-integration.ts status
bun ~/.kimi/skills/tier1380-openclaw/scripts/openclaw-integration.ts info
bun ~/.kimi/skills/tier1380-openclaw/scripts/openclaw-integration.ts health

# Generate commit message
bun ~/.kimi/skills/tier1380-openclaw/scripts/generate-commit.ts "Your description"

## Quick Reference

| Task | Command |
|------|---------|
| Check all status | `ocstatus` |
| Watch mode | `ocwatch` |
| Gateway restart | `openclaw gateway restart` |
| Agent health | `matrix-agent health` |
| Bot info | `openclaw bot info` |
| View logs | `openclaw logs` |
| Migration | `clawdbot migrate` |
| Config edit | `openclaw config edit` |

## Cross-Reference Links

### Related Skills
| Skill | Path | Purpose |
|-------|------|---------|
| tier1380-omega | `~/.kimi/skills/tier1380-omega/` | OMEGA protocol & Cloudflare deployment |
| tier1380-infra | `~/.kimi/skills/tier1380-infra/` | Infrastructure management |
| tier1380-commit-flow | `~/.kimi/skills/tier1380-commit-flow/` | Commit governance |
| **tier1380-mcp** | `~/.kimi/skills/tier1380-mcp/` | MCP integration & flows |

### MCP Integration

The OpenClaw components are exposed via MCP (Model Context Protocol) through the unified shell bridge:

```bash
# MCP tools for OpenClaw
mcp:health              # Run health check flow
mcp:migrate             # Run migration flow
mcp:shell               # Start shell bridge
```

### MCP Tools Available

| Tool | Description | Args |
|------|-------------|------|
| `openclaw_status` | Check gateway status | - |
| `openclaw_gateway_restart` | Restart gateway | - |
| `matrix_agent_status` | Check agent status | - |
| `profile_list` | List profiles | - |
| `profile_switch` | Switch profile | `profile` |
| `shell_execute` | Execute commands | `command`, `profile`, `openclaw` |

### Configuration Files
| File | Purpose | Format |
|------|---------|--------|
| `~/.openclaw/openclaw.json` | Gateway configuration | JSON |
| `~/.matrix/agent/config.json` | Matrix Agent config | JSON |
| `~/.matrix/profiles/*.json` | Environment profiles | JSON |
| `~/.matrix/cron-jobs.txt` | Scheduled tasks | Crontab |

### Key Directories
| Path | Contents |
|------|----------|
| `~/.openclaw/` | Gateway configs, logs, credentials |
| `~/.matrix/` | Agent configs, profiles, logs |
| `~/monitoring/` | Prometheus, dashboard files |
| `openclaw/` | OpenClaw source (cloned repo) |

### External Links
- [OpenClaw Gateway](ws://127.0.0.1:18789) - Local WebSocket
- [Tailscale HTTPS](https://nolas-mac-mini.tailb53dda.ts.net) - Remote access
- [Dashboard](file://~/monitoring/dashboard/index.html) - Local dashboard
- [Prometheus](http://localhost:9090) - Metrics

### Command Quick Links
```bash
# Status
bun run matrix:openclaw:status      # Via Matrix CLI
bun run openclaw:status             # Shorthand
ocstatus                            # Alias

# Health
bun run matrix:openclaw:health      # Via Matrix CLI
bun run openclaw:health             # Shorthand

# Info
bun run matrix:openclaw:info        # Via Matrix CLI
ocinfo                              # Alias
```

---

*Updated: 2026-02-02 | Tier-1380 OpenClaw Integration v1.1.0*

## Changelog

### v1.1.0 (2026-02-02)
- Added Topic-Project-Channel integration
- 4 Telegram topics with auto-routing
- 3 projects with git hooks
- 25 automated integration tests
- Shell completions (Bash, Zsh, Fish)
- Bun.color() API integration
- Bun.jsc API integration
- Byte-safe file operations

### v1.0.0 (2026-01-31)
- Initial OpenClaw Gateway integration
- Matrix Agent migration from clawdbot
- Telegram Bot (@mikehuntbot_bot)
- Unified CLI with MCP bridge
