# Proof contracts

Match **evidence** to the **claim**. Green pre-commit alone does not prove a journey or deployed health.

Upstream: [harness-engineering proof thesis](https://github.com/lopopolo/harness-engineering/tree/trunk/docs/proof).

## Claim kinds

| Kind | Meaning | Typical evidence |
|------|---------|------------------|
| `unit` | Pure logic / types | `bun test` file, `check:brands:types` |
| `boundary` | Wire → domain parse / ratchet | staged brand gate, wire-boundary eslint, path-bun / bun-env |
| `journey` | Multi-step user/ops path | scripted CLI sequence, contract JSON |
| `deployed` | Live / machine state | `install:verify`, machine health, CI workflow green |

## Named critical paths

| Artifact | Claim | Required kinds |
|----------|-------|----------------|
| Branded IDs | New domain IDs are branded | `boundary` (`branded-id-check --staged --strict`) + `unit` (`check:brands:types` on CI/`--full`) |
| **Install verify** | Factory install produces a working Bun workspace | `journey` + `deployed` (`bun run proof:install` / `install:verify`; CI: `repo-hygiene.yml` → `install:verify:strict`) |
| Search governance | Bench gate policy holds | `journey` (`.github/workflows/search-governance.yml` scripts) |
| Path-bun | Spine `lib/` does not import `path`/`node:path` | `boundary` (`bun run check:path-bun`) |
| Bun.env | Spine `lib/` + `scripts/` do not use Node `process.env` | `boundary` (`bun run check:bun-env`) |
| Wire / unknown | Bare `unknown` params stay at parse edges | `boundary` (harness eslint `no-unknown-function-param` **error**) |
| Day-loop type-check | Advertised `type-check` covers spine agent edit surfaces | `journey` (`bun run type-check` + `tsconfig.check.json` include list) |
| Test changed | Import-graph filter matches git dirty (or since-ref) sources | `journey` (`bun run test:changed` · `bun run test:changed -- main` · `test:changed:watch`) |

## Agent checklist before “done”

1. State the claim in one sentence.
2. Pick kind(s) from the table.
3. Point at evidence paths or commands that actually ran.
4. If evidence is missing, either run it or downgrade the claim.

Code SSOT: [`lib/harness/proof.ts`](../../lib/harness/proof.ts). Discover: `bun run harness:status`.
