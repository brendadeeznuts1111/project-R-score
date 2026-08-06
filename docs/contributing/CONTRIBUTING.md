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

Full testing / hooks map: [DEVELOPMENT-WORKFLOW.md](../DEVELOPMENT-WORKFLOW.md).

## Testing & concept changes

| Change                                           | Gate                                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| Day-loop / general TS                            | `bun run test:changed` · `bun run test:dev`                                |
| Monorepo suite (`tests/`)                        | `bun run test` or `bun run test:ci` (pathIgnore excludes toc-ops / Kalshi) |
| Vocabulary, surface maps, surface-coverage tools | `bun run quality:concept`                                                  |

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
| Concept lifecycle    | [CONCEPT_LIFECYCLE.md](../CONCEPT_LIFECYCLE.md)                                    |
| Surface coverage map | [SURFACE_COVERAGE.md](../SURFACE_COVERAGE.md) · `bun run surface-coverage:map`     |
| Install / bunfig     | [UNIFIED.md](../UNIFIED.md)                                                        |
| Wire / brands        | [WIRE_BOUNDARY.md](../WIRE_BOUNDARY.md) · branded-ids skill                        |
| Bun APIs             | [BUN_NATIVE_CAPABILITIES.md](../BUN_NATIVE_CAPABILITIES.md) · `bun run dx:catalog` |

Issues:
[project-R-score issues](https://github.com/brendadeeznuts1111/project-R-score/issues).

Longer historical CONTRIBUTING copy:
`git log -- docs/contributing/CONTRIBUTING.md`.
