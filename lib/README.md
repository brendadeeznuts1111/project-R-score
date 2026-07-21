# FactoryWager Library

Shared harness under `lib/`. Barrel: [`index.ts`](./index.ts) (`LIB_INFO`, `FW`).

Inventory SSOT for agents — **indexes, no moves**. Domain folders stay where they are; spine modules stay at `lib/<name>.ts`.

## Root contract

| Surface | Required |
|---------|----------|
| This file | Domain + spine map |
| Every first-level `lib/*/` directory | `README.md` index |
| Spine modules | Stay at documented root paths (do not relocate without import migration) |

```bash
bun run lib:domains:check          # domain README indexes (∥ cheap / pre-commit on lib/)
bun run check:path-bun && bun run check:bun-env
bun tools/doc-map-check.ts
bun tools/harness-violations.ts --path lib/types --rule unknown
```

## Canonical docs

| Role | Path |
|------|------|
| Path SSOT | [`docs/repo-docs.ts`](./docs/repo-docs.ts) |
| Docs index | [`../docs/README.md`](../docs/README.md) |
| Standards | [`.custom-instructions.md`](../.custom-instructions.md) |
| Agents | [`../AGENTS.md`](../AGENTS.md) |
| Install | [`../docs/UNIFIED.md`](../docs/UNIFIED.md) |
| Wire | [`../docs/WIRE_BOUNDARY.md`](../docs/WIRE_BOUNDARY.md) |
| Brands | [`types/branded/README.md`](./types/branded/README.md) |
| Console depth | [`console-depth.ts`](./console-depth.ts) |
| Path (Bun) | [`path-bun.ts`](./path-bun.ts) |

## Spine (root modules — keep here)

| Module | Purpose |
|--------|---------|
| [`index.ts`](./index.ts) | Public barrel (`LIB_INFO`, `FW`) |
| [`path-bun.ts`](./path-bun.ts) | Bun-native path helpers (ratchet: no `node:path` in `lib/`) |
| [`console-depth.ts`](./console-depth.ts) | Inspect depth SSOT (`--console-depth` / `BUN_CONSOLE_DEPTH`) |
| [`projects-scan.ts`](./projects-scan.ts) | Projects inventory helpers for registry tooling |
| [`text.ts`](./text.ts) | Small text helpers |
| [`gate-map.ts`](./gate-map.ts) | Gate / proof path map helpers |
| [`gate-report-monorepo.ts`](./gate-report-monorepo.ts) | Monorepo gate reporting |
| [`bun-documentation-integration.ts`](./bun-documentation-integration.ts) | Bun docs integration surface (barrel export) |

## Domains

| Domain | Purpose | Entry hint |
|--------|---------|------------|
| [`ab-testing/`](./ab-testing/) | A/B and experiment helpers | `cookie-manager.ts` |
| [`ai/`](./ai/) | AI operations managers | `ai-operations-manager.ts` |
| [`business/`](./business/) | Business-domain pure helpers | `habits-pure.ts` |
| [`cli/`](./cli/) | CLI / ANSI dashboard helpers | `ansi-dashboard.ts` |
| [`constants/`](./constants/) | Shared constants barrel | `index.ts` |
| [`core/`](./core/) | Core types and infrastructure | `index.ts` |
| [`deployment/`](./deployment/) | Deployment metrics feeds | `metrics-feed.ts` |
| [`docs/`](./docs/) | Path SSOT, tokens, doc builders | `index.ts` · `repo-docs.ts` |
| [`env/`](./env/) | Runtime env helpers | `runtime.ts` |
| [`har-analyzer/`](./har-analyzer/) | HAR capture analysis | `index.ts` |
| [`harness/`](./harness/) | Harness proof paths | `proof.ts` |
| [`http/`](./http/) | Health endpoints and HTTP helpers | `index.ts` |
| [`mcp/`](./mcp/) | MCP client / bridge helpers | `bun-mcp-client.ts` |
| [`package/`](./package/) | Package manager graph helpers | `package-manager.ts` |
| [`performance/`](./performance/) | Benchmarks and recovery | `benchmark-recovery.ts` |
| [`pooling/`](./pooling/) | Pool / DataView metrics | `dataview-metrics.ts` |
| [`profile/`](./profile/) | Profile session upload | `index.ts` |
| [`r2/`](./r2/) | R2 storage and analytics | `r2-storage-enhanced.ts` |
| [`registry/`](./registry/) | Registry platform helpers | `index.ts` |
| [`rss/`](./rss/) | RSS managers | `rss-manager.ts` |
| [`security/`](./security/) | Secrets, R2 creds, security utils | `index.ts` · `r2-credentials.ts` |
| [`shared/`](./shared/) | Cross-cutting shared helpers | `dns-prefetch.ts` |
| [`theme/`](./theme/) | Colors / styled logging | `colors.ts` |
| [`types/`](./types/) | Branded IDs and shared types | `branded.ts` · [branded/README](./types/branded/README.md) |
| [`udp/`](./udp/) | UDP helpers | `index.ts` |
| [`utils/`](./utils/) | General utilities barrel | `index.ts` |
| [`validation/`](./validation/) | Validation systems | `automated-validation-system.ts` |
| [`wiki/`](./wiki/) | Wiki integration | `bun-wiki-integration.ts` |

## Legacy / low-traffic root (do not extend)

Leave on disk this pass — prefer domain APIs or retire in a dedicated pass.

| File | Note |
|------|------|
| `bun-cli-native-v3.15.ts` | Versioned CLI dump |
| `context-engine-v3.17.ts` | Versioned context engine |
| `context-run-server.ts` | Context run server experiment |
| `cookie-manager.ts` | Cookie helper (also mirrored under ab-testing) |
| `enhanced-watch-filter-v3.15.ts` | Versioned watch filter |
| `filter-runner.ts` · `filter-watch-logger.ts` | Filter tooling dumps |
| `prefetch-manager.ts` | Prefetch experiment |
| `variant-testing.ts` | Variant testing dump |
| `watch-engine-v3.14.ts` | Versioned watch engine |
| `secrets-management.cjs` | Legacy CJS secrets helper |
| `INTEGRATION_SUMMARY.md` | Stale note — prefer this README |
