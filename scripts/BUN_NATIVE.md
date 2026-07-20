# Bun-native discovery & apply

Automated deeper scan of non-Bun file I/O debt, grounded in official Bun docs.

## Docs (source of truth)

- [File I/O](https://bun.com/docs/runtime/file-io) — `Bun.file`, `Bun.write`, `BunFile.delete`
- [exists](https://bun.com/docs/guides/read-file/exists) — `await Bun.file(path).exists()`
- [Glob](https://bun.com/docs/runtime/glob) — `new Bun.Glob(pattern)`
- Shared helpers: [`scripts/lib/fs-bun.ts`](lib/fs-bun.ts)

## Commands

```bash
# Discover (scripts + lib + packages + tools) + write report
bun run discover:bun-native

# JSON to stdout
bun run discover:bun-native:json

# Safe apply on scripts/ only (exists/read/write/console.log)
bun run discover:bun-native:apply:dry   # preview
bun run discover:bun-native:apply       # write files

# Direct
bun run scripts/bun-native-discover.ts --roots=scripts --apply
```

Report path: `artifacts/bun-native-discover.latest.json` (local / gitignored).

## Token-joined usage inventory (`bun-migrate inventory`)

Broader Node → Bun debt scan joined to the docs catalog (not limited to fs/spawn).

```bash
# Write JSON report (default path)
bun run migrate:inventory

# Product debt status (exit 1 if debt remains)
bun run migrate:status

# Table summary to stdout
bun scripts/bun-migrate.ts inventory --format table

# Pipe JSON yourself
bun scripts/bun-migrate.ts inventory --format json > reports/bun-usage-inventory.json

# Custom roots / include test files
bun scripts/bun-migrate.ts inventory --roots=lib,tools --include-tests --format table
```

Report path: `reports/bun-usage-inventory.json` (local / gitignored).

### Two section fields (do not conflate)

| Field | Source | Use |
|-------|--------|-----|
| `migrateSection` | PATTERN_MAP bucket | Filter/prioritize debt: `runtime`, `crypto`, `fs`, `shell`, `test`, … |
| `catalogSection` | `bun-docs-catalog.json` | Docs locus (`runtime`, `bundler`, `test`, …) |

Each hit includes `bunToken`, `nodePattern`, `docsUrl`, and `locusStatus` when the catalog knows the token.

```bash
# Crypto debt only
jq '[.hits[] | select(.migrateSection=="crypto")] | length' reports/bun-usage-inventory.json

# Hits missing catalog docs
jq '[.hits[] | select(.docsUrl == null)] | .[0:5]' reports/bun-usage-inventory.json
```

`apply --phase N --section SECTION` implements **phase 6–9** (crypto · fs · shell · runtime). Dry-run by default; pass `--write` to apply. Legacy safe fs apply on `scripts/` remains [`discover:bun-native:apply`](#commands).

```bash
# Phase 6 crypto
bun run bun-migrate apply --phase 6 --section crypto --dry-run
bun run migrate:crypto:apply
bun run validate:integrity

# Phase 7 fs — preview then write
bun run bun-migrate apply --phase 7 --section fs --dry-run
bun run migrate:fs:dry
bun run migrate:fs:apply

# Scoped to one workspace package dir
bun run bun-migrate apply --phase 7 --section fs --workspace p2p --dry-run

# After apply
bun run validate:integrity:fs
bun run validate:integrity:all   # crypto + fs + runtime + shell + test

# Phase 8 shell
bun run bun-migrate apply --phase 8 --section shell --dry-run
bun run migrate:shell:apply
bun run validate:integrity:shell

# Phase 9 runtime (process.env → Bun.env, which, inspect, hrtime)
bun run bun-migrate apply --phase 9 --section runtime --dry-run
bun run migrate:runtime:apply
bun run validate:integrity:runtime
```

### Migration status

```bash
bun run migrate:status          # product debt table (exit 1 if debt remains)
bun run migrate:inventory       # full JSON → reports/bun-usage-inventory.json
bun run validate:integrity:all  # gate all sections
```

| phase | migrateSection | product debt | Status |
|------:|----------------|-------------:|--------|
| 6 | crypto | 0 | ✅ clear |
| 7 | fs | 0 | ✅ clear |
| 8 | shell | 0 | ✅ clear |
| 9 | runtime | 0 | ✅ clear |

Inventory `summary` splits **productHits** (actionable debt) vs **whitelistedHits** (catalogs, mkdir-only, bun:fs, detector samples). Filter: `jq '.summary | {productHits, whitelistedHits, byMigrateSectionProduct}' reports/bun-usage-inventory.json`

Phases **6–9 product debt clear**. Re-run `migrate:status` after further edits.

## What is auto-applied (safe)

| From | To |
|------|-----|
| `existsSync(p)` | `fileExistsSync(p)` |
| `readFileSync(p, 'utf8')` | `readTextSync(p)` |
| `JSON.parse(readFileSync(...))` | `readJsonSync(...)` |
| `await readFile(p, 'utf8')` | `await readText(p)` |
| `await writeFile(p, data[, enc])` | `await writeText(p, data)` |
| `console.log(` | `console.info(` |
| + | import/`@see` for `scripts/lib/fs-bun` |

## Not auto-applied (report only)

- `readdir` / raw directory walks → prefer `Bun.Glob` or Bun-documented `node:fs` readdir
- bare `mkdir` without a following nested `Bun.write`
- `child_process` → `Bun.spawn`
- `process.env` → `Bun.env` (opt-in, many intentional Node-compat paths)
- crypto / streams / complex multi-arg fs APIs — **crypto:** `migrate:crypto:apply` + `validate:integrity`

## After apply

```bash
bun test tests/fs-bun.test.ts
bun run discover:bun-native --roots=scripts   # confirm hit delta
bun run migrate:inventory                       # refresh token-joined counts
bun run validate:integrity                      # crypto gate after phase 6
```
