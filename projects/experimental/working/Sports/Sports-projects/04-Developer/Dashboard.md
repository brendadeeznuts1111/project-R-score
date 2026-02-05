---
title: Untitled
type: dashboard
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-14
category: core
id: dashboard
path: $env:DASH_ROOT/04-Developer/Dashboard.md
name: Untitled
description: Documentation for Dashboard
acceptEncoding: ""
acceptLanguage: ""
allCookies: {}
analyticsId: ""
author: Sports Analytics Team
browser: ""
cacheControl: ""
canvas: []
connectionType: ""
cookies: {}
cookiesRaw: ""
csrfToken: ""
danCookie: ""
danSessionId: ""
deprecated: false
dns: ""
e_tag: ""
etag: ""
feature: ""
feed_integration: false
ip: ""
ip4: ""
ip6: ""
ipv4: ""
ipv6: ""
os: ""
referer: ""
referrer: ""
replaces: ""
requestId: ""
requestMethod: GET
requestPath: ""
tags: []
usage: ""
user_agent: ""
userAgentRaw: ""
VIZ-06: []
xff: []
xForwardedFor: []
---

# 🛠️ Developer Dashboard

**Last Updated:** 11/13/2025, 10:10:42 AM  
**Vault:** Sports-projects  
**Workspace:** `/Users/nolarose/Documents/github/Repos/kimi2/feed`

---

## 📺 TMUX Sessions

Active TMUX sessions and their status:

| # | Session Name | Windows | Created |
|---|--------------|---------|---------|
| 1 | `0` | 1 windows | 11/12/2025, 4:47:49 AM |
| 2 | `53` | 1 windows | 11/13/2025, 8:31:57 AM |
| 3 | `54` | 1 windows | 11/13/2025, 9:17:27 AM |
| 4 | `55` | 1 windows | 11/13/2025, 9:19:09 AM |
| 5 | `9` | 1 windows | 11/12/2025, 7:29:50 AM |
| 6 | `mcp-local-tools` | 1 windows | 11/13/2025, 6:46:44 AM |

### Quick Commands

```bash
# List all sessions
tmux list-sessions

# Attach to session
tmux attach -t <session-name>

# Create new session
tmux new -s <session-name>

# Kill session
tmux kill-session -t <session-name>
```

---

## 🔧 Tooling Status

| Tool | Version | Path |
|------|---------|------|
| Bun | `1.3.2` | `/Users/nolarose/.bun/bin/bun` |
| Node.js | `v25.1.0` | `/opt/homebrew/bin/node` |
| npm | `11.6.2` | `/opt/homebrew/bin/npm` |

---

## 🌐 Environment Variables

| Variable | Status |
|----------|--------|
| `BUN_DX_ROOT` | ❌ Not set |
| `OBSIDIAN_API_KEY` | d4e1...a97a |
| `CURSOR_GITLENS_PATH` | ❌ Not set |
| `CONTEXT7_API_KEY` | ❌ Not set |

---

## 🔌 MCPorter Configuration

**Config File:** `config/mcporter.json`

### Configured MCP Servers

| # | Server Name | Type | Description |
|---|-------------|------|-------------|
| 1 | `context7` | HTTP | Context7 docs MCP |
| 2 | `chrome-devtools` | Command | No description |
| 3 | `Bun-Docs-Local` | Command | No description |
| 4 | `Bun-Official` | HTTP | No description |
| 5 | `Bun-DX-Workspace` | Command | No description |
| 6 | `Bun-DX-Testing` | Command | No description |
| 7 | `Bun-DX-Build` | Command | No description |
| 8 | `Bun-DX-Database` | Command | No description |
| 9 | `Filesystem` | Command | No description |
| 10 | `GitKraken` | Command | No description |
| 11 | `local-tools` | Command | No description |
| 12 | `signoz` | Command | SigNoz Query MCP server (logs, traces, metrics). |
| 13 | `shadcn` | HTTP | shadcn/ui registry MCP for browsing component recipes. |
| 14 | `obsidian` | Command | Local Obsidian vault access via obsidian-mcp-server. |

### Server Categories

#### 🏠 Local Development
- **local-tools** - Project-specific MCP tools (`server/local-server.ts`)

#### 🚀 Bun Ecosystem
- **Bun-Docs-Local** - Local Bun documentation server
- **Bun-Official** - Official Bun documentation (hosted)
- **Bun-DX-Workspace** - Workspace dependency management
- **Bun-DX-Testing** - Test runner and coverage tools
- **Bun-DX-Build** - Build system tools
- **Bun-DX-Database** - Database management tools

#### 🌍 External Services
- **context7** - Context7 documentation MCP
- **chrome-devtools** - Chrome DevTools protocol bridge
- **signoz** - SigNoz observability platform
- **shadcn** - shadcn/ui component registry

#### 🗂️ Infrastructure
- **Filesystem** - File system operations (`$env:BUN_DX_ROOT`)
- **GitKraken** - Git operations via GitLens
- **obsidian** - Obsidian vault access

---

## 📋 MCPorter Config Reference

