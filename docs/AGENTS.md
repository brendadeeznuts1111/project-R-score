# AGENTS — routing tables

Just-in-time task router. Root [`AGENTS.md`](../AGENTS.md) owns always-loaded
guardrails; the
[`capability map`](harness/capability-map.md#grounded-capability-map) owns the
grounded API matrix. Load only the matching route and its owner.

## Platform

- Coding standards: `.custom-instructions.md` ·
  [`DEVELOPMENT-STANDARDS.md`](DEVELOPMENT-STANDARDS.md)
- Install and bunfig: [`UNIFIED.md`](UNIFIED.md)
- Wire boundary: [`WIRE_BOUNDARY.md`](WIRE_BOUNDARY.md)
- Domain → concept → shape → surface:
  [`DOMAIN_CONCEPT_SHAPE.md`](DOMAIN_CONCEPT_SHAPE.md)
- Bun APIs: [`BUN_NATIVE_CAPABILITIES.md`](BUN_NATIVE_CAPABILITIES.md) ·
  [`BUN_DOCS_OPERATE.md`](BUN_DOCS_OPERATE.md) · `bun run docs:refresh`
- Native fetch protocols: `lib/docs/fetch-protocol-docs.ts` ·
  `bun test tests/bun-release-tracker.test.ts`
- Console output:
  [root console policy](../AGENTS.md#console-depth-output-verbosity) ·
  `lib/console/` · `lib/bun-runtime.md`
- `bun create`:
  [root scaffold policy](../AGENTS.md#bun-create-templating--scaffold) ·
  [`design/bun-create-alignment.md`](design/bun-create-alignment.md) ·
  `lib/factory/`
- Package release:
  [`design/bun-publish-alignment.md`](design/bun-publish-alignment.md) ·
  `bun publish --dry-run` · `bun pm pack`
- CLI flags:
  [root unknown-option policy](../AGENTS.md#unknown-long-options-bun_strip_unknown)
  · [`harness/cli-constants-flags.md`](harness/cli-constants-flags.md) ·
  `bun run cli:flags:check`
- Bun upstream PR proof:
  [`harness/tenants/bun-upstream-contributing.md`](harness/tenants/bun-upstream-contributing.md)
  · `bun run bun:pr:verify -- <pr> [--proof=all] [--json]`
- Bun channel/type governance:
  [`design/bun-channel-governance.md`](design/bun-channel-governance.md) ·
  `bun run bun:channel:check`
- Audit findings: [`audit/README.md`](audit/README.md) ·
  `bun tools/bun-doc-refs.ts suggest --audit "<q>"`
- Import graph: [`IMPORT_BOUNDARIES.md`](IMPORT_BOUNDARIES.md) ·
  `bun run check:import-graph`
- Workspace and path ownership: [`STRUCTURE.md`](../STRUCTURE.md) ·
  `lib/docs/repo-docs.ts`
- Harness: [`harness/README.md`](harness/) · `bun run harness:status`
- Platform routing: [`platform-routing.md`](platform-routing.md) ·
  `bun run verify:pages-edge`
- Portal foundation: [`portal-foundation.md`](portal-foundation.md) ·
  `bun run verify:portal:static`

## Operator, portal, and Telegram

- Compliance portal:
  [`harness/tenants/compliance-portal.md`](harness/tenants/compliance-portal.md)
- Partner limits:
  [`harness/tenants/partner-limits.md`](harness/tenants/partner-limits.md)
- TOC board: [`harness/tenants/toc-ops.md`](harness/tenants/toc-ops.md)
- Ops loop:
  [`harness/tenants/ops-loop-throughput.md`](harness/tenants/ops-loop-throughput.md)
- Ops registry snapshot:
  [`harness/tenants/ops-snapshot.md`](harness/tenants/ops-snapshot.md)
- Public-plane audit:
  [`harness/tenants/public-plane.md`](harness/tenants/public-plane.md)
- Factory Telegram:
  [`harness/tenants/telegram-factory.md`](harness/tenants/telegram-factory.md)
- Package-group handshake:
  [`harness/tenants/partner-package-group-handshake.md`](harness/tenants/partner-package-group-handshake.md)
- Seat capital desk:
  [`harness/tenants/seat-capital-desk.md`](harness/tenants/seat-capital-desk.md)
- Partner onboarding:
  [`harness/tenants/partner-onboarding-package.md`](harness/tenants/partner-onboarding-package.md)
- Partner dashboard:
  [`design/partner-dashboard-mvp.md`](design/partner-dashboard-mvp.md)
- Identity and auth: `lib/identity/`

## Cloudflare and deploy

- Pages/R2: `config/r2-env.ts` ·
  [`harness/tenants/cloudflare-pages.md`](harness/tenants/cloudflare-pages.md) ·
  `bun run cloudflare:env`
- Proton/vault:
  [`harness/tenants/proton-integration.md`](harness/tenants/proton-integration.md)
- Access:
  [`harness/tenants/cloudflare-access.md`](harness/tenants/cloudflare-access.md)
- Remote hosts and retired tunnels:
  [`harness/tenants/tunnel-inventory.md`](harness/tenants/tunnel-inventory.md) ·
  `bun run remote:setup`

Repository spine: `lib/` · `packages/` · `scripts/` · `tools/` · `docs/` ·
selected `projects/active/*`. Nested repositories under `projects/active/` are
not homebase sources of truth.
