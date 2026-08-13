# Contributing

## Setup

- **Bun** 1.4.0 (`packageManager` in root `package.json`)
- Clone [project-R-score](https://github.com/brendadeeznuts1111/project-R-score)
- `bun install` · `bun run install:verify` · `bun run help`

## Day loop

```bash
bun run type-check
bun run test:changed          # Bun-native --changed (dirty tree)
bun run test:dev              # watch monorepo tests/
bun run ci:harness:fast       # local parity
bun run harness:status
```

`test:changed` stays the day-loop default. CI artifact path is `bun run test:ci`
(JUnit). Live Inspector TestReporter stream (orthogonal, not a Jest plugin):
`bun run test:inspect`. Flag × script matrix:
[`docs/harness/tenants/bun-test-flags.md`](../harness/tenants/bun-test-flags.md)
· Inspector tenant:
[`docs/harness/tenants/bun-test-inspect.md`](../harness/tenants/bun-test-inspect.md).

Full testing / hooks map: [DEVELOPMENT-WORKFLOW.md](../DEVELOPMENT-WORKFLOW.md).

## Markdown

All governed Markdown must pass `bun run check`; use `bun run check:docs` for
source-only validation and `bun run bun:ci` for the wider repository proof. See
the [Markdown Contributor Guide](../markdown/CONTRIBUTING_MARKDOWN.md) for the
day loop and the numbered
[Bun Markdown API Reference and repository contract](../markdown/API_REFERENCE.md)
for parser, callback, ANSI, React, validation, and TypeScript behavior.

## REF:ID Validation

Design-doc **REF:ID**s are numbered fragment ids for operator flags / TOC
(baseline:
[`docs/design/bun-types-inventory.md`](../design/bun-types-inventory.md) §4.1).
They keep flags tables, HTML anchors, TOC links, and tool code (`flagDocRef`) in
sync.

### Rules (v2)

| Rule      | Example / note                                                          |
| --------- | ----------------------------------------------------------------------- |
| Shape     | `{section}.{kebab-keyword}` → `4.1.refresh` · `4.1.max-age-days`        |
| href      | Always `#` + REF:ID (table may use empty / `—` / `auto` to derive)      |
| Keyword   | kebab-case, 2–32 chars, no leading/trailing `-`                         |
| Reserved  | Never use leaves `index` · `top` · `toc` · `anchor`                     |
| Unique    | One REF:ID / `<a id>` value per document                                |
| Tooling   | Code flag rows must match anchors (`requireToolCoverage`)               |
| Placement | Section id (e.g. `4.1`) on the line immediately above the Flags heading |

Style summary also lives in
[DEVELOPMENT-STANDARDS.md — REF:ID](../DEVELOPMENT-STANDARDS.md#refid-design-doc-flags--toc).
Library: [`lib/docs/ref-id.ts`](../../lib/docs/ref-id.ts).

### Commands

```bash
# Validate coverage planes + discovery (soft format warns)
bun run docs:refid:check
# Same; format issues fail
bun run docs:refid:check:strict
# Hard/guide registry only (skip project discovery globs)
bun tools/docs-refid.ts check --registry-only
# Report-only (never fails) + inventory of Flags tables across docs/
bun run docs:refid:check:dry-run
# Machine planes + registry (design · portal · harness · discovery)
bun run docs:refid:check --json
# Inventory only: registered · Flags-only candidates · leave-as-is
bun run docs:refid:audit
bun run docs:refid:audit --json
# Multi-command CLI
bun tools/docs-refid.ts help
bun tools/docs-refid.ts check --json
bun tools/docs-refid.ts suggest --section=4.1 --flag=--foo-bar
bun tools/docs-refid.ts list
bun tools/docs-refid.ts scaffold --section=4.1 --flag=--new-flag
# Included in doc map gate (unless --skip-refid-check)
bun run docs:map:check
```

### Defaults

| Flag / field           | Default                                           |
| ---------------------- | ------------------------------------------------- |
| command                | `check`                                           |
| `--section`            | `4.1`                                             |
| `--doc`                | `docs/design/bun-types-inventory.md`              |
| `--script` (scaffold)  | `bun:types-status`                                |
| `--default` (scaffold) | `off`                                             |
| `--roots` (audit)      | `docs` (recursive `**/*.md`)                      |
| validation mode        | soft (format → warn; missing anchor/href → error) |
| project scan           | `docs/**/*.md` · `public/portal/**/*.md` (markup) |

### Validation presets

| Mode          | How                                      | Behavior                                                                               |
| ------------- | ---------------------------------------- | -------------------------------------------------------------------------------------- |
| soft          | default `check`                          | Format length/kebab → **warn**; missing anchors, href mismatch, duplicates → **error** |
| strict format | `--strict-format` / `--refid-strict`     | Format issues → **error**                                                              |
| dry-run       | `--dry-run` / `docs:refid:check:dry-run` | Full validation + **audit inventory**; **always exit 0**                               |
| registry-only | `--registry-only`                        | Skip discovery globs (planes registry only)                                            |
| skip          | `--skip-refid-check`                     | No validation (exit 0) — drafts / fast local loops only                                |
| write hrefs   | `--write-hrefs`                          | Fill empty / `—` / `auto` href cells with `[`#REF`](#REF)`, then validate              |

### Coverage planes

| Plane     | Role           | Docs                                                                      |
| --------- | -------------- | ------------------------------------------------------------------------- |
| design    | flags + guides | inventory · partner surface / onboard / IMAGES · partner authority guides |
| domain    | guide          | `docs/DOMAIN_CONCEPT_SHAPE.md` (when it carries REF:ID markup)            |
| portal    | guide          | `docs/portal-foundation.md` (when markup present)                         |
| harness   | flags + guides | AUTHORITY · ops-snapshot · handshake · monorepo · complexity              |
| lib       | guide          | `lib/docs/ref-id.ts` (help/JSON only · not markdown-scanned)              |
| discovery | scan           | other `docs/**` · `public/portal/**` with REF:ID markup                   |

Flag owners (`requireToolCoverage`):

| Doc                                                                | Tool rows                                           |
| ------------------------------------------------------------------ | --------------------------------------------------- |
| `docs/design/bun-types-inventory.md`                               | `tools/bun-types-status.ts` → `buildStatusFlagRows` |
| `docs/design/partner-surface-inventory.md`                         | `lintWiresToolFlags`                                |
| `docs/design/unified-partner-profile.md`                           | `partnerOnboardToolFlags`                           |
| `docs/IMAGES.md`                                                   | `imagesGenerateToolFlags`                           |
| harness tenants (ops-snapshot · handshake · monorepo · complexity) | matching `*ToolFlags`                               |

Tool flag SSOT:
[`lib/docs/ref-id-tool-flags.ts`](../../lib/docs/ref-id-tool-flags.ts). With
**requireToolCoverage**, check is **bidirectional**: every tool REF:ID must
appear in the Flags table (`tool-missing-table` error) **and** every table
REF:ID must have a tool row (`table-missing-tool` error).
`bun run docs:refid:audit` must report **flags-table-only=0**. Board maps with a
trailing `Flags` column are not REF:ID surfaces.

### Unknown long-option allowlists (CLI guards)

**Allowlists stay in code** — central registry `ALLOWED_LONG_REGISTRY` in
[`lib/docs/ref-id-tool-flags.ts`](../../lib/docs/ref-id-tool-flags.ts).  
Do **not** put allowlist JSON in `.env` (untyped, escapes badly, cannot be
checked by `docs:refid:check`).

Shared helpers:

| Helper                                                         | Role                                 |
| -------------------------------------------------------------- | ------------------------------------ |
| `unknownLongOptionLeaves(argv, allowed)`                       | Pure leaf scan (`Set` at check time) |
| `checkUnknownLongOptions` / `applyUnknownLongOptionGuard(For)` | Policy + strip/fail                  |
| `unknownFlagPolicy(Bun.env)`                                   | Reads toggles only                   |

Always exempt: `--help` · `--hlp`.

**Bun.env toggles** (see root [`.env.example`](../../.env.example)):

| Key                      | Default         | Behavior                                                   |
| ------------------------ | --------------- | ---------------------------------------------------------- |
| `BUN_STRIP_UNKNOWN`      | unset / `false` | Hard-fail unknown `--flags` (exit **2** / throw)           |
| `BUN_STRIP_UNKNOWN=true` | —               | Strip unknowns and continue (local prototyping)            |
| `BUN_LOG_UNKNOWN`        | unset → **on**  | Warn when stripping; set `false` to silence strip warnings |

CI / production: leave `BUN_STRIP_UNKNOWN` unset. Local prototyping may set
`BUN_STRIP_UNKNOWN=true`.

| Constant                                                                                                                                                                                                | CLI entry / registry key                                       | Definition | REF:ID leaves (`*LEAVES`)                                             | Extra meta (allowlist only)                                       | Guard                                            | Failure           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------ | ----------------- |
| `LINT_WIRES_ALLOWED_LONG`                                                                                                                                                                               | `lint-wires` · `scripts/validate-wire-traps.ts`                | SSOT       | §4.1 help · scan · why · document · strict-globs                      | rules · fix                                                       | after help/why/document/rules                    | return **2**      |
| `IMAGES_GENERATE_ALLOWED_LONG`                                                                                                                                                                          | `images:generate` · `scripts/images-generate.ts`               | SSOT       | §1.1 source · out · size · … · dry-run                                | template                                                          | top of `parseArgs`                               | **throw**         |
| `OPS_SNAPSHOT_ALLOWED_LONG`                                                                                                                                                                             | `ops:snapshot` · `tools/ops-snapshot.ts`                       | SSOT       | §1.1 seed · seed-force · seed-tenants · no-seed                       | bake toggles                                                      | after `--help`                                   | **exit 2**        |
| `PARTNER_ONBOARD_ALLOWED_LONG`                                                                                                                                                                          | `partner:onboard` · SSOT (+ re-export from tool)               | SSOT       | §1.1 deal · currency · hold-target · initial-balance · funding-method | identity/book/control flags                                       | start of `main()`                                | **throw**         |
| `TELEGRAM_OPS_ALLOWED_LONG`                                                                                                                                                                             | `telegram:ops` · `tools/telegram-ops.ts`                       | SSOT       | §1.1 invite · no-dm · no-ack · requested-by                           | send/directory meta                                               | early `main()`                                   | **exit 2**        |
| `BUN_PR_VERIFY_ALLOWED_LONG`                                                                                                                                                                            | `bun:pr:verify` · `tools/bun-pr-verify.ts`                     | SSOT       | (none — no Flags table)                                               | proof · json                                                      | `parseArgs` via `applyUnknownLongOptionGuardFor` | **throw** → **1** |
| `BUN_RUNTIME_PIN_ALLOWED_LONG`                                                                                                                                                                          | `bun:runtime-pin` · `tools/bun-runtime-pin.ts`                 | SSOT       | (none)                                                                | json                                                              | `runBunRuntimePinCli`                            | **throw** → **2** |
| `GLOSSARY_HEALTH_ALLOWED_LONG`                                                                                                                                                                          | `glossary:health` · `tools/glossary-health.ts`                 | SSOT       | (none)                                                                | json · local                                                      | top-level guard                                  | **exit 2**        |
| `CLOUDFLARE_ENV_VALIDATE_ALLOWED_LONG`                                                                                                                                                                  | `cloudflare:env:validate` · `tools/cloudflare-env-validate.ts` | SSOT       | (none)                                                                | json · strict                                                     | top-level guard                                  | **exit 2**        |
| `ROUTING_REGISTRY_PROOF_ALLOWED_LONG`                                                                                                                                                                   | `routing:registry-proof` · `tools/routing-registry-proof.ts`   | SSOT       | (none)                                                                | write · publish · json · …                                        | top-level guard                                  | **exit 2**        |
| `OPS_SEED_TOC_ALLOWED_LONG` · `DISCOVERY_COMPOSE_*` · `PUBLIC_DISCOVERY_*` · `SCHEMA_AUDIT_*` · `TELEGRAM_HANDSHAKE_CATALOG_*` · `CONCEPT_HEALTH_*` · `OPS_LOOP_GATE_BACKFILL_*` · `OPS_LIMITS_CHECK_*` | see `ALLOWED_LONG_REGISTRY`                                    | SSOT       | (none)                                                                | see [cli-constants-flags §2.7](../harness/cli-constants-flags.md) | top-level / parseArgs                            | **exit 2**        |

Prove CLI guards: `bun test tests/docs-ref-id-tool-exports.test.ts`.

### PR meta-table (humans + agents) for REF:ID / CLI guard work

When shipping allowlist or `requireToolCoverage` PRs, include both tables in the
PR body (stable headers — agents and claim scanners rely on them).

**Human (story · risk · rollback):**

| Change | Risk (L/M/H) | Blast radius           | Rollback                 | Depends on | Observability            |
| ------ | ------------ | ---------------------- | ------------------------ | ---------- | ------------------------ |
| …      | M            | which CLIs / operators | `git revert <merge_sha>` | prior PRs  | grep stderr / dashboards |

**Agent (parseable · executable):**

| PR  | Constant           | Guard file | Verify_cmd                                        | Expected_exit | On_fail     |
| --- | ------------------ | ---------- | ------------------------------------------------- | ------------- | ----------- |
| #N  | `FOO_ALLOWED_LONG` | path       | `bun test tests/docs-ref-id-tool-exports.test.ts` | 0             | block-merge |

**Matrix delta (rollout sequence)** — keep one row per PR so reviewers see the
series:

| PR   | Commit      | CLI(s)                                      | Guard                                                                        |
| ---- | ----------- | ------------------------------------------- | ---------------------------------------------------------------------------- |
| #533 | `3a3390d93` | partner:onboard + bidirectional check       | `PARTNER_ONBOARD_ALLOWED_LONG` + `tool-missing-table` / `table-missing-tool` |
| #534 | `e360f76d2` | lint-wires · images:generate · ops:snapshot | `*_ALLOWED_LONG`                                                             |
| #535 | `824890004` | telegram:ops                                | `TELEGRAM_OPS_ALLOWED_LONG`                                                  |

**Known safe exemptions:** `--help` · `--hlp` always pass the long-option
filter; short `-h` is handled per CLI (lint-wires also rejects other short
opts). Positionals and Telegram negative chat ids (`-100…`) are not long
options.

Ad-hoc draft:

```bash
bun tools/docs-refid.ts check --doc=path/to/draft.md --write-hrefs \
  --section-ref=4.1 --section-heading='### Flags / settings'
```

Taken keywords get a numeric suffix from suggest (`refresh` → `4.1.refresh-2`).

### Adding a flag

1. Suggest a free id:  
   `bun run docs:refid:suggest --section=4.1 --flag=--my-flag`
2. Paste scaffold output (comment + `<a id>` + table row) into the design doc.  
   `bun run docs:refid:scaffold --section=4.1 --flag=--my-flag`
3. Wire code with `flagDocRef('my-flag')` — re-export from the CLI via
   [`lib/docs/ref-id-tool-flags.ts`](../../lib/docs/ref-id-tool-flags.ts)
   (examples: `scripts/validate-wire-traps.ts`, `scripts/images-generate.ts`,
   `tools/partner-onboard.ts`, `tools/telegram-ops.ts`, `tools/ops-snapshot.ts`
   · `bun-types-status` uses its own §4.1 helper).
4. Prove: `bun run docs:refid:check` ·
   `bun test tests/docs-refid-cli.contract.test.ts` ·
   `bun test tests/docs-ref-id-tool-exports.test.ts`

### Proof

| Gate                        | Command                                                  |
| --------------------------- | -------------------------------------------------------- |
| In-process library          | `bun test tests/docs-ref-id.test.ts`                     |
| Audit classifiers           | `bun test tests/docs-ref-id-audit.test.ts`               |
| **CLI subprocess contract** | `bun test tests/docs-refid-cli.contract.test.ts`         |
| Package script              | `bun run docs:refid:check` · `:audit` · `:check:dry-run` |

Subprocess tests spawn `bun tools/docs-refid.ts` / `docs-refid-check.ts` and
assert exit codes + stdout (help, presets, JSON schema `factorywager/ref-id/v2`,
fixture failure modes under `tests/fixtures/ref-id/`, `--write-hrefs` fill,
coverage planes + `--registry-only`, `--dry-run`, `audit` /
`factorywager/ref-id-audit/v1`).

## Testing & concept changes

| Change                                           | Gate                                                                                                           |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Day-loop / general TS                            | `bun run test:changed` · `bun run test:dev`                                                                    |
| Monorepo suite (`tests/`)                        | `bun run test` or `bun run test:ci` (JUnit; pathIgnore excludes toc-ops / Kalshi)                              |
| Inspector live reporters                         | `bun run test:inspect` · [`bun-test-inspect.md`](../harness/tenants/bun-test-inspect.md) (orthogonal to JUnit) |
| Flag × script matrix                             | [`bun-test-flags.md`](../harness/tenants/bun-test-flags.md)                                                    |
| Vocabulary, surface maps, surface-coverage tools | `bun run quality:concept`                                                                                      |

`quality:concept` runs `concept:audit --strict`, `validate:surface-coverage`,
and `surface-coverage:map:check`. Pre-commit runs it **only** when concept SSOT
paths are staged. Escape hatches (`SKIP_QUALITY_CONCEPT`, `SKIP_TEST_CHANGED`,
`SKIP_GITLEAKS`) require reason + local proof in the commit message — see
[Escape hatches](../DEVELOPMENT-WORKFLOW.md#escape-hatches).

## Financial SQL storage

New or changed financial columns whose names contain `balance`, `amount`, or
`price` may not use `REAL`, `FLOAT`, or `DOUBLE`. Store money as `INTEGER` minor
units with an explicit currency column. When a non-SQLite engine requires a
fixed-width declaration, use `NUMERIC(20,0)` and retain the same minor-unit
contract.

The Bun-native pre-commit runner applies this as a staged ratchet to `.sql`
files and embedded DDL in migration, schema, and ledger TypeScript/JavaScript
files:

```bash
bun run lint:money-sql:staged
```

The guard scans added staged lines, so existing debt cannot block unrelated work
and new floating-point financial storage cannot be introduced. Floating point
remains valid for non-financial measurements such as confidence or latency. SQL
casts used only to read a legacy value are not column declarations and are
outside this storage rule.

## Before a PR

```bash
bun run ci:core               # verify · hygiene · harness
```

Concept PRs: also `bun run quality:concept` (and `bun run test:concept` when
useful).

Follow [docs/harness/AUTHORITY.md](../harness/AUTHORITY.md) for lanes/push.
Prefer branded IDs and wire-boundary parse-once — see root
[`AGENTS.md`](../../AGENTS.md).

## Docs

| Need                 | Read                                                                               |
| -------------------- | ---------------------------------------------------------------------------------- |
| Index                | [docs/README.md](../README.md)                                                     |
| Dev / test workflow  | [DEVELOPMENT-WORKFLOW.md](../DEVELOPMENT-WORKFLOW.md)                              |
| REF:ID validation    | [§ REF:ID Validation](#refid-validation) · `bun run docs:refid:check`              |
| Concept lifecycle    | [CONCEPT_LIFECYCLE.md](../CONCEPT_LIFECYCLE.md)                                    |
| Surface coverage map | [SURFACE_COVERAGE.md](../SURFACE_COVERAGE.md) · `bun run surface-coverage:map`     |
| Install / bunfig     | [UNIFIED.md](../UNIFIED.md)                                                        |
| Wire / brands        | [WIRE_BOUNDARY.md](../WIRE_BOUNDARY.md) · branded-ids skill                        |
| Bun APIs             | [BUN_NATIVE_CAPABILITIES.md](../BUN_NATIVE_CAPABILITIES.md) · `bun run dx:catalog` |

Issues:
[project-R-score issues](https://github.com/brendadeeznuts1111/project-R-score/issues).

Longer historical CONTRIBUTING copy:
`git log -- docs/contributing/CONTRIBUTING.md`.
