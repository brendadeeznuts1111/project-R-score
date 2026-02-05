---
title: Developer
type: developer
status: active
version: 1.0.0
created: 2025-11-13
updated: 2025-11-13
modified: 2025-11-14
category: development
description: Developer entry point for TMUX sessions, tooling status, MCPorter configuration, and system information
allCookies: {}
analyticsId: ""
author: bun-platform
csrfToken: ""
danCookie: ""
danSessionId: ""
deprecated: false
feature: ""
replaces: ""
tags:
  - developer
  - tooling
  - tmux
  - mcporter
  - configuration
usage: Main developer entry point and reference
---

# 🛠️ Developer

> **Developer entry point**  
> *TMUX sessions • Tooling status • MCPorter configuration • System information*

---

## 📺 TMUX Sessions

Run `tmux list-sessions` to see active sessions.

### Quick Commands

```bash
# List all sessions
tmux list-sessions

# Attach to session
tmux attach -t <session-name>

# Create new session
tmux new -s <session-name>

# View session logs
tmux capture-pane -t <session-name> -p
```

---

## 🔧 Tooling Status

Check tooling with:
- `bun --version`
- `node --version`
- `npm --version`

---

## 🌐 Environment Variables

Key variables:
- `BUN_DX_ROOT` - Bun DX root directory
- `OBSIDIAN_API_KEY` - Obsidian API key
- `CURSOR_GITLENS_PATH` - GitLens path
- `CONTEXT7_API_KEY` - Context7 API key

---

## 🔌 MCPorter Servers

**Config:** `config/mcporter.json`

See `config/mcporter.json` for full MCP server configuration.

---

## 📋 Quick Links

- [[../Home|Home]] - Main vault entry point
- [[../Dashboard|Developer Dashboard]] - Developer dashboard
- [[../../03-Reference/TES-OPS-007-OPT.3-COMPLETE|TES-OPS-007.OPT.3]] - Templater optimization log (if exists)

---

## 🔄 Update This Page

```bash
# From project root
bun scripts/create-developer-page.ts

# Or use the tool
./04-Developer/Tools/update-dashboard.sh
```

## 🔗 Related

- [[../README|04-Developer README]] - Developer workspace guide
- [[../Configs/mcporter-reference|MCPorter Reference]] - MCPorter configuration
- [[../Configs/environment-variables|Environment Variables]] - Env vars guide

---

**Tags:** `#developer`, `#tooling`, `#tmux`, `#mcporter`

**Last Refresh:** 11/13/2025, 10:17:06 AM