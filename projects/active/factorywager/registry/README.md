# @factorywager/registry

Private npm registry tooling with R2/CDN support for FactoryWager packages.

## Runtime planes

- Metadata reads default to the tokenless npm endpoint
  `https://registry.factory-wager.com/api/npm`. Override only with
  `FACTORY_WAGER_NPM_REGISTRY_URL` or `--read-registry`; HTTP loopback is
  accepted for local development.
- `publish`, `unpublish`, and token creation require an explicit HTTP loopback
  destination through `FACTORY_WAGER_LOCAL_REGISTRY_WRITE_URL` or
  `--write-registry`. HTTPS and non-loopback write destinations are rejected
  before credentials are read.
- `REGISTRY_URL` and `--registry` are deprecated, warning-only inputs. They do
  not select a read or write destination.
- Production publication is not an HTTP fallback from this workspace. It uses
  the separately authorized Project R R2 artifact workflow.

```sh
registry info @factorywager/registry-client
registry publish ./my-package --write-registry http://localhost:4873
```

## Development

```sh
bun install
bun test
bun run build
```

## Release Checks

```sh
publish-doctor --project /Users/nolarose/Projects/factorywager/registry
artifact-pack --project /Users/nolarose/Projects/factorywager/registry
artifact-verify --project /Users/nolarose/Projects/factorywager/registry
```
