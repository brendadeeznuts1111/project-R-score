# Ops board map (canonical)

Living operator guide for **Portal weave v2** on `/portal/ops/`.

Generated from the machine SSOT — **do not invent commands** here; rebake after weave changes.

| | |
|--|--|
| **Machine SSOT** | [`/registry/portal-weave.json`](../public/registry/portal-weave.json) |
| **Code SSOT** | [`lib/http/portal-weave.ts`](../lib/http/portal-weave.ts) |
| **Board** | [`/portal/ops/`](../public/portal/ops/) → Portal weave → Operator scripts |
| **Schema** | v2 · kind `portal-weave` |
| **Baked (weave)** | `2026-08-01T21:28:48.791Z` (UTC) |
| **Counts** | **37** commands · **4** groups · 27 surfaces · 36 artifacts |

```bash
# refresh weave then this guide
bun run ops:snapshot
bun tools/bake-portal-ops-map.ts
```

---

## 1. Meta (the grey line)

The ops board meta line is a **summary**, not a shell command:

> **37 commands** · **4 groups** (Registry / R2 · Ops · Harness · Secrets / vault) · **schema v2**  
> Source: [`/registry/portal-weave.json`](/registry/portal-weave.json) · Baked: `2026-08-01T21:28:48.791Z` · Guide: [`docs/portal-ops-board-map.md`](portal-ops-board-map.md)

### Related chips

| Key | href |
|-----|------|
| `chrome` | [`/registry/portal-chrome.json`](/registry/portal-chrome.json) |
| `monorepoHealth` | [`/registry/monorepo-health.json`](/registry/monorepo-health.json) |
| `doctorState` | [`/registry/doctor-state.json`](/registry/doctor-state.json) |
| `packagesGraph` | [`/registry/packages-graph-map.json`](/registry/packages-graph-map.json) |
| `opsSummary` | [`/registry/ops-summary.json`](/registry/ops-summary.json) |
| `tocOps` | [`/registry/toc-ops.json`](/registry/toc-ops.json) |

---

## 2. Operator scripts

Each row is one grounded monorepo command.

| Column | Meaning |
|--------|---------|
| **Short id** | Stable weave `id` (tooltips / audits) |
| **Label** | Name on the board |
| **Command** | Exact string the **copy** button uses |
| **Flags** | Tokens starting with `-` (else —) |
| **Docs** | Relative repo doc when set |

### Group A: Registry / R2 (6)

| Short id | Label | Command | Flags | Docs |
|----------|-------|---------|-------|------|
| `script-0-tennis-hq-ssot-r2` | Tennis HQ SSOT → R2 | `bun run --cwd king-zippy-umbra-acre ssot:publish:r2` | --cwd | [`/docs/harness/tenants/tennis-hq-registry.md`](../docs/harness/tenants/tennis-hq-registry.md) |
| `script-1-factory-r2-health` | Factory R2 health | `bun run factory:health` | — | [`/docs/guides/REGISTRY_PRODUCTION_READINESS.md`](../docs/guides/REGISTRY_PRODUCTION_READINESS.md) |
| `script-2-factory-r2-list-packages` | Factory R2 list packages | `bun run factory:list` | — | [`/docs/registry-client.md`](../docs/registry-client.md) |
| `script-3-sync-r2-registry-index` | Sync R2 registry index | `bun run registry:sync-index-r2` | — | — |
| `script-4-pages-edge-verify` | Pages edge verify | `bun run verify:pages-edge --taxonomy` | --taxonomy | — |
| `script-5-domain-glossary-bake` | Domain glossary bake | `bun run glossary:portal` | — | [`/docs/portal-foundation.md`](../docs/portal-foundation.md) |

### Group B: Ops (16)

