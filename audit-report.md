# Packages metafile audit

- Generated: 2026-07-28T04:15:40.252Z
- Bun: 1.4.0
- Score: **100/100** (healthy)
- Scanned: 27 · Entrypoints: 10
- Orphans: 0 (0%) · Cycles: 0

## Diff

- Score Δ: 0 (prev 100)
- Orphan Δ: 0 · Cycle Δ: 0
- Added orphans: —
- Removed orphans: —

## Summary

- Packages: 9 · avg score **93.9**
- Coupling: 3 consumed · 3 root-tooling · 0 scripted · 3 dormant
- Open actions: 3 · archive placeholders: 1
- Top hub: lib/docs

## Packages

| Package | Role | Score | Scanned | Orphans | KiB |
|---|---|---:|---:|---:|---:|
| ab-testing | dormant | 85 | 3 | 0 | 5.4 |
| business | root-tooling | 100 | 4 | 0 | 8.5 |
| docs-tools | root-tooling | 100 | 6 | 0 | 83.6 |
| guards | consumed | 100 | 2 | 0 | 5.2 |
| p2p | root-tooling | 100 | 4 | 0 | 24.1 |
| package | dormant | 75 | 1 | 0 | 0.1 |
| registry-client | consumed | 100 | 1 | 0 | 8.0 |
| rip | consumed | 100 | 4 | 0 | 34.9 |
| versioning | dormant | 85 | 2 | 0 | 20.3 |

## Package map

Layers: 0:[ab-testing, business, docs-tools, guards, p2p, package, registry-client, rip, versioning]

### Cross-package edges

_(none — packages are isolated)_


### External edges

- `docs-tools` → `lib/docs` (lib, w=11)
- `p2p` → `bare:bun` (bare, w=3)
- `rip` → `bare:bun` (bare, w=3)
- `business` → `bare:bun` (bare, w=1)
- `business` → `lib/docs` (lib, w=1)
- `docs-tools` → `bare:url` (bare, w=1)
- `guards` → `config` (config, w=1)

### Intra-package depth

- `ab-testing`: depth 3 · 3 files
- `business`: depth 3 · 4 files
- `docs-tools`: depth 3 · 6 files
- `p2p`: depth 3 · 4 files
- `rip`: depth 3 · 4 files
- `guards`: depth 2 · 2 files
- `versioning`: depth 2 · 2 files

### Outside consumers

- `registry-client`: 3 file(s) — lib/verification/install-env-probes.ts, lib/verification/registry-client-probes.ts, tests/registry-sdk.test.ts
- `guards`: 1 file(s) — config/eslint/harness/report.ts
- `rip`: 1 file(s) — scripts/bun-rules.ts

### Declared vs actual

- Root workspace deps: 6/9
- Packages with undeclared cross-imports: 0


### External hubs

- `lib/docs` (lib) w=12 ← business, docs-tools
- `bare:bun` (bare) w=7 ← business, p2p, rip
- `bare:url` (bare) w=1 ← docs-tools
- `config` (config) w=1 ← guards

### Coupling roles

- `ab-testing`: **dormant** · outside=0 · dependents=0 · root=false
- `business`: **root-tooling** · outside=0 · dependents=0 · root=true
- `docs-tools`: **root-tooling** · outside=0 · dependents=0 · root=true
- `guards`: **consumed** · outside=1 · dependents=0 · root=true
- `p2p`: **root-tooling** · outside=0 · dependents=0 · root=true
- `package`: **dormant** · outside=0 · dependents=0 · root=false
- `registry-client`: **consumed** · outside=3 · dependents=0 · root=true
- `rip`: **consumed** · outside=1 · dependents=0 · root=true
- `versioning`: **dormant** · outside=0 · dependents=0 · root=false

### Archive probes

- `ab-testing`: library → **keep-review** (3 files, 5529B) — dormant with real source — review before archive
- `package`: placeholder → **archive** (1 files, 104B) — index is empty export / placeholder
- `versioning`: library → **keep-review** (2 files, 20776B) — dormant with real source — review before archive

### Actions

- `ab-testing`: **archive-candidate** — no outside imports, no root dep, no package.json script refs
- `package`: **archive-candidate** — no outside imports, no root dep, no package.json script refs
- `versioning`: **archive-candidate** — no outside imports, no root dep, no package.json script refs

### Quarantine (archive blocked)

- `package`: index is empty export / placeholder · blocked by: tsconfig.json, docs/IMPORT_BOUNDARIES.md, scripts/verify-package-import-boundaries.ts, .agents/skills/ast-grep/repo-map.json

### Proton / env.template

- Packages with Bun.env: 2 · keys: 1
- Vaulted hits: 0 · missing template: 0

- `business`: REDIS_URL
- `p2p`: REDIS_URL

### Env inventory (owners)

- unique=183 · owners=60 · packageTouched=1 · multiPlane=27
- root runtime missing=1 · defaultsIssues=0 (pkg=0)

- `REDIS_URL` ×9 · pkgs=[business, p2p] · planes=[config, packages, tools] · rootTpl=true

## Notes

- Entrypoints: 9 index · 1 cli · 0 main/bin · 0 package.json
- leaves = zero outbound imports (not dead). orphans = scanned but unreachable from entrypoints.
- 8 external input(s) pulled into graph (lib/, config/, …) — expected for workspace edges.
- score 100/100 (healthy)
- cross-check: metafile orphans=0 · transpiler orphans(excl entry)=0 · cycles(transpiler)=0
- Package map: no cross-package edges (packages are isolated islands)
- Outside consumers (lib/tools/scripts/tests): registry-client:3, guards:1, rip:1
- Declared: 6/9 in root workspace deps · 0 pkg(s) with undeclared cross-imports
- Intra depth: deepest ab-testing depth=3 files=3
- External hubs: lib/docs:12, bare:bun:7, bare:url:1
- Coupling: 3 consumed · 3 root-tooling · 0 scripted · 3 dormant (ab-testing, package, versioning)
- Actions: ab-testing:archive-candidate, package:archive-candidate, versioning:archive-candidate
- Summary: avgPkg=93.9 · openActions=3 · archivePlaceholders=1 · hub=lib/docs
- Archive probes: package(placeholder)
- Vault: 2 pkg(s) with Bun.env · 1 keys · inTemplate=2 · missingTemplate=0 · openActions=0
- Env inventory: unique=183 · secrets=15 · config=151 · actionableGaps=2 · rootRuntimeMissing=1 · owners=60 · pkgKeys=1 · multiPlane=27 · defaultsIssues=0
- Quarantine: package(blocked=4)
