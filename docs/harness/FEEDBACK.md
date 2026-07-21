# Feedback → ratchet

Turn a repeated correction into the **earliest durable owner** so the next trajectory does not re-learn it in chat.

Upstream: [Turn feedback into infrastructure](https://github.com/lopopolo/harness-engineering/tree/trunk/docs/feedback).

## Template

```markdown
## Lesson

- **Finding:** (what failed / what the agent did wrong)
- **Repair:** (what fixed this instance)
- **Earliest owner:** type | lint | skill | doc-map | script-gate | proof | CI | ops
- **Ratchet:** (concrete check or doc link that blocks recurrence)
- **Keep / revise / drop:** after a fresh rerun (paste `freshRerun` output — [`FRESH-RERUN.md`](FRESH-RERUN.md))
```

Scaffold: `bun run harness:lesson --title="…"`.

Fresh-rerun is mandatory for improve-harness retain/revise/remove: run the affected claim’s `freshRerun` from `lib/harness/proof.ts` and paste the terminal output into the PR.

## Promote

- **`type`** — brand / path-bun / parse*  
  *Ratchet* → `bun run check:brands` · `tsc --project tsconfig.check.json`
- **`lint`** — `config/eslint/plugin-harness/` · `plugin-bun/`  
  *Ratchet* → `bun eslint --config eslint.bun-native.config.ts --quiet` (**error** rules)
- **`skill`** — `.agents/skills/<name>/SKILL.md`  
  *Ratchet* → skill retrieved on fresh rerun of the same job class
- **`doc-map`** — `lib/docs/repo-docs.ts` + SSOT markdown  
  *Ratchet* → `bun run docs:map:check`
- **`script-gate`** — `scripts/pre-commit-harness.ts` · named `bun run`  
  *Ratchet* → husky pre-commit / named day-loop command
- **`proof`** — [`PROOF.md`](PROOF.md) · [`FRESH-RERUN.md`](FRESH-RERUN.md)  
  *Ratchet* → `lib/harness/proof.ts` evidence + `freshRerun` · `bun run harness:status`

- **`CI`** — `.github/workflows/` · `scripts/ci-*.ts`  
  *Ratchet* → `bun run ci:core` · required Harness Gates check

## Lesson index (detail in git)

- **Doc-refs re-stage loop** (`script-gate`)  
  *Ratchet* → annotate-on-write in pre-commit
- **Soft warn-tier ESLint** (`lint`)  
  *Ratchet* → `--max-warnings 0` + error rules
- **Affected / type-check fiction** (`script-gate`)  
  *Ratchet* → `affected-workspaces` · `tsconfig.check.json`
- **Install journey proof** (`proof`)  
  *Ratchet* → `proof:install` / `install:verify`
- **Annotate thrash / dirty tree** (`script-gate`)  
  *Ratchet* → `assertStagedMatchesWorktree`
- **Full-tree ESLint every PR** (`script-gate`)  
  *Ratchet* → `lint:bun-native:changed` · `HARNESS_FULL_LINT`
- **CI install × N jobs** (`CI`)  
  *Ratchet* → `ci:core` · `setup-factory-bun` · path filters
- **Docs dump attention tax** (`doc-map`)  
  *Ratchet* → slim live `docs/` · `doc-map-check`
- **Heap profile / fat READMEs** (`doc-map`)  
  *Ratchet* → gitignore `lib/profile.md` · JIT READMEs
- **Harness change without fresh-rerun evidence** (`proof`)  
  *Ratchet* → [`FRESH-RERUN.md`](FRESH-RERUN.md) · PR paste of claim `freshRerun` · `bun test tests/harness-fresh-rerun-contract.test.ts`
- **Discover / gate timing dumps in `git status`** (`script-gate`)  
  *Ratchet* → gitignore `artifacts/bun-native-discover*.json` · `reports/` · hygiene `harness-regenerable-staged` · `bun run clean`
- **Ephemeral scratch dumps polluting status** (`script-gate`)  
  *Ratchet* → default-deny `/scratch/**` · allowlist `README.md` + `bun-v1.3.9-examples/**` (session dumps / toc-ops / audit helpers stay local)
- **Pre-commit ESLint cold** (`script-gate`)  
  *Ratchet* → `.cache/eslint-bun-native`
- **GHA billing lock** (`ops`)  
  *Ratchet* → unlock Actions billing; local `ci:core` still proves
- **SSOT doc encyclopedia tax** (`doc-map`)  
  *Ratchet* → compress OPERATE / standards / docs/AGENTS to JIT
- **Generated CLI/REGISTRY tax** (`doc-map`)  
  *Ratchet* → stub + `help` / `packages:list`; regenerate on demand

Full prose lessons: `git show 4bd1e324:docs/harness/FEEDBACK.md` (pre-compression).
