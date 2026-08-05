# Full UI, route, and performance audit

**Audit date:** 2026-08-05
**Baseline revision:** `3e4b7ccb2cd15e595ab556a1c9ae5b4d8e98ae4a`
**Scope:** every canonical hostname in `config/surfaces.toml`, the complete local
route catalog, all portal pages and shared UI assets, and the Cloudflare Pages
static + Functions boundary.

## Acceptance metrics

| Requirement | Metric | Baseline | Candidate | Result |
|---|---|---:|---:|---:|
| Bundle reduction | Aggregate initial JS + CSS bytes over all 33 portal pages | 5,551,604 B | 3,534,934 B | **36.33% smaller — pass** |
| Speed improvement | Wall time for a sequential 95-route local catalog sweep | 28,761.108 ms | 915.178 ms median of 3 | **96.82% faster — pass** |
| Route correctness | HTTP/status/content verification | 95/95 local | 95/95 local | **pass** |
| Live edge correctness | Canonical live weave probes | — | 93/93 | **pass before deploy** |
| Portal page correctness | Pages + shared asset verifier | — | 34/34 | **pass** |
| Pages boundary | Static, Functions, headers, discovery, and API verifier | — | all checks | **pass locally** |

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

The live weave covered 28 declared surfaces, 41 artifacts, 14 shared components,
and 10 cross-subdomain references across five reachable hosts. All 93 probes
passed at the audit baseline.

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
- The optimizer enforces the 35% target and the 33-page inventory during every
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

Cloudflare uses `BUN_VERSION=1.3.14`; the optimizer was also run explicitly with
`bunx bun@1.3.14` and produced a 36.31% reduction.

## Remaining proof boundary

Core Web Vitals (LCP, CLS, INP) and browser main-thread traces require the
Chrome DevTools MCP named by the repository's `web-perf` workflow. That MCP is
not available in the current Codex runtime, so this audit does not invent
browser-trace results. Deployment and post-deploy live verification must also
complete before this document can be marked final.
