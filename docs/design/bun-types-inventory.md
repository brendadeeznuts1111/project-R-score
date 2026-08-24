# Bun-types inventory pipeline

**Claim** `bun-types-inventory` (operator tooling — not a portal board claim)

Tracks the **Bun runtime type surface** from pinned `bun-types` (and tip
comparison): `Bun.file`, satellites (`bun:jsc`, `bun:sqlite`, …), nested
members, repo usage, and pin↔tip drift.

This is **not** the partner-surface inventory. Partner desk / brands / wires
live in [`partner-surface-inventory.md`](./partner-surface-inventory.md)
(`lib/docs/partner-surface-inventory.ts`). The two SSOTs do not share commands,
layers, or outputs.

## Contents

1. [What this owns](#what-this-owns)
2. [Not this (partner-surface)](#not-this-partner-surface)
3. [Artifacts](#artifacts)
4. [Commands](#commands)
   - [4.1 Flags / settings](#4.1)
5. [Local CI (`bun:ci`)](#local-ci-bunci)
6. [Operator workflow](#operator-workflow)
7. [Tools map](#tools-map)

## What this owns

| Concern                                   | Owner                                                   |
| ----------------------------------------- | ------------------------------------------------------- |
| Deep type surface from pinned `bun-types` | `bun:types-inventory:write` / `:check`                  |
| Pin vs tip member delta                   | `bun:types-inventory:tip-diff` (+ `:local` / `:strict`) |
| Human + JSON changelog of that delta      | Wired by tip-diff → `.cache/bun-types-changelog/`       |
| Which Bun type-likes the repo uses        | `bun:types-usage` / `:unused`                           |
| One-shot tip + usage stack                | `bun:types-report` / `:local` · `bun:types-ci`          |
| Morning dashboard (compose caches)        | `bun:types-status` (+ `:refresh`)                       |

Docs **token** and **catalog** operate planes stay in
[`BUN_DOCS_OPERATE.md`](../BUN_DOCS_OPERATE.md) — related but a different
pipeline (not pin↔tip inventory). Do not collapse those two planes into one
“token/catalog” channel.

## Not this (partner-surface)

| Partner-surface                                  | Bun-types pipeline                               |
| ------------------------------------------------ | ------------------------------------------------ |
| SSOT `lib/docs/partner-surface-inventory.ts`     | SSOT `tools/bun-types-inventory.json` (+ `.md`)  |
| Bake `/registry/partner-surface-inventory.json`  | Reports under `.cache/bun-types-*/` (gitignored) |
| Layers A/B `partner-surface-inventory:validate`  | Tip-diff + usage report (no A–D layers)          |
| Layer C `lint-wires` · Layer D `lint-domains`    | Not used here                                    |
| Live `partner-code` / `out-id` from partners-ops | No partners-ops coupling                         |

## Artifacts

| Artifact         | Path                                                                     | Committed? | Contents                                                      |
| ---------------- | ------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------- |
| Inventory SSOT   | [`tools/bun-types-inventory.json`](../../tools/bun-types-inventory.json) | **yes**    | Deep inventory (schema `factorywager/bun-types-inventory/v3`) |
| Inventory human  | [`tools/bun-types-inventory.md`](../../tools/bun-types-inventory.md)     | **yes**    | Readable companion of the JSON                                |
| Tip sparse clone | `.cache/bun-types-tip/`                                                  | no         | Fetched / local tip `packages/bun-types`                      |
| Tip-diff report  | `.cache/bun-types-tip-diff/`                                             | no         | `report.json` / `report.md` — tip-only / pin-only / changed   |
| Changelog        | `.cache/bun-types-changelog/`                                            | no         | `CHANGELOG.md` / `changelog.json`                             |
| Usage            | `.cache/bun-types-usage/`                                                | no         | `report.json` / `report.md` — repo references                 |
| Status dashboard | `.cache/bun-types-status/`                                               | no         | Composed verdict + next steps (`bun:types-status`)            |

Inventory **write** does **not** land under `.cache/` — tip-diff, changelog,
usage, and status do.

## Commands

**Script** = `package.json` name (`bun run <script>`). **Command** = underlying
`bun tools/…` invocation (from the script value).

| Script                                | Command                                                     | Purpose                                                | Exit                                    |
| ------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| `bun:types-inventory`                 | `bun tools/bun-types-inventory.ts`                          | Print / scan deep surface (no write)                   | `0`                                     |
| `bun:types-inventory:write`           | `bun tools/bun-types-inventory.ts --write`                  | Refresh committed JSON + MD SSOT                       | `0`                                     |
| `bun:types-inventory:check`           | `bun tools/bun-types-inventory.ts --check`                  | Fail if committed inventory is stale                   | `0` / `1`                               |
| `bun:types-inventory:tip-diff`        | `bun tools/bun-types-tip-diff.ts`                           | Pin vs tip (may fetch)                                 | policy-dependent                        |
| `bun:types-inventory:tip-diff:local`  | `bun tools/bun-types-tip-diff.ts --prefer-local --no-fetch` | Tip from repository cache, then local `~/bun`          | soft `0` unless `--strict`              |
| `bun:types-inventory:tip-diff:strict` | `bun tools/bun-types-tip-diff.ts --strict`                  | Tip-diff hard fail on policy breach                    | `0` / `1`                               |
| `bun:types-usage`                     | `bun tools/bun-types-usage.ts`                              | Usage scan → `.cache/bun-types-usage/`                 | `0`                                     |
| `bun:types-usage:unused`              | `bun tools/bun-types-usage.ts --unused`                     | Unused type-likes report                               | `0`                                     |
| `bun:types-changelog`                 | `bun tools/bun-types-changelog.ts`                          | Standalone changelog                                   | `0`                                     |
| `bun:types-changelog:tip`             | `bun tools/bun-types-changelog.ts --tip --prefer-local`     | Changelog from local tip                               | `0`                                     |
| `bun:types-report`                    | `bun tools/bun-types-report.ts`                             | Tip-diff + changelog + usage                           | tip/usage status                        |
| `bun:types-report:local`              | `bun tools/bun-types-report.ts --prefer-local`              | Same with `--prefer-local`                             | tip/usage status                        |
| `bun:types-ci`                        | `bun tools/bun-types-report.ts --prefer-local`              | Soft report at end of `bun:ci`                         | `0` on tip **warn** when soft           |
| `bun:types-ci:strict`                 | `bun tools/bun-types-report.ts --prefer-local --strict`     | Hard fail on tip policy breach                         | `1` on drift                            |
| `bun:types-status`                    | `bun tools/bun-types-status.ts`                             | Compose inventory + tip + usage → verdict / next steps | `0` soft; `--strict` → `1` on warn/fail |
| `bun:types-status:refresh`            | `bun tools/bun-types-status.ts --refresh`                   | Same after `bun:types-report:local`                    | same                                    |

<a id="4.1.refresh"></a> <a id="4.1.strict"></a> <a id="4.1.max-age-days"></a>
<a id="4.1.json"></a> <a id="4.1.help"></a> <a id="4.1.shared.strict"></a>
<a id="4.1.shared.prefer-local"></a> <a id="4.1"></a>

### Flags / settings

**REF:ID** (v2) = Contents section number path under §4 (`4.1.<leaf>`). **href**
MUST be `#` + REF:ID (or empty/`—`/`auto`). Section id `4.1` sits on the line
immediately above this heading. Rules: kebab-case keywords (2–32 chars);
reserved leaves `index` · `top` · `toc` · `anchor`; unique per doc; every
table/tool REF:ID has a matching HTML anchor; HTML `REF:ID` comments require a
matching `<a id>`. Validate: `bun run docs:refid:check` (also part of
`docs:map:check`; skip with `--skip-refid-check`). Add a flag:
`bun run docs:refid:suggest --section=4.1 --flag=--foo` · paste
`docs:refid:scaffold` output. Doc **current** cannot show process argv — live
default vs current is printed by `bun run bun:types-status` (Flags section ·
`report.json` `flags[]`).

| Script             | REF:ID                    | href                                                   | --flag           | shortcode | default       | current                     |
| ------------------ | ------------------------- | ------------------------------------------------------ | ---------------- | --------- | ------------- | --------------------------- |
| `bun:types-status` | `4.1.refresh`             | [`#4.1.refresh`](#4.1.refresh)                         | `--refresh`      | —         | off           | live via `bun:types-status` |
| `bun:types-status` | `4.1.strict`              | [`#4.1.strict`](#4.1.strict)                           | `--strict`       | —         | soft (exit 0) | live via `bun:types-status` |
| `bun:types-status` | `4.1.max-age-days`        | [`#4.1.max-age-days`](#4.1.max-age-days)               | `--max-age-days` | —         | `14`          | live via `bun:types-status` |
| `bun:types-status` | `4.1.json`                | [`#4.1.json`](#4.1.json)                               | `--json`         | —         | off           | live via `bun:types-status` |
| `bun:types-status` | `4.1.help`                | [`#4.1.help`](#4.1.help)                               | `--help`         | `-h`      | —             | live via `bun:types-status` |
| shared             | `4.1.shared.strict`       | [`#4.1.shared.strict`](#4.1.shared.strict)             | `--strict`       | —         | soft          | see tool                    |
| shared             | `4.1.shared.prefer-local` | [`#4.1.shared.prefer-local`](#4.1.shared.prefer-local) | `--prefer-local` | —         | off           | baked into `:local` / `:ci` |

Useful inventory flags (see tool `--help`): `--shallow` · `--no-interfaces` ·
`--no-type-aliases` · `--no-props` · `--no-enums` · `--no-nested-objects` ·
`--module=bun:jsc` · `--kind=…` · `--tip-diff`.

**Deep parse (v3):** namespace/class/interface/`type X = {…}`/enum bodies;
anonymous nested objects on properties (**multi-line**, **closed one-liners**,
**union branches** `x?: string | {…}`); getters as methods; maxDepth 3+ on
current pin. **Not** the same as console object-inspection depth
([docs](https://bun.com/docs/runtime/console#object-inspection-depth) ·
`bunfig [console] depth = 6` · `lib/console-depth.ts`) — TTY deepest-chain
samples use policy `inspect` at depth 4 for readability only.

## Local CI (`bun:ci`)

`bun run bun:ci` runs **hard** merge-proof steps, then a **soft** Bun-types
report at the end (`scripts/bun-ci.ts`):

| Env                               | Effect                                                                    |
| --------------------------------- | ------------------------------------------------------------------------- |
| `BUN_TYPES_CI=0` or `false`       | Skip the types step                                                       |
| `SKIP_BUN_TYPES_CI=1` or `true`   | Same skip (alias)                                                         |
| `BUN_TYPES_CI_STRICT=1` or `true` | Run `bun:types-ci:strict` instead (fail merge proof on tip policy breach) |

Default soft mode: tip **warn** does **not** fail `bun:ci`. Hosted GHA is not
merge authority for this stack.

## Operator workflow

```bash
# After bumping bun-types / changing surface expectations
bun run bun:types-inventory:write
bun run bun:types-inventory:check

# Morning check (reads caches; warn if tip/usage missing)
bun run bun:types-status

# Refresh tip+usage then re-render status
bun run bun:types-status:refresh

# Soft pin↔tip + usage (local tip, no network)
bun run bun:types-ci

# Usage only
bun run bun:types-usage

# Full local stack (explicit)
bun run bun:types-report:local

# Hard tip gate (operator / optional bun:ci)
bun run bun:types-ci:strict
# or: BUN_TYPES_CI_STRICT=1 bun run bun:ci
```

## Tools map

| Tool                                                                 | Role                                |
| -------------------------------------------------------------------- | ----------------------------------- |
| [`tools/bun-types-inventory.ts`](../../tools/bun-types-inventory.ts) | Deep inventory engine + write/check |
| [`tools/bun-types-tip-fetch.ts`](../../tools/bun-types-tip-fetch.ts) | Sparse tip materialization          |
| [`tools/bun-types-tip-diff.ts`](../../tools/bun-types-tip-diff.ts)   | Pin vs tip + changelog wire         |
| [`tools/bun-types-changelog.ts`](../../tools/bun-types-changelog.ts) | Snapshot / tip changelog            |
| [`tools/bun-types-usage.ts`](../../tools/bun-types-usage.ts)         | Repo usage vs inventory             |
| [`tools/bun-types-report.ts`](../../tools/bun-types-report.ts)       | Orchestrates tip-diff → usage       |
| [`tools/bun-types-status.ts`](../../tools/bun-types-status.ts)       | Morning dashboard (compose caches)  |
| [`tools/lib/bun-types-tty.ts`](../../tools/lib/bun-types-tty.ts)     | Shared TTY chrome                   |

Agent entry summary also lives in [`AGENTS.md`](../../AGENTS.md) (Bun API
references section). Keep this file as the scannable pipeline map.
