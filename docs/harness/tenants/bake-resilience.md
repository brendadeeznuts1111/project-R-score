# Bake resilience · data source · local parity

Operator notes for **stale-data** and **SQLite fallback** on the Factory portal
plane. Complements the API host map and Tennis partner-contracts join.

## 1. Two data planes

| Plane | Paths | Authority |
|-------|-------|-----------|
| **Live** | `/api/operations/*`, `/api/limits/*` (local SQLite) | Operator machine / `serve-public` |
| **Baked** | `/registry/*.json` | Last good `bun` bake (deployed on Pages) |

Pages has **no** `operations.db`. Read-only public endpoints must **fail-open**
to the bake when SQLite is missing — not 503 the board.

### X-Data-Source

Local `serve-public` sets:

| Header value | Meaning |
|--------------|---------|
| `live` | SQLite / live computation |
| `stale-cache` | Served last good `/registry/*.json` |
| `none` | No live data and no bake |

Monitor for `stale-cache` spikes (DB bind / path issues).

```bash
curl -sI http://127.0.0.1:3000/api/operations/summary | grep -i x-data-source
```

## 2. Bake orchestrator (not an always-on service)

GitHub Actions is **disabled** repository-wide. The bake pipeline is:

| Mode | Command |
|------|---------|
| Full offline rollup | `bun run bake:all` |
| Tennis partner join | `bun tools/bake-tennis-partner-contracts.ts` |
| Inventory timestamps | `bun tools/bake-registry-manifest.ts` → `/registry/bake-manifest.json` (schema v2: `runtime.runtime` / `runtime.runtimeVersion` / `runtime.bakedAt` — which Bun wrote the inventory) |
| Projects browser | `bun run registry:projects` |

**Schedule (operator machine):** cron / Bun.cron / launchd calling `bake:all`
or a subset after `ops:snapshot`. Prefer (and `bake:all` step order):

1. `ops:snapshot` (partners-ops · ops-summary · limit-raises)
2. `bun run tennis:partner-contracts:bake` (live when `PARTNER_API_TOKEN` set; else offline)
3. `bake-registry-manifest` (last — inventory for “Data as of” badges)

Tennis board splits freshness into **contracts · metrics · books** (`desk.latestBookAt`
independent of bake-manifest).

**Atomic write + keep-last-good:** partner-contracts bake writes via temp+rename
and refuses to clobber a useful bake with an empty/failed run.

## 3. Token boundary (Tennis vs registry)

| Token | Env | Allowed consumers |
|-------|-----|-------------------|
| Registry | `FACTORY_WAGER_TOKEN` | Factory registry publish / cloud agent install |
| Producer | `PARTNER_API_TOKEN` | `tennis.factory-wager.com/api/v1/*` + partner-contracts **live** bake only |

Never inject `FACTORY_WAGER_TOKEN` into the Tennis Worker. Never put either token
in portal HTML or `/registry/*` bakes. Live bake logs `X-Request-ID` on Tennis
fetch failures (stdout) for correlation.

## 4. Local dev parity

| Port / command | What it is |
|----------------|------------|
| `bun scripts/serve-public.ts` | **Canonical** — static + live `/api/*` + SQLite fallback |
| `python -m http.server 64888` in a worktree `public/` | Static only — **no** Factory API |

Do not use :64888 to test `/api/*`. For boards:

```bash
bun scripts/serve-public.ts
# open http://127.0.0.1:<port>/portal/tennis/
```

Worktree static servers must receive bakes under **their** `public/registry/`
(copy or re-run bake with that tree as cwd).

## 5. Registry CDN

`public/_headers` sets `Cache-Control: public, max-age=60, must-revalidate` for
`/registry/*.json` so Pages CDN revalidates within a minute after deploy.

## 5b. Board “Data as of” badge

Client utility: [`public/portal/data-freshness.js`](../../../public/portal/data-freshness.js)

| API | Role |
|-----|------|
| `loadBakeManifest()` | Once-per-page fetch → `window.__BAKE_MANIFEST__` |
| `getFreshness(path\|paths[])` | Oldest `bakedAt` among keys; optional body fallbacks |
| `mountFreshnessBadge(el, paths, opts)` | Paint badge; **hide** if manifest missing |

Tone: green `<1h` · yellow `1–4h` · red `>4h`. Mounted on:

- Ops hero `#ops-freshness` (ops-summary · partners-ops · handshake · limit-raises)
- Tennis hero `#tennis-freshness` (partner-contracts · board-metrics · agent-auth)

Fail-silent: never throws into board render.

## 6. Contract freeze (Tennis → board)

`tests/tennis-partner-contracts.test.ts` asserts fields required by CODE chips
and the partner-contracts table (`partnerCode`, hrefs, outs counts,
`generatedAt`). Extend that suite when the board columns change.

## Related

- [`tennis-hq-registry.md`](tennis-hq-registry.md) — dual auth planes · [producer CONTRIBUTING](https://github.com/brendadeeznuts1111/plum-spruce-dawn-dune1/blob/main/CONTRIBUTING.md) (Market Desk day loop; stale Pages badges need Factory bake, not Wrangler)
- [`partner-limits.md`](partner-limits.md) — limits APIs
- `lib/http/data-source.ts` — `X-Data-Source` helper
- `lib/registry/bake-manifest.ts` — bake inventory + `runtime` provenance (`Bun.version`, optional `BUN_VERSION` override)
