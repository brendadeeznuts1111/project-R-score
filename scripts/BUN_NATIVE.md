# Bun-native discovery & migrate

```bash
bun run discover:bun-native
bun run discover:bun-native:json
bun scripts/bun-native-discover.ts --apply --dry-run --roots=scripts
bun run discover:bun-native:apply

bun run migrate:inventory
bun run migrate:status
bun run bun-migrate apply --phase 6 --section crypto   # dry-run; add --write
bun run validate:integrity:all
```

Docs: [File I/O](https://bun.com/docs/runtime/file-io) · [Glob](https://bun.com/docs/runtime/glob) · helpers [`scripts/lib/fs-bun.ts`](lib/fs-bun.ts).

Reports (gitignored): `artifacts/bun-native-discover.latest.json` · `reports/bun-usage-inventory.json`.

Phases 6–9 product debt clear last measured — re-run `migrate:status` after edits. Longer historical notes: `git log -- scripts/BUN_NATIVE.md`.
