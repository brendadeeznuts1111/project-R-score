# Bun release contracts

This package turns official Bun release posts into deterministic adoption
inventories. It does not generate `test.todo()` placeholders and does not count
planned announcements as executable coverage.

```bash
# Root entry (allowlist + cliOut dual-mode; preferred for operators/agents)
bun run bun:release-contracts -- v1.3.14
bun run bun:release-contracts -- latest --check
bun run bun:release-contracts -- --all --since v1.3.0 --limit 10 --json

# Package-local aliases
bun --filter @factorywager/bun-release-contracts generate
bun --filter @factorywager/bun-release-contracts generate v1.3.14
bun --filter @factorywager/bun-release-contracts generate:latest
bun --filter @factorywager/bun-release-contracts generate:all --since v1.3.0 --limit 10
bun --filter @factorywager/bun-release-contracts check v1.3.14
bun --filter @factorywager/bun-release-contracts check:offline
bun --filter @factorywager/bun-release-contracts test
```

Unknown long options are guarded via
`ALLOWED_LONG_REGISTRY['bun:release-contracts']` (`--json` for machine
summaries). Against an unreleased Bun PR build use the upstream helper — do
**not** invent `bunx-pr`:

```bash
bunx bun-pr <pr>                 # fetch oven-sh/bun PR build as bun-<pr>
bun run bun:pr:verify -- <pr>    # run repo proofs on that build
```

Inventories are written to `contracts/bun-v<version>.json`;
`contracts/index.json` aggregates release, planned, and executable counts. Batch
generation fetches at most four posts at once by default (`--concurrency`,
capped at eight). `--limit` applies only to `--all`; `latest` always selects
exactly one release.

Generation is two-phase. Every selected post is fetched, parsed, and validated,
then the future aggregate index is validated before any contract output is
written. Changed files are staged on the same filesystem, inventories are
installed first, and `index.json` is installed last as the batch commit marker.
An output lock serializes publishers, and a failed commit restores every target
from its staged backup. Check mode performs the same validation but never
writes.

The publisher targets the repository's supported macOS and Linux operator/CI
environments. Its atomic same-filesystem moves, cleanup, and real-path checks
use argv-safe `Bun.spawn` calls to the platform `mv`, `rm`, and `realpath`
utilities; native Windows is not currently supported.

Each new announcement starts with `status: "planned"` and `testPath: null`.
After adding a real assertion, change it to `status: "covered"` and record a
repository-relative `testPath`. Regeneration preserves that adoption metadata by
announcement identity and fails if a covered test path is missing or escapes the
repository. Stable item keys no longer depend on list order, so an upstream
insertion does not renumber every contract.

The executable release gate remains the root `test:bun:release-contracts`
script. Inventory counts and executable test counts must always be reported
separately.

`bun run bun:release-contracts:check` is the deterministic CI gate. It does not
fetch release pages. It validates covered test paths, canonical inventory bytes,
and the aggregate `contracts/index.json` before the release-knowledge gate runs.

## Release example knowledge

The package also turns the official `text/markdown` release representation into
a strict, searchable example artifact. Committed artifacts live under
[`knowledge/`](knowledge/) (currently Bun v1.3.14 and Bun v1.4.0). Each example
keeps a stable content ID, section slot, source line, exact code, catalog APIs,
official docs links, RSS publication timestamp, dependencies, stability, and
explicit setup requirements.

Harvesting and normalization are deliberately separate. Download the official
Markdown, then build against the repository's committed docs catalog and RSS
feed:

```bash
curl -fsSL https://bun.com/blog/bun-v1.4.md -o /tmp/bun-v1.4.0.md
bun run bun:release-knowledge -- build /tmp/bun-v1.4.0.md --version 1.4.0
bun run bun:release-knowledge -- build /tmp/bun-v1.4.0.md --version 1.4.0 --check
```

The offline gate validates the full recursive shape, deterministic IDs,
canonical source identity, exact committed RSS publication provenance, semantic
metadata, sorted/unique arrays, source ordering, setup/runnable consistency,
duplicate IDs and slots, and derived counts without network access:

Schema v2 also materializes a structural release AST. Its document, heading,
code-block, and asset nodes carry branded stable IDs, source ranges, parent and
child IDs, fence/directive metadata, and exact code-block → example links. Media
found only in the HTML plane stays in the asset manifest instead of being
invented as a Markdown node; the Bun 1.4 capability test proves both planes join
to the complete asset and behavior inventories.

```bash
bun run bun:release-knowledge:check
```

