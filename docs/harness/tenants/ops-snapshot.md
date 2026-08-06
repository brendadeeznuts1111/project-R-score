# Tenant: ops-snapshot

**Tenant** `ops-snapshot` **Runs** `bun lib/operations/snapshot-cron.ts --once`
— every `*/10 * * * *` **UTC** via spine **in-process** `Bun.cron` complement
**Proof** `ops-snapshot-cron-v1` (claim in `lib/harness/proof.ts`)
**Catalog** `lib/harness/maintenance.ts` · `MAINTENANCE_RUNBOOKS`

Refreshes portal/Pages artifacts:

- `public/registry/ops-summary.json` (dashboard cards; embeds `proofTaxonomy` slice when taxonomy audit runs first)
- `public/registry/proof-taxonomy-audit.json` (subsystem contracts + consistency — written before ops-summary)
- `public/registry/monitoring.json`
- `public/registry/static.json`
- `public/registry/dod-queue.json` (+ bakes `#dod-embed` on `/portal/dod/`)
- `public/registry/toc-ops.json` (+ bakes `#toc-embed` on `/portal/toc/` · ops-summary `toc` slice)
- `public/registry/compliance-board.json` (+ enhancements/shadow · portal embed · ops-summary `compliance` slice; disable with `--no-compliance` / `OPS_SNAPSHOT_COMPLIANCE=0`) — **one board → many projections** (`ops-summary.compliance` · `monitoring.compliance` · health `complianceBoard` · `/portal/compliance/`) · tenant [`compliance-portal.md`](compliance-portal.md)
- `public/registry/limit-raises.json` (multi-factor raise context · 48h · capture missing rows via `exportLimitRaisesSnapshot`) — portal `/portal/limits/` · agent snapshot on Pages · tenant [`partner-limits.md`](partner-limits.md)
- After ops bakes, inventory timestamps via `bun tools/bake-registry-manifest.ts` → `/registry/bake-manifest.json` (board “Data as of” badges · fail-open notes in [`bake-resilience.md`](bake-resilience.md))
- tenant slices `public/registry/{factory,science,tennis}/registry.json` (when thin)
- `@factorywager/bun-utils-test` + `routing-test` proofs
- prediction report (unless `--no-report`)
- `public/registry/release-features.json` channel meta merge (prefer-artifact;
  disable with `--no-channel-meta` / `OPS_SNAPSHOT_CHANNEL_META=0`) · claim
  `channel-meta-verification-v1`

