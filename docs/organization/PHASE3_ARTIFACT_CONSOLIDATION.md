# Phase 3: Artifact & Diagnostic Consolidation

**Date:** 2026-05-16  
**Context:** Continuation after Phase 2 + 2.5 (root reduced from 98 → 69)

## Overview

This phase focused on consolidating the many small **diagnostic, log, profile, release, report, and snapshot** directories that had accumulated at the root. These are not source code — they are generated or collected runtime artifacts.

**Goal:** Reduce root noise by ~9 directories with a single, logical `artifacts/` bucket while preserving full directory structure inside it.

## Changes Made

### 1. New Top-Level Directory Created
- `artifacts/` — Canonical home for all output / diagnostic material

### 2. Directories Consolidated into `artifacts/`

| Directory     | Size   | Tracked | Contents                          | New Location                  |
|---------------|--------|---------|-----------------------------------|-------------------------------|
| alerts/       | 4K     | 1       | alerts.json (Slack config)        | artifacts/alerts/             |
| backups/      | 20K    | 0       | Backup files                      | artifacts/backups/            |
| data/         | 436K   | 0       | Various data exports              | artifacts/data/               |
| logs/         | 1.3M   | 0       | Log files                         | artifacts/logs/               |
| metrics/      | 4K     | 0       | Metrics data                      | artifacts/metrics/            |
| profiles/     | 1.9M   | 0       | CPU/Heap profiles + bench-profile | artifacts/profiles/           |
| releases/     | 80K    | 3       | Official zips + checksums         | artifacts/releases/           |
| reports/      | 29M    | 1       | Large diagnostic reports          | artifacts/reports/            |
| snapshots/    | 8K     | 2       | Snapshot json files               | artifacts/snapshots/          |

**Total moved:** 9 directories  
**New root reduction:** ~9 entries

### 3. Additional Small Dir Cleanups

- `templates/` (1 file: `deep-benchmark.ts`)  
  → File moved to `benchmarks/deep-benchmark.ts`  
  → `bench:deep` script in root `package.json` updated

- `rules/` (1 yaml file)  
  → Moved to `config/rules/rule-factory-trans-154.yaml`

- `types/` (1 d.ts file)  
  → Left as minimal `types/` for now (bun-reload.d.ts)

## Updated References
- Root `package.json`:
  - `bench:deep` path updated
- No other script or import references required changes for the artifact move (these dirs were mostly data-only)

## Root Directory Impact

**Before Phase 3:** ~69 top-level entries  
**After Phase 3:** **59** top-level entries

The root is now significantly more focused on:
- Core platform code (`src/`, `lib/`, `packages/`)
- Active featured projects (`barbershop/`, `factorywager/`, `kimiremote/`, `peer/`, `scratch/`)
- Shared infrastructure (`docs/`, `scripts/`, `tests/`, `benchmarks/`, `tools/`, `utils/`, `artifacts/`, `config/`, etc.)

## Structure After Phase 3

```
Projects/
├── artifacts/               # NEW - all diagnostic/output material
│   ├── alerts/
│   ├── backups/
│   ├── data/
│   ├── logs/
│   ├── metrics/
│   ├── profiles/
│   ├── releases/
│   ├── reports/
│   └── snapshots/
├── benchmarks/              # Now also contains deep-benchmark.ts
├── config/
│   └── rules/
├── packages/
│   └── bun-markdown-constants/   # Promoted in Phase 2.5
├── projects/
│   ├── archive/
│   ├── experimental/        # Now includes clawdbot/
│   └── ...
├── scripts/
│   └── analysis/
├── tests/
│   ├── protocol/
│   └── results/
└── ... (core platform dirs)
```

## Verification
- All moves used `git mv` where tracked content existed
- Untracked diagnostic material force-added under `artifacts/`
- Root reduced to 59 entries
- No breakage to core scripts or builds
- Working tree committed cleanly

## Next Possible Work (Future Phases)

- Further cleanup of remaining small single-file dirs (`types/`, etc.)
- Decision on the last major featured projects still at root:
  - `barbershop/` (heavily integrated)
  - `factorywager/`
  - `kimiremote/`
  - `peer/`
  - `scratch/` (playgrounds)
- Possible introduction of `projects/featured/` or `projects/enterprise/` for the above
- Internal organization inside `projects/experimental/` and `projects/archive/`

---

**Phase 3 complete.** The Projects root is now much more intentional and follows the documented architecture.

**Total reduction across all phases:** 98 → 59 top-level entries (39 directories/files removed or consolidated) while preserving full history and structure.