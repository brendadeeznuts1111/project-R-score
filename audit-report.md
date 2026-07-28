# Packages metafile audit

- Generated: 2026-07-28T03:16:19.700Z
- Bun: 1.4.0
- Score: **100/100** (healthy)
- Scanned: 27 · Entrypoints: 10
- Orphans: 0 (0%) · Cycles: 0

## Diff

- Score Δ: 0 (prev 100)
- Orphan Δ: 0 · Cycle Δ: 0
- Added orphans: —
- Removed orphans: —

## Packages

| Package | Scanned | InGraph | Orphans | KiB |
|---|---:|---:|---:|---:|
| ab-testing | 3 | 3 | 0 | 5.4 |
| business | 4 | 4 | 0 | 8.5 |
| docs-tools | 6 | 6 | 0 | 83.6 |
| guards | 2 | 2 | 0 | 5.2 |
| p2p | 4 | 4 | 0 | 24.1 |
| package | 1 | 1 | 0 | 0.1 |
| registry-client | 1 | 1 | 0 | 8.0 |
| rip | 4 | 4 | 0 | 34.9 |
| versioning | 2 | 2 | 0 | 20.3 |

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
- `rip`: 1 file(s) — scripts/bun-rules.ts

### Declared vs actual

- Root workspace deps: 4/9
- Packages with undeclared cross-imports: 0


## Notes

- Entrypoints: 9 index · 1 cli · 0 main/bin · 0 package.json
- leaves = zero outbound imports (not dead). orphans = scanned but unreachable from entrypoints.
- 8 external input(s) pulled into graph (lib/, config/, …) — expected for workspace edges.
- score 100/100 (healthy)
- cross-check: metafile orphans=0 · transpiler orphans(excl entry)=0 · cycles(transpiler)=0
- Package map: no cross-package edges (packages are isolated islands)
- Outside consumers (lib/tools/scripts/tests): registry-client:3, rip:1
- Declared: 4/9 in root workspace deps · 0 pkg(s) with undeclared cross-imports
- Intra depth: deepest ab-testing depth=3 files=3
