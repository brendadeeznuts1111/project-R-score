# Tenant: portal-doctor

**Tenant** `portal-doctor`  
**Board** `/portal/doctor/` · lander widget · tools hub  
**Bake** `public/registry/doctor-state.json`  
**CLI** `bun run portal:doctor` · `bun run bake:doctor` · `bun run bake:doctor --check`  
**Policy** [`docs/UNIFIED.md`](../../UNIFIED.md) · bunfig group  
**Capability map** AGENTS.md — Unified Doctor · Bunfig · Doctor groups

Unified offline health gate for the portal control plane. Pure checks by default (no network); optional `--full` spawns install:verify and heavy gates.

## Groups

| Group | Checks (ids) |
|-------|----------------|
| `linker` | `linker-config-version` · `machine-isolated-linker` |
| `bakes` | vault / capability-map / bunfig-state presence |
| `catalog` | schema · shortcodes · help coverage · deprecated flags |
| `bunfig` | machine SSOT · project no machine keys · merge · excludes · frozenLockfile · no install env overrides |
| `gates` | only with `--full` |

## Bunfig probes

| id | level | Proves |
|----|-------|--------|
| `bunfig-machine-ssot` | fatal | `~/.bunfig.toml` linker/globalStore/age/excludes/cache.dir |
| `bunfig-machine-frozen-lockfile` | warn | machine declares `frozenLockfile` |
| `bunfig-project-no-machine-keys` | fatal | project does not set machine-owned install keys |
| `bunfig-merge-consistency` | fatal | effective isolated + globalStore + absolute cache |
| `bunfig-release-age-excludes` | warn | excludes cover type packages |
| `bunfig-no-install-env-overrides` | fatal | no `BUN_INSTALL_CACHE_DIR` / `BUN_INSTALL_GLOBAL_STORE` |

## Output (CI)

Plain text only (no box-drawing, no mid-line ellipsis):

```
portal-doctor  result=ok|fail  schema=4  checks=N/M  failed=…  fatal_failed=…
PASS  fatal  <check-id>
  <full message>
FAIL  fatal  <check-id>
  <full message>
  fix: <command>
summary  passed=…  failed=…
```

Machine: `portal-cli doctor --json` · fingerprint gate: `bun run bake:doctor:check` (sha256 of **portable** stable fields; offline Access probes).

**Portable fingerprint groups:** `linker` · `bakes` · `catalog` · `bunfig` only. Excludes `infra` (Access offline/live ok bits) and `gates` (`--full` spawns) so CI runners and laptops compare the same hash after `machine:bunfig:ensure`. Board `doctor-state.json` still lists all checks; `fingerprint` / `fingerprintPortable: true` cover the portable subset. Rare full-group hash: `bun tools/bake-doctor.ts --check --no-portable`.

## Signal (failure)

| Gate | Failure |
|------|---------|
| `bun run portal:doctor` | any fatal check failed (`result=fail`) |
| `bun run bake:doctor:check` | fingerprint mismatch or missing bake |
| `/portal/doctor/` missing tone | no bake — run `bake:doctor` |
| Nav badge red/yellow | last bake tone from doctor-state |

## Intervention

```bash
CI=true NO_COLOR=1 bun run portal:doctor:ci
bun run portal:doctor --group bunfig
bun run audit:bunfig
bun run install:verify
bun run bake:doctor
bun run bake:doctor:check
# loopback only:
curl -X POST http://127.0.0.1:3000/api/doctor/run
```

### CI (harness-gates)

| Step | Command |
|------|---------|
| Machine bunfig SSOT | `bun run machine:bunfig:ensure -- --overwrite` (also in setup-factory-bun) |
| Portal doctor (offline) | `bun run portal:doctor:ci` (ensure + `--env ci --no-write`) |
| doctor-state fingerprint | `bun run bake:doctor:check` (ensure + sha256) |

Template: [`config/machine.bunfig.toml.template`](../../../config/machine.bunfig.toml.template) → `~/.bunfig.toml` with absolute `cache.dir`. Without this, bunfig machine probes fail fatally on clean runners.

Live Access is **off** in CI (offline skips). Local edge proof: `portal-cli doctor --group infra --live-access`.

**Pre-commit:** when staged paths touch the bunfig policy surface (`bunfig.toml`, `config/machine.bunfig.toml.template`, `scripts/ensure-machine-bunfig.ts`, `scripts/lib/machine-bunfig.ts`, `tools/lib/portal-cli-doctor-bunfig.ts`), harness runs `bun run portal:doctor:bunfig:check` (offline · plain · `--no-write`). Escape: `SKIP_DOCTOR_BUNFIG=1`.

## Data plane

| Artifact | Path |
|----------|------|
| Doctor state | `/registry/doctor-state.json` |
| Board | `/portal/doctor/` |
| API (loopback) | `POST /api/doctor/run` |
| Probes | `tools/lib/portal-cli-doctor-bunfig.ts` |
