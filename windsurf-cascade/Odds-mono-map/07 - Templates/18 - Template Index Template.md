---
type: bun-template
title: "Template Index (Bun Template)"
section: "06 - Templates"
category: bun-template-system
priority: high
status: active
tags:
  - bun
  - bun-template-system
  - bun-templating
  - fast-startup
  - low-memory
  - native-ffi
  - odds-protocol
  - template
  - typescript
created: 2025-11-18T17:43:05Z
updated: 2025-11-19T09:05:28.463Z
author: bun-template-generator
version: 1.0.0

# Bun Runtime Configuration
runtime: bun
target: bun
bundler: bun
typeScript: true
optimizations:
  - fast-startup
  - low-memory
  - native-ffi
performance:
  startup: <100ms
  memory: <50MB
  build: <5s
integration:
apis:
    - Bun.Glob
    - Bun.TOML.parse
    - Bun.env
    - Bun.file
    - Bun.version
    - Bun.write
dependencies:
    - @types/js-yaml
    - @types/node
    - js-yaml
    - typescript
    - yaml
---

# 📚 Template Index

> **📊 Total Templates**: 35 | **🔄 Last Updated**: 2025-11-18T17:43:05Z

## 🗂️ Templates by Category

### 📂 general (35)


## 📊 Template Statistics

- **Total Templates**: 35
- **Categories**: 1
- **Average Size**: 350.0KB (estimated)
- **Last Updated**: 2025-11-18T17:43:05Z

## 🔧 Template Maintenance

Run maintenance scripts to keep templates optimized:

```bash
# Full maintenance cycle
bun scripts/template-maintenance.ts

# Specific tasks
bun scripts/template-maintenance.ts --tasks health-check,update-metadata
```

---

**📊 Document Status**: Active | **🔄 Auto-generated**: Yes | **⏭️ Next Update**: Daily