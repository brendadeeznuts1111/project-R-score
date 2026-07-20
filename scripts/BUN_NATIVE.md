# Bun-native discovery & apply

Automated deeper scan of non-Bun file I/O debt, grounded in official Bun docs.

## Docs (source of truth)

- [File I/O](https://bun.com/docs/runtime/file-io) — `Bun.file`, `Bun.write`, `BunFile.delete`
- [exists](https://bun.com/docs/guides/read-file/exists) — `await Bun.file(path).exists()`
- [Glob](https://bun.com/docs/runtime/glob) — `new Bun.Glob(pattern)`
- Shared helpers: [`scripts/lib/fs-bun.ts`](lib/fs-bun.ts)

## Commands

```bash
# Discover (scripts + lib + packages + tools) + write report
bun run discover:bun-native

# JSON to stdout
bun run discover:bun-native:json

# Safe apply on scripts/ only (exists/read/write/console.log)
bun run discover:bun-native:apply:dry   # preview
bun run discover:bun-native:apply       # write files

# Direct
bun run scripts/bun-native-discover.ts --roots=scripts --apply
```

Report path: `artifacts/bun-native-discover.latest.json` (local / gitignored).

## What is auto-applied (safe)

| From | To |
|------|-----|
| `existsSync(p)` | `fileExistsSync(p)` |
| `readFileSync(p, 'utf8')` | `readTextSync(p)` |
| `JSON.parse(readFileSync(...))` | `readJsonSync(...)` |
| `await readFile(p, 'utf8')` | `await readText(p)` |
| `await writeFile(p, data[, enc])` | `await writeText(p, data)` |
| `console.log(` | `console.info(` |
| + | import/`@see` for `scripts/lib/fs-bun` |

## Not auto-applied (report only)

- `readdir` / raw directory walks → prefer `Bun.Glob` or Bun-documented `node:fs` readdir
- bare `mkdir` without a following nested `Bun.write`
- `child_process` → `Bun.spawn`
- `process.env` → `Bun.env` (opt-in, many intentional Node-compat paths)
- crypto / streams / complex multi-arg fs APIs

## After apply

```bash
bun test tests/fs-bun.test.ts
bun run discover:bun-native --roots=scripts   # confirm hit delta
```
