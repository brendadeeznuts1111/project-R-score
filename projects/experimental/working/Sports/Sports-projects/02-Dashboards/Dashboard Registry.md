---
title: Dashboard Registry
type:
  - documentation
  - dashboard
  - registry
status: active
version: 1.0.0
created: 2025-01-XX
updated: 2025-01-XX
modified: 2025-11-14
category: reference
description: Complete registry of all dashboards in the Kimi2 Feed platform - both codebase and vault dashboards
acceptEncoding: ""
acceptLanguage: ""
author: bun-platform
browser: ""
cacheControl: ""
canvas: []
connectionType: ""
cookies: {}
cookiesRaw: ""
deprecated: false
dns: ""
e_tag: ""
etag: ""
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
  - dashboard
  - registry
  - codebase
  - integration
  - sports
  - monitoring
usage: Reference for all available dashboards, their locations, versions, and integration points
user_agent: ""
userAgentRaw: ""
VIZ-06: []
xff: []
xForwardedFor: []
---

# 📊 Dashboard Registry

> **Complete inventory of all dashboards**  
> *Codebase dashboards • Vault dashboards • Integration points*

## 🎯 Overview

This registry documents all dashboards across the Kimi2 Feed platform:
- **Codebase Dashboards**: Located in `/Users/nolarose/Documents/github/Repos/kimi2/feed/dashboards/`
- **Vault Dashboards**: Located in `02-Dashboards/` (this vault)
- **System Dashboards**: Registered in `config/dashboards.json`

---

## 📁 Codebase Dashboards

### Core Dashboards (`dashboards/core/`)

| Dashboard     | File                           | Status | Description                      |
| ------------- | ------------------------------ | ------ | -------------------------------- |
| Demo Template | `demo-template-dashboard.html` | Active | Template demonstration dashboard |
| Version Demo  | `version-demo.html`            | Active | Version tracking demonstration   |

**Location**: `/Users/nolarose/Documents/github/Repos/kimi2/feed/dashboards/core/`

### Monitoring Dashboards (`dashboards/monitoring/`)

| Dashboard      | File                  | Status | Description                          |
| -------------- | --------------------- | ------ | ------------------------------------ |
| Server Metrics | `server-metrics.html` | Active | Real-time server performance metrics |

**Location**: `/Users/nolarose/Documents/github/Repos/kimi2/feed/dashboards/monitoring/`

### Sports Analytics Dashboards (`dashboards/sports/`)

#### ✅ Active: v2.1 Simplified (Production)

| Component      | File                                | Status   | Description              |
| -------------- | ----------------------------------- | -------- | ------------------------ |
| Main Entry     | `src/index.ts`                      | ✅ Active | TypeScript entry point   |
| Dashboard Core | `src/dashboard.ts`                  | ✅ Active | Core dashboard class     |
| Components     | `src/components.ts`                 | ✅ Active | UI components            |
| Types          | `src/types.ts`                      | ✅ Active | TypeScript definitions   |
| Styles         | `src/styles.css`                    | ✅ Active | Consolidated styles      |
| Config         | `bun.config.ts`                     | ✅ Active | Simplified configuration |
| HTML           | `nowgoal-dashboard-simplified.html` | ✅ Active | Production dashboard     |

**Status**: Production-ready, actively maintained  
**Features**: TypeScript, simplified architecture, better performance

#### ⚠️ Legacy: v2.0 Bun-Powered

| Component | File                              | Status   | Description           |
| --------- | --------------------------------- | -------- | --------------------- |
| Modules   | `js/modules/*.js`                 | ⚠️ Legacy | JavaScript modules    |
| Config    | `bun.config.js`                   | ⚠️ Legacy | Complex configuration |
| HTML      | `nowgoal-dashboard-bun.html`      | ⚠️ Legacy | Bun-powered dashboard |
| HTML      | `nowgoal-dashboard-enhanced.html` | ⚠️ Legacy | Enhanced version      |

**Status**: Deprecated, kept for reference

#### 📝 Other Sports Dashboards

| Dashboard         | File                     | Status   | Description              |
| ----------------- | ------------------------ | -------- | ------------------------ |
| NBA Breakdown     | `nba-breakdown.html`     | Active   | NBA game analysis        |
| NBA Models Viewer | `nba-models-viewer.html` | Active   | ML model visualization   |
| Markets Breakdown | `markets-breakdown.html` | Active   | Market analysis          |
| Test Modules      | `test-modules.html`      | Testing  | Module testing dashboard |
| Original          | `nowgoal-dashboard.html` | ⚠️ Legacy | Original version         |

**Location**: `/Users/nolarose/Documents/github/Repos/kimi2/feed/dashboards/sports/`

---

