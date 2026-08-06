---
name: project-r-ops-management
description: Operate and recover Project R with deterministic governance, Bun runtime/type channel monitoring, TypeScript monorepo health, security, release hygiene, and benchmark gates. Use for production readiness, CI blockers, Bun release or type drift, scheduled channel checks, branch/release hygiene, dependency hardening, TypeScript instability, dashboard/search drift, or emergency recovery.
---

# Project R Ops Management

## Operating order

1. Start global-first with `dx context`, `dx version`, and `dx package`.
2. Run `bun run lane:status`; preserve other lanes and the shared index.
3. Select the smallest workflow below that owns the failure.
4. Run its focused proof before the staged hook and merge proof.
5. Never weaken a gate or mutate versions from a monitoring command.

## Bun channel and type governance

Read [`docs/design/bun-channel-governance.md`](../../../docs/design/bun-channel-governance.md)
and [`config/bun-channels.toml`](../../../config/bun-channels.toml) before changing
the Bun runtime, `@types/bun`, `bun-types`, release feeds, or cron schedule.

- Production runtime follows the configured stable channel.
- `@types/bun` and direct `bun-types` each follow their configured npm channel;
  they are not required to share a version.
- Run `bun run bun:channel:check` for a read-only live/local comparison.
- Run `bun run bun:channel:report` only when a refreshed derived artifact is
  intended.
- Register or remove the OS job only with the explicit
  `bun:channel:cron:*` commands. OS cron uses system-local time; the in-process
  contract on Bun 1.3.14 is UTC.
- The doctor must never call `bun upgrade`, install packages, edit manifests,
  or rewrite the lockfile. Promotion belongs to a reviewed worktree lane.

For a promotion, update only the intended runtime/type pins, refresh the
lockfile, rerun the channel doctor, then prove `type-check:ci` and the focused
channel tests. Record source outages separately from actionable version drift.

## TypeScript monorepo health

1. Run `bun run type-check:ci`, then `bun run type-check:full` when shared build
   typing changed.
2. Scope a failure with the owning package `tsconfig.json` before changing root
   configuration.
3. Prefer project references and package checks over broad ambient expansion.
4. Avoid application-level `declare global namespace Bun`; use selected
   `bun-types` and local structural adapters at real compatibility boundaries.
5. Rerun the smallest failing cluster after each patch.

## Dependency and security

1. Run `bun run security:guard:deps`.
2. Run `bun run security:audit`.
3. Remove blocked dependencies/imports from the smallest owning scope.
4. Run `bun run security:ci`.

## Search governance and emergency recovery

For normal drift, run policy, strict status, and benchmark gates from
[`references/command-map.md`](references/command-map.md). Promote a benchmark
baseline only with explicit approval and a policy-changelog entry.

For emergency recovery, capture branch, SHA, objective, and failing output with
[`references/incident-template.md`](references/incident-template.md), then run
`bun run search:preflight:emergency` and clear the first failing owned gate.

## Domain, concept, shape, and surface

Read [`docs/DOMAIN_CONCEPT_SHAPE.md`](../../../docs/DOMAIN_CONCEPT_SHAPE.md)
before changing domain vocabulary, parsed contracts, registry artifacts, or
portal boards. Resolve business ownership, stable concept identity, parsed
shape, then consuming surface. Theme roles present meaning; they do not define
domain state.

For the partner MVP, follow
[`docs/design/partner-dashboard-mvp.toml`](../../../docs/design/partner-dashboard-mvp.toml)
and keep partner contract, connector, projection, surface, and runtime-governance
lanes disjoint.

## Branch, test, and release hygiene

- Keep commits rollback-safe and use explicit pathspecs when another lane can
  churn the index. Never stage unrelated dirty files or generated bakes.
- Prefer repository test scripts. Plain `bun test` is the single-process mode;
  do not translate Node-only `--runInBand`, `t.workerId`, or
  `NODE_TEST_WORKER_ID` recipes. Bun's documented parallel-worker variables are
  `JEST_WORKER_ID` and `BUN_TEST_WORKER_ID`.
- Server tests use `port: 0` and deterministic cleanup. Record Bun version and
  revision for leaked-handle or runtime regressions.
- Run focused proof, `.husky/pre-commit`, then `bun run bun:ci` before merge.
- Use the real release proof in `references/command-map.md`; hosted checks are
  supporting evidence, not merge authority.

Shared staged-gate and skill-loop mechanics:
[`../references/agent-tooling.md`](../references/agent-tooling.md).

## Command authority

Use [`references/command-map.md`](references/command-map.md) for runnable command
bundles. If a referenced command is absent from `package.json`, stop and repair
the SSOT instead of substituting an undocumented command.
