# FactoryWager Library

Shared harness under `lib/`. Barrel: [`index.ts`](./index.ts) (`LIB_INFO`,
`FW`).

Inventory SSOT for agents — **indexes, no moves**. Domain folders stay where
they are; spine modules stay at `lib/<name>.ts`.

## Root contract

| Surface                              | Required                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------ |
| This file                            | Domain + spine map (complete vs tree)                                    |
| Every first-level `lib/*/` directory | `README.md` index                                                        |
| Spine modules                        | Stay at documented root paths (do not relocate without import migration) |

```bash
bun run lib:domains:check          # domain README indexes (∥ cheap / pre-commit on lib/)
bun run check:path-bun && bun run check:bun-env
bun tools/doc-map-check.ts
bun tools/harness-violations.ts --path lib/types --rule unknown
```

## Canonical docs

| Role                                      | Path                                                                                                        |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Path SSOT                                 | [`docs/repo-docs.ts`](./docs/repo-docs.ts)                                                                  |
| Docs index                                | [`../docs/README.md`](../docs/README.md)                                                                    |
| Standards                                 | [`.custom-instructions.md`](../.custom-instructions.md)                                                     |
| Agents                                    | [`../AGENTS.md`](../AGENTS.md)                                                                              |
| Install                                   | [`../docs/UNIFIED.md`](../docs/UNIFIED.md)                                                                  |
| Wire                                      | [`../docs/WIRE_BOUNDARY.md`](../docs/WIRE_BOUNDARY.md)                                                      |
| Brands                                    | [`types/branded/README.md`](./types/branded/README.md)                                                      |
| Bun native capabilities                   | [`../docs/BUN_NATIVE_CAPABILITIES.md`](../docs/BUN_NATIVE_CAPABILITIES.md)                                  |
| Console depth                             | [`console-depth.ts`](./console-depth.ts) · note [`console-depth.md`](./console-depth.md)                    |
| Bun runtime hub (CLI · depth · utilities) | [`bun-runtime.md`](./bun-runtime.md) · flags [`../config/runtime-flags.json`](../config/runtime-flags.json) |
| Terminal / PTY                            | [`terminal.ts`](./terminal.ts)                                                                              |
| Deep equals                               | [`deep-equals.ts`](./deep-equals.ts)                                                                        |
| Peek settle                               | [`peek-settle.ts`](./peek-settle.ts)                                                                        |
| Time / UUID v7                            | [`time.ts`](./time.ts)                                                                                      |
| Image metadata                            | [`image-metadata.ts`](./image-metadata.ts)                                                                  |
| Screenshot TEST-003                       | [`screenshot-remediation.ts`](./screenshot-remediation.ts)                                                  |
| Path (Bun)                                | [`path-bun.ts`](./path-bun.ts)                                                                              |
| FS helpers (scripts plane)                | [`../scripts/lib/fs-bun.ts`](../scripts/lib/fs-bun.ts) re-exports path-bun                                  |

## Spine (root modules — keep here)

Every `lib/*.ts` module is listed. Grouped for scan; paths stay flat under
`lib/`.

### Barrel · path · runtime control

| Module                                       | Purpose                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------- |
| [`index.ts`](./index.ts)                     | Public barrel (`LIB_INFO`, `FW`)                                                |
| [`path-bun.ts`](./path-bun.ts)               | Bun-native path helpers (ratchet: no `node:path` in `lib/`)                     |
| [`bun-fs-utils.ts`](./bun-fs-utils.ts)       | Sync `ensureDirSync` / `ensureParentDirSync` (peek + `Bun.write`; no `node:fs`) |
| [`bun-path-url.ts`](./bun-path-url.ts)       | `Bun.fileURLToPath` / `pathToFileURL` (prefer over `node:url`)                  |
| [`bun-executable.ts`](./bun-executable.ts)   | Absolute `bun` argv0 via `Bun.which` · entrypoint · version fingerprint         |
| [`bun-runtime-env.ts`](./bun-runtime-env.ts) | Typed assessment of Bun/runtime control-plane env keys                          |
| [`env-check.ts`](./env-check.ts)             | Secret-safe env checklist (set / missing / placeholder only)                    |
| [`text.ts`](./text.ts)                       | Small shared text helpers                                                       |
| [`retry.ts`](./retry.ts)                     | Exponential backoff for network / proof operations                              |
| [`repository.ts`](./repository.ts)           | Re-export of `ScopedRepository` / `Scope` (import-path fix)                     |

