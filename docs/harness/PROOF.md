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
| `security-hash-boundaries` | continuous | `ci:harness` boundary-fixtures · `bun test tests/fixtures/security-hash/` |
| `url-pattern-boundaries` | continuous | `ci:harness` boundary-fixtures · `bun test tests/bun-site-url.test.ts` |
| `social-metadata-boundaries` | continuous | `ci:harness` boundary-fixtures · `bun test tests/fixtures/social-metadata/` |
| `blog-extraction-boundaries` | continuous | `ci:harness` boundary-fixtures · `bun test tests/fixtures/blog-extraction/` |
| `fetch-page-boundaries` | continuous | `ci:harness` boundary-fixtures · `bun test tests/fixtures/fetch-page/` |
| `blog-extraction-journey` | human-only | `bun test tests/journey/blog-extraction.test.ts` |
| `bun-http-server-docs` | continuous | `ci:harness` boundary-fixtures · `bun test tests/bun-docs-catalog.test.ts` |
| `path-bun` | continuous | pre-commit (lib\|tools staged) · `ci:harness` |
| `bun-env` | continuous | pre-commit (lib\|scripts staged) · `ci:harness` · eslint `prefer-bun-env` |
| `unknown-param` | continuous | pre-commit / `ci:harness` eslint |
| `day-loop-typecheck` | workflow | `typescript-checks.yml` · `type-check` (required check) |
| `lib-docs-typecheck` | workflow | `typescript-checks.yml` · `type-check` (required check) |
| `lib-utils-typecheck` | workflow | `typescript-checks.yml` · `type-check` (required check) |
| `lib-core-typecheck` | workflow | `typescript-checks.yml` · `type-check` (required check) |
| `lib-security-typecheck` | workflow | `typescript-checks.yml` · `type-check` (required check) |
| `bun-cron` | human-only | `bun run test:cron` |
| `cron-os-persistent` | human-only | `bun run test:cron-os` |
| `docs-integrity` | human-only | `bun-doc-refs schedule --once` · spine tenant |
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

Counts (must match `gateClass` tallies): continuous 21 · workflow 8 · human-only 11.

Discover (display only, not gates): `bun run harness:status` · `bun run docs:fresh-rerun`.

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