**Populate demos (Pages “looks live”):** `bun run ops:snapshot:demo` — see
[Flag matrix](#flag-matrix-seed--compliance) below.

TOC board: [`toc-ops.md`](toc-ops.md) · `/portal/toc/` · concern matrix (rails/accounts/Soft/bots vs Cloudflare MCP) in that tenant.

Uses routing proof **retry + TTL cache** (`lib/routing-proof.ts` ·
`getRoutingProof`). Next fire waits for the snapshot Promise (**no overlap**).

## Flag matrix (seed + compliance)

SSOT: [`tools/ops-snapshot.ts`](../../../tools/ops-snapshot.ts). Do not invent flags —
only argv/`Bun.env` keys the tool actually reads.

### Compliance board

| Control | Default | Effect |
|---------|---------|--------|
| *(none)* | **on** | Bake `compliance-board.json` (+ enhancements/shadow + portal embed) before ops-summary so `payload.compliance` / monitoring slice stay fresh |
| `--no-compliance` | — | Skip companion bake |
| `OPS_SNAPSHOT_COMPLIANCE=0` | — | Same skip (env; either flag **or** env disables) |

```bash
bun run ops:snapshot -- --no-compliance
OPS_SNAPSHOT_COMPLIANCE=0 bun run ops:snapshot
```

Companion path: [`compliance-portal.md`](compliance-portal.md) · `bun run compliance:bake`.

### Seed flags

Auto-seed block (ops / prediction / DOD / partner bindings / tenant registries /
TOC demo seed) runs unless `--no-seed`. **Outside** that block, snapshot **always**
refreshes `catalog-snapshot.json` and re-exports `toc-ops.json` (+ soft/identity
bridge).

<!-- REF:ID 1.1.default -->
<a id="1.1.default"></a>
<!-- REF:ID 1.1.seed -->
<a id="1.1.seed"></a>
<!-- REF:ID 1.1.seed-force -->
<a id="1.1.seed-force"></a>
<!-- REF:ID 1.1.seed-tenants -->
<a id="1.1.seed-tenants"></a>
<!-- REF:ID 1.1.no-seed -->
<a id="1.1.no-seed"></a>

| Script | REF:ID | href | --flag | When seed runs | `force` | `ifEmpty` | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ops:snapshot` | `1.1.default` | [`#1.1.default`](#1.1.default) | `(default)` | When the domain is empty (`is*Empty` / missing `toc-ops.json`) | `false` | `true` | No-op if data already present |
| `ops:snapshot` | `1.1.seed` | [`#1.1.seed`](#1.1.seed) | `--seed` | Always enter each seed call | `false` | `false` | Bypasses the empty gate (`ifEmpty: false`) so seeders run even when data exists (inserts more demo rows; not a wipe) |
| `ops:snapshot` | `1.1.seed-force` | [`#1.1.seed-force`](#1.1.seed-force) | `--seed-force` | Always | `true` | `false` | Overwrite / re-seed; also force-seeds TOC identity bridge + Soft Balance on the always-on TOC export |
| `ops:snapshot` | `1.1.seed-tenants` | [`#1.1.seed-tenants`](#1.1.seed-tenants) | `--seed-tenants` | (with seed block) | tenants only: `true` | — | `seedTenantRegistries({ force: true })`; other domains keep default/seed/`--seed-force` rules |
| `ops:snapshot` | `1.1.no-seed` | [`#1.1.no-seed`](#1.1.no-seed) | `--no-seed` | Never | — | — | Skips the whole demo-seed block (catalog + TOC export still run) |

Combinations (as coded):

- `--seed-force` implies seed want (`wantSeed`); sets `forceSeed` for all domains in the block.
- `--seed-tenants` alone does **not** set `wantSeed` / `forceSeed` for ops/prediction/DOD/partners/TOC; it only ORs into tenant-registry `force`.
- `--no-seed` wins: seed flags are ignored when the block is skipped.
- Tenant force = `forceSeed` **or** `--seed-tenants` (so `--seed-force` also force-fills tenant registries).

```bash
bun run ops:snapshot -- --no-seed              # pure assemble; no demo fill
bun run ops:snapshot -- --seed                 # call seeders (empty-or-present policy per seeder)
bun run ops:snapshot -- --seed-force           # re-seed demos
bun run ops:snapshot -- --seed-tenants         # force thin tenant registry.json only
```

### `ops:snapshot:demo`

```bash
bun run ops:snapshot:demo
# ≡  bun run ops:seed:all && bun tools/ops-snapshot.ts --no-routing
```

| Step | What runs |
|------|-----------|
| 1. `ops:seed:all` | External seeds: ops + prediction + DOD + partners + TOC fixture + tenants (`package.json` chain) |
| 2. `ops-snapshot --no-routing` | Full snapshot **without** live routing proof (faster local/Pages “looks live”); seed block still **default** (if-empty) — usually no-ops after step 1 |

Compliance, channel-meta, static, report, TOC export, catalog stay **on** (defaults).
`ops:snapshot:demo` does not forward extra argv; for a compliance-skip demo bake, run the two steps manually:

```bash
bun run ops:seed:all && bun tools/ops-snapshot.ts --no-routing --no-compliance
```

### Other flags (reference)

| Flag / env | Default | Effect |
|------------|---------|--------|
| `--no-routing` | routing **on** | Skip `getRoutingProof` |
| `--force-routing` | cache OK | Force routing refresh |
| `--no-report` | report **on** | Skip prediction HTML/SVG |
| `--webview` | off | Prediction report WebView PNG |
| `--no-static` | static **on** | Skip `public/registry/static.json` |
| `--no-channel-meta` / `OPS_SNAPSHOT_CHANNEL_META=0` | channel meta **on** | Skip prefer-artifact channel meta merge |
| `--publish` / `OPS_SNAPSHOT_PUBLISH=1` | off | Multipart publish proof artifacts (needs `REGISTRY_URL` + secret) |
| `--out <path>` / `OPS_SNAPSHOT_PATH` | `public/registry/ops-summary.json` | Ops-summary write path |
| `OPS_DB_PATH` | default ops DB | SQLite path |

Package scripts: `ops:snapshot` · `ops:snapshot:demo` · `ops:snapshot:once` (cron
`--once`) · `ops:snapshot:cron`.

## Signal (failure)

`bun run spine:schedule:once -- --tenant=ops-snapshot` exits non-zero.
Also: missing/stale `public/registry/ops-summary.json`, or ops dashboard
routing card shows `criticalFailed > 0` after a successful write.

Proofs green but liquidity/plays empty → read [`ops-summary-endpoint.md`](../ops-summary-endpoint.md)
(two pipelines; empty ops DB is not a failed summary assemble). Diagnose: `bun run ops:diagnose`.

## Intervention (repair)

Catalog intervention:
`bun test tests/ops-snapshot-cron.test.ts · bun lib/operations/snapshot-cron.ts --once`

1. Re-run: `bun run spine:schedule:once -- --tenant=ops-snapshot`
2. Local smoke: `bun run ops:snapshot -- --no-routing`
3. Force routing: `bun lib/operations/snapshot-cron.ts --once --force-routing`
4. Check `data/operations.db` and network reachability of the **Pages public
   origin** (`ROUTING_PROBE_BASE_URL` or default `https://score.factory-wager.com`).
   `REGISTRY_URL` is the npm registry API — not the routing probe target.

Do **not** delete the tenant to green the daemon.

## Retirement

Remove when a required CI/Pages deploy pipeline always runs `ops:snapshot`
before publish and spine is no longer the periodic owner. Keep
`spine-multi-tenant` ≥2 via another tenant.

**Retirement verified** `false` — set `tenants.ops-snapshot=true` in
[`lib/harness/ci-owned-tenants.json`](../../../lib/harness/ci-owned-tenants.json)
when CI owns the periodic refresh.

**Retirement check** ops-snapshot is owned by CI/Pages deploy pipeline →
`bun scripts/retirement-check-ci-owner.ts --tenant=ops-snapshot`

**Owner** `// owner: platform / ops portal` **Fresh-rerun**
`bun run docs:tenant-ops-snapshot`
