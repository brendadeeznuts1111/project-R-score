---
type: mobile-dashboard
title: Mobile Dashboard
tags: [system/dashboard, mobile]
created: {{date:YYYY-MM-DD HH:mm:ss}}
updated: {{date:YYYY-MM-DD HH:mm:ss}}
author: system
version: 1.0
---

# 📱 Mobile Dashboard

**{{date:YYYY-MM-DD}}** | **{{date:HH:mm}}**

---

## 🎯 Today's Top 3

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
LIMIT 3
```

---

## 📅 Quick Tasks

```dataview
TASK WITHOUT ID
	text AS "Task"
FROM ""
WHERE 
	!completed AND 
	due <= date(today) + dur(3 days)
SORT due ASC, priority DESC
LIMIT 5
```

---

## ✅ Recent Wins

```dataview
TASK WITHOUT ID
	text AS "Completed"
FROM ""
WHERE 
	completed AND 
	date(format(dateCompleted)) = date(today)
SORT completed DESC
LIMIT 3
```

---

## 🔗 Quick Access

- **[[00 - Dashboard]]**: Full Dashboard
- **[[Templates/Daily-Note]]**: Today's Note
- **[[01 - Projects/Project-Index]]**: Projects

---

*Optimized for mobile viewing • Auto-refresh enabled*
