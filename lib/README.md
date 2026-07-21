# FactoryWager Library

Shared harness. Barrel: [`index.ts`](./index.ts) (`LIB_INFO`, `FW`).

## Canonical docs

| Role | Path |
|------|------|
| Path SSOT | [`docs/repo-docs.ts`](./docs/repo-docs.ts) |
| Docs index | [`../docs/README.md`](../docs/README.md) |
| Standards | [`.custom-instructions.md`](../.custom-instructions.md) |
| Agents | [`../AGENTS.md`](../AGENTS.md) |
| Install | [`../docs/UNIFIED.md`](../docs/UNIFIED.md) |
| Wire | [`../docs/WIRE_BOUNDARY.md`](../docs/WIRE_BOUNDARY.md) |
| Brands | [`types/branded/README.md`](./types/branded/README.md) |
| Console depth | [`console-depth.ts`](./console-depth.ts) |

```bash
bun tools/doc-map-check.ts
bun tools/harness-violations.ts --path lib/types --rule unknown
bun run check:path-bun && bun run check:bun-env
```

## High-traffic modules

| Area | Entry |
|------|--------|
| Brands | `types/branded.ts` |
| Path | `path-bun.ts` |
| Docs / tokens | `docs/repo-docs.ts` · `docs/token-ref.ts` · `docs/bun-token.ts` |
| Security / R2 creds | `security/` |
| Projects inventory | `projects-scan.ts` |
| Theme | `theme/` |

Browse the tree for `r2/`, `registry/`, `mcp/`, `rss/`, `har-analyzer/` — prefer source + `bun tools/bun-doc-refs.ts suggest "<api>"` over duplicating API catalogs here.
