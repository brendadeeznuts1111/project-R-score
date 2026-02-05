---
type: weekly-review
title: Weekly Review
tags: [system/review, weekly]
created: {{date:YYYY-MM-DD HH:mm:ss}}
updated: {{date:YYYY-MM-DD HH:mm:ss}}
author: system
version: 1.0
week: {{date:YYYY-[W]WW}}
---

# 📊 Weekly Review

**Week of {{date:YYYY-MM-DD}}** | **Week {{date:YYYY-[W]WW}}**

---

## 🎯 This Week's Goals

### Completed Goals
- [ ] 

### In Progress Goals  
- [ ] 

### Deferred Goals
- [ ] 

---

## 📈 Performance Metrics

```dataview
TABLE WITHOUT ID
	"Tasks Completed" AS "Metric",
	length(filter(this.file.tasks, (t) => t.completed AND date(format(dateCompleted)) >= date(today) - dur(7 days))) AS "Count"
FROM this.file

TABLE WITHOUT ID
	"Notes Created" AS "Metric",
	length(filter(this.file.links, (l) => file.ctime >= date(today) - dur(7 days))) AS "Count"  
FROM this.file

TABLE WITHOUT ID
	"Projects Updated" AS "Metric",
	length(filter(this.file.links, (l) => contains(l.path, "01 - Projects") AND file.mday >= date(today) - dur(7 days))) AS "Count"
FROM this.file
```

---

## 🔄 Project Progress

```dataview
TABLE WITHOUT ID
	file.link AS "Project",
	status AS "Status",
	last_updated AS "Last Updated",
	next_action AS "Next Action"
FROM "01 - Projects"
WHERE 
	file.mday >= date(today) - dur(7 days) OR
	status = "in-progress"
SORT status, last_updated DESC
```

---

## ✅ Accomplishments This Week

```dataview
TASK WITHOUT ID
	text AS "Accomplishment",
	completed AS "Completed",
	file.link AS "Area"
FROM ""
WHERE 
	completed AND 
	date(format(dateCompleted)) >= date(today) - dur(7 days)
SORT completed DESC
```

---

## 📚 Knowledge Gained

```dataview
TABLE WITHOUT ID
	file.link AS "Learning",
	category AS "Category",
	file.ctime AS "Added",
	tags AS "Tags"
FROM "03 - Knowledge"
WHERE 
	file.ctime >= date(today) - dur(7 days)
SORT file.ctime DESC
```

---

## 🎯 Areas of Focus Review

```dataview
LIST WITHOUT ID
	file.link AS "Area"
FROM "02 - Areas"
WHERE 
	file.mday >= date(today) - dur(7 days)
SORT file.mday DESC
```

---

## 🔍 Challenges & Learnings

### Challenges Faced
1. 
2. 
3. 

### Key Learnings
1. 
2. 
3. 

### Solutions Implemented
1. 
2. 
3. 

---

## 📋 Next Week's Planning

### Top 3 Priorities
1. 
2. 
3. 

### Focus Areas
- **Work**: 
- **Personal**: 
- **Learning**: 

### Tasks to Delegate/Outsource
- [ ] 

### Tasks to Schedule
- [ ] 

---

## 🎊 Celebrations

### Wins This Week
- 

### Personal Growth
- 

### Team/Relationship Achievements
- 

---

## 🔄 System Improvements

### What Worked Well
- 

### What Needs Improvement
- 

### Process Changes to Implement
- [ ] 

### Tool/Workflow Updates
- [ ] 

---

## 📊 Weekly Score

| Category | Score (1-10) | Notes |
|----------|--------------|-------|
| **Productivity** | | |
| **Learning** | | |
| **Health** | | |
| **Relationships** | | |
| **Projects** | | |
| **Overall** | | |

---

## 🎯 Next Week's Intentions

### Professional Intentions
- 

### Personal Intentions  
- 

### Learning Intentions
- 

---

> **Review Completed**: {{date:YYYY-MM-DD HH:mm:ss}}
> **Next Review**: {{date:YYYY-MM-DD + dur(7 days) HH:mm:ss}}
> **Template Version**: 1.0
> 
> ---
> 
> *This weekly review helps maintain consistency and track progress toward your goals.*

---

## 🔗 Quick Links

- **[[00 - Dashboard]]**: Main Dashboard
- **[[Templates/Goal-Setting]]**: Goal Setting Template
- **[[Templates/Monthly-Review]]**: Monthly Review
- **[[01 - Projects/Project-Index]]**: All Projects
