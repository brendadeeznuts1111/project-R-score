# Ops summary endpoint

**Endpoint** `GET /api/operations/summary` **Portal** `/portal/ops/` **Diagnose** `bun run ops:diagnose` **Runbook** `bun run docs:ops-summary-endpoint`

Two pipelines serve the same dashboard. Confusing them produces “proofs green but ops empty” or “JSON URL looks broken.”

## Two pipelines

**Layer 1 — API (server assemble)**

- Handler: [`scripts/serve-public.ts`](../../scripts/serve-public.ts) `liveOpsSummary()` → [`lib/operations/ops-summary.ts`](../../lib/operations/ops-summary.ts) `buildOpsSummary(db, 'live')`
- Data: SQLite `data/operations.db` + `Bun.mmap` of `public/registry/*.json` + in-process `buildBunUtilsProof()`
- **No `fetch()` on the happy path** — `BUN_CONFIG_VERBOSE_FETCH` stays quiet when you curl the summary API

**Layer 2 — Portal (browser)**

- [`public/portal/operations-dashboard.js`](../../public/portal/operations-dashboard.js) `load()` fetches summary, then `loadVerificationArtifacts()` issues **12+** `fetch('/registry/*.json')` for full panels
- Use browser **Network** tab for portal failures; use server verbose fetch only on probe tools

## Source switch

Read `source` (and optional `fallback`) in the JSON body:

- **`live`** — DB + proofs OK (local `serve:public`)
- **`snapshot`** + **`fallback: db-unavailable`** — SQLite failed; last `public/registry/ops-summary.json`
- **`error`** + HTTP **503** — DB and snapshot both missing

Pages edge: [`functions/api/operations/summary.ts`](../../functions/api/operations/summary.ts) serves snapshot only (no `bun:sqlite`).

## Empty ops ≠ broken API

- **Proofs** (channel meta, Bun utils, taxonomy, docs coverage) — registry artifacts + live proof builders
- **Ops metrics** (liquidity, plays, experts) — SQLite only; `$0` and empty arrays are valid empty DB state

## Verbose fetch scope

[`BUN_CONFIG_VERBOSE_FETCH`](https://bun.com/docs/runtime/debugger) logs Bun `fetch()` / `node:http` only. Use on:

- `bun tools/verify-networking.ts`
- routing proof generation / remote probes

Not on: `curl localhost:3000/api/operations/summary`

## Debugger breakpoints

[`Bun --inspect`](https://bun.com/docs/runtime/debugger) on `bun --inspect scripts/serve-public.ts`:

- `liveOpsSummary` — DB exception → snapshot fallback
- `buildOpsSummary` — full payload assembly
- Portal `load()` — client fetch failure (browser DevTools)

## Routing artifact note

Embedded `routing` in the summary is probed against the **Pages public origin**
(`ROUTING_PROBE_BASE_URL` / default `https://score.factory-wager.com`), not npm
`REGISTRY_URL`. Bun’s publish/install registry is configured separately
([`bun publish --registry`](https://bun.com/docs/pm/cli/publish#registry-configuration),
root `bunfig.toml`, `.npmrc`).

Local `serve-public` on `:3000` is a dev mirror — use
`bun tools/routing-registry-proof.ts --base http://localhost:3000` for local
routing smoke, not `REGISTRY_URL=...`.

`bun run ops:diagnose --compare-routing` compares embedded fail paths vs live
probe on `--base-url` (default localhost when diagnosing local server).

## Triage layers

1. **Raw API** — `curl` + `bun run ops:diagnose`; check `source` / HTTP status / missing blocks
2. **Portal banner** — “Operations summary unavailable” after retries → server down, wrong port, or both summary paths failed
3. **Specific panel** — summary embed vs separate registry fetch (networking, release-features, etc.)

## Ownership

- **Artifact freshness** (ops-summary.json, monitoring, static, routing/bun-utils proofs) — tenant [`ops-snapshot`](tenants/ops-snapshot.md) · claim `ops-snapshot-cron-v1`
- **Channel meta / taxonomy embeds** — [`channel-meta-verification`](tenants/channel-meta-verification.md) · claim `channel-meta-verification-v1`

## Ratchet

- `bun run ops:diagnose`
- `bun test tests/ops-summary-diagnose.test.ts`
- `bun run docs:ops-summary-endpoint`
