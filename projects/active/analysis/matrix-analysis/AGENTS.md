# Matrix Analysis — agent entrypoint

This is a selected nested product inside Project R. The repository-root
`AGENTS.md` still governs shared safety, delivery, and workspace policy. This
file adds only product-local commands and boundaries; use [`README.md`](README.md)
and [`docs/`](docs/) for architecture and historical detail.

## Runtime and scope

- Use the Bun version required by `package.json`; do not copy a version number
  into guidance.
- Product code lives primarily in `src/`, `cli/`, `tools/`, `mcp-bun-docs/`,
  and `.claude/`. Keep generated reports, caches, and benchmark outputs out of
  unrelated changes.
- `package.json` is the command catalog. Verify a script there before invoking
  or documenting it.
- Prefer the workspace MCP configuration and current Bun documentation over
  copied tool counts or release claims.

## Common proof

Run the narrowest relevant commands from this directory:

```bash
bun run lint
bun run typecheck
bun run test:src
bun run test:claude
bun run build
```

Use `bun test <path>` for a focused test. Use `bun run test` only when the full
product suite and its path-fix pre-step are required.

## Change rules

- Preserve the product's Biome configuration; Project R's root formatter does
  not replace this standalone product toolchain.
- Keep secrets in the existing environment/keychain owners. Do not place
  credentials in examples, shell arguments, reports, or committed profiles.
- Treat deploy, registry mutation, remote access, and secret writes as
  consequential operations requiring the authorization defined by the root
  repository.
- Extend an existing CLI or MCP owner instead of adding a parallel command
  path. Update the owning tests and focused docs with behavior changes.

## Routes

- Project overview: [`README.md`](README.md)
- Matrix agent: [`matrix-agent/README.md`](matrix-agent/README.md)
- Bun-docs MCP: [`mcp-bun-docs/README.md`](mcp-bun-docs/README.md)
- Tests: [`tests/README.md`](tests/README.md)
- Tools: [`tools/README.md`](tools/README.md)
