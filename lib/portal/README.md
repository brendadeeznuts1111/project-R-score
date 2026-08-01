# lib/portal

Portal-facing TypeScript SSOTs. **No barrel** (`index.ts`) — import modules directly.

## Ownership map

| Cluster | Modules | Owns |
|---------|---------|------|
| Glossary / URL | `url-planes` · `page-glossary` · `page-concepts` · `semantic-vocabulary` | Pathname vs hash planes; section mounts `{hash,domId,conceptId}`; concept inventory |
| Partner domain | `partner-routes` · `partner-telegram-topics` · `partner-telegram` · `partner-tables` · `partner-tags` | Hash plane `#partner/…`; topic slugs; tables/tags |
| Chrome / CLI | `chrome-catalog` · `cli-chrome` | Nav overflow, footer, weave chrome |
| Color / theme | `theme` · `portal-kernel-palette` · `color-kernel-align` | `theme.jsonc` aliases vs kernels |
| Capabilities | `capability-map-subset` · `capability-doctor` | AGENTS capability map bake/doctor |
| Scores | `css-enhancement-score` · `power-ui-score` | Board enhancement scoring |
| Other | `command-centre-api` · `bun-test-snapshots` | Command centre payload; snapshot helpers |

## Hash SSOT

- Pattern inits: [`url-planes.ts`](./url-planes.ts) (`PARTNER_HASH_PATTERN_INITS`, section/glossary inits).
- Mounts: [`page-glossary.ts`](./page-glossary.ts) (re-exports section/glossary inits).
- Board JS mirrors hash strings: `public/portal/partners/partner-routes.js` · `public/portal/components/glossary-ux.js` (gated by `tests/portal-url-planes.test.ts`).

## Color kernel Claim / Evidence

| Script | Role |
|--------|------|
| `bun run validate:colors` | Claim/Evidence paste (alias of `portal:colors:check`) |
| `bun run validate:colors:json` | Machine ClaimReport JSON (`status` · `checks[]` · `meta`) |
| `bun run validate:colors:strict` | Fail-closed with `--strict --ci` |
| `bun run test:colors` | Unit + validate smoke — claim `color-kernel-theme-aliases` |
| `bun run portal:theme:check` | CSS tokens stale + color aliases |

SSOT: [`color-kernel-align.ts`](./color-kernel-align.ts) · reporter [`claim-reporter.ts`](./claim-reporter.ts) · path triggers [`color-kernel-paths.ts`](./color-kernel-paths.ts) · planes matrix in [`docs/portal-foundation.md`](../../docs/portal-foundation.md).

Do **not** invent a parallel `colorkernal` CLI. Nested package scripts named `validate:colors` / `test:colors` under `projects/` are unrelated.
