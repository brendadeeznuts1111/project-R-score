# Bun-first linting

Harness for `lib/` · `scripts/` · `packages/` · `server/` · `config/` ·
`tools/`.

## Commands

```bash
bun run lint                       # changed files; PR/day-loop default
bun run lint:all                   # complete root harness scope
bun run lint:fix                   # fix changed files
bun run format                     # format the complete root harness scope
bun run format:check               # verify formatting without writes
bun run bun:remediation            # entry · tip · search · list · JSON
bun run harness:report             # grouped ESLint findings
bun run harness:status
```

## Config map

| Layer               | File                                                                        |
| ------------------- | --------------------------------------------------------------------------- |
| Remediation catalog | [`config/bun-remediation-catalog.ts`](../config/bun-remediation-catalog.ts) |
| Harness ESLint      | [`eslint.harness.config.ts`](../eslint.harness.config.ts)                   |
| Scope and ignores   | [`config/eslint/harness/rollout.ts`](../config/eslint/harness/rollout.ts)   |

## Where the catalog is used

| Consumer                  | Purpose                                                                        |
| ------------------------- | ------------------------------------------------------------------------------ |
| Harness ESLint messages   | Resolve a rule finding to one canonical replacement and Bun documentation link |
| `harness:report`          | Group findings by stable catalog ID and recommend the matching command         |
| `bun-docs-coverage`       | Prove every remediation links to a known canonical Bun docs page               |
| `bun run bun:remediation` | Human lookup by exact ID, search term, random tip, table, or JSON              |

ESLint is the only source scanner. The retired line-based guard duplicated the
same restricted imports and syntax, produced false positives inside strings,
and made reports count the same policy twice.

The rollout is intentionally repository-owned. It scans `lib/`, `scripts/`,
`packages/`, `server/`, `config/`, and `tools/`. Nested products under
`projects/` own their own lint and runtime policy unless they explicitly adopt
this catalog.

Policy: [bun/BUN_FIRST_POLICY.md](./bun/BUN_FIRST_POLICY.md) · capabilities:
[BUN_NATIVE_CAPABILITIES.md](./BUN_NATIVE_CAPABILITIES.md).

Upstream docs: prefer `bun.com/docs` via
`bun tools/bun-doc-refs.ts suggest "<api>"`.
