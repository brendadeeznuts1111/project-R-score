# Project-R CLI Constants & Flags Reference

Operator-facing Flag tables and agent verification for **long-option
allowlists** already enforced in code.

Code SSOT (do **not** invent a parallel allowlist module):

| Piece                             | Path                                                                                                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Allowlists + guard                | [`lib/docs/ref-id-tool-flags.ts`](../../lib/docs/ref-id-tool-flags.ts) · `ALLOWED_LONG_REGISTRY` · `applyUnknownLongOptionGuardFor`                                     |
| Env toggles only                  | `BUN_STRIP_UNKNOWN` · `BUN_LOG_UNKNOWN` (`BUN_UNKNOWN_FLAG_ENV`) — **harness**, not bun-types                                                                                                                                        |
| REF:ID prove                      | `bun run docs:refid:check` · `bun test tests/docs-ref-id-tool-exports.test.ts`                                                                                          |
| Agent one-shot                    | `bun run cli:flags:check`                                                                                                                                               |
| Bun create / init / runtime knobs | [`AUTHORITY.md`](AUTHORITY.md) · [`lib/env-check.ts`](../../lib/env-check.ts) · [AGENTS § Unknown long options](../../AGENTS.md#unknown-long-options-bun_strip_unknown) |

> **Accuracy note:** Leaves in the registry are **unprefixed** (`chat`, not
> `--chat`). `--help` / `--hlp` are always exempt. `lint-wires` is registered.
> Subcommands (`send`, `directory`, `readiness`, …) are **positional**.

---

## 1. Overview

CLIs call `applyUnknownLongOptionGuardFor('<cli>', argv)` (or the leaf form)
before parsing.

| Mode                 | Env                      | Behavior                                                             |
| -------------------- | ------------------------ | -------------------------------------------------------------------- |
| **Strict** (default) | unset / not `true`       | Unknown `--*` → `❌` + Allowed list → **exit 2** (or throw → exit 1) |
| **Strip**            | `BUN_STRIP_UNKNOWN=true` | Drop unknowns; warn unless `BUN_LOG_UNKNOWN=false`                   |

---

## 2. CLI flag allowlists (`ALLOWED_LONG_REGISTRY`)

Leaves below mirror
[`ALLOWED_LONG_REGISTRY`](../../lib/docs/ref-id-tool-flags.ts). Extend there
first, then this table, then `docs:refid:check` when REF:ID leaves change.

### 2.1 `telegram:ops` (`TELEGRAM_OPS_ALLOWED_LONG`)

Entry: [`tools/telegram-ops.ts`](../../tools/telegram-ops.ts).

| Flag             | Alias | Type                | Required | Default        | Description                                                | Example                        |
| ---------------- | ----- | ------------------- | -------- | -------------- | ---------------------------------------------------------- | ------------------------------ |
| `--chat`         | —     | string (repeatable) | yes\*    | —              | Target chat id (\*or `--all`)                              | `… send --chat -100123 "ping"` |
| `--all`          | —     | boolean             | yes\*    | false          | All chats matching `--kind`                                | `… send --all "ok"`            |
| `--kind`         | —     | enum                | no       | `active`       | `active`\|`inactive`\|`all`\|`group`\|`private`\|`channel` | `… --kind group`               |
| `--surface`      | —     | string              | no       | —              | `hq` \| `ash-staging` \| `sandbox`                         | `… --surface ash-staging`      |
| `--queue`        | —     | boolean             | no       | false          | Enqueue via outbox (not a queue name)                      | `… send --all --queue "text"`  |
| `--direct`       | —     | boolean             | no       | true†          | Immediate send (†when `--queue` omitted)                   | `… --direct`                   |
| `--preview`      | —     | boolean             | no       | false          | Resolve targets only                                       | `… --preview`                  |
| `--html`         | —     | boolean             | no       | false          | `parse_mode=HTML`                                          | `… --html`                     |
| `--db`           | —     | path                | no       | ops DB default | Ops SQLite path                                            | `… --db data/operations.db`    |
| `--json`         | —     | boolean             | no       | false          | JSON output                                                | `… directory --json`           |
| `--refresh`      | —     | boolean             | no       | false          | Refresh known-chat titles                                  | `… directory --refresh`        |
| `--rich`         | —     | boolean             | no       | false          | Rich directory join                                        | `… directory --rich`           |
| `--mermaid`      | —     | boolean             | no       | false          | Graph as Mermaid                                           | `… graph --mermaid`            |
| `--env`          | —     | boolean             | no       | false          | Graph `.env` block                                         | `… graph --env`                |
| `--sync-env`     | —     | boolean             | no       | false          | Sync telegram env                                          | `… graph --sync-env`           |
| `--detail`       | —     | boolean             | no       | false          | Readiness detail                                           | `… readiness --detail`         |
| `--deep`         | —     | boolean             | no       | false          | Readiness per-lane audit                                   | `… readiness --detail --deep`  |
| `--live`         | —     | boolean             | no       | false          | Live Telegram probes                                       | `… readiness --live`           |
| `--invite`       | —     | string              | no       | —              | link-package-group invite                                  | handshake §1.1                 |
| `--no-dm`        | —     | boolean             | no       | false          | Skip DM                                                    | handshake §1.1                 |
| `--no-ack`       | —     | boolean             | no       | false          | Skip ack                                                   | handshake §1.1                 |
| `--requested-by` | —     | string              | no       | —              | Requestor id                                               | handshake §1.1                 |
| `--force`        | —     | boolean             | no       | false          | Force (subcommand-specific)                                | —                              |
| `--dry-run`      | —     | boolean             | no       | false          | Dry run                                                    | —                              |
| `--help`         | `-h`  | boolean             | no       | false          | Help (always exempt)                                       | `… --help`                     |

Tenant: [`telegram-factory.md`](tenants/telegram-factory.md) · handshake
[`partner-package-group-handshake.md`](tenants/partner-package-group-handshake.md).

### 2.2 `partner:onboard` (`PARTNER_ONBOARD_ALLOWED_LONG`)

| Flag                                                                                                               | Type                     | Notes |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------ | ----- |
| `--code` `--url` `--username` `--password` `--telegram-user-id` `--chat` `--book-key` `--type` `--maxBet` `--name` | identity/book            |       |
| `--deal` `--currency` `--hold-target` `--initial-balance` `--funding-method`                                       | accounting (REF:ID §1.1) |       |
| `--dry-run` `--skip-forum` `--no-bake`                                                                             | control                  |       |

### 2.3 `images:generate` (`IMAGES_GENERATE_ALLOWED_LONG`)

`--template` plus Flags-table leaves: `source` `out` `size` `format` `quality`
`fit` `max-pixels` `json` `dry-run`. Doc: [`docs/IMAGES.md`](../IMAGES.md).

### 2.4 `ops:snapshot` (`OPS_SNAPSHOT_ALLOWED_LONG`)

Seed REF:ID leaves: `seed` `seed-force` `seed-tenants` `no-seed` (+ conceptual
`default`). Bake toggles: `out` `no-report` `webview` `no-routing` `no-static`
`force-routing` `publish` `no-channel-meta` `no-compliance` `no-monorepo-health`
`no-toc-limits` `seed-toc-limits-force`.

### 2.5 `lint-wires` (`LINT_WIRES_ALLOWED_LONG`)

`help` `scan` `why` `document` `strict-globs` `rules` `fix`.

---

## 3. Environment variables (guard toggles only)

| Env                      | Default           | Effect                                |
| ------------------------ | ----------------- | ------------------------------------- |
| `BUN_STRIP_UNKNOWN`      | unset             | Strict fail                           |
| `BUN_STRIP_UNKNOWN=true` | —                 | Strip unknowns                        |
| `BUN_LOG_UNKNOWN`        | on when stripping | Set `false` to silence strip warnings |

Allowlists are **never** loaded from env JSON.

---

## 4. Agent verification

```bash
bun run cli:flags:check
bun test tests/docs-ref-id-tool-exports.test.ts
bun run docs:refid:check
```

| Scenario             | Command                                                                               | Exit            | Log pattern                                         |
| -------------------- | ------------------------------------------------------------------------------------- | --------------- | --------------------------------------------------- |
| Unknown telegram:ops | `bun tools/telegram-ops.ts send --chat 123 --typo`                                    | 2               | `❌ Unknown long option(s) in telegram:ops: --typo` |
| Strip mode           | `BUN_STRIP_UNKNOWN=true bun tools/telegram-ops.ts send --chat 123 --typo --preview x` | ≠2 from unknown | `BUN_STRIP_UNKNOWN=true — stripping`                |
| Partner onboard      | `bun tools/partner-onboard.ts --bad`                                                  | 1 (throw)       | `❌` + `unknown flag(s)`                            |
| Images               | `bun scripts/images-generate.ts --typo`                                               | 1 (throw)       | `❌`                                                |
| Ops snapshot         | `bun tools/ops-snapshot.ts --typo`                                                    | 2               | `❌`                                                |
| bun:pr:verify        | `bun tools/bun-pr-verify.ts 1 --typo`                                                 | 1 (throw)       | `❌ Unknown long option(s) in bun:pr:verify: --typo` |
| bun:pr:verify strip  | `BUN_STRIP_UNKNOWN=true bun tools/bun-pr-verify.ts 99999 --typo`                      | 1 (missing bin) | `stripping` + `bun-99999 not on PATH`               |
| bun:release-contracts | `bun tools/bun-release-contracts.ts --typo`                                          | 1 (throw)       | `❌ Unknown long option(s) in bun:release-contracts: --typo` |
| screenshot           | `bun tools/screenshot-cli.ts --typo`                                                  | 1 (throw)       | `❌ Unknown long option(s) in screenshot: --typo`   |
| bun:runtime-pin      | `bun tools/bun-runtime-pin.ts --typo`                                                 | 2               | `❌`                                                |
| glossary:health      | `bun tools/glossary-health.ts --typo`                                                 | 2               | `❌`                                                |
| cloudflare:env:validate | `bun tools/cloudflare-env-validate.ts --typo`                                      | 2               | `❌`                                                |
| routing:registry-proof | `bun tools/routing-registry-proof.ts --typo`                                        | 2               | `❌`                                                |

### 2.7 Compact tool allowlists (no Flags table)

| Registry key | Leaves | Entry |
| ------------ | ------ | ----- |
| `bun:runtime-pin` | `json` | [`tools/bun-runtime-pin.ts`](../../tools/bun-runtime-pin.ts) |
| `glossary:health` | `json` · `local` | [`tools/glossary-health.ts`](../../tools/glossary-health.ts) |
| `cloudflare:env:validate` | `json` · `strict` | [`tools/cloudflare-env-validate.ts`](../../tools/cloudflare-env-validate.ts) |
| `routing:registry-proof` | `write` · `publish` · `json` · `no-fail` · `no-previous` · `base` · `concurrency` | [`tools/routing-registry-proof.ts`](../../tools/routing-registry-proof.ts) |
| `ops:seed:toc` | `force` | [`tools/ops-seed-toc.ts`](../../tools/ops-seed-toc.ts) |
| `discovery:compose` | `json` · `check` · `skip-unused` · `min-severity` | [`tools/discovery-compose.ts`](../../tools/discovery-compose.ts) |
| `public:discovery` | `json` · `check` · `min-severity` | [`tools/public-discovery.ts`](../../tools/public-discovery.ts) |
| `schema:audit` | `json` · `json-only` · `write` | [`tools/schema-audit.ts`](../../tools/schema-audit.ts) |
| `telegram:handshake:catalog` | `json` | [`tools/telegram-handshake-catalog.ts`](../../tools/telegram-handshake-catalog.ts) |
| `concept:health` | `period` · `output` | [`scripts/concept-health.ts`](../../scripts/concept-health.ts) |
| `ops:loop:gate-backfill` | `dry-run` · `no-outbox` · `r2` | [`tools/ops-loop-gate-backfill.ts`](../../tools/ops-loop-gate-backfill.ts) |
| `ops:limits:check` | `partner` · `all` · `hours` · `clv` · `multi` · `capture` · `alerts` · `seed` · `force-seed` · `json` · `inspect` | [`tools/ops-check-limits.ts`](../../tools/ops-check-limits.ts) |
| `identity:admin` | `as` · `db` · `json` · `limit` · `password` | [`tools/identity-admin.ts`](../../tools/identity-admin.ts) |
| `provision:queue` | `dry-run` · `email` · `id` · `mode` · `partner` · `pass` · `platform` · `step` · `to` · `user` | [`tools/provision-queue.ts`](../../tools/provision-queue.ts) |
| `monorepo:health` | `archive` · `inspect` · `interactive` · `interval` · `json` · `no-build` · `no-history` · `validate` · `watch` · `with-coverage` · `with-tests` | [`tools/monorepo-health.ts`](../../tools/monorepo-health.ts) |
| `brand:status` | `once` · `repl` · `docs` · `watch` · `every` · `json` · `verbose` · `compact` · `lifecycle` · `flags` · `plane` · `lineage` · `zone` | [`tools/brand-status.ts`](../../tools/brand-status.ts) |
| `docs:refid` | `strict-format` · `refid-strict` · `dry-run` · `registry-only` · `skip-refid-check` · `write-hrefs` · `json` · `section` · `keyword` · `flag` · `leaf` · `doc` · `section-ref` · `section-heading` · `script` · `shortcode` · `default` · `all` · `roots` | [`tools/docs-refid.ts`](../../tools/docs-refid.ts) |
| `concept:audit` | watch · strict · output · filters (28 leaves) | [`scripts/concept-audit.ts`](../../scripts/concept-audit.ts) |
| `concept:registry:graph` | `output` · `orphans` · `centrality` | [`scripts/concept-registry-graph.ts`](../../scripts/concept-registry-graph.ts) |
| `concept:discover` | `scan` · `auto-propose` · `output` | [`scripts/concept-discover.ts`](../../scripts/concept-discover.ts) |
| `seat:desk` | `field` · `force-new` · `no-pin` · `no-publish` · `post` · `json` · `template` · `intake-only` · `rails-only` · `thread-id` | [`tools/seat-desk-cli.ts`](../../tools/seat-desk-cli.ts) |
| `packages:metafile-audit` | json · md · diff · out · glob · full-metafile · include-tests · cross-check · map · bake · shallow · apply-actions · dry-run · vault · vault-gap · env · no-pkg-json · strict · strict-actions (19) | [`tools/packages-metafile-audit.ts`](../../tools/packages-metafile-audit.ts) |
| `harness:violations` | `json` · `open` · `path` · `rule` · `legacy-brands` · `limit` | [`tools/harness-violations.ts`](../../tools/harness-violations.ts) |
| `portal:cli` | doctor · scanner · snapshot · graph · secret · flags · bunfig (union; ~50 leaves) | [`tools/portal-cli.ts`](../../tools/portal-cli.ts) — passthrough `pm` / `secret` / `probe` skip guard; Bun exec flags peeled first |
| `bun:brand-map` | `check` · `write-baseline` · `json` | [`tools/bun-brand-map.ts`](../../tools/bun-brand-map.ts) |
| `env:inventory` | `json` · `vault-only` · `ratchet` · `write-baseline` · `bake` | [`scripts/env-inventory.ts`](../../scripts/env-inventory.ts) |
| `check:import-graph` | `json` · `write-baseline` | [`scripts/check-import-graph.ts`](../../scripts/check-import-graph.ts) |
| `check:console-format` | `staged` · `write-baseline` | [`scripts/lint-console-format.ts`](../../scripts/lint-console-format.ts) |
| `concept:review` | `list` · `output` · `id` · `approve` · `reject` · `reason` · `correlation-id` | [`scripts/concept-review.ts`](../../scripts/concept-review.ts) |
| `concept:deprecate` | `replace-by` · `reason` | [`scripts/concept-deprecate.ts`](../../scripts/concept-deprecate.ts) |
| *(team bulk)* | package.json entrypoints with `--*` | `ALLOWED_LONG_REGISTRY` (~300 keys) · coverage: `bun scripts/cli-allowlist-coverage.ts` · plan/wire: `cli-allowlist-team-plan` / `wire-batch` / `apply-registry` |
| `verify:portal` … `verify:*` | per-tool leaves (split from shared `verify-all`) | `tools/verify-*.ts` — never share one key across verify tools |
| `bake:doctor` | `check` · `full` · `no-portable` · `report` | [`tools/bake-doctor.ts`](../../tools/bake-doctor.ts) |
| `machine:bunfig:ensure` | `check` · `overwrite` | [`scripts/ensure-machine-bunfig.ts`](../../scripts/ensure-machine-bunfig.ts) |
| `ops:seed:partners` / `:tenants` / `:dod` / `:prediction` | `force` each | split from shared `ops:seed:all` |

### 2.8 Coverage goal (agent team)

| Command | Role |
| ------- | ---- |
| `bun scripts/cli-allowlist-coverage.ts` | % of package.json tools/scripts entrypoints with long options that call the guard |
| `bun scripts/cli-allowlist-team-plan.ts --write` | Partition remaining into `artifacts/cli-allowlist-team/batch-*.json` |
| `bun scripts/cli-allowlist-apply-registry.ts --write` | Merge plan leaves into `ALLOWED_LONG_REGISTRY` |
| `bun scripts/cli-allowlist-wire-batch.ts --batch=N --write` | Auto-wire common argv patterns for one batch |

Target: **100%** of package.json entrypoints that parse `--*` long options.

---

## 5. Extending allowlists

1. Add the leaf to the matching `*_ALLOWED_LONG` (and `*_LEAVES` when REF:ID).
2. Parse it in the owning CLI.
3. Update this document + Flags table in the paired design/tenant doc.
4. `bun run docs:refid:check` · `bun run cli:flags:check`.

Forgetting step 1 → fail/throw in strict mode.

---

## 6. Upstream Bun: `bunx bun-pr` + Project-R `bun:pr:verify`

| Piece | Detail |
| ----- | ------ |
| **Upstream** `bunx bun-pr` | oven-sh helper — **not** in `ALLOWED_LONG_REGISTRY`; do not invent its flags here |
| Auth | **`gh auth login`** primary; `GITHUB_TOKEN` / `GH_TOKEN` also work |
| Invoke fetch | `bunx bun-pr <pr\|branch\|URL>` · `bun run bun:pr:fetch -- <pr>` · `--asan` (Linux x64) |
| **Project-R** verify | `bun run bun:pr:verify -- <pr> [--proof=api\|runtime\|release\|all] [--json]` · [`tools/bun-pr-verify.ts`](../../tools/bun-pr-verify.ts) |
| Allowlist | `ALLOWED_LONG_REGISTRY['bun:pr:verify']` → `proof` · `json` (positional PR number) |
| Docs | [contributing § download](https://bun.com/docs/project/contributing#download-release-build-from-pull-requests) · [`AUTHORITY.md`](AUTHORITY.md) · [`tenants/bun-upstream-contributing.md`](tenants/bun-upstream-contributing.md) |

### 2.6 `bun:pr:verify` (`BUN_PR_VERIFY_ALLOWED_LONG`)

| Flag | Type | Description |
| ---- | ---- | ----------- |
| `--proof=…` | enum | `api` · `runtime` · `release` · `all` (default) |
| `--json` | boolean | Machine summary via `cliOut` |
| `<pr>` | positional | PR number (required) |

### 2.6.1 `bun:release-contracts` (`BUN_RELEASE_CONTRACTS_ALLOWED_LONG`)

| Flag | Type | Description |
| ---- | ---- | ----------- |
| `--all` | boolean | Generate every stable release in the Bun RSS feed |
| `--since` | version | With `--all`, include releases at or after this version |
| `--limit` | int | With `--all`, limit releases newest-first |
| `--concurrency` | int | Concurrent blog fetches (default 4, max 8) |
| `--check` | boolean | Drift-check only (no writes) |
| `--output-dir` | path | Inventory output directory |
| `--json` | boolean | Machine summary via `cliOut` |
| `--help` | boolean | Usage |

Entry: [`tools/bun-release-contracts.ts`](../../tools/bun-release-contracts.ts) · package
[`packages/bun-release-contracts`](../../packages/bun-release-contracts).

### 2.6.2 `screenshot` (`SCREENSHOT_ALLOWED_LONG`)

| Flag | Type | Description |
| ---- | ---- | ----------- |
| `--subject` | string | Evidence subject label |
| `--out-dir` | path | Capture output directory |
| `--timeout-ms` | int | WebView navigate timeout |
| `--no-placeholder` | boolean | Fail instead of placeholder PNG |
| `--json` | boolean | Machine summary via `cliOut` |
| `--help` | boolean | Usage |

Commands (positionals): `capture` · `verify` · `remediate` · `meta`.
Entry: [`tools/screenshot-cli.ts`](../../tools/screenshot-cli.ts).
