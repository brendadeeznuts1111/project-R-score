# Tennis

Tenant portal for Tennis analytics and operations.

- Bot: `factorywager_tennis_bot`
- Webhook: `/api/telegram/webhook/tennis`
- Registry packages: `/registry/tennis/registry.json`
- **Cloud agent registry auth:** `/registry/tennis/agent-auth.json`
  (`status: configured`)
  - Env: `FACTORY_WAGER_TOKEN` · vault
    `pass://factorywager/FactoryWager Registry Token/password`
  - Registry: `https://registry.factory-wager.com/`
  - Docs: `docs/harness/tenants/tennis-hq-registry.md` · Tennis HQ
    `docs/REGISTRY.md`

See `/portal/tennis/` for the live dashboard.
