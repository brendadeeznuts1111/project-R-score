---
type: work-dashboard
title: Work Dashboard
tags: [system/dashboard, work]
created: {{date:YYYY-MM-DD HH:mm:ss}}
updated: {{date:YYYY-MM-DD HH:mm:ss}}
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
	project AS "Project",
	estimated AS "Est. Time"
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
	deadline AS "Deadline",
	priority AS "Priority"
FROM "01 - Projects"
WHERE 
	contains(tags, "work") AND
	status != "completed" AND
	status != "archived"
SORT deadline ASC, priority DESC
```

---

## ⏰ Time-Sensitive Tasks

```dataview
TASK WITHOUT ID
	text AS "Urgent Task",
	due AS "Due",
	priority AS "Priority"
FROM ""
WHERE 
	contains(tags, "work") AND
	!completed AND
	due <= date(today) + dur(1 day)
SORT due ASC, priority DESC
```

---

## 📊 Work Metrics

```dataview
TABLE WITHOUT ID
	"Completed Today" AS "Metric",
	length(filter(this.file.tasks, (t) => t.completed AND contains(t.text, "work") AND date(format(dateCompleted)) = date(today))) AS "Count"
FROM this.file

TABLE WITHOUT ID
	"Active Projects" AS "Metric", 
	length(filter(this.file.links, (l) => contains(l.path, "01 - Projects"))) AS "Count"
FROM this.file
```

---

## 🔗 Work Quick Links

- **[[01 - Projects/Work-Projects]]**: All Work Projects
- **[[Templates/Work-Meeting]]**: Meeting Notes
- **[[Templates/Project-Review]]**: Project Review
- **[[00 - Dashboard]]**: Main Dashboard

---

## 📅 Work Schedule

### Morning (09:00-10:00)
- [ ] Review today's work priorities
- [ ] Check urgent deadlines
- [ ] Plan work sessions

### Midday (12:00-13:00)
- [ ] Review morning progress
- [ ] Adjust afternoon priorities

### End of Day (16:30-17:00)
- [ ] Complete daily work log
- [ ] Plan tomorrow's work
- [ ] Update project status

---

*Work dashboard active during business hours • Auto-sync with project files*
