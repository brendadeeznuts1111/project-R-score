---
title: 🏠 Home - Sports Analytics Vault
type: dashboard
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-15
modified: 2025-11-15
category: core
id: home-sports-analytics-vault
path: $env:DASH_ROOT/Home.md
name: Home - Sports Analytics Vault
description: Central knowledge hub for sports analytics, projects, and insights
acceptEncoding: ""
acceptLanguage: ""
active_projects: 4
aliases:
  - Home
  - Homepage
  - Main Page
  - Index
  - Dashboard
allCookies: {}
analyticsId: ""
archived: false
asn: ""
author: Sports Analytics Team
browser: ""
browserName: ""
browserVersion: ""
cacheControl: ""
canvas: []
city: ""
completed: false
connectionType: ""
cookies: {}
cookiesRaw: ""
countryCode: ""
countryName: ""
created_forge_date: 2025-11-14
created_forge_time: 2025-11-14T00:00:00Z
created_system_time: 2025-11-14 00:00:00 (UTC)
csrfToken: ""
danCookie: ""
danSessionId: ""
deprecated: false
deviceBrand: ""
deviceModel: ""
deviceType: ""
dns: ""
e_tag: ""
estimated_hours: 0
etag: []
feed_integration: false
health_score: 98
inbox_items: 0
ip: ""
ip4: ""
ip6: ""
ipv4: ""
ipv6: ""
isBot: false
isGeoBlocked: false
isMobile: false
isp: ""
last_health_check: 2025-11-14
last_health_check_forge_date: 2025-11-14
last_health_check_forge_time: 2025-11-14T00:00:00Z
latitude: ""
longitude: ""
modified_forge_date: 2025-11-14
modified_forge_time: 2025-11-14T00:00:00Z
modified_system_time: 2025-11-14 00:00:00 (UTC)
os: ""
osName: ""
osVersion: ""
priority: low
progress: 100
recent_activity: 0
referer: ""
referrer: ""
regionCode: ""
regionName: ""
related_projects:
  - Sports Analytics
  - HFT Freeze Predictor
  - API Integration
  - Feed Project
replaces: ""
requestId: ""
requestMethod: GET
requestPath: ""
tags:
  - home
  - dashboard
  - vault
  - sports-analytics
template: $env:DASH_ROOT/src/templates/dashboard.md
timezone: ""
total_files: 0
updated_forge_date: 2025-11-14
updated_forge_time: 2025-11-14T00:00:00Z
updated_system_time: 2025-11-14 00:00:00 (UTC)
usage: Main entry point for Sports Analytics Vault. Use this dashboard to navigate projects, dashboards, and resources.
user_agent: ""
userAgentRaw: ""
vault_id: ee201515558d34f0
VIZ-06: []
xff: []
xForwardedFor: []
zipCode: ""
---

# 🏠 Home

> **Your central knowledge hub**  
> Sports analytics, projects, and insights in one place

---

## 🚀 Quick Access

### 🤖 Forge Intelligence v1.1 (NEW!)
- **[[docs/FORGE_V1.1_QUICK_START|🚀 Forge v1.1 Quick Start]]** — Complete viewing guide
- **[[docs/dashboards/extended-roadmap-actions|📋 Roadmap Actions]]** — Full roadmap tracker with Templater
- **[[docs/FORGE_SUGGESTION_V1.1_UNIFIED|📖 Unified Spec]]** — Complete v1.1 specification
- **[[docs/FORGE_V1.1_INDEX|📑 Index]]** — Navigation index
- **[[docs/dashboards/v1.1-roadmap-queue|📊 Roadmap Queue]]** — Dataview dashboard

**Quick Stats**:
- **Version**: 1.1.0
- **Target**: 85% auto-execution by Jan 2026
- **Phase 6 Sprint**: Nov 2025 (2025-11-15 to 2025-12-13)
- **Status**: Active development

### 📊 Dashboards
- **[[02-Dashboards/README|📊 Dashboards]]** — Dashboard directory entry point
- [[02-Dashboards/Vault Overview|Vault Overview]] - Complete vault statistics
- [[02-Dashboards/Projects Dashboard|Projects Dashboard]] - All active projects
- [[02-Dashboards/Tasks Dashboard|Tasks Dashboard]] - Task tracking

### 📁 Active Projects

