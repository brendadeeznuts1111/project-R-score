# Compliance portal board

**Plane:** public Pages + local Bun mock  
**Artifacts:** `public/registry/compliance-*.json` · portal `/portal/compliance/`  
**Secrets:** bake offline-safe; deploy via Proton Pass `CLOUDFLARE_API_TOKEN`

## Architecture

```text
bun run compliance:bake          # direct
bun run ops:snapshot             # companion bake (default; --no-compliance to skip)
        │
        ├── show-enhancements (deepEquals · escapeHTML proofs)
        ├── shadow matrix (real vs ?shadow=true checks)
        ├── public/registry/compliance-board.json
        ├── public/registry/compliance-enhancements.json
        ├── public/registry/compliance-shadow.json
        └── bakeJsonEmbed → public/portal/compliance/index.html

Owner: tools/bake-compliance-portal.ts → bakeCompliancePortal()
       ops-snapshot / snapshot-cron call it before ops-summary + monitoring
       so payload.compliance and /registry/monitoring.json stay fresh on Pages.

Pages edge:  GET /api/compliance  → ASSETS registry snapshot (read-only)
Local Bun:   serve-public /api/compliance → board file (503 if missing bake)
Workers:     no dedicated Worker — bake runs in ops:snapshot cron; Pages serves static
Proton Pass: CF deploy token + optional REPORT_SIGNING_SECRET for board HMAC
```

## Operator loop

```bash
# 1. Prove offline board + tests
bun run compliance:verify

# 2. Local portal
bun run serve:public:hot   # open /portal/compliance/ · /api/compliance · /monitoring

# 3. Vault + deploy
bun run proton:inject:factorywager:reasonix
bun run compliance:bake:vault
bun run proton:deploy:pages
```

## One board → many projections

Single SSOT bake: `public/registry/compliance-board.json` (`bun run compliance:bake` / ops-snapshot companion).
Projectors live in [`lib/monitoring/compliance-slice.ts`](../../../lib/monitoring/compliance-slice.ts).

| Projection | Field / surface | Loader |
|------------|-----------------|--------|
| Ops summary | `ops-summary.compliance` (`OpsSummaryCompliance`) | `loadComplianceSummarySliceSync` → [`ops-summary.ts`](../../../lib/operations/ops-summary.ts) |
| Monitoring | `monitoring.compliance` tile · `/monitoring/` | `loadComplianceMonitoringSlice` |
| Health artifact | `/api/health` → `artifacts.complianceBoard` | `projectComplianceHealthArtifact` |
| Portal UI | `/portal/compliance/` embed + board | bake embed · `GET /api/compliance` |
| Adjacent cards | `/portal/ops/` panel · dashboard KPI · TOC “State compliance” | same board / summary slice |

Write path (DB, not board): `applyPartnerComplianceOnboard` / `parseComplianceOnboardFields` / `splitComplianceKvTokens` from [`lib/operations`](../../../lib/operations/index.ts) (barrel). Ops-facing type: `OpsSummaryCompliance` (same barrel). Full slice loaders + `ComplianceSummarySlice` / `ComplianceHealthArtifact` — import from `lib/monitoring` (or `compliance-slice.ts`).

- Edge health: missing bake → `exists:false` (no degrade); present + fail → `ok:false` (**degrades**).
- Route SSOT: `PORTAL_HTML_ROUTES` · `public-routes` · `/api/compliance`.

## Env (non-secret)

| Name | Role |
|------|------|
| `COMPLIANCE_URL` | Optional remote mock base for shadow bake (default: embed mock) |
| `COMPLIANCE_MOCK_PORT` | Local mock listen port (default 8787) |
| `CLOUDFLARE_API_TOKEN` | **Vaulted** — Pages deploy only |

## Env (signing — mintable / vault)

| Name | Role | Vault path (when wired) |
|------|------|-------------------------|
| `REPORT_SIGNING_SECRET` | Board + deep-audit **HMAC** | `pass://factorywager/Report Signing Secret/password` |
| `PLAY_SIGNING_SECRET` | Play **HMAC** (PlaySigner) | `pass://factorywager/Play Signing Secret/password` |

```bash
# Local mint (no Pass create required)
bun run vault:gap:mint-local
# Export minted material → Proton Pass, then:
# REPORT_SIGNING_SECRET={{ pass://factorywager/Report Signing Secret/password }}
bun run proton:inject:factorywager
bun run compliance:bake:vault
```

## Onboarding integration

```ts
import {
  applyPartnerOnboardPackage,
  applyPartnerComplianceOnboard,
  parseComplianceOnboardFields,
  splitComplianceKvTokens,
} from './lib/operations/index.ts';
// Board projections (types + loaders): import from './lib/monitoring/index.ts'

applyPartnerOnboardPackage(db, plan, {
  compliance: {
    stateCode: 'NJ',
    age: 28,
    location: 'Newark',      // locality only — never pack ZIP
    zipCode: '07102',
    identityVerified: true,
  },
});
// → partner_state_licenses + partner_geo_profiles + identity_verified
// Board bake still required for portal/ops/monitoring projections (compliance:bake).
```

## Related

- [`lib/operations/index.ts`](../../../lib/operations/index.ts) — public barrel (onboard write + `OpsSummaryCompliance`)
- [`lib/operations/state-compliance-http.ts`](../../../lib/operations/state-compliance-http.ts)
- [`lib/operations/partner-compliance-onboard.ts`](../../../lib/operations/partner-compliance-onboard.ts)
- [`lib/monitoring/compliance-slice.ts`](../../../lib/monitoring/compliance-slice.ts) — board → projections
- [`lib/security/report-proof.ts`](../../../lib/security/report-proof.ts)
- [`tools/show-enhancements.ts`](../../../tools/show-enhancements.ts)
- [`tools/deep-audit-report.ts`](../../../tools/deep-audit-report.ts)
- [`docs/harness/tenants/proton-integration.md`](proton-integration.md)
- [`docs/harness/tenants/partner-onboarding-package.md`](partner-onboarding-package.md)
- [`docs/harness/ops-summary-endpoint.md`](../ops-summary-endpoint.md)
- [`docs/portal-foundation.md`](../../portal-foundation.md)
