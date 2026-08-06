# Portal routing · partner domain audit

Operator map for **how URLs reach** partner desk surfaces (limits · books · DOD
· Telegram) — local `serve-public` vs Cloudflare Pages — and which audit
commands prove the plane.

Full platform map:
[`docs/platform-routing.md`](../../docs/platform-routing.md).
Route catalog SSOT:
[`lib/http/public-routes.ts`](../../lib/http/public-routes.ts) ·
[`lib/http/portal-route-manifest.ts`](../../lib/http/portal-route-manifest.ts).

## Partner domain surfaces

| Surface            | HTML / MD                                                                                    | Primary bake                               | Live / edge notes                    |
| ------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------ |
| Partners           | [`/portal/partners/`](./partners/) · [partners.md](./partners.md)                            | `partners-ops.json` · handshake · seat     | Hash routes `#partner/CODE/…`        |
| Limits             | [`/portal/limits/`](./limits/) · [limits.md](./limits.md)                                    | `limit-raises.json`                        | Pages read snapshot; mutations local |
| Limits lab         | [`/portal/limits-lab/`](./limits-lab/)                                                       | `limit-forecast-lab.json`                  | Predict / backtest UI                |
| Bookmakers         | [`/portal/bookmakers/`](./bookmakers/) · [bookmakers.md](./bookmakers.md)                    | `bookmakers.json` (v0.4.1) · desk coverage | Static mirror only                   |
| DOD                | [`/portal/dod/`](./dod/) · [dod.md](./dod.md)                                                | `dod-queue.json`                           | Pages RO; `/api/dod/*` local SQLite  |
| Factory / Telegram | [`/portal/factory/`](./factory/) · [telegram.md](./telegram.md) · [factory.md](./factory.md) | handshake bakes                            | Webhook Functions                    |
| Account            | [`/portal/account/`](./account/)                                                             | partners-ops · Soft                        | Per-node dossier                     |
| Partner history    | [`/portal/partner-history/`](./partner-history/)                                             | limit history                              | Links into limits                    |
| Ops pulse          | [`/portal/ops/`](./ops/) · [ops.md](./ops.md)                                                | `ops-summary.json`                         | Day-loop rollup                      |

## API routing (limits · DOD)

| Path                                            | Pages (edge)                                 | Local (`serve-public`) |
| ----------------------------------------------- | -------------------------------------------- | ---------------------- |
| `GET /api/agents/v1/limits/raises`              | Filter `limit-raises.json` · empty → **503** | SQLite agent API       |
| `GET /api/limits/summary`                       | Aggregate from bake                          | Same / richer          |
| `POST /api/agents/v1/limits/record`             | **503** stub                                 | Writes ops DB          |
| `GET/POST /api/limits/analyze` · `/predictions` | Stubs / snapshot                             | Lab engines            |
| `GET /api/dod`                                  | Read `dod-queue.json` · RO headers           | Live queue             |
| `POST /api/dod/approve` · `/reject`             | **503**                                      | SQLite review          |
| `/evidence/{s3_path}`                           | Often missing (private R2)                   | Local evidence root    |
| `/api/telegram/webhook/factory`                 | Functions + secret                           | Local when configured  |

Trailing-slash 301s: `public/_redirects` (no SPA fallback).
Public-read allowlist: `lib/http/public-read-path.ts`.

## Audit CLI (gap close loop)

```bash
# Static public plane
bun run public:discover:check      # broken registry refs · chrome
bun run public:audit:verify        # discover + portal static + audit:verify
bun run verify:portal:static

# Route catalog vs live bind
bun run check:routes               # verify-networking --routes-only
bun run routing:proof              # registry routing proof artifact
bun run routing:proof:write        # refresh proof bake when intentional

# Domain bakes
bun run ops:snapshot --no-seed
bun run bookmakers:bake:check
bun run bookmakers:desk-coverage
bun run partners:validate
bun run ops:limits:check --multi

# Partner suites (offline)
bun test tests/portal-route-wiring.test.ts
bun test tests/portal-domain-gap-map.test.ts
bun test tests/bookmakers-registry-bake.test.ts
bun test tests/dod-portal.test.ts
bun test tests/limit-raises-ui.test.ts
```

## Known gap classes

| Gap                                          | Owner fix                                                                                           |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Markdown companion missing for HTML board    | Add `public/portal/<slug>.md` + `PORTAL_MARKDOWN_SLUGS`                                             |
| Registry bake not in `public-routes` catalog | Add `path: '/registry/…'` row (probe + dashboard)                                                   |
| Board chrome missing topbar/footer           | `portal:chrome:apply` / foundation primitives                                                       |
| Pages 503 on agent limits raises             | Rebake `limit-raises.json` with non-empty `byNode`                                                  |
| DOD images blank on Pages                    | Expected without public R2; local `/evidence/` or signed URLs                                       |
| `check:routes` `/monitoring` ERR             | Bind/port/DNS — not partner domain; recheck serve-public                                            |
| Bookmakers mirror stale / v0.3 fields        | `bookmakers:bake -- --version 0.4.1` · expect `fetcher` · `sports` · `urls.web` (not `fetcherType`) |
| Desk BOOK unmatched                          | `bookmakers:desk-coverage` · [bookmakers.md](./bookmakers.md)                                       |

## Related docs

| Doc                                                                                                                                                                         | Role                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| [`docs/platform-routing.md`](../../docs/platform-routing.md)                                                                                                                | Full three-layer map          |
| [`docs/portal-foundation.md`](../../docs/portal-foundation.md)                                                                                                              | Board chrome · static verify  |
| [`docs/harness/tenants/public-plane.md`](../../docs/harness/tenants/public-plane.md)                                                                                        | Discover + audit skills       |
| [`docs/harness/tenants/partner-limits.md`](../../docs/harness/tenants/partner-limits.md)                                                                                    | Limits API / bake             |
| [`docs/harness/tenants/bookmakers-registry.md`](../../docs/harness/tenants/bookmakers-registry.md)                                                                          | Bookmakers bake               |
| [index.md](./index.md) · [ops.md](./ops.md)                                                                                                                                 | Registry hub · day-loop pulse |
| [dod.md](./dod.md) · [limits.md](./limits.md) · [telegram.md](./telegram.md) · [bookmakers.md](./bookmakers.md) · [partners.md](./partners.md) · [factory.md](./factory.md) | Domain companions             |
