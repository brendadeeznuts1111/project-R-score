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

## Bun.markdown.Options (HTML)

SSOT presets: [`lib/markdown/options.ts`](../lib/markdown/options.ts). Defaults
match [docs options table](https://bun.com/docs/runtime/markdown#options) (GFM
tables/strikethrough/tasklists **on**; headings/autolinks/wiki/math/tagFilter
**off**).

| Prefer                                                       | Avoid                                               |
| ------------------------------------------------------------ | --------------------------------------------------- |
| `headings: true` or `{ ids: true }`                          | blog-era `headingIds` / `autolinkHeadings` (no-ops) |
| `MARKDOWN_PRESET_PORTAL` / `_README` / `_SECURE` / `_DESIGN` | ad-hoc option soup per call site                    |
| `tagFilter: true` for untrusted HTML                         | raw HTML without filter                             |

Proof: `bun test tests/markdown-options.test.ts`.

## Console output (structured dumps)

Use the [`lib/console-depth.ts`](../lib/console-depth.ts) helpers for
object/table output — `inspect` / `logDepth` / `logTable` / `stripANSI` — not
raw `console.log(obj)`, `console.table`, or `JSON.stringify(x, null, 2)` as
default human output (`--json` branches excepted). Depth SSOT:
`bunfig.toml [console] depth = 6`; local override `BUN_CONSOLE_DEPTH`
(wrapper-only). Details: root [`AGENTS.md`](../AGENTS.md) "Console depth" ·
note [`lib/console-depth.md`](../lib/console-depth.md).

**Agent one-shot from stdin:** `echo '…' | bun --console-depth=N run -` —
Bun flags **before** `run` (same rule as `--watch`). Canonical:
[object inspection depth](https://bun.com/docs/runtime/console#object-inspection-depth)
· [`bun run -`](https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin).
Contract: `bun test tests/console-depth.test.ts -t "bun run - stdin"`.

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
bun run docs:refid:check           # planes + project discovery; errors fail
bun run docs:refid:check:strict    # format warns → errors
bun run docs:refid:check:dry-run   # report + audit inventory; always exit 0
bun run docs:refid:audit           # classify docs/**/*.md (Flags / REF:ID)
bun tools/docs-refid.ts check --registry-only   # skip discovery globs
bun tools/docs-refid.ts check --write-hrefs   # fill empty/—/auto href cells
bun run docs:refid:suggest --section=4.1 --flag=--foo-bar
bun run docs:refid:list            # taken ids in registered / --doc
bun run docs:refid:scaffold --section=4.1 --flag=--foo-bar
bun run docs:map:check             # includes REF:ID (unless --skip-refid-check)
```

**Coverage planes:** design (flags) · domain · portal · harness · lib (guides) ·
discovery (`docs/**` · `public/portal/**` when markup present). See
[CONTRIBUTING — REF:ID Validation](./contributing/CONTRIBUTING.md#refid-validation).

**Tool ↔ table (bidirectional):** Flag owners list leaves in
[`lib/docs/ref-id-tool-flags.ts`](../lib/docs/ref-id-tool-flags.ts) (or
`buildStatusFlagRows` for bun-types). With `requireToolCoverage`, every tool
REF:ID must appear in the Flags table (`tool-missing-table`) **and** every
table REF:ID must have a tool row (`table-missing-tool`) — both **errors**.
Partner documentation register paths live in `PARTNER_DOCUMENTATION_REFS`
([`partner-surface-inventory.ts`](../lib/docs/partner-surface-inventory.ts)).

**Unknown long options:** allowlists stay in `ALLOWED_LONG_REGISTRY` (code).
Bun.env only toggles policy — **`BUN_STRIP_UNKNOWN=true`** strips unknowns and
continues (local prototyping); unset / not `true` **hard-fails** (exit 2 /
throw). `BUN_LOG_UNKNOWN` defaults on when stripping. See root
[AGENTS.md § Unknown long options](../AGENTS.md#unknown-long-options-bun_strip_unknown)
· [`.env.example`](../.env.example).

**Audit gate:** `bun run docs:refid:audit` must report **flags-table-only=0**.
Board maps with a trailing `Flags` column are not REF:ID surfaces.

**href DX:** table `href` may be empty, `—`, or `auto` — checker treats it as
`#` + REF:ID. Use `--write-hrefs` to materialize `[`#4.1.x`](#4.1.x)` cells.
Prefer explicit links in committed docs.

Library: [`lib/docs/ref-id.ts`](../lib/docs/ref-id.ts) ·
[`ref-id-audit.ts`](../lib/docs/ref-id-audit.ts) ·
[`ref-id-tool-flags.ts`](../lib/docs/ref-id-tool-flags.ts) · CLI:
[`tools/docs-refid.ts`](../tools/docs-refid.ts) · design note:
[`docs/design/bun-types-inventory.md`](./design/bun-types-inventory.md) (Flags).

## Everyday

```bash
bun run install:verify
bun run type-check
bun run test:changed          # Bun-native --changed (+ parallel)
bun run test:dev              # watch monorepo tests/
bun run lint:all
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
