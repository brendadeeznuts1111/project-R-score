# Feedback → ratchet

Turn a repeated correction into the **earliest durable owner** so the next
trajectory does not re-learn it in chat.

Upstream:
[Turn feedback into infrastructure](https://github.com/lopopolo/harness-engineering/tree/trunk/docs/feedback).

## Template

```markdown
## Lesson

- **Finding:** (what failed / what the agent did wrong)
- **Repair:** (what fixed this instance)
- **Earliest owner:** type | lint | skill | doc-map | script-gate | proof | CI |
  ops
- **Ratchet:** (concrete check or doc link that blocks recurrence)
- **Keep / revise / drop:** after a fresh rerun (paste `freshRerun` output —
  [`FRESH-RERUN.md`](FRESH-RERUN.md))
```

Scaffold: `bun run harness:lesson --title="…"`.

Fresh-rerun is mandatory for improve-harness retain/revise/remove: run the
affected claim’s `freshRerun` from `lib/harness/proof.ts` and paste the terminal
output into the PR.

## Upstream Bun feedback boundary

`bun feedback` was **removed in Bun 1.4.0**
([#38444](https://bun.com/blog/bun-v1.4#other-behavior-changes)). Do not call it
from scaffolds, tests, CI, or agents. File Bun issues via GitHub / Discord with
a minimal reproduction (`bun --version`, expected/actual, non-secret inputs).

This page is about **harness feedback → ratchet** (lessons), not the removed
CLI.

## Promote

- **`type`** — brand / path-bun / parse*  
  _Ratchet_ → `bun run check:brands` · `tsc --project tsconfig.check.json`
- **`lint`** — `config/eslint/plugin-harness/` · `plugin-bun/`  
  _Ratchet_ → `bun eslint --config eslint.harness.config.ts --quiet` (**error**
  rules)
- **`skill`** — `.agents/skills/<name>/SKILL.md`  
  _Ratchet_ → skill retrieved on fresh rerun of the same job class
- **`doc-map`** — `lib/docs/repo-docs.ts` + SSOT markdown  
  _Ratchet_ → `bun run docs:map:check`
- **`script-gate`** — `scripts/pre-commit-harness.ts` · named `bun run`  
  _Ratchet_ → husky pre-commit / named day-loop command
- **`proof`** — [`PROOF.md`](PROOF.md) · [`FRESH-RERUN.md`](FRESH-RERUN.md)  
  _Ratchet_ → `lib/harness/proof.ts` evidence + `freshRerun` ·
  `bun run harness:status`

- **`CI`** — `.github/workflows/` · `scripts/ci-*.ts`  
  _Ratchet_ → `bun run ci:core` · required Harness Gates check

## Lesson index (detail in git)

- **Doc-refs re-stage loop** (`script-gate`)  
  _Ratchet_ → annotate-on-write in pre-commit
- **Soft warn-tier ESLint** (`lint`)  
  _Ratchet_ → `--max-warnings 0` + error rules
- **Affected / type-check fiction** (`script-gate`)  
  _Ratchet_ → `affected-workspaces` · `tsconfig.check.json`
- **Install journey proof** (`proof`)  
  _Ratchet_ → `proof:install` / `install:verify`
- **Annotate thrash / dirty tree** (`script-gate`)  
  _Ratchet_ → `assertStagedMatchesWorktree`
- **Full-tree ESLint every PR** (`script-gate`)  
  _Ratchet_ → `lint` · `lint:all` · `HARNESS_FULL_LINT`
- **CI install × N jobs** (`CI`)  
  _Ratchet_ → `ci:core` · `setup-factory-bun` · path filters
- **Docs dump attention tax** (`doc-map`)  
  _Ratchet_ → slim live `docs/` · `doc-map-check`
- **Heap profile / fat READMEs** (`doc-map`)  
  _Ratchet_ → gitignore `lib/profile.md` · JIT READMEs
- **Harness change without fresh-rerun evidence** (`proof`)  
  _Ratchet_ → [`FRESH-RERUN.md`](FRESH-RERUN.md) · PR paste of claim
  `freshRerun` · `bun test tests/harness-fresh-rerun-contract.test.ts`
- **lib/docs dual-era (closed)** (`type`)  
  _Ratchet_ → `tsconfig.check.json` include `lib/docs/**/*` · claim
  `lib-docs-typecheck` · `bun run type-check`
- **lib/utils dual-era (closed)** (`type`)  
  _Ratchet_ → `tsconfig.check.json` include `lib/utils/**/*` · claim
  `lib-utils-typecheck` · `bun run type-check`
- **lib/core dual-era / ErrorSeverity string literals (closed)** (`type`)  
  _Ratchet_ → `tsconfig.check.json` include `lib/core/**/*` · claim
  `lib-core-typecheck` · `bun run type-check`
- **lib/security dual-era (closed)** (`type`)  
  _Ratchet_ → `tsconfig.check.json` include `lib/security/**/*` · claim
  `lib-security-typecheck` · `bun run type-check`
- **Spine single-tenant (only docs-integrity)** (`proof`)  
  _Ratchet_ → `spine/tenants.ts` ≥2 · claim `spine-multi-tenant` ·
  `bun run spine:schedule:once -- --tenant=install-verify`
- **Spine tenant without typed maintenance runbook** (`proof`)  
  _Ratchet_ → `lib/harness/maintenance.ts` · `docs/harness/tenants/` · claim
  `spine-maintenance-runbooks` · `bun run test:tenant-runbooks`
- **tools/ path dual-era (closed)** (`type`)  
  _Ratchet_ → `bun run check:path-bun` covers `lib/**` + `tools/**` · claim
  `path-bun`
- **Discover / gate timing dumps in `git status`** (`script-gate`)  
  _Ratchet_ → gitignore `reports/` · hygiene `harness-regenerable-staged` ·
  `bun run clean`
- **Ephemeral scratch dumps polluting status** (`script-gate`)  
  _Ratchet_ → default-deny `/scratch/**` · allowlist `README.md` +
  `bun-v1.3.9-examples/**` (session dumps / toc-ops / audit helpers stay local)
- **Pre-commit ESLint cold** (`script-gate`)  
  _Ratchet_ → `.cache/eslint-bun-native`
- **GHA billing lock** (`ops`)  
  _Ratchet_ → local `ci:core` + type-check scripts prove merge; admin-merge
  until billing unlocks runners ([AUTHORITY.md](AUTHORITY.md))
- **Actions billing noise in `harness:status`** (`ops`)  
  _Ratchet_ → mute 0-step / billing checks by default; `--show-actions-noise` to
  unmute · local `ci:core` remains merge proof ([README.md](README.md) ·
  [AUTHORITY.md](AUTHORITY.md))
- **R2 Basic auth mistaken for S3 SigV4** (`proof`) — closed  
  _Ratchet_ → `lib/factory/object-store.ts` `createS3RegistryStore` · memory
  store in tests · edge R2 binding (`factory-registry-pages-proxy-v1`)
- _*Bun.* APIs inside Pages Functions_* (`lint` / `proof`)  
  _Ratchet_ → edge handlers use Web/Workers APIs + R2 bindings only; Bun
  markdown/S3 stay in `lib/factory/` (CLI) · claim
  `factory-registry-pages-proxy-v1`
- **bun.sh vs bun.com doc refs** (`doc-map`)  
  _Ratchet_ → prefer `https://bun.com/docs/...` from
  `bun tools/bun-doc-refs.ts url|suggest` (canonical map)
- **Pages `functions/` unexpected-root-dir** (`script-gate`)  
  _Ratchet_ → `ALLOWED_ROOT_DIRS` includes `functions` · `bun run hygiene`
- **Root policy / runtime output drift** (`script-gate`) _Ratchet_ →
  `config/repo-root-policy.ts` owns integrations + routes · runtime snapshots
  default to `artifacts/snapshots/` · `bun run hygiene`
- **Kalshi-bot orphan gitlink** (`ops`)  
  _Ratchet_ → `.gitmodules` + `ALLOWED_ROOT_DIRS` includes `Kalshi-bot` · keep
  Jekyll exclude in `_config.yml`
- **Portal `*.js` gitignored** (`script-gate`)  
  _Ratchet_ → `.gitignore` `!public/portal/**/*.js`
- **SSOT doc encyclopedia tax** (`doc-map`)  
  _Ratchet_ → compress OPERATE / standards / docs/AGENTS to JIT
- **Generated CLI/REGISTRY tax** (`doc-map`)  
  _Ratchet_ → stub + `help` / `packages:list`; regenerate on demand

Full prose lessons: `git show 4bd1e324:docs/harness/FEEDBACK.md`
(pre-compression).
