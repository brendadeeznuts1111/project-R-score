# Documentation index

Navigation for **platform SSOT** docs (root + `docs/` + shared `lib` maps). Project-specific trees under `projects/active/` keep their own docs — not listed here.

## Start here

| Role | Path |
|------|------|
| Human hub | [`../README.md`](../README.md) |
| Agent entry | [`../AGENTS.md`](../AGENTS.md) |
| Agent full guide | [AGENTS.md](./AGENTS.md) |
| Workspace map | [`../STRUCTURE.md`](../STRUCTURE.md) |
| Coding standards | [`../.custom-instructions.md`](../.custom-instructions.md) · [DEVELOPMENT-STANDARDS.md](./DEVELOPMENT-STANDARDS.md) |

## Boundaries and install

| Role | Path | Anchors |
|------|------|---------|
| Bun install / bunfig / CI | [UNIFIED.md](./UNIFIED.md) | [TOC](./UNIFIED.md#table-of-contents) |
| Wire boundary (parse once) | [WIRE_BOUNDARY.md](./WIRE_BOUNDARY.md) | full map |
| Package import graph | [IMPORT_BOUNDARIES.md](./IMPORT_BOUNDARIES.md) | — |
| Bun native capabilities | [BUN_NATIVE_CAPABILITIES.md](./BUN_NATIVE_CAPABILITIES.md) | WebView, markdown.ansi, cron, UDP |

These are **different** concerns: install ≠ wire types ≠ package imports ≠ runtime feature notes.

## Lib harness maps

| Role | Path |
|------|------|
| Path SSOT (`CANONICAL_*`) | [`../lib/docs/repo-docs.ts`](../lib/docs/repo-docs.ts) |
| Lib overview | [`../lib/README.md`](../lib/README.md) |
| Branded IDs | [`../lib/types/branded/README.md`](../lib/types/branded/README.md) |
| Console depth | [`../lib/console-depth.ts`](../lib/console-depth.ts) |
| Boundary ESLint | [`../config/eslint/plugin-harness/boundary.ts`](../config/eslint/plugin-harness/boundary.ts) |

## Tools (docs / harness)

```bash
bun tools/bun-doc-refs.ts suggest "Bun.secrets"   # Bun API canonical URLs
bun tools/brand-catalog.ts SessionId              # brand discovery
bun tools/branded-id-check.ts --staged --strict   # brand gate (diff)
bun tools/harness-violations.ts --path lib --rule unknown
bun tools/harness-violations.ts --open=3          # Bun.openInEditor
bun run install:verify                            # install / tilde cache
bun run lint:harness                              # eslint harness config
bun run docs:map:check                            # SSOT path + root MD links
```

**Pre-commit:** staging any platform doc SSOT path (root `AGENTS.md` / `README.md` / `STRUCTURE.md` / `.custom-instructions.md`, `docs/{AGENTS,README,UNIFIED,WIRE_BOUNDARY,BUN_NATIVE_CAPABILITIES,DEVELOPMENT-STANDARDS,IMPORT_BOUNDARIES}.md`, `lib/README.md`, `lib/types/branded/README.md`, `lib/docs/repo-docs.ts`, `tools/doc-map-check.ts`) runs `bun tools/doc-map-check.ts` automatically.

## External thesis

- [lopopolo/harness-engineering](https://github.com/lopopolo/harness-engineering)
- [domain-modeling](https://github.com/lopopolo/harness-engineering/blob/trunk/docs/domain-modeling/README.md)
- [Bun docs llms.txt](https://bun.com/docs/llms.txt)

## Not SSOT

- `docs/archives/` — historical reports  
- One-off analysis / council / generated reports under `docs/` unless linked above  
- Nested product docs under `projects/active/**`

When adding a platform policy doc, update this index, root `AGENTS.md` canonical table, and `lib/docs/repo-docs.ts` (`CANONICAL_REPO_DOCS`).
