# Proof contracts

Match **evidence** to the **claim**. Green pre-commit alone does not prove a journey or deployed health.

**New claim?** → fill out [`CLAIM-DISCOVERY.md`](CLAIM-DISCOVERY.md) first (`bun run docs:claim-discovery`).

Upstream: [harness-engineering proof thesis](https://github.com/lopopolo/harness-engineering/tree/trunk/docs/proof).

Markdown here is only a pointer. Enforcement is lint (**error**), `tsconfig.check.json` / brand types, and the ratchets named under each artefact.

## Claim kinds

- **`unit`** — pure logic / types  
  *Ratchet* → `bun test` · `bun run check:brands:types`
- **`boundary`** — wire → domain parse / spine ratchets  
  *Ratchet* → staged brand gate · harness eslint · `check:path-bun` · `check:bun-env`
- **`journey`** — multi-step user/ops path  
  *Ratchet* → scripted CLI sequence · contract JSON
- **`deployed`** — live / machine state  
  *Ratchet* → `install:verify` · machine health · CI workflow green

## Named critical paths

- **`branded-ids`** — new domain IDs are branded after the boundary (`boundary` + `unit`)  
  *Ratchet* → `bun tools/branded-id-check.ts --staged --strict`, `bun run check:brands:types`
- **`install-verify`** — Factory install produces a working Bun workspace (`journey` + `deployed`)  
  *Ratchet* → `bun run proof:install` · `bun run install:verify` (CI: `repo-hygiene.yml`)
- **`install-verify-journey`** — install:verify → HTML report → WebView asserts `#status = verified`  
  *Ratchet* → `bun run test:install-verify`
- **`test-changed`** — import-graph affected tests (`unit` + `journey`)  
  *Ratchet* → `bun run test:changed` · `bun run test:changed:main` (CI: `harness-gates.yml`)
- **`search-governance`** — bench gate policy holds (`journey`)  
  *Ratchet* → `bun run search:bench:gate` · `.github/workflows/search-governance.yml`
- **`search-governance-basic`** — known query → WebView results (`journey`)  
  *Ratchet* → `bun run test:search-governance` · [`search-governance.md`](search-governance.md)
- **`runtime-cli-boundaries`** — critical Bun runtime CLI flags behave as expected (`boundary`)  
  *Ratchet* → `bun test tests/fixtures/runtime-cli/` · evidence `tests/fixtures/runtime-cli/**/fixture.test.ts`  
  *Fixtures* → `flag-placement/` (`#watch`) · `resolution-order/` (`#resolution-order`) · `shebang-bun/` (`#bun`) · `console-depth/` (`#bun-run-console-depth`)
- **`bun-shell-boundaries`** — Bun.$ interpolation / error-handling / cwd behave as expected  
  *Ratchet* → `bun test tests/fixtures/bun-shell/`
- **`fs-native-boundaries`** — `Bun.file` / `Bun.write` / `Bun.Glob` behave as expected  
  *Ratchet* → `bun test tests/fs-bun.test.ts tests/bun-glob-scan.test.ts`
- **`image-metadata-boundaries`** — Bun.Image metadata extract / resize / verify / parse + TEST-003 remediation (`awaitAllSettled` · `deepEquals` unchanged · `checkEvidenceTiming` / runtime fingerprint) (`unit` + `boundary`)  
  *Ratchet* → `bun test ./tests/image-metadata.test.ts` · evidence [`lib/image-metadata.ts`](../../lib/image-metadata.ts) · [`lib/screenshot-remediation.ts`](../../lib/screenshot-remediation.ts)
- **`deep-equals-boundaries`** — `Bun.deepEquals` wrapper + strict / changed-index helpers (`unit` + `boundary`)  
  *Ratchet* → `bun test ./tests/deep-equals.test.ts` · evidence [`lib/deep-equals.ts`](../../lib/deep-equals.ts)
- **`peek-settle-boundaries`** — `Bun.peek` settled-promise fast path (`awaitSettled` / `awaitAllSettled` / `peekIfSettled`) (`unit` + `boundary`)  
  *Ratchet* → `bun test ./tests/peek-settle.test.ts` · evidence [`lib/peek-settle.ts`](../../lib/peek-settle.ts)
- **`bun-time-boundaries`** — utils date/time/number tokens: `Bun.nanoseconds` · `Bun.sleep`/`sleepSync` · `Bun.randomUUIDv7` · `Bun.version`/`revision` + `mintEvidenceId` / `mintEvidenceIdAt` / `checkEvidenceTiming` (`unit` + `boundary`)  
  *Ratchet* → `bun test ./tests/time.test.ts` · evidence [`lib/time.ts`](../../lib/time.ts) · wired into TEST-003 via [`lib/screenshot-remediation.ts`](../../lib/screenshot-remediation.ts)
- **`cloudflare-pages-env-ssot`** — Pages `project-r-score` identity + build pins in `config/r2-env` / `.env.example` (`unit` + `boundary`)  
  *Ratchet* → `bun test tests/r2-env.test.ts` · [`config/r2-env.ts`](../../config/r2-env.ts) · [`tenants/cloudflare-pages.md`](tenants/cloudflare-pages.md) · `bun run cloudflare:env` · `:assert` / `:assert-apex` (HTTP) · `:assert-live` (API+apex)
- **`terminal-pty-boundaries`** — Bun.Terminal PTY helpers (`spawnWithTerminal` / capturing terminal) (`unit` + `boundary`)  
  *Ratchet* → `bun test ./tests/terminal.test.ts` · evidence [`lib/terminal.ts`](../../lib/terminal.ts)
- **`console-depth-boundaries`** — `lib/console-depth` inspect/width/markdown helpers + depth precedence (`unit` + `boundary`)  
  *Ratchet* → `bun test tests/console-depth.test.ts` · evidence [`lib/console-depth.ts`](../../lib/console-depth.ts) · CLI flag also under `runtime-cli-boundaries` fixture `console-depth/`
- **`github-repository-ref-boundaries`** — Actions → git remote → `CANONICAL_REMOTES`; fail-loud on garbage wire (`unit` + `boundary`)  
  *Ratchet* → `bun test tests/github-repository-ref.test.ts` · evidence [`lib/github-repository-ref.ts`](../../lib/github-repository-ref.ts) · [`AUTHORITY.md`](AUTHORITY.md)
- **`macros-embed-boundaries`** — `bun build` macros inline commit/branch + repo parts; no substitute under plain `bun scripts/*.ts` (`unit` + `boundary`)  
  *Ratchet* → `bun test tests/macros/embed-commit.test.ts` · evidence [`lib/macros/`](../../lib/macros/) · [`lib/macros/README.md`](../../lib/macros/README.md)
- **`security-hash-boundaries`** — Bun.password hash/verify and CryptoHasher sha256/sha1 digests behave as expected  
  *Ratchet* → `bun test tests/fixtures/security-hash/` · evidence `tests/fixtures/security-hash/**/fixture.test.ts`  
  *Fixtures* → `password/` · `cryptohasher/`
- **`url-pattern-boundaries`** — Bun site URLs from URLPatternInit protocol/hostname/pathname/hash (`boundary`)  
  *Ratchet* → `bun test tests/bun-site-url.test.ts` · evidence `lib/docs/bun-site-url.ts`
- **`social-metadata-boundaries`** — HTMLRewriter extracts OG/Twitter/fallback metadata correctly (`boundary`)  
  *Ratchet* → `bun test tests/fixtures/social-metadata/` · evidence `lib/docs/extract-metadata.ts` · [guide](https://bun.com/docs/guides/html-rewriter/extract-social-meta#extract-social-share-images-and-open-graph-tags)
- **`blog-extraction-boundaries`** — article sans nav/footer (`boundary`)  
  *Ratchet* → `bun test tests/fixtures/blog-extraction/` · evidence `lib/docs/blog-extract.ts`
- **`fetch-page-boundaries`** — BunHarness page fetch: HTTPS, fragment strip, Accept/UA, 15s timeout, optional verbose, non-OK throw, success body unread (`boundary`)  
  *Ratchet* → `bun test tests/fixtures/fetch-page/` · evidence `lib/docs/fetch-page.ts` · [fetch](https://bun.com/docs/runtime/networking/fetch#sending-an-http-request)  
  *Call-site DNS* → `dns.prefetch(hostname)` before fetchPage when host is known; do not use `fetch.preconnect` until Bun fixes Invalid port on default HTTPS (oven-sh/bun#21633)
- **`blog-extraction-journey`** — `CANONICAL_SOURCES.blog` → URLPattern → `dns.prefetch` → fetchPage → `SocialMetadata` + streamed article (`journey`)  
  *Ratchet* → `bun test tests/journey/blog-extraction.test.ts` · human-only (live bun.com) · soft `dns.getCacheStats` after prefetch
- **`bun-http-server-docs`** — `CANONICAL_REFS` + `GUIDE_EXAMPLES` cover `runtime/http/server` TOC (`boundary`)  
  *Ratchet* → `bun test tests/bun-docs-catalog.test.ts` · evidence `tools/bun-doc-refs.ts` · `tools/bun-docs-guide-examples.ts` · [server](https://bun.com/docs/runtime/http/server#basic-setup)
- **`path-bun`** — spine `lib/` + `tools/` do not import `path` / `node:path` (`boundary`)  
  *Ratchet* → `bun run check:path-bun`
- **`bun-env`** — spine `lib/` + `scripts/` do not use Node `process.env` (`boundary`)  
  *Ratchet* → `bun run check:bun-env` · eslint `bun/prefer-bun-env` (**error**)
- **`invisible-chars`** — invisible/format Unicode code points are `\u` escapes in source, not literal bytes (`boundary`)  
  *Ratchet* → `bun run check:invisible-chars` · evidence `scripts/check-invisible-chars.ts` · `// invisible-ok` suppress · VS16 warn-only (`--verbose`)  
  *Origin* → `tests/console-depth.test.ts` vector corruption (U+200D→U+201D, U+FE0F→U+FE1D) passed every validator; only width assertions caught it
- **`unknown-param`** — bare `unknown` params stay at parse edges (`boundary`)  
  *Ratchet* → eslint `harness/no-unknown-function-param` (**error**) · `bun eslint --config eslint.bun-native.config.ts --quiet`
- **`day-loop-typecheck`** — advertised `type-check` covers spine agent edit surfaces (`journey`)  
  *Ratchet* → `bun run type-check` · `tsconfig.check.json`
- **`lib-docs-typecheck`** — `lib/docs/**` inside day-loop type-check (no dual-era docs island) (`boundary` + `journey`)  
  *Ratchet* → `bun run type-check` · `tsconfig.check.json` include `lib/docs/**/*`
- **`lib-utils-typecheck`** — `lib/utils/**` inside day-loop type-check (no dual-era utils island) (`boundary` + `journey`)  
  *Ratchet* → `bun run type-check` · `tsconfig.check.json` include `lib/utils/**/*`
- **`lib-core-typecheck`** — `lib/core/**` inside day-loop type-check with `ErrorSeverity` enum (`boundary` + `journey`)  
  *Ratchet* → `bun run type-check` · `tsconfig.check.json` include `lib/core/**/*`
- **`lib-security-typecheck`** — `lib/security/**` inside day-loop type-check (no dual-era security island) (`boundary` + `journey`)  
  *Ratchet* → `bun run type-check` · `tsconfig.check.json` include `lib/security/**/*`
- **`bun-cron`** — OS-persistent primary; in-process complement (`unit` + `boundary`)  
  *Ratchet* → `bun run test:cron` · [`cron.md`](cron.md)
- **`cron-os-persistent`** — OS register → entry → fire `scheduled()` → marker → remove (`journey` + `boundary`)  
  *Ratchet* → `bun run test:cron-os` · [`cron.md`](cron.md)
- **`docs-integrity`** — Bun docs stack integrity pass (`journey` + `boundary`)  
  *Ratchet* → `bun tools/bun-doc-refs.ts schedule --once` · [`tenants/docs-integrity.md`](tenants/docs-integrity.md)
- **`audit-findings-catalog`** — FactoryWager audit findings+concepts verify (evidence · graph · relatedDocs · catalog/page parity; sha3-256 primary) (`unit` + `boundary`)  
  *Ratchet* → `bun run audit:verify` · pre-commit (audit SSOT staged) · `ci:harness` CHEAP · `tools/bun-doc-refs.ts` suggest `--audit` · [`docs/audit/README.md`](../audit/README.md) · sibling SSOT (not BunToken)
- **`factory-registry-cli-v1`** — R2 artifact registry client + CLI (`publish`, `install`, `list`, `search`, `readme`) with README auto-detection (`unit` + `boundary`)  
  *Ratchet* → `bun test tests/registry.test.ts tests/cli.test.ts` · `lib/factory/` sources
- **`spine-multi-tenant`** — spine runs ≥2 in-process tenants (docs-integrity + install-verify) (`journey` + `boundary`)  
  *Ratchet* → `bun run spine:schedule:once -- --tenant=install-verify` · [`cron.md`](cron.md)
- **`spine-maintenance-runbooks`** — TenantRunbook + SignalMonitor; retirement attested + condition check; live `freshRerun` (`boundary` + `journey`)  
  *Ratchet* → `bun run test:tenant-runbooks` · [`spine-tenants.md`](spine-tenants.md) · [`maintenance.ts`](../../lib/harness/maintenance.ts) · `assertRetirementConditionCheck`
- **`spine-tenant-heal`** — sandboxed E2E heal loop (break → signal → intervene → recover) (`journey`)  
  *Ratchet* → `bun run test:tenant-heal` · [`heal-fixture.ts`](../../lib/harness/heal-fixture.ts) · [`tenant-heal.test.ts`](../../tests/journey/tenant-heal.test.ts)
- **`code-quality-tenants`** — types · harness coverage · orphan modules · complexity (`boundary` + `journey`)  
  *Ratchet* → `bun run test:code-quality` · [`code-quality.md`](code-quality.md)
- **`harness-coverage-ratchet`** — lib/harness coverage ≥ `coverage-baseline.json`  
  *Ratchet* → `bun run test:harness-coverage`
- **`harness-orphan-modules`** — every `lib/harness/*.ts` has an importer  
  *Ratchet* → `bun run check:harness-orphans`
- **`harness-complexity-floor`** — no `lib/harness` function exceeds `complexity-baseline.json`  
  *Ratchet* → `bun run check:harness-complexity`
- **`ci-deploy-runbooks`** — CI/deploy jobs have runbooks; `assertCICoverage` fail-closed  
  *Ratchet* → `bun run test:ci-deploy` · [`ci-deploy.md`](ci-deploy.md)
- **CI/deploy child claims** — catalog-ownership; `freshRerunKind: 'catalog'`; paste proves catalog presence, not intervention (see [FRESH-RERUN.md](FRESH-RERUN.md) · Three catalogs). Each points at a runbook in [`CI_RUNBOOKS`](../../lib/harness/ci-deploy.ts) · [`ci-deploy.md`](ci-deploy.md)  
  *Ids* → `ci-core-envelope` · `typescript-ci-gate` · `deploy-production-preflight` · `deploy-staging-script` · `bun-migrate-status`  
  *Fresh-rerun* → `bun run docs:ci-deploy` (shared; prints live catalog) · fail-closed coverage → `ci-deploy-runbooks`

## Gate class

How each claim is enforced day-to-day. **SSOT:** `ProofPath.gateClass` + `gateRef` in [`lib/harness/proof.ts`](../../lib/harness/proof.ts). Catalog meta (completeness · evidence⊇freshRerun · `freshRerunKind`) always applies. Classes:

- **continuous** — `pre-commit-harness` and/or `ci:harness` / `ci:core` (Harness Gates)
- **workflow** — named GHA job outside that envelope (may also be a required status check)
- **human-only** — package script / `freshRerun` paste only (no always-on gate). Do **not** label a package script as `workflow` unless a `.github/workflows/*` job runs it.

| id | class | gate / workflow |
|----|-------|-----------------|
| `branded-ids` | continuous | pre-commit brands staged‖smart; `ci:harness` smart; types when branded staged or `--full` |
| `install-verify` | continuous | `ci:core` · harness-gates |
| `install-verify-journey` | human-only | `bun run test:install-verify` |
| `test-changed` | continuous | `ci:harness` · harness-gates |
| `search-governance` | workflow | `search-governance.yml` · `search:bench:gate` |
| `search-governance-basic` | workflow | `search-governance.yml` · `test:search-governance` |
| `runtime-cli-boundaries` | continuous | `ci:harness` boundary-fixtures · `bun test tests/fixtures/runtime-cli/` |
| `bun-shell-boundaries` | continuous | `ci:harness` boundary-fixtures · `bun test tests/fixtures/bun-shell/` |
| `fs-native-boundaries` | continuous | `ci:harness` boundary-fixtures · fs-bun + bun-glob-scan |
| `image-metadata-boundaries` | human-only | `bun test ./tests/image-metadata.test.ts` |
| `deep-equals-boundaries` | human-only | `bun test ./tests/deep-equals.test.ts` |
| `peek-settle-boundaries` | human-only | `bun test ./tests/peek-settle.test.ts` |
| `bun-time-boundaries` | human-only | `bun test ./tests/time.test.ts` |
| `cloudflare-pages-env-ssot` | human-only | `bun test tests/r2-env.test.ts` |
| `terminal-pty-boundaries` | human-only | `bun test ./tests/terminal.test.ts` |
| `console-depth-boundaries` | human-only | `bun test tests/console-depth.test.ts` |
| `github-repository-ref-boundaries` | human-only | `bun test tests/github-repository-ref.test.ts` |
| `macros-embed-boundaries` | human-only | `bun test tests/macros/embed-commit.test.ts` |
| `security-hash-boundaries` | continuous | `ci:harness` boundary-fixtures · `bun test tests/fixtures/security-hash/` |
| `url-pattern-boundaries` | continuous | `ci:harness` boundary-fixtures · `bun test tests/bun-site-url.test.ts` |
| `social-metadata-boundaries` | continuous | `ci:harness` boundary-fixtures · `bun test tests/fixtures/social-metadata/` |
| `blog-extraction-boundaries` | continuous | `ci:harness` boundary-fixtures · `bun test tests/fixtures/blog-extraction/` |
| `fetch-page-boundaries` | continuous | `ci:harness` boundary-fixtures · `bun test tests/fixtures/fetch-page/` |
| `factory-registry-cli-v1` | human-only | `bun test tests/registry.test.ts tests/cli.test.ts` |
| `blog-extraction-journey` | human-only | `bun test tests/journey/blog-extraction.test.ts` |
| `bun-http-server-docs` | continuous | `ci:harness` boundary-fixtures · `bun test tests/bun-docs-catalog.test.ts` |
| `path-bun` | continuous | pre-commit (lib\|tools staged) · `ci:harness` |
| `bun-env` | continuous | pre-commit (lib\|scripts staged) · `ci:harness` · eslint `prefer-bun-env` |
| `invisible-chars` | continuous | pre-commit (spine/test .ts staged) · `ci:harness` |
| `unknown-param` | continuous | pre-commit / `ci:harness` eslint |
| `day-loop-typecheck` | workflow | `typescript-checks.yml` · `type-check` (required check) |
| `lib-docs-typecheck` | workflow | `typescript-checks.yml` · `type-check` (required check) |
| `lib-utils-typecheck` | workflow | `typescript-checks.yml` · `type-check` (required check) |
| `lib-core-typecheck` | workflow | `typescript-checks.yml` · `type-check` (required check) |
| `lib-security-typecheck` | workflow | `typescript-checks.yml` · `type-check` (required check) |
| `bun-cron` | human-only | `bun run test:cron` |
| `cron-os-persistent` | human-only | `bun run test:cron-os` |
| `docs-integrity` | human-only | `bun-doc-refs schedule --once` · spine tenant |
| `audit-findings-catalog` | continuous | pre-commit (audit SSOT staged) · `ci:harness` · `bun run audit:verify` |
| `spine-multi-tenant` | human-only | `spine:schedule:once -- --tenant=install-verify` |
| `spine-maintenance-runbooks` | human-only | `bun run test:tenant-runbooks` (live tenant freshReruns; heavy) |
| `spine-tenant-heal` | human-only | `bun run test:tenant-heal` |
| `harness-coverage-ratchet` | continuous | `ci:harness` dual-catalog · `test:code-quality` |
| `harness-orphan-modules` | continuous | `ci:harness` dual-catalog · `test:code-quality` |
| `harness-complexity-floor` | continuous | pre-commit staged `lib/harness`; also `test:code-quality` in `ci:harness` |
| `code-quality-tenants` | continuous | `ci:harness` dual-catalog · `bun run test:code-quality` |
| `ci-deploy-runbooks` | continuous | `ci:harness` dual-catalog · `bun run test:ci-deploy` |
| `ci-core-envelope` | continuous | live gate `ci:core`; `freshRerun` = catalog `docs:ci-deploy` |
| `typescript-ci-gate` | workflow | `typescript-checks.yml` (required); `freshRerun` = catalog |
| `deploy-production-preflight` | human-only | catalog via `docs:ci-deploy`; behavior = `deploy:production` |
| `deploy-staging-script` | human-only | catalog via `docs:ci-deploy`; behavior = `deploy:staging` |
| `bun-migrate-status` | human-only | catalog via `docs:ci-deploy`; behavior = `migrate:status` |

Counts (must match `gateClass` tallies): continuous 23 · workflow 8 · human-only 21.

Discover (display only, not gates): `bun run harness:status` · `bun run docs:fresh-rerun`.

## Lib surface — docs vs Bun vs other external

Routing for `lib/` modules. **Bun docs** = oven-sh / bun.com. **Other external** = non-Bun (pinned types, thesis, Actions wire, etc.). Repo docs stay in-tree.

### Claim-backed

| Module / claim | Repo docs | Bun docs | Other external |
|----------------|-----------|----------|----------------|
| `branded-ids` · `lib/types/branded*` | [`lib/types/branded/README.md`](../../lib/types/branded/README.md) · skill `.agents/skills/branded-ids/` | — | [domain-modeling](https://github.com/lopopolo/harness-engineering/blob/trunk/docs/domain-modeling/README.md) · [parse, don’t validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/) |
| `bun-time-boundaries` · `lib/time.ts` | claim in this file · `tests/time.test.ts` | [utils](https://bun.com/docs/runtime/utils) (`nanoseconds`, `sleep`, `randomUUIDv7`, `version`) | — |
| `deep-equals-boundaries` · `lib/deep-equals.ts` | claim · `tests/deep-equals.test.ts` | [Bun.deepEquals](https://bun.com/docs/runtime/utils#bun-deepequals) | — |
| `peek-settle-boundaries` · `lib/peek-settle.ts` | claim · `tests/peek-settle.test.ts` | [Bun.peek](https://bun.com/docs/runtime/utils#bun-peek) | — |
| `terminal-pty-boundaries` · `lib/terminal.ts` | claim · `tests/terminal.test.ts` | [Bun.Terminal / PTY](https://bun.com/docs/runtime/child-process#terminal-pty-support) | — |
| `console-depth-boundaries` · `lib/console-depth.ts` | [`AGENTS.md`](../../AGENTS.md) · [`BUN_NATIVE_CAPABILITIES.md`](../BUN_NATIVE_CAPABILITIES.md) · `tests/console-depth.test.ts` · bench `tools/benchmarks/console-depth-perf.ts` | [runtime/console](https://bun.com/docs/runtime/console) · [utils](https://bun.com/docs/runtime/utils) (`inspect` · `stringWidth`) · [markdown.ansi](https://bun.com/docs/runtime/markdown#ansi-terminal-output) · [color](https://bun.com/docs/runtime/color) · [sliceAnsi](https://bun.com/reference/bun/sliceAnsi) | [bun-types pin](https://github.com/oven-sh/bun/tree/98f664962ffe4c6ba9b38382babc623ef0ba8693/packages/bun-types) |
| `github-repository-ref-boundaries` · `lib/github-repository-ref.ts` | [`AGENTS.md`](../../AGENTS.md) · [`AUTHORITY.md`](AUTHORITY.md) · [`lib/docs/repo-docs.ts`](../../lib/docs/repo-docs.ts) | [Bun.env](https://bun.com/docs/runtime/utils#bun-env) · [spawnSync](https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync) | GitHub Actions `GITHUB_REPOSITORY*` |
| `macros-embed-boundaries` · `lib/macros/` | [`lib/macros/README.md`](../../lib/macros/README.md) · [`AUTHORITY.md`](AUTHORITY.md) · `tests/macros/embed-commit.test.ts` | [bundler](https://bun.com/docs/bundler/index) · [macros](https://bun.com/docs/bundler/macros) · [serializability](https://bun.com/docs/bundler/macros#serializability) · [plugins](https://bun.com/docs/bundler/plugins) (unused) | — |
| `image-metadata-boundaries` · `lib/image-metadata.ts` | claim · `lib/screenshot-remediation.ts` · `tests/image-metadata.test.ts` | [Bun.Image](https://bun.com/docs/runtime/image#input) | — |
| `url-pattern-boundaries` · `lib/docs/bun-site-url.ts` | claim · `tests/bun-site-url.test.ts` | [URLPattern](https://bun.com/blog/bun-v1.3.4#urlpattern-api) | — |
| `social-metadata-boundaries` · `lib/docs/extract-metadata.ts` | claim · `tests/fixtures/social-metadata/` | [HTMLRewriter social meta](https://bun.com/docs/guides/html-rewriter/extract-social-meta#extract-social-share-images-and-open-graph-tags) · [HTMLRewriter](https://bun.com/docs/runtime/html-rewriter) | — |
| `blog-extraction-boundaries` · `lib/docs/blog-extract.ts` | claim · `tests/fixtures/blog-extraction/` | [HTMLRewriter](https://bun.com/docs/runtime/html-rewriter) | — |
| `fetch-page-boundaries` · `lib/docs/fetch-page.ts` | claim · `tests/fixtures/fetch-page/` | [fetch](https://bun.com/docs/runtime/networking/fetch#sending-an-http-request) | Bun issue [oven-sh/bun#21633](https://github.com/oven-sh/bun/issues/21633) (`fetch.preconnect` deferred) |
| `path-bun` · `lib/path-bun.ts` | claim · `bun run check:path-bun` | Bun path helpers (via `lib/path-bun` + `bun-doc-refs`) | — |
| `bun-env` | claim · `bun run check:bun-env` | [Bun.env](https://bun.com/docs/runtime/utils#bun-env) · [environment variables](https://bun.com/docs/runtime/environment-variables) | — |
| `cloudflare-pages-env-ssot` · `config/r2-env.ts` | [`tenants/cloudflare-pages.md`](tenants/cloudflare-pages.md) · `.env.example` · `public/index.html` | — | Cloudflare Pages / Wrangler (dashboard + API; not Bun) |
| harness ratchets (`coverage` · `orphans` · `complexity`) | [`lib/harness/README.md`](../../lib/harness/README.md) · [`code-quality.md`](code-quality.md) | — | [harness-engineering](https://github.com/lopopolo/harness-engineering) |
| type-check islands · `lib/{docs,utils,core,security}` | claims `lib-*-typecheck` · `tsconfig.check.json` | — | — |
| `audit-findings-catalog` · `lib/audit/` | [`docs/audit/README.md`](../audit/README.md) | — | — |
| `factory-registry-cli-v1` · `lib/factory/` | claim this file · `tests/registry.test.ts` · `tests/cli.test.ts` | [Bun.semver](https://bun.com/docs/runtime/semver) · [Bun.file](https://bun.com/docs/runtime/file-io) · [Bun.inspect](https://bun.com/docs/runtime/utils#bun-inspect) · [fetch](https://bun.com/docs/runtime/networking/fetch) | Cloudflare R2 (S3-compat) |

### Inventory-only (no dedicated claim yet)

| Module | Repo docs | Bun docs | Other external |
|--------|-----------|----------|----------------|
| `lib/gate-map.ts` · `lib/gate-report-monorepo.ts` | file headers · `.agents/skills/ast-grep/gate-map.json` | [Bun.env](https://bun.com/docs/runtime/utils#bun-env) · [Bun.file](https://bun.com/docs/runtime/file-io) · [Bun.spawn](https://bun.com/docs/runtime/child-process) | kimi-toolchain JSON summary (optional gate step) |
| `lib/projects-scan.ts` | file header · `bun run registry:projects` consumers | [Glob](https://bun.com/docs/runtime/glob) · [Bun.file](https://bun.com/docs/runtime/file-io) · [spawnSync](https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync) · [Bun.which](https://bun.com/docs/runtime/utils#bun-which) · [Bun.peek](https://bun.com/docs/runtime/utils#bun-peek) | — |
| `lib/text.ts` | slugify helpers (Mintlify/GitHub-style) | [Bun.stringWidth](https://bun.com/docs/runtime/utils#bun-stringwidth) (related width work lives in console-depth) | — |
| `lib/index.ts` | barrel re-exports | — | — |
| `lib/mcp/` · `lib/r2/` · `lib/rss/` · `lib/package/` · `lib/ai/` · `lib/theme/` · `lib/performance/` · `lib/shared/` · `lib/constants/` | domain [`README.md`](../../lib/README.md) indexes · `bun run lib:domains:check` | varies per module `@see` | product/Cloudflare/R2 as applicable |

Resolve Bun URLs via `bun tools/bun-doc-refs.ts suggest "<api>"` before inventing new `@see` lines.

## Fresh-rerun

Every path above has a `freshRerun` command in [`lib/harness/proof.ts`](../../lib/harness/proof.ts).  
*Ratchet* → [`FRESH-RERUN.md`](FRESH-RERUN.md) · paste command output in the PR body when touching the claim’s owner.

## New claim → discovery first

Do not invent a `ProofPath` by editing files ad hoc. Fill [`CLAIM-DISCOVERY.md`](CLAIM-DISCOVERY.md) (Q0–Q14) so ceremony path (slim vs full), `claim` / `kinds` / `gateClass` / `gateRef` / `evidence` / `freshRerun` / `freshRerunKind`, contract asserts, and PR paste are decided before code.  
*Ratchet* → `bun run docs:claim-discovery` · answered questionnaire in the PR or commit trail

## Agent checklist before “done”

1. For a **new** claim: complete [`CLAIM-DISCOVERY.md`](CLAIM-DISCOVERY.md) (slim or full path from Q0).
2. State the claim in one sentence (`ProofPath.claim`).
3. Pick kind(s), `gateClass` + `gateRef`, `freshRerunKind` (`claim` | `catalog`), and `owner`.
4. Parent catalogs only: set `childIds` (CI / CQ / spine) so dual-catalog membership can’t drift.
5. Point at evidence paths or commands that actually ran.
6. If the change touches a claim owner, run that claim’s `freshRerun` and keep the output (PR body) — [`FRESH-RERUN.md`](FRESH-RERUN.md).
7. If evidence is missing, either run it or downgrade the claim.

Code SSOT: [`lib/harness/proof.ts`](../../lib/harness/proof.ts). Discover: `bun run harness:status` · `bun run docs:fresh-rerun` · `bun run docs:claim-discovery`.
