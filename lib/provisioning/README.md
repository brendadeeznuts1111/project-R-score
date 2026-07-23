# Provisioning — Automated Partner Account Operations

Automated provisioning queue and sandboxed WebView account creation.

## Files

| File | Purpose |
|------|---------|
| `queue.ts` | Provisioning queue — tracks pending/active/completed provisioning requests |
| `run-automated.ts` | Sandbox-gated WebView account provisioning executor |
| `schema.ts` | SQLite schema for provisioning queue tables |
| `index.ts` | Barrel exports |

## Flow

1. Request queued → `provisioning_queue` table (pending)
2. Worker picks up → `run-automated.ts` executor
3. Sandbox check: rejects live books (must have `sandbox`/`test`/`demo` in URL or sub_category)
4. Bun.WebView navigates signup form → fills credentials → submits
5. On success: account stored in `partner_platform_accounts` with AES-GCM encrypted credentials
6. Queue entry marked completed

## Related

- [`lib/automation/provision-accounts.ts`](../automation/provision-accounts.ts) — low-level WebView provisioning
- [`lib/operations/platform-coverage.ts`](../operations/platform-coverage.ts) — platform catalog CRUD + sandbox gate
