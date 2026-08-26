# Application ContentStore / MediaCAS foundation

<!-- area-map-verified: 2026-08-26 -->

This directory owns application byte identity and storage contracts. It is
separate from Bun's package-manager `globalStore`, which remains install-cache
infrastructure and is never an application media store.

Core invariants:

- `ContentDigest` is SHA-256 over exact bytes and is algorithm-qualified.
- `ContentKey` is deterministically derived from a digest; URLs and transports
  never affect it.
- `SourceLocatorId` hashes the exact canonical locator string on a separate
  identity path. A locator hash is never accepted as a content digest.
- Wire/persisted `ContentRef` data enters through `parseContentRef` once.
- Runtime, development, optional, and peer dependency edges remain distinct;
  `peer.optional` represents `peerDependenciesMeta` only.
- Publisher, storage steward, rights reviewer, and alias publisher are separate
  grants. Rights states include denied, expired, and revoked.
- `MemoryContentStore` copies exact bytes, deduplicates by digest, bounds reads
  and writes, and detects backing-store corruption. Persistent local and R2
  adapters remain separate follow-up work.

RSS, image, registry, R2, and channel consumers are intentionally not migrated
in this foundation change.

## Area map

| Area                                             | Owner                     |
| ------------------------------------------------ | ------------------------- |
| Identity, rights, dependencies, and wire parsing | `content-contract.ts`     |
| Bounded process-local adapter                    | `memory-content-store.ts` |
| Stable module exports                            | `index.ts`                |
