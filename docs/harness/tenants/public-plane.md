# Tenant: public-plane

**Tenant** `public-plane` (agent-operated)
**Discovery** `bun run public:discover:check`
**Audit bundle** `bun run public:audit:verify`
**Skills** `.agents/skills/public-discovery/SKILL.md` · `.agents/skills/public-audit-gap-close/SKILL.md`

Pages static artifact plane — portal UI, registry bake, monitoring shells. Distinct from harness `reference-discovery` (code/env in `lib/`) and from live edge behavior in `functions/`.

## Signal (failure)

| Gate | Failure |
|------|---------|
| `public:discover:check` | Broken `/registry/` ref, missing portal chrome, TS in `.js`, inline `/api/health` |
| `verify:portal:static` | Portal foundation contract (data.js, topbar, redirects) |
| `audit:verify` | Audit catalog graph/evidence drift |

## Intervention (repair)

1. Report: `bun tools/public-discovery.ts --json`
2. Fix **errors** first (`broken-registry-ref`, portal anti-patterns)
3. Rebake when registry missing: `bun run ops:snapshot --no-routing`
4. Portal chrome: `bun tools/portal-apply-chrome.ts` · [`docs/portal-foundation.md`](../../portal-foundation.md)
5. Re-run: `bun run public:audit:verify`

## Gap map

| Gap | Status | Evidence |
|-----|--------|----------|
| Portal shells include `data.js` + `topbar.js` | **Closed** | `verify:portal:static` · `public-discovery` `portal-chrome-missing` |
| No inline `/api/health` on client pages | **Closed** | `verify:portal:static` · `portal-inline-health` |
| Browser `.js` free of TS annotations | **Closed** | `portal-typescript-leak` · `public/portal/app.js` history |
| `/registry/` fetches resolve to baked JSON | **Closed (ops loop)** | `ops:snapshot` · `broken-registry-ref` gate |
| Proof taxonomy panel on ops dashboard | **Closed** | `verify-portal.ts` taxonomy chrome check |
| Live `/api/health` schema v1 on Pages | **Partial** | `verify:portal` live probe · env-dependent |
| Orphan registry JSON without portal link | **Closed** | weave SSOT (`PORTAL_WEAVE_ARTIFACTS`) · `content-type-matrix` · `formdata-proof` · `package-info` |
| Shared mark, head metadata, and proof footer | **Closed** | `site.webmanifest` · `icons/factory` · `portal:chrome:apply` · footer `portal-weave.json` |
| Limit raises bake + board | **Closed** | `/portal/limits/` · `limit-raises.json` · health `artifacts.limitRaises` · tenant `partner-limits.md` |
| `skills-catalog.json` scope | **Closed** | Kimi Daimon (`PORTAL_SKILLS_DIR`) · harness plane baked separately as `harness-skills-catalog.json` |

## Compose

| Layer | Gate |
|-------|------|
| CI (`ci:harness`) | `public:discover:check` ∥ cheap ratchets |
| Pre-commit | staged `public/portal|registry|…` → `public:discover:check` |
| Proof catalog | `public-plane-discovery-v1` · `freshRerun: public:audit:verify` |
| Portal weave | operator scripts on `/registry/portal-weave.json` |
| Combined agents | `discover:compose:check` = harness + public planes |

- Harness naming/planes → `reference-discovery` · `bun run reference:discover:check`
- Both planes → `bun run discover:compose:check`
- TOC fixture rows → `audit-gap-close` · `docs/harness/tenants/toc-ops.md`
- Platform routing → `docs/platform-routing.md` · `bun run check:routes`
- Local dev bind (port / URLs) → [`serve-public-bind.md`](serve-public-bind.md) · `lib/http/serve-public-bind.ts` · BIND IDENTITY startup card · `bun run brand:status:bind` / `brand:status:lifecycle` · `bun run check:serve-shape`

## Shared SSOT

Portal static anti-patterns live in `lib/portal-static-checks.ts` — consumed by `tools/verify-portal.ts` and `lib/public-discovery.ts` (no duplicate rules).

## Agents

| Agent | Entry |
|-------|-------|
| Public Discovery | `.agents/skills/public-discovery/agents/openai.yaml` |
| Public Audit Gap Close | `.agents/skills/public-audit-gap-close/agents/openai.yaml` |

**Owner** `// owner: platform / portal`

**Fresh-rerun** `bun run public:audit:verify`

## Audit evidence (Discovery → Audit → Re-gate)

Compose loop: [`.agents/skills/audit-gap-close/`](../../../.agents/skills/audit-gap-close/) · [`docs/audit/README.md`](../../audit/README.md)

```bash
bun run discover:compose:check    # harness + public planes
bun run public:audit:verify       # public discover · portal static · audit catalog
bun run reference:discover:check  # similar-env warn tier
bun run ops:snapshot --no-routing # portal-weave rebake
```

| Gate | Last run | Result |
|------|----------|--------|
| `discover:compose:check` | 2026-07-26 | 0 errors · harness + public |
| `public:discover:check` | 2026-07-26 | 0 findings |
| `public:audit:verify` | 2026-07-26 | pass · portal static · audit catalog |
| `verify:portal:static` | 2026-07-26 | pass |
| `reference:discover:check` | 2026-07-26 | 0 errors · 0 warn (`similar-env` trimmed) |
| `test:toc-ops` | 2026-07-26 | 71 pass · 18 files |
| `cloudflare:preflight` | 2026-07-26 | pass · 13 contracts · 20 consistency |
| `ci:harness:fast` | 2026-07-26 | pass |
| `harness-skills-catalog` | 2026-07-26 | 22 skills baked · portal-weave artifact |
| Registry rebake | 2026-07-26 | `portal-weave.json` · `harness-skills-catalog.json` + weave artifacts |
