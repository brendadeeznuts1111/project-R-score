---
title: Vault Overview
type:
  - dashboard
  - overview
status: active
version: 1.0.0
created: 2025-11-13
updated: 2025-01-XX
modified: 2025-11-14
category: dashboard
description: Complete vault statistics and activity overview
author: bun-platform
canvas: []
deprecated: false
feed_integration: false
replaces: ""
tags:
  - dashboard
  - vault
  - overview
  - bun-platform
usage: Track projects, notes, references, and bun-platform integration
VIZ-06: []
---

# 📊 Vault Overview Dashboard

> **Complete vault statistics and activity overview**  
> *Track projects, notes, references, and bun-platform integration*

## 🗺️ Navigation

- **[[README|📊 Dashboards]]** — Dashboard directory entry point
- **[[00-Index|📋 Dashboards Index]]** — Complete dashboard index
- **[[../Home|🏠 Home]]** — Vault homepage
- **[[Dashboard Registry|📊 Dashboard Registry]]** — Complete dashboard inventory (codebase + vault)
- **[[Bun Platform Workspace|🏗️ Bun Platform Workspace]]** — Complete bun-platform workspace
- **[[Bun Platform CLI|📖 Bun Platform CLI]]** — CLI documentation
- **[[../06-Templates/Template Index|📑 Template Index]]** — All templates

---

## 📅 Recent Daily Notes

> **Latest daily notes and journal entries**
```dataview
TABLE date, file.mtime as "Modified"
FROM "01-Daily"
SORT file.mtime DESC
LIMIT 5
```

## 📝 Inbox Items (Need Review)

> **Items requiring attention**

```dataview
LIST
FROM "00-Inbox"
```

---

## 🎯 Active Projects

> **Projects currently in progress**

```dataview
TABLE status, file.mtime as "Last Updated"
FROM "05-Projects"
WHERE status = "active"
SORT file.mtime DESC
```

---

## 📚 Reference Materials

> **Documentation and reference files**

```dataview
TABLE file.mtime as "Last Updated"
FROM "03-Reference"
SORT file.mtime DESC
LIMIT 10
```

---

## 🔖 All Tags

> **Tagged content across the vault**

```dataview
TABLE rows.file.link as "Files"
FROM ""
FLATTEN file.tags as tag
GROUP BY tag
SORT tag ASC
```

---

## 🏗️ Bun Platform CLI

> **Architectural governance and Obsidian integration CLI**  
> *Bridge between technical architecture and knowledge management*

### 🚀 Quick Access
- **[[Bun Platform Workspace|🏗️ Bun Platform Workspace]]** — Complete workspace (START HERE)
- **[[Bun Platform CLI|📖 Bun Platform CLI]]** — Full documentation and usage guide
- **[[../Home|🏠 Home]]** — Vault homepage with bun-platform section

### 🎨 Templates
- **[[06-Templates/Development/Architecture Note Template|📝 Architecture Note Template]]** — General architecture notes
- **[[06-Templates/Development/Development Template|🚀 Development Template]]** — Development notes template
- **[[../06-Templates/Template Index|📑 Template Index]]** — All templates with bun-platform usage

### 🛠️ Quick Commands
```bash
# Create architectural proposal
bun-platform create-arch-note --suggestion-id suggestion.json --auto-link

# Get help
bun-platform --help
bun-platform create-arch-note --help
```

### 📁 Package Location
- **Package**: `packages/bun-platform/`
- **CLI Entry**: `packages/bun-platform/src/index.ts`
- **Documentation**: `packages/bun-platform/README.md`

---

## 📊 Dashboard Resources

### Dashboard Documentation
- **[[Dashboard Registry|📊 Dashboard Registry]]** — Complete inventory of all dashboards
  - Codebase dashboards (`/kimi2/feed/dashboards/`)
  - System dashboards (`config/dashboards.json`)
  - Vault dashboards (`02-Dashboards/`)
- **[[../03-Reference/Dashboards/Codebase Dashboards Reference|🔧 Codebase Dashboards Reference]]** — Technical reference for dashboard development

### Dashboard Categories
- **Core Dashboards**: System core functionality
- **Monitoring Dashboards**: Performance and health monitoring
- **Sports Dashboards**: Sports analytics and data visualization
- **Vault Dashboards**: Knowledge management and documentation

---

## 📋 Footer

> **Vault metadata and quick links**

**Vault ID**: `ee201515558d34f0`  
**Status**: `= this.status`  
**Last Updated**: `= date(today)`

### 🔗 Quick Links
- **[[../Home|🏠 Home]]** — Vault homepage
- **[[Bun Platform Workspace|🏗️ Bun Platform Workspace]]** — Bun-platform workspace
- **[[../06-Templates/Template Index|📑 Template Index]]** — All templates

*This dashboard updates automatically with Dataview queries. Refresh to see latest changes.* 🔄

