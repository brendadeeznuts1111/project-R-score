# Project Triage

Each project under `projects/` is classified into one of three tiers:

| Directory | Meaning | Lifecycle |
|-----------|---------|-----------|
| `active/` | Actively developed or maintained | Regular updates, CI, reviews |
| `experimental/` | Prototypes, proofs-of-concept, sandbox | May promote to active, archive, or delete |
| `archive/` | Frozen research, no longer actively worked on | Read-only, kept for reference |

## Root contract

Every **product leaf** MUST have:

| File | Required |
|------|----------|
| `README.md` | Yes — name, purpose, how to run, link up to this file |
| `package.json` | Yes — install / script root |
| `bunfig.toml` | Preferred for Bun apps |

**Product leaf** = one shippable unit under `active/` (category child or top-level) or a top-level folder under `experimental/` / `archive/`. Nested workspace packages stay nested; they are not separate products.

Category folders (`analysis/`, `utilities/`, …) are indexes only — each has a `README.md` listing children. Do **not** flatten categories without updating MCP paths, skills, and the public registry.

## Rules

- Each product is **independent** — own `bun install`, `bun.lock`, `bun test` (except where root workspaces explicitly list a package).
- **Root workspaces** (see root `package.json`): `packages/*`, `projects/active/factorywager/registry/packages/*`, `projects/active/sports-terminal-os`, `lib/*`.
- Nested products with **own git remotes** are gitignored under this monorepo (kimiremote, cascade-mover-v3, bet-ticker-worker-v1.1, f402-openapi). Treat them as sibling checkouts, not monorepo source of truth.
- Promote / demote:

```bash
git mv projects/experimental/<name> projects/active/<name>
git mv projects/active/<category>/<name> projects/experimental/<name>
git mv projects/active/<path> projects/archive/<name>
```

## Active products

Tier index: [`active/README.md`](active/README.md).

Status: `workspace` = root workspace member · `own remote` = gitignored nested repo · `local` = tracked in this monorepo.

### Top-level

| Path | Purpose | Status |
|------|---------|--------|
| [`active/sports-terminal-os/`](active/sports-terminal-os/) | Sports Terminal OS v5.2 — proxy, WS/SSE, partner profiles | workspace |
| [`active/factorywager/`](active/factorywager/) | Private NPM registry umbrella → `registry/` | local (packages in workspaces) |
| [`active/kimiremote/`](active/kimiremote/) | Sports terminal proxy / remote ops | own remote |
| [`active/f402-openapi/`](active/f402-openapi/) | Fantasy402 OpenAPI + Workers | own remote |
| [`active/playwriter-skill/`](active/playwriter-skill/) | Playwright skill package (Chrome + CLI + R2) | local |

### [`analysis/`](active/analysis/)

| Path | Purpose | Status |
|------|---------|--------|
| [`grok-security/`](active/analysis/grok-security/) | Bun.inspect security utilities + mesh integrations | local |
| [`matrix-analysis/`](active/analysis/matrix-analysis/) | URLPattern performance analysis matrix | local |
| [`scanner/`](active/analysis/scanner/) | Multi-project Bun monorepo scanner | local |

### [`automation/`](active/automation/)

| Path | Purpose | Status |
|------|---------|--------|
| [`duo-automation/`](active/automation/duo-automation/) | Distributed automation, QR onboarding, dashboards | local |
| [`duoplus-app-factory/`](active/automation/duoplus-app-factory/) | Lightning / device factory + compliance | local |
| [`enhancements-1.0.01/`](active/automation/enhancements-1.0.01/) | Enhancement proposals for app v1.0.01 | local |

### [`dashboards/`](active/dashboards/)

| Path | Purpose | Status |
|------|---------|--------|
| [`enterprise-dashboard/`](active/dashboards/enterprise-dashboard/) | Git monitoring dashboard (Bun + React) | local |
| [`quantum-terminal-dashboard/`](active/dashboards/quantum-terminal-dashboard/) | Terminal dashboard + Headscale / Workers | local |
| [`secrets-dashboard/`](active/dashboards/secrets-dashboard/) | Local secrets browser / editor server | local |

### [`development/`](active/development/)

| Path | Purpose | Status |
|------|---------|--------|
| [`geelark/`](active/development/geelark/) | Dev toolkit — insights, S3/R2 uploads | local |
| [`kal-poly-bot/`](active/development/kal-poly-bot/) | Kalshi / Polymarket bot + surgical dashboard | local |

### [`enterprise/`](active/enterprise/)

