# Bun-native migrate

Node → Bun inventory and phase apply. Prefer matrix / canonical refs live elsewhere.

```bash
bun run migrate:inventory
bun run migrate:status
bun run bun-migrate apply --phase 6 --section crypto   # dry-run; add --write
bun run validate:integrity:all
```

| Concern | Command / SSOT |
|---------|----------------|
| Product debt | `bun run migrate:status` · `scripts/bun-migrate.ts` |
| Prefer use/avoid | `tools/bun-prefer-matrix.ts` |
| Canonical API URL | `bun tools/bun-doc-refs.ts suggest "<api>"` |
| File I/O helpers (scripts) | [`scripts/lib/fs-bun.ts`](lib/fs-bun.ts) |

Docs: [File I/O](https://bun.com/docs/runtime/file-io) · [Glob](https://bun.com/docs/runtime/glob) · [Child process](https://bun.com/docs/runtime/child-process).

Report (gitignored): `reports/bun-usage-inventory.json`.

Harness tenant: [`docs/harness/tenants/bun-migrate.md`](../docs/harness/tenants/bun-migrate.md) · claim `bun-migrate-status`.
