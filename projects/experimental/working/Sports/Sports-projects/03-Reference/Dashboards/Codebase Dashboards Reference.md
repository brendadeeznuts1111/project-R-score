---
title: Codebase Dashboards Reference
type:
  - documentation
  - reference
  - dashboard
status: active
version: 1.0.0
created: 2025-01-XX
updated: 2025-01-XX
modified: 2025-11-14
category: reference
description: Detailed reference for codebase dashboards in kimi2/feed repository
author: bun-platform
canvas: []
deprecated: false
feed_integration: false
replaces: ""
tags:
  - dashboard
  - codebase
  - reference
  - sports
  - monitoring
  - integration
usage: Technical reference for dashboard development and integration
VIZ-06: []
---

# 🔧 Codebase Dashboards Reference

> **Technical reference for dashboard implementations**  
> *Location: `/Users/nolarose/Documents/github/Repos/kimi2/feed/dashboards/`*

## 📁 Directory Structure

```text
dashboards/
├── core/                    # Core system dashboards
│   ├── demo-template-dashboard.html
│   └── version-demo.html
├── monitoring/              # Monitoring dashboards
│   └── server-metrics.html
├── sports/                  # Sports analytics dashboards
│   ├── src/                # ✅ Active: TypeScript source (v2.1)
│   │   ├── index.ts        # Main entry point
│   │   ├── dashboard.ts    # Core dashboard class
│   │   ├── components.ts   # UI components
│   │   ├── types.ts        # TypeScript definitions
│   │   └── styles.css      # Consolidated styles
│   ├── bun.config.ts       # ✅ Active: Simplified config
│   ├── nowgoal-dashboard-simplified.html  # ✅ Production
│   ├── js/modules/         # ⚠️ Legacy: JavaScript (v2.0)
│   ├── bun.config.js       # ⚠️ Legacy: Complex config
│   └── [other HTML files]  # Various versions
└── README.md               # Dashboard documentation
```

---

## 🎯 Sports Dashboard (v2.1 - Active)

### Architecture

**TypeScript-based, production-ready implementation**

#### Core Files

- **`src/index.ts`**: Main entry point, initializes dashboard
- **`src/dashboard.ts`**: Core dashboard class with state management
- **`src/components.ts`**: Reusable UI components
- **`src/types.ts`**: TypeScript type definitions
- **`src/styles.css`**: Consolidated CSS styles

#### Configuration

- **`bun.config.ts`**: Simplified Bun configuration
- **`nowgoal-dashboard-simplified.html`**: Production HTML template

### Usage

```bash
# Run dashboard
cd dashboards/sports
bun run src/index.ts

# Build for production
bun build src/index.ts --outdir dist

# Serve HTML directly
bun --serve nowgoal-dashboard-simplified.html
```

### Features

- ✅ TypeScript for type safety
- ✅ Simplified architecture
- ✅ Better performance
- ✅ Modular components
- ✅ Consolidated styles

---

## 📊 Dashboard Categories

### Core Dashboards

**Location**: `dashboards/core/`

- **Demo Template**: Template demonstration
- **Version Demo**: Version tracking demo

### Monitoring Dashboards

**Location**: `dashboards/monitoring/`

- **Server Metrics**: Real-time performance monitoring

### Sports Dashboards

**Location**: `dashboards/sports/`

#### Active Versions

- **v2.1 Simplified**: TypeScript-based (recommended)
- **NBA Breakdown**: Game analysis dashboard
- **NBA Models Viewer**: ML model visualization
- **Markets Breakdown**: Market analysis

#### Legacy Versions

- **v2.0 Bun-Powered**: JavaScript-based (deprecated)
- **Original**: Initial implementation (deprecated)

---

## 🔗 Integration with System

### Dashboard Registration

Dashboards are registered in `config/dashboards.json`:

```json
{
  "dashboards": [
    {
      "id": "dashboard-id",
      "name": "Dashboard Name",
      "path": "/dashboard-path",
      "template": "./src/templates/dashboards/category/template.html",
      "category": "core|monitoring|sports",
      "version": "1.0.0",
      "status": "active|production|deprecated"
    }
  ]
}
```

### Template System

- **Templates**: Located in `src/templates/dashboards/`
- **Standalone**: Located in `dashboards/` (for development/testing)
- **Production**: Served via dashboard manager from templates

---

## 📝 Development Workflow

1. **Develop** in `dashboards/sports/src/` (TypeScript)
2. **Test** using standalone HTML files
3. **Build** for production: `bun build`
4. **Register** in `config/dashboards.json`
5. **Deploy** via dashboard manager
6. **Document** in vault `02-Dashboards/`

---

## 🔄 Version History

### v2.1 Simplified (Current)

- TypeScript implementation
- Simplified architecture
- Better performance
- Production-ready

### v2.0 Bun-Powered (Legacy)

- JavaScript modules
- More complex architecture
- Deprecated in favor of v2.1

### Original (Legacy)

- Initial implementation
- Basic HTML/JS
- Deprecated

---

## 📚 Related

- [[../../02-Dashboards/Dashboard Registry|Dashboard Registry]] - Complete dashboard inventory
- [[../../02-Dashboards/Vault Overview|Vault Overview]] - Vault dashboards
- [[../../05-Projects/feed-project|Feed Project]] - Main project documentation

---

**Location**: `/Users/nolarose/Documents/github/Repos/kimi2/feed/dashboards/`  
**Last Updated**: 2025-01-XX

