---
type: work-dashboard
title: Work Dashboard
tags: [system/dashboard, work]
created: 2024-01-15 09:00:00
updated: 2024-01-15 09:00:00
author: system
version: 1.0
---

# 💼 Work Dashboard

**{{date:YYYY-MM-DD}}** | **Work Hours: 09:00-17:00**

---

## 🎯 Today's Work Focus

```dataview
TABLE WITHOUT ID
	file.link AS "Task",
	priority AS "Priority",
	project AS "Project"
FROM ""
WHERE 
	(contains(tags, "work") OR contains(tags, "project")) AND
	!completed AND
	(due <= date(today) OR contains(tags, "today"))
SORT priority DESC, due ASC
LIMIT 5
```

---

## 📋 Active Work Projects

```dataview
TABLE WITHOUT ID
	file.link AS "Project",
	status AS "Status",
	deadline AS "Deadline"
FROM "01 - Projects"
WHERE 
	contains(tags, "work") AND
	status != "completed"
SORT deadline ASC
```

---

## ⏰ Urgent Tasks

```dataview
TASK WITHOUT ID
	text AS "Urgent Task",
	due AS "Due"
FROM ""
WHERE 
	contains(tags, "work") AND
	!completed AND
	due <= date(today) + dur(1 day)
SORT due ASC
```

---

## 🔗 Work Quick Links

- **[[01 - Projects/Work-Projects]]**: All Work Projects
- **[[Templates/Work-Meeting]]**: Meeting Notes
- **[[00 - Dashboard]]**: Main Dashboard

---

*Work dashboard active during business hours • Focus on professional tasks*
