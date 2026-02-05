# PR Label Color Guide

Bright colored labels matching Telegram integration patterns for consistent visual styling.

## Color Palette

Based on Telegram integration and component color scheme:

### Primary Colors

- **Cyan** `#00d4ff` - Main app color, API routes, enhancements
- **Purple** `#9c27b0` - Telegram API, configuration, external services
- **Red** `#ff1744` - Errors, critical issues, registry system
- **Magenta** `#ff00ff` - Rate limiting, tool integration, MCP tools
- **Orange** `#ff6b00` - Warnings, error logs, alerts
- **Green** `#00ff88` - Success, documentation, info
- **Indigo** `#667eea` - UI components, dashboard
- **Yellow** `#ffeb3b` - VM, runtime, performance

## Suggested Labels

### Feature Categories

| Label | Color | Hex | Use Case |
|-------|-------|-----|----------|
| `enhancement` | Cyan | `#00d4ff` | New features, improvements |
| `bug` | Red | `#ff1744` | Bug fixes, critical issues |
| `documentation` | Green | `#00ff88` | Docs, guides, references |
| `refactoring` | Indigo | `#667eea` | Code cleanup, restructuring |

### Component Labels

| Label | Color | Hex | Component |
|-------|-------|-----|-----------|
| `api` | Cyan | `#00d4ff` | API routes, endpoints |
| `dashboard` | Indigo | `#667eea` | Dashboard, UI components |
| `telegram` | Purple | `#9c27b0` | Telegram integration |
| `mcp-tools` | Magenta | `#ff00ff` | MCP tools, registry |
| `registry` | Red | `#ff1744` | Registry system |
| `error-logs` | Orange | `#ff6b00` | Error handling, logs |

### Configuration & Infrastructure

| Label | Color | Hex | Use Case |
|-------|-------|-----|----------|
| `configuration` | Purple | `#9c27b0` | Config, constants, env vars |
| `constants` | Purple | `#9c27b0` | Constants, hardcoded values |
| `ports` | Purple | `#9c27b0` | Port configuration |

### Status Labels

| Label | Color | Hex | Use Case |
|-------|-------|-----|----------|
| `ready-for-review` | Green | `#00ff88` | PR ready for review |
| `needs-testing` | Orange | `#ff6b00` | Requires testing |
| `blocked` | Red | `#ff1744` | Blocked by dependencies |

## Usage

When creating PRs, apply labels that match:
1. **Component affected** (api, dashboard, telegram, etc.)
2. **Change type** (enhancement, bug, documentation)
3. **Status** (ready-for-review, needs-testing)

## GitHub Search Tips

**ProTip!** Use label filters in GitHub search:

- Exclude bug PRs: `-label:bug`
- Show only enhancements: `label:enhancement`
- Filter by component: `label:api label:dashboard`
- Combine filters: `label:enhancement -label:bug`

**Examples:**
```
# Show all PRs except bugs
is:pr -label:bug

# Show enhancement PRs ready for review
is:pr label:enhancement label:ready-for-review

# Show API-related PRs (excluding bugs)
is:pr label:api -label:bug
```

## Example

For this PR (`feature/hardcode-ports-constants`):

- `enhancement` (#00d4ff)
- `configuration` (#9c27b0)
- `constants` (#9c27b0)
- `api` (#00d4ff)
- `dashboard` (#667eea)
- `documentation` (#00ff88)
- `registry` (#ff1744)
- `mcp-tools` (#ff00ff)
- `error-logs` (#ff6b00)
