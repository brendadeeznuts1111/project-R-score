# Bun channel and type governance

Status: implementation contract (2026-08-05)

## Outcome

Project R uses a stable Bun runtime for production work while continuously
observing Bun's stable, canary, blog/RSS, GitHub Atom, and npm type channels.
Monitoring is read-only: it may publish a status artifact and fail a check, but
it never upgrades Bun, edits a manifest, or rewrites the lockfile.

The machine-readable policy is [`config/bun-channels.toml`](../../config/bun-channels.toml).
This document explains the policy; it does not duplicate its version values.

```text
official stable API ─┐
rolling canary API ──┤
Bun blog RSS ────────┤
GitHub release Atom ─┼─> Bun channel doctor ─> structured drift report
npm dist-tags ───────┤                            │
local manifests ─────┤                            ├─ check/CI exit status
installed runtime ───┘                            └─ optional derived artifact
```

## Canonical policy

### SSOT boundary

| Artifact | Authority | Derived or explanatory |
| --- | --- | --- |
| `config/bun-channels.toml` | Runtime channel, type channels, source URLs, timeouts, artifact path, and schedules | No |
| `lib/verification/bun-channel-doctor.ts` | Parser and typed evaluation contract for that TOML | Executable interpretation |
| `public/registry/bun-channel-status.json` | None | Derived observation; safe to replace and never edit as policy |
| This document | Operator workflow and rationale | Explanatory; must link to TOML values instead of copying them |
| Global `~/.config/dx/*` | Machine defaults and Project R pointers | Must not copy Project R URLs, versions, schedules, or promotion policy |

If two files disagree, the TOML owns policy and the typed doctor owns how that
policy is evaluated. A generated report, dashboard, skill, or global DX context
may point to those owners but cannot override them.

| Concern | Policy | Reason |
| --- | --- | --- |
| Production runtime | `stable` | Release and CI behavior must be reproducible. |
| `@types/bun` wrapper | npm `latest` policy, repository pin | The wrapper remains on the stable public type surface. |
| direct `bun-types` declarations | npm `canary` policy, repository pin | Project R deliberately exercises the forward declaration surface without moving the runtime. |
| Promotion | reviewed change | A human-reviewed lane updates pins and lockfile after the report is understood. |
| Mutation | never in the doctor | Observation, promotion, and installation are separate authorities. |
| OS schedule | system-local, as Bun 1.3.14 defines it | Persistent `Bun.cron(path, schedule, title)` follows the host scheduler. |
| In-process schedule | UTC on selected Bun 1.3.14 | Do not expose a timezone option until the selected runtime and declarations both ship one. |

The stable wrapper and canary declaration pins are intentionally different.
A same-version lint would erase the experiment boundary and is therefore not a
valid Project R invariant. The invariant is that each package matches its own
selected channel and the resulting TypeScript gates pass.

## Source interpretation

- The stable updater API determines the latest stable runtime version.
- The rolling `canary` release determines the current canary revision/version.
- RSS proves that the stable release was announced on Bun's publication feed.
- GitHub Atom is an independent release-event signal; prerelease/consolidation
  entries are observations, not automatic promotion authority.
- npm dist-tags determine whether the pinned wrapper and declaration versions
  match their selected channels.
- `.bun-version`, `packageManager`, `engines.bun`, catalog pins, the lockfile,
  and the executing Bun version/revision are local evidence.

A source outage is reported separately from version drift. Missing evidence is
never interpreted as permission to upgrade or as proof that a pin is current.

## Agent ownership

| Lane | Owns | Must not own |
| --- | --- | --- |
| Channel contract | TOML policy, parsers, comparisons, network-free fixtures | cron registration, package promotion |
| Cron execution | persistent registration/removal, worker lifecycle, UTC compatibility wrapper | version decisions, manifest edits |
| Partner contract | partner nomenclature, ports, semantic map, dashboard schema | connector I/O, presentation tokens |
| Connector adapter | one source boundary, provenance, resilience, last-known-good input | cross-source precedence, UI state |
| Projection | typed joins, conflicts, attention rows, dashboard artifact | transport secrets, visual styling |
| Surface | artifact rendering, routes, theme-role resolution, accessibility | domain renaming, source-of-truth inference |
| Reviewer/ops | drift triage, promotion decision, focused and merge gates | unattended upgrades or hidden compatibility rewrites |

Agents claim disjoint files. A lane that discovers a contract change reports it
to the owning lane rather than editing across boundaries. The reviewer treats
the TOML policy and typed result as the SSOT pair; the JSON report is derived
evidence.

## Execution flow

1. `check` loads the TOML, collects all official and local observations, and
   exits non-zero only for actionable drift or incomplete required evidence.
2. `report` runs the same check and atomically writes the configured derived
   artifact for dashboards and operators.
3. The OS-persistent worker runs `report` on the configured schedule. Register,
   preview, and remove are explicit operator commands.
4. A runtime or type promotion happens in a separate worktree lane. The lane
   changes the intended pins, refreshes the lockfile, reruns the doctor, and
   proves TypeScript/tests before review.

The worker atomically replaces the artifact only after a complete report has
serialized. A degraded report is still written because it explicitly records
each unavailable source; a write/rename failure leaves the prior artifact
intact.

## Partner dashboard relationship

The partner dashboard depends on this toolchain contract but does not own it.
[`partner-dashboard-mvp.toml`](./partner-dashboard-mvp.toml) stores only a
reference to the Bun policy and status artifact. Runtime versions, feed URLs,
type channels, and schedules remain exclusively in `config/bun-channels.toml`.
This keeps business-domain configuration separate from build/runtime governance.

## Proof

```bash
bun run bun:channel:check
bun test tests/bun-channel-doctor.test.ts tests/bun-channel-doctor-cron.test.ts
bun run type-check:ci
bun run skills:validate
```

Registration mutates the host scheduler and is never part of CI:

```bash
bun run bun:channel:cron:preview
bun run bun:channel:cron:register
bun run bun:channel:cron:remove
```
