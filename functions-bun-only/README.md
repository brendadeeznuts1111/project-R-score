# Bun-only API handlers (not Cloudflare Pages)

These modules import `bun:sqlite`, missing monorepo paths, or local-only auth.
They must **not** live under root `functions/` — Pages bundler fails on `bun:sqlite`.

| Path | Runtime |
|------|---------|
| Root `functions/` | Cloudflare Pages (Workers) — edge-safe only |
| `functions-bun-only/` | Local Bun / self-hosted (optional future wire-up) |

Ops summary on Pages: static `public/registry/ops-summary.json` via  
`functions/api/operations/summary.ts` (ASSETS fetch).

Regenerate snapshot: `bun run ops:snapshot`
