# Bun TOML Secrets Editor — agent entrypoint

Project R root policy applies. This workspace owns a Bun-native TOML and secrets
toolchain; use [`README.md`](README.md) and [`docs/README.md`](docs/README.md)
for architecture and usage.

## Commands

`package.json` is authoritative. Common proof from this directory:

```bash
bun run typecheck
bun run test:core
bun run test
bun run build
bun run security:audit
bun run smoke
```

Use `bun run build:cli` or `bun run build:rss` for focused builds. Do not
document or invoke legacy `build:premium`, platform-build, `duoplus`, `kimi:*`,
`matrix:*`, profiling, or test-variant names unless they are first restored as
real package scripts with proof.

## Boundaries

- Parse untrusted TOML before use and preserve the existing serialization
  owner; do not invent a second writer.
- Secrets remain in Bun secrets or the established environment owner. Never
  log resolved values or commit generated secret material.
- Respect workspace package ownership under `packages/`; run the narrowest
  filtered build or test that proves the change.
- Treat cleanup, packaging, proxy-backed execution, and credential mutation as
  explicit operations. Confirm targets and authorization before running them.
- Keep generated profiles, logs, snapshots, and build outputs out of unrelated
  changes.

