# Homebase discovery (current)

Readonly map of this monorepo as the Projects **homebase** root. Detail history: `git log -- docs/organization/HOMEBASE_DISCOVERY.md`.

## Verdict

| Layer | Status | Note |
|-------|--------|------|
| Install | Healthy | `install:verify` · machine bunfig SSOT [UNIFIED.md](../UNIFIED.md) |
| Pin | **bun@1.4.0** | `packageManager` matches runtime |
| Shared spine | `lib/` + `config/` + `packages/*` | brands, wire, console-depth |
| Workspaces | `packages/*` · factorywager registry packages · `sports-terminal-os` · `lib/*` | no dead kimiremote glob |
| Day loop | Honest | `type-check` · `build:affected` / `test:affected` · `test:changed` |
| Bun DX | Live | `config/bun-dx-catalog.ts` · `bun run dx:catalog` |

## Start here

```bash
bun run install:verify
bun run harness:status
bun run help
```

| Need | Owner |
|------|-------|
| Structure | [`STRUCTURE.md`](../../STRUCTURE.md) · [`projects/README.md`](../../projects/README.md) |
| Velocity / gates | [VELOCITY_BASELINE.md](./VELOCITY_BASELINE.md) · [harness/README.md](../harness/README.md) |
| Bun APIs | [BUN_NATIVE_CAPABILITIES.md](../BUN_NATIVE_CAPABILITIES.md) |
| Bun-first | [bun/BUN_FIRST_POLICY.md](../bun/BUN_FIRST_POLICY.md) |

Nested own-repos under `projects/active/` (kimiremote, cascade, bet-ticker, …) stay gitignored — not homebase SSOT.
