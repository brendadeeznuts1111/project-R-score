# Project Triage

Each project under `projects/` is classified into one of three tiers:

| Directory | Meaning | Lifecycle |
|-----------|---------|-----------|
| `active/` | Actively developed or maintained | Regular updates, CI, reviews |
| `experimental/` | Prototypes, proofs-of-concept, sandbox | May promote to active, archive, or delete |
| `archive/` | Frozen research, no longer actively worked on | Read-only, kept for reference |

**On disk today:** `active/` holds maintained apps; `experimental/` holds relocated demos (see below); `archive/` is an empty tier bucket until first freeze.

## Rules

- Each project is **independent** — own `bun install`, `bun.lock`, `bun test` (except where root workspaces explicitly list a package).
- **Root workspaces** (see root `package.json`): `packages/*`, `projects/active/factorywager/registry/packages/*`, `projects/active/sports-terminal-os`, `lib/*`.
- Nested products with **own git remotes** are gitignored under this monorepo (kimiremote, cascade-mover-v3, bet-ticker-worker-v1.1, f402-openapi). Treat them as sibling checkouts, not monorepo source of truth.
- To promote from `experimental/` to `active/`:
  ```bash
  git mv projects/experimental/<name> projects/active/<name>
  ```
- To archive from `active/` to `archive/`:
  ```bash
  git mv projects/active/<name> projects/archive/<name>
  ```

## Active map (depth-2)

| Path | Contents | Notes |
|------|----------|--------|
| `active/analysis/` | grok-security, matrix-analysis, scanner | |
| `active/automation/` | duo-automation, duoplus-app-factory, enhancements-1.0.01 | |
| `active/dashboards/` | enterprise-dashboard, quantum-terminal-dashboard, secrets-dashboard | |
| `active/development/` | geelark, kal-poly-bot | kal-poly `data/` is local-only (ignored) |
| `active/enterprise/` | fantasy42-fire22-registry, foxy-proxy, full-stack-bun.io, bet-ticker-worker-v1.1, cascade-mover-v3 | bet-ticker + cascade: **own repos**, gitignored |
| `active/tools/` | native-addon-tool | |
| `active/utilities/` | bun-file-analyzer, bun-toml-secrets-editor, proton-pass, shortcut-registry, toml-cli | `dist/` local-only |
| `active/factorywager/` | registry (+ packages) | In root workspaces |
| `active/kimiremote/` | sports terminal proxy | Own repo, gitignored |
| `active/sports-terminal-os/` | Sports Terminal OS v5.2 | Root workspace member |
| `active/f402-openapi/` | OpenAPI / workers | Own tree, gitignored |
| `active/playwriter-skill/` | Playwright skill package | Thin skill |

Demos formerly under `active/apps/`, `active/games/`, and experimental native tools now live in [`experimental/`](experimental/README.md).

See `bun run packages:list --filter=active` for package names. Scaffold/`{{name}}` packages are **hidden by default**; use `--include-scaffolds` or `--paths` when debugging inventory. Refresh the public browser inventory with `bun run registry:projects` → [`public/registry/projects-registry.json`](../public/registry/projects-registry.json).

## Agent scope (what not to load)

| Treat as | Paths |
|----------|--------|
| **Readonly / freeze** | Root `archive/` (gitignored), `scratch/` (curated Bun playgrounds only), historical docs under `docs/archives/` |
| **Lower priority** | `projects/experimental/` (demos — do not treat as platform spine) |
| **Local runtime only** | `*.db`, `dist/`, `node_modules/`, compile dumps, `data/` |
| **Not this monorepo** | Root-parked: `Proton-workspace/`, `plannotator-upstream/`, `toc-ops*`, `bet-turnin-sheet/`, `bradley-terry/` (gitignored) |
| **Spine** | `lib/`, `packages/`, `config/`, `tools/`, `scripts/` (targeted), skills markdown under `.agents/skills/` |

## Tier buckets

| Path | Role |
|------|------|
| [`experimental/README.md`](experimental/README.md) | Relocated demos + native experiment toolchains |
| [`archive/README.md`](archive/README.md) | Frozen former `projects/active/*` apps (empty until first freeze) |
