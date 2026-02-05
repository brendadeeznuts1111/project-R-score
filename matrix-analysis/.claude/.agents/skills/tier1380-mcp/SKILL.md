---
name: tier1380-mcp
description: |
  Tier-1380 MCP (Model Context Protocol) Integration - Complete MCP server
  management, tool orchestration, and AI assistant integration for OpenClaw,
  Matrix Agent, and infrastructure components.
  
  Use when: configuring MCP servers, managing AI tools, integrating assistants,
  or setting up model context protocols.
  
  Triggers: "mcp", "model context protocol", "ai tools", "assistant",
  "claude", "kimi", "openclaw mcp", "shell bridge"
---

# Tier-1380 MCP Integration Skill

> **Version:** 1.0.0  
> **Tier:** 1380%  
> **Domain:** factory-wager.com  
> **Protocol:** Model Context Protocol (MCP) 2024-11-05

## Overview

This skill provides comprehensive MCP (Model Context Protocol) integration for the Tier-1380 ecosystem:

- **MCP Server Management** - Configure, start, and monitor MCP servers
- **Tool Orchestration** - Unified interface for OpenClaw, Matrix Agent, and infrastructure
- **AI Assistant Integration** - Claude, Kimi, and other MCP-compatible assistants
- **Shell Bridge** - Connect shell commands with AI context
- **Flow Automation** - Automated workflows combining multiple MCP tools

## Quick Commands

### MCP Server Control

```bash
# List MCP servers
bun run mcp:list                      # List configured servers
bun run mcp:status                    # Check all server status
bun run mcp:start <name>              # Start specific server
bun run mcp:stop <name>               # Stop specific server
bun run mcp:restart <name>            # Restart server

# Inspect MCP
bun run mcp:inspector                 # MCP inspector UI
```

### Unified Shell Bridge

```bash
# Via unified-shell-bridge.ts
bun run mcp:shell                     # Start shell bridge MCP

# Direct usage
bun ~/.kimi/tools/unified-shell-bridge.ts
```

### Bun Docs MCP

```bash
# Run Bun docs MCP server
bun run mcp:bun-docs                  # Start Bun docs server
bun run mcp:bun-test                  # Test Bun MCP integration

# Search Bun docs
bun run docs:search "URLPattern"      # Search documentation
bun run docs:entry "Bun.file"         # Get curated entry
```

## MCP Server Configuration

### Server Registry (`.mcp.json`)

| Server | Purpose | Transport |
|--------|---------|-----------|
| `bun` | Bun official docs | HTTP (bun.com/docs/mcp) |
| `bun-local` | Bun execution | STDIO |
| `context7` | Documentation search | STDIO |
| `filesystem` | File system access | STDIO |
| `git` | Git operations | STDIO |
| `github` | GitHub integration | STDIO |
| `fetch` | HTTP fetch | STDIO |
| `sequential-thinking` | Reasoning tool | STDIO |
| `rss` | RSS feed reader | STDIO |
| `analyze` | Code analysis | STDIO |

### Unified Shell Bridge Tools

The `unified-shell-bridge.ts` provides these MCP tools:

| Tool | Description | Context |
|------|-------------|---------|
| `shell_execute` | Execute shell commands | Profile + OpenClaw |
| `shell_execute_stream` | Stream command output | Real-time |
| `openclaw_status` | Check gateway status | Bun Secrets |
| `openclaw_gateway_restart` | Restart gateway | Token auth |
| `profile_list` | List profiles | Matrix profiles |
| `profile_bind` | Bind directory to profile | Terminal |
| `profile_switch` | Switch active profile | Terminal |
| `profile_status` | Get terminal status | Terminal |
| `matrix_agent_status` | Check agent status | Matrix Agent |
| `cron_list` | List cron jobs | System crontab |
| `clawbot_migrate` | Legacy migration | Migration tools |
| `clawbot_legacy_config` | Read legacy config | Migration tools |

## MCP Flows

### Flow 1: OpenClaw Health Check

```yaml
name: openclaw-health
steps:
  1. openclaw_status:
     - Check gateway status
     - Get version and latency
  2. matrix_agent_status:
     - Verify agent is running
     - Check configuration
  3. shell_execute:
     - Run: bun run matrix:openclaw:health
     - Parse health report
  4. decision:
     - if all healthy: report success
     - if degraded: attempt restart
     - if down: alert + escalate
```

