---
title: Dashboards Directory
type:
  - documentation
  - dashboard
  - index
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-15
modified: 2025-11-15
category: dashboard
description: Entry point and index for all vault dashboards
author: bun-platform
deprecated: false
replaces: ""
tags:
  - dashboard
  - index
  - entry-point
  - navigation
usage: Start here to navigate all available dashboards
obsidian_dashboards_count: 11
system_dashboards_count: 23
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
category_types_count: 6
status_types_count: 4
---

# 📊 Dashboards Directory

> **Central hub for all vault dashboards**  
> *Knowledge management • Project tracking • System monitoring*

## 🎯 Start Here

**Primary Index:**
- **[[00-Index|📊 Dashboards Index]]** — Complete index with dynamic statistics, quick access, and comprehensive navigation

**Quick Stats:**
- **`= this.obsidian_dashboards_count` Obsidian Dashboards** (Markdown) in this directory
- **`= this.system_dashboards_count` System Dashboards** (Web/HTML) served by Bun platform
- **`= this.category_types_count` Categories** | **`= this.status_types_count` Status Types**

---

## 🎯 Quick Navigation

### 📋 Core Dashboards

- **[[Vault Overview|📊 Vault Overview]]** — Complete vault statistics and activity
- **[[Projects Dashboard|📁 Projects Dashboard]]** — Active project tracking
- **[[Tasks Dashboard|✅ Tasks Dashboard]]** — Task management and tracking

### 🛠️ Platform Dashboards

- **[[Bun Platform CLI|📖 Bun Platform CLI]]** — CLI tooling documentation
- **[[Bun Platform Workspace|🏗️ Bun Platform Workspace]]** — Workspace overview

### 📚 Reference Dashboards

- **[[Dashboard Registry|📋 Dashboard Registry]]** — Complete dashboard inventory
- **[[Dashboard Review|📝 Dashboard Review]]** — Comprehensive review of all `= this.system_dashboards_count` system dashboards
- **[[Navigation Enhancement Summary|🧭 Navigation Enhancement]]** — Navigation improvements
- **[[Microstructure Alloy Summary|⚗️ Microstructure Alloy]]** — Alloy analysis summary
- **[[Optimizations Overview|⚡ Optimizations Overview]]** — Performance optimizations

### 🧪 Testing

- **[[dataview-test|🧪 Dataview Test]]** — Dataview query testing

---

## 📁 Dashboard Categories

### Core Management
- **Vault Overview** — System-wide statistics
- **Projects Dashboard** — Project lifecycle tracking
- **Tasks Dashboard** — Task and workflow management

### Platform Integration
- **Bun Platform CLI** — Command-line tooling
- **Bun Platform Workspace** — Development workspace

### Documentation & Reference
- **Dashboard Registry** — Complete dashboard inventory (codebase + vault)
- **Dashboard Review** — Comprehensive review of all `= this.system_dashboards_count` system dashboards
- **Navigation Enhancement** — UI/UX improvements
- **Microstructure Alloy** — Technical analysis
- **Optimizations Overview** — Performance optimizations

---

## 🔗 Integration Points

### Codebase Dashboards
- **Location**: `/Users/nolarose/Documents/github/Repos/kimi2/feed/dashboards/`
- **Reference**: [[Dashboard Registry|Dashboard Registry]] for complete inventory
- **Technical Docs**: [[../03-Reference/Dashboards/Codebase Dashboards Reference|Codebase Dashboards Reference]]

### System Dashboards
- **Registry**: `config/dashboards.json` in codebase
- **Total**: `= this.system_dashboards_count` dashboards
- **Categories**: Core (`= this.category_counts.core`), Monitoring (`= this.category_counts.monitoring`), Sports (`= this.category_counts.sports`), Betting (`= this.category_counts.betting`), TES (`= this.category_counts.tes`), Other (`= this.category_counts.other`)
- **Access**: Via platform server endpoints (`http://localhost:3000`)
- **Visual Map**: [[../../knowledge/Architecture/Dashboards|🗺️ Dashboards Canvas]] — Interactive architecture visualization

### Vault Dashboards
- **Location**: `02-Dashboards/` (this directory)
- **Purpose**: Knowledge management and documentation
- **Integration**: Links to codebase and system dashboards

---

## 📊 Dashboard Usage

### For Knowledge Management
- Use **Vault Overview** for system-wide insights
- Use **Projects Dashboard** for project tracking
- Use **Tasks Dashboard** for workflow management

### For Development
- Use **Bun Platform CLI** for tooling reference
- Use **Bun Platform Workspace** for workspace overview
- Use **Dashboard Registry** for complete dashboard inventory

### For Reference
- Use **Dashboard Registry** to find all dashboards
- Use **Codebase Dashboards Reference** for technical details
- Use **Navigation Enhancement** for UI improvements

---

## 🚀 Quick Links

- **[[../Home|🏠 Home]]** — Vault homepage
- **[[../05-Projects/README|📁 Projects]]** — Project directory
- **[[../06-Templates/00-Index|📑 Templates]]** — Template index
- **[[../03-Reference/README|📚 Reference]]** — Reference documentation

---

**Directory Information:**
- **Total Dashboards**: `= this.obsidian_dashboards_count` Obsidian dashboards + `= this.system_dashboards_count` System dashboards = `= this.obsidian_dashboards_count + this.system_dashboards_count` total
- **Last Updated**: `= dateformat(this.file.mtime, "yyyy-MM-dd HH:mm:ss")`
- **Directory Version**: `= this.version`
- **Primary Index**: [[00-Index|📊 Dashboards Index]] — Complete dynamic index with statistics, quick access, and comprehensive navigation
- **File**: `= this.file.name` | **Path**: `= this.file.folder` | **Status**: `= this.status`

**Related:**
- **[[00-Index|📊 Dashboards Index]]** — Main index file with dynamic statistics
- **[[../Home|🏠 Home]]** — Vault homepage
- **[[../03-Reference/Dashboards/Codebase Dashboards Reference|🔧 Codebase Dashboards Reference]]** — Technical documentation

