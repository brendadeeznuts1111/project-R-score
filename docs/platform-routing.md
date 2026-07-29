# Platform routing map

Local dev vs Cloudflare Pages — how URLs reach code and static files.

**Route catalog SSOT:** [`lib/http/public-routes.ts`](../lib/http/public-routes.ts) mirrors `buildPublicRoutes()` in [`scripts/serve-public.ts`](../scripts/serve-public.ts). Update both when adding portal or API paths.

**Domain SSOT:** [`config/r2-env.ts`](../config/r2-env.ts) · brand map [`docs/brand-alignment.md`](brand-alignment.md) · tenant [`docs/harness/tenants/cloudflare-pages.md`](harness/tenants/cloudflare-pages.md) · tunnels [`tunnel-inventory.md`](harness/tenants/tunnel-inventory.md)

## Surfaces

| Surface | Domain(s) | Artifact tree |
|---------|-------------|---------------|
| **Wiki** (docs hub) | `wiki.factory-wager.com` | GitHub Pages from repo root (`README.md`, `wiki-index.md`, `docs/`, `AGENTS.md`) — **not** Cloudflare Pages |
| Portal + registry proofs | `project-r-score.pages.dev`, `score.factory-wager.com` | `public/` + `functions/` |
| npm/R2 registry | `registry.factory-wager.com` | Pages Functions + R2 binding `REGISTRY_BUCKET` (`wrangler.toml`, `functions/api/registry/[[path]].ts`) — no separate registry Worker |
| Reasonix UI | `reasonix.factory-wager.com` | **Not installed** — tunnel config `scripts/cloudflared-reasonix.yml` exists in-repo but no `~/.cloudflared/config.yml` / credentials on this machine; hostname does not resolve. Inventory: `docs/harness/tenants/tunnel-inventory.md` |
| Local dev | `http://127.0.0.1:<port>` | `serve-public.ts` + `functions-bun-only/` |

Port / bind policy: [`docs/harness/tenants/serve-public-bind.md`](harness/tenants/serve-public-bind.md) · [`lib/http/serve-public-bind.ts`](../lib/http/serve-public-bind.ts). Default port chain: `--port` → `BUN_PORT` → `PORT` → `NODE_PORT` → **3000**; busy → ephemeral + `.serve-public/bind.json`. Operator cards: `bun run brand:status:bind` · `brand:status:lifecycle`.

## Three routing layers

### 1. Static (`public/`)

- Portal UI: `public/portal/*`
- Proof JSON: `public/registry/*`
- Trailing slashes: [`public/_redirects`](../public/_redirects) (301 only — **no** SPA `/* → index.html`)
- Content-Type / cache: [`public/_headers`](../public/_headers)

### 2. Edge (`functions/` — deployed to Pages)

Edge-safe only (no `bun:sqlite`). Key handlers:

| Path | Module |
|------|--------|
| `/api/operations/summary` | `functions/api/operations/summary.ts` → snapshot JSON |
| `/api/registry/*` | `functions/api/registry/[[path]].ts` → R2 binding |
| `/api/health`, `/api/env`, `/api/monitoring` | `functions/api/*.ts` |
| `/health` (JSON) · `/health/pre` (plain) | `functions/health/index.ts` · `functions/health/pre.ts` → [`portal-health-edge.ts`](../lib/http/portal-health-edge.ts) (no `functions/health.ts` file — CF rejects file+dir same name) |
| `/api/agents/v1/limits/raises` | `functions/api/agents/v1/limits/raises.ts` → filter `limit-raises.json` (snapshot; `?format=table`; empty/`byNode` missing → **503**) |
| `/api/limits/summary` | `functions/api/limits/summary.ts` → aggregate from `limit-raises.json` |
| `/api/agents/v1/limits/record` | `functions/api/agents/v1/limits/record.ts` → **503** stub (mutations need local SQLite) |

Partner limits live path (local): `scripts/serve-public.ts` → [`limit-raise-agent-api.ts`](../lib/operations/limit-raise-agent-api.ts) against `operations.db`. Tenant: [`harness/tenants/partner-limits.md`](harness/tenants/partner-limits.md).

Full inventory: [`docs/harness/tenants/cloudflare-pages.md`](harness/tenants/cloudflare-pages.md).

### 3. Local-only (`functions-bun-only/` + `serve-public.ts` fetch)

- Live SQLite ops summary, catalog, DOD, auth — wired in `serve-public.ts`
- **Not** deployed to Pages — see [`functions-bun-only/README.md`](../functions-bun-only/README.md)

## Auth when `REGISTRY_SECRET` is set

