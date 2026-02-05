---
type: project-index
title: Project Index
tags: [system/index, projects]
created: 2024-01-15 09:00:00
updated: 2024-01-15 09:00:00
author: system
version: 1.0
---

# 📋 Project Index

**All projects in one place** | **Last Updated**: {{date:YYYY-MM-DD HH:mm:ss}}

---

## 🎯 Active Projects

```dataview
TABLE WITHOUT ID
	file.link AS "Project",
	status AS "Status",
	priority AS "Priority",
	deadline AS "Deadline",
	tags AS "Tags"
FROM "01 - Projects"
WHERE 
	status != "completed" AND
	status != "archived" AND
	!contains(file.path, "Project-Index")
SORT 
	priority DESC,
	deadline ASC NULLS LAST
```

---

## 📊 Project Status Overview

```dataview
TABLE WITHOUT ID
	status AS "Status",
	length(rows) AS "Count"
FROM "01 - Projects"
WHERE !contains(file.path, "Project-Index")
GROUP BY status
```

---

## ⏰ Upcoming Deadlines

```dataview
TABLE WITHOUT ID
	file.link AS "Project",
	deadline AS "Deadline",
	days_left AS "Days Left",
	priority AS "Priority"
FROM "01 - Projects"
WHERE 
	deadline AND
	deadline >= date(today) AND
	status != "completed"
SORT deadline ASC
LIMIT 10
```

---

## 🎊 Recently Completed

```dataview
TABLE WITHOUT ID
	file.link AS "Project",
	completed_date AS "Completed",
	tags AS "Tags"
FROM "01 - Projects"
WHERE 
	status = "completed" AND
	completed_date >= date(today) - dur(30 days)
SORT completed_date DESC
```

---

## 📂 Project Categories

```dataview
LIST WITHOUT ID
	file.link AS "Project"
FROM "01 - Projects"
WHERE 
	contains(tags, "work") AND
	status != "completed"
SORT file.name ASC
```

```dataview
LIST WITHOUT ID
	file.link AS "Project"
FROM "01 - Projects"
WHERE 
	contains(tags, "personal") AND
	status != "completed"
SORT file.name ASC
```

---

## 🔗 Quick Actions

- **[[Templates/Project-Template]]**: Create New Project
- **[[Templates/Project-Review]]**: Project Review
- **[[00 - Dashboard]]**: Main Dashboard
- **[[Templates/Weekly-Review]]**: Weekly Review

---

## 📈 Project Metrics

```dataview
TABLE WITHOUT ID
	"Total Projects" AS "Metric",
	length(filter(this.file.links, (l) => contains(l.path, "01 - Projects"))) AS "Count"
FROM this.file

TABLE WITHOUT ID
	"Active Projects" AS "Metric",
	length(filter(this.file.links, (l) => contains(l.path, "01 - Projects") AND !contains(l.tags, "completed"))) AS "Count"
FROM this.file
```

---

> **Project Management System**: Active
> **Template Version**: 1.0
> 
> ---
> 
> *Use this index to track all projects across your vault.*

---

## 🎯 Project Quick Start

### Starting a New Project
1. Copy **[[Templates/Project-Template]]**
2. Fill in project details
3. Link from this index
4. Set up tasks and milestones

### Project Review Process
1. Weekly status updates
2. Monthly milestone reviews
3. Quarterly strategic alignment
4. Annual project portfolio review
