---
title: Projects Dashboard
type:
  - dashboard
  - project-tracking
status: active
version: 1.0.0
created: 2025-01-XX
updated: 2025-01-XX
modified: 2025-11-14
category: dashboard
description: Track and manage all active projects in the vault
assignee: bun-platform
author: bun-platform
deprecated: false
due_date: ""
estimated_hours: 0
priority: medium
progress: 0
project: ""
related_projects: []
replaces: ""
tags:
  - dashboard
  - projects
  - tracking
  - management
usage: View project status, active projects, and projects by tag
---

# 🎯 Projects Dashboard

## 📊 Project Status Overview
```dataview
TABLE status, file.mtime as "Last Updated", file.ctime as "Created"
FROM "05-Projects"
SORT file.mtime DESC
```

## 🔥 Active Projects
```dataview
LIST
FROM "05-Projects"
WHERE status = "active"
```

## 📁 Projects by Tag
```dataview
TABLE rows.file.link as "Projects"
FROM "05-Projects"
FLATTEN file.tags as tag
GROUP BY tag
SORT tag ASC
```

