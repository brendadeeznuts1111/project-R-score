---
title: Dashboards Index
type:
  - index
  - dashboard
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-15
modified: 2025-11-15
category: dashboard
description: Complete index of all dashboards with quick access
author: bun-platform
deprecated: false
replaces: ""
tags:
  - index
  - dashboard
  - navigation
usage: Quick reference for all available dashboards
system_dashboards_count: 23
system_dashboards_source: "config/dashboards.json"
last_synced: "2025-11-15"
category_counts:
  core: 4
  monitoring: 7
  sports: 5
  betting: 3
  tes: 3
  other: 1
status_counts:
  production: 5
  active: 13
  enhanced: 2
  featured: 3
---

# 📊 Dashboards Index

> **Complete index of all vault dashboards**  
> *Quick access • Categorized • Searchable • Dynamic*

## 📑 Table of Contents

**Quick Navigation:**
- [🎯 Executive Summary](#-executive-summary) — Overview and key statistics
- [📋 All Dashboards](#-all-dashboards) — Complete list of Obsidian dashboards
- [🌐 System Dashboards](#-system-dashboards-webhtml) — Web/HTML dashboards served by Bun
- [🔄 Maintenance & Sync](#-maintenance--sync) — Keeping counts synchronized
- [💡 Tips & Best Practices](#-tips--best-practices) — Usage guidance
- [🎯 By Category](#-by-category) — Dataview-powered category views
- [🔍 Quick Search](#-quick-search) — Purpose-based navigation
- [📚 Related](#-related) — Related documentation and links

---

## 🎯 Executive Summary

**Overview:**
- **`= this.system_dashboards_count` System Dashboards** (Web/HTML) served by Bun platform
- **11 Obsidian Dashboards** (Markdown) in this vault directory
- **`= this.status_counts.production` Production** dashboards | **`= this.status_counts.featured` Featured** dashboards
- **6 Categories** | **4 Status Types**

**Quick Stats:**
- **Most Common Status**: Active (`= this.status_counts.active` dashboards)
- **Largest Category**: Monitoring (`= this.category_counts.monitoring` dashboards, `= round((this.category_counts.monitoring / this.system_dashboards_count) * 100)`%)
- **Sync Status**: ✅ Last synced `= this.last_synced` | Source: `= this.system_dashboards_source`
- **Production Rate**: `= round((this.status_counts.production / this.system_dashboards_count) * 100)`% production-ready
- **Visual Map**: [[../../knowledge/Architecture/Dashboards|🗺️ Canvas]] — `= this.system_dashboards_count` nodes, 16 relationship edges

**File**: `= this.file.name` | **Path**: `= this.file.folder` | **Status**: `= this.status` | **Version**: `= this.version`

### ⚡ Quick Jump

**By Type:**
- [📋 Obsidian Dashboards](#-all-dashboards) — Markdown dashboards in this vault (11 dashboards)
- [🌐 System Dashboards](#-system-dashboards-webhtml) — Web/HTML dashboards (`= this.system_dashboards_count` dashboards)

**By Status:**
- 🟢 [Production Dashboards](#-system-dashboards-webhtml) (`= this.status_counts.production`)
- 🔵 [Active Dashboards](#-all-dashboards) (`= this.status_counts.active`)
- 🟡 [Featured Dashboards](#-system-dashboards-webhtml) (`= this.status_counts.featured`)

**By Category:**
- ⚙️ [Core System](#-system-dashboards-webhtml) (`= this.category_counts.core`)
- 📊 [Monitoring](#-system-dashboards-webhtml) (`= this.category_counts.monitoring`)
- 🏀 [Sports Analytics](#-system-dashboards-webhtml) (`= this.category_counts.sports`)
- 💰 [Betting Markets](#-system-dashboards-webhtml) (`= this.category_counts.betting`)
- 🚀 [TES Protocol](#-system-dashboards-webhtml) (`= this.category_counts.tes`)

---

## 📋 All Dashboards

| Dashboard                                                    | Category  | Status    | Description                    |
| ------------------------------------------------------------ | --------- | --------- | ------------------------------ |
| [[Vault Overview\|📊 Vault Overview]]                         | Dashboard | ✅ Active  | Complete vault statistics      |
| [[Projects Dashboard\|📁 Projects Dashboard]]                 | Dashboard | ✅ Active  | Project tracking               |
| [[Tasks Dashboard\|✅ Tasks Dashboard]]                       | Dashboard | ✅ Active  | Task management                |
| [[Bun Platform CLI\|📖 Bun Platform CLI]]                     | Core      | ✅ Active  | CLI documentation              |
| [[Bun Platform Workspace\|🏗️ Bun Platform Workspace]]         | Core      | ✅ Active  | Workspace overview             |
| [[Dashboard Registry\|📋 Dashboard Registry]]                 | Reference | ✅ Active  | Complete inventory             |
| [[Dashboard Review\|📝 Dashboard Review]]                     | Reference | ✅ Active  | Comprehensive dashboard review |
| [[Navigation Enhancement Summary\|🧭 Navigation Enhancement]] | Core      | ✅ Active  | UI improvements                |
| [[Microstructure Alloy Summary\|⚗️ Microstructure Alloy]]     | Core      | ✅ Active  | Technical analysis             |
| [[Optimizations Overview\|⚡ Optimizations Overview]]         | Core      | ✅ Active  | Performance optimizations      |
| [[dataview-test\|🧪 Dataview Test]]                           | Testing   | 🧪 Testing | Query testing                  |

---

## 🌐 System Dashboards (Web/HTML)

> **Platform dashboards served by Bun**  
> *`= this.system_dashboards_count` dashboards registered in `= this.system_dashboards_source`*  
> *Last synced: `= this.last_synced` | Note: Update frontmatter when dashboards change.*  
> *Base URL: `http://localhost:3000` (default) | Registry: `http://localhost:3010`*

### 🚀 Quick Access

**Access Methods:**
- **Registry Dashboard**: `http://localhost:3010/dashboard-registry.html` — Complete interactive dashboard registry
- **API Endpoint**: `http://localhost:3000/api/dashboards` — JSON API for all dashboards
- **Config File**: `config/dashboards.json` — Source of truth configuration
- **Visual Map**: [[../../knowledge/Architecture/Dashboards|🗺️ Dashboards Canvas]] — Interactive canvas showing all `= this.system_dashboards_count` dashboards with relationships

**Status Legend:**
- 🟢 **Production** (`= this.status_counts.production`) — Stable, production-ready dashboards
- 🔵 **Active** (`= this.status_counts.active`) — Actively maintained dashboards
- 🟣 **Enhanced** (`= this.status_counts.enhanced`) — Enhanced with advanced features
- 🟡 **Featured** (`= this.status_counts.featured`) — Featured/highlighted dashboards

### 📊 Quick Statistics

| Metric               | Count                             | Percentage                                                                       |
| -------------------- | --------------------------------- | -------------------------------------------------------------------------------- |
| **Total Dashboards** | `= this.system_dashboards_count`  | 100%                                                                             |
| **Production**       | `= this.status_counts.production` | `= round((this.status_counts.production / this.system_dashboards_count) * 100)`% |
| **Active**           | `= this.status_counts.active`     | `= round((this.status_counts.active / this.system_dashboards_count) * 100)`%     |
| **Featured**         | `= this.status_counts.featured`   | `= round((this.status_counts.featured / this.system_dashboards_count) * 100)`%   |
| **Enhanced**         | `= this.status_counts.enhanced`   | `= round((this.status_counts.enhanced / this.system_dashboards_count) * 100)`%   |

**Quick Reference:**
- **[[Dashboard Review|📝 Dashboard Review]]** — Complete analysis of all `= this.system_dashboards_count` system dashboards
- **[[../03-Reference/Dashboards/Codebase Dashboards Reference|🔧 Codebase Dashboards Reference]]** — Technical documentation
- **[[../../knowledge/Architecture/Dashboards|🗺️ Dashboards Canvas]]** — Visual architecture map with `= this.system_dashboards_count` nodes and 16 relationship edges

### 📁 Categories

| Category               | Count                               | Percentage                                                                         | Description                     |
| ---------------------- | ----------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------- |
| ⚙️ **Core System**      | `= this.category_counts.core`       | `= round((this.category_counts.core / this.system_dashboards_count) * 100)`%       | Essential system infrastructure |
| 📊 **Monitoring**       | `= this.category_counts.monitoring` | `= round((this.category_counts.monitoring / this.system_dashboards_count) * 100)`% | System monitoring and health    |
| 🏀 **Sports Analytics** | `= this.category_counts.sports`     | `= round((this.category_counts.sports / this.system_dashboards_count) * 100)`%     | Sports data and analytics       |
| 💰 **Betting Markets**  | `= this.category_counts.betting`    | `= round((this.category_counts.betting / this.system_dashboards_count) * 100)`%    | Betting market analysis         |
| 🚀 **TES Protocol**     | `= this.category_counts.tes`        | `= round((this.category_counts.tes / this.system_dashboards_count) * 100)`%        | Trading protocol dashboards     |
| 🔧 **Other**            | `= this.category_counts.other`      | `= round((this.category_counts.other / this.system_dashboards_count) * 100)`%      | Miscellaneous dashboards        |

**Category Details:**
- ⚙️ **Core System** (`= this.category_counts.core` dashboards, `= round((this.category_counts.core / this.system_dashboards_count) * 100)`%) - Registry Sentinel, Asia Sports Feed, CHROMA Analytics, Citadel Security
- 📊 **Monitoring** (`= this.category_counts.monitoring` dashboards, `= round((this.category_counts.monitoring / this.system_dashboards_count) * 100)`%) - Performance Monitor, WebSocket Monitor, Server Metrics, Multi-layer Health, etc.
- 🏀 **Sports Analytics** (`= this.category_counts.sports` dashboards, `= round((this.category_counts.sports / this.system_dashboards_count) * 100)`%) - NowGoal Integration, NBA Models, NCAA Women's Basketball Hub, etc.
- 💰 **Betting Markets** (`= this.category_counts.betting` dashboards, `= round((this.category_counts.betting / this.system_dashboards_count) * 100)`%) - Markets Analysis, Asian Handicap Analysis, Basketball Asian Handicap
- 🚀 **TES Protocol** (`= this.category_counts.tes` dashboards, `= round((this.category_counts.tes / this.system_dashboards_count) * 100)`%) - Market Granularity, Juice Management, Book Analysis
- 🔧 **Other** (`= this.category_counts.other` dashboard, `= round((this.category_counts.other / this.system_dashboards_count) * 100)`%) - Women's Basketball

**Total**: `= this.system_dashboards_count` system dashboards | **Config**: `= this.system_dashboards_source` | **Last Synced**: `= this.last_synced` | **File Updated**: `= dateformat(this.file.mtime, "yyyy-MM-dd HH:mm:ss")`

---

## 🔄 Maintenance & Sync

> **Keeping counts synchronized**  
> When dashboards are added/removed from `config/dashboards.json`, update this file's frontmatter:

**Sync Steps:**
1. Check `config/dashboards.json` → `metadata.totalDashboards` value
2. Count dashboards by category (core, monitoring, sports, betting, tes, other)
3. Count dashboards by status (production, active, enhanced, featured)
4. Update frontmatter fields (lines 21-33)
5. Update `last_synced` date
6. All references throughout the document update automatically via dataview

**Verification:**
- Total should equal sum of all category counts
- Status counts should equal sum of all status types
- Category percentages should add up to ~100%

**Quick Count Verification:**
- Category sum: `= this.category_counts.core + this.category_counts.monitoring + this.category_counts.sports + this.category_counts.betting + this.category_counts.tes + this.category_counts.other` (should equal `= this.system_dashboards_count`)
- Status sum: `= this.status_counts.production + this.status_counts.active + this.status_counts.enhanced + this.status_counts.featured` (should equal `= this.system_dashboards_count`)

---

## 💡 Tips & Best Practices

**Finding Dashboards:**
- Use the **Quick Search** section below for purpose-based navigation
- Check **By Category** section for dataview-powered dynamic lists
- Visit **[[Dashboard Registry|Dashboard Registry]]** for complete Obsidian dashboard inventory
- Review **[[Dashboard Review|Dashboard Review]]** for comprehensive system dashboard analysis

**Accessing System Dashboards:**
- Ensure Bun server is running (`bun run dev` or similar)
- Default base URL: `http://localhost:3000`
- Some dashboards may have custom ports (check `config/dashboards.json`)
- Use the Registry Dashboard for interactive browsing

**Maintenance:**
- Update frontmatter counts when dashboards change
- Verify counts match `config/dashboards.json` metadata
- Update `last_synced` date after syncing
- All dynamic references update automatically via dataview

**Keyboard Shortcuts:**
- **Refresh Dataview**: `Cmd+R` (Mac) / `Ctrl+R` (Windows/Linux)
- **Quick Open**: `Cmd+O` (Mac) / `Ctrl+O` (Windows/Linux)
- **Command Palette**: `Cmd+P` (Mac) / `Ctrl+P` (Windows/Linux)
- **Search**: `Cmd+Shift+F` (Mac) / `Ctrl+Shift+F` (Windows/Linux)

---

## 🎯 By Category

### Core Management Dashboards
```dataview
TABLE status, description
FROM "02-Dashboards"
WHERE contains(tags, "dashboard") AND (category = "dashboard" OR category = "core")
AND file.name != "00-Index"
SORT file.name ASC
```

### Platform Integration Dashboards
```dataview
TABLE status, description
FROM "02-Dashboards"
WHERE contains(tags, "platform") OR contains(file.name, "Bun Platform")
AND file.name != "00-Index"
SORT file.name ASC
```

### Reference Dashboards
```dataview
TABLE status, description
FROM "02-Dashboards"
WHERE category = "reference"
AND file.name != "00-Index"
SORT file.name ASC
```

---

## 🔍 Quick Search

### By Purpose

**Knowledge Management:**
- [[Vault Overview|Vault Overview]] - System statistics
- [[Projects Dashboard|Projects Dashboard]] - Project tracking
- [[Tasks Dashboard|Tasks Dashboard]] - Task management

**Development:**
- [[Bun Platform CLI|Bun Platform CLI]] - CLI reference
- [[Bun Platform Workspace|Bun Platform Workspace]] - Workspace guide

**Reference & Documentation:**
- [[Dashboard Registry|Dashboard Registry]] - Complete inventory (Obsidian dashboards)
- [[Dashboard Review|Dashboard Review]] - Comprehensive review of all `= this.system_dashboards_count` system dashboards from `= this.system_dashboards_source`
- [[../03-Reference/Dashboards/Codebase Dashboards Reference|Codebase Dashboards Reference]] - Technical documentation and development guide

**Optimization & Analysis:**
- [[Optimizations Overview|Optimizations Overview]] - Performance optimizations
- [[Microstructure Alloy Summary|Microstructure Alloy Summary]] - Technical analysis

---

## 📚 Related

**Directory & Navigation:**
- **[[README|📖 Dashboards README]]** — Directory overview and navigation
- **[[../Home|🏠 Home]]** — Vault homepage
- **[[../05-Projects/README|📁 Projects]]** — Project directory

**Dashboard Documentation:**
- **[[Dashboard Registry|📋 Dashboard Registry]]** — Complete Obsidian dashboard inventory
- **[[Dashboard Review|📝 Dashboard Review]]** — Comprehensive review of all `= this.system_dashboards_count` system dashboards
- **[[../03-Reference/Dashboards/Codebase Dashboards Reference|🔧 Codebase Dashboards Reference]]** — Technical documentation
- **[[../../knowledge/Architecture/Dashboards|🗺️ Dashboards Canvas]]** — Visual architecture map showing dashboard relationships and data flow

---

**File Metadata:**
- **Created**: `= dateformat(this.file.ctime, "yyyy-MM-dd HH:mm:ss")` | **Modified**: `= dateformat(this.file.mtime, "yyyy-MM-dd HH:mm:ss")`
- **Frontmatter Created**: `= this.created` | **Updated**: `= this.updated` | **Modified**: `= this.modified`
- **Category**: `= this.category` | **Author**: `= this.author`
- **Tags**: `= choice(this.tags, join(this.tags, ", "), "No tags")`

**System Dashboard Statistics:**
- **Total**: `= this.system_dashboards_count` dashboards | **Source**: `= this.system_dashboards_source`
- **Last Synced**: `= this.last_synced`
- **Status Breakdown**: 🟢 `= this.status_counts.production` Production | 🔵 `= this.status_counts.active` Active | 🟡 `= this.status_counts.featured` Featured | 🟣 `= this.status_counts.enhanced` Enhanced
- **Category Breakdown**: ⚙️ `= this.category_counts.core` Core | 📊 `= this.category_counts.monitoring` Monitoring | 🏀 `= this.category_counts.sports` Sports | 💰 `= this.category_counts.betting` Betting | 🚀 `= this.category_counts.tes` TES | 🔧 `= this.category_counts.other` Other

**Distribution Analysis:**
- **Production Rate**: `= round((this.status_counts.production / this.system_dashboards_count) * 100)`% of dashboards are production-ready
- **Active Rate**: `= round((this.status_counts.active / this.system_dashboards_count) * 100)`% of dashboards are actively maintained
- **Monitoring Focus**: `= round((this.category_counts.monitoring / this.system_dashboards_count) * 100)`% of dashboards are monitoring-related
- **Sports Focus**: `= round((this.category_counts.sports / this.system_dashboards_count) * 100)`% of dashboards are sports analytics