**Quick Links:**
- [[05-Projects/sports-analytics|Sports Analytics]] - Main analytics workspace
- [[05-Projects/hft-freeze-predictor|HFT Freeze Predictor]] - Trading predictions
- [[05-Projects/api-integration|API Integration]] - Sports data APIs
- [[05-Projects/feed-project|Feed Project]] - Feed project workspace

### ⚙️ Configuration
- [[01-Configuration/Sports Config|Sports Config]] - API endpoints and settings
- [[01-Configuration/HFT Config|HFT Config]] - Trading thresholds
- [[01-Configuration/MCPorter Config|MCPorter Config]] - MCP setup

---

## 📊 Vault Statistics

```dataview
TABLE length(rows) AS "Files"
FROM ""
WHERE file.folder != ""
GROUP BY file.folder
SORT length(rows) DESC
LIMIT 10
```

---

## 🔥 Recent Activity

```dataview
TABLE file.mtime AS "Modified", file.folder AS "Location"
FROM ""
WHERE file.mtime >= date(today) - dur(7 days)
AND file.name != "Home"
SORT file.mtime DESC
LIMIT 10
```

### 🤖 Forge v1.1 Recent Updates

```dataview
TABLE file.mtime AS "Updated", file.folder AS "Location"
FROM "docs"
WHERE file.name =~ "FORGE.*v1.1" OR file.name =~ ".*roadmap.*"
SORT file.mtime DESC
LIMIT 5
```

---

## 📥 Inbox

```dataview
LIST
FROM "00-Inbox"
WHERE file.mtime >= date(today) - dur(30 days)
SORT file.mtime DESC
LIMIT 5
```

---

## 🎯 Active Projects Status

**Project Status Dashboard:**
```dataview
TABLE file.mtime AS "Updated"
FROM "05-Projects"
WHERE file.name = "README"
SORT file.mtime DESC
```

---

## 🛠️ Quick Actions

### 📝 Notes & Templates
- 📝 [[06-Templates/Daily Note Template|New Daily Note]]
- 📋 [[06-Templates/Project Note Template|New Project]]
- 🤝 [[06-Templates/Meeting Note Template|Meeting Notes]]
- 🐛 [[06-Templates/Bug Report|Report Bug]]

### 🤖 Forge v1.1 Actions
- 🚀 [[docs/templates/unified-suggestion-template-v1.1|New Suggestion Note]] (Templater)
- 📊 [[docs/dashboards/extended-roadmap-actions|View Roadmap]] (Dynamic Templater)
- 📈 [[docs/dashboards/v1.1-roadmap-queue|Roadmap Queue]] (Dataview)
- 📖 [[docs/FORGE_V1.1_QUICK_START|Quick Start Guide]]

---

## ⚡ Meta-Optimization

### 🚀 Platform Velocity Control

Control execution velocity, script complexity, and resource limits across the entire platform.

```bash
# Check optimization status
bun packages/cli/index.ts meta status

# Enable Singularity Mode (all optimizations)
bun packages/cli/index.ts meta singularity

# Enable specific optimization
bun packages/cli/index.ts meta enable MINIMAL

# View velocity report
bun packages/cli/index.ts meta velocity
```

### 📋 Optimization Rules

**6 Rules for Maximum Velocity:**

1. **[MINIMAL]** Templater Scripts - 1-3 core files, no complex loops (15-25s → <1.5s)
2. **[SCOPED]** JS Execution - Scoped to allowed modules, dev-only
3. **[CACHED]** Plugin Cache - 10s TTL for plugin groups
4. **[EXCLUDE]** File Exclusions - Block heavy files (*.excalidraw.js, etc.)
5. **[LIMIT]** Date.now() Rate Limit - Cap at 60 calls/min
6. **[PREVIEW]** Dynamic Preview - strictLineBreaks: false

### 💡 Performance Impact

| Metric           | Pre-Opt | Post-Opt | Improvement     |
| ---------------- | ------- | -------- | --------------- |
| CLI Startup      | 220ms   | 12ms     | **18x faster**  |
| Juice Calc       | 45ms    | 8ms      | **5.6x faster** |
| Settings Load    | 15ms    | 2ms      | **7.5x faster** |
| Memory Usage     | 180MB   | 45MB     | **4x less**     |
| Date.now() Calls | 340/min | 12/min   | **28x less**    |

