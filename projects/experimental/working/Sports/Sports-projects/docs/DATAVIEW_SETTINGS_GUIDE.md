---
title: Dataview Settings Configuration Guide
type:
  - documentation
  - configuration
status: active
version: 1.0.0
created: 2025-01-XX
updated: 2025-01-XX
modified: 2025-11-14
category: documentation
description: Complete guide for configuring Dataview plugin settings for optimal performance
author: bun-platform
deprecated: false
replaces: ""
tags:
  - dataview
  - configuration
  - settings
  - optimization
usage: Reference for setting up Dataview plugin correctly
---

# ⚙️ Dataview Settings Configuration Guide

> **Optimal Settings**  
> *Based on TES OPT.7 Optimizations*

---

## ✅ Required Settings

### Core Settings

**Location**: `.obsidian/plugins/dataview/data.json`

**Critical Settings**:
```json
{
  "refreshEnabled": true,
  "refreshInterval": 2500,
  "enableInlineDataview": true,
  "enableDataviewJs": true,
  "enableInlineDataviewJs": true,
  "inlineQueriesInCodeblocks": true,
  "enableDataviewBlockQueries": true,
  "enableDataviewInlineQueries": true,
  "warnOnEmptyResult": false
}
```

---

## 🔧 Settings Explained

### Performance Settings

- **`refreshEnabled: true`** - Auto-refresh queries when files change
- **`refreshInterval: 2500`** - Refresh every 2.5 seconds (optimal balance)
- **`warnOnEmptyResult: false`** - Don't show warnings for empty queries (cleaner output)

### Query Type Settings

- **`enableInlineDataview: true`** - Enable inline `=` queries
- **`enableDataviewJs: true`** - Enable JavaScript queries (`dataviewjs` blocks)
- **`enableInlineDataviewJs: true`** - Enable inline JS queries (`$=` prefix)
- **`inlineQueriesInCodeblocks: true`** - Allow queries in code blocks

### Block Query Settings

- **`enableDataviewBlockQueries: true`** - Enable `dataview` code blocks
- **`enableDataviewInlineQueries: true`** - Enable inline queries

---

## ✅ Verification Checklist

- [ ] Dataview plugin enabled in Community Plugins
- [ ] `refreshEnabled: true`
- [ ] `enableDataviewJs: true`
- [ ] `enableInlineDataview: true`
- [ ] `inlineQueriesInCodeblocks: true`
- [ ] Restart Obsidian after changes

---

## 🚀 Quick Test Query

Add this to any note to test:

```dataview
LIST
FROM ""
LIMIT 5
```

If this shows 5 files, Dataview is working correctly!

---

**Last Updated**: 2025-01-XX  
**Settings Version**: 1.0.0

