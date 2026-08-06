# Bun channel doctor

**Tenant** `bun-channel-doctor` (operator OS cron; not a spine tenant)

**Purpose** Compare Project R's stable Bun runtime and independently selected
type channels with official stable, canary, main-tip, RSS, Atom, npm, lockfile,
and installed evidence without mutating the toolchain.

**Authority** [`config/bun-channels.toml`](../../../config/bun-channels.toml) ·
[`bun-channel-governance.md`](../../design/bun-channel-governance.md)

**Schedule** OS-persistent `Bun.cron(path, schedule, title)` using the host's
system-local timezone. This is intentionally not registered as a spine tenant.

## Signal

- `healthy` / exit `0`: selected stable runtime and both selected type channels
  agree with required evidence.
- `action-required` / exit `1`: reviewed pin or runtime promotion is required.
- `degraded` / exit `2`: a required source could not be observed; no promotion
  decision is safe.
- Main tip and intentional wrapper/declaration channel differences are
  informational unless a selected-channel invariant fails.

The optional derived artifact is
`public/registry/bun-channel-status.json`. The doctor itself is read-only;
artifact writing is a separate explicit command.

## Intervention

```bash
dx version
bun run bun:channel:check
bun test tests/bun-channel-doctor.test.ts tests/bun-channel-doctor-cron.test.ts
bun run type-check:ci
```

If drift is actionable, create a dedicated promotion worktree. Change only the
intended runtime/type pins, refresh `bun.lock`, rerun the focused proof, and
review the resulting declaration/runtime differences. Never run `bun upgrade`
from the scheduled worker.

Host lifecycle:

```bash
bun run bun:channel:cron:preview
bun run bun:channel:cron:register
bun run bun:channel:cron:remove
```

Registration/removal mutates the host scheduler and is excluded from CI.

## Retirement

Retire the OS job only when another durable scheduler owns the same report and
alert semantics. Remove the registration, verify no host entry remains, remove
the package-script exemptions, and preserve the read-only on-demand doctor as
the release/type promotion gate.
