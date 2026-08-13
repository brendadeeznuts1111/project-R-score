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

## Upstream Bun feedback boundary

[`bun feedback`](https://bun.com/docs/feedback) sends an external report to
Bun. It is an operator action, never an automated harness, template, test, CI,
or agent action. Before sending one, prepare a minimal reproduction with
`bun --version`, expected/actual behavior, and reviewed non-secret inputs.
`bun feedback --email <address>` is optional; the recipient is never inferred
from repository configuration.

## Promote

- **`type`** — brand / path-bun / parse*  
  *Ratchet* → `bun run check:brands` · `tsc --project tsconfig.check.json`
- **`lint`** — `config/eslint/plugin-harness/` · `plugin-bun/`  
  *Ratchet* → `bun eslint --config eslint.harness.config.ts --quiet` (**error** rules)
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
- **lib/docs dual-era (closed)** (`type`)  
  *Ratchet* → `tsconfig.check.json` include `lib/docs/**/*` · claim `lib-docs-typecheck` · `bun run type-check`
- **lib/utils dual-era (closed)** (`type`)  
  *Ratchet* → `tsconfig.check.json` include `lib/utils/**/*` · claim `lib-utils-typecheck` · `bun run type-check`
- **lib/core dual-era / ErrorSeverity string literals (closed)** (`type`)  
  *Ratchet* → `tsconfig.check.json` include `lib/core/**/*` · claim `lib-core-typecheck` · `bun run type-check`
- **lib/security dual-era (closed)** (`type`)  
  *Ratchet* → `tsconfig.check.json` include `lib/security/**/*` · claim `lib-security-typecheck` · `bun run type-check`
- **Spine single-tenant (only docs-integrity)** (`proof`)  
  *Ratchet* → `spine/tenants.ts` ≥2 · claim `spine-multi-tenant` · `bun run spine:schedule:once -- --tenant=install-verify`
- **Spine tenant without typed maintenance runbook** (`proof`)  
  *Ratchet* → `lib/harness/maintenance.ts` · `docs/harness/tenants/` · claim `spine-maintenance-runbooks` · `bun run test:tenant-runbooks`
- **tools/ path dual-era (closed)** (`type`)  
  *Ratchet* → `bun run check:path-bun` covers `lib/**` + `tools/**` · claim `path-bun`
- **Discover / gate timing dumps in `git status`** (`script-gate`)  
  *Ratchet* → gitignore `reports/` · hygiene `harness-regenerable-staged` · `bun run clean`
- **Ephemeral scratch dumps polluting status** (`script-gate`)  
  *Ratchet* → default-deny `/scratch/**` · allowlist `README.md` + `bun-v1.3.9-examples/**` (session dumps / toc-ops / audit helpers stay local)
- **Pre-commit ESLint cold** (`script-gate`)  
  *Ratchet* → `.cache/eslint-bun-native`
- **GHA billing lock** (`ops`)  
  *Ratchet* → local `ci:core` + type-check scripts prove merge; admin-merge until billing unlocks runners ([AUTHORITY.md](AUTHORITY.md))
- **Actions billing noise in `harness:status`** (`ops`)  
  *Ratchet* → mute 0-step / billing checks by default; `--show-actions-noise` to unmute · local `ci:core` remains merge proof ([README.md](README.md) · [AUTHORITY.md](AUTHORITY.md))
- **R2 Basic auth mistaken for S3 SigV4** (`proof`) — closed  
  *Ratchet* → `lib/factory/object-store.ts` `createS3RegistryStore` · memory store in tests · edge R2 binding (`factory-registry-pages-proxy-v1`)
- **Bun.* APIs inside Pages Functions** (`lint` / `proof`)  
  *Ratchet* → edge handlers use Web/Workers APIs + R2 bindings only; Bun markdown/S3 stay in `lib/factory/` (CLI) · claim `factory-registry-pages-proxy-v1`
- **bun.sh vs bun.com doc refs** (`doc-map`)  
  *Ratchet* → prefer `https://bun.com/docs/...` from `bun tools/bun-doc-refs.ts url|suggest` (canonical map)
- **Pages `functions/` unexpected-root-dir** (`script-gate`)  
  *Ratchet* → `ALLOWED_ROOT_DIRS` includes `functions` · `bun run hygiene`
- **Root policy / runtime output drift** (`script-gate`)
  *Ratchet* → `config/repo-root-policy.ts` owns integrations + routes · runtime snapshots default to `artifacts/snapshots/` · `bun run hygiene`
- **Kalshi-bot orphan gitlink** (`ops`)  
  *Ratchet* → `.gitmodules` + `ALLOWED_ROOT_DIRS` includes `Kalshi-bot` · keep Jekyll exclude in `_config.yml`
- **Portal `*.js` gitignored** (`script-gate`)  
  *Ratchet* → `.gitignore` `!public/portal/**/*.js`
- **SSOT doc encyclopedia tax** (`doc-map`)  
  *Ratchet* → compress OPERATE / standards / docs/AGENTS to JIT
- **Generated CLI/REGISTRY tax** (`doc-map`)  
  *Ratchet* → stub + `help` / `packages:list`; regenerate on demand

Full prose lessons: `git show 4bd1e324:docs/harness/FEEDBACK.md` (pre-compression).
