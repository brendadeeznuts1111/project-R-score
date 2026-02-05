# Architecture Overview

## System Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                            │
│  (User code, Cloudflare Workers, CLI tools, Dashboards)        │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                  INTEGRATION LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Cloudflare   │  │ Zod          │  │ SQLite       │          │
│  │ Workers      │  │ Validation   │  │ Support      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   PATTERN LAYER                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Custom       │  │ Tabular      │  │ Deep         │          │
│  │ Inspection   │  │ Analytics    │  │ Comparison   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   UTILITY LAYER                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ deepEquals   │  │ stringWidth   │  │ peek         │          │
│  │ Comparison   │  │ Layout        │  │ Async        │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   CORE LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ inspect()    │  │ custom       │  │ table()      │          │
│  │ Formatting   │  │ Inspection   │  │ Formatting   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   BUN NATIVE LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Bun.inspect  │  │ Bun.inspect  │  │ Bun.inspect  │          │
│  │              │  │ .custom      │  │ .table       │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Bun.deepEq   │  │ Bun.strWidth │  │ Bun.peek     │          │
│  │              │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Module Dependencies

```
index.ts
├── core/
│   ├── inspect.ts
│   ├── custom.ts
│   └── table.ts
├── utils/
│   ├── deepEquals.ts
│   ├── stringWidth.ts
│   └── peek.ts
└── types.ts
```

## Data Flow

### Inspection Flow
```
User Input
    ↓
inspect(value, options)
    ↓
Bun.inspect() [native]
    ↓
Format with ANSI colors
    ↓
Return formatted string
```

### Comparison Flow
```
Object A, Object B
    ↓
deepEquals(a, b)
    ↓
Bun.deepEquals() [native]
    ↓
findDifferences() [optional]
    ↓
Return boolean + differences
```

### Table Flow
```
Array of objects
    ↓
table(data, properties)
    ↓
Bun.inspect.table() [native]
    ↓
Format as ASCII/Markdown/CSV
    ↓
Return formatted string
```

## Type System

```
InspectOptions
├── depth: number
├── colors: boolean
├── sorted: boolean
├── maxArrayLength: number
└── maxStringLength: number

InspectResult
├── value: string
├── depth: number
├── colored: boolean
└── duration: number

ComparisonResult
├── equal: boolean
├── differences?: string[]
└── duration: number

WidthResult
├── width: number
├── length: number
├── hasAnsi: boolean
└── hasEmoji: boolean

PeekResult<T>
├── state: "pending" | "fulfilled" | "rejected"
├── value?: T
├── error?: Error
└── duration: number
```

## Configuration Hierarchy

```
bunfig.toml
├── [inspect]
│   ├── protocol
│   ├── aiFeedback
│   ├── storage
│   ├── darkMode
│   └── ...
├── [performance]
│   ├── cacheInspections
│   ├── cacheTTL
│   └── ...
├── [cloudflare]
│   ├── workersEnabled
│   ├── durableObjectsEnabled
│   └── ...
└── [ui]
    ├── darkModeFirst
    ├── aiPoweredFeedback
    └── ...
```

## Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| inspect() | <1ms | Shallow objects |
| inspect() | 1-5ms | Deep objects (depth: 10) |
| deepEquals() | <1ms | Simple objects |
| deepEquals() | 1-10ms | Complex nested objects |
| stringWidth() | <0.1ms | ASCII strings |
| stringWidth() | 0.1-1ms | With emoji/ANSI |
| peek() | <0.01ms | Non-blocking |

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│   Cloudflare Workers                    │
│  ┌───────────────────────────────────┐  │
│  │ Worker Handler                    │  │
│  │ - /api/inspect                    │  │
│  │ - /api/table                      │  │
│  │ - /api/compare                    │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ Durable Objects                   │  │
│  │ - InspectionDurableObject         │  │
│  │ - WebSocket streaming             │  │
│  │ - State management                │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│   Cloudflare KV Storage                 │
│  - Immutable audit logs                 │
│  - Inspection cache                     │
│  - Metadata storage                     │
└─────────────────────────────────────────┘
```

---

**Architecture Version**: 1.0.0  
**Last Updated**: January 17, 2026

