# CI / deploy runbooks

Same maintenance shape as spine tenants (signal · intervention · proof · retirement), scoped to **CI envelopes and deploy scripts** — not scheduled by the spine daemon.

Catalog: [`lib/harness/ci-deploy.ts`](../../lib/harness/ci-deploy.ts)  
Discovery: [`lib/harness/discover-ci.ts`](../../lib/harness/discover-ci.ts)

## Why this exists

When `ci:core` or a deploy preflight fails, the signal, repair command, and proof should already be cataloged. Discovery fails closed if a new `ci:*` / `build:*` / `deploy:*` / `migrate:*` script or GHA workflow appears without a runbook or exemption.

## Tenants

| Id | Signal | Intervention |
|----|--------|--------------|
| `ci-core` | `ci:core` fails | `bun run ci:core` |
| `typescript-ci` | `type-check:ci` fails | `bun run type-check:ci` |
| `deploy-production` | deploy preflight / health fails | `bun run deploy:production` |
| `deploy-staging` | staging deploy fails | `bun run deploy:staging` |
| `bun-migrate` | `migrate:status` fails | `bun run migrate:status` |

Runbooks under [`tenants/`](tenants/).

**Id skew:** CiRunbook.id (`ci-core`) ≠ ProofPath id (`ci-core-envelope`). Link via `proofId`. Catalog paste is `bun run docs:ci-deploy` (`freshRerunKind: 'catalog'`); intervention is the live gate.

## Ratchet

```bash
bun run test:ci-deploy
bun run docs:ci-deploy
```

`assertCICoverage` is included from `bun run test:tenant-runbooks` via `test:ci-deploy`.

Claim: `ci-deploy-runbooks`.
