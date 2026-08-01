# Bun runtime — CLI, console depth, utilities

Single hub for Bun CLI execution options, console depth / stdin, and the utilities
master table (shapes verified on Bun **1.4.0** / `bun-types`).

1. [CLI & execution options](#cli--execution-options)
2. [Console depth & stdin](#console-depth--stdin)
3. [Bun API Reference — module map](#bun-api-reference--module-map)
4. [Master table](#master-table)
5. [Depth & runtime legends](#depth--runtime-legends)

| Plane | URL |
|-------|-----|
| API Reference (types) | [bun.com/reference](https://bun.com/reference) → [Bun module](https://bun.com/reference/bun) |
| Runtime / CLI flags | [bun.com/docs/runtime](https://bun.com/docs/runtime#general-execution-options) · [`bun run` CLI](https://bun.com/docs/cli/run) |
| Console guide | [bun.com/docs/runtime/console](https://bun.com/docs/runtime/console) |
| Docs index | [bun.com/docs/llms.txt](https://bun.com/docs/llms.txt) |
| Local lookup | `bun tools/bun-doc-refs.ts suggest "<api>"` |
| Curated flags | [`../config/runtime-flags.json`](../config/runtime-flags.json) · `bun run portal:flags` |
| Module SSOT | [`console-depth.ts`](./console-depth.ts) · note [`console-depth.md`](./console-depth.md) |
| Capabilities map | [`../docs/BUN_NATIVE_CAPABILITIES.md`](../docs/BUN_NATIVE_CAPABILITIES.md) |

`bun.sh/docs/…` is the same Mintlify site as `bun.com/docs/…` — prefer **bun.com**
(repo SSOT / `bun-doc-refs`).

**Harness defaults:** `import { stringWidth, stripANSI, wrapAnsi, sliceAnsi } from 'bun'`
for TTY primitives. Use [`console-depth.ts`](./console-depth.ts) only for depth
policy, `jsonOut` / `logTable` / `logDepth` / `colorize` / layout helpers — never
raw `console.table` / `console.dir` / `util.inspect` (`bun run check:console-format`).

---

## CLI & execution options

### Running files and scripts

Bun runs JavaScript, TypeScript, JSX, and TSX with its native transpiler — no
extra config.

```bash
# Run a file
bun run index.js
bun run index.tsx

# Shortcut: "run" is optional for files
bun index.tsx
bun index.js
```

`package.json` scripts:

```bash
bun run dev          # named script
bun run              # list available scripts
```

Docs claim ~6ms startup for `package.json` scripts vs ~170ms for `npm run`.

**Flag placement:** Bun flags go **immediately after `bun`**. Trailing flags are
passed through to the script.

```bash
# Correct
bun --watch run dev
bun --console-depth=6 run tools/probe.ts

# Wrong — --watch is ignored by Bun, passed to the script
bun run dev --watch
```

### Related runtime entrypoints

| Command | Role |
|---------|------|
| `bun run <file>` | Execute source (TS/JSX/TSX OK) |
| `bun run <script>` | `package.json` script (lifecycle `pre*` / `post*` honored) |
| `bun run -` | Execute **code** from stdin (not a path list) |
| `bun --console-depth N run …` | Nesting depth for `console.log` / native inspect |
| `bun --smol run …` | Lower memory, more frequent GC |
| `bun --bun run <cli>` | Force Node-shebang CLIs to use Bun |

Resolution order for `bun run <name>` (docs): scripts → source files → package
bins → (run only) system commands. Absolute / `./` paths always run as files.

---

### General execution options

Canonical docs: [General Execution Options](https://bun.com/docs/runtime#general-execution-options)
([`bun run` CLI](https://bun.com/docs/cli/run)). Shapes below match `bun run --help`
on Bun **1.4.0** / this machine. Curated harvest for portal-cli:
[`../config/runtime-flags.json`](../config/runtime-flags.json).

#### General

| Flag | Shape / values | Description |
|------|----------------|-------------|
| `--silent` | boolean | Don't print the script command |
| `--if-present` | boolean | Exit 0 if the entrypoint does not exist |
| `-e` / `--eval <code>` | `string` | Evaluate argument as a script |
| `-p` / `--print <code>` | `string` | Eval and print result |
| `-h` / `--help` | boolean | Help menu |

#### Workspace management

| Flag | Shape / values | Description |
|------|----------------|-------------|
| `--elide-lines=<n>` | `number` (default `10`; `0` = all) | Lines of script output when using `--filter` |
| `-F` / `--filter <pattern>` | `string` | Run script in matching workspace packages |
| `--workspaces` | boolean | Run in all `package.json` workspaces |
| `--parallel` | boolean | Run multiple scripts concurrently (prefixed output) |
| `--sequential` | boolean | Run multiple scripts one after another (prefixed) |
| `--no-exit-on-error` | boolean | With parallel/sequential, continue after a failure |

#### Runtime & process control

| Flag | Shape / values | Description |
|------|----------------|-------------|
| `-b` / `--bun` | boolean | Force Bun for Node shebangs (symlink `node` → Bun) |
| `--no-orphans` | boolean | Exit when parent dies; SIGKILL descendants (Linux/macOS) |
| `--shell=<bun\|system>` | `bun` \| `system` | Shell for `package.json` scripts |
| `--interactive` | boolean | See note below (docs ↔ help gap) |
| `--smol` | boolean | Lower memory; GC more often |
| `--expose-gc` | boolean | Expose `gc()` on global (no effect on `Bun.gc()`) |
| `--no-deprecation` | boolean | Suppress custom deprecation reporting |
| `--throw-deprecation` | boolean | Deprecation warnings become errors |
| `--title <name>` | `string` | Set process title |
| `--zero-fill-buffers` | boolean | Force `Buffer.allocUnsafe` to zero-fill |
| `--no-addons` | boolean | Error on `process.dlopen`; disable `node-addons` condition |
| `--unhandled-rejections=<mode>` | `strict` \| `throw` \| `warn` \| `none` \| `warn-with-error-code` | Unhandled rejection policy |
| `--console-depth=<n>` | `number` (default `2`) | Default depth for `console.log` object inspection |
| `--cron-title <title>` | `string` | Title for cron execution mode |
| `--cron-period <spec>` | `string` | Cron period for cron execution mode |

**`--interactive` (docs gap):** [General Execution Options](https://bun.com/docs/runtime#general-execution-options)
lists a Node-compat REPL (`node:repl`; with `-e`, eval then REPL — raw JS, not
TypeScript). Distinct from `bun repl` (Bun-native). **Not** printed by
`bun run --help` on Bun 1.4.0 here; treat as unverified until `bun --help` shows it.

#### Development workflow

| Flag | Shape / values | Description |
|------|----------------|-------------|
| `--watch` | boolean | Restart when imported files change |
| `--hot` | boolean | Soft reload (test runner / bundler / runtime) |
| `--no-clear-screen` | boolean | Keep terminal output on `--watch` / `--hot` reload |

#### Debugging

| Flag | Shape / values | Description |
|------|----------------|-------------|
| `--inspect[=host:port]` | optional `host:port` | Activate debugger |
| `--inspect-wait[=host:port]` | optional `host:port` | Wait for debugger before executing |
| `--inspect-brk[=host:port]` | optional `host:port` | Break on first line and wait |
| `--cpu-prof` | boolean | CPU profile on exit |
| `--cpu-prof-name <file>` | `string` | CPU profile filename |
| `--cpu-prof-dir <dir>` | `string` | CPU profile directory |
| `--cpu-prof-md` | boolean | CPU profile as markdown (LLM-friendly) |
| `--cpu-prof-interval=<µs>` | `number` (default `1000`) | CPU sampling interval |
| `--heap-prof` | boolean | V8 `.heapsnapshot` on exit |
| `--heap-prof-name <file>` | `string` | Heap profile filename |
| `--heap-prof-dir <dir>` | `string` | Heap profile directory |
| `--heap-prof-md` | boolean | Markdown heap profile on exit |

#### Dependency & module resolution

| Flag | Shape / values | Description |
|------|----------------|-------------|
| `-r` / `--preload <module>` | `string` (repeatable) | Import module(s) before other modules load |
| `--require <module>` | `string` | Alias of `--preload` (Node compat) |
| `--import <module>` | `string` | Alias of `--preload` (Node compat) |
| `--no-install` | boolean | Disable runtime auto-install |
| `--install=<mode>` | `auto` \| `fallback` \| `force` | Runtime auto-install policy |
| `-i` | boolean | ≡ `--install=fallback` (not `--no-install`) |
| `--prefer-offline` | boolean | Skip staleness checks; resolve from disk |
| `--prefer-latest` | boolean | Always check npm for latest matching versions |
| `--conditions <cond>` | `string` | Custom export conditions |
| `--main-fields <fields>` | `string` | `package.json` main fields (`--target` dependent default) |
| `--preserve-symlinks` | boolean | Preserve symlinks when resolving files |
| `--preserve-symlinks-main` | boolean | Preserve symlinks for the main entrypoint |
| `--extension-order <list>` | CSV extensions | Default `.tsx,.ts,.jsx,.js,.json` |

#### Transpilation & language features

| Flag | Shape / values | Description |
|------|----------------|-------------|
| `--tsconfig-override <path>` | `string` | Custom `tsconfig.json` (default `$cwd/tsconfig.json`) |
| `-d` / `--define <K:V>` | `K:V` (JSON values) | Compile-time substitutes |
| `--drop <fn>` | `string` (e.g. `console`) | Remove matching function calls |
| `--feature <name>` | `string` | Feature flag for DCE |
| `-l` / `--loader <ext:loader>` | e.g. `.js:jsx` | Loaders: `js` `jsx` `ts` `tsx` `json` `toml` `text` `file` `wasm` `napi` |
| `--no-macros` | boolean | Disable macros in bundler / transpiler / runtime |
| `--jsx-factory <id>` | `string` | Classic JSX factory |
| `--jsx-fragment <id>` | `string` | Classic JSX fragment |
| `--jsx-import-source <spec>` | `string` (default `react`) | Automatic JSX import source |
| `--jsx-runtime=<mode>` | `automatic` \| `classic` | JSX runtime |
| `--jsx-side-effects` | boolean | Treat JSX as having side effects |
| `--ignore-dce-annotations` | boolean | Ignore `@__PURE__` etc. |

#### Networking & security

| Flag | Shape / values | Description |
|------|----------------|-------------|
| `--port <n>` | `number` | Default port for `Bun.serve` |
| `--fetch-preconnect <url>` | `string` | Preconnect while code loads |
| `--max-http-header-size=<bytes>` | `number` (default 16KiB) | Max HTTP header size |
| `--dns-result-order=<order>` | `verbatim` \| `ipv4first` \| `ipv6first` | DNS lookup order |
| `--use-system-ca` | boolean | System trusted CAs |
| `--use-openssl-ca` | boolean | OpenSSL default CA store |
| `--use-bundled-ca` | boolean | Bundled CA store |
| `--redis-preconnect` | boolean | Preconnect to `$REDIS_URL` at startup |
| `--sql-preconnect` | boolean | Preconnect to PostgreSQL at startup |
| `--user-agent <ua>` | `string` | Default `User-Agent` for HTTP |
| `--experimental-http2-fetch` | boolean | Offer h2 in `fetch()` TLS ALPN |
| `--experimental-http3-fetch` | boolean | Honor `Alt-Svc: h3` / upgrade to HTTP/3 |
| `--experimental-stream-iter` | boolean | Enable experimental `stream/iter` APIs |

#### Global configuration & context

| Flag | Shape / values | Description |
|------|----------------|-------------|
| `--env-file <path>` | `string` (repeatable) | Load specific `.env` file(s) |
| `--no-env-file` | boolean | Disable automatic `.env` loading |
| `--cwd <path>` | `string` | Absolute cwd for resolution |
| `-c` / `--config <path>` | `string` | Bun config (default `$cwd/bunfig.toml`) |

**Harness tips**

- Prefer `bun --console-depth=N run …` over trailing flags.
- Child processes: pass `--console-depth=${getConsoleDepth()}` (or rely on bunfig).
- Do not put lifecycle `pre*` / `post*` on `check:harness-*` (steals stdin).
- Portal harvest / shortcodes stay in `runtime-flags.json` — this section is the full `bun run` surface.

---

### Package management

Guide: [bun.com/docs/pm](https://bun.com/docs/pm). Machine policy:
[`../docs/UNIFIED.md`](../docs/UNIFIED.md).

| Command | Description |
|---------|-------------|
| `bun install` | Install from `package.json` / lockfile |
| `bun add <pkg>` | Add dependency |
| `bun add -d <pkg>` | Add dev dependency |
| `bun remove <pkg>` | Remove dependency |
| `bun update` | Update dependencies |
| `bunx <pkg>` | Run package bin (auto-install if needed) |

Common `bun install` flags:

| Flag | Description |
|------|-------------|
| `-g` / `--global` | Global install |
| `--verbose` / `--silent` | Logging |
| `--frozen-lockfile` | CI: fail if lockfile stale |
| `--lockfile-only` | Write lockfile without `node_modules` |
| `--save-text-lockfile` | Human-readable lockfile |
| `--cpu` / `--os` | Target optional deps |
| `--linker` | `hardlink` \| `clonefile` \| `isolated` (machine SSOT: isolated) |

---

### Testing

Guide: [bun.com/docs/test](https://bun.com/docs/test). Discovers `*.test.ts` /
`*.spec.ts` (and friends).

```bash
bun test
bun test ./tests/console-depth.test.ts
bun test console-depth   # path filter
```

| Flag | Description |
|------|-------------|
| `--watch` | Re-run on change |
| `-t` / `--test-name-pattern` | Filter by test name |
| `--timeout <ms>` | Per-test timeout (default 5000) |
| `--smol` | Lower memory for test VM |
| `--inspect*` | Debugger on test runner |
| `--preload` | Load before tests |
| `--concurrent` | Force concurrent tests |
| `--changed` | Only tests affected by git changes |
| `--reporter` / `--reporter-outfile` | e.g. `junit` |
| `--path-ignore-patterns` | Exclude from discovery |
| `--bail` | Stop after first failure |
| `--retry <n>` | Retry failing tests |
| `--update-snapshots` | Refresh `toMatchSnapshot()` |

This repo: `bun test tests/console-depth.test.ts` · claim `console-depth-boundaries`.

---

### Other commands

| Command | Description |
|---------|-------------|
| `bun init` | Scaffold a Bun project |
| `bun build` | Production bundler |
| `bun --help` | Full CLI help |
| `bun repl` | Bun-native REPL (TypeScript). Prefer this over docs-only `--interactive` / `node:repl`. |

Shebang: `#!/usr/bin/env bun`. Persistent knobs: `bunfig.toml`.

---

## Console depth & stdin

### Object inspection depth (`console.log()`)

By default, Bun’s `console.log()` prints nested objects to a depth of **2** so
terminals are not flooded with large structures.

```ts
const nested = { a: { b: { c: { d: 'deep' } } } };
console.log(nested);
// Default (depth 2): { a: { b: { c: [Object ...] } } }
```

### How to change the depth

| Method | Command / config | Scope |
|--------|------------------|-------|
| **CLI flag** | `bun --console-depth <number> script.ts` | Single run |
| **Configuration file** | `[console] depth` in `bunfig.toml` | Persistent across runs |
| **Default** | `2` | Fallback |

The CLI flag takes precedence over the configuration file setting.

```ts
// With --console-depth 4
console.log(nested);
// { a: { b: { c: { d: 'deep' } } } }
```

### FactoryWager layers

This repo pins bunfig `[console] depth = 6` for plain `console.log`. Explicit
`Bun.inspect` / helpers go through [`console-depth.ts`](./console-depth.ts):

| Layer | Knob | Who reads it |
|-------|------|----------------|
| Native | `--console-depth` → bunfig → `2` | Bun runtime (`console.log`) |
| Wrapper | explicit `depth` → flag → `BUN_CONSOLE_DEPTH` → bunfig → `2` | `inspect` / `logDepth` / `logTable` / … |

`BUN_CONSOLE_DEPTH` is **wrapper-only** — the runtime does not read it.
Prefer helpers (`inspect`, `logDepth`, `logTable`, `jsonOut`) over raw
`console.log(obj)` / `console.table` for harness output.

```ts
import { inspect, getConsoleDepth } from './console-depth.ts';

inspect(nested, { depth: 4 });
Bun.spawn(['bun', `--console-depth=${getConsoleDepth()}`, 'run', 'tools/probe.ts']);
```

---

### Reading from `stdin`

Bun provides two primary ways to read from stdin.

### 1. `console` as an `AsyncIterable` — line-by-line

In Bun, `console` is also an `AsyncIterable` that reads `process.stdin` line by
line. Ideal for interactive prompts.

```ts
// adder.ts
console.log(`Let's add some numbers!`);
process.stdout.write(`Count: 0\n> `);

let count = 0;
for await (const line of console) {
  count += Number(line);
  process.stdout.write(`Count: ${count}\n> `);
}
```

```bash
$ bun run adder.ts
Let's add some numbers!
Count: 0
> 5
Count: 5
> 5
Count: 10
```

Simpler echo:

```ts
const prompt = 'Type something: ';
process.stdout.write(prompt);
for await (const line of console) {
  console.log(`You typed: ${line}`);
  process.stdout.write(prompt);
}
```

### 2. `Bun.stdin` — streaming raw bytes

`Bun.stdin` is a `BunFile`. Use it for large piped inputs read incrementally.

```ts
// stdin.ts
for await (const chunk of Bun.stdin.stream()) {
  // chunk is Uint8Array
  const chunkText = Buffer.from(chunk).toString();
  console.log(`Chunk: ${chunkText}`);
}
```

```bash
$ echo "hello" | bun run stdin.ts
Chunk: hello
```

When using `Bun.stdin.stream()`, chunks are **not** guaranteed to be split
line-by-line. Use the `console` async iterator for line-based input.

### Related: execute code from stdin

`bun run -` executes **TypeScript/JavaScript source** from stdin — it is not a
path-list reader. Path lists and probes that need file contents should use
`Bun.stdin` / `Bun.file`, not `bun run -`.

---

## Bun API Reference — module map

From the [reference index](https://bun.com/reference) (sidebar / cards). Prefer the
**Bun** module for harness code; use `bun:*` for specialized surfaces; treat
`node:*` as compatibility (harness bans `node:http` / `node:https` under
`lib/` / `scripts/` / `tools/` / …).

| Module (index card) | Reference path | Notes |
|---------------------|----------------|-------|
| **Bun** | [/reference/bun](https://bun.com/reference/bun) | Core runtime — file system, networking, processes, inspect, color, shell, … |
| `bun:bundle` | [/reference/bun/bundle](https://bun.com/reference/bun/bundle) | Bundle-time APIs |
| `bun:ffi` | [/reference/bun/ffi](https://bun.com/reference/bun/ffi) | Native C FFI |
| `bun:jsc` | [/reference/bun/jsc](https://bun.com/reference/bun/jsc) | `serialize` / `deserialize` / `estimateShallowMemoryUsageOf` |
| `bun:sqlite` | [/reference/bun/sqlite](https://bun.com/reference/bun/sqlite) | Built-in SQLite |
| `bun:test` | [/reference/bun/test](https://bun.com/reference/bun/test) | `describe` / `test` / `expect` |
| **Globals** | [/reference/globals](https://bun.com/reference/globals) | Global scope (`console`, `fetch`, stream transforms, …) |
| `node:util` | [/reference/node/util](https://bun.com/reference/node/util) | Node compat (`util.inspect`) — avoid for new harness output |
| `node:zlib` / `node:zlib/iter` | [/reference/node/zlib](https://bun.com/reference/node/zlib) · [/iter](https://bun.com/reference/node/zlib/iter) | Prefer `Bun.gzipSync` / zstd natives when possible |

Paths under `/reference/bun/<submodule>` match the live types site (not `bun-jsc` hyphen forms).

### Reference pages for APIs in this table

Path pattern: `https://bun.com/reference/bun/<Name>` (generated from bun-types).

| API | Reference |
|-----|-----------|
| `Bun.inspect` / options | [inspect](https://bun.com/reference/bun/inspect) · [BunInspectOptions](https://bun.com/reference/bun/BunInspectOptions) |
| `Bun.color` | [color](https://bun.com/reference/bun/color) |
| `Bun.stringWidth` | [stringWidth](https://bun.com/reference/bun/stringWidth) |
| `Bun.stripANSI` | [stripANSI](https://bun.com/reference/bun/stripANSI) |
| `Bun.wrapAnsi` | [wrapAnsi](https://bun.com/reference/bun/wrapAnsi) |
| `Bun.sliceAnsi` | [sliceAnsi](https://bun.com/reference/bun/sliceAnsi) |
| `Bun.deepEquals` | [deepEquals](https://bun.com/reference/bun/deepEquals) |
| `Bun.escapeHTML` | [escapeHTML](https://bun.com/reference/bun/escapeHTML) |
| `Bun.peek` | [peek](https://bun.com/reference/bun/peek) |
| `Bun.sleep` / `sleepSync` | [sleep](https://bun.com/reference/bun/sleep) · [sleepSync](https://bun.com/reference/bun/sleepSync) |
| `Bun.nanoseconds` | [nanoseconds](https://bun.com/reference/bun/nanoseconds) |
| `Bun.randomUUIDv7` | [randomUUIDv7](https://bun.com/reference/bun/randomUUIDv7) |
| `Bun.which` | [which](https://bun.com/reference/bun/which) |
| `Bun.openInEditor` | [openInEditor](https://bun.com/reference/bun/openInEditor) |
| `Bun.fileURLToPath` / `pathToFileURL` | [fileURLToPath](https://bun.com/reference/bun/fileURLToPath) · [pathToFileURL](https://bun.com/reference/bun/pathToFileURL) |
| `Bun.resolveSync` | [resolveSync](https://bun.com/reference/bun/resolveSync) |
| `Bun.env` / `argv` / `main` / `version` / `revision` | [env](https://bun.com/reference/bun/env) · [argv](https://bun.com/reference/bun/argv) · [main](https://bun.com/reference/bun/main) · [version](https://bun.com/reference/bun/version) · [revision](https://bun.com/reference/bun/revision) |
| `Bun.enableANSIColors` | [enableANSIColors](https://bun.com/reference/bun/enableANSIColors) |
| `Bun.$` (shell) | [\$](https://bun.com/reference/bun/$) |
| `Bun.stdin` | [stdin](https://bun.com/reference/bun/stdin) |
| `Bun.readableStreamTo*` | e.g. [readableStreamToText](https://bun.com/reference/bun/readableStreamToText) · [readableStreamToBytes](https://bun.com/reference/bun/readableStreamToBytes) |
| Compression | [gzipSync](https://bun.com/reference/bun/gzipSync) · [zstdCompressSync](https://bun.com/reference/bun/zstdCompressSync) |
| `Bun.Image` | [Image](https://bun.com/reference/bun/Image) |
| `Bun.markdown` | [markdown](https://bun.com/reference/bun/markdown) |
| `HTMLRewriter` | Guide: [runtime/html-rewriter](https://bun.com/docs/runtime/html-rewriter) (global; types via bun-types) |
| `bun:jsc` | [jsc](https://bun.com/reference/bun/jsc) · [serialize](https://bun.com/reference/bun/jsc/serialize) · [deserialize](https://bun.com/reference/bun/jsc/deserialize) · [estimateShallowMemoryUsageOf](https://bun.com/reference/bun/jsc/estimateShallowMemoryUsageOf) |

---

## Master table

| Category | API / Method | Property / Shape | Runtime | Depth | Repo SSOT | Description |
|----------|--------------|------------------|---------|-------|-----------|-------------|
| Runtime Info | `Bun.version` | `string` | Sync – static | N/A | [`time.ts`](./time.ts) | Version string of the running `bun` CLI. |
| Runtime Info | `Bun.revision` | `string` | Sync – static | N/A | [`time.ts`](./time.ts) | Git commit hash of the Bun build. |
| Runtime Info | `Bun.env` | `typeof process.env` | Sync – alias | N/A | — | Alias for `process.env`. |
| Runtime Info | `Bun.main` | `string` (absolute path) | Sync – static | N/A | — | Entrypoint path of the current program. |
| Runtime Info | `Bun.enableANSIColors` | `boolean` (live on `Bun`; assignable) | Sync | N/A | `shouldColor()` | ANSI gate for console / color — do **not** freeze via named import. |
| Console Output | `console.log(...data)` | `(...data: any[]) => void` | Sync | ✅ `--console-depth` / bunfig | [`console-depth.ts`](./console-depth.ts) | Prints with object inspection; adds newline. |
| Console Output | `console.write(...data)` | `(...data: string[] \| Uint8Array[]) => void` | Sync | ❌ no formatting | — | Raw `stdout` — no inspection, no newline. |
| Console Output | `console.dir(obj, options?)` | `(obj: any, options?: InspectOptions) => void` | Sync | ✅ options `depth` | prefer `inspect` / `logDepth` | Node-compatible inspect print. |
| Console Output | `console.table(tabularData)` | `(tabularData: any) => void` | Sync | ✅ via console depth | prefer `logTable` / `inspectTable` | Tabular print (uses `Bun.inspect.table` internally). |
| Object Inspection | `Bun.inspect(value, options?)` | `(value: any, options?: BunInspectOptions) => string` | Sync | ✅ `{ depth }` | `inspect` / `logDepth` | Formatted string (does not print). Options: `depth`, `colors`, `compact`, `sorted`. |
| Object Inspection | `Bun.inspect.custom` | `symbol` | Sync – static | N/A | `inspectCustom` | Customize inspect output (≡ `util.inspect.custom`). |
| Object Inspection | `Bun.inspect.table(data, properties?, options?)` | Overloads: `(tabularData: object \| unknown[], properties?: string[], options?: { colors?: boolean }) => string` **or** `(tabularData, options?: { colors?: boolean }) => string` | Sync | ❌ no depth knob | `inspectTable` / `logTable` | Box-drawing table string. |
| Object Inspection | `util.inspect(...)` | Node `util.inspect` | Sync | ✅ `depth` / `Infinity` | avoid in harness | Node compatibility layer ([/reference/node/util](https://bun.com/reference/node/util)). |
| Stdin | `for await (const line of console)` | `console` is `AsyncIterableIterator<string>` | Async (per line) | N/A | [§ Console depth](#console-depth--stdin) | Line-by-line stdin — prompts. |
| Stdin | `Bun.stdin.stream()` | `() => ReadableStream` (chunks `Uint8Array` when iterated) | Async (per chunk) | N/A | [§ Console depth](#console-depth--stdin) | Raw byte chunks — not line-split. |
| Color | `Bun.color(input, outputFormat?)` | Overloads → `string \| number \| tuple \| object \| null` per format (`"ansi"`, `"number"`, `"[rgb]"`, …) | Sync | N/A | `colorize` | CSS → ANSI/hex/number; `"ansi"` auto-detect. Macro-capable. |
| Markdown | `Bun.markdown.ansi(md, options?)` | `(md: string \| TypedArray \| …, options?: AnsiTheme) => string` | Sync | N/A | call directly | Markdown → ANSI terminal. |
| Markdown | `Bun.markdown.html(md)` | `(md: string) => string` | Sync | N/A | — | Markdown → HTML string. |
| Markdown | `Bun.markdown.render(md, callbacks?)` | `(md: string, callbacks?) => string` | Sync | N/A | — | Low-level renderer with callbacks. |
| Shell | `Bun.$` (tagged template) | `` `cmd` `` → `ShellPromise` | Async when awaited | N/A | claim `bun-shell-boundaries` | Shell with pipes, redirection, globs. |
| Shell | `ShellPromise.text()` | `() => Promise<string>` | Async | N/A | — | stdout as string. |
| Shell | `ShellPromise.json()` | `() => Promise<any>` | Async | N/A | — | stdout as JSON. |
| Shell | `ShellPromise.arrayBuffer()` | `() => Promise<ArrayBuffer>` | Async | N/A | — | stdout as bytes. |
| Utilities | `Bun.sleep(ms)` | `(ms: number \| Date) => Promise<void>` | Async | N/A | [`time.ts`](./time.ts) | Delay — ms or wake-at `Date`. |
| Utilities | `Bun.sleepSync(ms)` | `(ms: number) => void` | Sync (blocks) | N/A | [`time.ts`](./time.ts) | Blocking sleep. |
| Utilities | `Bun.peek(promise)` | `<T>(promise: T \| Promise<T>) => Promise<T> \| T`; also `peek.status(promise)` | Sync (may return promise) | N/A | [`peek-settle.ts`](./peek-settle.ts) | Settled-value fast path. |
| Utilities | `Bun.which(command, options?)` | `(command: string, options?: WhichOptions) => string \| null` | Sync | N/A | — | Locate executable on `PATH`. |
| Utilities | `Bun.randomUUIDv7(encoding?, timestamp?)` | `("hex"\|"base64"\|"base64url"?, number\|Date?) => string` **or** `("buffer", timestamp?) => Buffer` | Sync | N/A | [`time.ts`](./time.ts) | Monotonic UUID v7. |
| Utilities | `Bun.openInEditor(path, options?)` | `(path: string, options?: EditorOptions) => void` | Sync | N/A | — | Open in `$VISUAL` / `$EDITOR`. |
| Utilities | `Bun.deepEquals(a, b, strict?)` | `(a: any, b: any, strict?: boolean) => boolean` | Sync | N/A | [`deep-equals.ts`](./deep-equals.ts) | Deep equality (`expect().toEqual` uses this). |
| Utilities | `Bun.escapeHTML(input)` | `(input: string \| object \| number \| boolean) => string` | Sync | N/A | [`escape-html.ts`](./escape-html.ts) | Escape `"&'<>` for HTML. |
| Utilities | `Bun.stringWidth(input, options?)` | `(input: string, options?: StringWidthOptions) => number` | Sync | N/A | import from `'bun'` | Terminal column width. |
| Utilities | `Bun.stripANSI(input)` | `(input: string) => string` | Sync | N/A | import from `'bun'` | Strip ANSI / OSC sequences. |
| Utilities | `Bun.wrapAnsi(input, columns, options?)` | `(input: string, columns: number, options?: WrapAnsiOptions) => string` | Sync | N/A | import from `'bun'` | Wrap preserving ANSI + Unicode width. |
| Utilities | `Bun.sliceAnsi(input, start?, end?, options?, ambiguousIsNarrow?)` | `(input, start?, end?, options?: string \| boolean \| SliceAnsiOptions, ambiguousIsNarrow?: boolean) => string` | Sync | N/A | import from `'bun'` · used by `truncateWidth` / `fitVisible` | Column-safe slice (4th arg may be ellipsis string). |
| Utilities | `Bun.fileURLToPath(url)` | `(url: URL \| string) => string` | Sync | N/A | [`path-bun.ts`](./path-bun.ts) | `file://` → absolute path. |
| Utilities | `Bun.pathToFileURL(path)` | `(path: string) => URL` | Sync | N/A | [`path-bun.ts`](./path-bun.ts) | Absolute path → `file://` URL. |
| Utilities | `Bun.nanoseconds()` | `() => number` | Sync | N/A | [`time.ts`](./time.ts) | ns since process start. |
| Utilities | `Bun.resolveSync(moduleId, parent)` | `(moduleId: string, parent: string) => string` | Sync | N/A | — | Bun module resolution algorithm. |
| ReadableStream | `Bun.readableStreamToArrayBuffer(stream)` | `(ReadableStream) => Promise<ArrayBuffer>` | Async | N/A | — | Stream → `ArrayBuffer`. |
| ReadableStream | `Bun.readableStreamToBytes(stream)` | `(ReadableStream) => Promise<Uint8Array>` | Async | N/A | — | Stream → `Uint8Array`. |
| ReadableStream | `Bun.readableStreamToBlob(stream)` | `(ReadableStream) => Promise<Blob>` | Async | N/A | — | Stream → `Blob`. |
| ReadableStream | `Bun.readableStreamToJSON(stream)` | `(ReadableStream) => Promise<any>` | Async | N/A | — | Stream → JSON. |
| ReadableStream | `Bun.readableStreamToText(stream)` | `(ReadableStream) => Promise<string>` | Async | N/A | — | Stream → string. |
| ReadableStream | `Bun.readableStreamToArray(stream)` | `(ReadableStream) => Promise<unknown[]>` | Async | N/A | — | Stream → chunk array. |
| ReadableStream | `Bun.readableStreamToFormData(stream, boundary?)` | `(ReadableStream, boundary?) => Promise<FormData>` | Async | N/A | — | urlencoded or multipart. |
| Compression | `Bun.gzipSync` / `Bun.gunzipSync` | `(Uint8Array, opts?) => Uint8Array` | Sync | N/A | — | zlib GZIP. |
| Compression | `Bun.deflateSync` / `Bun.inflateSync` | `(Uint8Array, opts?) => Uint8Array` | Sync | N/A | — | zlib DEFLATE. |
| Compression | `Bun.zstdCompress` / `Bun.zstdDecompress` | `(Uint8Array, opts?) => Promise<Uint8Array>` | Async | N/A | — | Zstandard (async). |
| Compression | `Bun.zstdCompressSync` / `Bun.zstdDecompressSync` | `(Uint8Array, opts?) => Uint8Array` | Sync | N/A | — | Zstandard (sync). |
| Image | `new Bun.Image(input)` / `.metadata()` | `metadata() => Promise<ImageMetadata>` | Async | N/A | [`image-metadata.ts`](./image-metadata.ts) | Decode dims/format/size (and related encode APIs). |
| HTML Rewriter | `HTMLRewriter.on(selector, handlers)` | `(selector, ElementHandlers) => HTMLRewriter` | Async transform | N/A | — | Stream HTML parse/rewrite. |
| JSC | `serialize` / `deserialize` from `"bun:jsc"` | `(value) => Buffer` / `(Buffer) => any` | Sync | N/A | — | Structured clone to/from `Buffer`. |
| JSC | `estimateShallowMemoryUsageOf` from `"bun:jsc"` | `(value) => number` | Sync | N/A | — | Best-effort shallow byte estimate. |

---

## Depth & runtime legends

**Depth** = API can control object-inspection nesting. Otherwise N/A.

| Method | Where to set |
|--------|----------------|
| `console.log` / `console.table` | `bun --console-depth N …` or bunfig `[console] depth` ([§ CLI](#cli--execution-options)) |
| `Bun.inspect` | `{ depth, colors, compact, sorted }` only (`BunInspectOptions`) |
| FactoryWager wrappers | explicit `depth` → flag → `BUN_CONSOLE_DEPTH` → bunfig → `2` ([§ Console depth](#console-depth--stdin)) |

| Runtime | Meaning |
|---------|---------|
| **Sync** | Runs immediately |
| **Async** | `Promise` / `AsyncIterable` — await or iterate |
| **Macro** | Some APIs (e.g. `Bun.color`) support `import … with { type: "macro" }` |

---

## External guides

| Topic | URL |
|-------|-----|
| Watch / hot | https://bun.com/docs/runtime/watch-mode |
| Debugger | https://bun.com/docs/runtime/debugger |
| Package manager | https://bun.com/docs/pm |
| Test runner | https://bun.com/docs/test |
| Color / Markdown / Shell / Utils / Image | https://bun.com/docs/runtime/color · [markdown](https://bun.com/docs/runtime/markdown) · [shell](https://bun.com/docs/runtime/shell) · [utils](https://bun.com/docs/runtime/utils) · [image](https://bun.com/docs/runtime/image) |
