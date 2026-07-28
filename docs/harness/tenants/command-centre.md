# Tenant: command-centre

**Tenant** `command-centre` (apex lander)
**Board** `/` · [`public/index.html`](../../../public/index.html)
**Core** [`public/portal/command-centre-core.js`](../../../public/portal/command-centre-core.js)
**API** [`lib/portal/command-centre-api.ts`](../../../lib/portal/command-centre-api.ts) (loopback only)
**Launcher** `bun run portal-cli dashboard` · `portal-cli dashboard --view=home --open`

Apex command centre — live glance at monorepo health, registry graph, snapshots, capabilities, and copy/run CLI actions. Distinct from **Registry portal** (`/portal/`), **CLI tools hub** (`/portal/tools/`), and **Executive dashboard** (`/portal/dashboard/`).

## Signal (failure)

| Gate | Failure |
|------|---------|
| `tests/public-lander.test.ts` | Missing `cc-grid`, `command-centre.js`, core nav targets |
| `tests/command-centre.test.ts` | Widget builders / `LINK_GROUPS` drift |
| `tests/command-centre-api.test.ts` | Dashboard payload or action allowlist mismatch |
| `tests/r2-env.test.ts` | Apex HTML missing command-centre markers |
| `public:discover:check` | Broken `/registry/` ref on lander, TS leak in `command-centre*.js` |
| Stale baked JSON | Widgets show missing / warn rows |

## Intervention (repair)

1. Rebake registry: `bun run ops:snapshot --no-routing`
2. Health / failures / packages: `bun run monorepo:health:bake` · `bun run failures:bake` · `bun run audit:packages -- --bake`
3. Local snapshot index (dev): `bun run portal-cli snapshot list` · `serve:public:hot` → `GET /api/portal/dashboard` · bind URLs: [`serve-public-bind.md`](serve-public-bind.md)
4. Loopback Run buttons 403: expected on Pages — use copy-CLI in a trusted shell
5. Re-run: `bun test tests/command-centre*.test.ts tests/public-lander.test.ts` · `bun run public:audit:verify`

## Data plane

| Widget | Source | Board |
|--------|--------|-------|
| Health | `/registry/monorepo-health.json` + `failures.json` | `/portal/health/` |
| Doctor | `/registry/doctor-state.json` · loopback `POST /api/doctor/run` | `/portal/doctor/` |
| Registry | `/registry/packages-graph-map.json` + `monitoring.json` | `/portal/packages/` |
| Vault | `/registry/vault-health.json` | `/portal/vault/` |
| Snapshots | local `snapshots/index.jsonl` (API) or `catalog-snapshot.json` fallback | `/portal/tools/#snapshots` |
| Capabilities | `/registry/capability-map-subset.json` | `/portal/tools/#capabilities` |
| Bake freshness | Same `BAKE_SOURCES` as tools hub (includes `doctor-state`) | per-row board links |

Pages: client `fetch` of baked JSON only — **no browser spawn**. Loopback `serve-public`: `POST /api/portal/action` allowlist mirrors `QUICK_ACTIONS` ids in core.

## Gap map

| Gap | Status | Evidence |
|-----|--------|----------|
| Apex widgets read baked registry JSON | **Closed** | `command-centre-core.js` · `command-centre.js` |
| No Bun.spawn from browser on Pages | **Closed** | copy-CLI + loopback-only API |
| Quick action ids match API allowlist | **Closed** | `command-centre-api.test.ts` parity |
| Docs disambiguate home vs registry vs exec dash | **Closed** | this tenant · `portal-foundation.md` |
| Snapshot scope list on Pages | **Partial** | catalog fallback only; full index local |

## Compose

| Layer | Gate |
|-------|------|
| Public plane | [`public-plane.md`](public-plane.md) · `public:audit:verify` |
| Portal foundation | [`portal-foundation.md`](../../portal-foundation.md) |
| Cloudflare Pages | [`cloudflare-pages.md`](cloudflare-pages.md) — no SPA rewrite on apex |

**Owner** `// owner: platform / portal`

**Fresh-rerun** `bun run public:audit:verify` · `bun test tests/command-centre.test.ts`
