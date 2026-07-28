# Packages registry docs

| Doc | Role |
|-----|------|
| [REGISTRY.md](./REGISTRY.md) | Generated package table — refresh with `bun run packages:list --write` |
| [monorepo-workspaces.md](../harness/tenants/monorepo-workspaces.md) | Hybrid workspace graph · catalog: · **`--filter` deep-dive** · Bun canonical refs |
| [monorepo-workspaces § bun --filter](../harness/tenants/monorepo-workspaces.md#bun---filter-canonical) | Name vs `./path` · install · outdated · parallel · `type:toml` pitfall |
| [UNIFIED.md § catalogs](../UNIFIED.md#catalogs-and-workspace-protocols) | Install + catalog policy · scripts vs filter · `type:toml` warning |
| [pm/filter](https://bun.com/docs/pm/filter) | Bun canonical (workspace package selector) |
| [pm/cli/outdated](https://bun.com/docs/pm/cli/outdated) | Outdated deps; supports `--filter` |

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

## Day-to-day commands

```bash
# Workspace integrity
bun run validate:workspaces
bun run validate:workspaces --verbose
bun pm ls

# Package scripts (workspace members only — always --if-present on fan-out)
bun run --parallel --filter '*' --if-present test
bun run --filter @factorywager/registry-client build
bun run --filter './packages/*' --if-present test
bun run --filter sports-terminal-os typecheck

# Outdated (restrict to workspaces — not test files)
bun outdated --filter '@factorywager/*'          # scoped package names
bun outdated --filter './packages/*'             # path: all packages/*
bun outdated --filter './'                       # root package.json only
bun outdated --filter sports-terminal-os         # one app member
bun outdated --filter '!./' --filter './packages/*'  # packages only, skip root

# Canonical Bun refs (offline)
bun tools/bun-docs-catalog.ts get workspaces
bun tools/bun-doc-refs.ts suggest "--filter"     # → https://bun.com/docs/pm/filter
```

### `bun outdated --filter` (homebase)

`bun outdated` lists outdated dependencies for the monorepo; **`--filter`** narrows to workspace packages by **name** or **`./path`** (same rules as install/scripts — [pm/filter](https://bun.com/docs/pm/filter) · [pm/cli/outdated](https://bun.com/docs/pm/cli/outdated)).

| Pattern | What you see |
|---------|----------------|
| `@factorywager/*` | Named `@factorywager/*` workspace packages |
| `./packages/*` | Every package under `packages/` |
| `./` | Root `package.json` only |
| `sports-terminal-os` | STO workspace member |
| `'!./' --filter './packages/*'` | Packages without root |

Deep-dive (matching, install, parallel, docs `type:toml` pitfall):  
[monorepo-workspaces § bun --filter](../harness/tenants/monorepo-workspaces.md#bun---filter-canonical)

**Not a filter:** Mintlify `?search=type:toml` on docs URLs is a **search facet** for TOML samples (bunfig), not `bun outdated` / `bun --filter`. See [UNIFIED warning](../UNIFIED.md#scripts-vs---filter).

Do not hand-edit REGISTRY.md for triage; regenerate with `bun run packages:list --write`.
