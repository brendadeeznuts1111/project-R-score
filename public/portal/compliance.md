# Compliance board

MA/NJ regulatory enhancement proofs + shadow check matrix for the FactoryWager portal.

## Surfaces

| Path | Role |
|------|------|
| [`/portal/compliance/`](/portal/compliance/) | Portal board (embed + fetch) |
| [`/registry/compliance-board.json`](/registry/compliance-board.json) | Combined artifact |
| [`/registry/compliance-enhancements.json`](/registry/compliance-enhancements.json) | deepEquals / escapeHTML rows |
| [`/registry/compliance-shadow.json`](/registry/compliance-shadow.json) | Real vs shadow matrix |
| [`/api/compliance`](/api/compliance) | Pages snapshot API (read-only) |

## Bake

```bash
bun run compliance:bake
# Vault-aware (Proton Pass inject for deploy tokens — bake itself is offline-safe):
bun run proton:run -- factorywager -- bun run compliance:bake
bun run proton:deploy:pages
```

## Live mock (local only)

```bash
bun run ops:compliance:mock
bun run ops:compliance:status
bun run ops:enhancements
```

Optional public base URL (not a secret): `COMPLIANCE_URL` after inject if you point status tools at a remote mock.

## Proton Pass

| Item | Vault | Env |
|------|-------|-----|
| Cloudflare API Token | `pass://factorywager/Cloudflare API Token/password` | `CLOUDFLARE_API_TOKEN` for Pages deploy |
| Bake / mock | — | No secret required |

See [`docs/harness/tenants/proton-integration.md`](../../docs/harness/tenants/proton-integration.md).
