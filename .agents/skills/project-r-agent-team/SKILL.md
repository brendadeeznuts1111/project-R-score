---
name: project-r-agent-team
description: Operate Project R agent-team access through the correct Proton Pass vault, environment loader, MCP surface, and SSH host. Use for agent credential setup, vault routing, remote access, or team-specific environment diagnostics.
---

# Agent Team Onboarding

This project has a team of AI agents that can access different vaults and tools.

## Agent Access

Each agent team has its own Proton Pass PAT with editor access to one vault:

```bash
# Load the agent environment
source scripts/agent-env.sh <team>

# Teams: factorywager, bet-ticker, cascade-mover
```

## Vault Layout

| Team | Vault | Key Items | MCP Servers |
|------|-------|-----------|-------------|
| **factorywager** | factorywager | R2, CF API, Registry Token, Emails, Telegram bots/webhook/ops chat | cloudflare, github, dx |
| **cloudflare** | cloudflare | R2 buckets, Account, Zone, Pages, DNS token | cloudflare (DNS) |
| **bet-ticker** | bet-ticker | VPS SSH, R2, Fantasy402 Token, CF cookies | cascade-mover |
| **cascade-mover** | cascade-mover | Server config, R2, FP402 login | cascade-mover (50 tools) |

> Telegram secrets moved from the retired `tenants` vault into `factorywager` — the `factorywager-bot` PAT cannot open `tenants`.

## SSH Hosts

```
github.com-personal   → GitHub (brendadeeznuts1111)
bet-ticker-vps        → VPS (2.24.96.9, root) — poller, cascade, monitoring
```

## Quick Commands

```bash
# Deploy
bun run proton:deploy:pages

# Resolve secrets
source scripts/agent-env.sh <vault>
PROTON_PASS_AGENT_REASON="task" pass-cli item view ...

# Access VPS
ssh bet-ticker-vps
```

## Domain
factory-wager.com via Cloudflare — Pages, tunnels, Proton Mail. DNS clean (18 records).
