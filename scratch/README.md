# Scratch

Curated Bun playground under git. Everything else under `scratch/` is local and gitignored.

## Tracked

| Path | Use |
|------|-----|
| [`bun-v1.3.9-examples/`](bun-v1.3.9-examples/) | CLI playground, benches, parallel/http2/profiling demos |

Canonical Bun v1.3.9 feature demos (agent-facing): [`examples/bun-v139-features/`](../examples/bun-v139-features/).

## Quick start

```bash
bun run scratch/bun-v1.3.9-examples/playground/playground.ts
bun run examples/bun-v139-features/runner.ts
```

## Local dumps

Audit helpers, `toc-ops/`, `session-artifacts/`, and other one-offs stay on disk only (default-deny in `.gitignore`). Do not promote into `scripts/` or `lib/` without intent.
