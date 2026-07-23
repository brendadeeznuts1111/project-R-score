# Factory — R2-backed artifact registry

Registry client, CLI, and template scaffolding for the FactoryWager
internal package registry.

## Structure

| File | Role |
|------|------|
| `artifact.ts` | Branded ArtifactName/Version/Id types + ArtifactRelease schema |
| `registry.ts` | RegistryClient: publish, install, list, search, fetchReadme |
| `cli.ts` | 8 subcommand CLI (env, publish, list, search, install, readme, create, help) |
| `semver.ts` | Bun.semver wrappers: sortVersions, satisfiesRange, resolveVersion |
| `index.ts` | Barrel exports |

## Quick start

```bash
bun run factory --version
bun run factory:list
bun run factory create factory-library my-lib --publish
```

See [proof claim](../../docs/harness/PROOF.md) `factory-registry-cli-v1`.  
Pages portal proxy: claim `factory-registry-pages-proxy-v1` · `functions/api/registry/`.

**Deploy gap:** `RegistryClient` still uses HTTP Basic against the S3 endpoint in unit-mocked tests. Live R2 requires SigV4 via [`Bun.S3Client`](https://bun.com/docs/runtime/s3#bun-s3client-bun-s3) / `scripts/lib/r2-bridge.ts` — do not treat green unit tests as deployed proof.
