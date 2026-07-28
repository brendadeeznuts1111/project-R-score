# Tenant: portal-doctor

**Tenant** `portal-doctor`  
**Board** `/portal/doctor/` · lander widget · tools hub  
**Bake** `public/registry/doctor-state.json`  
**CLI** `bun run portal:doctor` · `bun run bake:doctor` · `bun run bake:doctor:check`  
**Policy SSOT** [`lib/install/machine-bunfig-policy.ts`](../../../lib/install/machine-bunfig-policy.ts) · human map [`docs/UNIFIED.md`](../../UNIFIED.md)  
**Capability map** AGENTS.md — Unified Doctor · Bunfig · Doctor groups  
**Workflow** [`.github/workflows/harness-gates.yml`](../../../.github/workflows/harness-gates.yml)

Unified offline health gate for the portal control plane. Pure checks by default (no network); optional `--full` spawns install:verify and heavy gates.

## Groups

| Group | Checks (ids) |
|-------|----------------|
| `linker` | `linker-config-version` · `machine-isolated-linker` |
| `bakes` | vault / capability-map / bunfig-state presence |
| `catalog` | schema · shortcodes · help coverage · deprecated flags |
| `bunfig` | machine SSOT · project no machine keys · merge · excludes · frozenLockfile · no install env overrides |
| `infra` | Access offline/live (not in portable fingerprint) |
| `gates` | only with `--full` (not in portable fingerprint) |

## Bunfig probes

| id | level | Proves |
|----|-------|--------|
| `bunfig-machine-ssot` | fatal | `~/.bunfig.toml` linker/globalStore/age/excludes/cache.dir |
| `bunfig-machine-frozen-lockfile` | warn | machine declares `frozenLockfile` |
| `bunfig-project-no-machine-keys` | fatal | project does not set machine-owned install keys |
| `bunfig-merge-consistency` | fatal | effective isolated + globalStore + absolute cache |
| `bunfig-release-age-excludes` | warn | excludes cover type packages |
| `bunfig-no-install-env-overrides` | fatal | no `BUN_INSTALL_CACHE_DIR` / `BUN_INSTALL_GLOBAL_STORE` |

Machine-owned keys, age excludes, forbidden env, ephemeral CI allowlist, template path: **code SSOT** [`lib/install/machine-bunfig-policy.ts`](../../../lib/install/machine-bunfig-policy.ts) (doctor bunfig · `ensure-machine-bunfig` · `audit:bunfig`). Do not re-list in probes without importing.

## CI forensics

Operator map for harness-gates + local reproduce. Tables over narrative.

### Commands

| Command | Role |
|---------|------|
| `bun run machine:bunfig:ensure` | Write `~/.bunfig.toml` from `config/machine.bunfig.toml.template` (absolute `cache.dir`) |
| `bun run machine:bunfig:ensure -- --overwrite` | Replace host file (CI / setup-factory-bun) |
| `bun run machine:bunfig:check` | Snippets + absolute cache.dir (exit 1 on drift) |
| `bun run portal:doctor:ci` | ensure + doctor `--env ci --no-write` (plain offline) |
| `bun run portal:doctor:ci:json` | same as ci, JSON on stdout only |
| `bun run portal:doctor:ci:report` | One process: plain log + JSON artifact + GHA annotations + step summary |
| `bun run bake:doctor` | ensure + write `public/registry/doctor-state.json` |
| `bun run bake:doctor:check` | ensure + portable sha256 fingerprint vs on-disk bake |
| `bun run bake:doctor:check:report` | same + `reports/doctor-state-check.json` · step summary · `::error title=doctor-state::` |
| `bun run portal:doctor:bunfig:check` | offline plain bunfig group only (`--no-write`) |
| `bun run audit:bunfig` | workspace duplication / machine-key scan (`audit:bunfig:strict` harder) |
| `bun run install:verify` | install cache / linker hygiene (related; not doctor fingerprint) |

`--check --report` (or `GITHUB_ACTIONS` / `GITHUB_STEP_SUMMARY` set) writes forensics JSON. Rare full-group hash: `bun tools/bake-doctor.ts --check --no-portable`.

### Escapes (`SKIP_*`)

| Env | Scope | When |
|-----|--------|------|
| `SKIP_DOCTOR_BUNFIG=1` | pre-commit bunfig group | staged bunfig policy paths; write reason in commit |
| `SKIP_DOCTOR_STATE_CHECK=1` | pre-commit fingerprint | staged doctor-state bake paths; write reason in commit |
| `SKIP_TEST_CHANGED=1` | pre-commit / docs-only commits | when gates fail on other lanes' in-flight tests — evidence in commit message |

### Artifacts