## 📋 System Dashboards (config/dashboards.json)

Registered dashboards served by the platform:

| ID                    | Name                | Path                | Category   | Version | Status     |
| --------------------- | ------------------- | ------------------- | ---------- | ------- | ---------- |
| `registry-sentinel`   | Registry Sentinel   | `/dist/registry`    | core       | 2.1.1   | production |
| `performance-monitor` | Performance Monitor | `/performance`      | monitoring | 1.0.0   | active     |
| `asia-sports-feed`    | Asia Sports Feed    | `/dashboard`        | core       | 1.8.0   | active     |
| `chroma-analytics`    | CHROMA Analytics    | `/chroma-dashboard` | core       | 1.5.0   | enhanced   |
| `citadel-security`    | Citadel Security    | `/citadel`          | core       | 1.3.0   | active     |
| `websocket-monitor`   | WebSocket Monitor   | `/websocket`        | monitoring | 1.0.0   | active     |

**Location**: `/Users/nolarose/Documents/github/Repos/kimi2/feed/config/dashboards.json`

---

## 📝 Vault Dashboards (`02-Dashboards/`)

| Dashboard              | File                                | Status   | Description               |
| ---------------------- | ----------------------------------- | -------- | ------------------------- |
| Vault Overview         | `Vault Overview.md`                 | ✅ Active | Complete vault statistics |
| Projects Dashboard     | `Projects Dashboard.md`             | ✅ Active | Project tracking          |
| Tasks Dashboard        | `Tasks Dashboard.md`                | ✅ Active | Task management           |
| Bun Platform CLI       | `Bun Platform CLI.md`               | ✅ Active | CLI documentation         |
| Bun Platform Workspace | `Bun Platform Workspace.md`         | ✅ Active | Workspace overview        |
| Navigation Enhancement | `Navigation Enhancement Summary.md` | ✅ Active | Navigation improvements   |
| Microstructure Alloy   | `Microstructure Alloy Summary.md`   | ✅ Active | Alloy analysis            |
| Dataview Test          | `dataview-test.md`                  | Testing  | Dataview testing          |

**Location**: `02-Dashboards/` (this vault)

---

## 🔗 Integration Points

### Codebase → Vault

- **Codebase dashboards** are development/testing implementations
- **Vault dashboards** are documentation and knowledge management
- **System dashboards** are production deployments

### Dashboard Flow

```text
Codebase Development
  ↓
System Registration (config/dashboards.json)
  ↓
Production Deployment
  ↓
Vault Documentation (02-Dashboards/)
```

---

## 🚀 Usage

### Running Codebase Dashboards

```bash
# Sports Dashboard (v2.1)
cd /Users/nolarose/Documents/github/Repos/kimi2/feed/dashboards/sports
bun run src/index.ts

# Or serve HTML directly
bun --serve nowgoal-dashboard-simplified.html
```

### Accessing System Dashboards

- **Main Dashboard**: http://localhost:3000/dashboard
- **Sports Analytics**: http://localhost:3000/sports
- **Performance Monitor**: http://localhost:3000/performance
- **Registry Sentinel**: http://localhost:3000/dist/registry

### Vault Dashboards

Access via Obsidian vault navigation or direct links:
- [[Vault Overview|Vault Overview Dashboard]]
- [[Projects Dashboard|Projects Dashboard]]
- [[Tasks Dashboard|Tasks Dashboard]]

---

## 📚 Related Documentation

- [[../03-Reference/Tools/Bun Platform CLI|Bun Platform CLI]] - CLI tooling
- [[../05-Projects/README|Projects Directory]] - Project management
- [[../06-Templates/00-Index|Template Index]] - Note templates
- [[../docs/GOLDEN_FILE_STANDARD|Golden File Standard]] - Vault governance

---

## 🔄 Dashboard Development Workflow

1. **Develop** in `dashboards/sports/src/` (TypeScript)
2. **Test** using standalone HTML files
3. **Register** in `config/dashboards.json`
4. **Deploy** via system dashboard manager
5. **Document** in vault `02-Dashboards/`

---

**File Metadata:**
- **Last Updated**: `= dateformat(this.file.mtime, "yyyy-MM-dd HH:mm:ss")`
- **Created**: `= dateformat(this.file.ctime, "yyyy-MM-dd HH:mm:ss")` | **Modified**: `= dateformat(this.file.mtime, "yyyy-MM-dd HH:mm:ss")`
- **Frontmatter Created**: `= this.created` | **Updated**: `= this.updated` | **Modified**: `= this.modified`
- **Registry Version**: `= this.version` | **Status**: `= this.status` | **Category**: `= this.category`
- **Tags**: `= choice(this.tags, join(this.tags, ", "), "No tags")`

