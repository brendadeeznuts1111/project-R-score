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
- `R2ContentStore` uses digest-derived keys, bounded exact bytes, SHA-256 upload
  checks, create-only conditional writes, and independently rehashed reads.
- `R2ChannelAliasStore` persists the existing channel policy through exact R2
  ETag compare-and-swap and verifies every written JSON record after storage.
- Digest relations describe derivation/provenance only. Package dependency
  records separately preserve runtime, development, optional, and peer edges;
  `peer.optional` represents `peerDependenciesMeta` only.
- Publisher, storage steward, rights reviewer, and alias publisher are separate
  grants. Rights use the canonical media lifecycle and operation-specific
  storage, derivation, external-link, alias-publication, and retention
  decisions.
- `MemoryContentStore` copies exact bytes, deduplicates by digest, bounds reads
  and supports hermetic process-local tests.
- `LocalContentStore` writes verified bytes through a same-directory temporary
  file and atomic rename, then re-hashes every read. Its filesystem path is
  derived only from the validated `ContentDigest`, never a source URL. Bun 1.4
  has no native atomic-rename or fsync API, so this adapter uses Bun's built-in
  `node:fs` compatibility for those two durability primitives.
- `MemoryChannelAliasStore` atomically promotes or revokes immutable alias
  records with exact-revision and exact-digest compare-and-swap. Resolution
  re-verifies content, expiry, rights, and authority separation before exposing
  an active target. Rights lifecycle changes never rewrite byte identity.
- `MemoryContentRightsStore` is the independent live rights authority. Only the
  exact reviewer may append exact-revision/hash decisions; revocation is
  terminal, while the immutable `ContentRef.rights` remains provenance.
- `R2ContentRightsStore` writes immutable hash-chain history objects before an
  ETag-conditional current pointer. Alias promote/resolve consults that current
  decision, so reviewer expiry or revocation disables an otherwise-active alias
  without rewriting its content digest or locator snapshot.
- Rights history has no deletion API. Retention/erasure policy must be decided
  before any lifecycle rule or administrative delete surface is introduced.

The R2 alias adapter uses the binding's ETag conditional-write contract for
exact revision/digest CAS and performs post-write verification before success.

## Area map

| Area                                             | Owner                     |
| ------------------------------------------------ | ------------------------- |
| Identity, rights, dependencies, and wire parsing | `content-contract.ts`     |
| Bounded process-local adapter                    | `memory-content-store.ts` |
| Atomic persistent local adapter                  | `local-content-store.ts`  |
| Guarded immutable channel aliases                | `channel-alias-store.ts`  |
| Durable R2 bytes, rights, and aliases            | `r2-*.ts`                 |
| Stable module exports                            | `index.ts`                |