| Short id | Label | Command | Flags | Docs |
|----------|-------|---------|-------|------|
| `script-6-ops-snapshot-includes-compliance` | Ops snapshot (includes compliance) | `bun run ops:snapshot` | — | [`/docs/harness/tenants/ops-snapshot.md`](../docs/harness/tenants/ops-snapshot.md) |
| `script-7-demo-snapshot` | Demo snapshot | `bun run ops:snapshot:demo` | — | [`/docs/harness/tenants/ops-snapshot.md`](../docs/harness/tenants/ops-snapshot.md) |
| `script-8-prediction-seed` | Prediction seed | `bun run ops:seed:prediction` | — | — |
| `script-9-toc-ops-seed` | TOC Ops seed | `bun run ops:seed:toc` | — | [`/docs/harness/tenants/toc-ops.md`](../docs/harness/tenants/toc-ops.md) |
| `script-10-telegram-handshake-gap` | Telegram handshake gap | `bun run telegram:handshake:invite-gap` | — | [`/docs/harness/tenants/partner-package-group-handshake.md`](../docs/harness/tenants/partner-package-group-handshake.md) |
| `script-11-seat-capital-desk-refresh` | Seat capital desk refresh | `bun run seat:desk:refresh` | — | [`/docs/harness/tenants/seat-capital-desk.md`](../docs/harness/tenants/seat-capital-desk.md) |
| `script-12-partners-ops-registry-bake` | Partners-ops registry bake | `bun run partners:build` | — | [`/docs/harness/tenants/seat-capital-desk.md`](../docs/harness/tenants/seat-capital-desk.md) |
| `script-13-compliance-board-bake` | Compliance board bake | `bun run compliance:bake` | — | [`/docs/harness/tenants/compliance-portal.md`](../docs/harness/tenants/compliance-portal.md) |
| `script-14-compliance-verify-bake-tests` | Compliance verify (bake + tests) | `bun run compliance:verify` | — | [`/docs/harness/tenants/compliance-portal.md`](../docs/harness/tenants/compliance-portal.md) |
| `script-15-limit-raises-multi-factor-demo` | Limit raises multi-factor demo | `bun run ops:limits:demo` | — | [`/docs/harness/tenants/partner-limits.md`](../docs/harness/tenants/partner-limits.md) |
| `script-16-capture-raise-context` | Capture raise context | `bun run ops:limits:capture` | — | [`/docs/harness/tenants/partner-limits.md`](../docs/harness/tenants/partner-limits.md) |
| `script-17-limit-raise-predict` | Limit raise predict | `bun run ops:limits:predict` | — | [`/docs/harness/tenants/partner-limits.md`](../docs/harness/tenants/partner-limits.md) |
| `script-18-limit-raises-multi-check` | Limit raises multi check | `bun run ops:limits:check:multi` | — | [`/docs/harness/tenants/partner-limits.md`](../docs/harness/tenants/partner-limits.md) |
| `script-19-limit-raise-analyze` | Limit raise analyze | `bun run ops:limits:analyze` | — | [`/docs/harness/tenants/partner-limits.md`](../docs/harness/tenants/partner-limits.md) |
| `script-20-limit-pattern-seed-bake` | Limit pattern seed + bake | `bun run ops:limits:seed-patterns` | — | [`/docs/harness/tenants/partner-limits.md`](../docs/harness/tenants/partner-limits.md) |
| `script-21-limit-raise-alerts` | Limit raise alerts | `bun run ops:limits:alerts` | — | [`/docs/harness/tenants/partner-limits.md`](../docs/harness/tenants/partner-limits.md) |

### Group C: Harness (11)

| Short id | Label | Command | Flags | Docs |
|----------|-------|---------|-------|------|
| `script-22-portal-doctor-all-groups` | Portal doctor (all groups) | `bun run portal:doctor --verbose` | --verbose | [`/docs/harness/tenants/portal-doctor.md`](../docs/harness/tenants/portal-doctor.md) |
| `script-23-portal-doctor-bunfig-only` | Portal doctor (bunfig only) | `bun run portal:doctor --group bunfig --verbose` | --group --verbose | [`/docs/UNIFIED.md`](../docs/UNIFIED.md) |
| `script-24-bake-doctor-state` | Bake doctor-state | `bun run bake:doctor` | — | [`/docs/harness/tenants/portal-doctor.md`](../docs/harness/tenants/portal-doctor.md) |
| `script-25-reference-discovery` | Reference discovery | `bun run reference:discover:check` | — | [`/docs/harness/tenants/reference-discovery.md`](../docs/harness/tenants/reference-discovery.md) |
| `script-26-public-plane-discovery` | Public plane discovery | `bun run public:discover:check` | — | [`/docs/harness/tenants/public-plane.md`](../docs/harness/tenants/public-plane.md) |
| `script-27-public-audit-bundle` | Public audit bundle | `bun run public:audit:verify` | — | [`/docs/harness/tenants/public-plane.md`](../docs/harness/tenants/public-plane.md) |
| `script-28-discovery-compose` | Discovery compose | `bun run discover:compose:check` | — | [`/docs/harness/tenants/reference-discovery.md`](../docs/harness/tenants/reference-discovery.md) |
| `script-29-doc-map-check` | Doc map check | `bun run docs:map:check` | — | [`/docs/README.md`](../docs/README.md) |
| `script-30-doc-index-bake` | Doc index bake | `bun run build:doc-index` | — | [`/lib/docs/doc-index.ts`](../lib/docs/doc-index.ts) |
| `portal-chrome-bake-apply` | Portal chrome bake + apply | `bun run portal:chrome:bake && bun tools/portal-apply-chrome.ts` | — | [`/docs/portal-foundation.md`](../docs/portal-foundation.md) |
| `monorepo-health-bake` | Monorepo health bake | `bun run monorepo:health:bake` | — | [`/docs/harness/tenants/monorepo-health.md`](../docs/harness/tenants/monorepo-health.md) |

### Group D: Secrets / vault (4)

