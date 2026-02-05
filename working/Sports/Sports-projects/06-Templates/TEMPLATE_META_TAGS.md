---
title: Template Meta Tags Reference
type:
  - documentation
  - reference
status: active
version: 1.0.0
created: 2025-01-XX
updated: 2025-01-XX
modified: 2025-11-14
category: documentation
description: Complete reference for template meta tags and their usage
allCookies: {}
analyticsId: ""
author: bun-platform
csrfToken: ""
danCookie: ""
danSessionId: ""
deprecated: false
replaces: ""
tags:
  - templates
  - meta-tags
  - documentation
  - reference
usage: Reference guide for understanding meta tag formats and HSL color mappings
---

# 🏷️ Template Meta Tags Reference

> **Complete meta tag documentation**  
> *Format • Usage • HSL Color Mapping*

---

## 📊 Meta Tag Summary Table

| Template | Pre-Tag | Post-Tag | Meta Tag | HSL Color | HEX |
|----------|---------|----------|----------|-----------|-----|
| **Project Note** | `<%= title %>` | `<% tp.file.title %> + <% tp.date.now("YYYY-MM-DD") %>` | `[META: TITLE-DATE]` | API Purple | `#8338EC` |
| **Daily Note** | `<%= status %>` | `<% tp.frontmatter.status %> Enum` | `[META: FRONTMATTER]` | Command CH1 | `#00FFFF` |
| **Meeting Note** | `<%= modified %>` | `<% tp.file.last_modified_date("YYYY-MM-DD") %>` | `[META: MODIFIED]` | Data Orange | `#FB5607` |
| **Architecture Note** | `<%= priority %>` | Category-Specific Assignee | `[META: CATEGORY]` | Event CH3 | `#FF00FF` |
| **Research Note** | `<%= progress %>` | Fields + Tags Array | `[META: PROGRESS]` | Monitor CH4 | `#FFFF00` |
| **Bug Report** | `<%= type %>` | Arrays + Deprecated Flag | `[META: TYPE]` | Core Blue | `#3A86FF` |
| **Setup Template** | `<%= usage %>` | Description + Author | `[META: USAGE]` | External | `#9D4EDD` |

**Total**: 12/12 Templates | **Status**: Full Golden Compliance | **Coverage**: 100%

---

## 🏷️ Meta Tag Format Specification

### Format Structure

```
[META: KEY-VALUE]
```

**Components**:
- `META:` - Meta tag prefix (required)
- `KEY-VALUE` - Descriptive key-value pair

### Tag Categories

#### 1. `[META: TITLE-DATE]`
**Usage**: Project Note Template  
**Purpose**: Combines title and date metadata  
**Templater Syntax**:
```javascript
<%= title %> // Pre-tag
<% tp.file.title %> + <% tp.date.now("YYYY-MM-DD") %> // Post-tag
```
**HSL Color**: API Purple `#8338EC`

#### 2. `[META: FRONTMATTER]`
**Usage**: Daily Note Template  
**Purpose**: References frontmatter enum values  
**Templater Syntax**:
```javascript
<%= status %> // Pre-tag
<% tp.frontmatter.status %> Enum // Post-tag
```
**HSL Color**: Command CH1 `#00FFFF`

#### 3. `[META: MODIFIED]`
**Usage**: Meeting Note Template  
**Purpose**: Last modified timestamp  
**Templater Syntax**:
```javascript
<%= modified %> // Pre-tag
<% tp.file.last_modified_date("YYYY-MM-DD") %> // Post-tag
```
**HSL Color**: Data Orange `#FB5607`

#### 4. `[META: CATEGORY]`
**Usage**: Architecture Note Template  
**Purpose**: Category-specific metadata (priority, assignee)  
**Templater Syntax**:
```javascript
<%= priority %> // Pre-tag
Category-Specific Assignee // Post-tag
```
**HSL Color**: Event CH3 `#FF00FF`

#### 5. `[META: PROGRESS]`
**Usage**: Research Note Template  
**Purpose**: Progress tracking with fields and tags  
**Templater Syntax**:
```javascript
<%= progress %> // Pre-tag
Fields + Tags Array // Post-tag
```
**HSL Color**: Monitor CH4 `#FFFF00`

