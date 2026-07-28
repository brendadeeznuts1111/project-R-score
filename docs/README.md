# Documentation index

Navigation for **platform SSOT** docs (root + `docs/` + shared `lib` maps). Project-specific trees under `projects/active/` keep their own docs — not listed here.

## Start here

| Role | Path |
|------|------|
| Human hub | [`../README.md`](../README.md) |
| Wiki full index | [`../wiki-index.md`](../wiki-index.md) |
| Registry index (wiki) | [`../registry-index.md`](../registry-index.md) |
| Agent entry | [`../AGENTS.md`](../AGENTS.md) |
| Agent full guide | [AGENTS.md](./AGENTS.md) |
| Workspace map | [`../STRUCTURE.md`](../STRUCTURE.md) |
| Coding standards | [`../.custom-instructions.md`](../.custom-instructions.md) · [DEVELOPMENT-STANDARDS.md](./DEVELOPMENT-STANDARDS.md) |
| Harness JIT | [harness/README.md](./harness/README.md) · `bun run harness:status` |
| Live surfaces (wiki vs portal) | [`../README.md`](../README.md#live-surfaces) · [platform-routing.md](./platform-routing.md) |

## Live surfaces

| Surface | URL |
|---------|-----|
| Wiki | [wiki.factory-wager.com](https://wiki.factory-wager.com/) |
| Portal | [score.factory-wager.com/portal/](https://score.factory-wager.com/portal/) |
| Registry | [score.factory-wager.com/registry/](https://score.factory-wager.com/registry/) |
| Portal weave (JSON) | [portal-weave.json](https://score.factory-wager.com/registry/portal-weave.json) |

## Boundaries and install

| Role | Path | Anchors |
|------|------|---------|
| Bun install / bunfig / CI | [UNIFIED.md](./UNIFIED.md) | [TOC](./UNIFIED.md#table-of-contents) |
| Wire boundary (parse once) | [WIRE_BOUNDARY.md](./WIRE_BOUNDARY.md) | full map |
| Portal foundation (static UI) | [portal-foundation.md](./portal-foundation.md) | data.js · topbar · verify · dev reload · TOC board § |
| Platform routing (local vs Pages) | [platform-routing.md](./platform-routing.md) | domains · functions · auth plane |
| Compliance portal (MA/NJ) | [harness/tenants/compliance-portal.md](./harness/tenants/compliance-portal.md) | `/portal/compliance/` · `compliance:bake` |
| Seat capital desk | [harness/tenants/seat-capital-desk.md](./harness/tenants/seat-capital-desk.md) | Telegram desk · intake · registry bake |
| Factory Telegram | [harness/tenants/telegram-factory.md](./harness/tenants/telegram-factory.md) | surfaces · ops consume · templates |
| Package-group handshake | [harness/tenants/partner-package-group-handshake.md](./harness/tenants/partner-package-group-handshake.md) | readiness · invite gap · 23 lanes |
| Identity / auth subsystem | [../lib/identity/README.md](../lib/identity/README.md) | lockout · anomaly · geo · JIT |
| Ops snapshot / registry bake | [harness/tenants/ops-snapshot.md](./harness/tenants/ops-snapshot.md) | `ops:snapshot` · portal embeds |
| Public plane | [harness/tenants/public-plane.md](./harness/tenants/public-plane.md) | `public:audit:verify` |
| Proton / vault | [harness/tenants/proton-integration.md](./harness/tenants/proton-integration.md) | CF token · deploy · signing |
| TOC Ops portal tenant | [harness/tenants/toc-ops.md](./harness/tenants/toc-ops.md) | `/portal/toc` fixture · surface map · MCP boundary |
| Registry client SDK | [registry-client.md](./registry-client.md) | resolve · download · publish |
| Bun runtime nits (Phase 1) | [bun-runtime-nits.md](./bun-runtime-nits.md) | inspect · streams · url · file-io |
| Package import graph | [IMPORT_BOUNDARIES.md](./IMPORT_BOUNDARIES.md) | — |
| Bun native capabilities | [BUN_NATIVE_CAPABILITIES.md](./BUN_NATIVE_CAPABILITIES.md) | [TOC](./BUN_NATIVE_CAPABILITIES.md#table-of-contents) |
| Bun DX catalog | `bun run dx:catalog <id>` | SSOT [`config/bun-dx-catalog.ts`](../config/bun-dx-catalog.ts) |
| Bun token/catalog operate | [BUN_DOCS_OPERATE.md](./BUN_DOCS_OPERATE.md) · [docs-artifact-paths.ts](../lib/docs/docs-artifact-paths.ts) | `docs:refresh:fast` (daily) · `docs:feeds:refresh` · `docs:refresh` (full) |
| Bun-first policy | [bun/BUN_FIRST_POLICY.md](./bun/BUN_FIRST_POLICY.md) | pin 1.4.0 |

## Live trees (only)

| Tree | Role |
|------|------|
| [guides/](./guides/) | Short runbooks |
| [audit/](./audit/) | FactoryWager audit findings + concepts (sibling SSOT, not BunToken) |
| [organization/](./organization/) | Velocity / homebase discovery |
| [harness/](./harness/) | JIT index, proof, authority |
| [packages/](./packages/) | Package registry map |
| [performance/](./performance/) | Search baseline governance |
| [contributing/](./contributing/) | CONTRIBUTING |

## Tools

```bash
bun tools/bun-doc-refs.ts suggest "Bun.secrets"
bun run harness:status
bun run docs:map:check
bun run docs:refresh
bun run verify:proof-taxonomy:save   # proof JSON contracts + cross-proof parity
PAGES_VERIFY_BASE=https://project-r-score.pages.dev bun run verify:pages-edge
PORTAL_VERIFY_BASE=http://127.0.0.1:3000 bun run verify:portal
bun run verify:portal:static
bun run compliance:verify
bun run telegram:handshake:readiness --deep
bun run ops:snapshot --no-seed
bun run public:audit:verify
```

## Not SSOT / archives

Historical dumps formerly under `docs/` were **removed from the live tree** (2026-07). Local checkout may still have a gitignored copy under `docs/archives/retired-2026-07-deep-pass/` — that path is not tracked.

Recover any file: `git log --all --full-history -- 'docs/<name>.md'` · `git show <commit>:docs/<name>.md`.

Do not resurrect dumps into live `docs/`. Nested product docs stay under `projects/active/**`.
