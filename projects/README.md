# Project Triage

Each project under `projects/` is classified into one of three tiers:

| Directory | Meaning | Lifecycle |
|-----------|---------|-----------|
| `active/` | Actively developed or maintained | Regular updates, CI, reviews |
| `experimental/` | Prototypes, proofs-of-concept, sandbox | May promote to active, archive, or delete |
| `archive/` | Frozen research, no longer actively worked on | Read-only, kept for reference |

## Rules

- Each project is **independent** — no shared workspaces with the root.
- Each project manages its own `bun install`, `bun.lock`, `bun test`, etc.
- The root workspace only covers `packages/*`, `factorywager/registry/packages/*`, `kimiremote/packages/*`, `lib/*`. It does NOT include any `projects/` directory.
- To promote from `experimental/` to `active/`:
  ```bash
  git mv projects/experimental/<name> projects/active/<name>
  ```
- To archive from `active/` to `archive/`:
  ```bash
  git mv projects/active/<name> projects/archive/<name>
  ```

## Active Projects

| Category | Contents |
|----------|----------|
| `active/analysis/` | claudian, matrix-analysis, grok-security, scanner |
| `active/apps/` | cli-dashboard, edge-worker, my-bun-app |
| `active/automation/` | duo-automation, duoplus-app-factory, enhancements |
| `active/dashboards/` | enterprise-dashboard, quantum-terminal-dashboard |
| `active/development/` | geelark, kal-poly-bot |
| `active/enterprise/` | fantasy42-fire22-registry, foxy-proxy, full-stack-bun.io, bet-ticker-worker-v1.1, cascade-mover-v3 |
| `active/games/` | 2048 |
| `active/tools/` | native-addon-tool, rust-bun-plugin, zig-self-bun |
| `active/utilities/` | codepoint, tan-bun, shortcut-registry, toml-cli, testing |

See `bun run packages:list --filter=active` for the full package list.
