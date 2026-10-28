---
name: project-r-ops-management
description: >
  Operate Project R runtime channels, CI gates, TypeScript health, security,
  structured-data capability proof, release hygiene, and recovery. Use for
  readiness checks, CI failures, Bun drift, XML/JSON5/JSONL operations, branch
  hygiene, dependency hardening, or emergency recovery.
---

# Project R Ops Management

## Start

1. Run `bun --version`, `bun --revision`, and `bun run bun:channel:check`.
2. Run `bun run agents:contract:check -- --installed` to prove the installed
   Project R skill packages match repository authority.
3. Run `bun run lane:status` and preserve every other worktree and index.
4. Select the smallest owned proof in the
   [command map](references/command-map.md).
5. Fix the first owned failure; never weaken a gate to make it green.
6. Finish with the staged hook and clean local merge proof.

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

## Structured-data capability operations

Use the [`structured-data-runbook.md`](references/structured-data-runbook.md)
for the operation matrix, JSONL completeness protocol, XML shape/security
boundary, evidence model, promotion state machine, and rollback procedure.

- Treat [`data-format-lab.json`](../../../config/data-format-lab.json) as the
  format manifest and `bun run data-formats:check` as its read-only proof. Use
  `bun run data-formats:bake` only for an intentional artifact refresh.
- Gate each format by the active `bun --version`, `bun --revision`, API object,
  and required operations. A documentation page does not promote the runtime. In
  particular, `Bun.XML` requires Bun 1.4 or later and remains `runtime-gated` on
  Project R's pinned Bun 1.3.14.
- Prove behavior, not namespace presence. JSON5 requires positive parse,
  stringify, semantic parse/stringify/reparse equivalence, and malformed-input
  rejection. XML requires the same operations after its runtime gate passes;
  keep fixtures bounded, text-only, and free of DOCTYPE or entity declarations.
- JSONL is asymmetric: prove complete-input `parse` and incremental
  `parseChunk`. Invalid complete input may throw; `parseChunk` reports failures
  in its `error` result. Preserve `read`, `done`, and the unconsumed remainder
  when testing streaming behavior; do not invent a JSONL stringify contract.
- Record bounded output metadata and hashes, not raw fixture results. Measure
  operation duration with monotonic `Bun.nanoseconds()` as `durationNs`; derive
  display-only `durationMs` by dividing by `1_000_000`. Never label a raw
  nanosecond value as milliseconds.
- Exposure is fail-closed: `off` disables the surface, `preview` may report
  gated capabilities, and `enabled` requires all operations, negative proofs,
  round trips where applicable, and live Cloudflare Access proof. Keep the
  static lab and artifact routes protected, including unprotected aliases.

## Bun enhancement lifecycle

For feature flags, guarded Bun-native replacements, or the public experiment
inventory, read
[`bun-enhancement-pipeline.md`](../../../docs/design/bun-enhancement-pipeline.md)
and run `bun run enhancements -- check`. Treat runtime availability, Project R
lifecycle, and current enablement as separate facts. An environment override
cannot enable a proposal or an incompatible runtime. Use
`/.well-known/experiments` as the agent-facing discovery surface; do not invent
or mutate a `desk.json` contract that this repository does not own.

Runtime targets in that inventory are compatibility observations, not upgrade
authority. Test canaries through an explicit temporary binary, preserve the
stable pin, and stop promotion on a worker panic even when focused contracts
pass. Keep npm SHA-256 SRI and Project R SHA3-256 verification metadata as
separate declared algorithms. Compare gzip and source-map behavior with
`bun run bench:bun-upgrade`; its raw clock is nanoseconds and milliseconds are
derived display values only.

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
