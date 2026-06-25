# Shell Workflow with MCP and ACP

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE LAYER                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Terminal  │  │  VS Code    │  │  Kimi IDE   │  │  OpenClaw Dashboard │ │
│  │   (zsh)     │  │  (Claude)   │  │  (MCP)      │  │  (Web UI)           │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
└─────────┼────────────────┼────────────────┼──────────────────┼────────────┘
          │                │                │                  │
          └────────────────┴────────────────┴──────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │     UNIFIED SHELL BRIDGE     │
                    │  ~/.kimi/tools/unified-      │
                    │       shell-bridge.ts        │
                    └──────────────┬──────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
┌────────▼────────┐    ┌───────────▼────────────┐   ┌───────▼────────┐
│      MCP        │    │         ACP            │   │  Bun.terminal  │
│  (Model Context │    │  (Agent Communication  │   │  ($ template   │
│   Protocol)     │    │      Protocol)         │   │   literal)     │
└────┬────────────┘    └────┬───────────────────┘   └───────┬────────┘
     │                      │                              │
     │    ┌─────────────────┼─────────────────┐            │
     │    │                 │                 │            │
┌────▼────▼────┐  ┌────────▼────────┐  ┌────▼────┐  ┌────▼────┐
│MCP Servers   │  │   ACP Client    │  │ Matrix  │  │  Bun    │
├─────────────┤  │                 │  │ Agent   │  │ Shell   │
│• profile-   │  │ • Commands      │  │         │  │         │
│  terminal   │  │ • Events        │  │• Status │  │• Spawn  │
│• bun-local  │  │ • Queries       │  │• Health │  │• Exec   │
│• matrix-    │  │                 │  │• Profile│  │• PTY    │
│  agent      │  └────────┬────────┘  │• Tier1380     │
│• kimi-shell │           │           │         │  └─────────┘
└─────────────┘           │           └────┬────┘
                          │                │
               ┌──────────▼────────────────▼──────────┐
               │         SHARED SERVICES               │
               ├──────────────────────────────────────┤
               │  • Bun.secrets (Keychain/Keyring)    │
               │  • Profile Manager (~/.matrix/)      │
               │  • OpenClaw Gateway (ws://...)       │
               │  • SQLite (bun:sqlite)               │
               │  • S3/R2 (bun:s3)                    │
               └──────────────────────────────────────┘
```

## MCP (Model Context Protocol) Flow

### 1. MCP Server Registration

```json
// ~/.kimi/mcp.json
{
  "mcpServers": {
    "unified-shell": {
      "command": "bun",
      "args": ["~/.kimi/tools/unified-shell-bridge.ts"],
      "env": {
        "MATRIX_PROFILES_DIR": "~/.matrix/profiles",
        "OPENCLAW_ENABLED": "true"
      }
    }
  }
}
```

### 2. MCP Tool Call Flow

```
User Request → Kimi Shell → MCP Client → unified-shell-bridge.ts
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    MCP Tool Handler                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ tools/list   │  │ tools/call   │  │ Tool Execution   │  │
│  │              │  │              │  │                  │  │
│  │ Returns:     │  │ Dispatches:  │  │ • shell_execute  │  │
│  │ - shell_     │  │ - openclaw_  │  │ - profile_list   │  │
│  │   execute    │  │   status     │  │ - matrix_bridge  │  │
│  │ - profile_   │  │ - profile_   │  │   _proxy         │  │
│  │   list       │  │   switch     │  │ - openclaw_      │  │
│  │ - openclaw_  │  │ - matrix_    │  │   gateway_restart│  │
│  │   status     │  │   agent_     │  │                  │  │
│  │              │  │   status     │  └──────────────────┘  │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### 3. Example MCP Tool Execution

```typescript
// Tool: shell_execute
const request = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "shell_execute",
    arguments: {
      command: "openclaw status",
      profile: "dev",
      openclaw: true,
      workingDir: "/Users/nolarose/project"
    }
  }
};

// Response
const response = {
  jsonrpc: "2.0",
  id: 1,
  result: {
    content: [{
      type: "text",
      text: JSON.stringify({
        stdout: "Gateway: running\nPort: 18789",
        stderr: "",
        exitCode: 0
      })
    }]
  }
};
```

## ACP (Agent Communication Protocol) Flow

### 1. ACP Message Structure

```typescript
// ACP Message Format
interface ACPMessage {
  id: string;           // Unique message ID
  type: "command" | "event" | "query" | "response";
  source: "matrix" | "openclaw" | "kimi";
  target?: string;      // Target agent/service
  payload: unknown;     // Message payload
  timestamp: string;    // ISO timestamp
  meta?: {
    profile?: string;
    priority?: number;
    timeout?: number;
  };
}

// Example Command
const command: ACPMessage = {
  id: "cmd-123",
  type: "command",
  source: "kimi",
  target: "openclaw",
  payload: {
    name: "gateway.restart",
    args: ["--port=18789"]
  },
  timestamp: "2026-02-01T10:30:00Z",
  meta: { profile: "dev", priority: 1 }
};
```

### 2. ACP Bridge Flow

```
┌─────────────┐     ACP Command      ┌──────────────┐
│ Kimi Shell  │ ───────────────────> │ OpenClaw ACP │
│   (MCP)     │                      │   Server     │
│             │ <─────────────────── │              │
└─────────────┘     ACP Response     └──────────────┘
       │                                     │
       │         ┌──────────────────┐       │
       └────────>│  Matrix Agent    │<──────┘
                 │  Bridge Handler  │
                 └──────────────────┘
```

### 3. ACP Proxy Example

```typescript
// Matrix Agent → OpenClaw ACP
class OpenClawBridge {
  async sendToOpenClaw(command: ACPCommand): Promise<ACPResponse> {
    const message: ACPMessage = {
      id: this.generateId(),
      type: "command",
      source: "matrix",
      payload: command,
      timestamp: new Date().toISOString()
    };

    // Send via Bun.shell
    const { $ } = await import("bun");
    return await $`openclaw ${command.name} ${command.args}`
      .env({ OPENCLAW_GATEWAY_TOKEN: await this.getToken() })
      .json();
  }
}
```

## Complete Workflow Examples

### Workflow 1: Profile Switch with OpenClaw Context

```bash
# Step 1: User switches profile via MCP
$ kimi mcp call profile_switch '{"profile": "prod"}'

# Step 2: MCP → unified-shell-bridge.ts
# Step 3: Bridge executes:
$ bun ~/.claude/core/terminal/cli.ts switch prod

# Step 4: Profile environment loaded
export MATRIX_ACTIVE_PROFILE="prod"

# Step 5: OpenClaw status check with new profile
$ kimi mcp call openclaw_status '{}'

# Response:
{
  "running": true,
  "port": 18789,
  "profile": "prod",
  "tailscale": "nolas-mac-mini.tailb53dda.ts.net"
}
```

### Workflow 2: Matrix Agent Command via ACP

```typescript
// Step 1: Create ACP message
const acpCommand = {
  id: "matrix-cmd-001",
  type: "command",
  source: "kimi",
  target: "matrix-agent",
  payload: {
    name: "profile.use",
    args: ["dev"]
  },
  timestamp: new Date().toISOString()
};

// Step 2: Send via Matrix Bridge
const bridge = new OpenClawBridge();
const result = await bridge.proxyOpenClawCommand(
  "matrix",
  ["profile", "use", "dev"]
);

// Step 3: Response
console.log(result);
// { success: true, output: "Profile 'dev' activated" }
```

### Workflow 3: Bun Shell with Full Integration

```typescript
import { $ } from "bun";

// Step 1: Load secrets
const token = await Bun.secrets.get({
  service: "com.openclaw.gateway",
  name: "gateway_token"
});

// Step 2: Load profile environment
const profileEnv = await loadProfileEnv("prod");

// Step 3: Execute with context
const result = await $`openclaw gateway restart`
  .env({
    ...profileEnv,
    OPENCLAW_GATEWAY_TOKEN: token,
    MATRIX_ACTIVE_PROFILE: "prod"
  })
  .cwd("/Users/nolarose/project");

// Step 4: Log to Matrix Agent
await $`bun ~/.matrix/matrix-agent.ts log "Gateway restarted"`;
```

## Tool Availability Matrix

| Tool | MCP | ACP | Bun Shell | Description |
|------|-----|-----|-----------|-------------|
| `shell_execute` | ✅ | ❌ | ✅ | Execute arbitrary commands |
| `profile_list` | ✅ | ✅ | ❌ | List available profiles |
| `profile_switch` | ✅ | ✅ | ❌ | Switch active profile |
| `openclaw_status` | ✅ | ✅ | ✅ | Check gateway status |
| `openclaw_restart` | ✅ | ❌ | ✅ | Restart gateway |
| `matrix_agent_status` | ✅ | ✅ | ❌ | Check agent status |
| `matrix_bridge_proxy` | ✅ | ❌ | ❌ | Proxy between systems |
| `cron_list` | ✅ | ❌ | ✅ | List cron jobs |

## Environment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Environment Resolution                    │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌────────────────┐  ┌──────────────┐
│ 1. System Env   │  │ 2. Profile Env │  │ 3. Secret Env│
│                 │  │                │  │              │
│ • PATH          │  │ • API_URL      │  │ • Tokens     │
│ • HOME          │  │ • NODE_ENV     │  │ • Keys       │
│ • USER          │  │ • DATABASE_URL │  │ • Passwords  │
└────────┬────────┘  └───────┬────────┘  └──────┬───────┘
         │                   │                  │
         └───────────────────┼──────────────────┘
                             ▼
                    ┌────────────────┐
                    │  Bun.shell($)  │
                    │   Execution    │
                    └────────────────┘
```

## Quick Reference

```bash
# Start MCP server
kimi mcp serve

# Execute via MCP
kimi mcp call shell_execute '{"command": "openclaw status", "openclaw": true}'

# Direct Bun shell
bun -e 'const { $ } = await import("bun"); await $`openclaw status`'

# Matrix Agent bridge
bun matrix-agent/integrations/openclaw-bridge.ts status

# Unified bridge
bun ~/.kimi/tools/unified-shell-bridge.ts
```
