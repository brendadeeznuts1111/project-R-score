# Documentation index

Navigation for **platform SSOT** docs (root + `docs/` + shared `lib` maps).
Project-specific trees under `projects/active/` keep their own docs — not listed
here.

## Start here

| Role                           | Path                                                                                                                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Human hub                      | [Home](/)                                                                                                                                                                              |
| Wiki full index                | [wiki index](../wiki-index.md)                                                                                                                                                         |
| Registry index (wiki)          | [registry index](../registry-index.md)                                                                                                                                                 |
| Agent entry                    | [AGENTS.md](../AGENTS.md)                                                                                                                                                              |
| Agent full guide               | [AGENTS.md](./AGENTS.md)                                                                                                                                                               |
| Workspace map                  | [STRUCTURE.md](../STRUCTURE.md)                                                                                                                                                        |
| Coding standards               | [DEVELOPMENT-STANDARDS.md](./DEVELOPMENT-STANDARDS.md) · full [custom-instructions.md](https://github.com/brendadeeznuts1111/project-R-score/blob/main/.custom-instructions.md) (repo) |
| Dev / test workflow            | [DEVELOPMENT-WORKFLOW.md](./DEVELOPMENT-WORKFLOW.md)                                                                                                                                   |
| Surface coverage map           | [SURFACE_COVERAGE.md](./SURFACE_COVERAGE.md) · `bun run surface-coverage:map`                                                                                                          |
| Harness JIT                    | [harness index](./harness/) · `bun run harness:status`                                                                                                                                 |
| Live surfaces (wiki vs portal) | [Live surfaces](/#live-surfaces) · [platform-routing.md](./platform-routing.md)                                                                                                        |

## Live surfaces

| Surface             | URL                                                                             |
| ------------------- | ------------------------------------------------------------------------------- |
| Wiki                | [wiki.factory-wager.com](https://wiki.factory-wager.com/)                       |
| Portal              | [score.factory-wager.com/portal/](https://score.factory-wager.com/portal/)      |
| Registry            | [score.factory-wager.com/registry/](https://score.factory-wager.com/registry/)  |
| Portal weave (JSON) | [portal-weave.json](https://score.factory-wager.com/registry/portal-weave.json) |
| Ops board map (operator guide) | [portal-ops-board-map.md](portal-ops-board-map.md) · `bun tools/bake-portal-ops-map.ts` |

## Boundaries and install

| Role                              | Path                                                                                                                                                                     | Anchors                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Bun install / bunfig / CI         | [UNIFIED.md](./UNIFIED.md)                                                                                                                                               | [TOC](./UNIFIED.md#table-of-contents) · [catalogs & workspace protocols](./UNIFIED.md#catalogs-and-workspace-protocols)     |
| Hybrid monorepo workspaces        | [harness/tenants/monorepo-workspaces.md](./harness/tenants/monorepo-workspaces.md)                                                                                       | `validate:workspaces` · catalog: · filter · tag `v5.2.2-monorepo-workspaces-catalog`                                        |
| Wire boundary (parse once)        | [WIRE_BOUNDARY.md](./WIRE_BOUNDARY.md)                                                                                                                                   | full map                                                                                                                    |
| Concept lifecycle                 | [CONCEPT_LIFECYCLE.md](./CONCEPT_LIFECYCLE.md)                                                                                                                           | vocabulary · limit-row wire · graph/audit · board SSOT · E3 readiness                                                       |
| Portal foundation (static UI)     | [portal-foundation.md](./portal-foundation.md)                                                                                                                           | data.js · topbar · verify · dev reload · TOC board §                                                                        |
| Platform routing (local vs Pages) | [platform-routing.md](./platform-routing.md)                                                                                                                             | domains · functions · auth plane                                                                                            |
| Brand / domain / vault map        | [brand-alignment.md](./brand-alignment.md)                                                                                                                               | dig-verified hosts · email · Proton vaults · tunnels → [tunnel-inventory](./harness/tenants/tunnel-inventory.md)            |
| Compliance portal (MA/NJ)         | [harness/tenants/compliance-portal.md](./harness/tenants/compliance-portal.md)                                                                                           | `/portal/compliance/` · `compliance:bake`                                                                                   |
| Partner limit raises              | [harness/tenants/partner-limits.md](./harness/tenants/partner-limits.md)                                                                                                 | `/portal/limits/` · multi-factor · `ops:limits:*` · agent API                                                               |
| Jurisdiction policy catalog       | [JURISDICTIONS.md](./JURISDICTIONS.md)                                                                                                                                   | generated policy lifecycle · inheritance · `policy:audit`                                                                   |
| Seat capital desk                 | [harness/tenants/seat-capital-desk.md](./harness/tenants/seat-capital-desk.md)                                                                                           | Telegram desk · intake · registry bake                                                                                      |
| Factory Telegram                  | [harness/tenants/telegram-factory.md](./harness/tenants/telegram-factory.md)                                                                                             | surfaces · ops consume · templates                                                                                          |
| Package-group handshake           | [harness/tenants/partner-package-group-handshake.md](./harness/tenants/partner-package-group-handshake.md)                                                               | readiness · invite gap · 23 lanes                                                                                           |
| Identity / auth subsystem         | [../lib/identity/README.md](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/identity/README.md)                                                      | lockout · anomaly · geo · JIT                                                                                               |
| Ops snapshot / registry bake      | [harness/tenants/ops-snapshot.md](./harness/tenants/ops-snapshot.md)                                                                                                     | `ops:snapshot` · portal embeds                                                                                              |
| Public plane                      | [harness/tenants/public-plane.md](./harness/tenants/public-plane.md)                                                                                                     | `public:audit:verify`                                                                                                       |
| Proton / vault                    | [harness/tenants/proton-integration.md](./harness/tenants/proton-integration.md)                                                                                         | CF token · deploy · signing                                                                                                 |
| TOC Ops portal tenant             | [harness/tenants/toc-ops.md](./harness/tenants/toc-ops.md)                                                                                                               | `/portal/toc` fixture · surface map · MCP boundary                                                                          |
| Registry client SDK               | [registry-client.md](./registry-client.md)                                                                                                                               | resolve · download · publish                                                                                                |
| Bun runtime nits (Phase 1)        | [bun-runtime-nits.md](./bun-runtime-nits.md)                                                                                                                             | inspect · streams · url · file-io                                                                                           |
| Package import graph              | [IMPORT_BOUNDARIES.md](./IMPORT_BOUNDARIES.md)                                                                                                                           | —                                                                                                                           |
| Bun native capabilities           | [BUN_NATIVE_CAPABILITIES.md](./BUN_NATIVE_CAPABILITIES.md)                                                                                                               | [TOC](./BUN_NATIVE_CAPABILITIES.md#table-of-contents)                                                                       |
| Bun capability × brand map        | [harness/tenants/bun-brand-cross-map.md](./harness/tenants/bun-brand-cross-map.md)                                                                                       | `/portal/brands/` · `bun:brand-map:check`                                                                                   |
| Bun DX catalog                    | `bun run dx:catalog <id>`                                                                                                                                                | SSOT [`config/bun-dx-catalog.ts`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/config/bun-dx-catalog.ts) |
| Bun token/catalog operate         | [BUN_DOCS_OPERATE.md](./BUN_DOCS_OPERATE.md) · [docs-artifact-paths.ts](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/docs/docs-artifact-paths.ts) | `docs:refresh:fast` (daily) · `docs:feeds:refresh` · `docs:refresh` (full)                                                  |
| Bun-first policy                  | [bun/BUN_FIRST_POLICY.md](./bun/BUN_FIRST_POLICY.md)                                                                                                                     | pin 1.4.0                                                                                                                   |
| Bun-first guards                  | [BUN_FIRST_GUARDS.md](./BUN_FIRST_GUARDS.md)                                                                                                                             | policy enforcement notes                                                                                                    |
| Bun test speed                    | [BUN_TEST_SPEED.md](./BUN_TEST_SPEED.md)                                                                                                                                 | parallel / isolate / shard day-loop                                                                                         |
| Registry index ADR                | [adr/0002-registry-index-ssot.md](./adr/0002-registry-index-ssot.md)                                                                                                     | R2 SSOT · file is snapshot                                                                                                  |

## Live trees (only)

| Tree                             | Role                                                                |
| -------------------------------- | ------------------------------------------------------------------- |
| [guides/](./guides/)             | Short runbooks                                                      |
| [adr/](./adr/)                   | Architecture decision records (registry index · telegram desk)      |
| [audit/](./audit/)               | FactoryWager audit findings + concepts (sibling SSOT, not BunToken) |
| [organization/](./organization/) | Velocity / homebase discovery                                       |
| [harness/](./harness/)           | JIT index, proof, authority                                         |
| [packages/](./packages/)         | Package registry map                                                |
| [performance/](./performance/)   | Search baseline governance                                          |
| [contributing/](./contributing/) | CONTRIBUTING                                                        |

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

Historical dumps formerly under `docs/` were **removed from the live tree**
(2026-07). Local checkout may still have a gitignored copy under
`docs/archives/retired-2026-07-deep-pass/` — that path is not tracked.

Recover any file: `git log --all --full-history -- 'docs/<name>.md'` ·
`git show <commit>:docs/<name>.md`.

Do not resurrect dumps into live `docs/`. Nested product docs stay under
`projects/active/**`.