```json
{
  "mcpServers": {
    "context7": {
      "description": "Context7 docs MCP",
      "baseUrl": "https://mcp.context7.com/mcp",
      "headers": {
        "Authorization": "$env:CONTEXT7_API_KEY"
      }
    },
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@latest"
      ],
      "env": {
        "npm_config_loglevel": "error"
      }
    },
    "Bun-Docs-Local": {
      "command": "bun",
      "args": [
        "run",
        "$env:BUN_DX_ROOT/mcp-servers/bun-docs-server.ts"
      ]
    },
    "Bun-Official": {
      "baseUrl": "https://bun.com/docs/mcp"
    },
    "Bun-DX-Workspace": {
      "command": "bun",
      "args": [
        "run",
        "$env:BUN_DX_ROOT/mcp-servers/workspace-server.ts"
      ],
      "env": {
        "WORKSPACE_ROOT": "$env:BUN_DX_ROOT"
      }
    },
    "Bun-DX-Testing": {
      "command": "bun",
      "args": [
        "run",
        "$env:BUN_DX_ROOT/mcp-servers/testing-server.ts"
      ],
      "env": {
        "PROJECT_ROOT": "$env:BUN_DX_ROOT"
      }
    },
    "Bun-DX-Build": {
      "command": "bun",
      "args": [
        "run",
        "$env:BUN_DX_ROOT/mcp-servers/build-server.ts"
      ],
      "env": {
        "PROJECT_ROOT": "$env:BUN_DX_ROOT"
      }
    },
    "Bun-DX-Database": {
      "command": "bun",
      "args": [
        "run",
        "$env:BUN_DX_ROOT/mcp-servers/database-server.ts"
      ],
      "env": {
        "PROJECT_ROOT": "$env:BUN_DX_ROOT"
      }
    },
    "Filesystem": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-filesystem",
        "$env:BUN_DX_ROOT"
      ]
    },
    "GitKraken": {
      "command": "$env:CURSOR_GITLENS_PATH",
      "args": [
        "mcp",
        "--host=cursor",
        "--source=gitlens",
        "--scheme=cursor"
      ]
    },
    "local-tools": {
      "command": "bun",
      "args": [
        "run",
        "./server/local-server.ts"
      ]
    },
    "signoz": {
      "description": "SigNoz Query MCP server (logs, traces, metrics).",
      "command": "npx",
      "args": [
        "-y",
        "signoz-mcp-server@latest"
      ],
      "env": {
        "SIGNOZ_URL": "${SIGNOZ_URL:-http://localhost:3301}",
        "SIGNOZ_TOKEN": "${SIGNOZ_TOKEN:-}",
        "npm_config_loglevel": "error"
      }
    },
    "shadcn": {
      "description": "shadcn/ui registry MCP for browsing component recipes.",
      "baseUrl": "https://www.shadcn.io/api/mcp"
    },
    "obsidian": {
      "description": "Local Obsidian vault access via obsidian-mcp-server.",
      "command": "npx",
      "args": [
        "-y",
        "obsidian-mcp-server@latest"
      ],
      "env": {
        "OBSIDIAN_API_KEY": "${OBSIDIAN_API_KEY}",
        "OBSIDIAN_BASE_URL": "${OBSIDIAN_BASE_URL:-https://127.0.0.1:27124}",
        "OBSIDIAN_VERIFY_SSL": "${OBSIDIAN_VERIFY_SSL:-false}",
        "OBSIDIAN_ENABLE_CACHE": "${OBSIDIAN_ENABLE_CACHE:-true}",
        "npm_config_loglevel": "error"
      }
    }
  },
  "imports": [
    "cursor",
    "claude-code",
    "claude-desktop",
    "codex",
    "windsurf",
    "opencode",
    "vscode"
  ],
  "meta": {
    "[META:NEUTRALIZED]": "paths-neutralized-v1",
    "[SEMANTIC:MOBILE]": "9-paths-subbed",
    "[META:TIMESTAMP]": "2025-01-XX",
    "[META:HSL]": "#00FFFF"
  }
}
```

---

## 🔄 Update Dashboard

To refresh this dashboard with current information:

```bash
# From project root
bun scripts/create-developer-dashboard.ts

# Or use the tool from 04-Developer directory
./04-Developer/Tools/update-dashboard.sh
```

## 🔗 Related

- [[README|04-Developer README]] - Developer workspace guide
- [[Notes/Developer|Developer Notes]] - Developer entry point
- [[Configs/mcporter-reference|MCPorter Reference]] - MCPorter configuration

---

## 📝 Logs & Monitoring

### Recent Activity
- Check TMUX session logs: `tmux capture-pane -t <session> -p`
- View Bun logs: Check `logs/` directory
- MCPorter logs: Check Cursor/MCP output

### Quick Health Checks

```bash
# Check Obsidian connection
bun packages/cli/index.ts vault check

# Check MCP servers
npx mcporter list

# Check TMUX sessions
tmux list-sessions
```

---

**Tags:** `#developer`, `#dashboard`, `#tooling`, `#tmux`, `#mcporter`

**Last Refresh:** 11/13/2025, 10:10:42 AM