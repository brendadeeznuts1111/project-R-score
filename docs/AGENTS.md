# AGENTS — full guide

**Read first:** root [`AGENTS.md`](../AGENTS.md).

| Concern | Document |
|---------|----------|
| Operating rules / brands / wire summary | [`../AGENTS.md`](../AGENTS.md) |
| Coding standards | [`../.custom-instructions.md`](../.custom-instructions.md) · [DEVELOPMENT-STANDARDS.md](./DEVELOPMENT-STANDARDS.md) |
| Install / bunfig | [UNIFIED.md](./UNIFIED.md) |
| Wire boundary (full) | [WIRE_BOUNDARY.md](./WIRE_BOUNDARY.md) |
| Bun capabilities | [BUN_NATIVE_CAPABILITIES.md](./BUN_NATIVE_CAPABILITIES.md) |
| Docs operate | [BUN_DOCS_OPERATE.md](./BUN_DOCS_OPERATE.md) · `bun run docs:refresh` |
| Audit findings/concepts | [audit/README.md](./audit/README.md) · `bun tools/bun-doc-refs.ts suggest --audit "<q>"` · claim `audit-findings-catalog` |
| Import graph | [IMPORT_BOUNDARIES.md](./IMPORT_BOUNDARIES.md) |
| Workspace map | [`../STRUCTURE.md`](../STRUCTURE.md) |
| Harness JIT | [harness/README.md](./harness/README.md) · `bun run harness:status` |
| Path SSOT | [`../lib/docs/repo-docs.ts`](../lib/docs/repo-docs.ts) |
| Cloudflare / R2 / Pages | [`../config/r2-env.ts`](../config/r2-env.ts) · `bun run cloudflare:env` · [harness/tenants/cloudflare-pages.md](./harness/tenants/cloudflare-pages.md) · claim `cloudflare-pages-env-ssot` |

**Spine:** `lib/` · `packages/` · `scripts/` · `tools/` · `docs/` · selected `projects/active/*` workspaces. Nested own-repos under `projects/active/` are not homebase SSOT.

If this file disagrees with root `AGENTS.md` / `UNIFIED.md` / `WIRE_BOUNDARY.md`, **those win**.
