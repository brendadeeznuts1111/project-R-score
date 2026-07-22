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
