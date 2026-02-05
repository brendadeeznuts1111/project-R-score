---
type: personal-dashboard
title: Personal Dashboard
tags: [system/dashboard, personal]
created: {{date:YYYY-MM-DD HH:mm:ss}}
updated: {{date:YYYY-MM-DD HH:mm:ss}}
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
	progress AS "Progress",
	next AS "Next Step"
FROM "03 - Knowledge"
WHERE 
	contains(tags, "learning") OR
	contains(tags, "growth")
SORT priority DESC
```

---

## 🏃‍♂️ Health & Wellness

```dataview
TASK WITHOUT ID
	text AS "Health Activity",
	area AS "Area"
FROM ""
WHERE 
	(contains(tags, "health") OR contains(tags, "wellness") OR contains(tags, "fitness")) AND
	!completed
SORT priority DESC
LIMIT 5
```

---

## 🎨 Creative Projects

```dataview
TABLE WITHOUT ID
	file.link AS "Project",
	type AS "Type",
	status AS "Status",
	inspiration AS "Inspiration"
FROM ""
WHERE 
	contains(tags, "creative") AND
	status != "completed"
SORT priority DESC
```

---

## 📖 Reading List

```dataview
TABLE WITHOUT ID
	file.link AS "Book",
	author AS "Author",
	status AS "Status",
	rating AS "Rating"
FROM "03 - Knowledge/Reading"
WHERE 
	status != "completed"
SORT priority DESC
```

---

## 🎊 Personal Achievements

```dataview
TASK WITHOUT ID
	text AS "Achievement",
	completed AS "Completed"
FROM ""
WHERE 
	completed AND 
	(contains(tags, "personal") OR contains(tags, "goal")) AND
	date(format(dateCompleted)) >= date(today) - dur(7 days)
SORT completed DESC
LIMIT 5
```

---

## 🔗 Personal Quick Links

- **[[03 - Knowledge/Personal-Growth]]**: Personal Development
- **[[Templates/Reflection]]**: Weekly Reflection
- **[[Templates/Habit-Tracker]]**: Habit Tracking
- **[[00 - Dashboard]]**: Main Dashboard

---

## 🌅 Weekend Rituals

### Saturday
- [ ] Review weekly achievements
- [ ] Plan learning activities
- [ ] Creative time allocation

### Sunday
- [ ] Personal reflection
- [ ] Set upcoming week intentions
- [ ] Relaxation & recovery planning

---

## 📈 Personal Metrics

```dataview
TABLE WITHOUT ID
	"Goals Completed" AS "Metric",
	length(filter(this.file.tasks, (t) => t.completed AND (contains(t.text, "goal") OR contains(t.tags, "personal")) AND date(format(dateCompleted)) = date(today))) AS "Count"
FROM this.file

TABLE WITHOUT ID
	"Learning Activities" AS "Metric",
	length(filter(this.file.links, (l) => contains(l.path, "03 - Knowledge"))) AS "Count"
FROM this.file
```

---

*Personal dashboard optimized for weekends and personal growth time*
