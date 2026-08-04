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

| Change | Gate |
|--------|------|
| Day-loop / general TS | `bun run test:changed` · `bun run test:dev` |
| Monorepo suite (`tests/`) | `bun run test` or `bun run test:ci` (pathIgnore excludes toc-ops / Kalshi) |
| Vocabulary, surface maps, surface-coverage tools | `bun run quality:concept` |

`quality:concept` runs `concept:audit --strict`, `validate:surface-coverage`, and
`surface-coverage:map:check`. Pre-commit runs it **only** when concept SSOT
paths are staged (see DEVELOPMENT-WORKFLOW). Escape: `SKIP_QUALITY_CONCEPT=1`
with reason + evidence in the commit message.

## Before a PR

```bash
bun run ci:core               # verify · hygiene · harness
```

Concept PRs: also `bun run quality:concept` (and `bun run test:concept` when useful).

Follow [docs/harness/AUTHORITY.md](../harness/AUTHORITY.md) for lanes/push. Prefer branded IDs and wire-boundary parse-once — see root [`AGENTS.md`](../../AGENTS.md).

## Docs

| Need | Read |
|------|------|
| Index | [docs/README.md](../README.md) |
| Dev / test workflow | [DEVELOPMENT-WORKFLOW.md](../DEVELOPMENT-WORKFLOW.md) |
| Concept lifecycle | [CONCEPT_LIFECYCLE.md](../CONCEPT_LIFECYCLE.md) |
| Surface coverage map | [SURFACE_COVERAGE.md](../SURFACE_COVERAGE.md) · `bun run surface-coverage:map` |
| Install / bunfig | [UNIFIED.md](../UNIFIED.md) |
| Wire / brands | [WIRE_BOUNDARY.md](../WIRE_BOUNDARY.md) · branded-ids skill |
| Bun APIs | [BUN_NATIVE_CAPABILITIES.md](../BUN_NATIVE_CAPABILITIES.md) · `bun run dx:catalog` |

Issues: [project-R-score issues](https://github.com/brendadeeznuts1111/project-R-score/issues).

Longer historical CONTRIBUTING copy: `git log -- docs/contributing/CONTRIBUTING.md`.
