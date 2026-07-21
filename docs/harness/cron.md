# Cron contract

## Claim

OS-persistent is primary. In-process is the complement.

- Primary: Bun.cron(path, schedule, title)
- Complement: Bun.cron(schedule, handler)

Corrected 2026-07-21 (was inverted).

## Evidence

- lib/harness/cron.ts — both forms · ratchet: bun run test:cron
- spine/scheduler.ts — in-process on purpose · spine:schedule · type-check
- bun-doc-refs schedule — cites OS-persistent as canonical · manual
- PROOF.md / proof.ts — named path bun-cron · proof inventory

## Primary — OS-persistent

Survives reboot. System local time. Fresh process each fire.

- register — await Bun.cron(path, schedule, title)
- remove — await Bun.cron.remove(title)
- module — export default { scheduled(controller) { … } }
- platforms — crontab · launchd · Task Scheduler

## Complement — in-process

Dies with the process. UTC. Shared state. No overlap.

- schedule — Bun.cron(schedule, handler) → CronJob
- dispose — using job = … → Symbol.dispose → stop()
- hot — cleared before --hot re-eval
- spine — runInProcessUntilSignal (daemon owns lifetime)

Align both with TZ=UTC when you need them to agree.

## Owner

lib/harness/cron.ts + spine/scheduler.ts

## Ratchet

bun run test:cron

Lookup: bun tools/bun-doc-refs.ts url Bun.cron
