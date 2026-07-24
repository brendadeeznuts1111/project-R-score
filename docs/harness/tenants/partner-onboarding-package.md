# Partner onboarding package (standard)

Checklist for onboarding a partner under FactoryWager ops — closes G1–G5 gaps from the partner bridge runbook.

## Standard package

| Step | Mechanism | Default |
|------|-----------|---------|
| Portal account | `POST /api/onboard?step=assign` | factory tenant, role viewer |
| Referral | `?referral=<tree-node-id>` or body `referral` | sets parent + cut |
| Expert feed | `assignOnboardingDefaults` | first active NBA expert or `config/onboarding-defaults.toml` |
| Profile template | `templateIdForSource` | `default-prospect` TOML |
| Telegram link | `/start link_<nonce>` on `@factorywager_bot` | ops-sync `telegram_linked` |
| Welcome DM | `partner.welcome` outbox | R2 + Telegram when linked |
| Play delivery | `play.dispatched` + inline keyboard | Place ✓ / Skip ack |
| Funding | `fundViaRail` + provisioning queue | manual or `automated_test` |

## Config SSOT

- Templates: [`config/partner-templates/`](../../../config/partner-templates/)
- Onboarding defaults: [`config/onboarding-defaults.toml`](../../../config/onboarding-defaults.toml)
- Bridge code: [`lib/operations/partner-onboarding.ts`](../../../lib/operations/partner-onboarding.ts)

## CLI

```bash
# Apply package to existing tree node
bun tools/onboard-partner-package.ts <tree-node-id>

# Factory bot webhook + command menu
bun run telegram:factory:setup

# Drain R2-queued ops commands (edge webhook path)
bun run telegram:ops:consume

# Prove portal panels
bun run ops:snapshot:demo
bun run verify:portal:static
```

## Telegram commands (factory webhook)

| Command | Description |
|---------|-------------|
| `/start link_*` | Link portal account |
| `/link` | Link instructions |
| `/status` | Accounts, placed, P&L |
| `/accounts` | Sportsbook balances |
| `/plays` | Pending plays + ack status |
| `/tree` | Downstream network |
| `/register` | Sub-agent under referral id |

## Related

- [`ops-partner-bridge.md`](ops-partner-bridge.md)
- [`lib/telegram/README.md`](../../../lib/telegram/README.md)
