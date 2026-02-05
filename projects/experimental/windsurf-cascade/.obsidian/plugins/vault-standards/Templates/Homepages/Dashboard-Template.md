---
type: dashboard
title: Daily Dashboard
tags: [system/dashboard]
created: {{date:YYYY-MM-DD HH:mm:ss}}
updated: {{date:YYYY-MM-DD HH:mm:ss}}
author: system
version: 1.0
---

# {{date:YYYY-MM-DD}} Dashboard

> **System Status**: Active | **Last Updated**: {{date:HH:mm}}
> 
> ---
> 
> ## 🎯 Today's Focus
> 
> ```dataview
> TABLE WITHOUT ID
> 	file.link AS "Task",
> 	priority AS "Priority",
> 	due AS "Due",
> 	status AS "Status"
> FROM ""
> WHERE 
> 	contains(tags, "today") OR 
> 	(due <= date(today) AND due >= date(today) AND !completed)
> WHERE !completed
> SORT priority DESC, due ASC
> LIMIT 5
> ```
> 
> - [ ] **Priority 1**: 
> - [ ] **Priority 2**: 
> - [ ] **Priority 3**: 
> 
> ---
> 
> ## 📅 Upcoming Tasks
> 
> ```dataview
> TABLE WITHOUT ID
> 	file.link AS "Task",
> 	due AS "Due Date",
> 	priority AS "Priority",
> 	tags AS "Tags"
> FROM "02 - Areas"
> WHERE 
> 	!completed AND 
> 	due <= date(today) + dur(7 days) AND
> 	due >= date(today)
> SORT due ASC, priority DESC
> ```
> 
> ---
> 
> ## 🔄 Recent Activity
> 
> ```dataview
> TABLE WITHOUT ID
> 	file.link AS "Note",
> 	file.mday AS "Modified",
> 	tags AS "Tags",
> 	file.size AS "Size"
> FROM ""
> WHERE 
> 	file.name != this.file.name AND
> 	!contains(file.path, "Templates") AND
> 	!contains(file.path, ".obsidian")
> SORT file.mtime DESC
> LIMIT 10
> ```
> 
> ---
> 
> ## ✅ Completed Today
> 
> ```dataview
> TASK WITHOUT ID
> 	text AS "Completed Task",
> 	completed AS "Time",
> 	file.link AS "File"
> FROM ""
> WHERE 
> 	completed AND 
> 	date(format(dateCompleted)) = date(today)
> SORT completed DESC
> ```
> 
> ---
> 
> ## 📊 Active Projects
> 
> ```dataview
> TABLE WITHOUT ID
> 	file.link AS "Project",
> 	status AS "Status",
> 	deadline AS "Deadline",
> 	priority AS "Priority",
> 	tags AS "Tags"
> FROM "01 - Projects"
> WHERE 
> 	status != "completed" AND
> 	status != "archived"
> SORT 
> 	deadline ASC NULLS LAST,
> 	priority DESC
> ```
> 
> ---
> 
> ## 🎯 Areas of Focus
> 
> ```dataview
> LIST WITHOUT ID
> 	file.link AS "Area"
> FROM "02 - Areas"
> WHERE 
> 	!contains(file.path, "Templates") AND
> 	!contains(tags, "archived")
> SORT file.name ASC
> ```
> 
> ---
> 
> ## 📚 Knowledge Base Updates
> 
> ```dataview
> TABLE WITHOUT ID
> 	file.link AS "Document",
> 	file.ctime AS "Created",
> 	file.mday AS "Modified",
> 	tags AS "Tags"
> FROM "03 - Knowledge"
> WHERE 
> 	file.mday >= date(today) - dur(7 days)
> SORT file.mday DESC
> LIMIT 5
> ```
> 
> ---
> 
> ## 🔗 Quick Links
> 
> - **[[00 - Dashboard]]**: Main Dashboard
> - **[[01 - Projects/Project-Index]]**: All Projects
> - **[[02 - Areas]]**: Areas of Responsibility
> - **[[03 - Knowledge]]**: Knowledge Base
> - **[[Templates/Weekly-Review]]**: Weekly Review Template
> 
> ---
> 
> ## 📈 Dashboard Statistics
> 
> ```dataview
> TABLE WITHOUT ID
> 	"Total Notes" AS "Metric",
> 	length(filter(this.file.links, (l) => !contains(l.path, "Templates"))) AS "Value"
> FROM this.file
> 
> TABLE WITHOUT ID
> 	"Active Tasks" AS "Metric",
> 	length(filter(this.file.tasks, (t) => !t.completed)) AS "Value"
> FROM this.file
> 
> TABLE WITHOUT ID
> 	"Completed Today" AS "Metric",
> 	length(filter(this.file.tasks, (t) => t.completed AND date(format(dateCompleted)) = date(today))) AS "Value"
> FROM this.file
> ```
> 
> ---
> 
> ## 🎯 Daily Rituals
> 
> ### Morning (09:00)
> - [ ] Review Today's Focus
> - [ ] Check Upcoming Tasks
> - [ ] Review Active Projects
> 
> ### Midday (12:00)
> - [ ] Update Task Progress
> - [ ] Check Recent Activity
> 
> ### Evening (17:00)
> - [ ] Review Completed Tasks
> - [ ] Plan Tomorrow's Focus
> - [ ] Update Dashboard
> 
> ---
> 
> > **Last Refresh**: {{date:YYYY-MM-DD HH:mm:ss}}
> > **Auto-refresh**: Every 5 minutes
> > **Template Version**: 1.0
> 
> ---
> 
> *This dashboard is automatically generated and maintained by your vault standards system.*
