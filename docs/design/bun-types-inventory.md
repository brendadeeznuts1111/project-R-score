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

Docs catalog / `@see` / RSS operate loop stays in
[`BUN_DOCS_OPERATE.md`](../BUN_DOCS_OPERATE.md) — related but a different
pipeline (token/catalog, not pin↔tip inventory).

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

| Command                                       | Purpose                                                | Typical exit                            |
| --------------------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| `bun run bun:types-inventory`                 | Print / scan deep surface (no write)                   | `0`                                     |
| `bun run bun:types-inventory:write`           | Refresh committed JSON + MD SSOT                       | `0`                                     |
| `bun run bun:types-inventory:check`           | Fail if committed inventory is stale                   | `0` / `1`                               |
| `bun run bun:types-inventory:tip-diff`        | Pin vs tip (may fetch)                                 | policy-dependent                        |
| `bun run bun:types-inventory:tip-diff:local`  | Tip from local/`~/bun` · `--prefer-local --no-fetch`   | soft `0` unless `--strict`              |
| `bun run bun:types-inventory:tip-diff:strict` | Tip-diff hard fail on policy breach                    | `0` / `1`                               |
| `bun run bun:types-usage`                     | Usage scan → `.cache/bun-types-usage/`                 | `0`                                     |
| `bun run bun:types-usage:unused`              | Unused type-likes report                               | `0`                                     |
| `bun run bun:types-changelog` · `:tip`        | Standalone changelog (tip-diff also wires this)        | `0`                                     |
| `bun run bun:types-report`                    | Tip-diff + changelog + usage                           | tip/usage status                        |
| `bun run bun:types-report:local`              | Same with `--prefer-local`                             | tip/usage status                        |
| `bun run bun:types-ci`                        | Alias: report `--prefer-local` (soft in `bun:ci`)      | `0` on tip **warn** when soft           |
| `bun run bun:types-ci:strict`                 | Report `--prefer-local --strict`                       | `1` on drift                            |
| `bun run bun:types-status`                    | Compose inventory + tip + usage → verdict / next steps | `0` soft; `--strict` → `1` on warn/fail |
| `bun run bun:types-status:refresh`            | Same after `bun:types-report:local`                    | same                                    |

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
