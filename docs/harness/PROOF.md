# Proof contracts

Match **evidence** to the **claim**. Green pre-commit alone does not prove a
journey or deployed health.

**New claim?** → fill out [`CLAIM-DISCOVERY.md`](CLAIM-DISCOVERY.md) first
(`bun run docs:claim-discovery`).

Upstream:
[harness-engineering proof thesis](https://github.com/lopopolo/harness-engineering/tree/trunk/docs/proof).

Markdown here is only a pointer. Enforcement is lint (**error**),
`tsconfig.check.json` / brand types, and the ratchets named under each artefact.

## Claim kinds

- **`unit`** — pure logic / types _Ratchet_ → `bun test` ·
  `bun run check:brands:types`
- **`boundary`** — wire → domain parse / spine ratchets _Ratchet_ → staged brand
  gate · harness eslint · `check:path-bun` · `check:bun-env`
- **`journey`** — multi-step user/ops path _Ratchet_ → scripted CLI sequence ·
  contract JSON
- **`deployed`** — live / machine state _Ratchet_ → `install:verify` · machine
  health · CI workflow green

## Named critical paths

- **`branded-ids`** — new domain IDs are branded after the boundary
  (`boundary` + `unit`) _Ratchet_ →
  `bun tools/branded-id-check.ts --staged --strict`,
  `bun run check:brands:types`
- **`bun-brand-cross-map`** — reviewed Bun API → wrapper → brand → consumer
  declarations bake to `bun-brand-map.json` (`unit` + `boundary`) _Ratchet_ →
  `bun run bun:brand-map:check` ·
  [`tenants/bun-brand-cross-map.md`](tenants/bun-brand-cross-map.md)
- **`install-verify`** — Factory install produces a working Bun workspace
  (`journey` + `deployed`) _Ratchet_ → `bun run proof:install` ·
  `bun run install:verify` (CI: `repo-hygiene.yml`)
- **`install-verify-journey`** — install:verify → HTML report → WebView asserts
  `#status = verified` _Ratchet_ → `bun run test:install-verify`
- **`test-changed`** — import-graph affected tests (`unit` + `journey`)
  _Ratchet_ → `bun run test:changed` · `bun run test:changed:main` (CI:
  `harness-gates.yml`)
- **`search-governance`** — bench gate policy holds (`journey`) _Ratchet_ →
  `bun run search:bench:gate` · `.github/workflows/search-governance.yml`
- **`search-governance-basic`** — known query → WebView results (`journey`)
  _Ratchet_ → `bun run test:search-governance` ·
  [`search-governance.md`](search-governance.md)
- **`runtime-cli-boundaries`** — critical Bun runtime CLI flags behave as
  expected (`boundary`) _Ratchet_ → `bun test tests/fixtures/runtime-cli/` ·
  evidence `tests/fixtures/runtime-cli/**/fixture.test.ts` _Fixtures_ →
  `flag-placement/` (`#watch`) · `resolution-order/` (`#resolution-order`) ·
  `shebang-bun/` (`#bun`) · `console-depth/` (`#bun-run-console-depth`)
- **`bun-shell-boundaries`** — Bun.$ interpolation / error-handling / cwd behave
  as expected _Ratchet_ → `bun test tests/fixtures/bun-shell/`
- **`fs-native-boundaries`** — `Bun.file` / `Bun.write` / `Bun.Glob` behave as
  expected _Ratchet_ →
  `bun test tests/fs-bun.test.ts tests/bun-glob-scan.test.ts`
- **`image-metadata-boundaries`** — Bun.Image metadata extract / resize / verify
  / parse + TEST-003 remediation (`awaitAllSettled` · `deepEquals` unchanged ·
  `checkEvidenceTiming` / runtime fingerprint) (`unit` + `boundary`) _Ratchet_ →
  `bun test ./tests/image-metadata.test.ts` · evidence
  [`lib/image-metadata.ts`](../../lib/image-metadata.ts) ·
  [`lib/screenshot-remediation.ts`](../../lib/screenshot-remediation.ts)
- **`deep-equals-boundaries`** — `Bun.deepEquals` wrapper + strict /
  changed-index helpers (`unit` + `boundary`) _Ratchet_ →
  `bun test ./tests/deep-equals.test.ts` · evidence
  [`lib/deep-equals.ts`](../../lib/deep-equals.ts)
- **`peek-settle-boundaries`** — `Bun.peek` settled-promise fast path
  (`awaitSettled` / `awaitAllSettled` / `peekIfSettled`) (`unit` + `boundary`)
  _Ratchet_ → `bun test ./tests/peek-settle.test.ts` · evidence
  [`lib/peek-settle.ts`](../../lib/peek-settle.ts)
- **`bun-time-boundaries`** — utils date/time/number tokens: `Bun.nanoseconds` ·
  `Bun.sleep`/`sleepSync` · `Bun.randomUUIDv7` · `Bun.version`/`revision` +
  `mintEvidenceId` / `mintEvidenceIdAt` / `checkEvidenceTiming` (`unit` +
  `boundary`) _Ratchet_ → `bun test ./tests/time.test.ts` · evidence
  [`lib/time.ts`](../../lib/time.ts) · wired into TEST-003 via
  [`lib/screenshot-remediation.ts`](../../lib/screenshot-remediation.ts)
- **`cloudflare-pages-env-ssot`** — Pages `project-r-score` identity + build
  pins in `config/r2-env` / `.env.example` (`unit` + `boundary`) _Ratchet_ →
  `bun test tests/r2-env.test.ts` · [`config/r2-env.ts`](../../config/r2-env.ts)
  · [`tenants/cloudflare-pages.md`](tenants/cloudflare-pages.md) ·
  `bun run cloudflare:env` · `:assert` / `:assert-apex` (HTTP) · `:assert-live`
  (API+apex)
- **`terminal-pty-boundaries`** — Bun.Terminal PTY helpers (`spawnWithTerminal`
  / capturing terminal) (`unit` + `boundary`) _Ratchet_ →
  `bun test ./tests/terminal.test.ts` · evidence
  [`lib/terminal.ts`](../../lib/terminal.ts)
- **`console-depth-boundaries`** — `lib/console-depth` inspect/width/markdown
  helpers + depth precedence (`unit` + `boundary`) _Ratchet_ →
  `bun test tests/console-depth.test.ts` · evidence
  [`lib/console-depth.ts`](../../lib/console-depth.ts) · CLI flag also under
  `runtime-cli-boundaries` fixture `console-depth/`
- **`color-kernel-theme-aliases`** — theme.jsonc dark aliases ↔ glossary /
  partner-ops / telegram kernels + count floors (`unit` + `boundary`) _Ratchet_
  → `bun run test:colors` · evidence
  [`lib/portal/color-kernel-align.ts`](../../lib/portal/color-kernel-align.ts) ·
  [`docs/portal-foundation.md`](../portal-foundation.md) · gate
  `harness-gates.yml`
- **`monorepo-health-score`** — monorepo health collect + schema + metric floors
  (`unit` + `boundary` + `journey`) _Ratchet_ → `bun run check:monorepo-health`
  · pre-commit tests-only when health sources staged · evidence
  [`lib/harness/monorepo-health.ts`](../../lib/harness/monorepo-health.ts) ·
  tenant [`tenants/monorepo-health.md`](tenants/monorepo-health.md)
- **`github-repository-ref-boundaries`** — Actions → git remote →
  `CANONICAL_REMOTES`; fail-loud on garbage wire (`unit` + `boundary`) _Ratchet_
  → `bun test tests/github-repository-ref.test.ts` · evidence
  [`lib/github-repository-ref.ts`](../../lib/github-repository-ref.ts) ·
  [`AUTHORITY.md`](AUTHORITY.md)
- **`github-issue-governance`** — issue-body/provider JSON parses once; audit is
  read-only; label synchronization is deletion-free and requires explicit write
  confirmation (`unit` + `boundary`) _Ratchet_ →
  `bun test tests/github-issue-tooling.test.ts` · evidence
  [`tools/github-issue-doctor.ts`](../../tools/github-issue-doctor.ts) ·
  [`tenants/github-issue-taxonomy.md`](tenants/github-issue-taxonomy.md)
- **`github-issue-taxonomy-public`** — deterministic credential-free taxonomy
  projection; exact SSOT, color-kernel, registry-index, and drift parity
  (`unit` + `boundary`) _Ratchet_ →
  `bun test tests/github-issue-taxonomy-public.test.ts` · evidence
  [`public/registry/github-issue-taxonomy.json`](../../public/registry/github-issue-taxonomy.json)
  · [`tenants/github-issue-taxonomy.md`](tenants/github-issue-taxonomy.md)
- **`macros-embed-boundaries`** — `bun build` macros inline commit/branch + repo
  parts; no substitute under plain `bun scripts/*.ts` (`unit` + `boundary`)
  _Ratchet_ → `bun test tests/macros/embed-commit.test.ts` · evidence
  [`lib/macros/`](../../lib/macros/) ·
  [`lib/macros/README.md`](../../lib/macros/README.md)
- **`security-hash-boundaries`** — Bun.password hash/verify and CryptoHasher
  sha256/sha1 digests behave as expected _Ratchet_ →
  `bun test tests/fixtures/security-hash/` · evidence
  `tests/fixtures/security-hash/**/fixture.test.ts` _Fixtures_ → `password/` ·
  `cryptohasher/`
- **`url-pattern-boundaries`** — precompiled URLPattern components drive site
  URLs, parameterized HTTP routes, and portal/glossary hash classification +
  extraction (`boundary`) _Ratchet_ →
  `bun test tests/bun-urlpattern.test.ts tests/bun-site-url.test.ts tests/factory-production.test.ts tests/portal-url-planes.test.ts`
  · evidence `lib/docs/bun-site-url.ts` · `lib/portal/url-planes.ts`
- **`social-metadata-boundaries`** — HTMLRewriter extracts OG/Twitter/fallback
  metadata correctly (`boundary`) _Ratchet_ →
  `bun test tests/fixtures/social-metadata/` · evidence
  `lib/docs/extract-metadata.ts` ·
  [guide](https://bun.com/docs/guides/html-rewriter/extract-social-meta#extract-social-share-images-and-open-graph-tags)
- **`blog-extraction-boundaries`** — article sans nav/footer (`boundary`)
  _Ratchet_ → `bun test tests/fixtures/blog-extraction/` · evidence
  `lib/docs/blog-extract.ts`
- **`fetch-page-boundaries`** — BunHarness page fetch: HTTPS, fragment strip,
  Accept/UA, 15s timeout, optional verbose, non-OK throw, success body unread
  (`boundary`) _Ratchet_ → `bun test tests/fixtures/fetch-page/` · evidence
  `lib/docs/fetch-page.ts` ·
  [fetch](https://bun.com/docs/runtime/networking/fetch#sending-an-http-request)
  _Call-site DNS_ → `dns.prefetch(hostname)` before fetchPage when host is
  known; `fetch.preconnect` HTTPS still Invalid-port on 1.4 — use
  `bun --fetch-preconnect https://host:443` (startup) or
  [`lib/http/fetch-preconnect.ts`](../../lib/http/fetch-preconnect.ts) (HTTP OK)
  ·
  [preconnect at startup](https://bun.com/docs/runtime/networking/fetch#preconnect-at-startup)
- **`https-proxy-connect-reuse`** — Bun reuses HTTPS proxy CONNECT tunnels only
  while proxy host/port, proxy credentials, target host/port, and TLS
  configuration remain equal (`boundary`) _Ratchet_ →
  `bun test tests/fetch-proxy-keepalive.test.ts` · evidence `lib/net/proxy.ts` ·
  [Bun 1.3.12 ship note](https://bun.com/blog/bun-v1.3.12#keep-alive-for-https-proxy-connect-tunnels)
- **`blog-extraction-journey`** — `CANONICAL_SOURCES.blog` → URLPattern →
  `dns.prefetch` → fetchPage → `SocialMetadata` + streamed article (`journey`)
  _Ratchet_ → `bun test tests/journey/blog-extraction.test.ts` · human-only
  (live bun.com) · soft `dns.getCacheStats` after prefetch
- **`bun-http-server-docs`** — `CANONICAL_REFS` + `GUIDE_EXAMPLES` cover
  `runtime/http/server` TOC (`boundary`) _Ratchet_ →
  `bun test tests/bun-docs-catalog.test.ts` · evidence `tools/bun-doc-refs.ts` ·
  `tools/bun-docs-guide-examples.ts` ·
  [server](https://bun.com/docs/runtime/http/server#basic-setup)
- **`path-bun`** — spine `lib/` + `tools/` do not import `path` / `node:path`
  (`boundary`) _Ratchet_ → `bun run check:path-bun`
- **`bun-env`** — spine `lib/` + `scripts/` do not use Node `process.env`
  (`boundary`) _Ratchet_ → `bun run check:bun-env` · eslint `bun/prefer-bun-env`
  (**error**)
- **`invisible-chars`** — invisible/format Unicode code points are `\u` escapes
  in source, not literal bytes (`boundary`) _Ratchet_ →
  `bun run check:invisible-chars` · evidence `scripts/check-invisible-chars.ts`
  · `// invisible-ok` suppress · VS16 warn-only (`--verbose`) _Origin_ →
  `tests/console-depth.test.ts` vector corruption (U+200D→U+201D, U+FE0F→U+FE1D)
  passed every validator; only width assertions caught it
- **`unknown-param`** — bare `unknown` params stay at parse edges (`boundary`)
  _Ratchet_ → eslint `harness/no-unknown-function-param` (**error**) ·
  `bun eslint --config eslint.harness.config.ts --quiet`
- **`day-loop-typecheck`** — advertised `type-check` covers spine agent edit
  surfaces (`journey`) _Ratchet_ → `bun run type-check` · `tsconfig.check.json`
- **`lib-docs-typecheck`** — `lib/docs/**` inside day-loop type-check (no
  dual-era docs island) (`boundary` + `journey`) _Ratchet_ →
  `bun run type-check` · `tsconfig.check.json` include `lib/docs/**/*`
- **`lib-utils-typecheck`** — `lib/utils/**` inside day-loop type-check (no
  dual-era utils island) (`boundary` + `journey`) _Ratchet_ →
  `bun run type-check` · `tsconfig.check.json` include `lib/utils/**/*`
- **`lib-core-typecheck`** — `lib/core/**` inside day-loop type-check with
  `ErrorSeverity` enum (`boundary` + `journey`) _Ratchet_ → `bun run type-check`
  · `tsconfig.check.json` include `lib/core/**/*`
- **`lib-security-typecheck`** — `lib/security/**` inside day-loop type-check
  (no dual-era security island) (`boundary` + `journey`) _Ratchet_ →
  `bun run type-check` · `tsconfig.check.json` include `lib/security/**/*`
- **`bun-cron`** — OS-persistent primary; in-process complement (`unit` +
  `boundary`) _Ratchet_ → `bun run test:cron` · [`cron.md`](cron.md)
- **`cron-os-persistent`** — OS register → entry → fire `scheduled()` → marker →
  remove (`journey` + `boundary`) _Ratchet_ → `bun run test:cron-os` ·
  [`cron.md`](cron.md)
- **`docs-integrity`** — Bun docs stack integrity pass (`journey` + `boundary`)
  _Ratchet_ → `bun tools/bun-doc-refs.ts schedule --once` ·
  [`tenants/docs-integrity.md`](tenants/docs-integrity.md)
- **`audit-findings-catalog`** — FactoryWager audit findings+concepts verify
  (evidence · graph · relatedDocs · catalog/page parity; sha3-256 primary)
  (`unit` + `boundary`) _Ratchet_ → `bun run audit:verify` · pre-commit (audit
  SSOT staged) · `ci:harness` CHEAP · `tools/bun-doc-refs.ts` suggest `--audit`
  · [`docs/audit/README.md`](../audit/README.md) · sibling SSOT (not BunToken)
- **`public-plane-discovery-v1`** — Pages static plane discovery catches broken
  `/registry/` refs and portal anti-patterns before deploy (`unit` + `boundary`)
  _Ratchet_ → `bun run public:audit:verify` ·
  [`tenants/public-plane.md`](tenants/public-plane.md) · skills
  `public-discovery` · `public-audit-gap-close`
- **`reference-discovery-v1`** — Harness perimeter reference discovery catches
  plane mismatch and stale naming in lib/tools/docs (`unit` + `boundary`)
  _Ratchet_ → `bun run discover:compose:check` ·
  [`tenants/reference-discovery.md`](tenants/reference-discovery.md) · skills
  `reference-discovery` · `audit-gap-close`
- **`factory-registry-cli-v1`** — R2 artifact registry client + CLI (`publish`,
  `install`, `list`, `search`, `readme`) with README auto-detection; live path
  is SigV4 `S3Client` via `object-store.ts` (`unit` + `boundary`) _Ratchet_ →
  `bun test tests/registry.test.ts tests/cli.test.ts` · `lib/factory/` sources
- **`factory-registry-pages-proxy-v1`** — Pages Function `/api/registry` serves
  allowlisted objects via R2 binding (`unit` + `boundary`) _Ratchet_ →
  `bun test tests/registry-pages-function.test.ts` ·
  `functions/api/registry/[[path]].ts` · portal `public/portal/`
- **`factory-registry-integrity-v1`** — Registry health, authenticated
  publishing, full R2 size/SHA-256 audit, scheduled spine ownership, and
  redacted Slack/Telegram alerts (`unit` + `boundary`) _Ratchet_ →
  `bun test tests/factory-production.test.ts` ·
  [`tenants/registry-integrity.md`](tenants/registry-integrity.md)
- **`blog-codeblocks-boundaries`** — Blog `div.CodeBlock` extraction strips
  Shiki markup, skips tabs, and preserves token joins (`boundary`) _Ratchet_ →
  `bun test tests/bun-blog-codeblocks.test.ts tests/blog-codeblock-join.test.ts`
- **`blog-codeblocks-journey`** — Live Bun blog HTML traverses `fetchPostHtml` →
  `extractCodeBlocks` with the expected code-block inventory (`journey`)
  _Ratchet_ → `bun test tests/journey/blog-codeblocks-journey.test.ts`
- **`multi-tenant-portal-v1`** — Tenant config drives registry paths,
  sidebar/manifest data, and proof badges (`unit` + `boundary`) _Ratchet_ →
  `bun test tests/registry-pages-function.test.ts`
- **`accounts-r2-v1`** — Portal account records and OIDC/Telegram indexes
  persist through the R2 account store (`unit`) _Ratchet_ →
  `bun test tests/accounts-r2.test.ts`
- **`operations-ssot-v1`** — Unified operations schema and DB factory own
  transactional dispatch, guardrails, reconciliation, sync, and backup (`unit`)
  _Ratchet_ →
  `bun test tests/operations-schema.test.ts tests/play-dispatcher.test.ts tests/account-service.test.ts tests/operations-phase2.test.ts tests/operations-phase3.test.ts`
- **`telegram-webhook-v1`** — Per-tenant Telegram webhooks validate their
  secret, enqueue to R2 on Pages, and route commands on Bun (`unit`) _Ratchet_ →
  `bun test tests/telegram-bot.test.ts tests/telegram-webhook-pages.test.ts` ·
  Pages `functions/api/telegram/webhook/` + Bun consume ·
  [`tenants/telegram-factory.md`](tenants/telegram-factory.md)
- **`ops-loop-throughput`** — Closed loop dispatch → gate → settle → channels
  with row-aligned `loopCompletionRate` ≥60% (`journey` + `unit`) _Ratchet_ →
  `bun test tests/ops-loop-hardening.test.ts` · `bun run ops:loop:baseline` /
  `ops:loop:post` ·
  [`tenants/ops-loop-throughput.md`](tenants/ops-loop-throughput.md)
- **`ops-snapshot-cron-v1`** — In-process Bun.cron ops-snapshot refreshes
  portal/Pages artifacts (ops-summary, monitoring, static, routing/bun-utils)
  (`unit` + `boundary`) _Ratchet_ → `bun test tests/ops-snapshot-cron.test.ts` ·
  [`tenants/ops-snapshot.md`](tenants/ops-snapshot.md)
- **`snapshot-data-plane-v1`** — Scope-aware portal snapshot CLI captures
  prediction/portal/gaps/limits manifests with flat grep-friendly metadata
  (incl. `lockHash`) and compile-time type contracts (`unit` + `boundary`)
  _Ratchet_ →
  `bun test tests/snapshot-data-plane.test.ts && bun run check:snapshot:types` ·
  [`tenants/prediction-report.md`](tenants/prediction-report.md)
- **`portal-snapshot-cron-v1`** — Bun.cron portal-snapshot tenant captures
  scope-aware data-plane snapshots (OS-persistent primary + in-process
  complement) with no-overlap UTC schedule (`unit` + `boundary` + `journey`)
  _Ratchet_ → `bun test tests/portal-snapshot-cron.test.ts` ·
  [`tenants/portal-snapshot-cron.md`](tenants/portal-snapshot-cron.md)
- **`channel-meta-verification-v1`** — Channel-aware Bun verification tags rows
  by subsystem; suite-aware saves isolate bundler/networking from
  release-features; suite=all merges meta-proof; prefer-artifact meta refresh
  bakes Pages via `ops:snapshot` / `verify:channel:meta`; `channelMeta` slice in
  ops-summary / static.json / ops dashboard (`unit` + `boundary`) _Ratchet_ →
  `bun test tests/channel-suite.test.ts tests/verification-subsystem.test.ts tests/bundler-loader-probes.test.ts tests/networking-channel.test.ts tests/verification-proof-taxonomy.test.ts tests/channel-meta-refresh.test.ts tests/verification-proof-consistency.test.ts`
  ·
  [`tenants/channel-meta-verification.md`](tenants/channel-meta-verification.md)
- **`spine-multi-tenant`** — spine runs ≥2 in-process tenants (docs-integrity +
  install-verify) (`journey` + `boundary`) _Ratchet_ →
  `bun run spine:schedule:once -- --tenant=install-verify` ·
  [`cron.md`](cron.md)
- **`spine-maintenance-runbooks`** — TenantRunbook + SignalMonitor; retirement
  attested + condition check; live `freshRerun` (`boundary` + `journey`)
  _Ratchet_ → `bun run test:tenant-runbooks` ·
  [`spine-tenants.md`](spine-tenants.md) ·
  [`maintenance.ts`](../../lib/harness/maintenance.ts) ·
  `assertRetirementConditionCheck`
- **`spine-tenant-heal`** — sandboxed E2E heal loop (break → signal → intervene
  → recover) (`journey`) _Ratchet_ → `bun run test:tenant-heal` ·
  [`heal-fixture.ts`](../../lib/harness/heal-fixture.ts) ·
  [`tenant-heal.test.ts`](../../tests/journey/tenant-heal.test.ts)
- **`code-quality-tenants`** — types · harness coverage · orphan modules ·
  complexity (`boundary` + `journey`) _Ratchet_ → `bun run test:code-quality` ·
  [`code-quality.md`](code-quality.md)
- **`harness-coverage-ratchet`** — lib/harness coverage ≥
  `coverage-baseline.json` _Ratchet_ → `bun run test:harness-coverage`
- **`harness-orphan-modules`** — every `lib/harness/*.ts` has an importer
  _Ratchet_ → `bun run check:harness-orphans`
- **`harness-complexity-floor`** — no `lib/harness` function exceeds
  `complexity-baseline.json` _Ratchet_ → `bun run check:harness-complexity`
- **`ci-deploy-runbooks`** — CI/deploy jobs have runbooks; `assertCICoverage`
  fail-closed _Ratchet_ → `bun run test:ci-deploy` ·
  [`ci-deploy.md`](ci-deploy.md)
- **CI/deploy child claims** — catalog-ownership; `freshRerunKind: 'catalog'`;
  paste proves catalog presence, not intervention (see
  [FRESH-RERUN.md](FRESH-RERUN.md) · Three catalogs). Each points at a runbook
  in [`CI_RUNBOOKS`](../../lib/harness/ci-deploy.ts) ·
  [`ci-deploy.md`](ci-deploy.md) _Ids_ → `ci-core-envelope` ·
  `typescript-ci-gate` · `deploy-production-preflight` · `deploy-staging-script`
  · `bun-migrate-status` _Fresh-rerun_ → `bun run docs:ci-deploy` (shared;
  prints live catalog) · fail-closed coverage → `ci-deploy-runbooks`

## Gate class

How each claim is enforced day-to-day. **SSOT:** `ProofPath.gateClass` +
`gateRef` in [`lib/harness/proof.ts`](../../lib/harness/proof.ts). Catalog meta
(completeness · evidence⊇freshRerun · `freshRerunKind`) always applies. Classes:

- **continuous** — `pre-commit-harness` and/or `ci:harness` / `ci:core` (Harness
  Gates)
- **workflow** — named GHA job outside that envelope (may also be a required
  status check)
- **human-only** — package script / `freshRerun` paste only (no always-on gate).
  Do **not** label a package script as `workflow` unless a `.github/workflows/*`
  job runs it.

| id                                 | class      | gate / workflow                                                                                                                                                      |
| ---------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `branded-ids`                      | continuous | pre-commit brands staged‖smart; `ci:harness` smart; types when branded staged or `--full`                                                                            |
| `bun-brand-cross-map`              | continuous | `ci:harness` · `bun run bun:brand-map:check`                                                                                                                         |
| `install-verify`                   | continuous | `ci:core` · harness-gates                                                                                                                                            |
| `install-verify-journey`           | human-only | `bun run test:install-verify`                                                                                                                                        |
| `test-changed`                     | continuous | `ci:harness` · harness-gates                                                                                                                                         |
| `search-governance`                | workflow   | `search-governance.yml` · `search:bench:gate`                                                                                                                        |
| `search-governance-basic`          | workflow   | `search-governance.yml` · `test:search-governance`                                                                                                                   |
| `runtime-cli-boundaries`           | continuous | `ci:harness` boundary-fixtures · `bun test tests/fixtures/runtime-cli/`                                                                                              |
| `bun-shell-boundaries`             | continuous | `ci:harness` boundary-fixtures · `bun test tests/fixtures/bun-shell/`                                                                                                |
| `fs-native-boundaries`             | continuous | `ci:harness` boundary-fixtures · fs-bun + bun-glob-scan                                                                                                              |
| `image-metadata-boundaries`        | human-only | `bun test ./tests/image-metadata.test.ts`                                                                                                                            |
| `deep-equals-boundaries`           | human-only | `bun test ./tests/deep-equals.test.ts`                                                                                                                               |
| `peek-settle-boundaries`           | human-only | `bun test ./tests/peek-settle.test.ts`                                                                                                                               |
| `bun-time-boundaries`              | human-only | `bun test ./tests/time.test.ts`                                                                                                                                      |
| `cloudflare-pages-env-ssot`        | human-only | `bun test tests/r2-env.test.ts`                                                                                                                                      |
| `terminal-pty-boundaries`          | human-only | `bun test ./tests/terminal.test.ts`                                                                                                                                  |
| `console-depth-boundaries`         | human-only | `bun test tests/console-depth.test.ts`                                                                                                                               |
| `color-kernel-theme-aliases`       | workflow   | `harness-gates.yml` · `bun run test:colors`                                                                                                                          |
| `monorepo-health-score`            | continuous | `ci:core` · `check:monorepo-health` · pre-commit `--tests-only` when health sources staged                                                                           |
| `github-repository-ref-boundaries` | human-only | `bun test tests/github-repository-ref.test.ts`                                                                                                                       |
| `github-issue-governance`          | continuous | `ci:harness` changed-test selection · `bun test tests/github-issue-tooling.test.ts`                                                                                  |
| `github-issue-taxonomy-public`     | continuous | `ci:harness` changed-test selection · `bun test tests/github-issue-taxonomy-public.test.ts`                                                                          |
| `macros-embed-boundaries`          | human-only | `bun test tests/macros/embed-commit.test.ts`                                                                                                                         |
| `security-hash-boundaries`         | continuous | `ci:harness` boundary-fixtures · `bun test tests/fixtures/security-hash/`                                                                                            |
| `url-pattern-boundaries`           | continuous | `ci:harness` boundary-fixtures · `bun test tests/bun-urlpattern.test.ts tests/bun-site-url.test.ts tests/factory-production.test.ts tests/portal-url-planes.test.ts` |
| `social-metadata-boundaries`       | continuous | `ci:harness` boundary-fixtures · `bun test tests/fixtures/social-metadata/`                                                                                          |
| `blog-extraction-boundaries`       | continuous | `ci:harness` boundary-fixtures · `bun test tests/fixtures/blog-extraction/`                                                                                          |
| `fetch-page-boundaries`            | continuous | `ci:harness` boundary-fixtures · `bun test tests/fixtures/fetch-page/`                                                                                               |
| `https-proxy-connect-reuse`        | continuous | `ci:harness` boundary-fixtures · `bun test tests/fetch-proxy-keepalive.test.ts`                                                                                      |
| `factory-registry-cli-v1`          | human-only | `bun test tests/registry.test.ts tests/cli.test.ts`                                                                                                                  |
| `factory-registry-pages-proxy-v1`  | human-only | `bun test tests/registry-pages-function.test.ts`                                                                                                                     |
| `factory-registry-integrity-v1`    | human-only | `bun test tests/factory-production.test.ts`                                                                                                                          |
| `blog-codeblocks-boundaries`       | continuous | `ci:harness` · `bun test tests/bun-blog-codeblocks.test.ts tests/blog-codeblock-join.test.ts`                                                                        |
| `blog-codeblocks-journey`          | human-only | `bun test tests/journey/blog-codeblocks-journey.test.ts`                                                                                                             |
| `multi-tenant-portal-v1`           | human-only | `bun test tests/registry-pages-function.test.ts`                                                                                                                     |
| `accounts-r2-v1`                   | human-only | `bun test tests/accounts-r2.test.ts`                                                                                                                                 |
| `operations-ssot-v1`               | human-only | operations Phase 1–3 unit suites                                                                                                                                     |
| `telegram-webhook-v1`              | human-only | `bun test tests/telegram-bot.test.ts`                                                                                                                                |
| `ops-loop-throughput`              | human-only | `bun test tests/ops-loop-hardening.test.ts`                                                                                                                          |
| `ops-snapshot-cron-v1`             | human-only | `bun test tests/ops-snapshot-cron.test.ts`                                                                                                                           |
| `snapshot-data-plane-v1`           | human-only | `bun test tests/snapshot-data-plane.test.ts && bun run check:snapshot:types`                                                                                         |
| `portal-snapshot-cron-v1`          | human-only | `bun test tests/portal-snapshot-cron.test.ts`                                                                                                                        |
| `channel-meta-verification-v1`     | continuous | `ci:harness` channel-meta step · also `check:release-tracker`                                                                                                        |
| `blog-extraction-journey`          | human-only | `bun test tests/journey/blog-extraction.test.ts`                                                                                                                     |
| `bun-http-server-docs`             | continuous | `ci:harness` boundary-fixtures · `bun test tests/bun-docs-catalog.test.ts`                                                                                           |
| `path-bun`                         | continuous | pre-commit (lib\|tools staged) · `ci:harness`                                                                                                                        |
| `bun-env`                          | continuous | pre-commit (lib\|scripts staged) · `ci:harness` · eslint `prefer-bun-env`                                                                                            |
| `invisible-chars`                  | continuous | pre-commit (spine/test .ts staged) · `ci:harness`                                                                                                                    |
| `unknown-param`                    | continuous | pre-commit / `ci:harness` eslint                                                                                                                                     |
| `day-loop-typecheck`               | workflow   | `typescript-checks.yml` · `type-check` (required check)                                                                                                              |
| `lib-docs-typecheck`               | workflow   | `typescript-checks.yml` · `type-check` (required check)                                                                                                              |
| `lib-utils-typecheck`              | workflow   | `typescript-checks.yml` · `type-check` (required check)                                                                                                              |
| `lib-core-typecheck`               | workflow   | `typescript-checks.yml` · `type-check` (required check)                                                                                                              |
| `lib-security-typecheck`           | workflow   | `typescript-checks.yml` · `type-check` (required check)                                                                                                              |
| `bun-cron`                         | human-only | `bun run test:cron`                                                                                                                                                  |
| `cron-os-persistent`               | human-only | `bun run test:cron-os`                                                                                                                                               |
| `docs-integrity`                   | human-only | `bun-doc-refs schedule --once` · spine tenant                                                                                                                        |
| `audit-findings-catalog`           | continuous | pre-commit (audit SSOT staged) · `ci:harness` · `bun run audit:verify`                                                                                               |
| `public-plane-discovery-v1`        | continuous | `ci:harness` public:discover · `bun run public:audit:verify`                                                                                                         |
| `reference-discovery-v1`           | continuous | `ci:harness` · `bun run discover:compose:check`                                                                                                                      |
| `spine-multi-tenant`               | human-only | `spine:schedule:once -- --tenant=install-verify`                                                                                                                     |
| `spine-maintenance-runbooks`       | human-only | `bun run test:tenant-runbooks` (live tenant freshReruns; heavy)                                                                                                      |
| `spine-tenant-heal`                | human-only | `bun run test:tenant-heal`                                                                                                                                           |
| `harness-coverage-ratchet`         | continuous | `ci:harness` dual-catalog · `test:code-quality`                                                                                                                      |
| `harness-orphan-modules`           | continuous | `ci:harness` dual-catalog · `test:code-quality`                                                                                                                      |
| `harness-complexity-floor`         | continuous | pre-commit staged `lib/harness`; also `test:code-quality` in `ci:harness`                                                                                            |
| `code-quality-tenants`             | continuous | `ci:harness` dual-catalog · `bun run test:code-quality`                                                                                                              |
| `ci-deploy-runbooks`               | continuous | `ci:harness` dual-catalog · `bun run test:ci-deploy`                                                                                                                 |
| `ci-core-envelope`                 | continuous | live gate `ci:core`; `freshRerun` = catalog `docs:ci-deploy`                                                                                                         |
| `typescript-ci-gate`               | workflow   | `typescript-checks.yml` (required); `freshRerun` = catalog                                                                                                           |
| `deploy-production-preflight`      | human-only | catalog via `docs:ci-deploy`; behavior = `deploy:production`                                                                                                         |
| `deploy-staging-script`            | human-only | catalog via `docs:ci-deploy`; behavior = `deploy:staging`                                                                                                            |
| `bun-migrate-status`               | human-only | catalog via `docs:ci-deploy`; behavior = `migrate:status`                                                                                                            |

Counts (must match `gateClass` tallies):

continuous 32 · workflow 9 · human-only 32.

Discover (display only, not gates): `bun run harness:status` ·
`bun run docs:fresh-rerun`.

## Lib surface — docs vs Bun vs other external

Routing for `lib/` modules. **Bun docs** = oven-sh / bun.com. **Other external**
= non-Bun (pinned types, thesis, Actions wire, etc.). Repo docs stay in-tree.

### Claim-backed

| Module / claim                                                                                 | Repo docs                                                                                                                                                                       | Bun docs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Other external                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `branded-ids` · `lib/types/branded*`                                                           | [`lib/types/branded/README.md`](../../lib/types/branded/README.md) · skill `.agents/skills/branded-ids/`                                                                        | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | [domain-modeling](https://github.com/lopopolo/harness-engineering/blob/trunk/docs/domain-modeling/README.md) · [parse, don’t validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/)           |
| `bun-time-boundaries` · `lib/time.ts`                                                          | claim in this file · `tests/time.test.ts`                                                                                                                                       | [utils](https://bun.com/docs/runtime/utils) (`nanoseconds`, `sleep`, `randomUUIDv7`, `version`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | —                                                                                                                                                                                                                     |
| `deep-equals-boundaries` · `lib/deep-equals.ts`                                                | claim · `tests/deep-equals.test.ts`                                                                                                                                             | [Bun.deepEquals](https://bun.com/docs/runtime/utils#bun-deepequals)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | —                                                                                                                                                                                                                     |
| `peek-settle-boundaries` · `lib/peek-settle.ts`                                                | claim · `tests/peek-settle.test.ts`                                                                                                                                             | [Bun.peek](https://bun.com/docs/runtime/utils#bun-peek)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | —                                                                                                                                                                                                                     |
| `terminal-pty-boundaries` · `lib/terminal.ts`                                                  | claim · `tests/terminal.test.ts`                                                                                                                                                | [Bun.Terminal / PTY](https://bun.com/docs/runtime/child-process#terminal-pty-support)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | —                                                                                                                                                                                                                     |
| `console-depth-boundaries` · `lib/console-depth.ts`                                            | [`AGENTS.md`](../../AGENTS.md) · [`BUN_NATIVE_CAPABILITIES.md`](../BUN_NATIVE_CAPABILITIES.md) · `tests/console-depth.test.ts` · bench `tools/benchmarks/console-depth-perf.ts` | [runtime/console](https://bun.com/docs/runtime/console) · [utils](https://bun.com/docs/runtime/utils) (`inspect` · `stringWidth`) · [markdown.ansi](https://bun.com/docs/runtime/markdown#ansi-terminal-output) · [color](https://bun.com/docs/runtime/color) · [sliceAnsi](https://bun.com/reference/bun/sliceAnsi)                                                                                                                                                                                                                                                                                                                                                                                                                   | [Bun repository](https://github.com/oven-sh/bun) · [bun-types source](https://github.com/oven-sh/bun/tree/main/packages/bun-types) · [1.3.14 pin](https://github.com/oven-sh/bun/tree/bun-v1.3.14/packages/bun-types) |
| `monorepo-health-score` · `lib/harness/monorepo-health*.ts`                                    | [`tenants/monorepo-health.md`](tenants/monorepo-health.md) · `bun run check:monorepo-health` · `scripts/monorepo-health-baseline.json`                                          | [Transpiler.scanImports](https://bun.com/docs/runtime/transpiler#scanimports) · [Glob](https://bun.com/docs/runtime/glob) · [sqlite](https://bun.com/docs/runtime/sqlite) · [semver](https://bun.com/docs/runtime/semver)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | —                                                                                                                                                                                                                     |
| `github-repository-ref-boundaries` · `lib/github-repository-ref.ts`                            | [`AGENTS.md`](../../AGENTS.md) · [`AUTHORITY.md`](AUTHORITY.md) · [`lib/docs/repo-docs.ts`](../../lib/docs/repo-docs.ts)                                                        | [Bun.env](https://bun.com/docs/runtime/utils#bun-env) · [spawnSync](https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | GitHub Actions `GITHUB_REPOSITORY*`                                                                                                                                                                                   |
| `github-issue-governance` · `lib/github-issue-tooling*.ts`                                     | [`tenants/github-issue-taxonomy.md`](tenants/github-issue-taxonomy.md) · `.github/ISSUE_TEMPLATE/harness.yml` · `tools/github-issue-doctor.ts`                                  | [Bun.fetch](https://bun.com/docs/runtime/networking/fetch) · [Bun.env](https://bun.com/docs/runtime/utils#bun-env)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | GitHub Issues and Labels REST API                                                                                                                                                                                     |
| `github-issue-taxonomy-public` · `lib/github-issue-taxonomy-public*.ts`                        | [`tenants/github-issue-taxonomy.md`](tenants/github-issue-taxonomy.md) · `tools/bake-github-issue-taxonomy.ts` · `/registry/github-issue-taxonomy.json`                         | [Bun.CryptoHasher](https://bun.com/docs/runtime/hashing) · [Bun.deepEquals](https://bun.com/docs/runtime/utils#bun-deepequals) · [Bun.file](https://bun.com/docs/runtime/file-io)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | GitHub label projection (credential-free)                                                                                                                                                                             |
| `macros-embed-boundaries` · `lib/macros/`                                                      | [`lib/macros/README.md`](../../lib/macros/README.md) · [`AUTHORITY.md`](AUTHORITY.md) · `tests/macros/embed-commit.test.ts`                                                     | [bundler](https://bun.com/docs/bundler/index) · [macros](https://bun.com/docs/bundler/macros) · [serializability](https://bun.com/docs/bundler/macros#serializability) · [plugins](https://bun.com/docs/bundler/plugins) (unused)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | —                                                                                                                                                                                                                     |
| `image-metadata-boundaries` · `lib/image-metadata.ts`                                          | claim · `lib/screenshot-remediation.ts` · `tests/image-metadata.test.ts`                                                                                                        | [Bun.Image](https://bun.com/docs/runtime/image#input)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | —                                                                                                                                                                                                                     |
| `url-pattern-boundaries` · `lib/docs/bun-site-url.ts` · `lib/portal/url-planes.ts`             | claim · `tests/bun-urlpattern.test.ts` · `tests/bun-site-url.test.ts` · `tests/factory-production.test.ts` · `tests/portal-url-planes.test.ts`                                  | [URLPattern](https://bun.com/blog/bun-v1.3.4#urlpattern-api) · [1.3.12 performance](https://bun.com/blog/bun-v1.3.12#urlpattern-is-up-to-2-3x-faster)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | —                                                                                                                                                                                                                     |
| `social-metadata-boundaries` · `lib/docs/extract-metadata.ts`                                  | claim · `tests/fixtures/social-metadata/`                                                                                                                                       | [HTMLRewriter social meta](https://bun.com/docs/guides/html-rewriter/extract-social-meta#extract-social-share-images-and-open-graph-tags) · [HTMLRewriter](https://bun.com/docs/runtime/html-rewriter)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | —                                                                                                                                                                                                                     |
| `blog-extraction-boundaries` · `lib/docs/blog-extract.ts`                                      | claim · `tests/fixtures/blog-extraction/`                                                                                                                                       | [HTMLRewriter](https://bun.com/docs/runtime/html-rewriter)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —                                                                                                                                                                                                                     |
| `fetch-page-boundaries` · `lib/docs/fetch-page.ts`                                             | claim · `tests/fixtures/fetch-page/`                                                                                                                                            | [fetch](https://bun.com/docs/runtime/networking/fetch#sending-an-http-request)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Bun issue [oven-sh/bun#21633](https://github.com/oven-sh/bun/issues/21633) (`fetch.preconnect` deferred)                                                                                                              |
| `https-proxy-connect-reuse` · `lib/net/proxy.ts`                                               | claim · `tests/fetch-proxy-keepalive.test.ts`                                                                                                                                   | [proxy guide](https://bun.com/docs/guides/http/proxy) · [Bun 1.3.12 ship note](https://bun.com/blog/bun-v1.3.12#keep-alive-for-https-proxy-connect-tunnels)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | —                                                                                                                                                                                                                     |
| `path-bun` · `lib/path-bun.ts`                                                                 | claim · `bun run check:path-bun`                                                                                                                                                | Bun path helpers (via `lib/path-bun` + `bun-doc-refs`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | —                                                                                                                                                                                                                     |
| `bun-env`                                                                                      | claim · `bun run check:bun-env`                                                                                                                                                 | [Bun.env](https://bun.com/docs/runtime/utils#bun-env) · [environment variables](https://bun.com/docs/runtime/environment-variables)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | —                                                                                                                                                                                                                     |
| `cloudflare-pages-env-ssot` · `config/r2-env.ts`                                               | [`tenants/cloudflare-pages.md`](tenants/cloudflare-pages.md) · `.env.example` · `public/index.html`                                                                             | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Cloudflare Pages / Wrangler (dashboard + API; not Bun)                                                                                                                                                                |
| harness ratchets (`coverage` · `orphans` · `complexity`)                                       | [`lib/harness/README.md`](../../lib/harness/README.md) · [`code-quality.md`](code-quality.md)                                                                                   | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | [harness-engineering](https://github.com/lopopolo/harness-engineering)                                                                                                                                                |
| type-check islands · `lib/{docs,utils,core,security}`                                          | claims `lib-*-typecheck` · `tsconfig.check.json`                                                                                                                                | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | —                                                                                                                                                                                                                     |
| `audit-findings-catalog` · `lib/audit/`                                                        | [`docs/audit/README.md`](../audit/README.md)                                                                                                                                    | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | —                                                                                                                                                                                                                     |
| `public-plane-discovery-v1` · `lib/public-discovery.ts`                                        | [`tenants/public-plane.md`](tenants/public-plane.md) · `tests/public-discovery.test.ts`                                                                                         | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Cloudflare Pages static plane                                                                                                                                                                                         |
| `reference-discovery-v1` · `lib/reference-discovery.ts`                                        | [`tenants/reference-discovery.md`](tenants/reference-discovery.md) · `tests/reference-discovery.test.ts`                                                                        | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | —                                                                                                                                                                                                                     |
| `factory-registry-cli-v1` · `lib/factory/`                                                     | claim this file · `tests/registry.test.ts` · `tests/cli.test.ts` · `object-store.ts` · `markdown.ts`                                                                            | [S3Client](https://bun.com/docs/runtime/s3#bun-s3client-bun-s3) · [Bun.semver](https://bun.com/docs/runtime/semver) · [Bun.file](https://bun.com/docs/runtime/file-io#reading-files-bun-file) · [Bun.write](https://bun.com/docs/runtime/file-io#writing-files-bun-write) · [Bun.CryptoHasher](https://bun.com/docs/runtime/hashing#bun-cryptohasher) · [Bun.env](https://bun.com/docs/runtime/utils#bun-env) · [Bun.markdown](https://bun.com/docs/runtime/markdown#bun-markdown-html) · [Bun.TOML](https://bun.com/docs/runtime/toml) · [Bun.inspect.table](https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options) · [Bun.spawn](https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn) | Cloudflare R2 (S3 SigV4)                                                                                                                                                                                              |
| `factory-registry-pages-proxy-v1` · `functions/api/registry/`                                  | claim this file · `tests/registry-pages-function.test.ts` · `public/portal/` · `public/registry/registry.json`                                                                  | [Pages Functions](https://developers.cloudflare.com/pages/functions/) · [R2 bindings](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/) — **no Bun.\* on edge**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Cloudflare Pages + R2 binding                                                                                                                                                                                         |
| `factory-registry-integrity-v1` · `lib/factory/{health,integrity,monitoring,alerts,server}.ts` | [`tenants/registry-integrity.md`](tenants/registry-integrity.md) · `tests/factory-production.test.ts`                                                                           | [Bun.cron](https://bun.com/docs/runtime/cron) · [Bun.CryptoHasher](https://bun.com/docs/runtime/hashing#bun-cryptohasher) · [Bun.serve](https://bun.com/docs/runtime/http/server)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Cloudflare Pages + R2 binding · Slack · Telegram                                                                                                                                                                      |

### Inventory-only (no dedicated claim yet)

| Module                                                                                                                                  | Repo docs                                                                       | Bun docs                                                                                                                                                                                                                                                                                                | Other external                                   |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `lib/gate-map.ts` · `lib/gate-report-monorepo.ts`                                                                                       | file headers · `.agents/skills/ast-grep/gate-map.json`                          | [Bun.env](https://bun.com/docs/runtime/utils#bun-env) · [Bun.file](https://bun.com/docs/runtime/file-io) · [Bun.spawn](https://bun.com/docs/runtime/child-process)                                                                                                                                      | kimi-toolchain JSON summary (optional gate step) |
| `lib/projects-scan.ts`                                                                                                                  | file header · `bun run registry:projects` consumers                             | [Glob](https://bun.com/docs/runtime/glob) · [Bun.file](https://bun.com/docs/runtime/file-io) · [spawnSync](https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync) · [Bun.which](https://bun.com/docs/runtime/utils#bun-which) · [Bun.peek](https://bun.com/docs/runtime/utils#bun-peek) | —                                                |
| `lib/text.ts`                                                                                                                           | slugify helpers (Mintlify/GitHub-style)                                         | [Bun.stringWidth](https://bun.com/docs/runtime/utils#bun-stringwidth) (related width work lives in console-depth)                                                                                                                                                                                       | —                                                |
| `lib/index.ts`                                                                                                                          | barrel re-exports                                                               | —                                                                                                                                                                                                                                                                                                       | —                                                |
| `lib/mcp/` · `lib/r2/` · `lib/rss/` · `lib/package/` · `lib/ai/` · `lib/theme/` · `lib/performance/` · `lib/shared/` · `lib/constants/` | domain [`README.md`](../../lib/README.md) indexes · `bun run lib:domains:check` | varies per module `@see`                                                                                                                                                                                                                                                                                | product/Cloudflare/R2 as applicable              |

Resolve Bun URLs via `bun tools/bun-doc-refs.ts suggest "<api>"` before
inventing new `@see` lines.

## Fresh-rerun

Every path above has a `freshRerun` command in
[`lib/harness/proof.ts`](../../lib/harness/proof.ts). _Ratchet_ →
[`FRESH-RERUN.md`](FRESH-RERUN.md) · paste command output in the PR body when
touching the claim’s owner.

## New claim → discovery first

Do not invent a `ProofPath` by editing files ad hoc. Fill
[`CLAIM-DISCOVERY.md`](CLAIM-DISCOVERY.md) (Q0–Q14) so ceremony path (slim vs
full), `claim` / `kinds` / `gateClass` / `gateRef` / `evidence` / `freshRerun` /
`freshRerunKind`, contract asserts, and PR paste are decided before code.
_Ratchet_ → `bun run docs:claim-discovery` · answered questionnaire in the PR or
commit trail

## Verification lane taxonomy (Bun product pillars)

Each proof row carries `subsystem` (orthogonal to release `channel` in
`semanticTags`). SSOT:
[`lib/verification/types.ts`](../../lib/verification/types.ts) ·
[`lib/verification/subsystem.ts`](../../lib/verification/subsystem.ts) ·
[`tools/canonical-helpers.ts`](../../tools/canonical-helpers.ts).

| Subsystem         | Script                                                                             | Lib module                                                    | Proof JSON                                                                | Canonical source                    |
| ----------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------- |
| `runtime`         | `tools/verify-bun-release.ts`                                                      | `lib/docs/bun-release-tracker.ts`                             | `public/registry/release-features.json`                                   | Blog anchors + living runtime docs  |
| `runtime`         | `tools/verify-bun-runtime-nits.ts`                                                 | `lib/verification/bun-runtime-nits-probes.ts`                 | `public/registry/bun-runtime-nits-proof.json`                             | `CANONICAL_RUNTIME_NITS_TOKENS`     |
| `package-manager` | `tools/verify-install-platform.ts`                                                 | `lib/verification/install-platform.ts`                        | `public/registry/install-platform.json`                                   | `CANONICAL_INSTALL_PLATFORM_TOKENS` |
| `package-manager` | `tools/verify-install-env.ts`                                                      | `lib/verification/install-env-probes.ts`                      | `public/registry/install-env-proof.json`                                  | `CANONICAL_INSTALL_ENV_TOKENS`      |
| `networking`      | `tools/verify-networking.ts --save` · `tools/verify-channel.ts --suite=networking` | `lib/http/networking-proof.ts`                                | `public/registry/networking-proof.json` · `networking-channel-proof.json` | fetch/DNS/preconnect docs           |
| `bundler`         | `tools/verify-bundler.ts` (optional)                                               | `lib/verification/bundler-loader-probes.ts`                   | `public/registry/bundler-loaders-proof.json`                              | bundler/loaders docs                |
| _(meta)_          | `tools/verify-proof-taxonomy.ts --save`                                            | `lib/verification/proof-taxonomy.ts` · `proof-consistency.ts` | `public/registry/proof-taxonomy-audit.json`                               | contract shape + cross-proof parity |

Each proof row may carry `subsystem`, `introducedIn`, `canonicalKey`,
`canonicalKind`, `canonicalStability` (see
[`tools/canonical-helpers.ts`](../../tools/canonical-helpers.ts)).

_Ratchet_ → `bun run verify-all` · `bun run verify:proof-taxonomy` ·
`bun run check:release-tracker` ·
`bun test tests/verification-canonical-coverage.test.ts` ·
`bun test tests/canonical-helpers.test.ts` ·
`bun test tests/verification-proof-consistency.test.ts` ·
`bun test tests/verification-proof-taxonomy.test.ts`

## Agent checklist before “done”

1. For a **new** claim: complete [`CLAIM-DISCOVERY.md`](CLAIM-DISCOVERY.md)
   (slim or full path from Q0).
2. State the claim in one sentence (`ProofPath.claim`).
3. Pick kind(s), `gateClass` + `gateRef`, `freshRerunKind` (`claim` |
   `catalog`), and `owner`.
4. Parent catalogs only: set `childIds` (CI / CQ / spine) so dual-catalog
   membership can’t drift.
5. Point at evidence paths or commands that actually ran.
6. If the change touches a claim owner, run that claim’s `freshRerun` and keep
   the output (PR body) — [`FRESH-RERUN.md`](FRESH-RERUN.md).
7. If evidence is missing, either run it or downgrade the claim.

Code SSOT: [`lib/harness/proof.ts`](../../lib/harness/proof.ts). Discover:
`bun run harness:status` · `bun run docs:fresh-rerun` ·
`bun run docs:claim-discovery`.
