# Development Standards — Quick Reference

> Full: [`.custom-instructions.md`](../.custom-instructions.md) · Agents:
> [`AGENTS.md`](../AGENTS.md) · Wire: [`WIRE_BOUNDARY.md`](./WIRE_BOUNDARY.md) ·
> Install: [`UNIFIED.md`](./UNIFIED.md)

## Terminology

| Prefer                           | Avoid                                    |
| -------------------------------- | ---------------------------------------- |
| **artifact**                     | “codebase” (for delivered/proven things) |
| **repository** / **source tree** | “codebase” (for location)                |
| **brand**                        | bare `string` domain IDs                 |

## Domain IDs (mandatory)

Parse once at the boundary. No `sessionId: string` / bare `id: string` without
`// brand-ok`.

| Boundary | Constructor         |
| -------- | ------------------- |
| Wire     | `parseXId(unknown)` |
| Optional | `tryXId(...)`       |
| Trusted  | `asXId(string)`     |

```bash
bun tools/brand-catalog.ts
bun run check:brands:all
```

## Console output (structured dumps)

Use the [`lib/console-depth.ts`](../lib/console-depth.ts) helpers for
object/table output — `inspect` / `logDepth` / `logTable` / `stripANSI` — not
raw `console.log(obj)`, `console.table`, or `JSON.stringify(x, null, 2)` as
default human output (`--json` branches excepted). Depth SSOT:
`bunfig.toml [console] depth = 6`; local override `BUN_CONSOLE_DEPTH`
(wrapper-only). Details: root [`AGENTS.md`](../AGENTS.md) "Console depth".

## REF:ID (design-doc flags / TOC)

Numbered fragment ids for operator docs (baseline: bun-types inventory §4.1).

| Rule      | Example                                                                 |
| --------- | ----------------------------------------------------------------------- |
| Shape     | `{section}.{kebab-keyword}` → `4.1.refresh` · `4.1.max-age-days`        |
| href      | always `#` + REF:ID                                                     |
| Keyword   | kebab-case, 2–32 chars, no leading/trailing `-`                         |
| Reserved  | never use leaves `index` · `top` · `toc` · `anchor`                     |
| Unique    | one REF:ID / `<a id>` value per document                                |
| Tooling   | `href` on flag rows must match code (`flagDocRef`)                      |
| Placement | section id (e.g. `4.1`) on the line immediately above the Flags heading |
| Comments  | optional `<!-- REF:ID … -->` must have a matching `<a id>`              |

```bash
bun run docs:refid:check           # errors fail; format orphans warn
bun run docs:refid:check:strict    # format warns → errors
bun run docs:refid:suggest --section=4.1 --flag=--foo-bar
bun run docs:refid:list            # taken ids in registered / --doc
bun run docs:refid:scaffold --section=4.1 --flag=--foo-bar
bun run docs:map:check             # includes REF:ID (unless --skip-refid-check)
```

**href DX:** table `href` may be empty, `—`, or `auto` — checker treats it as
`#` + REF:ID. Prefer explicit `[#4.1.x](#4.1.x)` in committed docs.

Library: [`lib/docs/ref-id.ts`](../lib/docs/ref-id.ts) · CLI:
[`tools/docs-refid.ts`](../tools/docs-refid.ts) · design note:
[`docs/design/bun-types-inventory.md`](./design/bun-types-inventory.md) (Flags).

## Everyday

```bash
bun run install:verify
bun run type-check
bun run test:changed          # Bun-native --changed (+ parallel)
bun run test:dev              # watch monorepo tests/
bun run lint:harness
bun run harness:status
bun tools/bun-doc-refs.ts suggest "Bun.secrets"
```

Full testing / hooks map:
[`docs/DEVELOPMENT-WORKFLOW.md`](./DEVELOPMENT-WORKFLOW.md) (concept gates:
`bun run concept:audit --strict` · `validate:surface-coverage`).

## Before merge

- Tests / type-check clean on touched surface
- Harness eslint on staged paths (`--max-warnings 0`)
- Bun APIs have `// @see` when required
- Domain IDs branded; prose uses **artifact** not **codebase**

Map: [docs/README.md](./README.md) · brands:
[`lib/types/branded/README.md`](../lib/types/branded/README.md).
