# Matrix Agent

AI Agent Management System for the Matrix Analysis Platform.

Migrated and integrated from [OpenClaw/Clawdbot](https://github.com/openclaw) (v2026.1.17-1).

## Overview

Matrix Agent provides AI agent management capabilities integrated with:
- Matrix Analysis Platform (197-column URLPattern analysis)
- Profile Management System (`~/.matrix/profiles/`)
- Tier-1380 CLI (color system, team management)
- Terminal Binding Manager
- MCP Server Ecosystem

## Installation

```bash
# Clone the repository
git clone git@github.com:brendadeeznuts1111/matrix-analysis.git
cd matrix-analysis

# Install dependencies
bun install

# Initialize matrix-agent
bun run agent:init
```

## Usage

### CLI Commands

```bash
# Initialize agent configuration
bun run agent:init

# Show agent status
bun run agent:status

# Run health checks
bun run agent:health

# Migrate from legacy clawdbot
bun run agent:migrate

# Profile management
bun run agent:profile list
bun run agent:profile use <name>

# Tier-1380 integration
bun run agent:tier1380 color init --team=<name> --profile=<name>
```

### Direct Usage

```bash
bun matrix-agent/matrix-agent.ts status
bun matrix-agent/matrix-agent.ts health
bun matrix-agent/matrix-agent.ts migrate
```

## Configuration

Configuration is stored in `~/.matrix/agent/config.json`:

```json
{
  "name": "matrix-agent",
  "version": "1.0.0",
  "agents": {
    "defaults": {
      "model": { "primary": "openrouter/minimax/minimax-m2.1" },
      "workspace": "/Users/nolarose"
    }
  },
  "channels": {
    "telegram": { "enabled": true }
  },
  "gateway": {
    "port": 18789,
    "mode": "local"
  },
  "integration": {
    "profiles": { "enabled": true },
    "terminal": { "enabled": true },
    "tier1380": { "enabled": true },
    "mcp": { "enabled": true }
  }
}
```

## Integration Points

| Component | Path | Description |
|-----------|------|-------------|
| Profiles | `~/.matrix/profiles/` | Environment profile management |
| Terminal | `.claude/core/terminal/` | Profile-terminal binding |
| Tier-1380 | `cli/tier1380.ts` | Color/team/dashboard CLI |
| MCP | `.mcp.json` | Model Context Protocol servers |

## Migration from Clawdbot

To migrate from the legacy `clawdbot` installation:

```bash
bun run agent:migrate
```

This will:
1. Copy configuration from `~/.clawdbot/clawdbot.json`
2. Preserve agent settings and model preferences
3. Create a migration marker at `~/.matrix/.migrated-from-clawdbot`

After migration, the legacy `~/.clawdbot` directory can be safely removed.

## Related Projects

- [OpenClaw/Skills](https://github.com/openclaw/skills) - Skills registry
- [OpenClaw/Lobster](https://github.com/openclaw/lobster) - Workflow shell
- [OpenClaw/Casa](https://github.com/openclaw/casa) - Home base integration
- [Cloudflare/Moltworker](https://github.com/cloudflare/moltworker) - Cloudflare Workers deployment

## License

MIT