| Short id | Label | Command | Flags | Docs |
|----------|-------|---------|-------|------|
| `script-31-compliance-bake-proton-vault` | Compliance bake (Proton vault) | `bun run compliance:bake:vault` | — | [`/docs/harness/tenants/proton-integration.md`](../docs/harness/tenants/proton-integration.md) |
| `script-32-vault-health-gate-snapshots` | Vault health gate (snapshots) | `bun run vault:health` | — | [`/docs/harness/tenants/proton-integration.md`](../docs/harness/tenants/proton-integration.md) |
| `script-33-vault-health-live-bake` | Vault health live bake | `bun run vault:health:bake` | — | [`/docs/harness/tenants/proton-integration.md`](../docs/harness/tenants/proton-integration.md) |
| `script-34-vault-map-resolve-list` | Vault map resolve (list) | `bun run vault:resolve` | — | [`/docs/harness/tenants/proton-integration.md`](../docs/harness/tenants/proton-integration.md) |

---

## 3. Surfaces (nav boards — not scripts)

| Short id | Surface URL | CLI short code | Plane |
|----------|-------------|----------------|-------|
| `home` | [`/`](/) | — (no CLI shortcut) | Public lander |
| `registry` | [`/portal/`](/portal/) | — (no CLI shortcut) | Portal board |
| `catalog` | [`/portal/catalog/`](/portal/catalog/) | — (no CLI shortcut) | Portal board |
| `packages` | [`/portal/packages/`](/portal/packages/) | `bun run portal-cli pm graph` | Portal board |
| `skills` | [`/portal/skills/`](/portal/skills/) | — (no CLI shortcut) | Portal board |
| `brands` | [`/portal/brands/`](/portal/brands/) | `bun tools/brand-keymap.ts` | Portal board |
| `glossary` | [`/portal/glossary/`](/portal/glossary/) | `bun run glossary:portal` | Portal board |
| `surfaces` | [`/portal/surfaces/`](/portal/surfaces/) | `bun run surfaces:bake` | Portal board |
| `vault` | [`/portal/vault/`](/portal/vault/) | `bun run portal-cli vault health` | Portal board |
| `env` | [`/portal/env/`](/portal/env/) | `bun run portal-cli secret map` | Portal board |
| `health` | [`/portal/health/`](/portal/health/) | `bun run monorepo:health:bake` | Portal board |
| `doctor` | [`/portal/doctor/`](/portal/doctor/) | `bun run portal:doctor --verbose` | Portal board |
| `install-hygiene` | [`/portal/install-hygiene/`](/portal/install-hygiene/) | `bun run bake:install-hygiene` | Portal board |
| `tools` | [`/portal/tools/`](/portal/tools/) | `bun run portal-cli dashboard --view=tools` | Portal board |
| `failures` | [`/portal/failures/`](/portal/failures/) | `bun run failures:bake` | Portal board |
| `ops` | [`/portal/ops/`](/portal/ops/) | `bun run ops:snapshot` | Portal board |
| `dashboard` | [`/portal/dashboard/`](/portal/dashboard/) | — (no CLI shortcut) | Portal board |
| `toc` | [`/portal/toc/`](/portal/toc/) | `bun run ops:seed:toc` | Portal board |
| `monitoring` | [`/monitoring/`](/monitoring/) | — (no CLI shortcut) | Public artifact / edge |
| `compliance` | [`/portal/compliance/`](/portal/compliance/) | `bun run compliance:bake` | Portal board |
| `limits` | [`/portal/limits/`](/portal/limits/) | `bun run ops:limits:demo` | Portal board |
| `partners` | [`/portal/partners/`](/portal/partners/) | `bun run telegram:handshake:catalog` | Portal board |
| `account` | [`/portal/account/`](/portal/account/) | — (no CLI shortcut) | Portal board |
| `partner-history` | [`/portal/partner-history/`](/portal/partner-history/) | — (no CLI shortcut) | Portal board |
| `prediction-report` | [`/registry/prediction/report/`](/registry/prediction/report/) | `bun run portal-cli snapshot last --scope prediction` | Public artifact / edge |
| `tennis` | [`/portal/tennis/`](/portal/tennis/) | `bun run tennis:agent-auth:bake` | Portal board |
| `dod` | [`/portal/dod/`](/portal/dod/) | — (no CLI shortcut) | Portal board |

---

## 4. Wiki chips (GitHub Pages)

| Label | href | Purpose |
|-------|------|---------|
| Wiki index | https://wiki.factory-wager.com/wiki-index.html | portal boards · registry · tenants · proof loop |
| Wiki home | https://wiki.factory-wager.com | README · GitHub Pages homepage |
| Docs index | https://wiki.factory-wager.com/docs/README.html | platform SSOT markdown tree |
| Harness JIT | https://wiki.factory-wager.com/docs/harness/README.html | tenant owners · proof commands |
| Registry index | https://wiki.factory-wager.com/registry-index.html | registry bake map · portal consumers |
| **AGENTS** | https://wiki.factory-wager.com/AGENTS.html | agent entrypoint |

---

## 5. Deploy the board

```bash
bunx --bun wrangler pages deploy ./public --project-name=project-r-score
```

Then hard-refresh `/portal/ops/` on the new deployment URL.

