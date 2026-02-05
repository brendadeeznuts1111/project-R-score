---
title: Templates Directory README
type: documentation
status: active
version: 1.0.0
created: 2025-11-13
updated: 2025-11-13
modified: 2025-11-14
category: documentation
description: Documentation for 06-Templates/ directory structure
allCookies: {}
analyticsId: ""
author: bun-platform
csrfToken: ""
danCookie: ""
danSessionId: ""
deprecated: false
replaces: ""
tags:
  - template
  - documentation
  - bun-platform
usage: ""
---

# 📐 Templates Directory Documentation

> **Structured, organized, validated template library**  
> *Cannot and will not be a mess*

## 🎯 Purpose

The `06-Templates/` directory contains all reusable templates for creating notes, documentation, and project files. All templates are:

- ✅ **Organized** - Numbered category folders
- ✅ **Validated** - Required frontmatter enforced
- ✅ **Documented** - Clear usage guidelines
- ✅ **Maintained** - Version tracked and updated

## 📁 Directory Structure

```
06-Templates/
├── 00-Index.md                        # Master template index
├── README.md                          # This file
│
├── 01-Development/                    # Development & Architecture
│   ├── Architectural Refactoring Proposal.md
│   ├── Architecture Note Template.md
│   ├── Development Template.md
│   └── Bun MCP Integration Template.md
│
├── 02-Research/                       # Research & Learning
│   └── Research Template.md
│
├── 03-Setup/                          # Setup & Configuration
│   ├── Setup Template.md
│   └── Vault Setup Template.md
│
├── 04-Problem-Solving/                # Problem Solving & Debugging
│   ├── Problem Solving Template.md
│   └── Bug Report.md
│
└── 05-Project-Management/             # Project Management
    ├── Project Note Template.md
    ├── Project Development Note.md
    ├── Meeting Note Template.md
    ├── Daily Note Template.md
    ├── Daily Standup.md
    └── Configuration Note.md
```

## ✅ Required Frontmatter

All templates must have:

```yaml
---
# REQUIRED FIELDS
title: "Template Name"
type: <template-type>                  # From VALID_TEMPLATE_TYPES
status: "active"                       # active, deprecated, draft
version: "1.0.0"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
tags: [template, <category>]          # Always include 'template'

# CATEGORY-SPECIFIC
category: "development"
description: "Brief description"
usage: "When to use this template"

# OPTIONAL
author: "bun-platform"
deprecated: false
---
```

## 🔍 Validation Rules

1. **Naming**: Files use `Pascal Case.md`, folders use `NN-Category/`
2. **Frontmatter**: All required fields must be present
3. **Type**: Must be from `VALID_TEMPLATE_TYPES`
4. **Status**: Must be `active`, `deprecated`, or `draft`
5. **Tags**: Must include `template` tag

## 🛠️ Maintenance

### Sync Templates

```bash
bun scripts/sync-templates-to-vault.ts
```

### Validate Templates

```bash
bun-platform validate-template --template "06-Templates/**/*.md" --strict
```

### Update Index

```bash
bun scripts/create-templates-index.ts
```

## 📊 Statistics

- **Total Templates**: 16
- **Categories**: 5
- **Status**: ✅ Organized
- **Last Updated**: 2025-11-13

## 🔗 Related

- [[06-Templates/00-Index|Templates Index]] - Complete template catalog
- [[docs/TEMPLATES-STRUCTURE-VISUAL|Visual Structure Plan]] - Detailed structure documentation

---

*This directory is maintained by bun-platform CLI*
