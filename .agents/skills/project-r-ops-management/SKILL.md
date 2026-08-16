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
- If a command in the command map is absent from `package.json`, repair the
  SSOT; do not invent a substitute.
