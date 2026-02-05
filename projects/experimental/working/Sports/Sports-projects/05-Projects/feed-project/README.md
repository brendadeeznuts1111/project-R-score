---
title: Feed Project
type: project-management
status: active
version: 0.1.0
created: 2025-11-14
updated: 2025-12-29
category: project-management
description: Dashboard field mapping and transformation engine
author: Sports Analytics Team
feed_integration: true
tags: ["dashboard", "field-mapping", "mcp"]
---

# Feed Project

Dashboard configuration field mapping and transformation engine.

## Structure

```
feed-project/
├── src/
│   ├── index.ts              # Exports
│   ├── types.ts              # DashboardConfig, FieldMapping, MetaTag
│   ├── field-mapping.ts      # Transformation engine
│   ├── env-substitutor.ts    # $env:VAR replacement
│   └── server.ts             # MCP tool endpoints
├── tests/
│   └── field-mapping.test.ts
├── field-mapping/
│   ├── System.md             # Complete field spec (9 fields)
│   ├── session-notes.md      # Implementation history
│   └── Flow.canvas           # Visual flow diagram
├── mcp-config/
│   └── Configuration.md      # MCPorter config
└── package.json
```

## Flow

```
DashboardConfig → field-mapping.transform() → EnhancedConfig
                         ↓
              env-substitutor ($env:DASH_ROOT)
                         ↓
              Apply HSL colors + meta tags
                         ↓
              MCP tool: get_dashboard_info()
```

## Field Mappings

| Field | Meta Tag | HSL Color |
|-------|----------|-----------|
| id | DOMAIN | #3A86FF (Core Blue) |
| path | DYNAMIC | #00FFFF (Command CH1) |
| template | RELATIVE | #FB5607 (Data Orange) |
| status | ACTIVE | #FF00FF (Event CH3) |
| category | CATEGORY | #8338EC (Category Purple) |
| version | VERSION | #06FFA5 (Version Teal) |
| name | DOMAIN | #3A86FF (Core Blue) |
| description | DESCRIPTION | #FFBE0B (Description Yellow) |
| tags | TAGS | #FF006E (Tags Pink) |

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Server health + field count |
| GET | /api/dashboard/:id | Get enhanced dashboard |
| GET | /api/dashboard/:id/css | Get CSS variables |
| GET | /api/fields | List all field mappings |
| GET | /api/fields/:name | Get specific mapping |

## Commands

```bash
bun dev    # Watch mode
bun start  # Run server
bun test   # Run tests
```

## Specification

See [[field-mapping/System|Field Mapping System]] for complete specification.
