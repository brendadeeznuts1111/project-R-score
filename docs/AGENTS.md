# AGENTS — full guide

**Read first:** root [`AGENTS.md`](../AGENTS.md) · wiki index [`../wiki-index.md`](../wiki-index.md).

## Platform

| Concern | Document |
|---------|----------|
| Operating rules / brands / wire summary | [`../AGENTS.md`](../AGENTS.md) |
| Human hub / live surfaces | [`../README.md`](/) |
| Coding standards | [`../.custom-instructions.md`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/.custom-instructions.md) · [DEVELOPMENT-STANDARDS.md](./DEVELOPMENT-STANDARDS.md) |
| Install / bunfig | [UNIFIED.md](./UNIFIED.md) |
| Wire boundary (full) | [WIRE_BOUNDARY.md](./WIRE_BOUNDARY.md) |
| Domain → concept → shape → surface | [DOMAIN_CONCEPT_SHAPE.md](./DOMAIN_CONCEPT_SHAPE.md) |
| Bun capabilities | [BUN_NATIVE_CAPABILITIES.md](./BUN_NATIVE_CAPABILITIES.md) · [Utilities guides map](./BUN_NATIVE_CAPABILITIES.md#utilities-guides-map) |
| Console depth / `bun run -` | root [AGENTS.md § Console depth](../AGENTS.md#console-depth-output-verbosity) · [`lib/console-depth.md`](../lib/console-depth.md) · hub [`lib/bun-runtime.md`](../lib/bun-runtime.md) · `bun test tests/console-depth.test.ts` |
| Bun channel/type governance | [design/bun-channel-governance.md](./design/bun-channel-governance.md) · `bun run bun:channel:check` |
| Docs operate | [BUN_DOCS_OPERATE.md](./BUN_DOCS_OPERATE.md) · `bun run docs:refresh` |
| Audit findings/concepts | [audit/README.md](./audit/README.md) · `bun tools/bun-doc-refs.ts suggest --audit "<q>"` · claim `audit-findings-catalog` |
| Import graph | [IMPORT_BOUNDARIES.md](./IMPORT_BOUNDARIES.md) |
| Workspace map | [`../STRUCTURE.md`](../STRUCTURE.md) |
| Harness JIT | [harness/README.md](harness/) · `bun run harness:status` |
| Path SSOT | [`../lib/docs/repo-docs.ts`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/docs/repo-docs.ts) |
| Platform routing | [platform-routing.md](./platform-routing.md) · `bun run verify:pages-edge` |
| Portal foundation | [portal-foundation.md](./portal-foundation.md) · `bun run verify:portal:static` · color kernel: `bun run validate:colors` / `test:colors` (claim `color-kernel-theme-aliases`) |

## Operator · portal · Telegram

| Concern | Document · commands |
|---------|---------------------|
| Compliance portal (MA/NJ) | [harness/tenants/compliance-portal.md](./harness/tenants/compliance-portal.md) · `compliance:bake` · `compliance:verify` |
| Partner limit raises | [harness/tenants/partner-limits.md](./harness/tenants/partner-limits.md) · `/portal/limits/` · `ops:limits:demo` · bake `ops:snapshot` → `limit-raises.json` |
| TOC Ops board | [harness/tenants/toc-ops.md](./harness/tenants/toc-ops.md) · `/portal/toc/` · `ops:seed:toc` |
| Ops loop / outbox | [harness/tenants/ops-loop-throughput.md](./harness/tenants/ops-loop-throughput.md) |
| Ops snapshot / registry | [harness/tenants/ops-snapshot.md](./harness/tenants/ops-snapshot.md) · `ops:snapshot` |
| Public plane audit | [harness/tenants/public-plane.md](./harness/tenants/public-plane.md) · `public:audit:verify` |
| Factory Telegram | [harness/tenants/telegram-factory.md](./harness/tenants/telegram-factory.md) · `telegram:verify` |
| Package-group handshake | [harness/tenants/partner-package-group-handshake.md](./harness/tenants/partner-package-group-handshake.md) · `telegram:handshake:readiness --deep` |
| Seat capital desk | [harness/tenants/seat-capital-desk.md](./harness/tenants/seat-capital-desk.md) · `test:seat-desk` |
| Partner onboard package | [harness/tenants/partner-onboarding-package.md](./harness/tenants/partner-onboarding-package.md) |
| Partner dashboard MVP | [design/partner-dashboard-mvp.md](./design/partner-dashboard-mvp.md) · [design/partner-dashboard-mvp.toml](./design/partner-dashboard-mvp.toml) |
| Identity / auth (Phase 0–2b) | [`../lib/identity/README.md`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/identity/README.md) |

## Cloudflare · deploy

| Concern | Document |
|---------|----------|
| Cloudflare / R2 / Pages | [`../config/r2-env.ts`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/config/r2-env.ts) · `bun run cloudflare:env` · [harness/tenants/cloudflare-pages.md](./harness/tenants/cloudflare-pages.md) |
| Proton / vault deploy | [harness/tenants/proton-integration.md](./harness/tenants/proton-integration.md) · `proton:inject:factorywager:reasonix` |
| Cloudflare Access SSO | [harness/tenants/cloudflare-access.md](./harness/tenants/cloudflare-access.md) |

**Spine:** `lib/` · `packages/` · `scripts/` · `tools/` · `docs/` · selected `projects/active/*` workspaces. Nested own-repos under `projects/active/` are not homebase SSOT.

If this file disagrees with root `AGENTS.md` / `UNIFIED.md` / `WIRE_BOUNDARY.md`, **those win**.
