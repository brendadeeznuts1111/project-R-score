# Bun 1.4 channel lifecycle

The Bun 1.4 asset manifest is the source contract. The capability registry,
portal, and four Bun.XML RSS feeds are derived projections.

This is a versioned release projection, not a general RSS ingestion service or
an odds/channel runtime. It does not imply a SQLite feed registry, polling,
proxying, replay endpoints, MP4 transcoding, WebSocket delivery, or enabled
HTTP/3. Add any such system as its own owned design and runtime contract.

Breaking-behavior and upgrade evidence is owned by
[`BUN_1_4_MIGRATION.md`](./BUN_1_4_MIGRATION.md). The registry stores those
sources once under `migration`; release-note anchors remain capability-local.
Package governance is owned by
[`BUN_1_4_PACKAGE_GOVERNANCE.md`](./BUN_1_4_PACKAGE_GOVERNANCE.md), while media
classification and approval evidence are owned by
[`BUN_1_4_MEDIA_RIGHTS.md`](./BUN_1_4_MEDIA_RIGHTS.md).

## Ownership and project scope

The Bun 1.4 channel set is one root-public-plane release projection, not an
automatic feed registration for every project in the monorepo.

| Responsibility                           | Authority                                   |
| ---------------------------------------- | ------------------------------------------- |
| Source content and publisher attribution | Bun                                         |
| Active item membership                   | `public/registry/bun-1.4-assets.json`       |
| Channel, alias, and archive projection   | Root `project-R-score` implementation       |
| Public delivery                          | `score.factory-wager.com`                   |
| Project/repository map                   | `public/registry/project-rss-channels.json` |

The four canonical documents remain `/feeds/v1/all.xml`, `images.xml`,
`videos.xml`, and `embeds.xml`. Project-scoped routes under
`/feeds/v1/projects/project-r-score/bun-1.4/` permanently redirect to those
documents, preserving their bytes, Atom self links, GUIDs, and validators.

The serving repository does not acquire ownership of Bun media. Neither the
`cascade` remote nor projects under `projects/active/` inherit these channels.
Active projects are discoverable with an explicit `unregistered` state until a
reviewed registration supplies repository authority, source manifest, publisher,
channel IDs, canonical routes, and archive policy.

Registry generation and registry consumption share one strict parser. The parser
binds the root registration to the exact four Bun 1.4 channel IDs and routes,
binds contained project IDs to normalized discovered paths, and keeps
independent repositories outside origin ownership. Checks also reject extra
project redirects and physical project XML copies. Runtime tests follow each
alias through `Bun.serve` and prove that canonical bytes, Atom self URLs, ETags,
Last-Modified values, `HEAD`, and conditional `304` behavior remain owned by the
canonical endpoint.

## Removal semantics

An item remains in active feeds while it is present in the approved manifest.
Removing unrelated repository duplicates does not alter any channel.

The removal grader joins candidate paths to this project registry before it
assigns deduplication confidence. Byte identity across project or package
ownership boundaries is evidence only, not reclaimable capacity. A contained
project's `unregistered` state proves it has no Bun 1.4 feed membership; it does
not transfer file ownership to the root project or authorize deletion.

For manifest content, removal is a release operation:

1. Resolve publisher ownership, rights, and any canonical replacement.
2. Capture the current manifest, capability graph, and XML feeds in a
   content-addressed `Bun.Archive`.
3. Update the manifest intentionally.
4. Rebuild every derived feed and portal relation.
5. Verify the new hashes, item counts, routes, and static contracts.
6. Delete local bytes only when no active manifest record references them.

Live RSS feeds represent active state; removed items do not linger there. The
archive preserves the prior release bytes, IDs, ownership, hashes, and channel
membership without keeping obsolete content in the current channel.

## Official release chapters

The capability registry carries normalized navigation for the official
`what-s-new`, `bun-install`, `bun-test`, `bun-build`, and `faster` sections.
Capabilities point to at most one of these chapter IDs; assets inherit chapter
membership through capability relations. RSS items expose that projection as
`bun:chapter:<id>` categories, and the portal uses the same records for chapter
links and filters. No chapter-specific asset copies or parallel registries are
created.

Release-note coverage does not imply adoption.

| Adoption         | Repository meaning                                                                 |
| ---------------- | ---------------------------------------------------------------------------------- |
| `integrated`     | Used by repository code and backed by one or more executable `contractFiles`.      |
| `contract`       | Runtime behavior is asserted locally but is not necessarily an application choice. |
| `candidate`      | Searchable future option; it must not claim a local contract or active use.        |
| `local-only`     | Restricted to operator/local tooling and excluded from browser and edge code.      |
| `upstream-claim` | Official release claim not reproducibly measured here; no local contract.          |

Experimental HTTP/3 serving and HTTP/2/3 fetch selection are therefore
searchable and addressable without being enabled in production or in the asset
pipeline. Validation rejects contracts attached to `candidate` or
`upstream-claim` records and requires executable evidence for `integrated` and
`contract` records.

The snapshot declares exactly four channel IDs: `bun-1.4:all`, `bun-1.4:image`,
`bun-1.4:video`, and `bun-1.4:embed`. Every active item belongs to `all` plus
exactly one declared kind channel; feed filenames remain plural (`images.xml`,
`videos.xml`, `embeds.xml`).

## Commands

```bash
bun run channels:bun-1.4:check
bun run channels:bun-1.4:rebuild
bun run channels:bun-1.4:watch
bun run channels:projects:check
```

`rebuild` derives capability and RSS outputs from the committed manifest, then
writes a gzip-compressed tar archive and `latest.json` under
`reports/channel-releases/bun-1.4/`. Reports are ignored by Git.

`watch` uses Bun's process watch mode. It watches the imported, reviewed
manifest and generator modules; it does not poll remote Bun URLs. A remote hash
mismatch remains a fail-closed review event in `docs:blog-assets:check`.

## API boundaries

- `Bun.XML` verifies the emitted channel documents.
- `Bun.CryptoHasher` addresses every file and complete release snapshot.
- `Bun.Archive` preserves accepted release states without retaining them in the
  active channel.
- `Bun.markdown.ansi` renders the operator summary.
- `bun --watch` restarts when imported trusted inputs change.
- `bun:ffi` is intentionally excluded. FFI is for native C-ABI libraries, is
  experimental, and adds memory-safety and portability costs without improving
  this file/XML/archive pipeline.

Automatic rebuilding applies only to deterministic derived outputs. The source
manifest, rights decisions, upstream hash changes, and removals always require
explicit review.
