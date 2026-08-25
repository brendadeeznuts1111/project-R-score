---
name: project-r-ops-management
description: >
  Operate Project R runtime channels, CI gates, TypeScript health, security,
  release hygiene, and recovery. Use for readiness checks, CI failures, Bun
  drift, branch hygiene, dependency hardening, or emergency recovery.
---

# Project R Ops Management

## Start

1. Run `bun --version`, `bun --revision`, and `bun run bun:channel:check`.
2. Run `bun run lane:status` and preserve every other worktree and index.
3. Select the smallest owned proof in the
   [command map](references/command-map.md).
4. Fix the first owned failure; never weaken a gate to make it green.
5. Finish with the staged hook and clean local merge proof.

## Ownership boundaries

- Runtime and type channels: read
  [`config/bun-channels.toml`](../../../config/bun-channels.toml) and
  [`bun-channel-governance.md`](../../../docs/design/bun-channel-governance.md).
  Monitoring is read-only; promotion is a separate reviewed change.
- Bun API documentation and release history: read
  [`BUN_DOCS_OPERATE.md`](../../../docs/BUN_DOCS_OPERATE.md). Resolve unfamiliar
  APIs with `bun tools/bun-doc-refs.ts suggest "<api>"`; never infer an API date
  from the active runtime, a nearby minor release, `verifiedOn`, or
  `lastUpdated`. Recorded release and update events require the exact official
  version, publication timestamp, and URL, proved by the provenance commands in
  the command map.
- Bun 1.4 assets, capabilities, feeds, and release snapshots: read
  [`BUN_1_4_MIGRATION.md`](../../../docs/BUN_1_4_MIGRATION.md) and
  [`BUN_1_4_CHANNEL_LIFECYCLE.md`](../../../docs/BUN_1_4_CHANNEL_LIFECYCLE.md).
  Only the breaking-change tracker's **Merged** section is a Bun 1.4 behavior
  source; **Under consideration** did not ship. Treat registry presence as
  release-note coverage, not adoption. Only `integrated` and `contract` records
  may claim executable `contractFiles`; `candidate` and `upstream-claim` records
  must not. Keep rights-pending media external and verify item channel IDs
  against the declared snapshot channels.
- Bun-native scaffold and config work: read
  [`bun-create-alignment.md`](../../../docs/design/bun-create-alignment.md) and
  [`UNIFIED.md`](../../../docs/UNIFIED.md). Bun owns `bun create`, `bun init`,
  `bunfig.toml`, and `bun.lock` behavior; `harness.toml` is a Factory-owned
  closed contract that must not be presented as a Bun schema.
- Domain and UI work: follow
  [`DOMAIN_CONCEPT_SHAPE.md`](../../../docs/DOMAIN_CONCEPT_SHAPE.md). For
  partners, use
  [`partner-dashboard-mvp.toml`](../../../docs/design/partner-dashboard-mvp.toml)
  and keep contracts, connectors, projections, surfaces, and runtime policy
  separate.
- Search recovery: use the command map and
  [`incident-template.md`](references/incident-template.md). Baseline promotion
  requires explicit approval and policy-changelog evidence.
- Shared commit and loop mechanics live in
  [`agent-tooling.md`](../references/agent-tooling.md).

## Test and CI rules

- Repository scripts own runnable commands; machine-wide doctors do not replace
  Project R gates.
- For Factory templates, prove source preflight, materialized output, a fresh
  install, and the release route. Require `bun.lock` existence and schema before
  using `bun install --frozen-lockfile --dry-run --ignore-scripts` as the
  package-to-lock coherence authority; the native dry run alone does not prove
  that a lock artifact exists.
- Keep the standalone template's initial `frozenLockfile = false` bootstrap
  separate from Project R's hardened root setting. Release and publish must
  override the bootstrap through the owned lockfile check. Do not add app-only
  bunfig sections to a library template without an exercised consumer.
- Use focused file tests while editing, `bun run test:watch` for the
  changed-file loop, `.husky/pre-commit` for staged proof, and `bun run bun:ci`
  on a clean worktree before merge.
- When Bun docs, API history, feed, overlay, scrape-state, or catalog files
  move, run the exact provenance proof. Repair malformed persisted artifacts or
  use the documented `scrape --force` rebuild; do not weaken fail-closed parsing
  or manufacture missing release history.
- Use `bun run test:snapshots` to verify the full registered snapshot catalog.
  Update one owned suite with
  `bun tools/bun-test-snapshots.ts --update --id <id>` and review the snapshot
  diff before staging.
- `--parallel[=N]` already implies file isolation. Use `--concurrent` only for
  in-file concurrency and `--shard=M/N` only for deliberate CI fan-out.
- Do not translate `--runInBand`, `t.workerId`, or `NODE_TEST_WORKER_ID` into
  `bun:test`. Server tests use `port: 0` and deterministic cleanup.

## Recovery and release

- Keep commits rollback-safe and stage explicit paths when another lane can
  churn the index.
- Run the smallest type, security, channel, or search proof after every patch.
- Hosted checks are supporting signals. The clean local `bun run bun:ci` result
  is merge authority.
- When full CI fails only on stale external bakes or a concurrency flake, rerun
  the exact failing test, record the owning artifact and repair command, and
  keep the unrelated failure visible. Do not rebake a credential-backed artifact
  or weaken freshness without its owning authority.
- If a command in the command map is absent from `package.json`, repair the
  SSOT; do not invent a substitute.
