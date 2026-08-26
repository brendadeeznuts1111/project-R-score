# Registry Stack Baseline

## Canonical topology

- npm read URL: `https://registry.factory-wager.com/api/npm` (tokenless
  GET/HEAD)
- artifact read origin: `https://registry.factory-wager.com`
- local SDK write URL: explicit HTTP loopback only
- production write: separately authorized direct-to-R2 SigV4 against
  `factory-wager-registry`

The public domain is a read layer over R2, never a package-manager publication
destination. `bun run registry:doctor` validates the checked-in contracts
without reading secret values or mutating files.

## Permanent files in repo

- Canonical registry config: `config/registry.config.json5`
- Canonical npm config: `.npmrc` and `bunfig.toml`
- Registry env template: `.env.registry.example`

## Doctor commands

```bash
bun run registry:doctor
bun run registry:doctor:json
```

The doctor is read-only. The legacy `--fix` entry point fails closed and never
creates `.env.registry`, changes `.npmrc`, or rewrites registry configuration.

## Verify stack health

```bash
bun run registry:doctor
bun run registry:projects
bun run factory:health
bun run factory:integrity
```

Production topology, alerting, SDK publication, and recovery procedures:
[`REGISTRY_PRODUCTION_READINESS.md`](REGISTRY_PRODUCTION_READINESS.md).
