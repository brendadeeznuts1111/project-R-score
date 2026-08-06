---
title: Registry index
---

# Registry bake index

Machine-readable proofs and operator bakes live on **Cloudflare Pages** (not
this wiki host).

**Base:**
[score.factory-wager.com/registry/](https://score.factory-wager.com/registry/)

**Cross-links SSOT:**
[portal-weave.json](https://score.factory-wager.com/registry/portal-weave.json)
· human hub: [`wiki-index.md`](wiki-index.md)

**ADR:**
[docs/adr/0002-registry-index-ssot.md](docs/adr/0002-registry-index-ssot.md) —
R2 is production SSOT; `public/registry/registry.json` is a generated snapshot.

## Operator bakes

| Artifact                                         | JSON                                                                                                | Bake                                                                                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Ops summary                                      | [ops-summary.json](https://score.factory-wager.com/registry/ops-summary.json)                       | `bun run ops:snapshot`                                                                                                               |
| Portal weave                                     | [portal-weave.json](https://score.factory-wager.com/registry/portal-weave.json)                     | `ops:snapshot` / `compliance:bake` · `publishPlane` block · related `ssotFlowSoft` / `pmProof` · soft-pass parity via `verify:weave` |
| Compliance board                                 | [compliance-board.json](https://score.factory-wager.com/registry/compliance-board.json)             | `bun run compliance:bake`                                                                                                            |
| Telegram handshake                               | [telegram-handshake.json](https://score.factory-wager.com/registry/telegram-handshake.json)         | `telegram:handshake:readiness --deep`                                                                                                |
| Seat capital desk                                | [seat-capital-desk.json](https://score.factory-wager.com/registry/seat-capital-desk.json)           | `seat:desk:refresh`                                                                                                                  |
| TOC Ops                                          | [toc-ops.json](https://score.factory-wager.com/registry/toc-ops.json)                               | `ops:seed:toc`                                                                                                                       |
| Soft accounting export                           | [soft-accounting-export.json](https://score.factory-wager.com/registry/soft-accounting-export.json) | `soft:accounting:bake` · `:from-ct` · [`soft-handshake.md`](docs/design/soft-handshake.md)                                           |
| SSOT soft-pass (`artifactId` `ssot-flow-soft`)   | [ssot-flow-soft.json](https://score.factory-wager.com/registry/ssot-flow-soft.json)                 | `bun run ssot:flow:soft` · Tennis HQ pack offline · [`tennis-hq-registry.md`](docs/harness/tenants/tennis-hq-registry.md)            |
| PM publish-plane proof (`artifactId` `pm-proof`) | [pm-proof.json](https://score.factory-wager.com/registry/pm-proof.json)                             | `bun run verify:pm:save` · soft-pass skips stay green                                                                                |
| Monitoring                                       | [monitoring.json](https://score.factory-wager.com/registry/monitoring.json)                         | `ops:snapshot`                                                                                                                       |
| Limit raises                                     | [limit-raises.json](https://score.factory-wager.com/registry/limit-raises.json)                     | `ops:snapshot` · multi-factor · [`partner-limits.md`](docs/harness/tenants/partner-limits.md)                                        |
| Kimi skills catalog                              | [skills-catalog.json](https://score.factory-wager.com/registry/skills-catalog.json)                 | external `PORTAL_SKILLS_DIR` plane · not repository harness skills                                                                   |
| Harness skills catalog                           | [harness-skills-catalog.json](https://score.factory-wager.com/registry/harness-skills-catalog.json) | all repository `.agents/skills/*/SKILL.md` definitions · registry subset verified by `bun run skills:validate`                       |
| GitHub issue taxonomy                            | [github-issue-taxonomy.json](https://score.factory-wager.com/registry/github-issue-taxonomy.json)   | `bun run github-issue-taxonomy:check` · deterministic labels, colors, authority, and drift health                                    |
| Doc index                                        | [doc-index.json](https://score.factory-wager.com/registry/doc-index.json)                           | `bun run build:doc-index`                                                                                                            |
| Verification                                     | [verification-index.json](https://score.factory-wager.com/registry/verification-index.json)         | `bun run verify-all`                                                                                                                 |

## Document-plane proof pins

Operator proof bakes (not product boards). Linked from portal
[Health](https://score.factory-wager.com/portal/health/) ·
[Dashboard](https://score.factory-wager.com/portal/dashboard/) via
`proof-index.js`.

| Artifact                | JSON                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| FormData                | [formdata-proof.json](https://score.factory-wager.com/registry/formdata-proof.json)                                             |
| Networking channel      | [networking-channel-proof.json](https://score.factory-wager.com/registry/networking-channel-proof.json)                         |
| Pinned 1.3.14           | [verification-pinned-1.3.14.json](https://score.factory-wager.com/registry/verification-pinned-1.3.14.json)                     |
| Stable 1.4.0            | [verification-stable-1.4.0.json](https://score.factory-wager.com/registry/verification-stable-1.4.0.json)                       |
| Stable 1.4.0 bundler    | [verification-stable-1.4.0-bundler.json](https://score.factory-wager.com/registry/verification-stable-1.4.0-bundler.json)       |
| Stable 1.4.0 networking | [verification-stable-1.4.0-networking.json](https://score.factory-wager.com/registry/verification-stable-1.4.0-networking.json) |

## Portal boards (consume registry)

Primary consumers of baked registry JSON. Full board index:
[`wiki-index.md`](wiki-index.md#portal-boards).

| Board           | URL                                                                                 | Typical artifacts                       |
| --------------- | ----------------------------------------------------------------------------------- | --------------------------------------- |
| Ops             | [/portal/ops/](https://score.factory-wager.com/portal/ops/)                         | `ops-summary.json` · weave              |
| Compliance      | [/portal/compliance/](https://score.factory-wager.com/portal/compliance/)           | `compliance-board.json`                 |
| Partner limits  | [/portal/limits/](https://score.factory-wager.com/portal/limits/)                   | `limit-raises.json`                     |
| Partner health  | [/portal/partner/](https://score.factory-wager.com/portal/partner/)                 | `partner-health.json`                   |
| Partner history | [/portal/partner-history/](https://score.factory-wager.com/portal/partner-history/) | limit / partner slices                  |
| TOC Ops         | [/portal/toc/](https://score.factory-wager.com/portal/toc/)                         | `toc-ops.json`                          |
| Bookmakers      | [/portal/bookmakers/](https://score.factory-wager.com/portal/bookmakers/)           | `bookmakers.json`                       |
| Issues          | [/portal/issues/](https://score.factory-wager.com/portal/issues/)                   | `github-issue-taxonomy.json`            |
| Tennis          | [/portal/tennis/](https://score.factory-wager.com/portal/tennis/)                   | `tennis/*` · agent-auth                 |
| Doctor          | [/portal/doctor/](https://score.factory-wager.com/portal/doctor/)                   | `doctor-state.json`                     |
| Vault           | [/portal/vault/](https://score.factory-wager.com/portal/vault/)                     | `vault-health.json`                     |
| Skills          | [/portal/skills/](https://score.factory-wager.com/portal/skills/)                   | `skills-catalog.json` · harness catalog |
| Monitoring      | [/monitoring/](https://score.factory-wager.com/monitoring/)                         | `monitoring.json`                       |

Routing: [`docs/platform-routing.md`](docs/platform-routing.md)

The harness catalog and the skill-loop registry are related but not identical
domains. The catalog contains every repository skill definition; only skills
with executable loop phases belong in
`.agents/skills/ast-grep/skill-loop-registry.json`. `bun run skills:validate`
checks both domains and their metadata alignment before the catalog is merged.
