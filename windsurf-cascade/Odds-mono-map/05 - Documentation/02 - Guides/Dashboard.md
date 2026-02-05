---
type: guide
title: Vault Dashboard
tags:
  - guide
  - documentation
  - dashboard
  - monitoring
created: 2025-11-18T13:40:00Z
updated: 2025-11-18T13:40:00Z
author: system
---






# 📊 Vault Dashboard

## Overview
> Automated monitoring and organization dashboard for the Odds Protocol knowledge base

## 📈 System overview

```dataview
TABLE WITHOUT ID
  file.link as "File",
  file.mtime as "Last Modified",
  file.size as "Size"
FROM ""
WHERE file.path != "07 - Archive" AND file.path != ".obsidian"
SORT file.mtime DESC
LIMIT 10
```

## 🗂 ️ organization status

### Recent files by category

#### 📅 Daily notes
```dataview
LIST
FROM "01 - Daily Notes"
SORT file.name DESC
LIMIT 5
```

#### 🏗 ️ architecture
```dataview
LIST
FROM "02 - Architecture"
SORT file.mtime DESC
LIMIT 5
```

#### 💻 Development
```dataview
LIST
FROM "03 - Development"
SORT file.mtime DESC
LIMIT 5
```

#### 📖 Documentation
```dataview
LIST
FROM "04 - Documentation"
SORT file.mtime DESC
LIMIT 5
```

## 🏷 ️ content analysis

### Files by type
```dataview
TABLE WITHOUT ID
  length(filter(rows, (r) => contains(r.file.path, "01 - Daily Notes"))) as "Daily Notes",
  length(filter(rows, (r) => contains(r.file.path, "02 - Architecture"))) as "Architecture",
  length(filter(rows, (r) => contains(r.file.path, "03 - Development"))) as "Development",
  length(filter(rows, (r) => contains(r.file.path, "04 - Documentation"))) as "Documentation",
  length(filter(rows, (r) => contains(r.file.path, "05 - Assets"))) as "Assets",
  length(filter(rows, (r) => contains(r.file.path, "06 - Templates"))) as "Templates"
FROM ""
WHERE file.path != "07 - Archive" AND file.path != ".obsidian"
```

### Tag distribution
```dataview
TABLE WITHOUT ID
  tag as "Tag",
  length(rows) as "Count"
FROM ""
FLATTEN file.tags as tag
WHERE tag != "" AND tag != "#daily-note"
GROUP BY tag
SORT length(rows) DESC
```

## ⚠ ️ issues & warnings

### Files needing attention
```dataview
LIST
FROM ""
WHERE 
  (file.name = "Untitled" OR file.name = "New Note") OR
  (file.size < 100 AND file.path != "06 - Templates") OR
  (contains(file.path, "07 - Archive") = false AND file.path = "")
```

### Orphaned files (no backlinks)
```dataview
LIST
FROM ""
WHERE file.inlinks.length = 0 AND file.path != "01 - Daily Notes" AND file.path != "06 - Templates" AND file.path != "🏠 Home.md"
SORT file.mtime DESC
LIMIT 10
```

## 🎯 Quick actions

### Create new content
- [[🏠 Home]] - Return to main landing page
- [[01 - Daily Notes/2025-11-18]] - Today's daily note
- [[02 - Architecture/System Design/Bookmaker Registry System]] - System design example
- [[03 - Development/Code Snippets/Registry Integration Examples]] - Code example
- [[04 - Documentation/Guides/Getting Started]] - Getting started guide

### Maintenance tasks
- [ ] Run organization script: `bun scripts/vault-organizer.js`
- [ ] Run validation script: `bun scripts/vault-validator.js`
- [ ] Review orphaned files and add connections
- [ ] Update templates if needed
- [ ] Archive old or completed content

## 📊 Statistics

```dataview
TABLE WITHOUT ID
  "Total Files" as "Metric",
  length(rows) as "Value"
FROM ""
WHERE file.path != "07 - Archive" AND file.path != ".obsidian"

```

```dataview
TABLE WITHOUT ID
  "Files Modified This Week" as "Metric",
  length(filter(rows, (r) => date(today) - r.file.mtime <= dur(7 days))) as "Value"
FROM ""
WHERE file.path != "07 - Archive" AND file.path != ".obsidian"
```

## 🔗 Key connections

### Most connected files
```dataview
TABLE WITHOUT ID
  file.link as "File",
  length(file.inlinks) + length(file.outlinks) as "Total Links"
FROM ""
WHERE file.path != "07 - Archive" AND file.path != ".obsidian"
SORT length(file.inlinks) + length(file.outlinks) DESC
LIMIT 10
```

### Recent activity
```dataview
LIST
FROM ""
WHERE file.mtime >= date(today) - dur(3 days)
SORT file.mtime DESC
```

---

> **💡 Tip**: This dashboard automatically updates when you open it. Use the data to maintain vault organization and identify areas that need attention.

**Last Updated**: `2025-11-18 13:17`

## 🏷️ Tags
`#dashboard` `#monitoring` `#organization` `#automation`