**Status**: `🚀 Singularity Optimized` when all 6 rules are active.

---

## 🛠️ Developer

### 💻 Developer Resources
- [[04-Developer/README|📘 Developer Hub]] - Main developer entry point
- [[04-Developer/Notes/Developer|📝 Developer Notes]] - TMUX sessions, tooling status, MCPorter config
- [[04-Developer/Dashboard|📊 Developer Dashboard]] - Development metrics and status

### ⚙️ Configuration & Tools
- [[04-Developer/Configs/mcporter-reference|🔧 MCPorter Reference]] - MCP configuration guide
- [[04-Developer/Configs/environment-variables|🌍 Environment Variables]] - Environment setup
- [[04-Developer/Configs/obsidian-api-key-management|🔑 API Key Management]] - Security configuration
- [[04-Developer/Tools/README|🛠️ Developer Tools]] - Tool documentation and setup

### 📁 Workspaces
- [[04-Developer/Working/README|💼 Working Directory]] - Active development workspace
- [[04-Developer/Scraps/README|🗑️ Scraps]] - Temporary notes and experiments

---

## ⚡ CLI Tool

### 🚀 Quick Commands

```bash
# Check vault status
bun packages/cli/index.ts vault status

# Check connection & diagnostics
bun packages/cli/index.ts vault check

# Start platform
bun packages/cli/index.ts start

# View help
bun packages/cli/index.ts help
```

### 📋 Available Commands

**Vault Management:**
- `vault status` - Show detailed vault status
- `vault check` - Connection diagnostics
- `vault setup` - Setup API key
- `vault list` - List all vaults

**Git/GitHub:**
- `git status` - Show git status
- `git check` - Check git integration

**Settings:**
- `settings list` - Show all settings
- `settings get <path>` - Get setting value
- `settings validate` - Validate config

**Data Collection:**
- `collect [gameId] [sport] [type]` - Start collection
- `collector:test` - Test book adapters

**Help:**
- `help` - Show all commands
- `help <category>` - Category-specific help (e.g., `help vault`)

### 💡 Tips

- Use `--verbose` flag for detailed output
- Commands support smart suggestions on typos
- Run `vault check` if you encounter connection issues

---

## 📚 Resources

### 🤖 Forge Intelligence v1.1 Documentation
- **[[docs/FORGE_V1.1_QUICK_START|🚀 Quick Start]]** - How to view and use all v1.1 components
- **[[docs/FORGE_SUGGESTION_V1.1_UNIFIED|📖 Unified Specification]]** - Complete v1.1 spec (707 lines)
- **[[docs/FORGE_V1.1_INDEX|📑 Index]]** - Navigation guide to all files
- **[[docs/dashboards/extended-roadmap-actions|📋 Roadmap Actions]]** - Full roadmap with Templater
- **[[docs/dashboards/v1.1-roadmap-queue|📊 Roadmap Queue]]** - Dataview dashboard
- **[[docs/README|📚 Documentation Hub]]** - Complete docs directory index

**Key Features**:
- ✅ Templater dynamic roadmap generation
- ✅ Dataview tasks with overdue flags
- ✅ Phase 6 aligned to Nov 2025 sprint
- ✅ 85% auto-execution target by Jan 2026
- ✅ Ethical fields auto-audit via ML drift detection

### 📖 Reference Materials
- [[03-Reference/Guides|📘 Guides]] - How-to guides and tutorials
- [[03-Reference/Tools|🔧 Tools]] - Tool documentation and references
- [[03-Reference/TES/README|⚡ TES Protocol]] - Complete TES optimization documentation
- **[[docs/PROPERTIES_BY_CATEGORY|📋 Properties by Category]]** - Complete frontmatter properties reference (88 properties)

### 📝 Templates & Documentation
- [[06-Templates/00-Index|📋 Templates]] - Note templates and formats
- [[04-Developer/README|💻 Developer Docs]] - Development guides and references
- [[02-Dashboards/README|📊 Dashboards]] - Dashboard documentation

### 🔗 Quick Links
- [[01-Configuration/README|⚙️ Configuration]] - System configuration files
- [[05-Projects/README|🚀 Projects]] - Project documentation and workspaces
- [[00-Inbox/README|📥 Inbox]] - Inbox management and workflows

---

## 💡 Keyboard Shortcuts

