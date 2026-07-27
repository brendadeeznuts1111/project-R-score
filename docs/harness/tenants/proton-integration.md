# Proton Integration — Operations Runbook

## Vault Layout

| Vault | Purpose | Items | PAT |
|-------|---------|-------|-----|
| **Personal** | Personal SSH key | `id_ed25519 (dev)` | `agent-work` |
| **factorywager** | Monorepo deploy secrets | R2, Registry Token, CF API, Org key, Emails | `factorywager-bot` |
| **bet-ticker** | bet-ticker-worker secrets | VPS key, R2, Token, login | `bet-ticker-bot` |
| **cascade-mover** | Cascade mover secrets | SSH key, Server config | `cascade-bot` |
| **tenants** | Portal tenant secrets | Telegram bots, webhook, ops chat | — |

## Secret Injection

```bash
# Resolve env.template → .env
bun run proton:inject:factorywager

# Full deploy with vault injection
bun run proton:deploy:pages
```

## Agent Access

```bash
source scripts/agent-env.sh <project>
# Projects: factorywager, bet-ticker, cascade-mover
# Always set: PROTON_PASS_AGENT_REASON="why"
```

## PAT Rotation

PATs expire 2027-07-27. To rotate:
```bash
pass-cli pat renew --pat-name <name> --expiration 1y
# Update .env.pass-tokens and scripts/agent-env.sh
```

## SSH Agent

Daemon manages SSH keys from Personal vault.
- Socket: `~/.ssh/proton-pass-agent.sock`
- PID: `~/.ssh/proton-pass-agent.pid`
- Auto-start: `~/Library/LaunchAgents/com.proton.pass-cli.ssh-agent.plist`

## Orgs

- Org: **APEX-BIOLABS** (apexbiolabsdirect@proton.me)
- Domain: **factory-wager.com** (Cloudflare, Proton Mail)
- Users: admin@, dev@, bot@factory-wager.com
- Group: team@factory-wager.com
