---
type: dashboard
title: Main Dashboard
tags: [system/dashboard]
created: 2024-01-15 09:00:00
updated: 2024-01-15 09:00:00
author: system
version: 1.0
---

# 🎯 Main Dashboard

**Welcome to your enhanced vault dashboard!**

> This dashboard will be automatically populated with your actual data once the Homepage plugin is properly configured.

---

## 🚀 Quick Start

1. ✅ Homepage plugin installed
2. ⏳ Configuration imported
3. ⏳ Templates copied to vault
4. ⏳ Dashboard activated

---

## 📊 Current Status

```dataview
TABLE WITHOUT ID
	"Dashboard Status" AS "System",
	"Active" AS "Status"
FROM this.file
WHERE file.name = this.file.name
```

---

## 🎯 Today's Focus

```dataview
TABLE WITHOUT ID
	file.link AS "Task",
	priority AS "Priority"
FROM ""
WHERE 
	contains(tags, "today") OR 
	(due <= date(today) AND due >= date(today) AND !completed)
WHERE !completed
SORT priority DESC
LIMIT 5
```

---

## 📅 Upcoming Tasks

```dataview
TABLE WITHOUT ID
	file.link AS "Task",
	due AS "Due Date",
	tags AS "Tags"
FROM ""
WHERE 
	!completed AND 
	due <= date(today) + dur(7 days)
SORT due ASC
LIMIT 10
```

---

## 🔄 Recent Activity

```dataview
TABLE WITHOUT ID
	file.link AS "Note",
	file.mday AS "Modified",
	tags AS "Tags"
FROM ""
WHERE 
	file.name != this.file.name AND
	!contains(file.path, "Templates")
SORT file.mtime DESC
LIMIT 5
```

---

## 🔗 Quick Access

- **[[01 - Projects/Project-Index]]**: All Projects
- **[[02 - Areas]]**: Areas of Responsibility  
- **[[03 - Knowledge]]**: Knowledge Base
- **[[Templates/Weekly-Review]]**: Weekly Review

---

## 🎊 Dashboard Commands

Use the command palette (**Ctrl/Cmd + P**) to access:
- `Homepage: Open Main Homepage`
- `Homepage: Open Daily Dashboard`
- `Homepage: Open Weekly Review`
- `Homepage: Open Project Overview`

---

> **Last Updated**: {{date:YYYY-MM-DD HH:mm:ss}}
> **Template Version**: 1.0
> 
> ---
> 
> *This dashboard is part of your enhanced vault standards system.*

---

## 📈 System Information

- **Plugin Version**: Homepage by deathau
- **Configuration Version**: 4
- **Template System**: Active
- **Auto-refresh**: Enabled (5 minutes)

---

*Configure your vault structure and this dashboard will automatically populate with your data.*
