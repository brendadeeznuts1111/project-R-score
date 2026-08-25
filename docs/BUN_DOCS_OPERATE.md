# Bun docs operate

Four official-docs research planes — keep them separate. Do not collapse
“token/catalog” or “blog/RSS” into one channel.

| Plane       | Owns                                                                                                                                   | Does not own                                      |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Token**   | `TokenRef` → `BunToken` · `bun-doc-refs` suggest / check / history / `@see` · [`README-token-ref.md`](../lib/docs/README-token-ref.md) | Materialized bake (`tools/bun-docs-catalog.json`) |
| **Catalog** | Index + catalog bake · `docs:catalog:*` · `tools/bun-docs-catalog.ts` · coverage against catalog names                                 | Agent export contract (`BunToken`)                |
| **Blog**    | Marketing HTML URLs · scrape / canonicalize ([`bun-blog-url.ts`](../lib/docs/bun-blog-url.ts))                                         | Dated feed items                                  |
| **RSS**     | Dated release feed ([`bun-rss.ts`](../lib/docs/bun-rss.ts) · `config/bun-channels.toml` `sources.rss`)                                 | Blog index HTML                                   |

Pin ↔ tip **type inventory** is a fifth pipeline (not these planes):
[`design/bun-types-inventory.md`](./design/bun-types-inventory.md).

The versioned **Bun 1.4 release graph** is another repository projection, not an
official-docs authority. Its manifest, capability relations, feeds, and
content-addressed snapshots are owned by
[`BUN_1_4_CHANNEL_LIFECYCLE.md`](./BUN_1_4_CHANNEL_LIFECYCLE.md). A graph record
proves local adoption only when its `adoption` value and `contractFiles` satisfy
that contract; its presence alone proves only release-note coverage.

## Day commands

### Token plane

| Intent                    | Command                                                                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Suggest token             | `bun tools/bun-doc-refs.ts suggest <token>` — frozen `CANONICAL_REFS` wins; prints guide `example[lang]` code                                               |
| Source `@see` gate        | `bun tools/bun-doc-refs.ts check <paths...>` · `--json` for file/line/column; missing / unsupported / empty / unreadable / malformed fail closed            |
| Missing-reference backlog | `bun tools/bun-doc-refs.ts backlog [--json] [--limit=N] [--max=N] <paths...>` · `--write` needs explicit targets, positive limit ≤ 100, compact `@see` only |
| Runtime API drift         | `bun run bun:api-drift:check` — executable static `Bun.*` / `"bun"` value imports vs installed runtime (not forward `bun-types`)                            |
| API history               | `bun tools/bun-doc-refs.ts history <api> [--json]` — version, publication date, evidence                                                                    |
| Provenance gate           | `bun run docs:provenance:check` · `--json` · `--require-release` fails APIs without attested introduction                                                   |
| Bundler sidebar           | `bun tools/bun-doc-refs.ts bundler` · [`bundler-nav.ts`](../lib/docs/bundler-nav.ts) · gaps [`bundler-gaps.ts`](../lib/docs/bundler-gaps.ts)                |
| Bundler anchors / gaps    | `bundler --anchors` · `bundler --gaps [--json] [--strict] [--group=Extensions]` · `bundler --tokens`                                                        |
| Integrity                 | `bun tools/bun-doc-refs.ts integrity` · `--fix` / `--fix-dry`                                                                                               |
| Status                    | `bun tools/bun-doc-refs.ts status`                                                                                                                          |
| Locus                     | `bun tools/bun-doc-refs.ts locus --depth=20`                                                                                                                |

### Catalog plane

