# Bun test speed — parallel, changed, shard

Immediate wins from Bun 1.3.13+ test runner flags. Machine install SSOT (`linker = "isolated"`, streaming extract) lives in `~/.bunfig.toml` — **do not** duplicate in workspace `bunfig.toml`.

## Local day-loop

| Command | What |
|---------|------|
| `bun run test:changed` | Import-graph filter on dirty/HEAD… + **`--parallel`** (fresh isolate per file) |
| `bun run test:changed:watch` | Re-query git + re-run affected |
| `bun run test:watch` | Native `--changed --watch --parallel` |
| `bun run test:changed:serial` | Opt out of workers (`--serial` / `BUN_TEST_SERIAL=1`) |
| `bun run test` | Full `tests/` suite (serial — reliable; some files hang under workers) |
| `bun run test:parallel` | Full `tests/` with workers + 30s timeout |
| `bun run test:ci` | Serial `tests/` + JUnit → `tmp/junit.xml` |
| `SHARD=2/4 bun run test:ci:shard` | One of N CI shards (serial per shard — wall time still /N) |
| `SHARD=2/4 bun run test:ci:shard:parallel` | Shard + 4 workers (use when suite is hang-clean) |

Wrapper: [`scripts/bun-test-changed.ts`](../scripts/bun-test-changed.ts) — skips the test runner when the change set has no code-like files.

## CI

- **harness-gates** → `ci:harness` → `test:changed` (already parallel via wrapper).
- **test-sharded** (`.github/workflows/test-sharded.yml`) → matrix `1/4`…`4/4` full suite, JUnit artifacts.

## Pre-commit

When staged `*.ts`/`*.js` exist:

```bash
bun run test:changed -- --bail=1
```

Escape hatch: `SKIP_TEST_CHANGED=1`.

## Flags (Bun)

```text
--parallel[=N]   worker processes (implies --isolate)
--isolate        fresh global object per test file
--shard=M/N      subset of files for CI matrix
--changed[=REF]  tests that transitively import changed files
--bail=1         stop on first failure
--reporter=junit --reporter-outfile=path
```

## What you do **not** need to configure

| Capability | Status |
|------------|--------|
| Streaming `bun install` extract | On by default |
| `linker = isolated` | Machine `~/.bunfig.toml` |
| Source-map bit-pack memory | Runtime automatic |
| zlib-ng compress | Runtime automatic |
| `Range` / 206 on static files | [`scripts/serve-public.ts`](../scripts/serve-public.ts) already documents Range |

## Suite inventory

```bash
bun run test:inventory          # scripts/suite-inventory.ts → tmp/test-file-report.json
```

Baseline (2026-07-27, serial per-file, 20s wall): **260 files · ~238 pass · ~21 fail · 1 slow/hang-risk**  
(`tests/harness-tenant-runbooks.test.ts` runs multi-tenant freshReruns — allow **≥180s** timeout).

### Fixed in deep pass (examples)

| File | Issue |
|------|--------|
| `play-callback.ts` | missing `AccountService` import (e2e) |
| `play-settlement.ts` | outbox enqueue skipped when no `play_distribution` rows |
| `defaults-cron.test.ts` | case count 12→13 |
| `r2-env.test.ts` | `.env.example` bucket `factory-wager-registry` |
| `seat-capital-desk-rich.test.ts` | Fill button labels for max/fp todos |

### Notes

- **Changed/watch loops use `--parallel` by default** (few files → isolation wins).
- Full `tests/` suite: prefer **serial** (`bun run test` / `test:ci:shard`) until hangers under `--isolate` are cleaned.
- Small suites (<~10 files) may not beat serial wall time (spawn overhead).
- Sharding still cuts CI wall time ≈ **N-way** even with serial workers.
- Secrets continuous watch: `bun run test:secrets:watch`.
- **Do not** set `linker = isolated` in workspace `bunfig.toml` — machine SSOT is `~/.bunfig.toml`.
