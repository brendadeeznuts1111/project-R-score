# Automation — sandbox account provisioning

This module is the low-level, Bun-native executor for **sandbox/test account
provisioning**. It is not a public automation server, credential vault, or
general browser-control platform.

**Dual-mode / experiments lane:** see
[`.agents/skills/ops-dual-mode-experiments/SKILL.md`](../../.agents/skills/ops-dual-mode-experiments/SKILL.md)
— sandbox-gated WebView (`automated_test` only), provisioning queue, A/B
experiments, coverage prediction backtests. Manual production path is queue +
KYC DOD, not live-book WebView.

## Files

| File                    | Purpose                                                                                                                                                                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provision-accounts.ts` | Short-lived `Bun.WebView` account creation on **sandbox/test** platforms only. It uses an ephemeral browser data store, safely serializes page inputs, applies a total attempt deadline, encrypts credentials with AES-GCM, and stores only `is_test=1` accounts. |

## Usage

```ts
import { provisionAccounts } from '../lib/automation/provision-accounts.ts';

const results = await provisionAccounts({
  platformId: 'draftkings',
  partnerIds: ['partner-1', 'partner-2'],
  credentials: [
    { username: 'pk1', password: 'Secure123!', email: 'p1@example.com' },
    { username: 'pk2', password: 'Secure456!', email: 'p2@example.com' },
  ],
});

for (const r of results) {
  console.log(
    `${r.partnerId}: ${r.success ? 'ok' : 'failed'} ${r.durationMs}ms`
  );
}
```

## Runtime contract

| Boundary           | Contract                                                                                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authorization      | `isSandboxPlatform` rejects live books before a WebView is created. Production/manual provisioning stays in the queue + KYC DOD path.                                   |
| Browser isolation  | One short-lived, headless `Bun.WebView` per account; the default ephemeral data store is retained. `Bun.WebView` remains experimental.                                  |
| Input safety       | Credentials are JSON-serialized into the page expression; credential text is never interpolated as executable JavaScript and whitespace is preserved.                   |
| Deadline           | `timeout` is a positive safe integer and covers navigation, settle, submission, and result inspection for the whole attempt. The default is 30 seconds.                 |
| Credential custody | AES-GCM uses `PROVISION_ENCRYPTION_KEY`. Proton injection wins; the machine-local mint bridge supplies continuity. `Bun.secrets` is not the multi-host production SSOT. |
| Persistence        | SQLite runs in WAL mode through the operations owner. The per-call connection is closed deterministically; successful rows are marked `is_test=1`.                      |
| Queue              | [`../provisioning/`](../provisioning/) owns pending/in-progress/completed state. This executor does not invent Redis, BullMQ, or a distributed lock.                    |

## Gap reconciliation

The generic “automation platform” proposal is not a description of this
repository. The following capabilities already have canonical owners and must
not be duplicated here:

| Proposed gap                      | Existing owner / decision                                                                                                                                                          |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Health, WebSocket/SSE, pagination | [`../operator-research/dashboard.ts`](../operator-research/dashboard.ts) and its focused HTTP/WebSocket modules                                                                    |
| Retry/backoff                     | [`../operator-research/fetch-url.ts`](../operator-research/fetch-url.ts); browser submission itself is not retried because it may be non-idempotent                                |
| Audit and identity controls       | [`../identity/`](../identity/) (`auth_audit`, lockout, MFA, WebAuthn, geo policy)                                                                                                  |
| Migrations, WAL, backup, outbox   | [`../operations/schema.ts`](../operations/schema.ts), [`../operations/db.ts`](../operations/db.ts), [`../operations/backup.ts`](../operations/backup.ts), and `ops_channel_outbox` |
| Real-time odds and line movement  | [`../operator-research/odds/`](../operator-research/odds/) and [`../research/`](../research/)                                                                                      |
| Merge/deploy authority            | `bun run bun:ci` locally plus the owned Cloudflare Pages/R2 lanes; GitHub Actions and a speculative Kubernetes stack are not repository defaults                                   |

Any future HTTP surface around this executor must first prove authentication,
rate limiting, origin/CSP policy, an audit event, graceful shutdown, and a
health contract in that surface's owner. Those are deployment-boundary
requirements, not features to hide inside the WebView library.

## Bun API provenance

Reviewed against the repository's Bun 1.3.14 pin on 2026-08-14.

| API           | Status / release                                                                                                            | Reference                                                                                                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `Bun.WebView` | Experimental; introduced in 1.3.12 (2026-04-09)                                                                             | [runtime reference](https://bun.com/docs/runtime/webview#new-bun-webview-options) · [release](https://bun.com/blog/bun-v1.3.12)           |
| `Bun.cron`    | OS registration arrived in 1.3.11; the in-process callback scheduler used by this repository arrived in 1.3.12 (2026-04-09) | [runtime reference](https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process) · [release](https://bun.com/blog/bun-v1.3.12) |
| `Bun.CSRF`    | Stable; introduced in 1.2.5 (2025-03-11)                                                                                    | [runtime reference](https://bun.com/docs/runtime/csrf#bun-csrf-generate) · [release](https://bun.com/blog/bun-v1.2.5)                     |
| `Bun.secrets` | Experimental; introduced in 1.3.0 (2025-10-10)                                                                              | [runtime reference](https://bun.com/docs/runtime/secrets#bun-secrets-get-options) · [release](https://bun.com/blog/bun-v1.3)              |
| `Bun.spawn`   | Stable child-process primitive; no release claim is invented where the catalog has no introduction evidence                 | [runtime reference](https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn)                                                 |
