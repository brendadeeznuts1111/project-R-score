# Bun docs operate

**Northstar:** `lib/docs/token-ref.ts` → `BunToken` export · tools: `tools/bun-doc-refs.ts` · `tools/bun-docs-catalog.ts`

## Day commands

| Intent | Command |
|--------|---------|
| Full refresh | `bun run docs:refresh` |
| Suggest token | `bun tools/bun-doc-refs.ts suggest <token>` |
| Integrity | `bun tools/bun-doc-refs.ts integrity` · `--fix` / `--fix-dry` |
| Status | `bun tools/bun-doc-refs.ts status` |
| Catalog export | `bun run docs:catalog:export` |
| Locus | `bun tools/bun-doc-refs.ts locus --depth=20` |

Loop: RSS index → scrape → catalog build → integrity log (`docs:refresh`).

## When integrity fails

1. `status` — staleness / Bun pin
2. `integrity --fix-dry` then `--fix`
3. Fix dead anchors / taxonomy aliases; re-run `docs:refresh`

Env: `DOC_INTEGRITY_AUTOFIX=1` on schedule path.

Agent entry: root [`AGENTS.md`](../AGENTS.md) § Bun API references · capabilities: [BUN_NATIVE_CAPABILITIES.md](./BUN_NATIVE_CAPABILITIES.md).

Longer command encyclopedia: `git log -- docs/BUN_DOCS_OPERATE.md`.
