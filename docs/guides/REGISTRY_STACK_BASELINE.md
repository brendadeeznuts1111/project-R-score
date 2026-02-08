# Registry Stack Baseline

## Canonical topology
- Registry API URL (publish/install): `https://registry.factory-wager.com`
- CDN URL (optional read path): `https://registry.factory-wager.com`
- Storage backend: Cloudflare R2 bucket `npm-registry`

Registry is R2-backed. Domain/CDN are access layers over that backend.

## Permanent files in repo
- Canonical registry config: `/Users/nolarose/Projects/registry.config.json5`
- Canonical npm config: `/Users/nolarose/Projects/.npmrc`
- Registry env template: `/Users/nolarose/Projects/.env.registry.example`

## Doctor commands
```bash
bun run registry:doctor
bun run registry:doctor:fix
bun run registry:doctor:json
```

`--fix` safely sets:
- `registry.config.json5` canonical values
- missing `REGISTRY_URL`, `R2_REGISTRY_BUCKET`, `REGISTRY_CDN_URL` in env file
- missing canonical scope/auth lines in `.npmrc`

`--fix` does not set secrets.

## Verify package visibility
```bash
bun run lib/registry/cli.ts list --registry=https://registry.factory-wager.com
bun run lib/registry/cli.ts info @factory-wager/<package> --registry=https://registry.factory-wager.com
```

