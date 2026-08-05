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
| Feed indexes | `bun run docs:feeds:refresh` — conditional GET RSS + `bun.com/reference` → `tools/bun-docs-feeds.json` |
| Docs coverage verify | `bun run verify:docs-coverage:save` — strict gate on tracked catalog/overlay/review tokens → `public/registry/docs-coverage-proof.json` |

Loop: RSS index → reference index → scrape → catalog build → integrity log (`docs:refresh`). **Prefer `docs:refresh:fast`** when only llms.txt / `@see` / catalog entries moved — avoids overlay churn. `verify-all` runs `verify:docs-coverage:save` (reads committed indexes; use `--refresh-rss` / `--refresh-reference` for live fetch).

## Refresh tiers + commit lanes

Path SSOT: [`lib/docs/docs-artifact-paths.ts`](../lib/docs/docs-artifact-paths.ts). Daily agent SSOT is **index + catalog**; feeds are one merged file; overlay/supplement are build caches under `tools/.cache/` (gitignored).

| Tier | Command | Typical git commit (if changed) |
|------|---------|----------------------------------|
| **Fast** | `bun run docs:refresh:fast` | `tools/bun-docs-index.json` · `tools/bun-docs-catalog.json` |
| **Feeds** | `bun run docs:refresh:feeds` | `tools/bun-docs-feeds.json` |
| **Scrape** | `bun run docs:refresh` (full) | feeds + catalog (`releaseHits` embedded at build; overlay stays in cache) |
| **Proof bake** | `bun run verify:docs-coverage:save` | `public/registry/docs-coverage-proof.json` |

Migrate legacy split indexes once: `bun run docs:feeds:migrate` (or `bun tools/bun-docs-feeds.ts --migrate-legacy`)

Dry-run step plan: `bun tools/bun-docs-refresh.ts --dry-run --fast`

**Coverage model:** RSS indexes Bun blog/release content (*what shipped*) and is
the docs-ingestion feed. GitHub release Atom and `oven-sh/bun` main-tip metadata
are separate channel-governance observations, not documentation bakes or
automatic promotion authority; see
[`bun-channel-governance.md`](./design/bun-channel-governance.md). The reference
index records *what exists on bun.com/reference*, `canonical-helpers` provides
traceability, and `verify-docs-coverage` gates FactoryWager-tracked tokens (not
every generated symbol).

**Terminal / PTY north-star (three planes):** guide [`child-process#terminal-pty-support`](https://bun.com/docs/runtime/child-process#terminal-pty-support) · reference [`/reference/bun/Terminal`](https://bun.com/reference/bun/Terminal) · types [`packages/bun-types`](https://github.com/oven-sh/bun/tree/main/packages/bun-types). Host TTY (`process.stdout.isTTY`) is not `Bun.Terminal`. Factory helpers: [`lib/terminal.ts`](../lib/terminal.ts). After curated path edits prefer `bun run docs:catalog:build` (notes etag cache) — not `docs:refresh:fast` (llms index re-fetches every page).

## When integrity fails

1. `status` — staleness / Bun pin
2. `integrity --fix-dry` then `--fix`
3. Fix dead anchors / taxonomy aliases; re-run `docs:refresh:fast` (or full `docs:refresh` if RSS/overlay stale)

Env: `DOC_INTEGRITY_AUTOFIX=1` on schedule path.

Agent entry: root [`AGENTS.md`](../AGENTS.md) § Bun API references · capabilities: [BUN_NATIVE_CAPABILITIES.md](./BUN_NATIVE_CAPABILITIES.md).

Longer command encyclopedia: `git log -- docs/BUN_DOCS_OPERATE.md`.
