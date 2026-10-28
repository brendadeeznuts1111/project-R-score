# TOML CLI — agent entrypoint

Project R root policy applies. Use [`README.md`](README.md) and
[`docs/INDEX.md`](docs/INDEX.md) for product detail; `package.json` owns commands.

## Local contract

- Use Bun-native fetch, FormData, environment loading, and TOML parsing.
- The existing `ConfigManager` serialization path owns TOML output; Bun exposes
  parsing but no general TOML stringify API.
- Compile-time features are enabled by the declared `bun build --feature=...`
  scripts. Do not replace them with runtime environment branches.
- Preserve path aliases and the existing lint/type rules. Prefix intentionally
  unused variables with `_`.
- Keep R2 credentials in environment owners and never commit or print them.

## Proof

```bash
bun run lint
bun run type-check
bun run test:unit
bun run test:integration
bun run test:e2e
bun run build
```

Use `bun test <path>` for focused work. Do not use the retired `ci:bundle`,
`devices:dashboard`, or `system:full-demo` names unless they become declared
package scripts again.

## Routes

- Architecture: [`docs/BUN_NATIVE_ARCHITECTURE.md`](docs/BUN_NATIVE_ARCHITECTURE.md)
- Feature flags: [`docs/FEATURE_FLAGS_DEVELOPER_GUIDE.md`](docs/FEATURE_FLAGS_DEVELOPER_GUIDE.md)
- Tests: [`docs/TEST_GUIDE.md`](docs/TEST_GUIDE.md)
- Wire behavior: [`docs/WIRE_MODE_ARCHITECTURE.md`](docs/WIRE_MODE_ARCHITECTURE.md)
