# Bun-only API handlers (not Cloudflare Pages)

These modules import `bun:sqlite`, missing monorepo paths, or local-only auth.
They must **not** live under root `functions/` — Pages bundler fails on `bun:sqlite`.

| Path | Runtime |
|------|---------|
| Root `functions/` | Cloudflare Pages (Workers) — edge-safe only |
| `functions-bun-only/` | Local Bun / self-hosted (optional future wire-up) |

## Ops summary alignment

| Runtime | Handler | Data |
|---------|---------|------|
| **Local Bun** | `bun run serve:public` → `/api/operations/summary` | **Live** SQLite via `buildOpsSummary` (`source: "live"`) |
| **Local Bun-only module** | `functions-bun-only/api/operations/summary.ts` | Same live builder |
| **Cloudflare Pages** | `functions/api/operations/summary.ts` | **Snapshot** `public/registry/ops-summary.json` (no bun:sqlite) |

Same JSON contract: `lib/operations/ops-summary.ts` (`OpsSummaryPayload`).

```bash
bun run ops:snapshot          # refresh Pages snapshot (+ prediction report assets)
bun run serve:public          # local portal + live API
bun run serve:public:hot      # server TS soft reload (bun --hot)
bun run serve:public:watch    # full process restart (bun --watch)
# http://localhost:3000/portal/ops/
# http://localhost:3000/api/operations/summary
```

Dev reload layers (Bun flags, browser SSE): [`docs/portal-foundation.md`](../docs/portal-foundation.md#dev-reload-watch-hot-browser-sse).
