---
title: Tasks Dashboard
type:
  - dashboard
  - task-tracking
status: active
version: 1.0.0
created: 2025-01-XX
updated: 2025-01-XX
modified: 2025-11-14
category: dashboard
description: Track and manage tasks across the vault
author: bun-platform
deprecated: false
replaces: ""
tags:
  - dashboard
  - tasks
  - tracking
  - management
usage: View all tasks, tasks by project, and completed tasks
---

# ✅ Tasks Dashboard

## 📋 All Tasks
```dataview
TASK
WHERE !completed
GROUP BY file.link
```

## 🎯 Tasks by Project
```dataview
TASK
WHERE !completed
GROUP BY file.folder
```

## ✅ Completed This Week
```dataview
TASK
WHERE completed AND file.mtime >= date(today) - dur(7 days)
GROUP BY file.link
```

