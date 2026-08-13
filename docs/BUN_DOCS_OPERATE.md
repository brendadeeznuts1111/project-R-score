# Bun docs operate

**Northstar:** `lib/docs/token-ref.ts` → `BunToken` export · tools:
`tools/bun-doc-refs.ts` · `tools/bun-docs-catalog.ts`

Pin ↔ tip **type inventory** (committed `tools/bun-types-inventory.json`,
`.cache/bun-types-*` reports) is a **separate** pipeline — see
[`design/bun-types-inventory.md`](./design/bun-types-inventory.md).

## Day commands

| Intent                              | Command                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full refresh                        | `bun run docs:refresh` — RSS + reference + scrape + catalog + integrity JSONL                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Fast refresh (daily)**            | `bun run docs:refresh:fast` — llms index + catalog + integrity only                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Feed indexes only                   | `bun run docs:refresh:feeds` — conditional GET RSS + `bun.com/reference`                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Legacy skip scrape                  | `bun run docs:refresh -- --skip-scrape` — full minus blog scrape                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Suggest token                       | `bun tools/bun-doc-refs.ts suggest <token>` — frozen `CANONICAL_REFS` wins; prints guide `example[lang]` code                                                                                                                                                                                                                                                                                                                                                                                     |
| Source `@see` gate                  | `bun tools/bun-doc-refs.ts check <paths...>` · add `--json` for stable file/line/column findings; explicit missing, unsupported, empty, unreadable, or malformed targets fail closed                                                                                                                                                                                                                                                                                                              |
| API release/update history          | `bun tools/bun-doc-refs.ts history <api> [--json]` — version, official publication date, and version-specific evidence                                                                                                                                                                                                                                                                                                                                                                            |
| Provenance gate                     | `bun run docs:provenance:check` · add `--json`; `--require-release` additionally fails APIs whose introduction release is not yet attested                                                                                                                                                                                                                                                                                                                                                        |
| Guide fences                        | Frozen [`bun-docs-guide-examples.ts`](../tools/bun-docs-guide-examples.ts); scrape via `generate-tokens-from-docs` (`guides` domain)                                                                                                                                                                                                                                                                                                                                                              |
| Blog ingestion                      | `CANONICAL_SOURCES` + [`extract-metadata.ts`](../lib/docs/extract-metadata.ts) · journey `bun test tests/journey/blog-extraction.test.ts`                                                                                                                                                                                                                                                                                                                                                         |
| Fetch-page SSOT                     | [`fetch-page.ts`](../lib/docs/fetch-page.ts) · locus [`runtime/networking/fetch`](https://bun.com/docs/runtime/networking/fetch) · claim `fetch-page-boundaries` · HTML + RSS (Accept override); conditional GET (304) stays bare `fetch`                                                                                                                                                                                                                                                         |
| Bundler sidebar nav                 | `bun tools/bun-doc-refs.ts bundler` · SSOT [`lib/docs/bundler-nav.ts`](../lib/docs/bundler-nav.ts) · gaps [`bundler-gaps.ts`](../lib/docs/bundler-gaps.ts)                                                                                                                                                                                                                                                                                                                                        |
| Bundler anchors / gaps / tokens     | `bundler --anchors` · `bundler --gaps [--json] [--strict] [--group=Extensions]` · `bundler --tokens`                                                                                                                                                                                                                                                                                                                                                                                              |
| Integrity                           | `bun tools/bun-doc-refs.ts integrity` · `--fix` / `--fix-dry`                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Status                              | `bun tools/bun-doc-refs.ts status`                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Catalog export                      | `bun run docs:catalog:export`                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Locus                               | `bun tools/bun-doc-refs.ts locus --depth=20`                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Feed indexes                        | `bun run docs:feeds:refresh` — conditional GET RSS + `bun.com/reference` → `tools/bun-docs-feeds.json`                                                                                                                                                                                                                                                                                                                                                                                            |
| Docs coverage verify                | `bun run verify:docs-coverage:save` — strict gate on tracked catalog/overlay/review tokens → `public/registry/docs-coverage-proof.json`                                                                                                                                                                                                                                                                                                                                                           |
| Verify against an unreleased Bun PR | `bunx bun-pr <pr>` (downloads PR release build as `bun-<pr>` on PATH) → `bun run bun:pr:verify <pr>` — runs `bun-api-verify` · `verify-bun-runtime-nits` · `verify-bun-release` against the PR build · `--diff` deep-compares proof artifacts vs installed Bun · `--proof api\|runtime\|release\|all` · `--json` · [`bun-pr-verify.ts`](../tools/bun-pr-verify.ts) · [Bun contributing § download PR builds](https://bun.com/docs/project/contributing#download-release-build-from-pull-requests) |

Loop: RSS index → reference index → scrape → catalog build → integrity log
(`docs:refresh`). **Prefer `docs:refresh:fast`** when only llms.txt / `@see` /
catalog entries moved — avoids overlay churn. `verify-all` runs
`verify:docs-coverage:save` (reads committed indexes; use `--refresh-rss` /
`--refresh-reference` for live fetch).

The source gate parses JavaScript and TypeScript syntax rather than searching
raw text. It resolves global, namespace, named, aliased, dynamic, `require`, and
type-position Bun references; ignores comments, template examples, shadowed
locals, dependency trees, and generated output directories; and reports the
first source location plus occurrence count for each missing API-specific
reference. `check --json` emits a versioned contract with a finding count,
affected-file count, and structured errors while retaining the nonzero gate
status. `annotate --write` uses the same scanner, so parser or target errors
stop before any file is rewritten. Findings and inserted headers include the
known release and update timeline. When introduction history is absent, the tool
emits a separately labeled `@verified` record instead of inventing a release
version or date.

## Release and update provenance

Every recorded `releasedIn`, `fixedIn`, or `changedIn` value is joined to the
matching entry in [`bun-docs-feeds.json`](../tools/bun-docs-feeds.json). The RSS
`pubDate` becomes the event date and that version's Bun blog URL becomes the
primary evidence reference. If a version has no indexed Bun post, the tool can
retain the version-specific official GitHub release URL, but
`docs:provenance:check` fails until a publication date is available. Patch
evidence is exact: an event for `1.3.99` cannot borrow the date or post for
`1.3.0`. Both `docs:catalog:verify` and `docs:provenance:check` compare every
scalar event and every embedded `releaseHits` row with the matching RSS version,
publication timestamp, and URL.

The scraper reads the merged feed directly; a gitignored legacy
`release-index.json` is not a clean-worktree prerequisite. It parses nested
`h2`–`h4` context and classifies individual headings, paragraphs, and list
items. A generic “Bun APIs” or changelog section is attestation context, not
proof that every mentioned API shipped in that release. Bugfix and change
context is inherited by nested headings.

An introduction is promoted only when release language binds to the exact
catalog token. Prefixes do not count (`Bun.markdown.ansi` cannot release
`Bun.markdown`, and `--compile-exec-argv` cannot release `--compile`), additions
to methods/options/properties are updates to the parent API, constructor syntax
such as `new Bun.Terminal()` is not by itself an introduction claim, and
retrospective phrases such as “last month” are rejected. Each scraped
`releaseHits` event retains its token-local `evidence` excerpt, parent
`section`, official post URL, version, and RSS publication timestamp.
`history --json` exposes those fields; human output prints the evidence below
each event.

Persisted feed and overlay data are validated before use: counts must match,
versions and post URLs must agree, timestamps must be canonical ISO-8601, and
duplicate versions, GUIDs, or token entries are rejected. Incremental scraping
also fails closed when its state says posts were processed but the corresponding
overlay is missing or empty. Recover that state with a deliberate full rebuild:
`bun tools/bun-docs-releases.ts scrape --force`; do not silently continue from
an incomplete cache. The committed catalog is equally strict: verification reads
its stored runtime pin, URLs, count, and entries as-is. It does not manufacture
absent metadata from the active Bun runtime, and normalized duplicate token
names fail the gate.

`verifiedOn` and `lastUpdated` answer a different question: which Bun runtime
and docs snapshot the catalog was checked against. They must never be used as an
API introduction date. Consequently, an API may be verified and fully documented
while its release remains explicitly `release-unknown`. Run
`provenance-check --require-release` only as a deliberate completeness ratchet;
the ordinary gate enforces evidence integrity for every history event already
recorded without fabricating unresearched history.

## Refresh tiers + commit lanes

Path SSOT:
[`lib/docs/docs-artifact-paths.ts`](../lib/docs/docs-artifact-paths.ts). Daily
agent SSOT is **index + catalog**; feeds are one merged file; overlay/supplement
are build caches under `tools/.cache/` (gitignored).

| Tier           | Command                             | Typical git commit (if changed)                                           |
| -------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| **Fast**       | `bun run docs:refresh:fast`         | `tools/bun-docs-index.json` · `tools/bun-docs-catalog.json`               |
| **Feeds**      | `bun run docs:refresh:feeds`        | `tools/bun-docs-feeds.json`                                               |
| **Scrape**     | `bun run docs:refresh` (full)       | feeds + catalog (`releaseHits` embedded at build; overlay stays in cache) |
| **Proof bake** | `bun run verify:docs-coverage:save` | `public/registry/docs-coverage-proof.json`                                |

Migrate legacy split indexes once: `bun run docs:feeds:migrate` (or
`bun tools/bun-docs-feeds.ts --migrate-legacy`)

Dry-run step plan: `bun tools/bun-docs-refresh.ts --dry-run --fast`

**Coverage model:** RSS indexes Bun blog/release content (_what shipped_) and is
the docs-ingestion feed. GitHub release Atom and `oven-sh/bun` main-tip metadata
are separate channel-governance observations, not documentation bakes or
automatic promotion authority; see
[`bun-channel-governance.md`](./design/bun-channel-governance.md). The reference
index records _what exists on bun.com/reference_, `canonical-helpers` provides
traceability, and `verify-docs-coverage` gates FactoryWager-tracked tokens (not
every generated symbol).

**Terminal / PTY north-star (three planes):** guide
[`child-process#terminal-pty-support`](https://bun.com/docs/runtime/child-process#terminal-pty-support)
· reference [`/reference/bun/Terminal`](https://bun.com/reference/bun/Terminal)
· types
[`packages/bun-types`](https://github.com/oven-sh/bun/tree/main/packages/bun-types).
Host TTY (`process.stdout.isTTY`) is not `Bun.Terminal`. Factory helpers:
[`lib/terminal.ts`](../lib/terminal.ts). After curated path edits prefer
`bun run docs:catalog:build` (notes etag cache) — not `docs:refresh:fast` (llms
index re-fetches every page).

## When integrity fails

1. `status` — staleness / Bun pin
2. `integrity --fix-dry` then `--fix`
3. Fix dead anchors / taxonomy aliases; re-run `docs:refresh:fast` (or full
   `docs:refresh` if RSS/overlay stale)

Env: `DOC_INTEGRITY_AUTOFIX=1` on schedule path.

Agent entry: root [`AGENTS.md`](../AGENTS.md) § Bun API references ·
capabilities: [BUN_NATIVE_CAPABILITIES.md](./BUN_NATIVE_CAPABILITIES.md).

Longer command encyclopedia: `git log -- docs/BUN_DOCS_OPERATE.md`.