### Bun API wrappers · output · media

| Module                                                     | Purpose                                                                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [`console-depth.ts`](./console-depth.ts)                   | Inspect depth SSOT · hub [`bun-runtime.md`](./bun-runtime.md) · note [`console-depth.md`](./console-depth.md) |
| [`console-format-scan.ts`](./console-format-scan.ts)       | Console-format ratchet scanner (patterns + repo scan)                                                         |
| [`table-format.ts`](./table-format.ts)                     | Rich ANSI terminal tables (`Bun.stringWidth` / color)                                                         |
| [`terminal.ts`](./terminal.ts)                             | `Bun.Terminal` PTY helpers (`spawnWithTerminal`)                                                              |
| [`deep-equals.ts`](./deep-equals.ts)                       | `Bun.deepEquals` · strict · changed-index                                                                     |
| [`peek-settle.ts`](./peek-settle.ts)                       | `Bun.peek` · `awaitSettled` · `awaitAllSettled` · `peekIfSettled`                                             |
| [`time.ts`](./time.ts)                                     | `Bun.nanoseconds` · `sleep`/`sleepSync` · `randomUUIDv7`                                                      |
| [`escape-html.ts`](./escape-html.ts)                       | `Bun.escapeHTML` wrapper                                                                                      |
| [`bytes-base64.ts`](./bytes-base64.ts)                     | `Uint8Array` base64 / base64url / hex (no `btoa`/`atob`)                                                      |
| [`toml-stringify.ts`](./toml-stringify.ts)                 | TOML write via Bun when available; 1.3.14-safe fallback                                                       |
| [`image-metadata.ts`](./image-metadata.ts)                 | `Bun.Image.metadata` evidence helpers                                                                         |
| [`screenshot-remediation.ts`](./screenshot-remediation.ts) | TEST-003 screenshot metadata remediation                                                                      |

### Proof · discovery · registry bake

| Module                                                 | Purpose                                                           |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| [`bun-api-proof.ts`](./bun-api-proof.ts)               | Proof hash for Bun API / ops one-liner demos                      |
| [`bun-utils-proof.ts`](./bun-utils-proof.ts)           | Core-utils behavioral proof (stringWidth · deepEquals · inspect)  |
| [`routing-proof.ts`](./routing-proof.ts)               | Registry / portal routing proof (probes · latency · SHA-256)      |
| [`registry-snapshot.ts`](./registry-snapshot.ts)       | Production registry snapshot orchestrator                         |
| [`registry-tags.ts`](./registry-tags.ts)               | Registry dist-tags / snapshot lifecycle writes                    |
| [`reference-discovery.ts`](./reference-discovery.ts)   | Harness perimeter discovery (unused paths · plane mismatch)       |
| [`public-discovery.ts`](./public-discovery.ts)         | Public-plane discovery (portal · registry · static anti-patterns) |
| [`discovery-compose.ts`](./discovery-compose.ts)       | Compose harness + public discovery reports                        |
| [`portal-static-checks.ts`](./portal-static-checks.ts) | Shared portal static anti-patterns (verify-portal SSOT)           |
| [`projects-scan.ts`](./projects-scan.ts)               | Projects inventory helpers for registry tooling                   |
| [`gate-map.ts`](./gate-map.ts)                         | `gate-map.json` loader / validator / project resolution           |
| [`gate-report-monorepo.ts`](./gate-report-monorepo.ts) | Monorepo gate report (HTML / JSON aggregation)                    |
| [`failure-report.ts`](./failure-report.ts)             | JUnit → portal failure report + per-failure replay                |
| [`agent-skills-paths.ts`](./agent-skills-paths.ts)     | Repo-local `.agents/skills` path constants                        |

### GitHub identity · issue taxonomy

