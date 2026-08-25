# Full UI, route, and performance audit

**Audit date:** 2026-08-05
**Baseline revision:** `faff7919463f82dc3ab5227482a704a1f7672377`
**Scope:** every canonical hostname in `config/surfaces.toml`, the complete local
route catalog, all portal pages and shared UI assets, and the Cloudflare Pages
static + Functions boundary.

## Acceptance metrics

| Requirement | Metric | Baseline | Candidate | Result |
|---|---|---:|---:|---:|
| Bundle reduction | Aggregate initial JS + CSS bytes over all 35 portal pages | 6,573,486 B | 4,132,518 B | **37.13% smaller — pass** |
| Speed improvement | Wall time for a sequential 95-route local catalog sweep | 28,761.108 ms | 915.178 ms median of 3 | **96.82% faster — pass** |
| Route correctness | HTTP/status/content verification | 95/95 local | 95/95 local | **pass** |
| Live edge correctness | Canonical live weave probes | — | 105/105 | **pass after deploy** |
| Portal page correctness | Pages + shared asset verifier | — | 34/34 | **pass** |
| Pages boundary | Static, Functions, headers, discovery, and API verifier | — | all checks | **pass live** |

The bundle metric counts each route's initial static module and stylesheet graph,
plus inline runnable JavaScript and CSS. Dynamic imports are intentionally
excluded because they are deferred work. The locked baseline and detailed
per-page evidence live in `tools/performance/portal-performance-baseline.json`
and `tools/performance/portal-performance-report.json`.

## Domain and subdomain review

`config/surfaces.toml` is the hostname authority. The audit preserves expected
access and retirement states instead of reporting them as outages.

| State | Surfaces | Expected behavior |
|---|---|---|
| Live Pages | apex, `www`, `score`, `project-r-score.pages.dev` | Static app + Pages Functions; portal paths may redirect to Access |
| Live services | `registry`, `tennis`, `wiki`, `ledger` | Allowlisted registry, Tennis Worker, GitHub Pages wiki, and Access-protected tunnel respectively |
| Vanity | `health`, `telegram` | Resolve to the Pages app; canonical functions remain paths on `score` |
| Retired | `terminal`, `support`, `reasonix`, internal registry writer | No DNS/service is the required state |

The post-deploy live weave covered 32 declared surfaces, 42 artifacts, 21 shared
components, and 10 cross-subdomain references across five reachable hosts. All
105 probes passed.

## Route and UI review

- The fresh local server passed all 95 routes. A stale server on another port was
  excluded after it produced false missing-route and timeout reports.
- The portal verifier passed all 34 page entries and their required scripts,
  styles, registries, and APIs against both the Bun server and local Wrangler
  Pages runtime.
- Static portal checks, color-kernel validation, theme checks, and the power UI
  score pass.
- Rendered-browser checks cover Ops, TOC, Partners, Packages, Limits, and Health.
  Each page hydrates shared health, tenant, navigation, and footer chrome with no
  console warnings/errors or document-level horizontal overflow. The Ops page
  also passes a mobile-width overflow check.
- A three-run Lighthouse 13.4.1 desktop trace on Ops records a median performance
  score of 98, 553.332 ms LCP, 0 ms total blocking time, and 0.091956 CLS. The
  pre-fix deployment scored 75 with 1.126323 CLS. The shift came from the empty
  tenant rail gaining height after hydration; shared chrome and the asynchronous
  dashboard now reserve their layout slots before data arrives.

## Fixes

### Monitoring latency

The live `/monitoring`, `/monitoring/`, and `/api/monitoring` handlers were
performing a machine-wide Bun install-cache scan on the request path. That scan
uses filesystem/process probes and dominated the route sweep at roughly nine to
ten seconds per request. Live HTTP collection now omits that slice while the
offline snapshot path retains it. The three candidate sweeps completed in
527.000 ms, 915.178 ms, and 1,570.000 ms with 95/95 routes passing.

### Initial UI execution and delivery size

- Shared data, navigation badges, sidebar, notifications, footer, glossary, and
  domain-lane controllers now hydrate through idle-time dynamic imports. Pages
  source remains readable; the deployment optimizer removes only the redundant
  eager tags whose behavior the topbar owns.
- `portal:optimize` now copies the complete `public/` tree, including hidden
  discovery files, then minifies portal JavaScript, CSS, and runnable inline
  blocks without mutating readable source artifacts.
- The optimizer enforces the 35% target and the 35-page inventory during every
  Pages build. Cloudflare's desired output changes from `public` to
  `tmp/pages-optimized`.
- The portal logo CSS URL is relative so both source serving and CSS compilation
  resolve it correctly.

## Reproduction

```bash
bun run portal:optimize
bun test tests/optimize-portal-assets.test.ts
PORTAL_VERIFY_BASE=http://127.0.0.1:6111 bun run verify:portal
PAGES_VERIFY_BASE=http://127.0.0.1:6111 bun run verify:pages-edge
bun run verify:weave -- --summary
```

The previous Pages runtime baseline produced 3,716,496 B, a 42.07% reduction.
Re-record this measurement from the first successful 1.4.0 preview before
treating it as current production evidence.

## Production proof

Cloudflare Pages deploy `1d792100-51ac-40e5-ba89-3d4667183e0f` completed from
`main`; the immutable origin proved the optimized portal scripts and all 37
glossary sections. The canonical edge verifier and 105-probe weave then passed.
Lighthouse supplies lab LCP, CLS, and main-thread evidence. INP requires real
user interaction and is therefore not inferred from a page-load trace; rendered
desktop and mobile interaction checks cover the navigation and dashboard paths.