**Execute:**
```bash
bun ~/.kimi/skills/tier1380-mcp/scripts/mcp-flow.ts openclaw-health
```

### Flow 2: Profile Deployment

```yaml
name: profile-deploy
steps:
  1. profile_list:
     - Get available profiles
  2. profile_switch:
     - Activate target profile
  3. shell_execute:
     - Validate environment
     - Run: bun run matrix:profile:use <name> --dry-run
  4. openclaw_status:
     - Verify gateway accepts new profile
  5. shell_execute:
     - Apply profile: eval $(bun run matrix:profile:use <name>)
  6. profile_status:
     - Confirm terminal binding updated
```

**Execute:**
```bash
bun ~/.kimi/skills/tier1380-mcp/scripts/mcp-flow.ts profile-deploy <name>
```

### Flow 3: Full System Diagnostic

```yaml
name: system-diagnostic
steps:
  1. parallel:
     - openclaw_status
     - matrix_agent_status
     - shell_execute: infra status
     - shell_execute: omega registry check
  2. sequential-thinking:
     - Analyze all component statuses
     - Identify issues and root causes
  3. shell_execute:
     - Run: bun run matrix:openclaw:status --json
  4. github:
     - Create issue if critical issues found
  5. report:
     - Generate diagnostic report
     - Send notification
```

**Execute:**
```bash
bun ~/.kimi/skills/tier1380-mcp/scripts/mcp-flow.ts system-diagnostic
```

### Flow 4: Legacy Migration

```yaml
name: legacy-migration
steps:
  1. clawbot_legacy_config:
     - Read legacy clawdbot.json
  2. shell_execute:
     - Check if already migrated: ls ~/.matrix/.migrated-from-clawdbot
  3. clawbot_migrate:
     - Run migration process
  4. matrix_agent_status:
     - Verify new agent works
  5. openclaw_status:
     - Verify gateway connection
  6. shell_execute:
     - Test: bun run matrix:openclaw:health
```

**Execute:**
```bash
bun ~/.kimi/skills/tier1380-mcp/scripts/mcp-flow.ts legacy-migration
```

## MCP Tool Usage Examples

### Shell Execute with Context

```javascript
// Execute with profile and OpenClaw context
{
  "tool": "shell_execute",
  "args": {
    "command": "bun run deploy",
    "profile": "production",
    "openclaw": true,
    "workingDir": "/Users/nolarose/Projects/myapp"
  }
}
```

### OpenClaw Operations

```javascript
// Check status
{ "tool": "openclaw_status", "args": {} }

// Restart gateway
{ "tool": "openclaw_gateway_restart", "args": {} }
```

### Profile Management

```javascript
// List profiles
{ "tool": "profile_list", "args": {} }

// Switch profile
{ "tool": "profile_switch", "args": { "profile": "staging" } }

// Bind directory
{ "tool": "profile_bind", "args": { "profile": "dev" } }
```

## Integration with Other Skills

### tier1380-openclaw
```bash
# Via MCP
{ "tool": "openclaw_status" }

# Via CLI
bun run matrix:openclaw:status
ocstatus
```

### tier1380-omega
```bash
# Via MCP shell_execute
{ "tool": "shell_execute", "args": { "command": "omega deploy staging" } }

# Via CLI
bun run omega:deploy:staging
```

### tier1380-infra
```bash
# Via MCP shell_execute
{ "tool": "shell_execute", "args": { "command": "infra status" } }

# Via CLI
infra status
```

### tier1380-commit-flow
```bash
# Via MCP shell_execute
{ "tool": "shell_execute", "args": { "command": "/commit '[OPENCLAW][MCP][TIER:1380] Add flow'" } }
```

## MCP Server Development

### Creating Custom MCP Servers

```typescript
// Example: Custom OpenClaw MCP server
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "openclaw-mcp",
  version: "1.0.0"
});

// Register tools
server.tool("openclaw_deploy", {
  environment: z.enum(["staging", "production"])
}, async ({ environment }) => {
  // Deploy logic
  return { content: [{ type: "text", text: "Deployed!" }] };
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Testing MCP Servers

```bash
# Test with MCP inspector
bun run mcp:inspector

