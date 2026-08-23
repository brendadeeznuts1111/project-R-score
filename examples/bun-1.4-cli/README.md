# Bun 1.4 CLI example

Minimal harness CLI using [`lib/harness/bun-cli.ts`](../../lib/harness/bun-cli.ts).

```bash
bun examples/bun-1.4-cli/cli.ts --help
bun examples/bun-1.4-cli/cli.ts --ping
bun examples/bun-1.4-cli/cli.ts --json --ping
bun examples/bun-1.4-cli/cli.ts --typo   # gate · why · fix
```

**Patterns:** `Bun.markdown.ansi` help · `printGateFailure` · `--json` · `Bun.spawnSync` via `spawnText` · `process.exitCode` (not `Bun.exit`).

Production cousin: `bun run sync:main`.
