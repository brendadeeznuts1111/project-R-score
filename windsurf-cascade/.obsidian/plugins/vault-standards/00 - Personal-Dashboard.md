---
type: personal-dashboard
title: Personal Dashboard
tags: [system/dashboard, personal]
created: 2024-01-15 09:00:00
updated: 2024-01-15 09:00:00
author: system
version: 1.0
---

# 🌟 Personal Dashboard

**{{date:YYYY-MM-DD}}** | **Weekend Mode**

---

## 🎯 Personal Goals Today

```dataview
TABLE WITHOUT ID
	file.link AS "Goal",
	area AS "Area",
	priority AS "Priority"
FROM ""
WHERE 
	(contains(tags, "personal") OR contains(tags, "goal")) AND
	!completed AND
	!contains(tags, "work")
SORT priority DESC
LIMIT 5
```

---

## 📚 Learning & Growth

```dataview
TABLE WITHOUT ID
	file.link AS "Learning",
	category AS "Category",
	progress AS "Progress"
FROM "03 - Knowledge"
WHERE 
	contains(tags, "learning") OR
	contains(tags, "growth")
SORT priority DESC
```

---

## 🎨 Creative Projects

```dataview
TABLE WITHOUT ID
	file.link AS "Project",
	type AS "Type",
	status AS "Status"
FROM ""
WHERE 
	contains(tags, "creative") AND
	status != "completed"
SORT priority DESC
```

---

## 🔗 Personal Quick Links

- **[[03 - Knowledge/Personal-Growth]]**: Personal Development
- **[[Templates/Reflection]]**: Weekly Reflection
- **[[00 - Dashboard]]**: Main Dashboard

---

*Personal dashboard optimized for weekends and personal growth time*
