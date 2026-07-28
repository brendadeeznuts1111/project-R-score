# Packages registry docs

| Doc | Role |
|-----|------|
| [REGISTRY.md](./REGISTRY.md) | Generated package table — refresh with `bun run packages:list --write` |
| [monorepo-workspaces.md](../harness/tenants/monorepo-workspaces.md) | Hybrid workspace graph · catalog: · filter · Bun canonical refs |
| [UNIFIED.md](../UNIFIED.md#catalogs-and-workspace-protocols) | Install + catalog policy |

## Live root workspace packages

| Package | Role |
|---------|------|
| `@factorywager/registry-client` | Publishable SDK · build/test |
| `@factorywager/guards` | Bun-first compliance |
| `@factorywager/rip` | Analysis tooling |
| `@factorywager/docs-tools` | Doc validators (coupled to `lib/docs`) |
| `@factorywager/business` · `@factorywager/p2p` | Workspace members; no spine importers yet |
| `@factorywager/shared` | `lib/shared` entry-guard helpers |
| `sports-terminal-os` | App workspace member |

**Archived:** `projects/archive/factorywager-packages/` (`ab-testing`, `versioning`).

```bash
bun run validate:workspaces
bun run --parallel --filter '*' --if-present test
bun outdated --filter '@factorywager/*'
bun tools/bun-docs-catalog.ts get workspaces   # Bun canonical page set
bun tools/bun-doc-refs.ts suggest "--filter"   # → pm/filter
```

Filter deep-dive (name vs path, install, parallel, docs `type:toml` pitfall):  
[monorepo-workspaces § bun --filter](../harness/tenants/monorepo-workspaces.md#bun---filter-canonical) · https://bun.com/docs/pm/filter

Do not hand-edit REGISTRY.md for triage; regenerate.
