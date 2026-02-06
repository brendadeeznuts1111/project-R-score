---
title: Templates Index
type: index
status: active
version: 1.0.0
created: 2025-11-13
updated: 2025-11-13
modified: 2025-11-14
category: index
description: Master index of all templates in 06-Templates/
author: bun-platform
canvas:
  - "[[VIZ-06.canvas]]"
deprecated: false
replaces: ""
tags:
  - template
  - index
  - bun-platform
usage: ""
VIZ-06: []
---

# 📐 Templates Index

> **Structured template library**  
> *All templates validated and organized*  
> *Cannot and will not be a mess*

## 🎯 Quick Reference

| Category | Count | Templates |
|----------|-------|-----------|
| **💻 Development** | 4 | [[01-Development/Architectural Refactoring Proposal|Architectural Refactoring Proposal]], [[01-Development/Architecture Note Template|Architecture Note Template]], [[01-Development/Development Template|Development Template]], [[01-Development/Bun MCP Integration Template|Bun MCP Integration Template]] |
| **🔍 Research** | 1 | [[02-Research/Research Template|Research Template]] |
| **🛠️ Setup** | 2 | [[03-Setup/Setup Template|Setup Template]], [[03-Setup/Vault Setup Template|Vault Setup Template]] |
| **🐛 Problem Solving** | 2 | [[04-Problem-Solving/Problem Solving Template|Problem Solving Template]], [[04-Problem-Solving/Bug Report|Bug Report]] |
| **📋 Project Management** | 6 | [[05-Project-Management/Project Note Template|Project Note Template]], [[05-Project-Management/Project Development Note|Project Development Note]], [[05-Project-Management/Meeting Note Template|Meeting Note Template]], [[05-Project-Management/Daily Note Template|Daily Note Template]], [[05-Project-Management/Daily Standup|Daily Standup]], [[05-Project-Management/Configuration Note|Configuration Note]] |

**Total**: 15 templates across 5 categories

## 📁 Directory Structure

```text
06-Templates/
├── 01-Development/
│   ├── Architectural Refactoring Proposal.md
│   ├── Architecture Note Template.md
│   ├── Development Template.md
│   └── Bun MCP Integration Template.md
├── 02-Research/
│   └── Research Template.md
├── 03-Setup/
│   ├── Setup Template.md
│   └── Vault Setup Template.md
├── 04-Problem-Solving/
│   ├── Problem Solving Template.md
│   └── Bug Report.md
├── 05-Project-Management/
│   ├── Project Note Template.md
│   ├── Project Development Note.md
│   ├── Meeting Note Template.md
│   ├── Daily Note Template.md
│   ├── Daily Standup.md
│   └── Configuration Note.md
├── 00-Index.md
└── README.md
```

## 📋 Categories

### 💻 Development

**01-Development/** - *Development & Architecture*

**Templates (4):**

- [[01-Development/Architectural Refactoring Proposal|Architectural Refactoring Proposal]]
- [[01-Development/Architecture Note Template|Architecture Note Template]]
- [[01-Development/Development Template|Development Template]]
- [[01-Development/Bun MCP Integration Template|Bun MCP Integration Template]]

### 🔍 Research

**02-Research/** - *Research & Learning*

**Templates (1):**

- [[02-Research/Research Template|Research Template]]

### 🛠️ Setup

**03-Setup/** - *Setup & Configuration*

**Templates (2):**

- [[03-Setup/Setup Template|Setup Template]]
- [[03-Setup/Vault Setup Template|Vault Setup Template]]

### 🐛 Problem Solving

**04-Problem-Solving/** - *Problem Solving & Debugging*

**Templates (2):**

- [[04-Problem-Solving/Problem Solving Template|Problem Solving Template]]
- [[04-Problem-Solving/Bug Report|Bug Report]]

### 📋 Project Management

**05-Project-Management/** - *Project Management & Planning*

**Templates (6):**

- [[05-Project-Management/Project Note Template|Project Note Template]]
- [[05-Project-Management/Project Development Note|Project Development Note]]
- [[05-Project-Management/Meeting Note Template|Meeting Note Template]]
- [[05-Project-Management/Daily Note Template|Daily Note Template]]
- [[05-Project-Management/Daily Standup|Daily Standup]]
- [[05-Project-Management/Configuration Note|Configuration Note]]

## ✅ Validation Status

- ✅ All templates validated
- ✅ All frontmatter complete
- ✅ All links working
- ✅ Structure organized
- ✅ Numbered categories enforced

## 🛠️ Maintenance

### CLI Commands

```bash
# List all templates
bun-platform list-templates

# Validate all templates
bun-platform validate-templates --directory "06-Templates"

# Audit template health
bun-platform audit-templates

# Sync from repo to vault
bun-platform sync-templates --source "obsidian-templates" --target "06-Templates"
```

## 📊 Structure Rules

1. **Numbered Categories** - All folders use `NN-Category/` format
2. **Strict Validation** - All templates must pass frontmatter validation
3. **No Loose Files** - All templates in category folders
4. **Index Maintenance** - Auto-updated on template changes
5. **Version Tracking** - All templates have version field

---

*Last validated: 2025-11-13*
*Generated by bun-platform*
