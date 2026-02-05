---
title: Meeting - <% tp.file.title %>
type:
  - project-management
  - meeting-note
status: active
version: 1.0.0
created: <% tp.file.creation_date("YYYY-MM-DD") %>
updated: <% tp.file.last_modified_date("YYYY-MM-DD") %>
modified: 2025-11-14
category: project-management
description: Meeting notes with agenda and action items
action_items: []
assignee: bun-platform
attendees: []
author: bun-platform
deprecated: false
due_date: ""
estimated_hours: 0
meeting_link: ""
priority: medium
progress: 0
project: ""
related_projects: []
replaces: ""
tags:
  - meeting
  - notes
usage: Use for recording meeting notes, decisions, and action items
---

# Meeting: <% tp.file.title %>

> **Date**: <% tp.date.now("dddd, MMMM DD, YYYY") %>  
> **Time**: <% tp.date.now("HH:mm") %>  
> **Status**: `<%= tp.frontmatter.status %>`

---

## 👥 Attendees

<% tp.frontmatter.attendees?.forEach(function(attendee) { %>
- <%= attendee %>
<% }); %>

**Meeting Link**: <%= tp.frontmatter.meeting_link || "N/A" %>

---

## 📋 Agenda

1. 
2. 
3. 

---

## 📝 Discussion Notes

### Topic 1
- 

### Topic 2
- 

### Topic 3
- 

---

## ✅ Action Items

<% tp.frontmatter.action_items?.forEach(function(item) { %>
- [ ] <%= item %>
<% }); %>

---

## 🎯 Decisions Made

1. 
2. 

---

## 🔗 Related

- [[05-Projects/]]
- 

---

**Tags**: `#meeting`, `#notes`  
**Status**: `<%= tp.frontmatter.status %>`