# Test specific server
bun run mcp:test bun-local

# Validate configuration
bun run mcp:validate
```

## Environment Configuration

### Required Environment Variables

```bash
# GitHub MCP
GITHUB_TOKEN=<your_token>

# OpenClaw (via Bun Secrets)
com.openclaw.gateway/gateway_token=<token>

# Bun Local MCP
BUN_RUNTIME=1
BUN_CONFIG_PREFER_OFFLINE=1
```

### Bun Secrets Integration

```bash
# Set OpenClaw token
bun secrets set com.openclaw.gateway gateway_token <token>

# Set GitHub token
bun secrets set github token <token>

# Verify
bun secrets list
```

## Troubleshooting

### MCP Connection Issues

```bash
# Check server logs
bun run mcp:logs <name>

# Restart all servers
bun run mcp:restart-all

# Reset configuration
bun run mcp:reset
```

### Tool Execution Failures

```bash
# Test tool directly
bun run mcp:test-tool shell_execute '{"command":"whoami"}'

# Check shell bridge
bun run mcp:shell --test

# Verify permissions
ls -la ~/.kimi/tools/unified-shell-bridge.ts
```

## Cross-Reference Links

### Related Skills
| Skill | Path | Integration |
|-------|------|-------------|
| tier1380-openclaw | `~/.kimi/skills/tier1380-openclaw/` | `openclaw_*` tools |
| tier1380-omega | `~/.kimi/skills/tier1380-omega/` | `shell_execute: omega *` |
| tier1380-infra | `~/.kimi/skills/tier1380-infra/` | `shell_execute: infra *` |
| tier1380-commit-flow | `~/.kimi/skills/tier1380-commit-flow/` | `shell_execute: /commit` |

### MCP Configuration Files
| File | Purpose |
|------|---------|
| `.mcp.json` | Main MCP server registry |
| `~/.kimi/tools/unified-shell-bridge.ts` | Shell bridge implementation |
| `mcp-bun-docs/index.ts` | Bun docs MCP server |
| `tools/mcp-analyze-server.ts` | Analysis MCP server |

### MCP Documentation
- [MCP Specification](https://modelcontextprotocol.io)
- [Bun MCP Docs](https://bun.com/docs/mcp)
- [Claude MCP Guide](https://docs.anthropic.com/claude/docs/model-context-protocol)

## Related Skills

| Skill | Path | MCP Integration |
|-------|------|-----------------|
| **tier1380-openclaw** | `~/.kimi/skills/tier1380-openclaw/` | `openclaw_*` tools |
| **tier1380-omega** | `~/.kimi/skills/tier1380-omega/` | `shell_execute: omega *` |
| **tier1380-infra** | `~/.kimi/skills/tier1380-infra/` | `shell_execute: infra *` |
| **tier1380-commit-flow** | `~/.kimi/skills/tier1380-commit-flow/` | `shell_execute: /commit` |
| **tier1380-audit** | `cli/tier1380-audit.ts` | Col-89 compliance & dashboard |

### Tier-1380 Audit Integration

```bash
# Run audit via MCP shell_execute
{ "tool": "shell_execute", "args": { "command": "bun run tier1380:audit check README.md" } }

# Launch dashboard
{ "tool": "shell_execute", "args": { "command": "bun run tier1380:audit dashboard" } }

# Check violations via SQLite
{ "tool": "shell_execute", "args": { "command": "bun run tier1380:audit db" } }
```

### Cross-Skill MCP Flows

```bash
# OpenClaw + Omega deployment
mcpflow profile-deploy profile=production
shell_execute "omega deploy production"

# Infrastructure + OpenClaw health
mcp:health
infra status openclaw

# Full stack with commit
mcp:status
/flow full
/commit "[PLATFORM][MCP][TIER:1380] Update flows"
```

### Shell Aliases
```bash
alias mcpflow='bun ~/.kimi/skills/tier1380-mcp/scripts/mcp-flow.ts'
alias mcphealth='bun run mcp:health'
alias mcpmigrate='bun run mcp:migrate'
```

---

*Updated: 2026-01-31 | Tier-1380 MCP Integration v1.0.0*