| Intent                    | Command                                                                                                                                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full refresh              | `bun run docs:refresh` — RSS + reference + scrape + catalog + integrity JSONL                                                                                                                                   |
| Fast refresh (daily)      | `bun run docs:refresh:fast` — llms index + catalog + integrity only                                                                                                                                             |
| Feed indexes only         | `bun run docs:refresh:feeds` — conditional GET RSS + `bun.com/reference`                                                                                                                                        |
| Legacy skip scrape        | `bun run docs:refresh -- --skip-scrape` — full minus blog scrape                                                                                                                                                |
| Guide fences              | Frozen [`bun-docs-guide-examples.ts`](../tools/bun-docs-guide-examples.ts); scrape via `generate-tokens-from-docs` (`guides` domain)                                                                            |
| Catalog export            | `bun run docs:catalog:export`                                                                                                                                                                                   |
| Feed indexes              | `bun run docs:feeds:refresh` → `tools/bun-docs-feeds.json`                                                                                                                                                      |
| Curated demo verification | `bun run docs:api-verify:check` — runnable oneliners + installed `bun-types` + official llms / reference / release-feed / source / runtime evidence                                                             |
| Docs coverage verify      | `bun run verify:docs-coverage:save` → `public/registry/docs-coverage-proof.json`                                                                                                                                |
| Unreleased Bun PR verify  | `bunx bun-pr <pr>` → `bun run bun:pr:verify <pr>` · [`bun-pr-verify.ts`](../tools/bun-pr-verify.ts) · [download PR builds](https://bun.com/docs/project/contributing#download-release-build-from-pull-requests) |

### Blog plane

| Intent         | Command                                                                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Blog ingestion | `CANONICAL_SOURCES.blog` + [`extract-metadata.ts`](../lib/docs/extract-metadata.ts) · `bun test tests/journey/blog-extraction.test.ts`          |
| Blog URL shape | [`bun-site-url.ts`](../lib/docs/bun-site-url.ts) · [`bun-blog-url.ts`](../lib/docs/bun-blog-url.ts) (marketing vs `release-notes` canonicalize) |

### RSS plane

| Intent          | Command                                                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| RSS feed shape  | `CANONICAL_SOURCES.rss` + [`bun-rss.ts`](../lib/docs/bun-rss.ts) `parseRssChannelItems` · URL in `config/bun-channels.toml` `sources.rss`           |
| Fetch-page SSOT | [`fetch-page.ts`](../lib/docs/fetch-page.ts) · claim `fetch-page-boundaries` · HTML + RSS Accept override; conditional GET (304) stays bare `fetch` |

### Bun 1.4 release graph

| Intent                  | Command / owner                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Source and asset check  | `bun run docs:blog-assets:check` · [`bun-1.4-assets.json`](../public/registry/bun-1.4-assets.json)                                      |
| Capability shape        | [`bun-1.4-capabilities.json`](../public/registry/bun-1.4-capabilities.json) · `bun test tests/bun-1.4-capabilities.test.ts`             |
| Feed and snapshot check | `bun run channels:bun-1.4:check` · [`bun-1.4-channel-release.json`](../public/registry/bun-1.4-channel-release.json)                    |
| Project ownership map   | `bun run channels:projects:check` · [`project-rss-channels.json`](../public/registry/project-rss-channels.json)                         |
| Lifecycle and removal   | [`BUN_1_4_CHANNEL_LIFECYCLE.md`](./BUN_1_4_CHANNEL_LIFECYCLE.md) · active projection first, content-addressed archive before retirement |
| Media rights and delivery | [`BUN_1_4_MEDIA_RIGHTS.md`](./BUN_1_4_MEDIA_RIGHTS.md) · external source URLs by default; vendor only with reviewed approval |

Do not copy the capability list into docs or skills. Point to the registry and
retain the five adoption states; only `integrated` and `contract` carry local
executable contract evidence.

Loop: RSS index → reference index → scrape → **catalog** build → integrity log
(`docs:refresh`). Token plane consumes the catalog via adapters; it does not
rebuild it. Prefer `docs:refresh:fast` when only llms.txt / `@see` / catalog
entries moved. `verify-all` runs `verify:docs-coverage:save` (committed indexes;
`--refresh-rss` / `--refresh-reference` for live fetch). Official discovery:
`llms.txt` is the complete page index; `guides.md` is landing/example only
(`verify:guides`). Neither index satisfies an API `@see` — resolve
`/docs/...#anchor` or `/reference/...` through `bun-doc-refs.ts` (token plane).

## Authority versus materialization

Bun's official surfaces are the authority: `bun.com/docs/llms.txt` for docs
discovery, `bun.com/reference` for generated API reference, `oven-sh/bun` for
source and `packages/bun-types`, and `bun.com/rss.xml` for dated release
history. Repository JSON is never an authority. It is a checked-in,
deterministic materialization fetched by the refresh commands above so CI can
verify the same bytes offline instead of changing with the network mid-run. The
proof records SHA-256 digests of those exact materialized bytes.

`lib/docs/bun-official-sources.ts` is the path-free authority validator. It
rejects materializations whose embedded source identity is not the matching
official Bun surface. `lib/docs/bun-source-snapshots.ts` is the replaceable
repository adapter; all materialization locations come from
`lib/docs/docs-artifact-paths.ts`. Verification logic must not embed those
locations. Refresh commands perform live official-source ingestion; proof
commands consume the deterministic result.

`docs:api-verify:check` does not claim full Bun API coverage. Its population is
the unique token set named by runnable entries in `bun-api-oneliners.ts` and
`bun-ops-oneliners.ts`. `CANONICAL_REFS` supplies a candidate URL, then the
verifier independently requires that URL to resolve through the official docs or
reference index. Declaration evidence is the SHA-256 of the exact installed
official `bun-types` `.d.ts` bundle and links to that package's exact release
tag or tip revision. The running Bun binary is linked to its exact upstream
commit. RSS is recorded as the release-history provenance plane; it does not by
itself prove that an API exists. The deep pin/tip shape inventory remains the
separate `bun:types-inventory:*` pipeline.

The source gate parses JavaScript and TypeScript syntax rather than searching
raw text. It resolves global, namespace, named, aliased, dynamic, `require`, and
type-position Bun references; ignores comments, template examples, shadowed
locals, dependency trees, and generated output directories; and reports the
first source location plus occurrence count for each missing API-specific
reference. `Bun.Image` is enforced at member granularity across namespace,
named-import, and destructured constructor aliases; typed or assigned image
bindings; `Blob`/`BunFile`/`S3File.image()` starts; and dot or computed fluent
chains. Symbol checks keep shadowed `Blob` constructors and unrelated `.image()`
methods out of the results. `check --json` emits a versioned contract with a
finding count, affected-file count, and structured errors while retaining the
nonzero gate status. `annotate --write` uses the same scanner, so parser or
target errors stop before any file is rewritten. Findings and inserted headers
include the known release and update timeline. When introduction history is
absent, the tool emits a separately labeled `@verified` record instead of
inventing a release version or date.

## Release and update provenance

Every recorded `releasedIn`, `fixedIn`, or `changedIn` value is joined to the
matching entry in [`bun-docs-feeds.json`](../tools/bun-docs-feeds.json). The RSS
`pubDate` becomes the event date and that version's Bun blog URL becomes the
primary evidence reference. Inventories store the **marketing** blog form
(`https://bun.com/blog/bun-v1.4`); sitemap `release-notes` locs are accepted on
ingest and rewritten via `canonicalizeBunBlogUrl`. If a version has no indexed
Bun post, the tool can retain the version-specific official GitHub release URL,
but `docs:provenance:check` fails until a publication date is available. Patch
evidence is exact: an event for `1.3.99` cannot borrow the date or post for
`1.3.0`. Both `docs:catalog:verify` and `docs:provenance:check` compare every
scalar event and every embedded `releaseHits` row with the matching RSS version,
publication timestamp, and URL.

The Bun-native XML shape is owned by [`BUN_XML.md`](./BUN_XML.md), grounded in
the official Bun 1.4 guide/reference and direct runtime contract tests. RSS XML
semantics are owned separately by
[`RSS_XML_CONTRACT.md`](./RSS_XML_CONTRACT.md). RSS XML is parsed strictly
through [`lib/docs/bun-rss.ts`](../lib/docs/bun-rss.ts) (`parseRssChannelItems`)
with `Bun.XML`; malformed XML and invalid RSS roots fail closed. Callers map
items into release-index rows (`tools/bun-docs-releases.ts`), release-contract
feed entries (`packages/bun-release-contracts`), or MCP blog notes
(`tools/bun-docs-mcp-lib.ts`) — do not add a fourth Bun.XML channel walk.

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
**catalog** SSOT is **index + catalog**; the **token** plane reads that bake
through adapters. Feeds are one merged file; overlay/supplement are build caches
under `tools/.cache/` (gitignored).

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
capabilities: [BUN_NATIVE_CAPABILITIES.md](./BUN_NATIVE_CAPABILITIES.md) ·
channel governance:
[`design/bun-channel-governance.md`](./design/bun-channel-governance.md) ·
profiling (cpu/heap markdown):
[`harness/tenants/bun-bench-profiling.md`](./harness/tenants/bun-bench-profiling.md)
· Mintlify heap-md locus SSOT:
[`lib/docs/benchmarking-profile-loci.ts`](../lib/docs/benchmarking-profile-loci.ts)
· `bun test tests/bun-benchmarking-profile-loci.test.ts` · Observability
contracts: `bun test tests/bun-1.4.0-observability-contract.test.ts`.

Longer command encyclopedia: `git log -- docs/BUN_DOCS_OPERATE.md`.
