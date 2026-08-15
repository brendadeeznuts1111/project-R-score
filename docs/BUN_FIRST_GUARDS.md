# Bun-first guards & linting

Harness for `lib/` · `scripts/` · `packages/` · `server/` · `config/` ·
`tools/`.

## Commands

```bash
bun run check:harness              # rollout + format + guard
bun run lint:bun-native:changed    # PR/default
bun run lint:bun-native:rollout    # full tree (main / HARNESS_FULL_LINT)
bun run bun:remediation            # entry · tip · search · list · JSON
bun run guard:bun-first:harness
bun run harness:report             # offenders / promote
bun run harness:status
```

## Config map

| Layer               | File                                                                        |
| ------------------- | --------------------------------------------------------------------------- |
| Remediation catalog | [`config/bun-remediation-catalog.ts`](../config/bun-remediation-catalog.ts) |
| Harness ESLint      | [`eslint.harness.config.ts`](../eslint.harness.config.ts)                   |
| Rollout inventory   | [`config/eslint/harness/rollout.ts`](../config/eslint/harness/rollout.ts)   |

## Where the catalog is used

| Consumer                  | Purpose                                                                        |
| ------------------------- | ------------------------------------------------------------------------------ |
| Harness ESLint messages   | Resolve a rule finding to one canonical replacement and Bun documentation link |
| `@factorywager/guards`    | Detect restricted modules and syntax from catalog modules and patterns         |
| `harness:report`          | Group findings by stable catalog ID and recommend the matching command         |
| `bun-docs-coverage`       | Prove every remediation links to a known canonical Bun docs page               |
| `bun run bun:remediation` | Human lookup by exact ID, search term, random tip, table, or JSON              |
| MCP `bun_remediation`     | Agent lookup over the same entries; no duplicated advice table                 |

The rollout is intentionally repository-owned. It scans `lib/`, `scripts/`,
`packages/`, `server/`, `config/`, and `tools/`. Nested products under
`projects/` own their own lint and runtime policy unless they explicitly adopt
this catalog.

Policy: [bun/BUN_FIRST_POLICY.md](./bun/BUN_FIRST_POLICY.md) · capabilities:
[BUN_NATIVE_CAPABILITIES.md](./BUN_NATIVE_CAPABILITIES.md).

Upstream docs: prefer `bun.com/docs` via
`bun tools/bun-doc-refs.ts suggest "<api>"`.
