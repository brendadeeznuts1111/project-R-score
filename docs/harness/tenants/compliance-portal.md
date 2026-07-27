# Compliance portal board

**Plane:** public Pages + local Bun mock  
**Artifacts:** `public/registry/compliance-*.json` · portal `/portal/compliance/`  
**Secrets:** bake offline-safe; deploy via Proton Pass `CLOUDFLARE_API_TOKEN`

## Architecture

```text
bun run compliance:bake
        │
        ├── show-enhancements (deepEquals · escapeHTML proofs)
        ├── shadow matrix (real vs ?shadow=true checks)
        ├── public/registry/compliance-board.json
        ├── public/registry/compliance-enhancements.json
        ├── public/registry/compliance-shadow.json
        └── bakeJsonEmbed → public/portal/compliance/index.html

Pages edge:  GET /api/compliance  → ASSETS registry snapshot (read-only)
Local Bun:   functions-bun-only/api/compliance → in-process mock handler
Workers:     no dedicated Worker — bake runs in CI/cron; Pages serves static
Proton Pass: inject CF token for deploy only (pass://factorywager/Cloudflare API Token)
```

## Operator loop

```bash
# 1. Prove offline board
bun run compliance:bake
bun run ops:enhancements

# 2. Local portal
bun run serve:public:hot   # open /portal/compliance/

# 3. Vault + deploy
bun run proton:inject:factorywager:reasonix
bun run compliance:bake:vault
bun run proton:deploy:pages
```

## Env (non-secret)

| Name | Role |
|------|------|
| `COMPLIANCE_URL` | Optional remote mock base for shadow bake (default: embed mock) |
| `COMPLIANCE_MOCK_PORT` | Local mock listen port (default 8787) |
| `CLOUDFLARE_API_TOKEN` | **Vaulted** — Pages deploy only |

## Related

- [`lib/operations/state-compliance-http.ts`](../../../lib/operations/state-compliance-http.ts)
- [`tools/show-enhancements.ts`](../../../tools/show-enhancements.ts)
- [`docs/harness/tenants/proton-integration.md`](proton-integration.md)
- [`docs/portal-foundation.md`](../../portal-foundation.md)
