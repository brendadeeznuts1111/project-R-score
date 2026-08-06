# lib/portal

<!-- area-map-verified: 2026-08-06 -->

> **AGENT PROTOCOL:** Do not list files recursively. Read the **## Area map**
> (ownership clusters) below, pick one cluster, and open only the entry paths
> listed. **No barrel** — import modules directly.

Portal-facing TypeScript SSOTs. Import modules directly (no `index.ts` barrel).

## Area map

Ownership clusters for portal SSOTs (formerly titled Ownership map — same
contract as other domain Area maps).

| Cluster               | Paths (entry)                                                                                                                                                                                                                                                                                         | Owns                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Glossary / URL        | [`url-planes.ts`](./url-planes.ts) · [`page-glossary.ts`](./page-glossary.ts) · [`page-concepts.ts`](./page-concepts.ts) · [`semantic-vocabulary.ts`](./semantic-vocabulary.ts)                                                                                                                       | Pathname vs hash planes; section mounts; concept inventory |
| Partner domain        | [`partner-routes.ts`](./partner-routes.ts) · [`partner-telegram-topics.ts`](./partner-telegram-topics.ts) · [`partner-telegram.ts`](./partner-telegram.ts) · [`partner-tables.ts`](./partner-tables.ts) · [`partner-tags.ts`](./partner-tags.ts)                                                      | Hash plane `#partner/…`; topic slugs; tables/tags          |
| Chrome / CLI          | [`chrome-catalog.ts`](./chrome-catalog.ts) · [`cli-chrome.ts`](./cli-chrome.ts)                                                                                                                                                                                                                       | Nav overflow, footer, weave chrome                         |
| Color / theme         | [`theme.ts`](./theme.ts) · [`portal-kernel-palette.ts`](./portal-kernel-palette.ts) · [`color-kernel-align.ts`](./color-kernel-align.ts) · [`color-kernel-paths.ts`](./color-kernel-paths.ts) · [`component-color-align.ts`](./component-color-align.ts) · [`claim-reporter.ts`](./claim-reporter.ts) | theme.jsonc aliases vs kernels                             |
| Concept graph         | `concept-*.ts`                                                                                                                                                                                                                                                                                        | Domains, graph, lifecycle, usage                           |
| Capabilities / scores | [`capability-map-subset.ts`](./capability-map-subset.ts) · [`capability-doctor.ts`](./capability-doctor.ts) · [`css-enhancement-score.ts`](./css-enhancement-score.ts) · [`power-ui-score.ts`](./power-ui-score.ts)                                                                                   | AGENTS capability map bake/doctor + board scores           |
| Shared UI HTML        | [`ui-html.ts`](./ui-html.ts)                                                                                                                                                                                                                                                                          | Pure builders: portal-table, chips, panel, skeleton        |
| Other                 | [`command-centre-api.ts`](./command-centre-api.ts) · [`bun-test-snapshots.ts`](./bun-test-snapshots.ts)                                                                                                                                                                                               | Command centre payload; snapshot helpers                   |

## Hash SSOT

- Pattern inits: [`url-planes.ts`](./url-planes.ts)
  (`PARTNER_HASH_PATTERN_INITS`, section/glossary inits).
- Mounts: [`page-glossary.ts`](./page-glossary.ts) (re-exports section/glossary
  inits).
- Board JS mirrors hash strings: `public/portal/partners/partner-routes.js` ·
  `public/portal/components/glossary-ux.js` (gated by
  `tests/portal-url-planes.test.ts`).

## Color kernel Claim / Evidence

| Script                           | Role                                                       |
| -------------------------------- | ---------------------------------------------------------- |
| `bun run validate:colors`        | Claim/Evidence paste (alias of `portal:colors:check`)      |
| `bun run validate:colors:json`   | Machine ClaimReport JSON (`status` · `checks[]` · `meta`)  |
| `bun run validate:colors:strict` | Fail-closed with `--strict --ci`                           |
| `bun run test:colors`            | Unit + validate smoke — claim `color-kernel-theme-aliases` |
| `bun run portal:theme:check`     | CSS tokens stale + color aliases                           |

SSOT: [`color-kernel-align.ts`](./color-kernel-align.ts) · reporter
[`claim-reporter.ts`](./claim-reporter.ts) · path triggers
[`color-kernel-paths.ts`](./color-kernel-paths.ts) · planes matrix in
[`docs/portal-foundation.md`](../../docs/portal-foundation.md).

Do **not** invent a parallel `colorkernal` CLI. Nested package scripts named
`validate:colors` / `test:colors` under `projects/` are unrelated.
