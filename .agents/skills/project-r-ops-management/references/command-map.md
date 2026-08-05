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

## Release proof

```bash
dx version
bun run bun:channel:check
bun run check:release-tracker
bun run type-check:ci
```

Before merge, run `.husky/pre-commit` and `bun run bun:ci`.

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
