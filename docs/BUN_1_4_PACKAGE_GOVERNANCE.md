# Bun 1.4 package governance

Package licensing and release-media rights are separate review planes. This
document governs packages resolved through `bun.lock`; it does not grant any
right to copy Bun blog images, videos, posters, or embeds. Media policy lives in
[`BUN_1_4_MEDIA_RIGHTS.md`](./BUN_1_4_MEDIA_RIGHTS.md).

## Read-only review loop

| Question                                             | Bun 1.4 command                 | Repository command                       | Behavior                                                                                                                         |
| ---------------------------------------------------- | ------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Are production license labels structurally complete? | `bun pm licenses --prod --json` | `bun run dependencies:licenses`          | Normalizes counts and removes machine-specific install paths. Unknown, unlicensed, and `SEE LICENSE IN` labels fail review.      |
| Can compatible lockfile versions collapse?           | `bun dedupe --check`            | `bun run dependencies:dedupe:check`      | Exits non-zero without writing when a duplicate can be removed.                                                                  |
| Are both checks clean?                               | both commands above             | `bun run dependencies:governance:check`  | The CI-safe package-governance gate.                                                                                             |
| What changed between package versions?               | `bun pm diff <spec...>`         | `bun run dependencies:diff -- <spec...>` | Operator review with repository-owned help and argument validation; may fetch registry packages but does not update the project. |
| What would a vulnerability repair do?                | `bun audit fix --dry-run`       | `bun run security:audit:fix:dry-run`     | Review before any install or range change.                                                                                       |
| What is no longer represented by the lockfile?       | `bun prune --dry-run`           | `bun run dependencies:prune:dry-run`     | Reports extraneous installed files; it does not identify repository source files.                                                |

The JSON license report is available from `bun run dependencies:licenses:json`.
It is generated on demand and is not committed because native output contains
installation paths and changes with the resolved production graph. The
normalized report intentionally does not decide whether a known license is
acceptable; that is a legal/product policy decision. It only fails labels that
provide no usable license identity.

`bun pm --help` in Bun 1.4.0 does not list the new `diff` subcommand even though
the command is available. Use `bun run dependencies:diff -- --help` for the
repository-owned examples. The wrapper forwards package and path operands as an
argument array and preserves Bun's native summary, diff, and exit status.

## Intentional mutations

`bun dedupe` rewrites `bun.lock` and installs by default. Root `bunfig.toml`
deliberately sets `frozenLockfile = true`, so a reviewed dedupe must follow the
dependency-edit protocol in [`UNIFIED.md`](./UNIFIED.md):

1. Run `bun dedupe --check` and inspect the exact package/version proposal.
2. Confirm every target version satisfies each dependent range with
   `bun pm why <package>`.
3. Temporarily set the root `frozenLockfile` to `false`.
4. Run `bun dedupe --lockfile-only` when only lockfile convergence is needed.
5. Restore `frozenLockfile = true` immediately.
6. Review the exact `bun.lock` diff, reinstall frozen, and run the owning tests.

`bun audit fix` and `bun update` are also explicit dependency edits. Their dry
runs and `bun pm diff` evidence inform review; they are never automatic fixes in
the release-channel or feed pipeline.

## Current Bun 1.4 proof

```bash
bun run dependencies:governance:check
bun run security:audit
bun run install:verify
```

The Bun 1.4 release notes are the release source for `bun pm licenses`,
`bun pm diff`, `bun dedupe`, `bun prune`, and `bun audit fix`:
<https://bun.com/blog/bun-v1.4#bun-install>.
