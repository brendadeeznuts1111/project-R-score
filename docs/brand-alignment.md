# FactoryWager Brand & Infrastructure Alignment

## Domain Structure

Live DNS (all resolve to Cloudflare proxy IPs):
```
factory-wager.com          → Pages (score app, apex)
  www.factory-wager.com    → Pages (same as apex)
  score.factory-wager.com  → Pages (score app)
  registry.factory-wager.com → Pages (Bun package registry)
  health.factory-wager.com → Pages health endpoint
  telegram.factory-wager.com → Telegram webhook
  support.factory-wager.com → HelpScout
  wiki.factory-wager.com   → GitHub Pages
  ledger.factory-wager.com → machine-side cloudflared tunnel (Sports Terminal; no repo config)
  terminal.factory-wager.com → machine-side cloudflared tunnel (Sports Terminal; no repo config)
```

Not resolving (no DNS records):
```
reasonix.factory-wager.com, api, mail, news, backup, status
```

## Email
```
admin@factory-wager.com    → Proton Mail (org admin)
dev@factory-wager.com      → Proton Mail (developer)
bot@factory-wager.com      → Proton Mail (automation)
team@factory-wager.com     → Group (admin+dev+bot)
```

## Naming
```
Org: APEX-BIOLABS
Email: apexbiolabsdirect@proton.me
Domain: factory-wager.com
GitHub: brendadeeznuts1111
```

## Registry
```
Production: https://registry.factory-wager.com/
Local dev:  http://localhost:3000/
Scope: @factorywager, @factory-wager, @factory
```

## Proton Pass Vaults
| Vault | Purpose | Agent |
|-------|---------|-------|
| factorywager | Monorepo + Telegram secrets | factorywager-agent |
| cloudflare | DNS/R2/Pages keys | cloudflare-agent |
| bet-ticker | Poller/token secrets | bet-ticker-agent |
| cascade-mover | Sports intelligence | cascade-agent |
| Personal | Personal SSH key | — |

> Telegram secrets live in the `factorywager` vault — the retired `tenants` vault is not accessible to the `factorywager-bot` PAT.

## Agent Access
```bash
source scripts/agent-env.sh <vault-name>
```
