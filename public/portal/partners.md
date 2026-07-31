# Partners

Package Telegram forums, Accounting topic deals, and betting deposit rails.

| Board | Path |
|-------|------|
| HTML | [`/portal/partners/`](./partners/) |
| Handshake bake | [`/registry/telegram-handshake.json`](../registry/telegram-handshake.json) |
| Seat capital desk | [`/registry/seat-capital-desk.json`](../registry/seat-capital-desk.json) |
| Partners-ops (v2) | [`/registry/partners-ops.json`](../registry/partners-ops.json) |
| Handshake catalog | [`/registry/telegram-handshake-catalog.json`](../registry/telegram-handshake-catalog.json) |

## Sections

1. **Telegram package groups** — partner CODE, membership tell, invite, handshake verify
2. **Accounting deals** — fund status, pinned desk, checklist · topic `Accounting`
3. **Betting deposits** — per-out deposit method · send-to · max bet · freeplay %
4. **Partner messages** — `partnerViews` + templates from seat bake (`confirm-active` / todo / topic prompts)

## CLI

```bash
bun run telegram:handshake:catalog
bun run telegram:handshake:invite-gap
bun run telegram:package-group:accounting
bun run seat:desk:refresh
bun run seat:desk:partner-message CALL --json
bun run partners:build
bun run partners:validate
```

Docs: [`partner-package-group-handshake.md`](../../docs/harness/tenants/partner-package-group-handshake.md) · [`seat-capital-desk.md`](../../docs/harness/tenants/seat-capital-desk.md)
