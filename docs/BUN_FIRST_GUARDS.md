# Bun-first guards & linting

Harness for `lib/` · `scripts/` · `packages/` · `server/` · `config/` · `tools/`.

## Commands

```bash
bun run check:harness              # rollout + format + guard
bun run lint:bun-native:changed    # PR/default
bun run lint:bun-native:rollout    # full tree (main / HARNESS_FULL_LINT)
bun run dx:catalog                 # tip · search · list
bun run guard:bun-first:harness
bun run harness:report             # offenders / promote
bun run harness:status
```

## Config map

| Layer | File |
|-------|------|
| DX catalog | [`config/bun-dx-catalog.ts`](../config/bun-dx-catalog.ts) |
| Harness ESLint | [`eslint.harness.config.ts`](../eslint.harness.config.ts) |
| Bun-native alias | [`eslint.bun-native.config.ts`](../eslint.bun-native.config.ts) |
| Rollout inventory | [`config/eslint/harness/rollout.ts`](../config/eslint/harness/rollout.ts) |
| Project overlay | [`eslint.project.config.ts`](../eslint.project.config.ts) |

Policy: [bun/BUN_FIRST_POLICY.md](./bun/BUN_FIRST_POLICY.md) · capabilities: [BUN_NATIVE_CAPABILITIES.md](./BUN_NATIVE_CAPABILITIES.md).

Upstream docs: prefer `bun.com/docs` via `bun tools/bun-doc-refs.ts suggest "<api>"`.
