# Command map

Run from the claimed Project R worktree.

## Global and lane preflight

```bash
dx context
dx version
dx package
bun run lane:status
```

## Bun channel proof

```bash
bun run bun:channel:check
bun test tests/bun-channel-doctor.test.ts tests/bun-channel-doctor-cron.test.ts
bun run type-check:ci
```

`bun:channel:check` is read-only. `bun:channel:report` is the explicit derived
artifact write. Scheduler registration and removal are manual host mutations.

## Test and snapshot proof

| Intent                   | Command                                                  | Contract                                                                     |
| ------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Changed-file development | `bun run test:watch`                                     | Watch the affected test set.                                                 |
| Focused proof            | `bun test <test-file...>`                                | Name exact files; add `-t <pattern>` only for a narrower behavior.           |
| Focused coverage         | `bun run test:coverage -- <test-file...> [-t <pattern>]` | Exact files first; wrapper owns text + LCOV output under `coverage/focused`. |
| Changed staged scope     | `bun run test:changed`                                   | Project-owned changed-test resolver.                                         |
| Snapshot catalog check   | `bun run check:snapshots`                                | Validate headers, registrations, and orphan state without running tests.     |
| Snapshot contract proof  | `bun run test:snapshots`                                 | Run every registered snapshot suite.                                         |
| Scoped snapshot update   | `bun tools/bun-test-snapshots.ts --update --id <id>`     | File-scoped `-u`; review and stage only the owned diff.                      |
| Staged gate              | `.husky/pre-commit`                                      | Path-gated staged checks.                                                    |
| Merge proof              | `bun run bun:ci`                                         | Clean-worktree local authority, including the snapshot catalog.              |

Flag boundaries:

- `--parallel[=N]` distributes files and implies `--isolate`; never pass both.
- `--concurrent` and `--max-concurrency` control tests within a file.
- `--shard=M/N` splits files across deliberate CI jobs; it is not a local
  default.
- `-u` / `--update-snapshots` mutates expected output. Keep it file-scoped and
  never place it in a verification or merge command.
- `--randomize --seed=<n>` and `--rerun-each=<n>` are diagnostic lanes for
  ordering and flake detection. Record the seed or repetition count.
- `--coverage`, `--bail`, `--retry`, and `--smol` change the proof being run;
  add them only when the owning script or investigation requires them.

## Release proof

```bash
dx version
bun run bun:channel:check
bun run check:release-tracker
bun run type-check:ci
```

Before merge, run `.husky/pre-commit` and `bun run bun:ci` from a clean
worktree.

## Security proof

```bash
bun run security:guard:deps
bun run security:audit
bun run security:ci
```

## Search governance proof

```bash
bun run search:policy:check
bun run search:status:unified:strict
bun run search:bench:gate --json
```

Refresh owned artifacts only when strict status reports drift. Baseline
promotion requires explicit approval and `.search/POLICY_CHANGELOG.md` evidence.

## Emergency bundle

```bash
bun run search:preflight:emergency
```

This legacy search bundle does not replace `bun run bun:ci`.
