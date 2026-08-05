# Tenant audit: Tennis HQ dashboard UI surfaces

**Probed** 2026-08-05T17:16Z (UTC) via `/api/version` · tip docs refreshed same day  
**Claim** dual-surface inventory + path traces + ranked findings  
**Owners** producer `plum-spruce-dawn-dune1` (Market Desk) · this monorepo
(`/portal/tennis/` board) · Cloudflare edge (Worker networking)

Companion auth/registry runbook:
[`tennis-hq-registry.md`](tennis-hq-registry.md).

## Scope

Two live UIs share the Tennis HQ brand and must not be collapsed into one:

| Surface | Host | Owner tree | Role |
| ------- | ---- | ---------- | ---- |
| Market Desk | `https://tennis.factory-wager.com` | [`plum-spruce-dawn-dune1`](https://github.com/brendadeeznuts1111/plum-spruce-dawn-dune1) ([CONTRIBUTING](https://github.com/brendadeeznuts1111/plum-spruce-dawn-dune1/blob/main/CONTRIBUTING.md)) · Worker `tennis-hq` · local sibling `~/Projects/plum-spruce-dawn-dune1` | Interactive desk SPA |
| Portal board | `https://factory-wager.com/portal/tennis/` | [`public/portal/tennis/`](../../../public/portal/tennis/) | Baked registry evidence board |

Live identity (desk tip ≠ git tip): `tennis-hq@1.4.0` · SHA `41c9ab6`
(`41c9ab68b4d3d47d0bea92d8877137588a7cfdf1`) · Worker deployment
`7b9ac02a-18c4-46f5-a724-f07b7fa5925d` · probed via `/api/version` 2026-08-05T17:16Z.
Producer `origin/main` is `0f7b6d9` (**3 commits ahead** — not live until redeploy).

```mermaid
flowchart LR
  subgraph desk [tennis.factory-wager.com]
    UI[TennisHqDashboard panels]
    SF[createServerFn desk/kalshi/markets]
    API["/api/partners /export /version"]
    V1["/api/v1/* bearer fail-closed"]
    WH["/warehouse/*.json stubs"]
  end
  subgraph pages [Pages factory-wager.com]
    Board["/portal/tennis/ index.html"]
    Reg["/registry/tennis/*.json"]
  end
  UI --> SF
  UI --> API
  UI --> WH
  V1 -.->|only research/status wired| SF
  Board -->|fetch| Reg
  Board -->|cross-link| desk
  Reg -.->|agent-auth portal.board| Board
```

There is **no** redirect from the Worker host to `/portal/tennis/`. Registry
JSON and the portal board live on Pages only.

---

## A. Market Desk — component inventory

**Entry:** `src/routes/index.tsx` → `<TennisHqDashboard />`  
**Shell:** `src/components/dashboard/dashboard.tsx`  
**Router:** single HTTP route `/`; in-page sections via hash
(`src/lib/shared/hash-router.ts`, `useDeskHashScroll`,
`SURFACE_HASH_ALIASES` in `src/lib/shared/page-glossary.ts`).

### Panels (paint order ≈ DOM order)

| Panel | File under `src/components/dashboard/` | Mount id(s) | Data path |
| ----- | -------------------------------------- | ----------- | --------- |
| Desk status / ops | `desk-status-bar.tsx` | `#ops`, `#desk-status-bar` | `getOpsHealth` serverFn |
| Source strip | `source-strip.tsx` | `#source-strip` | desk payload / ops |
| Live Kalshi feed | `live-feed-panel.tsx` | `#live-feed-panel` | `getLiveTennisFeed` |
| Phase 2 research | `phase2-status-card.tsx` | `#phase2-status-card` | `getPhase2Status` |
| Filters / presets | `hq-filters.tsx`, `filter-presets.tsx` | `#hq-filters`, `#filter-presets` | client filter state |
| Analytics / KPI | `analytics-kpi-row.tsx`, `kpi-cards.tsx` | `#analytics-kpi-row`, `#kpi-cards` | desk payload |
| Markets strip + hot misprices | `markets-strip.tsx`, `hot-misprices.tsx` | `#markets`, `#markets-strip`, `#hot-misprices` | desk-server + `/warehouse/hardrock-board-overlay.json` |
| Live board | `live-board.tsx` | `#live`, `#live-board` | `fetchTennisHqPayload` + Hard Rock stub |
| Player detail | `player-detail.tsx` | `#player-detail` | `fetchPlayerVolume` (conditional) |
| Unified cross-market | `unified-desk-panel.tsx` | `#unified-desk-panel` | `getUnifiedDesk` |
| Research team | `research-team-panel.tsx` | `#research-team-panel` | `getResearchBrief` |
| Match intelligence | `match-intelligence-panel.tsx`, `bookmaker-comparison.tsx` | `#match-intelligence-panel`, `#matches` | markets serverFns + quotes |
| Microstructure / alerts | `microstructure-panel.tsx`, `micro-signal-feed.tsx` | `#microstructure-panel`, `#alerts`, `#micro-signal-feed` | serverFn + `/warehouse/odds-move-signals.json` |
| Volume / liquidity | `volume-liquidity-panel.tsx` | `#volume-liquidity-panel` | `getLiquidityProfile` |
| Cross-market signals | `cross-market-panel.tsx` | `#cross-market-panel` | desk enrichment |
| Warehouse | `warehouse-panel.tsx` | `#warehouse`, `#warehouse-panel` | `fetchTennisWarehouse` (12s → empty shell) |
| Trend charts | `trend-charts.tsx` | `#trend-charts` | warehouse / desk |
| Profiles | `profiles-table.tsx` | `#profiles`, `#profiles-table` | warehouse |
| Execution + accounts | `execution-dashboard.tsx`, `account-inventory-panel.tsx` | `#execution`, `#execution-dashboard`, `#accounts` | `/api/partners/executions`, execute, client profiles |
| Partners cluster | `partner-panel.tsx`, `partner-detail.tsx`, `out-table.tsx`, `out-card.tsx`, `book-card.tsx`, `partner-ledger.tsx` | `#partners`, `#partner-panel`, … `#partner-ledger` | `/api/partners/health` (+ stream), ledger |
| Export | `export-bar.tsx` | `#export-bar` | `/api/export/hq-json`, `warehouse-json`, `warehouse-csv` |
| Build footer | `build-version-footer.tsx` | footer | `/api/version`, `/build-id.json` |
| Glossary drawer | `src/components/ui/glossary-panel.tsx` | `#glossary` | in-memory glossary (HTTP twin unused by UI) |
| Command palette | `src/components/ui/command-palette.tsx` | overlay | hash jumps |

Core load in `dashboard.tsx`: `fetchTennisHqPayload` → parallel
`fetchPolyJoinCache` + `fetchTennisWarehouse` + `recordHotMisprices`; ops via
`getOpsHealth`; phase2 via `getPhase2Status`.

### HTTP API routes (producer `src/routes/api/`)

| Path | Role | UI consumer |
| ---- | ---- | ----------- |
| `GET /api/health` | Identity/health | unused by desk panels |
| `GET /api/version` | Build identity | footer |
| `GET /api/glossary` | Glossary JSON | unused by UI (in-memory) |
| `GET /api/ops/health` | Ops twin | serverFn preferred |
| `GET /api/ops/pipeline` | Pipeline | unused by UI |
| `GET /api/export/hq-json` | Desk export | `export-bar` |
| `GET /api/export/warehouse-json` / `warehouse-csv` | Warehouse export | `export-bar` |
| `GET /api/partners/health` (+ `?probe=1`, `/stream`) | Partner health | `use-partner-health` |
| `GET/POST /api/partners/*` execute · ledger · settle · accounts | Money paths | execution / ledger |
| `GET /api/v1/research/status` | **Only** implemented v1 read | contracts / weave probes |
| Manifest-only v1 | marketdata · trading · partners · accounting | **no route files** → SPA 404 |

Auth: `assertPartnerServiceAccess` in `src/lib/server/partner-api-guard.ts` —
never fail-open for v1; missing token → **503** `contract_auth_unconfigured`.

---

## B. Portal board — component inventory

**Page:** [`public/portal/tennis/index.html`](../../../public/portal/tennis/index.html)
(shell + chrome) · board controller
[`public/portal/components/tennis-desk.js`](../../../public/portal/components/tennis-desk.js)
(loaded as `<script type="module">`).

**Shared chrome:** `/portal/data.js`, `topbar.js`, `components/sidebar.js`,
`footer.js`, `components/venue-badge.js`, `/portal/style.css`, `venues.css`.

**Companion MD:** [`public/portal/tennis.md`](../../../public/portal/tennis.md).

### DOM hosts → renderers → artifacts

| DOM host | Renderer (`tennis-desk.js`) | Registry artifact |
| -------- | --------------------------- | ----------------- |
| `#kpi-host` | `renderKpis` | `board-metrics.json` + `agent-auth.json` + partner-contracts |
| `#venue-legend-host` / `#venue-live-host` | `mountVenueLegend` + `renderVenuesFromMetrics` | board-metrics |
| `#charts-host` | `renderCharts` / `barChartHtml` | board-metrics · mid-distribution fallback |
| `#sample-rows` + `#venue-filter` | `renderSampleTable` | live-matches + avatar-index |
| `#hero-avatar` / avatar strip | `loadAvatarIndex` / `avatarImg` | avatar-index · `/avatars/*.webp` |
| `#reg-table` / `#reg-sub` | `renderRegistry` | `registry.json` |
| `#live-banner` | `setBanner` | load status |
| `#tenant-health-line` | `renderHealth` | portal chrome health |
| poll / `#btn-refresh` | `load()` every 30s (`portal-poll-ms`) | all of the above |

### Bake writers (`lib/tennis/` + scripts)

| Artifact | Writer | Command |
| -------- | ------ | ------- |
| `board-metrics.json`, `mid-distribution.json`, `live-matches.json`, `avatar-index.json` | [`scripts/bake-tennis-board.ts`](../../../scripts/bake-tennis-board.ts) + [`lib/tennis/{board-metrics,live-matches,avatar-index}.ts`](../../../lib/tennis/) | `bun run tennis:board:bake` |
| `agent-auth.json` | [`tools/bake-tennis-agent-auth.ts`](../../../tools/bake-tennis-agent-auth.ts) + [`lib/tennis/agent-auth.ts`](../../../lib/tennis/agent-auth.ts) | `bun run tennis:agent-auth:bake` |
| `partner-contracts.json` | [`tools/bake-tennis-partner-contracts.ts`](../../../tools/bake-tennis-partner-contracts.ts) | `bun tools/bake-tennis-partner-contracts.ts` |
| `registry.json` | tenant seed | ops/tenant registry seed |

### Closed / residual drift

| Item | Status |
| ---- | ------ |
| `tennis-desk.js` wired from `index.html` | **Closed** (PR #363) — foundation Board UI row cites `tennis-desk.js` |
| Legacy `tennis-board.js` name | **Closed** — no remaining foundation cite; do not reintroduce |

---

## C. Path / trace matrix (live probe)

### Market Desk — `https://tennis.factory-wager.com`

| URL | Status | Notes |
| --- | ------ | ----- |
| `/` | 200 | Title `Tennis HQ · Market Desk`; SSR “Loading desk…” shell |
| `/api/health` | 200 | `ok`, package `tennis-hq@1.4.0` (prefer `/api/version` for tip SHA) |
| `/api/version` | 200 | tip SHA `41c9ab6` · Worker `7b9ac02a…` · 2026-08-05T17:16Z |
| `/api/glossary` | 200 | 300 entries · live `generatedAt` refreshes on probe |
| `/build-id.json` | 200 | packageVersion 1.4.0 |
| `/api/export/hq-json` | 200 | schema `hq-desk/v1` · **`row_count`: 0** |
| `/api/partners/health` | 200 | snapshot engine; `probed: false` |
| `/api/partners/health?probe=1` | **500** | `{"ok":false,"error":"operation not permitted"}` |
| `/api/v1/research/status` | **401** | `unauthorized` when `PARTNER_API_TOKEN` set (fail-closed; 503 only if secret missing) |
| `/api/v1/marketdata/desk` | **404** | SPA HTML (not JSON) |
| `/api/v1/trading/executions` | **404** | SPA HTML |
| `/api/v1/partners/capacity` | **404** | SPA HTML |
| `/api/v1/accounting/finance` | **404** | SPA HTML |
| `/warehouse/hardrock-board-overlay.json` | 200 | `stub: true`, `count: 0` |
| `/warehouse/odds-move-signals.json` | 200 | `stub: true`, `count: 0` |
| `/api/export/warehouse-json` | **404** | no warehouse DB / 0 desk rows |
| `/favicon.ico` | **404** | SPA HTML |
| `/manifest.json` | **404** | SPA HTML |
| `/portal/tennis/` | **404** | not on Worker |
| `/registry/tennis/agent-auth.json` | **404** | not on Worker |

### Portal / Pages — `https://factory-wager.com`

| URL | Status | Notes |
| --- | ------ | ----- |
| `/portal/tennis/` | 200 | Tenant board |
| `/registry/tennis/board-metrics.json` | 200 | `generatedAt` **2026-07-30T23:09:19Z** · event-store · 6378 markets |
| `/registry/tennis/mid-distribution.json` | 200 | same bake stamp |
| `/registry/tennis/live-matches.json` | 200 | `generatedAt` 2026-07-30 · 12 matches |
| `/registry/tennis/avatar-index.json` | 200 | same bake stamp |
| `/registry/tennis/agent-auth.json` | 200 | `status: configured` · `generatedAt` 2026-08-05T02:48:46Z |
| `/registry/tennis/registry.json` | 200 | `lastUpdated` 2026-08-04 |
| `/registry/surfaces-state.json` | 200 | tennis row note tracks tip SHA · re-bake after tip change (`bun run surfaces:bake`) |

---

## D. Ranked findings

### P0 — Contract / docs vs live

1. **v1 surface incomplete** — Tenant docs and `@tennis-hq/ssot` manifest declare
   five authenticated reads; **only** `GET /api/v1/research/status` has a route
   (`plum-spruce-dawn-dune1/src/routes/api/v1/research/status.ts`). The other four
   return SPA **404**. Ownership: **producer**.
2. ~~**Surfaces inventory overclaims**~~ — **Closed 2026-08-05 tip refresh.**
   `[surfaces.tennis].note` + `surfaces-state.json` now pin production tip
   `41c9ab6` / Worker `7b9ac02a`, record unauth **401**, and state that only
   research is implemented (other v1 → SPA 404). Residual: git tip `0f7b6d9`
   still leads until next Wrangler deploy. Ownership was **monorepo**.

### P1 — Empty / soft-fail desk (UI looks broken)

3. **Desk export empty** — `/api/export/hq-json` `row_count: 0` while shell
   paints. Ownership: **producer** / data plane (no live rows on Worker).
4. **Warehouse stubs + export 404** — Hard Rock / odds-move JSON are empty
   stubs; warehouse export returns “No warehouse DB…”. Ownership: **producer**
   ops (WAREHOUSE_DIR / pollers).
5. **Edge storage soft-fail** — Cloudflare Worker SQLite path soft-fails GETs
   empty / POSTs 503 (`edge-storage`). Ledger/executions look empty on edge.
   Ownership: **producer** + **Cloudflare** Durable Object / D1 choice.
6. **Partner live probe 500** — `?probe=1` → `operation not permitted` (Kalshi
   outbound blocked at edge). Snapshot health still 200. Ownership: **Cloudflare
   edge** networking + **producer** probe path.

### P2 — Portal consumer drift

7. **Stale board bake** — board-metrics / live-matches / avatar-index stamped
   **2026-07-30**; Worker build **2026-08-05**. Ownership: **monorepo** operator
   (`bun run tennis:board:bake`).
8. ~~**Orphan `tennis-desk.js` + missing `tennis-board.js` doc**~~ — **Closed**
   (PR #363 + foundation Board UI row). Controller is wired; no `tennis-board.js`
   cite remains.
9. **Cross-host path confusion** — `/portal/tennis/` and `/registry/tennis/*` on
   the Worker are 404 SPA shells (expected, but operators hit them). Ownership:
   **docs / UX** (link hygiene).
10. **Missing desk chrome assets** — favicon / webmanifest 404 on Worker.
    Ownership: **producer**.
11. **Git tip leads production** — producer `origin/main` `0f7b6d9` is 3 commits
    ahead of live tip `41c9ab6` (`#9`/`#8`/`#10`). Operators must not treat git
    HEAD as deployed. Ownership: **operator** (Wrangler redeploy + tip docs).

### P3 — Hygiene

12. **APIs unused by UI** — `/api/glossary`, `/api/health`,
    `/api/partners/accounts`, `/api/ops/pipeline` exist without panel callers.
13. **Stub adapters** — BETER live fetch returns `[]`; `StubOrderAdapter`
    default fill path in partner router.

---

## E. Remediations held (separate approval)

Documentation-only audit — **do not** apply these without an explicit fix lane:

| Lane | Action |
| ---- | ------ |
| Producer | Implement remaining v1 routes **or** shrink manifest/docs to `research` only; attach warehouse/DB or hide empty panels; add favicon/manifest; deploy `0f7b6d9` (or later) when ready |
| Monorepo | `bun run tennis:board:bake` (stale 2026-07-30 metrics); after each producer deploy: refresh tip in `tennis-hq-registry.md` + `[surfaces.tennis].note` + `bun run surfaces:bake` |
| Edge | Kalshi probe ACL / outbound permission for `?probe=1` |

**Done this tip lane:** production tip pin `41c9ab6` · surfaces note accuracy ·
`tennis-desk.js` inventory · `PARTNER_API_TOKEN` configured (unauth **401**).

Out of scope here: Pages deploy, vault token mint, Kalshi network ACL changes.

---

## F. Re-probe commands

```bash
# Desk identity + contracts
curl -fsS https://tennis.factory-wager.com/api/version
curl -sS -o /dev/null -w '%{http_code}\n' https://tennis.factory-wager.com/api/v1/research/status
curl -sS -o /dev/null -w '%{http_code}\n' https://tennis.factory-wager.com/api/v1/marketdata/desk

# Portal bake age
curl -fsS https://factory-wager.com/registry/tennis/board-metrics.json | bun -e 'console.log(JSON.parse(await Bun.stdin.text()).generatedAt)'

# Harness
bun run tennis:agent-auth:check
bun run tennis:ssot:release:check
bun run verify:weave -- --subdomains
```

## Related

- [`tennis-hq-registry.md`](tennis-hq-registry.md) — registry auth · v1 contract table · weave · **producer CONTRIBUTING mesh**
- Producer contribute: [CONTRIBUTING.md](https://github.com/brendadeeznuts1111/plum-spruce-dawn-dune1/blob/main/CONTRIBUTING.md) · [docs hub](https://github.com/brendadeeznuts1111/plum-spruce-dawn-dune1/blob/main/docs/README.md)
- [`docs/platform-routing.md`](../../platform-routing.md) — host ownership
- [`docs/portal-foundation.md`](../../portal-foundation.md) — portal tennis board row
- [`lib/tennis/README.md`](../../../lib/tennis/README.md) — avatar / bake mapping
