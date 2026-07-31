---
title: Wiki index
---

# FactoryWager Wiki — full index

Navigation hub for [wiki.factory-wager.com](https://wiki.factory-wager.com/). Homepage: [README hub](/).

**Quick jump:** [Live surfaces](#live-surfaces) · [Portal boards](#portal-boards) · [Registry](#registry-artifacts-key-bakes) · [Tenants](#harness-tenants) · [Proof loop](#operator-proof-loop)

## Platform entry

| Role | Link |
|------|------|
| Human hub | [Home](/) |
| Docs index | [`docs/`](docs/) |
| Agent entry | [`AGENTS.md`](AGENTS.md) · [`docs/AGENTS.md`](docs/AGENTS.md) |
| Workspace map | [`STRUCTURE.md`](STRUCTURE.md) |
| Harness JIT | [`docs/harness/`](docs/harness/) · `bun run harness:status` |
| Coding standards | [`docs/DEVELOPMENT-STANDARDS.md`](docs/DEVELOPMENT-STANDARDS.md) |
| Brand / domain map | [`docs/brand-alignment.md`](docs/brand-alignment.md) · tunnels [`tunnel-inventory.md`](docs/harness/tenants/tunnel-inventory.md) |

## Live surfaces

| Surface | URL |
|---------|-----|
| Wiki (GitHub Pages) | [wiki.factory-wager.com](https://wiki.factory-wager.com/) |
| Portal boards | [score.factory-wager.com/portal/](https://score.factory-wager.com/portal/) |
| Registry bake | [score.factory-wager.com/registry/](https://score.factory-wager.com/registry/) |
| Monitoring | [score.factory-wager.com/monitoring/](https://score.factory-wager.com/monitoring/) |
| Portal weave JSON | [portal-weave.json](https://score.factory-wager.com/registry/portal-weave.json) |
| Registry index (wiki) | [`registry-index.md`](registry-index.md) |

Routing: [`docs/platform-routing.md`](docs/platform-routing.md)

## Portal ↔ wiki integration

Bidirectional SSOT between GitHub Pages (this wiki) and Cloudflare Pages (portal + registry):

| Mechanism | Role |
|-----------|------|
| [`portal-weave.json`](https://score.factory-wager.com/registry/portal-weave.json) | Machine cross-links: `surfaces[]`, `artifacts[]`, **`wiki[]`**, `scripts[]` |
| [wiki-nav.ts](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/http/wiki-nav.ts) (repo) | Portal chrome wiki URL · weave `wiki[]` bake source |
| [`registry-index.md`](registry-index.md) | Registry-focused wiki companion |
| Portal ops dashboard | Renders weave surfaces + wiki links from JSON |

Rebake weave after doc changes: `bun run ops:snapshot --no-seed` or `bun run compliance:bake`.

## Portal boards

Live boards under `public/portal/<name>/` (plus Home). Product/ops first, then control-plane, then niche.

| Board | Live | Doc |
|-------|------|-----|
| Home | [/portal/](https://score.factory-wager.com/portal/) | [`docs/portal-foundation.md`](docs/portal-foundation.md) |
| Ops | [/portal/ops/](https://score.factory-wager.com/portal/ops/) | [`ops-loop-throughput.md`](docs/harness/tenants/ops-loop-throughput.md) |
| TOC Ops | [/portal/toc/](https://score.factory-wager.com/portal/toc/) | [`toc-ops.md`](docs/harness/tenants/toc-ops.md) |
| Compliance | [/portal/compliance/](https://score.factory-wager.com/portal/compliance/) | [`compliance-portal.md`](docs/harness/tenants/compliance-portal.md) |
| Limits | [/portal/limits/](https://score.factory-wager.com/portal/limits/) | [`partner-limits.md`](docs/harness/tenants/partner-limits.md) |
| Partner history | [/portal/partner-history/](https://score.factory-wager.com/portal/partner-history/) | [`partner-limits.md`](docs/harness/tenants/partner-limits.md) |
| Dashboard | [/portal/dashboard/](https://score.factory-wager.com/portal/dashboard/) | [`public-plane.md`](docs/harness/tenants/public-plane.md) |
| Health | [/portal/health/](https://score.factory-wager.com/portal/health/) | [`public-plane.md`](docs/harness/tenants/public-plane.md) |
| Env | [/portal/env/](https://score.factory-wager.com/portal/env/) | [`public-plane.md`](docs/harness/tenants/public-plane.md) |
| DOD | [/portal/dod/](https://score.factory-wager.com/portal/dod/) | [`public-plane.md`](docs/harness/tenants/public-plane.md) |
| Skills | [/portal/skills/](https://score.factory-wager.com/portal/skills/) | [`public-plane.md`](docs/harness/tenants/public-plane.md) |
| Packages | [/portal/packages/](https://score.factory-wager.com/portal/packages/) | [`monorepo-health.md`](docs/harness/tenants/monorepo-health.md) |
| Doctor | [/portal/doctor/](https://score.factory-wager.com/portal/doctor/) | [`docs/UNIFIED.md`](docs/UNIFIED.md) |
| Bunfig | [/portal/bunfig/](https://score.factory-wager.com/portal/bunfig/) | [`docs/UNIFIED.md`](docs/UNIFIED.md) |
| Install hygiene | [/portal/install-hygiene/](https://score.factory-wager.com/portal/install-hygiene/) | [`docs/UNIFIED.md`](docs/UNIFIED.md) · `bake:install-hygiene` |
| Vault | [/portal/vault/](https://score.factory-wager.com/portal/vault/) | [`proton-integration.md`](docs/harness/tenants/proton-integration.md) |
| Failures | [/portal/failures/](https://score.factory-wager.com/portal/failures/) | [`public-plane.md`](docs/harness/tenants/public-plane.md) |
| Brands | [/portal/brands/](https://score.factory-wager.com/portal/brands/) | [`public-plane.md`](docs/harness/tenants/public-plane.md) |
| Catalog | [/portal/catalog/](https://score.factory-wager.com/portal/catalog/) | [`public-plane.md`](docs/harness/tenants/public-plane.md) |
| Surfaces | [/portal/surfaces/](https://score.factory-wager.com/portal/surfaces/) | [`public-plane.md`](docs/harness/tenants/public-plane.md) |
| Tools | [/portal/tools/](https://score.factory-wager.com/portal/tools/) | [`public-plane.md`](docs/harness/tenants/public-plane.md) |
| Factory | [/portal/factory/](https://score.factory-wager.com/portal/factory/) | [`telegram-factory.md`](docs/harness/tenants/telegram-factory.md) |
| Identity | [/portal/identity/](https://score.factory-wager.com/portal/identity/) | [`public-plane.md`](docs/harness/tenants/public-plane.md) |
| Science | [/portal/science/](https://score.factory-wager.com/portal/science/) | — |
| Tennis | [/portal/tennis/](https://score.factory-wager.com/portal/tennis/) | agent-auth [`/registry/tennis/agent-auth.json`](https://score.factory-wager.com/registry/tennis/agent-auth.json) · [tennis-hq-registry](docs/harness/tenants/tennis-hq-registry.md) |

## Registry artifacts (key bakes)

| Artifact | JSON |
|----------|------|
| Ops summary | [ops-summary.json](https://score.factory-wager.com/registry/ops-summary.json) |
| Compliance board | [compliance-board.json](https://score.factory-wager.com/registry/compliance-board.json) |
| Telegram handshake | [telegram-handshake.json](https://score.factory-wager.com/registry/telegram-handshake.json) |
| Seat capital desk | [seat-capital-desk.json](https://score.factory-wager.com/registry/seat-capital-desk.json) |
| TOC Ops | [toc-ops.json](https://score.factory-wager.com/registry/toc-ops.json) |
| Monitoring | [monitoring.json](https://score.factory-wager.com/registry/monitoring.json) |
| Limit raises | [limit-raises.json](https://score.factory-wager.com/registry/limit-raises.json) |
| Verification index | [verification-index.json](https://score.factory-wager.com/registry/verification-index.json) |
| Portal weave | [portal-weave.json](https://score.factory-wager.com/registry/portal-weave.json) |
| FormData proof | [formdata-proof.json](https://score.factory-wager.com/registry/formdata-proof.json) |
| Networking channel proof | [networking-channel-proof.json](https://score.factory-wager.com/registry/networking-channel-proof.json) |
| Verification pinned 1.3.14 | [verification-pinned-1.3.14.json](https://score.factory-wager.com/registry/verification-pinned-1.3.14.json) |
| Verification stable 1.4.0 | [verification-stable-1.4.0.json](https://score.factory-wager.com/registry/verification-stable-1.4.0.json) |
| Stable 1.4.0 bundler | [verification-stable-1.4.0-bundler.json](https://score.factory-wager.com/registry/verification-stable-1.4.0-bundler.json) |
| Stable 1.4.0 networking | [verification-stable-1.4.0-networking.json](https://score.factory-wager.com/registry/verification-stable-1.4.0-networking.json) |

Document-plane pins also render on portal **Health** and **Dashboard** (`public/portal/proof-index.js`).

Bake: `bun run ops:snapshot` · compliance: `bun run compliance:bake` · doc: [`ops-snapshot.md`](docs/harness/tenants/ops-snapshot.md)

## Harness tenants

### Operator · portal · Telegram

| Tenant | Doc |
|--------|-----|
| Compliance portal | [`compliance-portal.md`](docs/harness/tenants/compliance-portal.md) |
| Partner limit raises | [`partner-limits.md`](docs/harness/tenants/partner-limits.md) |
| TOC Ops | [`toc-ops.md`](docs/harness/tenants/toc-ops.md) |
| Ops loop / outbox | [`ops-loop-throughput.md`](docs/harness/tenants/ops-loop-throughput.md) |
| Ops snapshot | [`ops-snapshot.md`](docs/harness/tenants/ops-snapshot.md) |
| Public plane | [`public-plane.md`](docs/harness/tenants/public-plane.md) |
| serve-public bind | [`serve-public-bind.md`](docs/harness/tenants/serve-public-bind.md) · `brand:status:bind` · `brand:status:lifecycle` |
| Factory Telegram | [`telegram-factory.md`](docs/harness/tenants/telegram-factory.md) |
| Package-group handshake | [`partner-package-group-handshake.md`](docs/harness/tenants/partner-package-group-handshake.md) |
| Seat capital desk | [`seat-capital-desk.md`](docs/harness/tenants/seat-capital-desk.md) |
| Partner onboard | [`partner-onboarding-package.md`](docs/harness/tenants/partner-onboarding-package.md) |
| Ops partner bridge | [`ops-partner-bridge.md`](docs/harness/tenants/ops-partner-bridge.md) |

### Cloudflare · deploy · vault

| Tenant | Doc |
|--------|-----|
| Cloudflare Pages | [`cloudflare-pages.md`](docs/harness/tenants/cloudflare-pages.md) |
| Cloudflare Access | [`cloudflare-access.md`](docs/harness/tenants/cloudflare-access.md) |
| Proton / vault | [`proton-integration.md`](docs/harness/tenants/proton-integration.md) |
| Deploy production | [`deploy-production.md`](docs/harness/tenants/deploy-production.md) |
| Deploy staging | [`deploy-staging.md`](docs/harness/tenants/deploy-staging.md) |
| Tunnel inventory | [`tunnel-inventory.md`](docs/harness/tenants/tunnel-inventory.md) |

### Harness quality · CI

| Tenant | Doc |
|--------|-----|
| Install verify | [`install-verify.md`](docs/harness/tenants/install-verify.md) |
| CI core | [`ci-core.md`](docs/harness/tenants/ci-core.md) |
| TypeScript CI | [`typescript-ci.md`](docs/harness/tenants/typescript-ci.md) |
| Coverage floor | [`coverage-floor.md`](docs/harness/tenants/coverage-floor.md) |
| Complexity floor | [`complexity-floor.md`](docs/harness/tenants/complexity-floor.md) |
| Docs integrity | [`docs-integrity.md`](docs/harness/tenants/docs-integrity.md) |
| Reference discovery | [`reference-discovery.md`](docs/harness/tenants/reference-discovery.md) |
| Registry integrity | [`registry-integrity.md`](docs/harness/tenants/registry-integrity.md) |

### Code · lib

| Topic | Doc |
|-------|-----|
| Identity / auth | [`lib/identity/README.md`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/identity/README.md) · `bun test tests/identity-*.test.ts` |
| Branded IDs | [`lib/types/branded/README.md`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/types/branded/README.md) |
| Wire boundary | [`docs/WIRE_BOUNDARY.md`](docs/WIRE_BOUNDARY.md) |
| Bun native | [`docs/BUN_NATIVE_CAPABILITIES.md`](docs/BUN_NATIVE_CAPABILITIES.md) |

## Operator proof loop

```bash
bun run harness:status
bun run ops:snapshot --no-seed
bun run compliance:verify
bun run telegram:handshake:readiness --deep
bun run test:seat-desk
bun test tests/identity-*.test.ts
bun run verify:portal:static
bun run public:audit:verify
PAGES_VERIFY_BASE=https://project-r-score.pages.dev bun run verify:pages-edge
```

Proof journey: [`docs/harness/PROOF.md`](docs/harness/PROOF.md) · `bun run proof:install`

Deploy Pages: `bun run proton:inject:factorywager:reasonix` → `bun run proton:deploy:pages`

## Doc trees

| Tree | Path |
|------|------|
| Guides | [`docs/guides/`](docs/guides/) |
| Harness | [`docs/harness/`](docs/harness/) |
| Audit | [`docs/audit/`](docs/audit/) |
| Organization | [`docs/organization/`](docs/organization/) |
