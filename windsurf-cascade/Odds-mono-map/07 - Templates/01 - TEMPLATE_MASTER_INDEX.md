type: bun-template
title: "Default Template (Bun Template)"
section: "07 - Templates"
category: bun-general
priority: medium
status: active
tags:

- bun
- odds-protocol
- template
- typescript
created: 2025-11-19
updated: 2025-11-19T09:05:28.458Z
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
  - fs
  - path
  - crypto
  plugins:
  - typescript
  - linter
  dependencies:
  - typescript
  - @types/node

---

type: template
title: "Template"
section: "07 - Templates"
category: general
priority: medium
status: active
tags:

- template
- odds-protocol
created: 2025-11-19
updated: 2025-11-19T09:04:06.246Z
author: template-generator
version: 1.0.0

---