| Module                                                                           | Purpose                                                   |
| -------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [`github-repository-ref.ts`](./github-repository-ref.ts)                         | Runtime owner/name/host/remote resolve (not `REPO_URL`)   |
| [`github-issue-taxonomy-public.ts`](./github-issue-taxonomy-public.ts)           | Public projection of repo-owned issue taxonomy → registry |
| [`github-issue-taxonomy-public-wire.ts`](./github-issue-taxonomy-public-wire.ts) | Wire verify for public taxonomy artifact                  |
| [`github-issue-taxonomy-wire.ts`](./github-issue-taxonomy-wire.ts)               | Parse-once boundary for `factorywager.issue-spine.v1`     |
| [`github-issue-tooling-wire.ts`](./github-issue-tooling-wire.ts)                 | GitHub provider issue JSON → interior spine               |
| [`github-issue-tooling.ts`](./github-issue-tooling.ts)                           | Issue audit + label-sync planning                         |

### Ops product (root-level modules)

| Module                                               | Purpose                                           |
| ---------------------------------------------------- | ------------------------------------------------- |
| [`account-limits-repo.ts`](./account-limits-repo.ts) | Account limit history + raise detection (SQLite)  |
| [`zip-enrichment-repo.ts`](./zip-enrichment-repo.ts) | ZIP-cluster stats over play enrichment / analysis |

## Domains

Every first-level `lib/*/` directory (alphabetical). Each row requires a local
`README.md` (`bun run lib:domains:check`).