Local `serve-public` protects most paths via Bearer auth. **Public read plane** (matches Pages static deploy):

- `/portal/*` — HTML, CSS, JS, modules
- `/registry/*` — proof JSON consumed by ops dashboard
- `/api/monitoring`, `/api/registry`, `/api/operations/summary`, … (see `publicReadPaths` in `serve-public.ts`)

Publish remains auth-gated.

## Verification commands

| Concern | Command |
|---------|---------|
| Local portal + styles | `bun run verify:portal` · override `PORTAL_VERIFY_BASE` · auto `.serve-public/bind.json` |
| Live Pages edge | `PAGES_VERIFY_BASE=https://project-r-score.pages.dev bun run verify:pages-edge` |
| Route catalog | `bun run check:routes` |
| Routing proof | `bun run routing:proof` |
| Proof taxonomy | `bun run verify:proof-taxonomy:save` |
| Ops snapshot | `bun run ops:snapshot` |
| Cloudflare pins | `bun run cloudflare:env` |

## Ops dashboard data flow

`/portal/ops/` → `operations-dashboard.js` fetches:

- Live local: `/api/operations/summary` (SQLite)
- Pages: same path via edge function → `public/registry/ops-summary.json`
- Proofs: `/registry/*.json` including `proof-taxonomy-audit.json`
- Ops summary embeds a `proofTaxonomy` slice (contracts/consistency/hash); dashboard uses slice first, full audit JSON for the contract table
- Optional `toc` slice from `/registry/toc-ops.json` (TOC rollup card → `/portal/toc/`)

Regenerate: `bun run ops:snapshot` (writes summary + taxonomy audit + routing proofs + TOC bake + **portal-weave.json** with wiki cross-links).

## Wiki ↔ portal integration

| Direction | SSOT |
|-----------|------|
| Portal chrome → wiki index | [`lib/http/wiki-nav.ts`](../lib/http/wiki-nav.ts) · `PORTAL_WIKI_DROPDOWN_HREF` |
| Registry machine links | [`public/registry/portal-weave.json`](../public/registry/portal-weave.json) · `wiki[]` slice |
| Wiki human hub | [`wiki-index.md`](../wiki-index.md) · live at `/wiki-index.html` |
| Doc path registry | [`lib/docs/repo-docs.ts`](../lib/docs/repo-docs.ts) · `CANONICAL_REPO_DOCS.wikiIndex` |

Ops dashboard (`operations-dashboard.js`) renders `portal-weave.json` **`wiki`** links beside Pages surfaces. Monitoring links to the weave JSON for the same SSOT.

Wiki link gate: `bun run wiki:links:check` (rewrites excluded-tree hrefs to GitHub blob URLs · `--fix`).

## TOC Ops board data flow

`/portal/toc/` → `toc-dashboard.js` fetches:

- `/registry/toc-ops.json` (baked fixture) or `GET /api/toc` (same ASSETS on Pages)
- POST `/api/toc/*` → **503** (mutations stay in `toc-ops-repo` `ct`)

Routes: [`lib/http/public-routes.ts`](../lib/http/public-routes.ts) · tenant [`docs/harness/tenants/toc-ops.md`](harness/tenants/toc-ops.md) · portal foundation § TOC Ops board.

## Agent MCP (Cloudflare)

HTTP MCP servers in [`.mcp.json`](../.mcp.json): `cloudflare`, `cloudflare-docs`, `cloudflare-bindings`, `cloudflare-builds`, `cloudflare-observability`. Token: `CLOUDFLARE_API_TOKEN` from **Proton Pass** (`pass://factorywager/Cloudflare API Token/password`) via `bun run proton:inject:factorywager:reasonix` (derived `~/.reasonix/.env` / project `.env` — not paste). Scope probe: `bun run cloudflare:env:validate`. Discovery: `/.well-known/mcp.json` on Pages. See [`AGENTS.md`](../AGENTS.md), [`docs/harness/tenants/proton-integration.md`](harness/tenants/proton-integration.md), and [`docs/harness/tenants/cloudflare-pages.md`](harness/tenants/cloudflare-pages.md).

**Note:** `cloudflare-builds` is Workers Builds CI — not Cloudflare Pages deploy history. Use `cloudflare` `execute` for Pages API (`/accounts/{id}/pages/projects/...`).

**TOC Ops is not an MCP server.** MCP is platform deploy/inspect only. Partner desk (Soft Balance, rails, MessageLog, phones, package bot) lives in `toc-ops-repo` Central Tool; Pages serves the baked fixture under `/registry/toc-ops.json`.
