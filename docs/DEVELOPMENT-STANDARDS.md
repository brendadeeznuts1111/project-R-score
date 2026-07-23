# Development Standards — Quick Reference

> Full: [`.custom-instructions.md`](../.custom-instructions.md) · Agents: [`AGENTS.md`](../AGENTS.md) · Wire: [`WIRE_BOUNDARY.md`](./WIRE_BOUNDARY.md) · Install: [`UNIFIED.md`](./UNIFIED.md)

## Terminology

| Prefer | Avoid |
|--------|--------|
| **artifact** | “codebase” (for delivered/proven things) |
| **repository** / **source tree** | “codebase” (for location) |
| **brand** | bare `string` domain IDs |

## Domain IDs (mandatory)

Parse once at the boundary. No `sessionId: string` / bare `id: string` without `// brand-ok`.

| Boundary | Constructor |
|----------|-------------|
| Wire | `parseXId(unknown)` |
| Optional | `tryXId(...)` |
| Trusted | `asXId(string)` |

```bash
bun tools/brand-catalog.ts
bun run check:brands:all
```

## Everyday

```bash
bun run install:verify
bun run type-check
bun run test:changed
bun run lint:harness
bun run harness:status
bun tools/bun-doc-refs.ts suggest "Bun.secrets"
```

## Before merge

- Tests / type-check clean on touched surface
- Harness eslint on staged paths (`--max-warnings 0`)
- Bun APIs have `// @see` when required
- Domain IDs branded; prose uses **artifact** not **codebase**

Map: [docs/README.md](./README.md) · brands: [`lib/types/branded/README.md`](../lib/types/branded/README.md).
