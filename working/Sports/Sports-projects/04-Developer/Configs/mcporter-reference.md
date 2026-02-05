---
title: MCPorter Configuration Reference
type: configuration
status: active
version: 1.0.0
created: 2025-01-XX
updated: 2025-01-XX
modified: 2025-11-14
category: development
description: MCPorter configuration reference and MCP server categories
author: bun-platform
config_type: ""
deprecated: false
feature: ""
replaces: ""
tags:
  - mcporter
  - configuration
  - mcp
  - developer
  - tools
usage: Reference for MCPorter configuration and MCP server setup
---

# MCPorter Configuration Reference

**Location**: `config/mcporter.json` (in project root)

## Quick Access

To view the full MCPorter configuration, see:
- Project config: `config/mcporter.json` (in project root)
- Dashboard: [[../Dashboard|Developer Dashboard]]

## MCP Server Categories

### 🏠 Local Development
- **local-tools** - Project-specific MCP tools

### 🚀 Bun Ecosystem
- **Bun-Docs-Local** - Local Bun documentation server
- **Bun-Official** - Official Bun documentation
- **Bun-DX-Workspace** - Workspace dependency management
- **Bun-DX-Testing** - Test runner and coverage tools
- **Bun-DX-Build** - Build system tools
- **Bun-DX-Database** - Database management tools

### 🌍 External Services
- **context7** - Context7 documentation MCP
- **chrome-devtools** - Chrome DevTools protocol bridge
- **signoz** - SigNoz observability platform
- **shadcn** - shadcn/ui component registry

### 🗂️ Infrastructure
- **Filesystem** - File system operations
- **GitKraken** - Git operations via GitLens
- **obsidian** - Obsidian vault access

## Quick Commands

```bash
# List MCP servers
npx mcporter list

# Check server status
npx mcporter status

# View config
cat config/mcporter.json | jq
```

---
**Last Updated**: 2025-01-XX

