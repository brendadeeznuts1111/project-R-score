# Cascade Mover Agent Team — AI agent runbook

## Available Agents

| Agent | Vault | Token Source | Purpose |
|-------|-------|-------------|---------|
| `factorywager-agent` | factorywager | `scripts/agent-env.sh factorywager` | Deploy, inject, infra |
| `bet-ticker-agent` | bet-ticker | `scripts/agent-env.sh bet-ticker` | Poller health, token health |
| `cascade-agent` | cascade-mover | `scripts/agent-env.sh cascade-mover` | Sports intelligence, market data |

## Quick Start

```bash
# Load agent environment
source scripts/agent-env.sh factorywager

# Read a secret (must include reason)
PROTON_PASS_AGENT_REASON="Checking R2 bucket config" \
  pass-cli item view --vault-name "factorywager" --item-title "R2 bun-secrets bucket"
```

## MCP Servers Available

The workspace `.mcp.json` provides:
- **cascade-mover** — 43 tools for sports intelligence (odds, lines, confidence, market state)
- **cloudflare** — Pages, R2, DNS management
- **github** — repo management, PRs, issues
- **ast-grep** — code search and structure
- **dx** — project health and discovery
- **bun-docs** — Bun API documentation

## VPS Infrastructure

```bash
# Check poller health
ssh bet-ticker-vps "systemctl status bet-ticker-poller.service --no-pager -n 5"

# Check cascade-mover
ssh bet-ticker-vps "systemctl status cascade-mover.service --no-pager -n 5"

# Check disk
ssh bet-ticker-vps "df -h /"
```

## Deploy Pipeline

```bash
# Full deploy with vault injection
bun run proton:deploy:pages

# Just resolve .env
bun run proton:inject:factorywager
```

## Token Auto-Refresh

The poller token auto-refresh loop:
1. cascade-token gets JWT via Chrome WebView (every 10 min)
2. Poller-token-sync copies JWT to poller (every 5 min)
3. Poller reads fresh token — no auth errors

If loop breaks: `ssh bet-ticker-vps "cd /opt/bet-ticker-worker-v1.1 && bun run admin:reseed -- --access-token=<jwt>"`
