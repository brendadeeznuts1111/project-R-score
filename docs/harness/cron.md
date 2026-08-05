# Cron contract

## Claim

OS-persistent is primary. In-process is the complement.

- Primary: Bun.cron(path, schedule, title)
- Complement: Bun.cron(schedule, handler)

Corrected 2026-07-21 (was inverted).

## Evidence

- lib/harness/cron.ts — both forms · ratchet: bun run test:cron
- spine/scheduler.ts — in-process on purpose · multi-tenant · spine:schedule ·
  type-check
- spine/tenants.ts — ≥2 tenants (docs-integrity + install-verify) · claim
  `spine-multi-tenant`
- lib/harness/maintenance.ts — typed TenantRunbook catalog · claim
  `spine-maintenance-runbooks` _Ratchet_ → `bun run test:tenant-runbooks`
- docs/harness/tenants/\*.md — per-tenant signal · intervention · proof ·
  retirement
- bun-doc-refs schedule — cites OS-persistent as canonical · manual
- **OS-persistent journey** — register → OS entry → fire `scheduled()` → marker
  → remove _Ratchet_ → `bun run test:cron-os` · claim `cron-os-persistent`
- PROOF.md / proof.ts — named paths `bun-cron` + `cron-os-persistent`

## Primary — OS-persistent

Survives reboot. System local time. Fresh process each fire.

- register — await Bun.cron(path, schedule, title)
- remove — await Bun.cron.remove(title)
- module — export default { scheduled(controller) { … } }
- platforms — crontab · launchd · Task Scheduler
- journey — `tests/journey/cron-os-persistent.test.ts` (does not wait a full
  minute; fires via `bun run --cron-title`)

## Complement — in-process

Dies with the process. **UTC on the pinned Bun 1.3 runtime**. Shared state. **No
overlap** (next fire after handler Promise settles). Errors match `setTimeout`
(uncaughtException / unhandledRejection). `--hot` safe. Disposable via
`using job = …`.

- schedule — `Bun.cron(schedule, handler)` → `CronJob` · wrapper
  `scheduleInProcess`
- dispose — `using job = …` → `Symbol.dispose` → `stop()`
- hot — cleared before `--hot` re-eval
- spine — multi-tenant in-process crons (daemon owns lifetime)  
  _Ratchet_ → `bun run spine:schedule:once` ·
  `bun run spine:schedule:once -- --tenant=install-verify`
- **ops-snapshot** — `*/10 * * * *` UTC · `lib/operations/snapshot-cron.ts` ·
  portal/Pages artifacts _Ratchet_ →
  `bun run spine:schedule:once -- --tenant=ops-snapshot` ·
  `bun run ops:snapshot:once`
- **baseline-scrape** (Tier 4) — `*/15 * * * *` UTC ·
  `lib/operations/scrapers/scrape-cron.ts` · registry agents →
  `artifacts/raw-limits/` _Ratchet_ → `bun run baseline:scrape-cron:once` ·
  `bun test tests/baseline-scrape-cron.test.ts`
- **portal-snapshot** (not a spine tenant) — OS primary + in-process complement
  · data-plane captures _Ratchet_ → `bun run portal:snapshot:once -- --dry-run`
  · `bun test tests/portal-snapshot-cron.test.ts` · tenant
  [`tenants/portal-snapshot-cron.md`](tenants/portal-snapshot-cron.md)

Align both with TZ=UTC when you need them to agree.

### Channel boundary

The reviewed production authority is Bun 1.3.14: `Bun.cron(schedule, handler)`
and `Bun.cron.parse(expression, relativeDate)` are UTC and do not expose a
timezone option. The doctor records the selected declaration capability and the
main-tip revision, but does not infer a feature from a commit endpoint. Any new
timezone syntax must not be used until the selected runtime and declarations
both expose it.

## Bun channel doctor — OS-persistent primary

The channel doctor observes runtime releases, canary metadata, Bun RSS, GitHub
release Atom, npm type tags, and local pins. It never upgrades Bun or rewrites a
type pin.

- SSOT — `config/bun-channels.toml`
- doctor — `lib/verification/bun-channel-doctor.ts`
- worker — `tools/bun-channel-doctor-worker.ts`
- scheduler CLI — `tools/bun-channel-doctor-cron.ts`
- title — `bun-channel-doctor`
- default schedule — `17 6 * * *` in **system local time**
- artifact — `public/registry/bun-channel-status.json` via temp-file + atomic
  rename

The OS scheduler is the sole automatic owner. It is deliberately not also a
spine tenant, which prevents duplicate polling and split lifecycle ownership.
Register only from a durable checkout after merge:

```bash
bun tools/bun-channel-doctor-cron.ts preview
bun tools/bun-channel-doctor-cron.ts register
bun tools/bun-channel-doctor-cron.ts remove
```

On Bun 1.3, preview timestamps are UTC expression references. Registration still
executes at the OS wall-clock time, so the preview validates syntax but is not
an exact local-time forecast unless the machine timezone is UTC.

## Owner

lib/harness/cron.ts + spine/scheduler.ts + spine/tenants.ts +
tools/bun-channel-doctor-worker.ts + tools/bun-channel-doctor-cron.ts

## Ratchet

```bash
bun run test:cron      # complement + contract docs
bun run test:cron-os   # OS-persistent primary journey
bun test tests/bun-channel-doctor-cron.test.ts # doctor scheduler, no OS mutation/network
bun run spine:schedule:once -- --tenant=install-verify   # multi-tenant smoke
```

Lookup: bun tools/bun-doc-refs.ts url Bun.cron
