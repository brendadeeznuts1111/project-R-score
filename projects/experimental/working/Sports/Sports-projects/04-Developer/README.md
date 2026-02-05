---
title: Developer Workspace
type: configuration
status: active
version: 1.0.0
created: 2025-01-XX
updated: 2025-01-XX
modified: 2025-11-14
category: development
description: Developer tools, dashboards, and development-related resources
acceptEncoding: ""
acceptLanguage: ""
allCookies: {}
analyticsId: ""
author: bun-platform
browser: ""
cacheControl: ""
canvas: []
config_type: ""
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
tags:
  - developer
  - workspace
  - tools
  - dashboard
  - configuration
usage: Main entry point for developer workspace organization
user_agent: ""
userAgentRaw: ""
VIZ-06: []
xff: []
xForwardedFor: []
---

# 🛠️ Developer Workspace

> **Developer workspace organization**  
> *Tools • Dashboards • Configurations • Notes*

---

## 📁 Structure

```
04-Developer/
├── README.md                    # This file
├── Dashboard.md                  # Developer dashboard (auto-generated)
├── System Architecture.canvas    # Architecture diagrams
├── Tools/                        # Developer tools and scripts
├── Configs/                      # Developer configurations
├── Notes/                        # Development notes and documentation
├── Working/                      # Active development workspace
└── Scraps/                       # Temporary notes and quick ideas
```

---

## 📋 Contents

### Dashboard.md
Auto-generated developer dashboard showing:
- TMUX sessions
- Tooling status (Bun, Node.js, npm)
- Environment variables
- MCPorter configuration
- Quick health checks

**Update**: Run `bun scripts/create-developer-dashboard.ts`

### System Architecture.canvas
Visual architecture diagrams and system designs.

---

## 🔧 Quick Commands

```bash
# Update dashboard
bun scripts/create-developer-dashboard.ts

# Check vault status
bun-platform info --health

# Check TMUX sessions
tmux list-sessions

# Check MCP servers
npx mcporter list
```

---

## 📝 Notes

- Keep developer-specific notes in `Notes/` subfolder
- Tools and scripts go in `Tools/` subfolder
- Configurations go in `Configs/` subfolder
- Active work goes in `Working/` subfolder
- Temporary notes go in `Scraps/` subfolder

### Developer Notes
- [[Notes/Developer|Developer]] - Main developer entry point
- [[Dashboard|Dashboard]] - Developer dashboard

### Workspace Directories
- [[Working/README|Working]] - Active development workspace
- [[Scraps/README|Scraps]] - Temporary notes and quick ideas

### Tools Available
- `Tools/vault-status.sh` - Check vault status and send to tmux
- `Tools/update-dashboard.sh` - Update developer dashboard
- `Tools/health-check.sh` - Quick health check for dev environment

### Configuration References
- `Configs/mcporter-reference.md` - MCPorter configuration reference
- `Configs/environment-variables.md` - Environment variables guide
- `Configs/obsidian-api-key-management.md` - Obsidian API key management and usage tracking

---

**Last Updated**: 2025-01-XX

