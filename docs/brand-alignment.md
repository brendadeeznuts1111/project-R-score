# FactoryWager Brand & Infrastructure Alignment

**Role** Domain map · email · naming · vaults (human SSOT for brand plane).  
**Tunnels / machine cloudflared** → [`docs/harness/tenants/tunnel-inventory.md`](harness/tenants/tunnel-inventory.md) (not duplicated here).  
**Routing (local vs Pages)** → [`docs/platform-routing.md`](platform-routing.md).

## Domain Structure

Verified live (dig + curl 2026-07-28 — status in parentheses; `terminal` CNAME removal re-checked 2026-07-29):
```
factory-wager.com          → Pages (project-r-score, apex)
  www.factory-wager.com    → Pages (same as apex)
  score.factory-wager.com  → Pages (portal + proofs; /portal behind Access since 2026-07-28 — 302 → login)
  registry.factory-wager.com → Pages (/api/registry/* → R2, read-only allowlist)
  wiki.factory-wager.com   → GitHub Pages (docs hub, proxied via Cloudflare)
  ledger.factory-wager.com → cloudflared tunnel → this Mac :3000 · Cloudflare Access APPLIED (302 → login)
```

Resolves but misleading (do not treat as functional endpoints):
```
  health.factory-wager.com   → Pages vanity CNAME — serves app landing, NOT the health endpoint (real: score.factory-wager.com/health)
  telegram.factory-wager.com → Pages vanity CNAME — serves app landing, NOT the webhook (real: score…/api/telegram/webhook/{tenant})
```

Not resolving (no DNS records):
```
reasonix.factory-wager.com, api, mail, news, backup, status,
terminal.factory-wager.com (CNAME deleted 2026-07-28 — was dangling tunnel),
support.factory-wager.com (CNAME deleted 2026-07-28 — was broken HelpScout)
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
