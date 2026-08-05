# Tennis

Tenant portal for Tennis analytics and operations.

- Bot: `factorywager_tennis_bot`
- Webhook: `/api/telegram/webhook/tennis`
- Registry packages: `/registry/tennis/registry.json`
- **Cloud agent registry auth:** `/registry/tennis/agent-auth.json`
  (`registry auth status: configured`; producer runtime readiness is separate)
  - Env: `FACTORY_WAGER_TOKEN` · vault
    `pass://factorywager/FactoryWager Registry Token/password`
  - Registry: `https://registry.factory-wager.com/`
  - Docs: `docs/harness/tenants/tennis-hq-registry.md` · Tennis HQ
    [`docs/REGISTRY.md`](https://github.com/brendadeeznuts1111/king-zippy-umbra-acre/blob/main/docs/REGISTRY.md)

See `/portal/tennis/` for the live dashboard.