| Artifact | Path / sink | Produced by |
|----------|-------------|-------------|
| CI JSON report | `reports/portal-doctor-ci.json` (gitignored) | `portal:doctor:ci:report` · GHA upload on failure |
| Doctor-state check forensics | `reports/doctor-state-check.json` (gitignored) | `bake:doctor:check:report` · GHA upload on failure |
| Doctor board bake | `public/registry/doctor-state.json` · `/registry/doctor-state.json` | `bake:doctor` |
| GHA annotations | stdout `::error` / `::warning title=portal-doctor::…` · `::error title=doctor-state::…` | doctor CI report / fingerprint check when `GITHUB_ACTIONS=true` |
| Step summary | `$GITHUB_STEP_SUMMARY` markdown | both report paths when env set |
| Plain CI log | stdout (PASS/FAIL lines, no TTY chrome) | `portal:doctor:ci` · `:ci:report` |

### Portable fingerprint groups

| Included (portable) | Excluded |
|---------------------|----------|
| `linker` · `bakes` · `catalog` · `bunfig` | `infra` (Access offline/live ok bits) · `gates` (`--full` spawns) |

- Code: `PORTABLE_DOCTOR_GROUPS` in `tools/bake-doctor.ts`
- **Product CI gate:** sha256 of stable fields (ids / ok / level / summary / byGroup) + field `drift[]` — **messages never fingerprinted**
- **Test twin:** `doctorStatesStableEqual` = `Bun.deepEquals(stableA, stableB, true)` on the same stripped payload (not the public log signal)
- **Live policy** (doctor bunfig · install:verify · audit): scalar `===` / `includes` vs `lib/install/machine-bunfig-policy.ts` — **not** deepEquals, **not** `Bun.semver`
- Board JSON still lists all groups; bake sets `fingerprint` + `fingerprintPortable: true`
- CI + laptop share the same hash after `machine:bunfig:ensure`

### harness-gates order

| Step | Command |
|------|---------|
| Machine bunfig SSOT | `bun run machine:bunfig:ensure -- --overwrite` |
| Portal doctor (offline) | `bun run portal:doctor:ci:report` |
| Upload CI report (on doctor failure) | artifact `portal-doctor-ci` ← `reports/portal-doctor-ci.json` |
| doctor-state fingerprint | `bun run bake:doctor:check:report` |

Template: [`config/machine.bunfig.toml.template`](../../../config/machine.bunfig.toml.template) → `~/.bunfig.toml`. Without ensure, bunfig machine probes fail fatally on clean runners.

Live Access is **off** in CI (offline skips). Local edge proof: `portal-cli doctor --group infra --live-access`.

### Pre-commit triggers

| Staged surface | Gate | Escape |
|----------------|------|--------|
| `bunfig.toml` · `config/machine.bunfig.toml.template` · `scripts/ensure-machine-bunfig.ts` · `scripts/lib/machine-bunfig.ts` · `tools/lib/portal-cli-doctor-bunfig.ts` | `bun run portal:doctor:bunfig:check` | `SKIP_DOCTOR_BUNFIG=1` |
| `public/registry/doctor-state.json` · `tools/bake-doctor.ts` | `bun run bake:doctor:check` | `SKIP_DOCTOR_STATE_CHECK=1` |

Harness: `scripts/pre-commit-harness.ts` (`isDoctorBunfigPath` · `isDoctorStatePath`).

### Local reproduce

```bash
bun run machine:bunfig:ensure -- --overwrite
CI=true NO_COLOR=1 bun run portal:doctor:ci:report
# or: portal:doctor:ci  (no JSON / no GHA sinks)
bun run portal:doctor --group bunfig
bun run audit:bunfig
bun run bake:doctor
bun run bake:doctor:check
bun run bake:doctor:check:report
# loopback only:
curl -X POST http://127.0.0.1:3000/api/doctor/run
```

### Output shape (CI plain)

```
portal-doctor  result=ok|fail  schema=4  checks=N/M  failed=…  fatal_failed=…
PASS  fatal  <check-id>
  <full message>
FAIL  fatal  <check-id>
  <full message>
  fix: <command>
summary  passed=…  failed=…
report  reports/portal-doctor-ci.json
```

Machine JSON: `portal-cli doctor --json` · GHA annotation shape: `::error title=portal-doctor::<id> [fatal] <msg> | fix: <cmd>`.

## Signal (failure)

| Gate | Failure |
|------|---------|
| `bun run portal:doctor` / `:ci:report` | any fatal check failed (`result=fail` / exit 1) |
| `bun run bake:doctor:check` / `:check:report` | fingerprint mismatch or missing bake |
| `/portal/doctor/` missing tone | no bake — run `bake:doctor` |
| Nav badge red/yellow | last bake tone from doctor-state |

## Data plane

| Artifact | Path |
|----------|------|
| Doctor state | `/registry/doctor-state.json` |
| Board | `/portal/doctor/` |
| CI report (local/GHA) | `reports/portal-doctor-ci.json` |
| Fingerprint forensics | `reports/doctor-state-check.json` |
| API (loopback) | `POST /api/doctor/run` |
| Policy SSOT | `lib/install/machine-bunfig-policy.ts` |
| Bunfig probes | `tools/lib/portal-cli-doctor-bunfig.ts` |
| CI report script | `scripts/doctor-ci-report.ts` |
| Bake / fingerprint / check report | `tools/bake-doctor.ts` |
