# FactoryWager harness index (JIT)

Hold the model fixed; improve **context + tools**. Upstream: [lopopolo/harness-engineering](https://github.com/lopopolo/harness-engineering) (transform ideas into our owners — do not clone their tree). Prefer **artifact** over “codebase.”

When a decision is unresolved, read **one** owner below — do not load the full standards stack.

Markdown format does not change enforcement. Hard gates stay: lint (**error** + `--max-warnings 0`), `tsconfig.check.json` / brand types, proof journeys. Each invariant below names its ratchet.

### Contract docs format (settled)

Orthogonal to gates: prose is a terminal-readable routing layer; evidence lives in tests / type-check / `proof.ts`.

- Bold keys, plain values, sub-bullets for ratchets (no tables — they fight `Bun.markdown.ansi`)
- One `docs/harness/<name>.md` + one `bun run docs:<name>` per contract (e.g. `docs:cron`)
- No live-injection into the SSOT; live status stays `harness:status`

## When unresolved → read

- Domain `*Id` / bare string IDs → [`lib/types/branded/README.md`](../../lib/types/branded/README.md) · skill `.agents/skills/branded-ids/`
- `unknown` / decode / wire vs interior → [`docs/WIRE_BOUNDARY.md`](../WIRE_BOUNDARY.md)
- Bun API usage / `@see` refs → `bun tools/bun-doc-refs.ts suggest "<api>"` · [`docs/BUN_NATIVE_CAPABILITIES.md`](../BUN_NATIVE_CAPABILITIES.md)
- Install / bunfig / machine Bun → [`docs/UNIFIED.md`](../UNIFIED.md)
- Day loop / affected / type-check honesty → [`docs/organization/VELOCITY_BASELINE.md`](../organization/VELOCITY_BASELINE.md)
- Claim vs evidence (“done?”) → [`PROOF.md`](PROOF.md) · lib docs/Bun/other map → [Lib surface](PROOF.md#lib-surface--docs-vs-bun-vs-other-external) · `bun run proof:install`
- **New claim?** → fill out [`CLAIM-DISCOVERY.md`](CLAIM-DISCOVERY.md) · `bun run docs:claim-discovery`
- Repository review (9 trajectory questions) → [`REVIEW.md`](REVIEW.md)
- Repeat failure → earliest owner → [`FEEDBACK.md`](FEEDBACK.md)
- Lanes / push / credentials / irreversible ops → [`AUTHORITY.md`](AUTHORITY.md)
- Read this index in-terminal (zero-overhead) → `bun ./docs/harness/README.md` · `bun run docs:harness`
- Discover day-loop + ratchet status (live) → `bun run harness:status` (local ratchets + timings SSOT · `ansiMarkdown`) · `--table` · `--show-actions-noise`
- Bun.cron (OS-persistent primary · in-process complement) → `bun run docs:cron` · [`cron.md`](cron.md) · `bun run test:cron` · `bun run test:cron-os`
- Spine multi-tenant (docs-integrity + install-verify) → `bun run spine:schedule:once` · claim `spine-multi-tenant` · [`cron.md`](cron.md)
- Spine maintenance runbooks (typed signal · intervention · proof · retirement) → `bun run test:tenant-runbooks` · [`spine-tenants.md`](spine-tenants.md) · claim `spine-maintenance-runbooks` · agent-operated discovery tenants (reference · public-plane) indexed there
- Spine tenant E2E heal (sandboxed break → signal → intervene → recover) → `bun run test:tenant-heal` · claim `spine-tenant-heal`
- Code quality tenants (types · coverage · orphans · complexity) → `bun run test:code-quality` · [`code-quality.md`](code-quality.md)
- Bun harness control plane (`noOrphans`, freshRerun timeout, `--smol`, stdin vs `bun run -`) → [`docs/BUN_NATIVE_CAPABILITIES.md`](../BUN_NATIVE_CAPABILITIES.md#harness-control-plane) · workspace `bunfig.toml` `[run]`
- CI / deploy runbooks → `bun run test:ci-deploy` · [`ci-deploy.md`](ci-deploy.md) · claim `ci-deploy-runbooks`
- Cloudflare / R2 / Pages (`project-r-score`) → `bun run cloudflare:env` · [`config/r2-env.ts`](../../config/r2-env.ts) · [`tenants/cloudflare-pages.md`](tenants/cloudflare-pages.md) · claim `cloudflare-pages-env-ssot` · `bun test tests/r2-env.test.ts`
- Install-verify WebView journey (`install-verify-journey`) → `bun run docs:install-verify` · [`install-verify.md`](install-verify.md) · `bun run test:install-verify`
- Search governance WebView journey (`search-governance-basic`) → `bun run docs:search-governance` · [`search-governance.md`](search-governance.md) · `bun run test:search-governance`
- Fresh-rerun (claim re-proof before merge) → `bun run docs:fresh-rerun` · [`FRESH-RERUN.md`](FRESH-RERUN.md)
- Claim discovery questionnaire (new claims) → `bun run docs:claim-discovery` · [`CLAIM-DISCOVERY.md`](CLAIM-DISCOVERY.md)
- Ops summary / portal confusion (two pipelines, `source` switch) → `bun run docs:ops-summary-endpoint` · [`ops-summary-endpoint.md`](ops-summary-endpoint.md) · `bun run ops:diagnose`
- TOC Ops fixture (Drum / rails / WARMED / Gate 12 on Pages) → `bun run ops:seed:toc` · [`tenants/toc-ops.md`](tenants/toc-ops.md) · `/portal/toc/` · surface map (channels/rails/phones/ROI/bots vs MCP) · `bun run test:toc-ops` · [`tests/toc-ops/README.md`](../../tests/toc-ops/README.md)
- Ops loop throughput (dispatch → gate → settle → channels) → `bun run ops:loop:baseline` / `ops:loop:post` / `ops:loop:live` / `ops:loop:backfill` / `ops:outbox:requeue` · [`tenants/ops-loop-throughput.md`](tenants/ops-loop-throughput.md) · claim `ops-loop-throughput` · `bun test tests/ops-loop-hardening.test.ts` · note: LCR is attribution; use `--drain --r2` for durable proof (`projectorBackend`)
- Partner deep identity (cellphone · profile · seat · ChatChannelMeta · templates) → [`tenants/partner-onboarding-package.md`](tenants/partner-onboarding-package.md) · `bun tools/onboard-partner-package.ts ASH-001 --dry-run` · `bun run telegram:link-chat -- ASH-001 tg:chat:…` · `bun test tests/onboard-partner-package.test.ts tests/telegram-templates.test.ts`
- Partner package group handshake (factory ↔ ct) → [`tenants/partner-package-group-handshake.md`](tenants/partner-package-group-handshake.md) · `bun tools/onboard-partner-package.ts ASH-001 --create-package-group` · `bun run telegram:ops -- link-package-group ASH -100…`
- Factory Telegram (token · templates · ChatChannelMeta · flow cards · surfaces) → `bun run telegram:verify` · `telegram:ops:consume` · `bun run telegram:surfaces:pipeline` · [`tenants/telegram-factory.md`](tenants/telegram-factory.md) · [`lib/telegram/templates/`](../../lib/telegram/templates/) · `bun test tests/telegram-flows.test.ts tests/telegram-templates.test.ts`
- Stale / similar naming references (planes, env aliases) → `bun run docs:reference-discovery` · [`.agents/skills/reference-discovery/SKILL.md`](../../.agents/skills/reference-discovery/SKILL.md) · `bun run reference:discover:check` · `bun run discover:compose:check` · compose with [`.agents/skills/audit-gap-close/SKILL.md`](../../.agents/skills/audit-gap-close/SKILL.md) · `bun run audit:verify`
- Public plane (portal · registry bake · `/registry/` refs) → [`tenants/public-plane.md`](tenants/public-plane.md) · [`.agents/skills/public-discovery/SKILL.md`](../../.agents/skills/public-discovery/SKILL.md) · [`.agents/skills/public-audit-gap-close/SKILL.md`](../../.agents/skills/public-audit-gap-close/SKILL.md) · `bun run public:audit:verify` · `bun run verify:portal:static`
- Improve the harness itself → [`.agents/skills/harness-improve/SKILL.md`](../../.agents/skills/harness-improve/SKILL.md)
- Coding standards (full) → [`.custom-instructions.md`](../../.custom-instructions.md)

## Invariants (always enforced)

- **`lib/types/branded.ts`** — domain `*Id` brands; no bare string IDs after the boundary  
  *Ratchet* → `bun tools/branded-id-check.ts --staged --strict`, `bun run check:brands:types`, `tsc --project tsconfig.check.json`
- **`docs/WIRE_BOUNDARY.md`** — `unknown` / decode stay at parse edges  
  *Ratchet* → eslint `harness/no-unknown-function-param` (**error**), `harness/no-decode-unknown-outside-boundary` (**error**)
- **Runtime CLI boundaries** — `bun run` flag placement, script vs file resolution, `--bun` shebang, `--console-depth`  
  *Ratchet* → `bun test tests/fixtures/runtime-cli/` · claim `runtime-cli-boundaries` · [runtime](https://bun.com/docs/runtime)
- **`console-depth-boundaries`** — `lib/console-depth` helpers (inspect/width/markdown)  
  *Ratchet* → `bun test tests/console-depth.test.ts` · [PROOF Lib surface](PROOF.md#lib-surface--docs-vs-bun-vs-other-external)
- **`github-repository-ref-boundaries`** — Actions → git → `CANONICAL_REMOTES`  
  *Ratchet* → `bun test tests/github-repository-ref.test.ts` · [`AUTHORITY.md`](AUTHORITY.md)
- **`macros-embed-boundaries`** — bundle-time macro inlining  
  *Ratchet* → `bun test tests/macros/embed-commit.test.ts` · [`lib/macros/README.md`](../../lib/macros/README.md)
- `bun-shell-boundaries` → `bun test tests/fixtures/bun-shell/`
- `fs-native-boundaries` → `bun test tests/fs-bun.test.ts tests/bun-glob-scan.test.ts`
- `security-hash-boundaries` → `bun test tests/fixtures/security-hash/`
- `url-pattern-boundaries` → `bun test tests/bun-site-url.test.ts`
- `social-metadata-boundaries` → `bun test tests/fixtures/social-metadata/`
- `blog-extraction-boundaries` → `bun test tests/fixtures/blog-extraction/`
- `fetch-page-boundaries` → `bun test tests/fixtures/fetch-page/`
- `blog-extraction-journey` → `bun test tests/journey/blog-extraction.test.ts` (live bun.com)
- **`lib/path-bun`** — spine `lib/` + `tools/` import Bun path helpers, not `path` / `node:path`  
  *Ratchet* → `bun run check:path-bun` (pre-commit when `lib/` or `tools/` staged)
- **`Bun.env` boxing** — no Node `process.env` in spine `lib/` + `scripts/`  
  *Ratchet* → `bun run check:bun-env`, eslint `bun/prefer-bun-env` (**error**)
- **`invisible-chars`** — zero-width / bidi / format code points are `\u` escapes in source, never literal bytes  
  *Ratchet* → `bun run check:invisible-chars` (pre-commit when spine or test `.ts` staged) · `// invisible-ok` to suppress · VS16 warn-only (`--verbose` lists)
- **Canonical Bun `@see` URLs** — Bun APIs cite catalog URLs  
  *Ratchet* → pre-commit `bun-doc-refs` annotate-on-write · `bun tools/bun-doc-refs.ts check`
- **Audit findings + concepts (sibling SSOT)** — hashed evidence + catalog pages, not BunToken  
  *Ratchet* → claim `audit-findings-catalog` · `bun run audit:verify` · pre-commit + `ci:harness` · [`docs/audit/README.md`](../audit/README.md)
- **`factory-registry-cli-v1`** — R2 artifact registry + CLI (publish, install, list, search, readme)  
  *Ratchet* → `bun test tests/registry.test.ts tests/cli.test.ts` · claim `factory-registry-cli-v1` · [`lib/factory/`](../../lib/factory/)
- **`factory-registry-pages-proxy-v1`** — Pages `/api/registry` R2 binding proxy (allowlisted keys, fail-closed)  
  *Ratchet* → `bun test tests/registry-pages-function.test.ts` · claim `factory-registry-pages-proxy-v1` · [`functions/api/registry/`](../../functions/api/registry/)
- **Proof journeys** — claim kind matches evidence  
  *Ratchet* → [`PROOF.md`](PROOF.md) · `lib/harness/proof.ts` · `bun run proof:install` · `bun run harness:status`
- **Fresh-rerun** — harness PRs re-prove the affected claim outside the proposing chat  
  *Ratchet* → [`FRESH-RERUN.md`](FRESH-RERUN.md) · `freshRerun` on each `CRITICAL_PROOF_PATHS` entry · paste output in PR
- **`lib/docs/**` type-check** — docs path SSOT is one era under day-loop tsc  
  *Ratchet* → `tsconfig.check.json` include `lib/docs/**/*` · claim `lib-docs-typecheck` · `bun run type-check`
- **`lib/utils/**` type-check** — utils island is one era under day-loop tsc  
  *Ratchet* → `tsconfig.check.json` include `lib/utils/**/*` · claim `lib-utils-typecheck` · `bun run type-check`
- **`lib/core/**` type-check** — core island is one era; `ErrorSeverity` enum at call sites  
  *Ratchet* → `tsconfig.check.json` include `lib/core/**/*` · claim `lib-core-typecheck` · `bun run type-check`
- **`lib/security/**` type-check** — security island is one era under day-loop tsc  
  *Ratchet* → `tsconfig.check.json` include `lib/security/**/*` · claim `lib-security-typecheck` · `bun run type-check`

## Upstream thesis → FactoryWager owner

- Hold the worker constant → this index + skill; do not “upgrade the model” mid-job
- Private process-data iceberg → `AGENTS.md` routing · UNIFIED · brand manifest · projects triage
- Whole job → one trajectory owns closeout; parallel **lanes** in AUTHORITY
- Just-in-time context → this index (not the 700+ line standards fan-out)
- Tool legibility → `bun run help` · `harness:status` · cli-categories · actionable gate errors
- Repository teaches the agent → brands / wire eslint / path-bun / bun-env / doc-refs annotate-on-write
- Autonomy inside authority → [`AUTHORITY.md`](AUTHORITY.md)
- Prove in the real environment → [`PROOF.md`](PROOF.md) · `lib/harness/proof.ts`
- Feedback → infrastructure → [`FEEDBACK.md`](FEEDBACK.md) · `harness:lesson`
- Coherence / lifetime risk → finish migrations + ratchets (VELOCITY_BASELINE eras)
- Continuous maintenance → day loop + pre-commit timings · `docs:refresh` operate loop
- Measured effectiveness → gate timings · PR uses eslint-changed; full-tree ESLint on main push only

## Setup (hooks + CI)

```bash
bun install                 # prepare → husky
# pre-commit: hygiene ‖ harness → ast-grep
# pre-push:   install:verify --quiet
bun run ci:harness:fast     # quiet local parity (no hygiene)
bun run ci:harness          # quiet harness envelope
bun run ci:core             # install verify · hygiene · ci:harness (= GHA body)
# Actions offline (billing)? Local proof = required-check bodies:
#   bun run ci:core
#   bun run ts:verify && bun run imports:verify && bun run type-check:ci && bun run type-check:full
```

### CI tiers

- **`core`** (GHA main/PR **or local**) — install verify · cache lifecycle · hygiene · claim (PR) · `ci:harness` — **one** runner/install  
  *Ratchet* → [harness-gates.yml](../../.github/workflows/harness-gates.yml) · `bun run ci:core`
- **`fast`** (local) — ∥ cheap · `test:changed` dirty  
  *Ratchet* → `bun run ci:harness:fast`
- **`harness`** — eslint-changed (PR) / full on main · `test:changed:main`  
  *Ratchet* → `bun run ci:harness`
- **`local-only`** (Actions billing offline) — run `ci:core` + type-check scripts; admin-merge until GHA runners return  
  *Ratchet* → [AUTHORITY.md](AUTHORITY.md) · Local CI when Actions is offline
- **`feat/codex only`** — hygiene for branches without harness-gates  
  *Ratchet* → [repo-hygiene.yml](../../.github/workflows/repo-hygiene.yml)
- **`setup`** — shared Bun + install cache (+ optional eslint cache)  
  *Ratchet* → [setup-factory-bun](../../.github/actions/setup-factory-bun/action.yml)
- **`types`** — `type-check:ci` then `type-check:full` (not matrix×2 installs)  
  *Ratchet* → [typescript-checks.yml](../../.github/workflows/typescript-checks.yml) · local: same scripts

**Required checks:** Harness Gates + Type Check — see [AUTHORITY.md](AUTHORITY.md). When Actions cannot start, local `ci:core` + type-check is the proof; GitHub status stays red until billing restores. Velocity / install-tax: [VELOCITY_BASELINE.md](../organization/VELOCITY_BASELINE.md#ci-install-tax-2026-07-21-deepen). Pre-commit write tools fail if staged≠worktree (re-stage + retry).

## Day loop (honest)

Full map: [`day-loop.md`](day-loop.md) · curated Bun flags NOTE: [`../guides/bun-test-flags-1.3.13.md`](../guides/bun-test-flags-1.3.13.md).


```bash
bun run docs:harness            # this index → bun ./file.md (native ANSI, no VM)
bun run harness:status          # local ratchets + timings SSOT (ansiMarkdown)
#   bun run harness:status -- --table              # Bun.inspect family map + inspect.table
#   bun run harness:status -- --show-actions-noise # unmute GHA 0-step / billing checks
bun run help
bun run type-check              # tsconfig.check.json — spine agent surfaces
bun run build:affected          # git-true workspaces → bun --filter
bun run test:affected           # workspace package.json "test" scripts
bun run test:changed            # --changed (dirty)
bun run test:changed:main       # --main-head → origin/main|main
#   bun run test:changed -- HEAD~1
#   bun run test:changed -- main --parallel
#   bun run test:changed:watch
bun run test:isolate            # --isolate (fresh global per file)
bun run test:parallel           # --parallel (workers; auto --isolate)
#   SHARD=1/3 bun run test:shard
bun run ci:harness:fast         # before push (quiet)
bun run proof:install           # install only (also pre-push --quiet)
bun run check:path-bun && bun run check:bun-env
bun run projects:roots:check    # product-leaf README + package.json (also ∥ cheap / pre-commit on projects/)
bun run lib:domains:check       # lib/*/ README indexes (also ∥ cheap / pre-commit on lib/)
bun run build:defines           # AST --define BUILD_* + DEBUG=false (prod DCE); runtime config stays Bun.env
#   bun run build:defines:dev       # DEBUG=true
#   bun run build:defines:compile   # standalone dist/fw-build-info
```

`test:affected` = workspaces; `test:changed` = import-graph ([`bun-test-changed.ts`](../../scripts/bun-test-changed.ts)). Empty set exits 0. Docs: [v1.3.13 `--isolate` / `--parallel`](https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel) · [`--shard`](https://bun.com/blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs) · [`--changed`](https://bun.com/blog/bun-v1.3.13#bun-test-changed).

Terminal markdown: static files via `bun ./file.md`; live CLIs via `ansiMarkdown` / `Bun.markdown.ansi` ([`docs/BUN_NATIVE_CAPABILITIES.md`](../BUN_NATIVE_CAPABILITIES.md) · [markdown ANSI](https://bun.com/docs/runtime/markdown#ansi-terminal-output)). Opt-in inspect family: `bun run harness:status -- --table` ([`Bun.inspect`](https://bun.com/docs/runtime/utils#bun-inspect) · [`custom`](https://bun.com/docs/runtime/utils#bun-inspect-custom) · [`table`](https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options)). Actions 0-step / billing checks stay muted; `--show-actions-noise` to show. When Actions is offline, local merge proof remains `bun run ci:core` ([AUTHORITY.md](AUTHORITY.md)).

## Local theses (FactoryWager)

1. **Parse once** at the boundary into brands/structs.
2. **One concept → one owner** (brands manifest, path-bun, cli-args, repo-docs).
3. **Repository teaches the agent** — AGENTS routes; ratchets block regressions.
4. **Prove the claim** — match evidence kind to the statement (PROOF.md).
5. **Finish migrations** — no dual eras as prompt material.
6. **Feedback → infrastructure** — lesson template promotes into type/lint/skill/doc-map.
7. **Attention budget** — JIT this index; deep docs stay linked.
8. **Whole job + lanes** — one trajectory owns closeout; disjoint files for parallel agents.

## Discovery wave (platform + proof)

Parallel agent lanes for platform mapping — run from broad to narrow:

| Wave | Command / owner | Output |
|------|-----------------|--------|
| 0 | `bun run harness:status` | ratchet + claim inventory |
| 1 | `bun run cloudflare:env` · MCP `cloudflare` Pages API | domain pins · deploy state |
| 2 | `bun run verify:proof-taxonomy:save` · `bun run check:release-tracker` | 13 contracts · 20 consistency |
| 3 | `bun run ops:snapshot` · `bun run verify:portal` · `verify:pages-edge` | live portal + Pages edge |

Routing SSOT: [`docs/platform-routing.md`](../platform-routing.md) · proof taxonomy: [`PROOF.md`](PROOF.md#verification-lane-taxonomy-bun-product-pillars).

### `verify-all` pipeline (ordered)

1. defaults · networking · release · package-info
2. install-env · registry-client · install-platform (dry-run)
3. runtime-nits · bundler · doc-index · docs-coverage
4. inline artifact sanity (`bun-utils-test` · install-platform · install-env · registry-client · bundler-loaders)
5. channel-meta merge · proof-taxonomy audit · portal live · script-flag order

### `check:release-tracker`

Tests + release verify: `bun-release-tracker` · `bun-runtime-nits-probes` · install-platform/env · verification-channels · canonical-coverage · proof-taxonomy (+ tool) · proof-consistency · release-preview · docs-coverage · resolve-bun-binary · `bun tools/verify-bun-release.ts`.
