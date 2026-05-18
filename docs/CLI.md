# CLI Quick Reference

## Root Workspace (bun run)

### Package Management
| Command | Description |
|---------|-------------|
| `bun run packages:list [--filter=core\|active\|experimental\|archive]` | List all packages with version/registry/triage |
| `bun run packages:outdated` | Check outdated root dependencies |
| `bun install` | Install root workspace (122 packages, <1s) |
| `bun add <pkg> -E` | Add dep pinned to exact version |
| `bun outdated` | Check outdated root deps |

### Development
| Command | Description |
|---------|-------------|
| `bun run dev` | Start platform watch server |
| `bun run start:p2p-proxy` | Start P2P proxy server |
| `bun run dashboard` | MCP overview dashboard |
| `bun run deployment:readiness` | Readiness matrix |

### Workspace
| Command | Description |
|---------|-------------|
| `bun run validate:workspaces` | Validate workspace coverage |
| `bun run build:affected` | Build changed packages |
| `bun run test:affected` | Test changed packages |

### Lint & Format
| Command | Description |
|---------|-------------|
| `bun run lint:core` | ESLint on packages/ server/ config/ tools/ |
| `bun run format:core` | Prettier on core directories |
| `bun run format:check:core` | Check formatting (read-only) |

### Antipattern Fixing
| Command | Description |
|---------|-------------|
| `bun run fix:console-log` | Bulk console.log → console.info |
| `bun run fix:scan-any-types` | Scan for `any` type usage |
| `bun run fix:scan-default-exports` | Scan for default exports |
| `bun run fix:scan-non-null-assertions` | Scan for `!` assertions |

### CI & Demo
| Command | Description |
|---------|-------------|
| `bun run lint` | ESLint on lib/ |
| `bun run format` | Prettier on lib/ |
| `bun run demo:contract:validate` | Validate demo contracts |

## Project-Level (cd to project)

Each project in `projects/active/`, `projects/experimental/`, and `projects/archive/` is independent:

| Action | Command |
|--------|---------|
| Install deps | `cd projects/active/<name> && bun install` |
| Run tests | `cd projects/active/<name> && bun test` |
| Check outdated | `cd projects/active/<name> && bun outdated` |
| Fix to exact | `cd projects/active/<name> && bun add <pkg> -E` |
| List packages | `cd projects/active/<name> && bun run packages:list` (if script exists) |

## Git Workflow

| Action | Command |
|--------|---------|
| Quick status | `git status --short` |
| Check what changed | `git diff --stat` |
| Stage all | `git add -A` |
| Commit | `git commit -m "type: message"` |
| Amend | `git commit --amend` (follow hook rules) |

## Project Triage

```bash
# Promote experimental → active
git mv projects/experimental/<name> projects/active/<name>

# Archive active → archive
git mv projects/active/<name> projects/archive/<name>

# Check triage status
bun run packages:list --filter=active
```

## Registry Info

- **Primary registry**: `registry.factory-wager.com`
- **Default (npm)**: public packages
- **Full manifest**: `docs/packages/REGISTRY.md` (395 packages)
- **Package scope**: `@factorywager/*` (core), `@fire22/*` (fantasy42)
