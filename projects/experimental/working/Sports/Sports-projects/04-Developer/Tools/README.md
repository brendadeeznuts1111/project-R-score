---
title: Developer Tools
type: configuration
status: active
version: 1.0.0
created: 2025-01-XX
updated: 2025-01-XX
modified: 2025-11-14
category: development
description: Collection of developer utility scripts for the Sports-projects vault
allCookies: {}
analyticsId: ""
author: bun-platform
config_type: ""
csrfToken: ""
danCookie: ""
danSessionId: ""
deprecated: false
feature: ""
replaces: ""
tags:
  - developer
  - tools
  - scripts
  - configuration
  - bun-platform
usage: Reference guide for developer tools and scripts
---

# 🛠️ Developer Tools

> **Developer utility scripts**  
> *Vault management • Dashboard updates • Health checks*

---

## 📋 Available Tools

### 1. `vault-status.sh`
Check vault status and send to tmux pane.

**Usage**:
```bash
./vault-status.sh [session] [window] [pane]
```

**Examples**:
```bash
# Default (session 0, window 0, pane 0)
./vault-status.sh

# Specific session
./vault-status.sh 69 0 0
./vault-status.sh mcp-local-tools 0 0
```

**What it does**:
- Checks vault availability using `bun-platform info`
- Sends status message to specified tmux pane
- Prints confirmation to stdout

---

### 2. `update-dashboard.sh`
Update the Developer Dashboard with current information.

**Usage**:
```bash
./update-dashboard.sh
```

**What it does**:
- Runs `bun scripts/create-developer-dashboard.ts` from project root
- Updates `04-Developer/Dashboard.md` with current:
  - TMUX sessions
  - Tooling status
  - Environment variables
  - MCPorter configuration

---

### 3. `health-check.sh`
Comprehensive health check for developer environment.

**Usage**:
```bash
./health-check.sh
```

**What it checks**:
- ✅ Bun installation and version
- ✅ Node.js installation and version
- ✅ Vault availability and path
- ✅ TMUX sessions status

**Output**:
```
🔍 Developer Environment Health Check
======================================

📦 Bun:
   Version: 1.3.2
   ✅ Installed

📦 Node.js:
   Version: v25.1.0
   ✅ Installed

📁 Vault:
   ✅ Available
   Path: /Users/nolarose/working/Sports/Sports-projects

🖥️  TMUX Sessions:
   Active sessions: 4
   ✅ Running

✅ Health check complete
```

---

## 🔧 Requirements

All tools require:
- `bun-platform` CLI (from `packages/bun-platform`)
- `jq` (for JSON parsing in vault-status.sh)
- `tmux` (for vault-status.sh)

---

## 📝 Notes

- All scripts are executable (`chmod +x`)
- Scripts use relative paths from `04-Developer/Tools/`
- Tools assume project root is accessible via `../../..`

---

**Last Updated**: 2025-01-XX

