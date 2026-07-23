# Factory — R2-backed artifact registry

Registry client, CLI, and template scaffolding for the FactoryWager
internal package registry.

## Structure

| File | Role |
|------|------|
| `artifact.ts` | Branded ArtifactName/Version/Id types + ArtifactRelease schema |
| `object-store.ts` | `RegistryObjectStore` — memory (tests) + `S3Client` SigV4 (live) |
| `markdown.ts` | `Bun.markdown` helpers — **Bun runtime only** (never import from `functions/`) |
| `registry.ts` | RegistryClient: publish, install, list, search, fetchReadme |
| `cli.ts` | CLI (env, publish, list, search, install, readme, snapshot, create, help) |
| `semver.ts` | Bun.semver wrappers: sortVersions, satisfiesRange, resolveVersion |
| `index.ts` | Barrel exports |

## Quick start

```bash
bun run factory --version
bun run factory:list
bun run factory:snapshot          # → public/registry/registry.json
bun run factory create factory-library my-lib --publish
```

See [proof claim](../../docs/harness/PROOF.md) `factory-registry-cli-v1`.  
Pages portal proxy: claim `factory-registry-pages-proxy-v1` · `functions/api/registry/`.

Live R2 uses [`Bun.S3Client`](https://bun.com/docs/runtime/s3#bun-s3client-bun-s3) (SigV4) via `createS3RegistryStore`. Optional [`requestPayer`](https://bun.com/blog/bun-v1.3.6#s3-requester-pays-support) from `R2_REQUEST_PAYER` (same SSOT as `scripts/lib/r2-bridge.ts`). Unit tests inject `createMemoryObjectStore()` — green tests prove coordination, not deployed bucket health (`factory env` / live ping).
