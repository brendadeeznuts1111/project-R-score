---
name: reference-discovery
description: >
  Discover stale references, naming and environment drift, broken skill links,
  registry paths, and portal static anti-patterns. Use for harness-perimeter or
  public-plane cleanup before executing an audit gap closure.
---

# Reference discovery

Run deterministic discovery, classify the owning plane, repair its source of
truth, and re-run the composed check. Discovery reports evidence; it does not
close audit rows by itself. Use `bun run ai -- discover` to locate this skill;
once selected, the executable modes below own the evidence. Do not grow this
skill into a repository-wide router.

## Choose a mode

| Mode     | Scope                                                                              | Entry point                                     |
| -------- | ---------------------------------------------------------------------------------- | ----------------------------------------------- |
| Harness  | `lib/`, `tools/`, `docs/`, `config/`, `functions/`, `scripts/`, tests, skill links | `bun tools/reference-discovery.ts --json`       |
| Public   | `public/portal/`, `public/registry/`, `public/monitoring/`, lander shells          | `bun tools/public-discovery.ts --json`          |
| Composed | Both planes, with shared severity handling                                         | `bun tools/reference-discovery.ts --all --json` |

## Workflow

1. Run the narrowest applicable mode and save JSON under `/tmp` when evidence
   needs review.
2. Fix `error` findings first, then warnings. Naming clusters and orphan
   artifacts are informational unless the task explicitly owns cleanup.
3. Repair the owning source:
   - Registry/npm plane: `factoryWagerRegistryUrlFromEnv()` and
     [`docs/registry-client.md`](../../../docs/registry-client.md).
   - Pages routing: `resolveRoutingProbeBaseUrl()` and `config/r2-env.ts`.
   - Portal chrome:
     [`docs/portal-foundation.md`](../../../docs/portal-foundation.md) and
     `bun tools/portal-apply-chrome.ts`.
   - Registry bake: `bun run ops:snapshot --no-routing`.
4. Re-run the composed proof, then hand verified findings to `audit-gap-close`
   when a gap-map row must be closed.

```bash
bun run reference:discover:check
bun run public:discover:check
bun run discover:compose:check
bun run verify:portal:static
bun run check:routes
bun tools/doc-map-check.ts
bun tools/bun-doc-refs.ts integrity
```

## Finding ownership

| Finding                                                                    | Owner                 |
| -------------------------------------------------------------------------- | --------------------- |
| `plane-mismatch`, `similar-env`, `unused-canonical`                        | harness mode          |
| `broken-registry-ref`, `portal-chrome-missing`, `portal-inline-health`     | public mode           |
| `portal-process-env`, `portal-typescript-leak`, `orphan-registry-artifact` | public mode           |
| `skill-broken-link`, `legacy-domain`, `naming-cluster`                     | mode where discovered |

For syntax-shaped code overlap, use ast-grep after discovery narrows the path.
Do not scan or rewrite `projects/active/**` through this skill.

Runbooks:
[reference discovery](../../../docs/harness/tenants/reference-discovery.md) and
[public plane](../../../docs/harness/tenants/public-plane.md). Shared mechanics:
[agent tooling](../references/agent-tooling.md).
