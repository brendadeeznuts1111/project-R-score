# Install hygiene

Board: [`/portal/install-hygiene/`](./install-hygiene/) · bake: [`/registry/install-hygiene-report.json`](../registry/install-hygiene-report.json)

```bash
bun run bake:install-hygiene
bun run install:verify
```

Combines install-cache size/prune signal, npm-install production-path policy, and a dry-run of `install:verify`. Projected into monitoring as `installHygiene` when present.

Docs: [`docs/UNIFIED.md`](../../docs/UNIFIED.md) · [`docs/harness/tenants/public-plane.md`](../../docs/harness/tenants/public-plane.md)
