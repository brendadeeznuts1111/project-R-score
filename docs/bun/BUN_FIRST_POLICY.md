# Bun-first policy

**Pin:** Bun **1.4.0** (`package.json` `packageManager`).

Prefer Bun native APIs over Node compat when an equivalent exists. Enforce via:

- `bun run lint:bun-native:changed` / `lint:bun-native:rollout`
- `bun run guard:bun-first:harness` · `bun run migrate:status`
- [BUN_FIRST_GUARDS.md](../BUN_FIRST_GUARDS.md) ·
  [BUN_NATIVE_CAPABILITIES.md](../BUN_NATIVE_CAPABILITIES.md)
- `bun run bun:remediation` · `bun tools/bun-doc-refs.ts suggest "<api>"`

## Critical replacements

| Avoid                         | Prefer                                                  |
| ----------------------------- | ------------------------------------------------------- |
| `node:fs` / `fs.*`            | `Bun.file` · `Bun.write` · `Bun.Glob`                   |
| `node:path` in `lib/`         | `lib/path-bun` · `import.meta.dir` / `import.meta.path` |
| `process.env` in lib\|scripts | `Bun.env`                                               |
| `node:http(s)` servers        | `Bun.serve`                                             |
| `JSON.stringify` → `Response` | `Response.json(data)`                                   |
| `js-yaml` / `yaml` npm        | `Bun.YAML` · `import x from './f.yaml'`                 |
| `child_process`               | `Bun.spawn` / `Bun.spawnSync`                           |

## Day-loop

```bash
bun run check:path-bun
bun run check:bun-env
bun run lint:bun-native:changed
bun run harness:status
```

Install plane: [UNIFIED.md](../UNIFIED.md). Long historical policy text:
`git log -- docs/bun/BUN_FIRST_POLICY.md`.
