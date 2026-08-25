# Bun 1.4 media-rights boundary

The Bun 1.4 gallery defaults to external delivery. Asset discovery, metadata,
hashes, RSS membership, and attribution do not grant republication rights.

## Source classification

| Source                                                               | Scope                                                              | Current classification     | Allowed behavior                                                                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [Bun software license](https://bun.com/docs/project/license)         | Bun's software and repositories                                    | Out of scope for media     | Use only to evaluate Bun software/code licensing. Never infer blog-media permission from the MIT software license.     |
| [Bun press kit](https://bun.com/press-kit)                           | Logo, wordmark, and icon supplied there                            | Separate brand-asset scope | Follow the press-kit presentation guidance. Do not use it to clear release-blog screenshots, posters, OG art, or MP4s. |
| [Bun 1.4 release post](https://bun.com/blog/bun-v1.4)                | 21 images, including four posters and the OG image, plus four MP4s | Pending                    | Keep Bun-hosted source/public URLs, attribution, dimensions, byte sizes, and hashes. Do not copy binaries.             |
| [Bun 1.4 YouTube video](https://www.youtube.com/watch?v=i38DgEuaJwM) | One overview embed                                                 | External only              | Keep the click-to-load privacy facade and official watch/source link. Never vendor the video.                          |

The committed manifest records these boundaries under `rights`, with 25 Bun-blog
media records and one external YouTube embed. `rightsStatus: "pending"` requires
`delivery: "external-only"`, null evidence, null local URLs, and source URLs as
public URLs.

## Approval evidence

Vendor mode requires both an explicit acknowledgement and a reviewed JSON
evidence file. The evidence must approve this exact scope, not “Bun assets” in
general:

```json
{
  "schemaVersion": 1,
  "scope": "bun-1.4-release-blog-media",
  "status": "approved",
  "approvalId": "legal-or-publisher-record-id",
  "approvedBy": "approver identity",
  "approvedAt": "2026-08-25T00:00:00.000Z",
  "evidenceUrl": "https://durable.example/evidence/record",
  "sourcePage": "https://bun.com/blog/bun-v1.4"
}
```

The durable evidence URL must be HTTPS. Do not put private correspondence,
tokens, or local paths in the manifest. After approval, run:

```bash
bun run docs:blog-assets:vendor -- --confirm-rights --rights-evidence /reviewed/evidence.json
```

The pipeline validates evidence before fetching source documents, vendors only
the 25 Bun-hosted records, keeps the YouTube item external, and persists a
non-secret evidence summary in the manifest. Deployment remains blocked until
the resulting binary, attribution, feed, portal, and Range tests pass review.

## Removal and channel behavior

Rights classification does not change channel membership. Active RSS items are
derived from the reviewed manifest whether their delivery is external or local.
If approval is denied or an item is intentionally removed, follow the archive
and rebuild sequence in
[`BUN_1_4_CHANNEL_LIFECYCLE.md`](./BUN_1_4_CHANNEL_LIFECYCLE.md); do not leave a
removed item in the active feed merely because an old binary or hash exists.
