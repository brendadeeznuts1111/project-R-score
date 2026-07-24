# Channel meta-verification

**Proof** `channel-meta-verification-v1` (claim in `lib/harness/proof.ts`) ·
gate `continuous` / `ci:harness` (+ day-loop `check:release-tracker`)

Orthogonal lanes for Bun product pillars under a release **channel**:

| Suite | Artifact | Subsystem |
|-------|----------|-----------|
| `release` / `all` | `public/registry/release-features.json` | mixed (meta) |
| `bundler` | `public/registry/bundler-loaders-proof.json` | bundler |
| `networking` | `public/registry/networking-channel-proof.json` | networking |

Native networking proof (`networking-proof.json`) stays the optimization artifact; the channel suite bridges it to `VerificationResult` rows.

```bash
bun run verify:channel:all          # live suite=all (re-runs release + pillars)
bun run verify:channel:meta         # prefer-artifact merge → release-features.json
bun run verify:channel:bundler
bun run verify:channel:networking
bun run ops:snapshot                # refreshes channel meta unless --no-channel-meta
bun run harness:status              # discover claim
```

`verify:channel:meta` / `ops:snapshot` strip prior `runtime-nits:` / `bundler:` / `networking:` rows, then merge pillar artifacts — idempotent for Pages bake without a full release re-run. Live `suite=all --save` also writes the bake sidecar. **Release-only** saves (`suite=release` / `verify-bun-release --save`) invalidate the bake so ops cannot stay green on a drifted meta claim.

Bake sidecar: `public/registry/channel-meta-bake.json` (sources + rollup). Embedded in `ops-summary.json` / `static.json` as `channelMeta`; ops dashboard shows bake line on the release panel + snapshot health.

Consistency (taxonomy audit): bake.proofHash must match release-features; meta-prefixed rows must mirror nits / bundler-loaders / networking-channel pillars; docs-coverage reference counts mirror `tools/reference-index.json`; docs-coverage ok aligns with doc-index defaults coverage; registry-client pass aligns with install-env registry rows; audit row count matches contract registry (10). Stale bake → `channelMeta.stale` + dashboard badge.

Proof taxonomy sub-gate (`verify:proof-taxonomy`) audits **12 contracts** under this claim — including `docs-coverage-proof.json`, `registry-client-proof.json`, `doc-index.json`, `cloudflare-token-scope-proof.json`, and `public/.well-known/mcp.json` — without a separate ProofPath.

Ops UI: `/portal/ops/` (Pages: `project-r-score.pages.dev/portal/ops/`). Portal JSDoc: `public/portal/portal-types.d.ts`.