| Path | Purpose | Status |
|------|---------|--------|
| [`bet-ticker-worker-v1.1/`](active/enterprise/bet-ticker-worker-v1.1/) | Live wager broadcast Worker + DO | own remote |
| [`cascade-mover-v3/`](active/enterprise/cascade-mover-v3/) | Sports intelligence / liquidity terminal | own remote |
| [`fantasy42-fire22-registry/`](active/enterprise/fantasy42-fire22-registry/) | Fire22 / Fantasy42 registry platform | local |
| [`foxy-proxy/`](active/enterprise/foxy-proxy/) | Proxy toolkit | local |
| [`full-stack-bun.io/`](active/enterprise/full-stack-bun.io/) | Full-stack SPA → binary lab demo | local |

### [`tools/`](active/tools/)

| Path | Purpose | Status |
|------|---------|--------|
| [`native-addon-tool/`](active/tools/native-addon-tool/) | Native module builder for Bun | local |

### [`utilities/`](active/utilities/)

| Path | Purpose | Status |
|------|---------|--------|
| [`bun-file-analyzer/`](active/utilities/bun-file-analyzer/) | Enhanced file analyzer + dashboard | local |
| [`bun-toml-secrets-editor/`](active/utilities/bun-toml-secrets-editor/) | TOML secrets editor workspace | local |
| [`proton-pass/`](active/utilities/proton-pass/) | Proton Pass CLI wrapper + typed API | local |
| [`shortcut-registry/`](active/utilities/shortcut-registry/) | Keyboard shortcut registry | local |
| [`toml-cli/`](active/utilities/toml-cli/) | TOML CLI + R2 config tooling | local |

## Experimental products

Top-level only. Nested takes (`codepoint/*`, `tan-bun/TAKE-*`) stay inside their parent.

| Path | Purpose |
|------|---------|
| [`experimental/2048/`](experimental/2048/) | Demo game / CRC32 toolkit |
| [`experimental/api-plive-setup-discovery/`](experimental/api-plive-setup-discovery/) | One-shot Plive API discovery |
| [`experimental/cli-dashboard/`](experimental/cli-dashboard/) | Interactive CLI dashboard demo |
| [`experimental/codepoint/`](experimental/codepoint/) | Nested proxy / dashboard sandbox |
| [`experimental/edge-worker/`](experimental/edge-worker/) | Edge function deployer demo |
| [`experimental/keyboard-shortcuts-lite/`](experimental/keyboard-shortcuts-lite/) | Lightweight shortcut library demo |
| [`experimental/my-bun-app/`](experimental/my-bun-app/) | Minimal Bun web server demo |
| [`experimental/rust-bun-plugin/`](experimental/rust-bun-plugin/) | Rust native Bun plugin experiment |
| [`experimental/tan-bun/`](experimental/tan-bun/) | TanStack / Bun scratch takes |
| [`experimental/testing/`](experimental/testing/) | Dev HQ / proxy playground |
| [`experimental/zig-self-bun/`](experimental/zig-self-bun/) | Zig + Bun config experiment |

See [`experimental/README.md`](experimental/README.md).

## Archive

[`archive/`](archive/) — tier bucket for frozen former active apps. See [`archive/README.md`](archive/README.md).

## Root-parked / not monorepo spine

May exist under `~/Projects` but are gitignored or separate remotes — document only; do not treat as platform SSOT:

| Path | Why |
|------|-----|
| `Proton-workspace/` | Standalone Proton playbook |
| `plannotator-upstream/` | Full upstream clone; thin skills in `plannator/` |
| `toc-ops/`, `toc-ops-repo/`, `toc-ops-repo-wt-*` | Separate TOC-ops product / worktrees |
| `bet-turnin-sheet/`, `bradley-terry/` | Own nested git projects |
| `herdr-worktrees/` | Empty worktree parking |

## Agent scope

| Treat as | Paths |
|----------|--------|
| **Readonly / freeze** | Root `archive/` (gitignored), `scratch/` (curated Bun playgrounds), `docs/archives/` |
| **Lower priority** | `projects/experimental/` |
| **Local runtime only** | `*.db`, `dist/`, `node_modules/`, compile dumps, `data/` |
| **Not this monorepo** | Root-parked table above + own-remote active products |
| **Spine** | `lib/`, `packages/`, `config/`, `tools/`, `scripts/` (targeted), `.agents/skills/` |

## Inventory tooling

```bash
bun run packages:list --filter=active
bun run registry:projects   # → public/registry/projects-registry.json
```

Scaffold/`{{name}}` packages are **hidden by default**; use `--include-scaffolds` or `--paths` when debugging inventory.
