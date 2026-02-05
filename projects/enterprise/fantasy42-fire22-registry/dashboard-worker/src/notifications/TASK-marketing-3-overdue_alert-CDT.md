# 📋 FIRE22 TASK NOTIFICATION [CDT][2025-08-28T20:54:00.377Z][35.282209ns]

## Task Assignment - MARKETING Department

### 📧 Recipient: Rachel Green (rachel.green@marketing.fire22)

### Task Details:

- **Task ID:** 3 (0198f275-73b6-7003-b9d3-e4ca62ec62b4)
- **Title:** Social Media Strategy
- **Priority:** 🔴 HIGH
- **Status:** 🔄 in-progress
- **Due Date:** 2024-11-30
- **Notification Type:** OVERDUE ALERT

### 🎯 ACTION REQUIRED:

URGENT: Task is overdue and requires immediate attention

---

## Notification Details

**Timestamp:** [CDT][2025-08-28T20:54:00.377Z][35.282209ns] **Environment:**
development **Timezone:** America/Chicago **Department:** marketing

### Task API Integration:

- **API Endpoint:** `GET /api/departments/marketing/tasks`
- **Task UUID:** `0198f275-73b6-7003-b9d3-e4ca62ec62b4`
- **Update Status:** `POST /api/departments/marketing/tasks/3/status`

---

## Quick Actions:

### Via Fire22 Dashboard:

1. Navigate to Department Tasks: `/dashboard#tasks-marketing`
2. Update task progress or status
3. Add comments or notes
4. Set reminders for due dates

### Via API:

```bash
# Get task details
curl -X GET "http://localhost:3000/api/departments/marketing/tasks"

# Update task status
curl -X POST "http://localhost:3000/api/departments/marketing/tasks/3/status" \
  -H "Content-Type: application/json" \
  -d '{"status": "in-progress", "progress": 50}'
```

---

## Contact Information:

- **Department Head:** head@marketing.fire22
- **Task API Support:** api@fire22.ag
- **Dashboard Support:** dashboard@fire22.ag

---

**⚡ This is a HIGH priority task notification requiring attention from
marketing department.**

_Generated at: [CDT][2025-08-28T20:54:00.377Z][35.282209ns]_

🤖 Generated with [Claude Code](https://claude.ai/code)