For extracted-versus-normalized proof, provide the official Markdown used by the
build. Validation rebuilds the expected artifact with the committed catalog and
reports every field that drifted. Reports support human tables, JSON, and JUnit
XML:

```bash
bun run bun:release-knowledge -- validate packages/bun-release-contracts/knowledge/bun-v1.3.14.json --source /tmp/bun-v1.3.14.md
bun run bun:release-knowledge -- validate --version 1.3.14 --report=json
bun run bun:release-knowledge -- validate-all --report=json
bun run bun:release-knowledge -- validate-all --report=junit > reports/bun-release-knowledge.xml
```

`BUN_RELEASE_KNOWLEDGE_STRICT=true` treats warnings as failures.
`BUN_RELEASE_KNOWLEDGE_MAX_WARNINGS=<n>` sets the non-strict warning budget
(default `10`); the equivalent CLI controls are `--strict` and `--max-warnings`.
The build path runs the same semantic validator before it can write a normalized
artifact, and `bun:ci` runs `validate-all`.

Query, adoption, and release-diff surfaces read the same artifact:

```bash
bun run bun:release-knowledge -- query packages/bun-release-contracts/knowledge/bun-v1.3.14.json "resize image"
bun run bun:release-knowledge -- matrix packages/bun-release-contracts/knowledge/bun-v1.3.14.json
bun run bun:release-knowledge -- diff previous.json current.json --json
```

`runnable: true` means static normalization found no setup requirement. It is
not executable coverage. Harvested snippets are never wrapped in generated tests
or run automatically; adoption becomes executable only through the existing
release inventory's `covered` test-path contract.

## Feed and blog URL SSOT

| Plane    | Config / URL                                                         | Role                                     |
| -------- | -------------------------------------------------------------------- | ---------------------------------------- |
| **RSS**  | `config/bun-channels.toml` `sources.rss` → `https://bun.com/rss.xml` | Dated feed for release-post discovery    |
| **Blog** | `sources.blog` → `https://bun.com/blog` (HTML index)                 | Marketing surface — not the release feed |

Channel `<item>` extraction is shared:

| Layer                       | Owner                                                                                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| RSS items                   | [`lib/docs/bun-rss.ts`](../../lib/docs/bun-rss.ts) `parseRssChannelItems`                                                                    |
| Version + marketing URL     | [`lib/docs/bun-blog-url.ts`](../../lib/docs/bun-blog-url.ts) (`versionFromBunBlogUrl`, `blogUrlForReleaseVersion`, `canonicalizeBunBlogUrl`) |
| URLPattern build / patterns | [`lib/docs/bun-site-url.ts`](../../lib/docs/bun-site-url.ts) (`bunBlog`, `BunReleaseBlogPattern`, `BunReleaseNotesBlogPattern`)              |
| This package feed API       | [`src/feed.ts`](src/feed.ts) `parseReleaseFeed` / `fetchReleaseFeed`                                                                         |

Marketing posts use `/blog/bun-vX.Y` (patch `0`); sitemap
`/blog/release-notes/bun-vX.Y.Z` locs canonicalize to the same marketing URL
before inventories or knowledge artifacts store them.

## Bun 1.4.0 behavior proofs

Breaking-change identity comes from the reconciled
[Bun 1.4 tracker](https://github.com/oven-sh/bun/issues/28792), not from a test
file's presence. The tracker's **Under consideration** section did not ship. The
release inventory marks a row `covered` only when its assigned suite makes an
exact assertion; environment-only and partial probes remain `planned`.

Safe in-process release contracts for Other behavior, Bug fixes, and
Observability live at the repo root (not generated by this package):

- [`tests/bun-1.4.0-behavior-contract.test.ts`](../../tests/bun-1.4.0-behavior-contract.test.ts)
- [`tests/bun-1.4.0-breaking-changes-contract.test.ts`](../../tests/bun-1.4.0-breaking-changes-contract.test.ts)
- [`tests/bun-1.4.0-bugfix-contract.test.ts`](../../tests/bun-1.4.0-bugfix-contract.test.ts)
- [`tests/bun-1.4.0-observability-contract.test.ts`](../../tests/bun-1.4.0-observability-contract.test.ts)
- Install/PM tempdir cases:
  [`tests/bun-1.4.0-install-behavior-contract.test.ts`](../../tests/bun-1.4.0-install-behavior-contract.test.ts)

Inventory announcements remain under
[`contracts/bun-v1.4.0.json`](contracts/bun-v1.4.0.json); the tests prove a
high-signal subset, not all ~2,900 Bug fixes rows.
