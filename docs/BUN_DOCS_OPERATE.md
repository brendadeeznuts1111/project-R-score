# Bun docs operate

**Northstar:** `lib/docs/token-ref.ts` → `BunToken` export · tools: `tools/bun-doc-refs.ts` · `tools/bun-docs-catalog.ts`

## Day commands

| Intent | Command |
|--------|---------|
| Full refresh | `bun run docs:refresh` |
| Suggest token | `bun tools/bun-doc-refs.ts suggest <token>` — frozen `CANONICAL_REFS` wins; prints guide `example[lang]` code |
| Guide fences | Frozen [`bun-docs-guide-examples.ts`](../tools/bun-docs-guide-examples.ts); scrape via `generate-tokens-from-docs` (`guides` domain) |
| Blog ingestion | `CANONICAL_SOURCES` + [`extract-metadata.ts`](../lib/docs/extract-metadata.ts) · journey `bun test tests/journey/blog-extraction.test.ts` |
| Blog codeblocks (JIT) | `bun run docs:blog-codeblocks -- --url https://bun.com/blog/bun-v1.3.6` · `--grep Bun.Archive` · claim `blog-codeblocks-boundaries` |
| Blog examples overlay | `bun run docs:blog-examples` → `tools/bun-docs-blog-examples.json` · merge via `bun run docs:catalog:build -- --derived` |
| Bootstrap one post offline | `bun tools/bun-docs-releases.ts bootstrap tests/fixtures/bun-blog-codeblocks/bun-v1.3.6-archive.html --version=1.3.6` |
| Full refresh + blog examples | `bun run docs:refresh -- --derived` |
| Fetch-page SSOT | [`fetch-page.ts`](../lib/docs/fetch-page.ts) · locus [`runtime/networking/fetch`](https://bun.com/docs/runtime/networking/fetch) · claim `fetch-page-boundaries` · HTML + RSS (Accept override); conditional GET (304) stays bare `fetch` |
| Bundler sidebar nav | `bun tools/bun-doc-refs.ts bundler` · SSOT [`lib/docs/bundler-nav.ts`](../lib/docs/bundler-nav.ts) · gaps [`bundler-gaps.ts`](../lib/docs/bundler-gaps.ts) |
| Bundler anchors / gaps / tokens | `bundler --anchors` · `bundler --gaps [--json] [--strict] [--group=Extensions]` · `bundler --tokens` |
| Integrity | `bun tools/bun-doc-refs.ts integrity` · `--fix` / `--fix-dry` (Coverage block first) |
| Status | `bun tools/bun-doc-refs.ts status` (Coverage formula first) |
| Coverage formula | `bun tools/bun-doc-refs.ts coverage [--json]` · matrix [`bun-prefer-matrix.ts`](../tools/bun-prefer-matrix.ts) · formula [`bun-docs-coverage.ts`](../tools/bun-docs-coverage.ts) · **surface** = version-aware oneliner demos |
| API one-liners | `bun tools/bun-doc-refs.ts oneliners` · `--id=mmap` · `--run file-meta` · `--live` · SSOT [`bun-api-oneliners.ts`](../tools/bun-api-oneliners.ts) (prefer over ad-hoc `bun -e`; no bash `coverage.sh`) |
| Markdown modes | `bun tools/bun-doc-refs.ts markdown [--json]` · [`bun-markdown-modes.ts`](../tools/bun-markdown-modes.ts) · types [reference/bun/markdown](https://bun.com/reference/bun/markdown) |
| Install env | `bun tools/bun-doc-refs.ts install-env [--section=…]` · `install-env get cache-layout` · `suggest "cache-layout"` · [`bun-install-env.ts`](../tools/bun-install-env.ts) · [`UNIFIED.md`](./UNIFIED.md) |
| API index | `bun run docs:api-index` → `tools/bun-api-index.json` (includes `coverage` + surface) |
| Portal icons | `bun run icons:generate` · `bun run icons:verify` · [`generate-portal-icons.ts`](../tools/generate-portal-icons.ts) → `public/icons/` + tenant `iconSrc` |
| DOD evidence | `bun tools/dod-evidence.ts pack\|verify\|similar` · [`lib/dod/evidence.ts`](../lib/dod/evidence.ts) — aHash + sha3 digest + optional HMAC |
| Catalog export | `bun run docs:catalog:export` |
| Locus | `bun tools/bun-doc-refs.ts locus --depth=20` |

Loop: RSS index → scrape (+ blog-examples) → catalog build (`--derived` optional) → integrity log (`docs:refresh`).

## When integrity fails

1. `status` — staleness / Bun pin
2. `integrity --fix-dry` then `--fix`
3. Fix dead anchors / taxonomy aliases; re-run `docs:refresh`

Env: `DOC_INTEGRITY_AUTOFIX=1` on schedule path.

Agent entry: root [`AGENTS.md`](../AGENTS.md) § Bun API references · capabilities: [BUN_NATIVE_CAPABILITIES.md](./BUN_NATIVE_CAPABILITIES.md).

Longer command encyclopedia: `git log -- docs/BUN_DOCS_OPERATE.md`.