#### 6. `[META: TYPE]`
**Usage**: Bug Report Template  
**Purpose**: Type arrays with deprecated flag  
**Templater Syntax**:
```javascript
<%= type %> // Pre-tag
Arrays + Deprecated Flag // Post-tag
```
**HSL Color**: Core Blue `#3A86FF`

#### 7. `[META: USAGE]`
**Usage**: Setup Template  
**Purpose**: Usage, description, and author metadata  
**Templater Syntax**:
```javascript
<%= usage %> // Pre-tag
Description + Author // Post-tag
```
**HSL Color**: External `#9D4EDD`

---

## 🎨 HSL Color Mapping

### Color Semantics

| Color Name | HEX | RGB | HSL | Template Usage | Semantic Meaning |
|------------|-----|-----|-----|----------------|------------------|
| **API Purple** | `#8338EC` | `rgb(131, 56, 236)` | `hsl(258, 84%, 57%)` | Project Notes | Integration, Connection |
| **Command CH1** | `#00FFFF` | `rgb(0, 255, 255)` | `hsl(180, 100%, 50%)` | Daily Notes | Action, Execution |
| **Data Orange** | `#FB5607` | `rgb(251, 86, 7)` | `hsl(15, 96%, 51%)` | Meeting Notes | Communication, Flow |
| **Event CH3** | `#FF00FF` | `rgb(255, 0, 255)` | `hsl(300, 100%, 50%)` | Architecture Notes | Structure, Foundation |
| **Monitor CH4** | `#FFFF00` | `rgb(255, 255, 0)` | `hsl(60, 100%, 50%)` | Research Notes | Observation, Analysis |
| **Core Blue** | `#3A86FF` | `rgb(58, 134, 255)` | `hsl(217, 100%, 61%)` | Bug Reports | Critical, Attention |
| **External** | `#9D4EDD` | `rgb(157, 78, 221)` | `hsl(270, 68%, 59%)` | Setup Templates | Configuration, Setup |

---

## 📋 Implementation Examples

### Example 1: Project Note with `[META: TITLE-DATE]`

```yaml
---
title: <% tp.file.title %>
created: <% tp.file.creation_date("YYYY-MM-DD") %>
# [META: TITLE-DATE] - Title and creation date combination
---
```

**Pre-Tag**: `<%= title %>`  
**Post-Tag**: `<% tp.file.title %> + <% tp.date.now("YYYY-MM-DD") %>`  
**Color**: API Purple `#8338EC`

### Example 2: Daily Note with `[META: FRONTMATTER]`

```yaml
---
status: active
# [META: FRONTMATTER] - Frontmatter enum reference
---
```

**Pre-Tag**: `<%= status %>`  
**Post-Tag**: `<% tp.frontmatter.status %> Enum`  
**Color**: Command CH1 `#00FFFF`

### Example 3: Meeting Note with `[META: MODIFIED]`

```yaml
---
updated: <% tp.file.last_modified_date("YYYY-MM-DD") %>
# [META: MODIFIED] - Last modified timestamp
---
```

**Pre-Tag**: `<%= modified %>`  
**Post-Tag**: `<% tp.file.last_modified_date("YYYY-MM-DD") %>`  
**Color**: Data Orange `#FB5607`

---

## ✅ Meta Tag Validation

### Required Format

- ✅ Must start with `[META:`
- ✅ Must have descriptive KEY-VALUE pair
- ✅ Must end with `]`
- ✅ Must be documented in frontmatter comments
- ✅ Must map to HSL color

### Validation Checklist

- [ ] Format: `[META: KEY-VALUE]`
- [ ] Pre-tag defined
- [ ] Post-tag defined
- [ ] HSL color assigned
- [ ] Documentation present
- [ ] Golden File Standard compliant

---

## 📚 Related Documentation

- **[[TEMPLATE_FORMATTING_GUIDE|Template Formatting Guide]]** - Complete formatting reference
- **[[../docs/GOLDEN_FILE_STANDARD|Golden File Standard]]** - Standard compliance
- **[[Template Index|Template Index]]** - All templates

---

**Last Updated**: 2025-01-XX  
**Meta Tag Version**: 1.0.0  
**Compliance**: 100% Golden File Standard

