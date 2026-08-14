# Provisioning — Automated Partner Account Operations

Automated provisioning queue and sandboxed WebView account creation.

## Files

| File               | Purpose                                                                    |
| ------------------ | -------------------------------------------------------------------------- |
| `queue.ts`         | Provisioning queue — tracks pending/active/completed provisioning requests |
| `run-automated.ts` | Sandbox-gated WebView account provisioning executor                        |
| `schema.ts`        | SQLite schema for provisioning queue tables                                |
| `index.ts`         | Barrel exports                                                             |

## Flow

1. Request queued → `provisioning_tasks` table (`pending`)
2. Worker picks up → `run-automated.ts` executor
3. Sandbox check: rejects live books (must have `sandbox`/`test`/`demo` in URL
   or sub_category)
4. Bun.WebView navigates signup form → fills credentials → submits
5. On success: account stored in `partner_platform_accounts` with AES-GCM
   encrypted credentials
6. Queue entry marked completed

## Failure and retry contract

Failed attempts remain in `failed`, increment `retry_count`, and retain
`last_error`. Signup submission is not idempotent, so the worker never retries
automatically. After checking the remote sandbox for a partially created
account, an operator may explicitly return a task to `pending`:

```bash
bun run ops:provision-queue retry --id=<task-id>
```

The default ceiling is three failed attempts. `--max-retries=<positive integer>`
may lower or raise that operator gate for a specific recovery decision.

## Credential input

Credentials must not be passed in command-line arguments. Supply
`PROVISION_USERNAME`, `PROVISION_PASSWORD`, and `PROVISION_EMAIL` through a
secure environment injector, then run:

```bash
bun run ops:provision-queue run-automated --id=<task-id>
```

When a value is absent, the CLI generates a sandbox-only test value.
`PROVISION_ENCRYPTION_KEY` supplies the AES-GCM key material used for stored
credentials. Keep these values out of committed files and logs.

## CLI

```bash
bun run ops:provision-queue --help
```

## Related

- [`lib/automation/provision-accounts.ts`](../automation/provision-accounts.ts)
  — low-level WebView provisioning
- [`lib/operations/platform-coverage.ts`](../operations/platform-coverage.ts) —
  platform catalog CRUD + sandbox gate
- Skill:
  [`.agents/skills/ops-dual-mode-experiments/SKILL.md`](../../.agents/skills/ops-dual-mode-experiments/SKILL.md)
  (C2)
- Experiments (C4): [`lib/experiments/README.md`](../experiments/README.md)
- Prediction (C5): [`lib/prediction/README.md`](../prediction/README.md)
