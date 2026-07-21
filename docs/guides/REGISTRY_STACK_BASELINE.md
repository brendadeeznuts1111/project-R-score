# Registry Stack Baseline

## Canonical topology
- Registry API URL (publish/install): private host from root `bunfig.toml` / `.npmrc` (`@factorywager` scope) — not publicly resolvable without VPN/DNS
- CDN / read path: same private registry plane when configured
- Storage backend: Cloudflare R2 bucket `npm-registry`

Registry is R2-backed. Domain/CDN are access layers over that backend. Public `HEAD` may fail (`ENOTFOUND`); use `bun run registry:doctor` on the machine that has registry DNS.

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
bun lib/registry/cli.ts list --registry="$REGISTRY_URL"
bun lib/registry/cli.ts info @factorywager/<package> --registry="$REGISTRY_URL"
```

