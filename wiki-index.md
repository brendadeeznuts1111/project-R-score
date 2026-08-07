---
title: Wiki index
---

# FactoryWager Wiki — full index

Navigation hub for [wiki.factory-wager.com](https://wiki.factory-wager.com/).
Homepage: [README hub](/).

**Quick jump:** [Coverage](#index-coverage) ·
[Common journeys](#common-journeys) · [Live surfaces](#live-surfaces) ·
[Concepts](#concept-governance) · [Portal boards](#portal-boards) ·
[Registry](#registry-artifacts-key-bakes) · [Tenants](#harness-tenants) ·
[Maintain](#maintaining-the-index) · [Test concurrency](#bun-test-concurrency) ·
[Proof loop](#operator-proof-loop)

## Index coverage

This hub covers every committed portal page (`public/portal/*/index.html` plus
Home) and harness tenant runbook under `docs/harness/tenants/`. Registry JSON
remains intentionally curated here; [`registry-index.md`](registry-index.md)
owns the machine-artifact companion.

| Plane           | Coverage                                | Authority                                                                                                                              | Drift check                               |
| --------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Portal pages    | 36/36                                   | [`lib/portal/page-concepts.ts`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/portal/page-concepts.ts)           | `bun run wiki:coverage:check`             |
| Harness tenants | 51/51                                   | [`docs/harness/tenants/`](docs/harness/tenants/)                                                                                       | `bun run wiki:coverage:check`             |
| Registry links  | Curated links present                   | [`public/registry/`](public/registry/)                                                                                                 | paths must exist under `public/registry/` |
| Wiki links      | Published entrypoints                   | `_config.yml` · [`tools/wiki-link-check.ts`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/tools/wiki-link-check.ts) | `bun run wiki:links:check`                |
| Public plane    | Portal · registry · monitoring · lander | [`public-plane.md`](docs/harness/tenants/public-plane.md)                                                                              | `bun run public:discover:check`           |

## Platform entry

| Role               | Link                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Human hub          | [Home](/)                                                                                                                        |
| Docs index         | [`docs/`](docs/)                                                                                                                 |
| Agent entry        | [`AGENTS.md`](AGENTS.md) · [`docs/AGENTS.md`](docs/AGENTS.md)                                                                    |
| Workspace map      | [`STRUCTURE.md`](STRUCTURE.md)                                                                                                   |
| Harness JIT        | [`docs/harness/`](docs/harness/) · `bun run harness:status`                                                                      |
| Coding standards   | [`docs/DEVELOPMENT-STANDARDS.md`](docs/DEVELOPMENT-STANDARDS.md)                                                                 |
| Brand / domain map | [`docs/brand-alignment.md`](docs/brand-alignment.md) · tunnels [`tunnel-inventory.md`](docs/harness/tenants/tunnel-inventory.md) |

## Common journeys

Start with the outcome you need; each row connects the live surface, its human
authority, and the shortest proof command.

| Goal                                       | Start here                                                                                                                             | Authority                                                                                                                                                                                            | Prove / refresh                               |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Trace one partner account                  | [Account dossier](https://score.factory-wager.com/portal/account/)                                                                     | [`partner-limits.md`](docs/harness/tenants/partner-limits.md)                                                                                                                                        | `bun run ops:dossier:seed`                    |
| Operate partner packages and accounting    | [Partners](https://score.factory-wager.com/portal/partners/)                                                                           | [`partner-domain-map.md`](docs/harness/tenants/partner-domain-map.md) · [`seat-capital-desk.md`](docs/harness/tenants/seat-capital-desk.md)                                                          | `bun run telegram:handshake:readiness --deep` |
| Review limit evidence and forecasts        | [Limits](https://score.factory-wager.com/portal/limits/) · [Forecast lab](https://score.factory-wager.com/portal/limits-lab/)          | [`limit-forecast-lab.md`](docs/harness/tenants/limit-forecast-lab.md)                                                                                                                                | `bun run ops:limits:predict`                  |
| Inspect compliance controls                | [Compliance](https://score.factory-wager.com/portal/compliance/)                                                                       | [`compliance-portal.md`](docs/harness/tenants/compliance-portal.md)                                                                                                                                  | `bun run compliance:verify`                   |
| Diagnose portal or install health          | [Doctor](https://score.factory-wager.com/portal/doctor/) · [Install hygiene](https://score.factory-wager.com/portal/install-hygiene/)  | [`portal-doctor.md`](docs/harness/tenants/portal-doctor.md) · [`docs/UNIFIED.md`](docs/UNIFIED.md)                                                                                                   | `bun run portal:doctor:ci`                    |
| Audit deploy, Access, and routing          | [Health](https://score.factory-wager.com/portal/health/) · [Surfaces](https://score.factory-wager.com/portal/surfaces/)                | [`cloudflare-pages.md`](docs/harness/tenants/cloudflare-pages.md) · [`cloudflare-access.md`](docs/harness/tenants/cloudflare-access.md)                                                              | `bun run cloudflare:preflight`                |
| Find a domain term or branded value        | [Glossary](https://score.factory-wager.com/portal/glossary/) · [Brands](https://score.factory-wager.com/portal/brands/)                | [`partner-domain-map.md`](docs/harness/tenants/partner-domain-map.md) · [`lib/types/branded/README.md`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/types/branded/README.md) | `bun run glossary:verify`                     |
| Govern semantic concepts and relationships | [Concepts](https://score.factory-wager.com/portal/concepts/) · [Concept graph](https://score.factory-wager.com/portal/concepts/graph/) | [`docs/CONCEPT_LIFECYCLE.md`](docs/CONCEPT_LIFECYCLE.md) · [`docs/SURFACE_COVERAGE.md`](docs/SURFACE_COVERAGE.md)                                                                                    | `bun run quality:concept`                     |
| Investigate harness or documentation drift | [`docs/harness/`](docs/harness/) · [Failures](https://score.factory-wager.com/portal/failures/)                                        | [`docs-integrity.md`](docs/harness/tenants/docs-integrity.md) · [`reference-discovery.md`](docs/harness/tenants/reference-discovery.md)                                                              | `bun run discover:compose:check`              |

## Live surfaces

| Surface               | URL                                                                                |
| --------------------- | ---------------------------------------------------------------------------------- |
| Wiki (GitHub Pages)   | [wiki.factory-wager.com](https://wiki.factory-wager.com/)                          |
| Portal boards         | [score.factory-wager.com/portal/](https://score.factory-wager.com/portal/)         |
| Registry bake         | [score.factory-wager.com/registry/](https://score.factory-wager.com/registry/)     |
| Tennis HQ runtime     | [tennis.factory-wager.com](https://tennis.factory-wager.com/)                      |
| Monitoring            | [score.factory-wager.com/monitoring/](https://score.factory-wager.com/monitoring/) |
| Portal weave JSON     | [portal-weave.json](https://score.factory-wager.com/registry/portal-weave.json)    |
| Registry index (wiki) | [`registry-index.md`](registry-index.md)                                           |

Routing: [`docs/platform-routing.md`](docs/platform-routing.md)

## Portal ↔ wiki integration

Bidirectional SSOT between GitHub Pages (this wiki) and Cloudflare Pages
(portal + registry):

| Mechanism                                                                                                      | Role                                                                        |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [`portal-weave.json`](https://score.factory-wager.com/registry/portal-weave.json)                              | Machine cross-links: `surfaces[]`, `artifacts[]`, **`wiki[]`**, `scripts[]` |
| [`lib/http/wiki-nav.ts`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/http/wiki-nav.ts) | Portal chrome wiki URL · weave `wiki[]` bake source                         |
| [`registry-index.md`](registry-index.md)                                                                       | Registry-focused wiki companion                                             |
| Portal ops dashboard                                                                                           | Renders weave surfaces + wiki links from JSON                               |

Rebake weave after doc changes: `bun run ops:snapshot --no-seed` or
`bun run compliance:bake`.

## Concept governance

Recent concept-lane work makes the semantic vocabulary an operated artifact, not
a prose-only glossary. Use the inventory board for ownership and usage, the
graph for relationships, and the glossary for human definitions.

| View                | Live / artifact                                                                                                                                               | Authority                                                             | Refresh / prove                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------- |
| Inventory           | [Concepts](https://score.factory-wager.com/portal/concepts/) · [concepts-state.json](https://score.factory-wager.com/registry/concepts-state.json)            | [`docs/CONCEPT_LIFECYCLE.md`](docs/CONCEPT_LIFECYCLE.md)              | `bun run concepts:bake:check`       |
| Relationship graph  | [Concept graph](https://score.factory-wager.com/portal/concepts/graph/) · [concepts-graph.json](https://score.factory-wager.com/registry/concepts-graph.json) | [`docs/SURFACE_COVERAGE.md`](docs/SURFACE_COVERAGE.md)                | `bun run concept:graph:bake`        |
| Human glossary      | [Glossary](https://score.factory-wager.com/portal/glossary/) · [domain-glossary.json](https://score.factory-wager.com/registry/domain-glossary.json)          | [`partner-domain-map.md`](docs/harness/tenants/partner-domain-map.md) | `bun run glossary:portal:check`     |
| Agent wire contract | [`agents.md`](docs/harness/tenants/agents.md)                                                                                                                 | [`docs/WIRE_BOUNDARY.md`](docs/WIRE_BOUNDARY.md)                      | `bun run concept:audit -- --strict` |

Full concept-lane acceptance: `bun run quality:concept`.

## Portal boards

Live boards under `public/portal/<name>/` (plus Home). Product/ops first, then
control-plane, then niche.

| Board               | Live                                                                                | Doc                                                                                                                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home                | [/portal/](https://score.factory-wager.com/portal/)                                 | [`docs/portal-foundation.md`](docs/portal-foundation.md)                                                                                                                                                                                                         |
| Account dossier     | [/portal/account/](https://score.factory-wager.com/portal/account/)                 | [`partner-limits.md`](docs/harness/tenants/partner-limits.md) · [`partner-domain-map.md`](docs/harness/tenants/partner-domain-map.md)                                                                                                                            |
| Agent odds          | [/portal/agent-odds/](https://score.factory-wager.com/portal/agent-odds/)           | [`full-ui-performance-audit.md`](docs/harness/tenants/full-ui-performance-audit.md)                                                                                                                                                                              |
| Bookmakers          | [/portal/bookmakers/](https://score.factory-wager.com/portal/bookmakers/)           | [`bookmakers-registry.md`](docs/harness/tenants/bookmakers-registry.md)                                                                                                                                                                                          |
| Ops                 | [/portal/ops/](https://score.factory-wager.com/portal/ops/)                         | [`ops-loop-throughput.md`](docs/harness/tenants/ops-loop-throughput.md)                                                                                                                                                                                          |
| TOC Ops             | [/portal/toc/](https://score.factory-wager.com/portal/toc/)                         | [`toc-ops.md`](docs/harness/tenants/toc-ops.md)                                                                                                                                                                                                                  |
| Compliance          | [/portal/compliance/](https://score.factory-wager.com/portal/compliance/)           | [`compliance-portal.md`](docs/harness/tenants/compliance-portal.md)                                                                                                                                                                                              |
| Console format      | [/portal/console-format/](https://score.factory-wager.com/portal/console-format/)   | [`portal-doctor.md`](docs/harness/tenants/portal-doctor.md) · `bun run console-format:bake`                                                                                                                                                                      |
| Limits              | [/portal/limits/](https://score.factory-wager.com/portal/limits/)                   | [`partner-limits.md`](docs/harness/tenants/partner-limits.md)                                                                                                                                                                                                    |
| Limits forecast lab | [/portal/limits-lab/](https://score.factory-wager.com/portal/limits-lab/)           | [`limit-forecast-lab.md`](docs/harness/tenants/limit-forecast-lab.md)                                                                                                                                                                                            |
| Workspace lanes     | [/portal/lanes/](https://score.factory-wager.com/portal/lanes/)                     | [`workspace-lane-cross-map.md`](docs/harness/tenants/workspace-lane-cross-map.md)                                                                                                                                                                                |
| Partner health      | [/portal/partner/](https://score.factory-wager.com/portal/partner/)                 | [`partner-domain-map.md`](docs/harness/tenants/partner-domain-map.md) · `bun run partner:health:bake`                                                                                                                                                            |
| Partner history     | [/portal/partner-history/](https://score.factory-wager.com/portal/partner-history/) | [`partner-limits.md`](docs/harness/tenants/partner-limits.md)                                                                                                                                                                                                    |
| Partners            | [/portal/partners/](https://score.factory-wager.com/portal/partners/)               | [`partner-domain-map.md`](docs/harness/tenants/partner-domain-map.md) · [`seat-capital-desk.md`](docs/harness/tenants/seat-capital-desk.md)                                                                                                                      |
| Dashboard           | [/portal/dashboard/](https://score.factory-wager.com/portal/dashboard/)             | [`public-plane.md`](docs/harness/tenants/public-plane.md)                                                                                                                                                                                                        |
| Health              | [/portal/health/](https://score.factory-wager.com/portal/health/)                   | [`public-plane.md`](docs/harness/tenants/public-plane.md)                                                                                                                                                                                                        |
| Env                 | [/portal/env/](https://score.factory-wager.com/portal/env/)                         | [`public-plane.md`](docs/harness/tenants/public-plane.md)                                                                                                                                                                                                        |
| DOD                 | [/portal/dod/](https://score.factory-wager.com/portal/dod/)                         | [`public-plane.md`](docs/harness/tenants/public-plane.md)                                                                                                                                                                                                        |
| Skills              | [/portal/skills/](https://score.factory-wager.com/portal/skills/)                   | [`public-plane.md`](docs/harness/tenants/public-plane.md)                                                                                                                                                                                                        |
| Packages            | [/portal/packages/](https://score.factory-wager.com/portal/packages/)               | [`monorepo-health.md`](docs/harness/tenants/monorepo-health.md)                                                                                                                                                                                                  |
| Doctor              | [/portal/doctor/](https://score.factory-wager.com/portal/doctor/)                   | [`docs/UNIFIED.md`](docs/UNIFIED.md)                                                                                                                                                                                                                             |
| Bunfig              | [/portal/bunfig/](https://score.factory-wager.com/portal/bunfig/)                   | [`docs/UNIFIED.md`](docs/UNIFIED.md)                                                                                                                                                                                                                             |
| Install hygiene     | [/portal/install-hygiene/](https://score.factory-wager.com/portal/install-hygiene/) | [`docs/UNIFIED.md`](docs/UNIFIED.md) · `bake:install-hygiene`                                                                                                                                                                                                    |
| Vault               | [/portal/vault/](https://score.factory-wager.com/portal/vault/)                     | [`proton-integration.md`](docs/harness/tenants/proton-integration.md)                                                                                                                                                                                            |
| Failures            | [/portal/failures/](https://score.factory-wager.com/portal/failures/)               | [`public-plane.md`](docs/harness/tenants/public-plane.md)                                                                                                                                                                                                        |
| Brands              | [/portal/brands/](https://score.factory-wager.com/portal/brands/)                   | [`public-plane.md`](docs/harness/tenants/public-plane.md)                                                                                                                                                                                                        |
| Catalog             | [/portal/catalog/](https://score.factory-wager.com/portal/catalog/)                 | [`public-plane.md`](docs/harness/tenants/public-plane.md)                                                                                                                                                                                                        |
| Glossary            | [/portal/glossary/](https://score.factory-wager.com/portal/glossary/)               | [`docs/portal-foundation.md`](docs/portal-foundation.md) · `bun run glossary:portal`                                                                                                                                                                             |
| Issues              | [/portal/issues/](https://score.factory-wager.com/portal/issues/)                   | [`github-issue-taxonomy.md`](docs/harness/tenants/github-issue-taxonomy.md) · `bun run github-issue-taxonomy:check`                                                                                                                                               |
| Concepts            | [/portal/concepts/](https://score.factory-wager.com/portal/concepts/)               | [graph](https://score.factory-wager.com/portal/concepts/graph/) · [`docs/CONCEPT_LIFECYCLE.md`](docs/CONCEPT_LIFECYCLE.md) · `bun run quality:concept`                                                                                                           |
| Surfaces            | [/portal/surfaces/](https://score.factory-wager.com/portal/surfaces/)               | [`public-plane.md`](docs/harness/tenants/public-plane.md)                                                                                                                                                                                                        |
| Tools               | [/portal/tools/](https://score.factory-wager.com/portal/tools/)                     | [`public-plane.md`](docs/harness/tenants/public-plane.md)                                                                                                                                                                                                        |
| Factory             | [/portal/factory/](https://score.factory-wager.com/portal/factory/)                 | [`telegram-factory.md`](docs/harness/tenants/telegram-factory.md)                                                                                                                                                                                                |
| Identity            | [/portal/identity/](https://score.factory-wager.com/portal/identity/)               | [`public-plane.md`](docs/harness/tenants/public-plane.md)                                                                                                                                                                                                        |
| Science             | [/portal/science/](https://score.factory-wager.com/portal/science/)                 | —                                                                                                                                                                                                                                                                |
| Tennis              | [/portal/tennis/](https://score.factory-wager.com/portal/tennis/)                   | runtime [tennis.factory-wager.com](https://tennis.factory-wager.com/) · agent-auth [`/registry/tennis/agent-auth.json`](https://score.factory-wager.com/registry/tennis/agent-auth.json) · [`tennis-hq-registry.md`](docs/harness/tenants/tennis-hq-registry.md) |

## Registry artifacts (key bakes)

| Artifact                   | JSON                                                                                                                            | Owner / proof                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Ops summary                | [ops-summary.json](https://score.factory-wager.com/registry/ops-summary.json)                                                   | `bun run ops:snapshot`                                                |
| Compliance board           | [compliance-board.json](https://score.factory-wager.com/registry/compliance-board.json)                                         | `bun run compliance:bake`                                             |
| Telegram handshake         | [telegram-handshake.json](https://score.factory-wager.com/registry/telegram-handshake.json)                                     | `telegram:handshake:readiness --deep`                                 |
| Seat capital desk          | [seat-capital-desk.json](https://score.factory-wager.com/registry/seat-capital-desk.json)                                       | `seat:desk:refresh`                                                   |
| TOC Ops                    | [toc-ops.json](https://score.factory-wager.com/registry/toc-ops.json)                                                           | `ops:seed:toc`                                                        |
| Partner operations         | [partners-ops.json](https://score.factory-wager.com/registry/partners-ops.json)                                                 | [`partner-domain-map.md`](docs/harness/tenants/partner-domain-map.md) |
| Bookmakers                 | [bookmakers.json](https://score.factory-wager.com/registry/bookmakers.json)                                                     | `bun run bookmakers:bake`                                             |
| Limit raises               | [limit-raises.json](https://score.factory-wager.com/registry/limit-raises.json)                                                 | `ops:snapshot`                                                        |
| Limit forecast lab         | [limit-forecast-lab.json](https://score.factory-wager.com/registry/limit-forecast-lab.json)                                     | [`limit-forecast-lab.md`](docs/harness/tenants/limit-forecast-lab.md) |
| Domain glossary            | [domain-glossary.json](https://score.factory-wager.com/registry/domain-glossary.json)                                           | `bun run glossary:portal`                                             |
| GitHub issue taxonomy      | [github-issue-taxonomy.json](https://score.factory-wager.com/registry/github-issue-taxonomy.json)                               | `bun run github-issue-taxonomy:check`                                 |
| Concepts inventory         | [concepts-state.json](https://score.factory-wager.com/registry/concepts-state.json)                                             | `bun run concepts:bake:check`                                         |
| Concept graph              | [concepts-graph.json](https://score.factory-wager.com/registry/concepts-graph.json)                                             | `bun run concept:graph:bake`                                          |
| Console format             | [console-format-state.json](https://score.factory-wager.com/registry/console-format-state.json)                                 | `bun run console-format:bake`                                         |
| Bunfig                     | [bunfig-state.json](https://score.factory-wager.com/registry/bunfig-state.json)                                                 | `bun run bunfig:bake`                                                 |
| Install hygiene            | [install-hygiene-report.json](https://score.factory-wager.com/registry/install-hygiene-report.json)                             | `bun run bake:install-hygiene`                                        |
| Monorepo health            | [monorepo-health.json](https://score.factory-wager.com/registry/monorepo-health.json)                                           | [`monorepo-health.md`](docs/harness/tenants/monorepo-health.md)       |
| Identity board             | [identity-board.json](https://score.factory-wager.com/registry/identity-board.json)                                             | `bun run ops:snapshot`                                                |
| Skills catalog             | [skills-catalog.json](https://score.factory-wager.com/registry/skills-catalog.json)                                             | `bun run ops:snapshot`                                                |
| Surface inventory          | [surfaces-state.json](https://score.factory-wager.com/registry/surfaces-state.json)                                             | `bun run ops:snapshot`                                                |
| Vault health               | [vault-health.json](https://score.factory-wager.com/registry/vault-health.json)                                                 | [`proton-integration.md`](docs/harness/tenants/proton-integration.md) |
| Monitoring                 | [monitoring.json](https://score.factory-wager.com/registry/monitoring.json)                                                     | `ops:snapshot`                                                        |
| Verification index         | [verification-index.json](https://score.factory-wager.com/registry/verification-index.json)                                     | `bun run verify-all`                                                  |
| Portal weave               | [portal-weave.json](https://score.factory-wager.com/registry/portal-weave.json)                                                 | `ops:snapshot` / `compliance:bake`                                    |
| FormData proof             | [formdata-proof.json](https://score.factory-wager.com/registry/formdata-proof.json)                                             | document-plane pin                                                    |
| Networking channel proof   | [networking-channel-proof.json](https://score.factory-wager.com/registry/networking-channel-proof.json)                         | document-plane pin                                                    |
| Verification pinned 1.3.14 | [verification-pinned-1.3.14.json](https://score.factory-wager.com/registry/verification-pinned-1.3.14.json)                     | document-plane pin                                                    |
| Verification stable 1.4.0  | [verification-stable-1.4.0.json](https://score.factory-wager.com/registry/verification-stable-1.4.0.json)                       | document-plane pin                                                    |
| Stable 1.4.0 bundler       | [verification-stable-1.4.0-bundler.json](https://score.factory-wager.com/registry/verification-stable-1.4.0-bundler.json)       | document-plane pin                                                    |
| Stable 1.4.0 networking    | [verification-stable-1.4.0-networking.json](https://score.factory-wager.com/registry/verification-stable-1.4.0-networking.json) | document-plane pin                                                    |

Document-plane pins also render on portal **Health** and **Dashboard**
(`public/portal/proof-index.js`).

Bake: `bun run ops:snapshot` · compliance: `bun run compliance:bake` · doc:
[`ops-snapshot.md`](docs/harness/tenants/ops-snapshot.md)

## Harness tenants

### Operator · portal · Telegram

| Tenant                  | Doc                                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Compliance portal       | [`compliance-portal.md`](docs/harness/tenants/compliance-portal.md)                                                  |
| Partner limit raises    | [`partner-limits.md`](docs/harness/tenants/partner-limits.md)                                                        |
| TOC Ops                 | [`toc-ops.md`](docs/harness/tenants/toc-ops.md)                                                                      |
| Ops loop / outbox       | [`ops-loop-throughput.md`](docs/harness/tenants/ops-loop-throughput.md)                                              |
| Ops snapshot            | [`ops-snapshot.md`](docs/harness/tenants/ops-snapshot.md)                                                            |
| Public plane            | [`public-plane.md`](docs/harness/tenants/public-plane.md)                                                            |
| serve-public bind       | [`serve-public-bind.md`](docs/harness/tenants/serve-public-bind.md) · `brand:status:bind` · `brand:status:lifecycle` |
| Factory Telegram        | [`telegram-factory.md`](docs/harness/tenants/telegram-factory.md) · portal [`partners.md`](public/portal/partners.md) |
| Package-group handshake | [`partner-package-group-handshake.md`](docs/harness/tenants/partner-package-group-handshake.md) · Flags REF:ID §1.1 (`docs:refid:check`) |
| Partner surface inventory | [`partner-surface-inventory.md`](docs/design/partner-surface-inventory.md) · bake `/registry/partner-surface-inventory.json` |
| Partner domain map      | [`partner-domain-map.md`](docs/harness/tenants/partner-domain-map.md) · package [`@factorywager/partners`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/packages/partners/README.md) |
| Seat capital desk       | [`seat-capital-desk.md`](docs/harness/tenants/seat-capital-desk.md)                                                  |
| Partner onboard         | [`partner-onboarding-package.md`](docs/harness/tenants/partner-onboarding-package.md) · profile Flags REF:ID ([unified-partner-profile](docs/design/unified-partner-profile.md)) |
| Ops partner bridge      | [`ops-partner-bridge.md`](docs/harness/tenants/ops-partner-bridge.md)                                                |
| REF:ID flags / TOC      | [CONTRIBUTING § REF:ID](docs/contributing/CONTRIBUTING.md#refid-validation) · `bun run docs:refid:check` · `docs:refid:audit` |
| Workspace lane cross-map | [`workspace-lane-cross-map.md`](docs/harness/tenants/workspace-lane-cross-map.md)                                  |
| Command centre          | [`command-centre.md`](docs/harness/tenants/command-centre.md)                                                        |
| Portal doctor           | [`portal-doctor.md`](docs/harness/tenants/portal-doctor.md)                                                          |
| Portal snapshot cron    | [`portal-snapshot-cron.md`](docs/harness/tenants/portal-snapshot-cron.md)                                            |
| Bake resilience         | [`bake-resilience.md`](docs/harness/tenants/bake-resilience.md)                                                      |
| Full UI performance     | [`full-ui-performance-audit.md`](docs/harness/tenants/full-ui-performance-audit.md)                                  |
| Remaining work          | [`remaining-work.md`](docs/harness/tenants/remaining-work.md)                                                        |

### Cloudflare · deploy · vault

| Tenant            | Doc                                                                   |
| ----------------- | --------------------------------------------------------------------- |
| Cloudflare Pages  | [`cloudflare-pages.md`](docs/harness/tenants/cloudflare-pages.md)     |
| Cloudflare Access | [`cloudflare-access.md`](docs/harness/tenants/cloudflare-access.md)   |
| Proton / vault    | [`proton-integration.md`](docs/harness/tenants/proton-integration.md) |
| Deploy production | [`deploy-production.md`](docs/harness/tenants/deploy-production.md)   |
| Deploy staging    | [`deploy-staging.md`](docs/harness/tenants/deploy-staging.md)         |
| Tunnel inventory  | [`tunnel-inventory.md`](docs/harness/tenants/tunnel-inventory.md)     |

### Harness quality · CI

| Tenant                        | Doc                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| Install verify                | [`install-verify.md`](docs/harness/tenants/install-verify.md)                       |
| CI core                       | [`ci-core.md`](docs/harness/tenants/ci-core.md)                                     |
| TypeScript CI                 | [`typescript-ci.md`](docs/harness/tenants/typescript-ci.md)                         |
| Coverage floor                | [`coverage-floor.md`](docs/harness/tenants/coverage-floor.md)                       |
| Complexity floor              | [`complexity-floor.md`](docs/harness/tenants/complexity-floor.md)                   |
| Docs integrity                | [`docs-integrity.md`](docs/harness/tenants/docs-integrity.md)                       |
| Reference discovery           | [`reference-discovery.md`](docs/harness/tenants/reference-discovery.md)             |
| Registry integrity            | [`registry-integrity.md`](docs/harness/tenants/registry-integrity.md)               |
| Monorepo health               | [`monorepo-health.md`](docs/harness/tenants/monorepo-health.md)                     |
| Monorepo workspaces           | [`monorepo-workspaces.md`](docs/harness/tenants/monorepo-workspaces.md)             |
| Bun migration                 | [`bun-migrate.md`](docs/harness/tenants/bun-migrate.md)                             |
| Bun upstream contributing     | [`bun-upstream-contributing.md`](docs/harness/tenants/bun-upstream-contributing.md) |
| Bun channel doctor            | [`bun-channel-doctor.md`](docs/harness/tenants/bun-channel-doctor.md)               |
| Channel metadata verification | [`channel-meta-verification.md`](docs/harness/tenants/channel-meta-verification.md) |
| Codex task portfolio          | [`codex-thread-portfolio.md`](docs/harness/tenants/codex-thread-portfolio.md)       |
| Orphan modules                | [`orphan-modules.md`](docs/harness/tenants/orphan-modules.md)                       |
| Types covered                 | [`types-covered.md`](docs/harness/tenants/types-covered.md)                         |

### Domain · registry · analysis

| Tenant                     | Doc                                                                           |
| -------------------------- | ----------------------------------------------------------------------------- |
| Bookmaker registry         | [`bookmakers-registry.md`](docs/harness/tenants/bookmakers-registry.md)       |
| Bookmaker open issues      | [`bookmakers-open-issues.md`](docs/harness/tenants/bookmakers-open-issues.md) |
| Bun capability × brand map | [`bun-brand-cross-map.md`](docs/harness/tenants/bun-brand-cross-map.md)       |
| GitHub issue taxonomy      | [`github-issue-taxonomy.md`](docs/harness/tenants/github-issue-taxonomy.md)   |
| Limits forecast lab        | [`limit-forecast-lab.md`](docs/harness/tenants/limit-forecast-lab.md)         |
| Partner domain map         | [`partner-domain-map.md`](docs/harness/tenants/partner-domain-map.md)         |
| Prediction report          | [`prediction-report.md`](docs/harness/tenants/prediction-report.md)           |
| Tennis HQ registry         | [`tennis-hq-registry.md`](docs/harness/tenants/tennis-hq-registry.md)         |
| Tennis HQ UI audit         | [`tennis-hq-ui-audit.md`](docs/harness/tenants/tennis-hq-ui-audit.md)         |
| Agent endpoints × wire     | [`agents.md`](docs/harness/tenants/agents.md)                                 |

### Code · lib

| Topic           | Doc                                                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity / auth | [`lib/identity/README.md`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/identity/README.md) · `bun test tests/identity-*.test.ts` |
| Branded IDs     | [`lib/types/branded/README.md`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/types/branded/README.md)                             |
| Wire boundary   | [`docs/WIRE_BOUNDARY.md`](docs/WIRE_BOUNDARY.md)                                                                                                         |
| Bun native      | [`docs/BUN_NATIVE_CAPABILITIES.md`](docs/BUN_NATIVE_CAPABILITIES.md) · [Utilities guides map](docs/BUN_NATIVE_CAPABILITIES.md#utilities-guides-map)      |

## Maintaining the index

Update the owning inventory before this human view: portal identities belong in
`lib/portal/page-concepts.ts`, tenant runbooks belong under
`docs/harness/tenants/`, and registry JSON is produced by its owning bake. Then
run the focused loop:

```bash
bun run quality:concept
bun run wiki:coverage:check
bun run wiki:links:check
bun run docs:map:check
bun run public:discover:check
bun test tests/wiki-link-check.test.ts
```

When a portal page is added, link its live URL and owner doc in
[Portal boards](#portal-boards). When a tenant is added, place it in exactly one
tenant category. Registry links may remain curated, but every linked JSON path
must exist under `public/registry/`.

## Bun test concurrency

Loopback tests must ask the OS for an available port with `port: 0` and read the
selected value from `server.port`; do not derive fixed ports from worker IDs.
That follows Bun's
[HTTP server guidance](https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname)
and remains safe when independent tests overlap.

| Need                                                           | Bun-native control                                                                                      | FactoryWager use                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Opt individual tests out of `--concurrent`                     | [`test.serial()`](https://bun.com/docs/test#testserial)                                                 | Use only for shared in-process state                      |
| Enable concurrency selectively                                 | [`concurrentTestGlob`](https://bun.com/docs/test/configuration#concurrenttestglob)                      | Keep stateful files outside the configured globs          |
| Bound concurrent tests within files                            | [`--max-concurrency=N`](https://bun.com/docs/test#max-concurrency-flag)                                 | Lower before serializing an entire suite                  |
| Bound parallel test-file workers                               | [`--parallel=N`](https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel)               | Project changed-test default; implies `--isolate`         |
| Reset globals, sockets, timers, and subprocesses between files | [`--isolate`](https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel)                  | Diagnose leaked cross-file state without worker processes |
| Split CI inventory                                             | [`--shard=M/N`](https://bun.com/blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs) | Shard independent files across jobs                       |
| Disable this repository's changed-test worker pool             | `bun run test:changed -- --serial`                                                                      | Project wrapper; not a `bun test --runInBand` flag        |

`workerId` and `NODE_TEST_WORKER_ID` belong to Bun's Node-compatible
[`node:test` TestContext](https://bun.com/reference/node/test/default/TestContext/workerId),
not the `bun:test` context used by this repository. Bun's test-file workers
instead expose `BUN_TEST_WORKER_ID` and `JEST_WORKER_ID`; reserve those for
non-socket resources that truly need partitions. If `Bun.serve({ port: 0 })`
reports `EADDRINUSE`, first run the affected file alone and probe one minimal
loopback server. A matching Node `listen EPERM` means the execution sandbox has
denied socket binding; grant the test loopback permission instead of assigning
fixed ports or forcing serial execution.

## Operator proof loop

```bash
bun run harness:status
bun run ops:snapshot --no-seed
bun run compliance:verify
bun run telegram:handshake:readiness --deep
bun run telegram:handshake:catalog
bun run test:seat-desk
bun test tests/identity-*.test.ts
bun run docs:refid:check
bun run docs:refid:check --json   # planes · registry · discovery issue counts
bun run docs:refid:audit          # flags-table-only=0
bun run partner-surface-inventory:validate
bun run verify:portal:static
bun run public:audit:verify
bun run skills:validate
PAGES_VERIFY_BASE=https://project-r-score.pages.dev bun run verify:pages-edge
```

Proof journey: [`docs/harness/PROOF.md`](docs/harness/PROOF.md) ·
`bun run proof:install`

Deploy Pages: `bun run proton:inject:factorywager:reasonix` →
`bun run proton:deploy:pages`

## Doc trees

| Tree         | Path                                       |
| ------------ | ------------------------------------------ |
| Guides       | [`docs/guides/`](docs/guides/)             |
| Harness      | [`docs/harness/`](docs/harness/)           |
| Audit        | [`docs/audit/`](docs/audit/)               |
| Organization | [`docs/organization/`](docs/organization/) |
