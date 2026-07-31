# Cron contract

## Claim

OS-persistent is primary. In-process is the complement.

- Primary: Bun.cron(path, schedule, title)
- Complement: Bun.cron(schedule, handler)

Corrected 2026-07-21 (was inverted).

## Evidence

- lib/harness/cron.ts — both forms · ratchet: bun run test:cron
- spine/scheduler.ts — in-process on purpose · multi-tenant · spine:schedule · type-check
- spine/tenants.ts — ≥2 tenants (docs-integrity + install-verify) · claim `spine-multi-tenant`
- lib/harness/maintenance.ts — typed TenantRunbook catalog · claim `spine-maintenance-runbooks`  
  *Ratchet* → `bun run test:tenant-runbooks`
- docs/harness/tenants/*.md — per-tenant signal · intervention · proof · retirement
- bun-doc-refs schedule — cites OS-persistent as canonical · manual
- **OS-persistent journey** — register → OS entry → fire `scheduled()` → marker → remove  
  *Ratchet* → `bun run test:cron-os` · claim `cron-os-persistent`
- PROOF.md / proof.ts — named paths `bun-cron` + `cron-os-persistent`

## Primary — OS-persistent

Survives reboot. System local time. Fresh process each fire.

- register — await Bun.cron(path, schedule, title)
- remove — await Bun.cron.remove(title)
- module — export default { scheduled(controller) { … } }
- platforms — crontab · launchd · Task Scheduler
- journey — `tests/journey/cron-os-persistent.test.ts` (does not wait a full minute; fires via `bun run --cron-title`)

## Complement — in-process

Dies with the process. **UTC**. Shared state. **No overlap** (next fire after
handler Promise settles). Errors match `setTimeout` (uncaughtException /
unhandledRejection). `--hot` safe. Disposable via `using job = …`.

- schedule — `Bun.cron(schedule, handler)` → `CronJob` · wrapper `scheduleInProcess`
- dispose — `using job = …` → `Symbol.dispose` → `stop()`
- hot — cleared before `--hot` re-eval
- spine — multi-tenant in-process crons (daemon owns lifetime)  
  *Ratchet* → `bun run spine:schedule:once` · `bun run spine:schedule:once -- --tenant=install-verify`
- **ops-snapshot** — `*/10 * * * *` UTC · `lib/operations/snapshot-cron.ts` · portal/Pages artifacts  
  *Ratchet* → `bun run spine:schedule:once -- --tenant=ops-snapshot` · `bun run ops:snapshot:once`
- **portal-snapshot** (not a spine tenant) — OS primary + in-process complement · data-plane captures  
  *Ratchet* → `bun run portal:snapshot:once -- --dry-run` · `bun test tests/portal-snapshot-cron.test.ts` · tenant [`tenants/portal-snapshot-cron.md`](tenants/portal-snapshot-cron.md)

Align both with TZ=UTC when you need them to agree.

## Owner

lib/harness/cron.ts + spine/scheduler.ts + spine/tenants.ts

## Ratchet

```bash
bun run test:cron      # complement + contract docs
bun run test:cron-os   # OS-persistent primary journey
bun run spine:schedule:once -- --tenant=install-verify   # multi-tenant smoke
```

Lookup: bun tools/bun-doc-refs.ts url Bun.cron
