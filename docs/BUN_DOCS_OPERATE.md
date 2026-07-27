# Bun docs operate

**Northstar:** `lib/docs/token-ref.ts` → `BunToken` export · tools: `tools/bun-doc-refs.ts` · `tools/bun-docs-catalog.ts`

## Day commands

| Intent | Command |
|--------|---------|
| Full refresh | `bun run docs:refresh` — RSS + reference + scrape + catalog + integrity JSONL |
| **Fast refresh (daily)** | `bun run docs:refresh:fast` — llms index + catalog + integrity only |
| Feed indexes only | `bun run docs:refresh:feeds` — conditional GET RSS + `bun.com/reference` |
| Legacy skip scrape | `bun run docs:refresh -- --skip-scrape` — full minus blog scrape |
| Suggest token | `bun tools/bun-doc-refs.ts suggest <token>` — frozen `CANONICAL_REFS` wins; prints guide `example[lang]` code |
| Guide fences | Frozen [`bun-docs-guide-examples.ts`](../tools/bun-docs-guide-examples.ts); scrape via `generate-tokens-from-docs` (`guides` domain) |
| Blog ingestion | `CANONICAL_SOURCES` + [`extract-metadata.ts`](../lib/docs/extract-metadata.ts) · journey `bun test tests/journey/blog-extraction.test.ts` |
| Fetch-page SSOT | [`fetch-page.ts`](../lib/docs/fetch-page.ts) · locus [`runtime/networking/fetch`](https://bun.com/docs/runtime/networking/fetch) · claim `fetch-page-boundaries` · HTML + RSS (Accept override); conditional GET (304) stays bare `fetch` |
| Bundler sidebar nav | `bun tools/bun-doc-refs.ts bundler` · SSOT [`lib/docs/bundler-nav.ts`](../lib/docs/bundler-nav.ts) · gaps [`bundler-gaps.ts`](../lib/docs/bundler-gaps.ts) |
| Bundler anchors / gaps / tokens | `bundler --anchors` · `bundler --gaps [--json] [--strict] [--group=Extensions]` · `bundler --tokens` |
| Integrity | `bun tools/bun-doc-refs.ts integrity` · `--fix` / `--fix-dry` |
| Status | `bun tools/bun-doc-refs.ts status` |
| Catalog export | `bun run docs:catalog:export` |
| Locus | `bun tools/bun-doc-refs.ts locus --depth=20` |
| Reference index | `bun run docs:reference-index` — conditional GET of `bun.com/reference` → `tools/reference-index.json` |
| Docs coverage verify | `bun run verify:docs-coverage:save` — strict gate on tracked catalog/overlay/review tokens → `public/registry/docs-coverage-proof.json` |

Loop: RSS index → reference index → scrape → catalog build → integrity log (`docs:refresh`). **Prefer `docs:refresh:fast`** when only llms.txt / `@see` / catalog entries moved — avoids overlay churn. `verify-all` runs `verify:docs-coverage:save` (reads committed indexes; use `--refresh-rss` / `--refresh-reference` for live fetch).

## Refresh tiers + commit lanes

Catalog (`tools/bun-docs-catalog.json`) is the merged agent artifact; other JSON files are **inputs** with separate cache headers — do not squash into one blob.

| Tier | Command | Typical git commit (if changed) |
|------|---------|----------------------------------|
| **Fast** | `bun run docs:refresh:fast` | `tools/bun-docs-index.json` · `tools/bun-docs-catalog.json` |
| **Feeds** | `bun run docs:refresh:feeds` | `tools/release-index.json` · `tools/reference-index.json` |
| **Scrape** | `bun run docs:refresh` (full) | above + `tools/bun-docs-release-overlay.json` when scrape ran |
| **Proof bake** | `bun run verify:docs-coverage:save` | `public/registry/docs-coverage-proof.json` |

Dry-run step plan: `bun tools/bun-docs-refresh.ts --dry-run --fast`

**Coverage model:** RSS = *what shipped* · reference index = *what exists on bun.com/reference* · `canonical-helpers` = *traceability* · `verify-docs-coverage` = *strict gate on FactoryWager-tracked tokens* (not every generated symbol).

## When integrity fails

1. `status` — staleness / Bun pin
2. `integrity --fix-dry` then `--fix`
3. Fix dead anchors / taxonomy aliases; re-run `docs:refresh:fast` (or full `docs:refresh` if RSS/overlay stale)

Env: `DOC_INTEGRITY_AUTOFIX=1` on schedule path.

Agent entry: root [`AGENTS.md`](../AGENTS.md) § Bun API references · capabilities: [BUN_NATIVE_CAPABILITIES.md](./BUN_NATIVE_CAPABILITIES.md).

Longer command encyclopedia: `git log -- docs/BUN_DOCS_OPERATE.md`.
