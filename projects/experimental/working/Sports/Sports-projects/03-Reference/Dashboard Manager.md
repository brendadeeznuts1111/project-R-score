---
title: Untitled
type: dashboard
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-14
category: core
id: dashboard-manager
path: $env:DASH_ROOT/03-Reference/Dashboard Manager.md
name: Untitled
description: Documentation for Dashboard Manager
acceptEncoding: ""
acceptLanguage: ""
author: Sports Analytics Team
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
tags: []
usage: ""
user_agent: ""
userAgentRaw: ""
VIZ-06: []
xff: []
xForwardedFor: []
---

# Dashboard Manager

## 📋 Overview

**DashboardManager** is the central system for managing all dashboards in the application. It loads configuration from `config/dashboards.json` and provides a unified interface for dashboard operations.

**Location**: `src/dashboard-manager.ts`

## 🎯 Key Features

- **Configuration Management** - Loads and validates `config/dashboards.json`
- **Dashboard Registry** - Tracks all 21+ dashboards
- **Dynamic Routing** - Maps dashboard paths to templates
- **Category Organization** - Groups dashboards by category
- **Settings Integration** - Controlled by Settings System (highest hierarchy)

## 🔌 Integration Points

### 1. API Server (`server/api-server.ts`)
- Uses `dashboardManager` singleton
- Routes dashboard requests via `serveDashboard()`
- Serves dashboard hub at `/` (root)

### 2. Dashboard Hub (`packages/dashboard/hub-integration.ts`)
- Settings-controlled hub generation
- Filters dashboards by enabled categories
- Orders dashboards by settings configuration

### 3. Settings System (`packages/settings/`)
- Controls hub behavior via `infrastructure.dashboardHub`
- Enables/disables categories
- Sets display order

## 📊 Dashboard Registry

All dashboards are registered in `config/dashboards.json`:

- **21+ dashboards** across 6 categories
- **Categories**: core, monitoring, sports, betting, tes, other
- **Status tracking**: active, production, enhanced, featured

## 🛠️ API Methods

```typescript
class DashboardManager {
  getAllDashboards(): DashboardConfig[]
  getDashboard(id: string): DashboardConfig | null
  getDashboardByPath(path: string): DashboardConfig | null
  getDashboardsByCategory(category: string): DashboardConfig[]
  searchDashboards(query: string): DashboardConfig[]
  serveDashboard(id: string): string | null
  reloadConfiguration(): void
  validateConfiguration(): boolean
}
```

## 🎨 Settings Control

The Dashboard Manager is controlled by the Settings System:

```typescript
infrastructure.dashboardHub.enabled          // Enable/disable hub
infrastructure.dashboardHub.port            // Hub port (default: 3000)
infrastructure.dashboardHub.showSettingsMonitor  // Show settings monitor
infrastructure.dashboardHub.categories.enabled    // Which categories to show
infrastructure.dashboardHub.categories.order     // Display order
```

## 🔗 Related Files

- `config/dashboards.json` - Dashboard registry
- `src/dashboard-manager.ts` - Manager implementation
- `server/api-server.ts` - API server integration
- `packages/dashboard/hub-integration.ts` - Settings-controlled hub
- `packages/settings/defaults.ts` - Hub settings defaults

## 🏷️ Tags

[[dashboard-manager]] [[dashboard]] [[configuration]] [[settings]] [[hub]]
