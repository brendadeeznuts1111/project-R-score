---
title: Micro-Enhancement Versioning Guide
type:
  - documentation
  - versioning-guide
status: active
version: 1.0.0
created: 2025-01-XX
updated: 2025-01-XX
modified: 2025-11-14
category: documentation
description: Guide to micro-enhancement versioning system for Golden File Standard
author: bun-platform
canvas: []
deprecated: false
feed_integration: false
replaces: ""
tags:
  - versioning
  - micro-enhancements
  - standards
  - governance
usage: Reference for understanding and applying version numbers to standard updates
VIZ-06: []
---

# 🔢 Micro-Enhancement Versioning Guide

> **Clean Versioning**  
> *Incremental • Focused • Traceable*

---

## 📋 Version Format

**Pattern**: `vMAJOR.MINOR.PATCHrREVISION`

### Components

- **`MAJOR`**: Major version (breaking changes, major rewrites)
- **`MINOR`**: Minor version (new features, significant additions)
- **`PATCH`**: Patch version (bug fixes, corrections)
- **`rREVISION`**: Revision number (micro-enhancements, small fixes)

---

## 🎯 Version Types

### Major Version (`v2.0.0`)
**When**: Breaking changes, major architectural shifts
- Complete standard restructure
- Breaking changes to required fields
- Major governance changes

**Example**: `v1.3.0` → `v2.0.0` (complete rewrite)

---

### Minor Version (`v1.4.0`)
**When**: New features, significant additions
- New sections added
- New standards introduced
- Significant enhancements

**Example**: `v1.3.0` → `v1.4.0` (adds new optimization pattern)

---

### Patch Version (`v1.3.1`)
**When**: Bug fixes, corrections
- Fixing errors in standard
- Correcting typos
- Updating examples

**Example**: `v1.3.0` → `v1.3.1` (fixes typo in meta tag definition)

---

### Revision (`v1.3.0r1`)
**When**: Micro-enhancements, small improvements
- Section numbering fixes
- Cross-reference updates
- Minor clarifications
- Formatting improvements
- Small additions that don't warrant patch bump

**Example**: `v1.3.0` → `v1.3.0r1` (fixes section numbering conflict)

---

## 📊 Version Progression Examples

### Example 1: Feature Addition
```text
v1.3.0    → Initial Phase 1 & 2 implementation
v1.3.0r1  → Section numbering fix (micro-enhancement)
v1.4.0    → Adds Phase 3 enhancements (new feature)
v1.4.0r1  → Cross-reference update (micro-enhancement)
```

### Example 2: Bug Fix
```text
v1.3.0    → Current version
v1.3.1    → Fixes typo in meta tag table (patch)
v1.3.1r1  → Updates example code (micro-enhancement)
```

### Example 3: Major Change
```text
v1.3.0    → Current version
v2.0.0    → Complete standard restructure (major)
v2.0.0r1  → Formatting improvements (micro-enhancement)
```

---

## 🔄 Revision Numbering Rules

### When to Use Revisions (`r1`, `r2`, etc.)

**Use `rN` for**:
- ✅ Section numbering fixes
- ✅ Cross-reference updates
- ✅ Minor clarifications
- ✅ Formatting improvements
- ✅ Small additions (< 50 lines)
- ✅ Documentation improvements
- ✅ Link fixes

**Don't use `rN` for**:
- ❌ New sections (use minor version)
- ❌ Breaking changes (use major version)
- ❌ Bug fixes (use patch version)
- ❌ Significant additions (use minor version)

### Revision Incrementing

- **Start at `r1`** for first revision of a version
- **Increment sequentially**: `r1` → `r2` → `r3`
- **Reset on version bump**: New version starts at `r1` again

---

## 📝 Changelog Format

### Micro-Enhancement Entry

```markdown
## v1.3.0r1 (2025-01-XX)

**Micro-Enhancement**: Brief description
- Specific change 1
- Specific change 2
- Specific change 3
```

### Patch Entry

```markdown
## v1.3.1 (2025-01-XX)

**Bug Fix**: Description
- Fixed issue X
- Corrected error Y
```

### Minor Entry

```markdown
## v1.4.0 (2025-01-XX)

**New Feature**: Description
- Added Section X.Y: Feature Name
- Added new standard for Z
```

---

## 🎯 Decision Tree

```text
Is it a breaking change?
├─ Yes → Increment MAJOR (v2.0.0)
└─ No → Is it a new feature/section?
    ├─ Yes → Increment MINOR (v1.4.0)
    └─ No → Is it a bug fix?
        ├─ Yes → Increment PATCH (v1.3.1)
        └─ No → Is it a micro-enhancement?
            ├─ Yes → Add REVISION (v1.3.0r1)
            └─ No → No version change
```

---

## ✅ Benefits

1. **Clean Versioning**: Clear distinction between types of changes
2. **Micro-Tracking**: Small improvements tracked without version bloat
3. **Focused Changes**: Revisions keep changes small and focused
4. **Easy Rollback**: Can identify specific micro-enhancements
5. **Less Verbose**: No need for lengthy review documents

---

## 📚 Examples from Golden File Standard

### Current Version: `v1.3.0r1`

**History**:
- `v1.0.0`: Initial standard
- `v1.2.0`: Governance & integration enhancements
- `v1.3.0`: Phase 1 & 2 enhancements (meta tags, structure patterns)
- `v1.3.0r1`: Section numbering fix (micro-enhancement)

**Next Versions**:
- `v1.3.0r2`: Another micro-enhancement (e.g., formatting)
- `v1.3.1`: Bug fix (e.g., typo correction)
- `v1.4.0`: Phase 3 enhancements (new feature)
- `v2.0.0`: Major restructure (breaking change)

---

## 🎫 Ticket Structure for Micro-Enhancements

Micro-enhancements should be tracked as structured tickets with hierarchical sub-sections.

### Ticket ID Format

**Pattern**: `[CALL_SIGN]-[NUMBER][LETTER]-[NUMBER]`

**Example**: `TES-001A-01`

- `TES`: Call sign (project/domain)
- `001`: Parent ticket number
- `A`: Sub-category letter
- `01`: Sequential micro-enhancement number

### Hierarchical Structure

Use Markdown headings in ticket description:

- **`##` (H2)**: Main sections (1, 2, 3...)
- **`###` (H3)**: Sub-sections (1.1, 1.2...)
- **`####` (H4)**: Sub-sub-sections (1.1.1...)

**Example Structure**:
```markdown
## 1. Meta Tag Definition
### 1.1. Semantic Meaning
### 1.2. Format & Structure
#### 1.2.1. Syntax Rules
## 2. Validation Implementation
### 2.1. Regex Check
```

### Benefits

- **Granular Tracking**: Each sub-section can be tracked independently
- **Clear Organization**: Hierarchical structure improves readability
- **Actionable**: Each section has specific tasks
- **Traceable**: Easy to see what's been completed

**See**: [[MICRO_ENHANCEMENT_TICKET_GUIDE|Micro-Enhancement Ticket Guide]] for complete structure guide.

---

## 🔗 Related Documentation

- **[[GOLDEN_FILE_STANDARD|Golden File Standard]]** - The standard itself
- **[[GOLDEN_FILE_STANDARD_CHANGELOG|Changelog]]** - Complete change history
- **[[MICRO_ENHANCEMENT_TICKET_GUIDE|Micro-Enhancement Ticket Guide]]** - Ticket structure guide

---

**Last Updated**: 2025-01-XX  
**Guide Version**: 1.0.0

