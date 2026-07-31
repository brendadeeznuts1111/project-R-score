# Tenant: portal-snapshot

**Tenant** `portal-snapshot` **Runs** `bun lib/operations/portal-snapshot-cron.ts --once`
— `0 */6 * * *` **UTC** via in-process `Bun.cron` complement (OS primary
`0 8 * * *` local via `portal:snapshot:cron:register`)
**Proof** `portal-snapshot-cron-v1` · `snapshot-data-plane-v1` (CLI/types)
**Catalog** not in `MAINTENANCE_RUNBOOKS` / spine — CLI · OS cron · in-process register only

Scope-aware **data-plane** captures (not registry bake — see [`ops-snapshot.md`](ops-snapshot.md)):

- Flat manifests `snapshots/<id>.txt` (`scope=prediction mae=…`)
- JSON manifests + `snapshots/index.jsonl`
- Optional report HTML/JSON + scoped assets per [`snapshot-scopes.ts`](../../../tools/snapshot-scopes.ts)

## Bun.cron hierarchy

| Layer | API | Schedule | Owner |
|-------|-----|----------|-------|
| **Primary** | `Bun.cron(path, schedule, title)` | `0 8 * * *` **local** | OS (launchd/crontab) |
| **Complement** | `Bun.cron(schedule, handler)` | `0 */6 * * *` **UTC** | in-process register API (`lib/operations/portal-snapshot-cron.ts`) |

Contract: [`docs/harness/cron.md`](../cron.md)

## Commands

```bash
# Manual / CI
bun run portal-cli snapshot run --scope prediction
bun run portal:snapshot:once
bun run portal:snapshot:once -- --dry-run

# OS-persistent (primary)
bun run portal:snapshot:cron:register
bun run portal:snapshot:cron:preview
bun run portal:snapshot:cron:remove

# In-process complement (daemon owns lifetime; not wired into serve-public)
PORTAL_SNAPSHOT_CRON=1 bun lib/operations/portal-snapshot-cron.ts
```

## Env

| Variable | Default | Effect |
|----------|---------|--------|
| `PORTAL_SNAPSHOT_SCOPES` | `prediction` | Comma list: `prediction,portal,gaps,limits` |
| `PORTAL_SNAPSHOT_OS_SCHEDULE` | `0 8 * * *` | OS cron (local time) |
| `PORTAL_SNAPSHOT_INPROCESS_SCHEDULE` | `0 */6 * * *` | In-process (UTC) |
| `SNAPSHOT_BASE_URL` | `http://localhost:3000` | Fetch origin |
| `PORTAL_SNAPSHOT_DIR` | `snapshots` | Output root |

Package scripts: `portal:snapshot` · `portal:snapshot:once` · `portal:snapshot:cron:*`
· `portal-cli snapshot cron …`

## Signal (failure)

`bun run portal:snapshot:once -- --dry-run` or `bun test tests/portal-snapshot-cron.test.ts` exits non-zero.
Also: empty `snapshots/index.jsonl` after expected captures, or `portal-cli snapshot grep`
finds no recent `scope=prediction` rows when report was rebaked.

## Intervention (repair)

1. Dry-run plan: `bun run portal:snapshot:once -- --dry-run`
2. Unit + OS journey: `bun test tests/portal-snapshot-cron.test.ts` · `bun run test:portal-snapshot:cron-os`
3. Live capture (portal must serve): `SNAPSHOT_BASE_URL=http://127.0.0.1:8787 bun run portal:snapshot:once`
4. Inspect index: `bun run portal-cli snapshot list --scope prediction`
5. Type contracts: `bun run check:snapshot:types`

Do **not** delete OS cron registration only to green a local daemon.

## Retirement

Remove when CI always runs `portal:snapshot:once` after prediction report bake
and OS cron owns daily capture.

**Retirement verified** `false` — set `tenants.portal-snapshot=true` in
[`lib/harness/ci-owned-tenants.json`](../../../lib/harness/ci-owned-tenants.json)
when CI owns the periodic refresh (today the tenant is CLI/OS/in-process only).

**Owner** `// owner: platform / portal data-plane` **Fresh-rerun**
`bun test tests/portal-snapshot-cron.test.ts`

## Related

- Prediction report tenant: [`prediction-report.md`](prediction-report.md)
- Registry bake tenant: [`ops-snapshot.md`](ops-snapshot.md)
- Operator brief: `bun run docs:tenant-portal-snapshot`

## Ratchet

```bash
bun test tests/portal-snapshot-cron.test.ts
bun run check:snapshot:types
bun run test:portal-snapshot:cron-os
bun run test:cron
```
