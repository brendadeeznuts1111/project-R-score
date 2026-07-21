# Tools

Agent/CI CLIs under `tools/` (not a publishable package).

## High-traffic

```bash
bun tools/bun-doc-refs.ts suggest "Bun.secrets"
bun tools/brand-catalog.ts SessionId
bun tools/branded-id-check.ts --staged --strict
bun tools/doc-map-check.ts
bun tools/harness-violations.ts --path lib --rule unknown
```

## Profiling (optional)

```bash
bun tools/factorywager-cpu-profile.ts
bun tools/factorywager-heap-profile.ts
```

Heap markdown dumps are gitignored (`lib/profile.md`, `*heap-prof*`). Prefer `bun run harness:status` for day-loop health.

Docs operate: [docs/BUN_DOCS_OPERATE.md](../docs/BUN_DOCS_OPERATE.md) · `bun run docs:refresh`.
