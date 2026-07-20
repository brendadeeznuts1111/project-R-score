# Plannotator Extra Skills

Local mirror of the optional agent skills from [`backnotprop/plannotator`](https://github.com/backnotprop/plannotator/tree/main/apps/skills/extra).

These skills are **not installed by default** with Plannotator. Upstream, you add them with:

```bash
bun x skills add backnotprop/plannotator/apps/skills/extra
```

This repo pins them locally under `.agents/skills/` and includes lightweight content tests.

> **Note:** The project directory is `plannator/`. The previous `plannotator/` directory has been merged into this one.

## Skills

| Skill | Source path | Purpose |
|---|---|---|
| `plannotator-compound` | `apps/skills/extra/plannotator-compound/SKILL.md` | Analyze denied plan archives and produce an HTML dashboard report |
| `plannotator-visual-explainer` | `apps/skills/extra/plannotator-visual-explainer/SKILL.md` | Generate self-contained HTML visualizations for plans, PRs, and diagrams |
| `plannotator-setup-goal` | `apps/skills/extra/plannotator-setup-goal/SKILL.md` | Turn an idea into a `/goal` package via interview → facts → plan |

## Grounding references

Local reference cards keep agents and tools rooted in Bun-native APIs and Effect patterns:

| Reference | Path |
|---|---|
| Bun API grounding | [`docs/references/bun-api-reference.md`](docs/references/bun-api-reference.md) |
| Effect grounding | [`docs/references/effect-reference.md`](docs/references/effect-reference.md) |
| Reference manifest | [`docs/references/canonical-references.json`](docs/references/canonical-references.json) |
| Typed Bun helpers | [`lib/bun-native.ts`](lib/bun-native.ts) |
| Effect boundary wrappers | [`lib/effect/boundary.ts`](lib/effect/boundary.ts) |

Verify the references are present and parseable:

```bash
bun run ground-references
```

With `--online`, the script also HEAD-checks the canonical ecosystem URLs:

```bash
bun run ground-references:online
```

## Provenance

`skills-lock.json` records the upstream source and SHA256 hash for each skill file.

## Bun-native lint (ast-grep)

AST-aware rules enforce Bun-native APIs and exact Bun signatures in project-owned code (`.agents/**` skill mirrors are ignored).

| Rule | Checks |
|---|---|
| `no-node-fs` | No `node:fs` / `fs` imports |
| `no-node-child-process` | No `child_process` imports |
| `no-node-crypto` | No `node:crypto` imports |
| `no-node-net` | No `node:net` imports |
| `no-node-http` | No `node:http` / `node:https` imports |
| `prefer-bun-env` | `Bun.env` instead of `process.env` |
| `no-buffer` | `Uint8Array` instead of `Buffer` |
| `no-date-now-benchmarks` | `Bun.nanoseconds()` instead of `Date.now()` |
| `bun-file-exact-signature` | `Bun.file(path)` called with exactly one argument |
| `bun-spawn-cmd-array` | `Bun.spawn({ cmd: [...] })` not a bare array |
| `bun-write-exact-signature` | `Bun.write(path, data)` exact arity |
| `bun-serve-exact-signature` | `Bun.serve(options)` not no-arg |
| `bun-archive-exact-signature` | `new Bun.Archive(data, options?)` exact arity |
| `bun-glob-exact-signature` | `new Bun.Glob(pattern)` exact arity |
| `effect-prefer-tagged-error` | `Data.TaggedError` over `new Error` in `lib/effect/` |

```bash
bun run ast-grep:test   # run rule snapshot tests
bun run ast-grep:scan   # scan project-owned TypeScript
```

Requires [ast-grep 0.44+](https://ast-grep.github.io/) (`bun install -g @ast-grep/cli@0.44.0`).

## Monorepo gate map

Plannator is registered in the shared manifest at `.agents/skills/ast-grep/gate-map.json`.
From the monorepo root (`Projects/`):

```bash
bun run gate-map:validate              # print project tree
bun run gate-report:monorepo:agents    # run agents zone (includes plannator)
bun run gate-report:monorepo           # run all registered projects
```

## Gate report (visual dashboard)

Run all quality gates and generate a self-contained HTML dashboard plus JSON sidecar:

```bash
bun run gate-report                    # → reports/gate-report.html + .json
bun run gate-report -- --open          # same, open in browser
bun run gate-report -- --with-grounding  # include ground-references gate
bun run gate-report -- --fail-fast     # stop after first failing gate
bun run gate-report:fail-demo          # fixture failure UI (no real gate run)
bun run gate-report:annotate           # generate + open in Plannotator UI
bun run pre-commit                     # gate-report with --fail-fast
bun run check:report                   # alias for gate-report
```

The report includes run history (bar chart + table in `reports/history.jsonl`), a pipeline flowchart, ast-grep rule inventory (all 15 rules), per-gate logs, and summary stats.

Install the git hook locally (optional):

```bash
git config core.hooksPath .githooks
```

Copy or symlink `scripts/pre-commit.sh` → `.githooks/pre-commit` if you use a hooks directory.

## Scripts

```bash
bun run check                     # typecheck + ast-grep:test + ast-grep:scan + test + verify-hashes
bun run gate-report               # run gates + HTML/JSON dashboard
bun run test                      # skill tests + reference tests + lib tests
bun run typecheck                 # TypeScript --noEmit
bun run ast-grep:test             # ast-grep rule snapshot tests
bun run ast-grep:scan             # Bun-native scan
bun run ground-references         # verify local reference cards
bun run ground-references:online  # also HEAD-check canonical URLs
./scripts/verify-hashes.sh        # skill-lock hash verification
```

## Tests

Runtime dependency: [`effect`](https://effect.website/) (used by `lib/effect/`). Dev dependency: `@types/bun`.

```bash
bun test
```

Tests cover skill content, reference grounding, Bun-native helpers, and Effect boundary wrappers.

## Hash verification

Check that the local `SKILL.md` files still match the hashes recorded in `skills-lock.json`:

```bash
./scripts/verify-hashes.sh
```

## Sync from upstream

To refresh the local skills from the upstream repo:

```bash
./scripts/sync-from-upstream.sh
```

The sync preserves locally-added `*.test.ts` files. After syncing, run `bun test` and `./scripts/verify-hashes.sh` to confirm integrity.

## Continuous integration

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs `bun run gate-report` on every push and pull request to `main`. It uploads the HTML and JSON reports as artifacts and writes a markdown summary to the job summary pane.

## License

Same as upstream: dual-licensed under Apache-2.0 or MIT.
