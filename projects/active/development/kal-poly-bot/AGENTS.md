# Kal/Poly Bot — agent entrypoint

Project R root policy remains authoritative. This file owns only local runtime,
command, and subproject boundaries. Use [`README.md`](README.md) and
[`docs/DOCUMENTATION_INDEX.md`](docs/DOCUMENTATION_INDEX.md) for detail.

## Runtime and ownership

- Use Bun for the TypeScript workspaces and Cargo inside `poly-kalshi-arb/`.
- `package.json` is the root command catalog. Subprojects own their own
  `package.json`, lockfile, tests, and runtime configuration.
- Do not infer that similarly named `operation-surgical-precision/` and
  `operation_surgical_precision/` paths are interchangeable; resolve the owner
  before running a command.
- Keep credentials out of prompts and shell history. Use the existing
  environment owners for workers, market APIs, and bot processes.

## Common proof

```bash
bun run lint:check
bun run type-check
bun run test:all
bun run build:all
```

For focused work, use the named package script or run `bun test <path>` from the
owning subproject. MCP checks are `bun run mcp:health` and focused MCP tests;
infrastructure checks use the `golden-matrix:*` or `*:infrastructure` scripts.

## Change rules

- Keep TypeScript strict and use named exports and explicit error handling.
- Preserve the Rust boundary in `poly-kalshi-arb/`; do not translate Cargo
  workflows into Bun commands.
- Worker deployment and secrets commands are consequential operations. Run
  them only with the authorization required by the repository root.
- Verify all new command names against the owning package rather than copying
  command catalogs into documentation.
