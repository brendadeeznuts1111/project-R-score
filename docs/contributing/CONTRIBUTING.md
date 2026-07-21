# Contributing

## Setup

- **Bun** 1.4.0 (`packageManager` in root `package.json`)
- Clone [project-R-score](https://github.com/brendadeeznuts1111/project-R-score)
- `bun install` · `bun run install:verify` · `bun run help`

## Day loop

```bash
bun run type-check
bun run test:changed          # dirty tree
bun run ci:harness:fast       # local parity
bun run harness:status
```

## Before a PR

```bash
bun run ci:core               # verify · hygiene · harness
```

Follow [docs/harness/AUTHORITY.md](../harness/AUTHORITY.md) for lanes/push. Prefer branded IDs and wire-boundary parse-once — see root [`AGENTS.md`](../../AGENTS.md).

## Docs

| Need | Read |
|------|------|
| Index | [docs/README.md](../README.md) |
| Install / bunfig | [UNIFIED.md](../UNIFIED.md) |
| Wire / brands | [WIRE_BOUNDARY.md](../WIRE_BOUNDARY.md) · branded-ids skill |
| Bun APIs | [BUN_NATIVE_CAPABILITIES.md](../BUN_NATIVE_CAPABILITIES.md) · `bun run dx:catalog` |

Issues: [project-R-score issues](https://github.com/brendadeeznuts1111/project-R-score/issues).

Longer historical CONTRIBUTING copy: `git log -- docs/contributing/CONTRIBUTING.md`.