| Domain                                       | Purpose                                                                    | Entry hint                                                 |
| -------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [`accounts/`](./accounts/)                   | Tree-node partners / agents / sub-agents (growth, promotion, play routing) | `accounts.ts` · `account-types.ts`                         |
| [`ai/`](./ai/)                               | AI operations managers                                                     | `ai-operations-manager.ts`                                 |
| [`audit/`](./audit/)                         | Audit findings sibling SSOT (not BunToken)                                 | `audit-finding.ts` · `index.ts`                            |
| [`auth/`](./auth/)                           | Edge-safe auth contracts for Bun-only Pages handlers                       | `session.ts` · `oidc.ts`                                   |
| [`automation/`](./automation/)               | Automated partner account management (Bun-native)                          | `provision-accounts.ts`                                    |
| [`bookmakers/`](./bookmakers/)               | Bookmaker catalog v0.4 contracts + v0.3 migration                          | `v04-types.ts` · `merge.ts`                                |
| [`channels/`](./channels/)                   | Ops messaging: R2 append log + SQLite outbox projectors                    | `channels.ts` · `outbox.ts`                                |
| [`concept-registry/`](./concept-registry/)   | Persistent versioned glossary concept store                                | `schema.ts` · `repo.ts`                                    |
| [`constants/`](./constants/)                 | Shared constants barrel                                                    | `index.ts`                                                 |
| [`core/`](./core/)                           | Core types and infrastructure                                              | `index.ts`                                                 |
| [`db/`](./db/)                               | Database connection helpers (SQLite / ops DB)                              | `connection.ts`                                            |
| [`docs/`](./docs/)                           | Path SSOT, tokens, doc builders, Bun brand usages                          | `index.ts` · `repo-docs.ts`                                |
| [`doctor/`](./doctor/)                       | Doctor-state bake helpers for `portal-cli doctor`                          | domain README · `install/` policy                          |
| [`dod/`](./dod/)                             | Agent image proof pipeline (verify, watermark, evidence)                   | `evidence.ts` · `verifier.ts`                              |
| [`experiments/`](./experiments/)             | Multi-factor partner-policy experiment engine                              | `engine.ts` · `design.ts`                                  |
| [`factory/`](./factory/)                     | Internal registry client, CLI, artifact scaffolding                        | `artifact.ts` · `registry.ts`                              |
| [`glossary/`](./glossary/)                   | Glossary utilities beside portal / Kalshi SSOT bakes                       | `tournament-snap.ts`                                       |
| [`harness/`](./harness/)                     | Harness proof paths, monorepo health, CI discovery                         | `proof.ts` · `monorepo-health.ts`                          |
| [`http/`](./http/)                           | `Bun.serve` / fetch / portal / static HTTP surfaces                        | `bun-server.ts` · `fetch-headers.ts`                       |
| [`identity/`](./identity/)                   | Auth layer (lockout, MFA, geo, WebAuthn, JIT)                              | `identity.ts` · `lockout.ts`                               |
| [`images/`](./images/)                       | `Bun.Image` helpers for Tennis HQ / portal                                 | `avatar-response.ts`                                       |
| [`install/`](./install/)                     | Machine bunfig / install policy (code SSOT)                                | `machine-bunfig-policy.ts`                                 |
| [`macros/`](./macros/)                       | Bundle-time Bun macros (git commit · repo parts)                           | `git-commit.ts` · `github-repository.ts`                   |
| [`mcp/`](./mcp/)                             | MCP / domain helpers                                                       | `stdio-jsonrpc.ts`                                         |
| [`monitoring/`](./monitoring/)               | Registry + ops health dashboard slices                                     | `collect.ts` · `page.ts`                                   |
| [`net/`](./net/)                             | Network helpers (HTTPS proxy CONNECT reuse)                                | `proxy.ts`                                                 |
| [`operations/`](./operations/)               | Ops tree, limits, scrapers, compliance HTTP                                | domain README · `limits/`                                  |
| [`operator-research/`](./operator-research/) | Bookmaker research, odds, edge engine                                      | `edge-engine.ts` · `index.ts`                              |
| [`package/`](./package/)                     | Package manager graph helpers                                              | `package-manager.ts`                                       |
| [`pages/`](./pages/)                         | Cloudflare Pages / Bun-only function helpers (edge-safe)                   | `pages-function.ts` · `r2-types.ts`                        |
| [`partner-profile/`](./partner-profile/)     | Canonical partner record, ledger, settlement                               | `schema.ts` · `ledger.ts`                                  |
| [`performance/`](./performance/)             | Cache / shallow memory estimates (`bun:jsc`)                               | `cache-manager.ts` · `memory-estimate.ts`                  |
| [`portal/`](./portal/)                       | Portal-facing SSOTs (no barrel — import modules directly)                  | domain README                                              |
| [`prediction/`](./prediction/)               | Coverage prediction backtests and accuracy rollups                         | domain README                                              |
| [`provisioning/`](./provisioning/)           | Provisioning queue + sandboxed WebView signup                              | `queue.ts` · `run-automated.ts`                            |
| [`r2/`](./r2/)                               | R2 storage and analytics                                                   | `r2-storage-enhanced.ts`                                   |
| [`registry/`](./registry/)                   | Public artifact contracts and bake validators                              | `contracts.ts` · `bake-manifest.ts`                        |
| [`research/`](./research/)                   | Partner market / limit crawlers and snapshot store                         | domain README                                              |
| [`routing/`](./routing/)                     | HTTP/route helpers for portal and edge                                     | `loader.ts`                                                |
| [`rss/`](./rss/)                             | RSS managers                                                               | `rss-manager.ts`                                           |
| [`security/`](./security/)                   | Secrets, R2 creds, vault health, hash wrappers                             | `index.ts` · `r2-credentials.ts`                           |
| [`shared/`](./shared/)                       | Cross-cutting shared helpers                                               | `tools/`                                                   |
| [`surfaces/`](./surfaces/)                   | Public edge surface inventory (hosts · shortcodes)                         | `inventory.ts` · `doctor-check.ts`                         |
| [`telegram/`](./telegram/)                   | Factory Telegram bots, handshakes, partner ops colors                      | domain README · `ops-bot` surface                          |
| [`tennis/`](./tennis/)                       | Portal tennis desk (metrics, avatars, live)                                | domain README                                              |
| [`theme/`](./theme/)                         | Colors / styled logging                                                    | `colors.ts`                                                |
| [`toc-ops/`](./toc-ops/)                     | TOC Ops Drum / Buffer / Rope fixture surface                               | domain README · `types.ts`                                 |
| [`types/`](./types/)                         | Branded IDs and shared types                                               | `branded.ts` · [branded/README](./types/branded/README.md) |
| [`utils/`](./utils/)                         | General utilities barrel                                                   | `index.ts`                                                 |
| [`venues/`](./venues/)                       | Market venue brand identity (desk badges)                                  | `venue-brand.ts`                                           |
| [`verification/`](./verification/)           | Install-env / bundler / runtime channel probes                             | domain README                                              |
