---
title: META Tag Registry
type:
  - registry
  - reference
  - meta-tags
status: active
version: 1.0.0
created: 2025-01-XX
updated: 2025-01-XX
modified: 2025-11-14
category: reference
description: Complete registry of all authorized META tags for component IDs and optimization documentation
allCookies: {}
analyticsId: ""
author: bun-platform
canvas: []
component_id: DATA/STORAGE/SUB_A/SERVICE_v1.0.0][#REF:SUB_A_SVC_01][CH:'HSL(20,100%,70%)'][#META:RUNTIME=BUN,LATENCY_P99=20ms,LIMIT=QPS:1000,SECTION=overview,OWNER_TEAM=bun-platform,AUDIENCE=developers]"
csrfToken: ""
danCookie: ""
danSessionId: ""
deprecated: false
feed_integration: false
replaces: ""
tags:
  - meta-tags
  - registry
  - reference
  - golden-file-standard
usage: Reference for using META tags in component_id strings and documentation
VIZ-06: []
---

# 📋 META Tag Registry

> **Complete Reference**  
> *Authorized Tags • Format • Usage • Examples*

---

## 🎯 Overview

This registry documents all authorized META tags that can be used in:
- `component_id` strings: `[#META:KEY1=VALUE1,KEY2=VALUE2]`
- Optimization documentation: `[META: TAG_NAME]`
- Source file headers: `[#META:KEY=VALUE]`

All META tags **must** follow the standardized format and be from this authorized list.

---

## 📊 Authorized META Tags

### Performance & Limits

| Tag | Format | Purpose | Usage Example | Key-Value Format |
|-----|--------|---------|---------------|------------------|
| `[META: LIMIT]` | Limit/Constraint | Performance limits, caps, maximums | Shape limits, node limits, file limits | `[#META:LIMIT=SHAPES:100]` |
| `[META: TUNE]` | Tuning/Optimization | Performance tuning, parameter adjustment | Physics tuning, repulsion tuning | `[#META:TUNE=PHYSICS:STRONG]` |

### Externalization & Offloading

| Tag | Format | Purpose | Usage Example | Key-Value Format |
|-----|--------|---------|---------------|------------------|
| `[META: OFFLOAD]` | Offload/Externalize | External storage, caching, offloading | Image offload, cache offload, R2 storage | `[#META:OFFLOAD=IMAGES:R2]` |

### Organization & Structure

| Tag | Format | Purpose | Usage Example | Key-Value Format |
|-----|--------|---------|---------------|------------------|
| `[META: SPLIT]` | Split/Divide | Division, separation, partitioning | Sub-graphs, sub-vaults, split views | `[#META:SPLIT=GRAPH:SUB_GRAPHS]` |
| `[META: FILTER]` | Filter/Scope | Filtering, scoping, limiting scope | Load filters, tag filters, search filters | `[#META:FILTER=LOAD:TAG_BASED]` |
| `[META: OPTIONAL]` | Optional/Disable | Optional features, conditional enablement | Optional features, disable on demand | `[#META:OPTIONAL=EXTENDED_CANVAS:DISABLE]` |

### Link & Navigation

| Tag | Format | Purpose | Usage Example | Key-Value Format |
|-----|--------|---------|---------------|------------------|
| `[META: LINK]` | Linking | Link management, link optimization | Wikilinks, auto-update links | `[#META:LINK=TYPE:WIKILINKS]` |

### Maintenance & Cleanup

| Tag | Format | Purpose | Usage Example | Key-Value Format |
|-----|--------|---------|---------------|------------------|
| `[META: CLEAN]` | Cleanup | Cache cleanup, maintenance, pruning | Cache cleanup, temp file cleanup | `[#META:CLEAN=CACHE:AUTO]` |

### Configuration & Defaults

| Tag | Format | Purpose | Usage Example | Key-Value Format |
|-----|--------|---------|---------------|------------------|
| `[META: DEFAULT]` | Default/Initial | Default values, initial settings | Default filters, initial tags | `[#META:DEFAULT=FILTER:#canvas]` |

### Physics & Algorithms

| Tag | Format | Purpose | Usage Example | Key-Value Format |
|-----|--------|---------|---------------|------------------|
| `[META: FORCE]` | Force/Physics | Force minimization, physics simulation | Force physics, node repulsion | `[#META:FORCE=REPULSION:1.5]` |
| `[META: VERLET]` | Algorithm | Specific algorithms, integration methods | Verlet integration, d3.js algorithms | `[#META:VERLET=INTEGRATION:ENABLED]` |

### Features & Extensions

| Tag | Format | Purpose | Usage Example | Key-Value Format |
|-----|--------|---------|---------------|------------------|
| `[META: EXTEND]` | Extension | Extended features, advanced capabilities | Extended graph, extended canvas | `[#META:EXTEND=GRAPH:ENABLED]` |
| `[META: ENHANCED]` | Enhancement | General enhancements, improvements | Enhanced features, enhanced performance | `[#META:ENHANCED=FEATURES:ENABLED]` |

### Search & Discovery

| Tag | Format | Purpose | Usage Example | Key-Value Format |
|-----|--------|---------|---------------|------------------|
| `[META: SEARCH]` | Search | Search optimization, search configuration | Search filters, search on-open | `[#META:SEARCH=FILTER:TAG_BASED]` |

---

## 🔧 Format Specifications

### Standalone Format (Documentation)

**Pattern**: `[META: TAG_NAME]`

- `TAG_NAME` is uppercase, space-separated words
- Used in optimization documentation and guides
- Example: `[META: LIMIT]`, `[META: OFFLOAD]`

### Key-Value Format (component_id)

**Pattern**: `[#META:KEY1=VALUE1,KEY2=VALUE2]`

- Keys are `UPPERCASE` and case-sensitive
- Values are case-sensitive strings
- Multiple key-value pairs separated by commas
- Example: `[#META:LIMIT=SHAPES:100,OFFLOAD=IMAGES:R2]`

### Source File Header Format

**Pattern**: `[#META:KEY=VALUE]` (in header comments)

- Same key-value format as component_id
- Used in source file headers
- Example: `[#META:RUNTIME=BUN,LATENCY_P99=20ms]`

---

## 📝 Usage Examples

### In component_id

```yaml
component_id: "[DATA/STORAGE/SUB_A/SERVICE_v1.0.0][#REF:SUB_A_SVC_01][CH:'HSL(20,100%,70%)'][#META:RUNTIME=BUN,LATENCY_P99=20ms,LIMIT=QPS:1000,SECTION=overview,OWNER_TEAM=bun-platform,AUDIENCE=developers]"
```

### In Optimization Documentation

```markdown
## Optimization: Canvas Shapes Limit

**Meta Tag**: `[META: LIMIT]`  
**Implementation**: Limit canvas shapes to 100 maximum  
**Key-Value**: `[#META:LIMIT=SHAPES:100]`
```

### In Source File Header

```typescript
// @KIMI2-ARCH-COMPONENT-START
// ID: [DATA/STORAGE/SUB_A/SERVICE_v1.0.0][#REF:SUB_A_SVC_01][CH:'HSL(20,100%,70%)'][#META:RUNTIME=BUN,LATENCY_P99=20ms]
// ...
// @KIMI2-ARCH-COMPONENT-END
```

---

## ✅ Validation Rules

1. **Format Check**: Meta tags must match authorized format patterns
2. **Authorized List**: Tags must be from this registry
3. **Case Sensitivity**: Keys are `UPPERCASE`, values are case-sensitive
4. **Key-Value Parsing**: Keys and values must be valid identifiers/strings

**Validation Command**: `bun-platform validate` checks META tag compliance

---

## 🔗 Related Documentation

- **[[GOLDEN_FILE_STANDARD|Golden File Standard]]** - Section 4.5: Standard Meta Tags
- **[[SOURCE_FILE_HEADER_IMPLEMENTATION|Source File Header Implementation]]** - Header META tag usage
- **[[03-Reference/TES/Optimizations/Phase-4-Canvas/OPT.13-Canvas-Graph/EXECUTION-LOG|OPT.13 Execution Log]]** - META tag usage examples

---

## 📊 Summary

**Total Authorized META Tags**: 14

**Categories**:
- Performance & Limits: 2 tags
- Externalization: 1 tag
- Organization: 3 tags
- Link & Navigation: 1 tag
- Maintenance: 1 tag
- Configuration: 1 tag
- Physics & Algorithms: 2 tags
- Features: 2 tags
- Search: 1 tag

---

**Last Updated**: 2025-01-XX  
**Registry Version**: 1.0.0  
**Status**: Active