| Action           | Mac     | Windows/Linux |
| ---------------- | ------- | ------------- |
| Refresh Dataview | `Cmd+R` | `Ctrl+R`      |
| Quick Open       | `Cmd+O` | `Ctrl+O`      |
| Graph View       | `Cmd+G` | `Ctrl+G`      |
| Command Palette  | `Cmd+P` | `Ctrl+P`      |

---

## 📊 Homepage Metadata

> **System information and quick stats**

### 🎯 Status Overview
- **Status**: `= this.status`
- **Priority**: `= this.priority`
- **Category**: `= this.category`
- **Assignee**: `= this.assignee`
- **Progress**: `= this.progress`%
- **Health Score**: `= this.health_score`%

### 📈 Vault Statistics
- **Total Files**: `= this.total_files`
- **Active Projects**: `= this.active_projects`
- **Recent Activity**: `= this.recent_activity`
- **Inbox Items**: `= this.inbox_items`
- **Vault ID**: `= this.vault_id`

### 🔗 Integration Status
- **Feed Integration**: `= choice(this.feed_integration, "✅ **Connected** - Fantasy402 Feed Active", "❌ **Disconnected** - Standalone Mode")`
- **Last Health Check**: `= this.last_health_check` (Forge: `= this.last_health_check_forge_date`)

### 📋 Project Links
`= choice(this.related_projects, "Related Projects: " + join(this.related_projects, ", "), "No related projects")`

### 🏷️ Tags
`= choice(this.tags, "Tags: " + join(this.tags, ", "), "No tags")`

---

**Created**: `= this.created` (Forge: `= this.created_forge_date`) | **Last Modified**: `= this.modified` (Forge: `= this.modified_forge_date`) | **Type**: `= this.type`

---

## 📚 Complete Frontmatter Properties Index

> **Complete reference of all authorized frontmatter properties**  
> All properties are validated against the registry and support meta tag classification

### 🎯 Quick Stats
- **Total Properties**: 88 (96 including standardized time properties)
- **Categories**: 15
- **Types**: 6 (string, number, boolean, array, date, object)
- **Meta Tags**: 8 classifications
- **Required Properties**: 6 (for dashboard type)
- **Standardized Time Properties**: 8 (forge_date, forge_time, system_time variants)

### 📋 Properties Reference

> **📖 Full Reference**: See **[[docs/PROPERTIES_BY_CATEGORY|Properties by Category]]** for complete documentation with descriptions, usage notes, and examples for all 88 properties.

**Property Slots System**: All files have property slots for all 88 properties. Empty values (`""`, `[]`, `{}`, `false`) indicate slots ready to be populated when needed. See [[docs/PROPERTY_SLOTS_TRACKING|Property Slots Tracking]] for details on the property slot system.

### 🏷️ Meta Tag Classifications

All properties are classified into 8 meta tag categories:

1. **[META: DOMAIN]** (25 properties) - Core identifiers, names, titles
2. **[META: DYNAMIC]** (27 properties) - Runtime values, network data
3. **[META: ACTIVE]** (10 properties) - Status flags, active states
4. **[META: CATEGORY]** (4 properties) - Classification, categorization
5. **[META: VERSION]** (20 properties) - Versioning, timestamps (includes standardized forge_time/system_time properties)
6. **[META: DESCRIPTION]** (4 properties) - Descriptions, documentation
7. **[META: TAGS]** (5 properties) - Tags, arrays, lists
8. **[META: RELATIVE]** (1 property) - Relative paths, references

### 📖 Usage Notes

- **Required Properties**: For `type: dashboard`, these 6 properties are required:
  - `id`, `path`, `status`, `category`, `version`, `name`
- **Enum Values**: Some properties have restricted enum values (e.g., `type`, `status`, `category`, `priority`, `severity`, `requestMethod`, `deviceType`)
- **Validation**: All properties can be validated via `/api/frontmatter-properties/validate`
- **Color Coding**: Each property has an associated hex color for visual identification
- **Type Safety**: Properties are strongly typed (string, number, boolean, array, date, object)

### 🔗 API Reference

- **Full Registry**: `GET /api/frontmatter-properties`
- **Stats Only**: `GET /api/frontmatter-properties/stats`
- **Single Property**: `GET /api/frontmatter-properties/:name`
- **Validate Value**: `POST /api/frontmatter-properties/validate`

---

*Refresh to see latest updates* 🔄
