---
name: bun
description: >
  Bun runtime and toolkit (1.4.x, Rust rewrite) — CLI commands, Bun.* globals,
  bun:sqlite, Bun.$, zstd, and agent-sandbox pitfalls. Load when writing or
  debugging Bun-native code, bun run/test scripts, or when the Bun global is
  unavailable in a Node code sandbox.
---

# Bun

Bun is the runtime for this workspace's tooling (scripts, tests, CLIs). The
installed CLI is the executable contract — verify behavior with `bun --version`
and the current official docs, never pre-trained knowledge.

## Grounding (verified 2026-08-27)

- Runtime: **1.4.0** — host `bun --revision` = `1.4.0+34cbb9a40` (matches the
  Kalshi-bot pinned shape revision `34cbb9a40b`)
- Release notes: **https://bun.com/blog/bun-v1.4** — “Bun 1.4”, published
  **2026-08-20** (Jarred, Ciro, Dylan, Alistair & Sosuke)
- Official docs index: **https://bun.com/docs/llms.txt**
- Rule: for API shape/history questions, check `bun --help` / `bun --revision`
  and the release notes + docs above. Do not guess from older training data.

## What Bun 1.4 is (release-notes facts)

- Bun was **rewritten from Zig to Rust** — first Rust release (Claude Code and
  Prisma Compute already ran on it).
- **Node compatibility:** +1,517 tests from the Node.js v26.3.0 suite; 2,900+
  fixes. `node:http`, `node:fs`, `node:cluster`, `node:timers`, `node:zlib`,
  `node:vm`, `node:stream` pass 97% of Node's own tests; `node:quic` 99%;
  `node:events`, `node:trace_events`, `node:sqlite` 100%.
- **Perf:** idle CPU −5×, memory −35% (13–48% on HTTP servers), Linux startup
  2× faster, binary up to 17% smaller (JavaScriptCore now uses mimalloc).
- **15 npm dependencies built in → 0 deps left:**
  `sharp`→Bun.Image · `puppeteer`→Bun.WebView · `marked`→Bun.markdown ·
  `node-cron`→Bun.cron() · `node-pty`→Bun.Terminal ·
  `concurrently`/`npm-run-all`→`bun run --parallel` · `serve-static`→
  Bun.serve dir routes · `json5`→Bun.JSON5 · `fast-xml-parser`→Bun.XML ·
  `tar`→Bun.Archive · `string-width`/`slice-ansi`/`cli-truncate`/`wrap-ansi`→
  Bun.Terminal/Bun.color

## Installed contract

```bash
bun --version     # 1.4.0 (pin lives in each repo's package.json "packageManager")
bun --revision    # 1.4.0+<commit> — exact build
which bun         # /Users/nolarose/.bun/bin/bun
```

## CLI cheat sheet (1.4 additions marked)

| Command | Use |
|---------|-----|
| `bun run <script>` | Run a package.json script (or ./file.ts) |
| `bun run --parallel <a> <b>` (1.4) | Run scripts concurrently; `--filter` for workspaces, `--no-exit-on-error` |
| `bun test` | Test runner — `--isolate`, `--grep "pat"`, `bun test <paths>` |
| `bun test --parallel` / `--shard=1/3` (1.4) | Parallel tests; sharded CI matrix |
| `bun audit fix` (1.4) | Autofix dependency vulnerabilities |
| `bun dedupe` (1.4) | Dedupe the lockfile |
| `bun prune` (1.4) | Remove unused dependencies |
| `bunx <pkg>` | Execute an npm package without installing (e.g. `bunx tsc --noEmit`) |
| `bun install` / `bun add` | Dependency management (writes bun.lock) |
| `bun build` | Bundler — `files:` map and `metafile: true` supported (1.4) |
| `bun build --compile` | Standalone executables |
| `bun -e '…'` | Evaluate a one-liner (host runtime, has `Bun`) |

## Key globals (1.4 shapes)

- `Bun.file` / `Bun.write` — streaming file IO (https://bun.com/docs/runtime/file-io)
- `Bun.$` — shell scripting (https://bun.com/docs/runtime/shell)
- `bun:sqlite` — embedded SQLite
- `Bun.zstdCompressSync` / `Bun.zstdDecompressSync` — zstd (no dep needed)
- `Bun.serve` — HTTP/3 via `http3: true` next to `tls` (2.7× faster static-route
  benchmark); directory routes streamed with sendfile; Range headers honored
  (video seeking) (https://bun.com/docs/runtime/http/server)
- `Bun.Image` — decode/resize/rotate/encode JPEG/PNG/WebP/GIF/BMP (HEIC/AVIF/TIFF
  on macOS+Windows); sharp-like chain:
  `Bun.file("photo.jpg").image().resize(1024,1024,{fit:"inside"}).rotate(90).webp({quality:85}).write("thumb.webp")`
  (https://bun.com/docs/runtime/image)
- `Bun.WebView` — **headless browser automation** (navigate/click/scroll/evaluate/
  screenshot) — NOT a desktop UI toolkit (https://bun.com/docs/runtime/webview)
- `Bun.markdown` — one source, full GFM, **no config, no import, no deps**
  (verified on host bun 1.4.0 + bun-types@1.4.0;
  https://bun.com/docs/runtime/markdown). API surface:
  `html(md, opts?)`, `ansi(md, opts?)`, `render(md, callbacks)`,
  `react(md, opts?)`, `parse(md)`
  - `html(md)` — browser HTML: nested lists, task lists (`[x]` →
    `<li class="task-list-item"><input type="checkbox" ... disabled>`), tables,
    strikethrough (`<del>`), headings — GFM tables/strikethrough/tasklists are
    ON by default
  - `ansi(md, opts?)` — **standalone** terminal renderer with color (verified);
    opts include `{ colors: false }` and `{ columns: 60 }`; `AnsiTheme`
    interface exists for themed terminal rendering
  - `render(md, {heading, paragraph, strong, …})` — callback renderers per
    element (release-notes API; the way to emit custom ANSI escape codes)
  - `react(md, {h1: MyComponent, …})` — React JSX elements; swap any tag's
    component
  - **Autolinks default to `false`** (verified — explains plain bare URLs):
    `html(md, { autolinks: true })` enables URL+WWW+email; granular
    `{ autolinks: { url: true, www: true, email: true } }`; other `html()`
    options: `wikiLinks`, `underline`, `latexMath`, `tagFilter`,
    `headings: { ids, autolink }`, `hardSoftBreaks`
  - Frontmatter pattern (frontmatter is NOT parsed by Bun.markdown):
    `const [meta, body] = (await Bun.file("page.md").text()).split("---\n").slice(1);`
    then `Bun.YAML.parse(meta)` (or `Bun.JSON5.parse(meta)`)
- `Bun.cron()` — OS-level scheduled job (crontab/launchd/Task Scheduler);
  `scheduled(controller)` handler, same shape as CF Workers Cron Triggers;
  5-field syntax + named days + `@daily` (https://bun.com/docs/runtime/cron)
- `Bun.Terminal` — built-in pseudo-terminal (replaces node-pty):
  `Bun.spawn(["bash"], {terminal:{cols:80,rows:24,data(term,data){…}}})`
- `Bun.JSON5` (parse/stringify, import .json5), `Bun.JSONL` (parse/parseChunk),
  `Bun.JSONC.parse`, `Bun.XML` (SIMD parse/serialize) (https://bun.com/docs/runtime/xml)
- `Bun.Archive` (tar-style), `Bun.hash`/`Bun.CryptoHasher` (https://bun.com/docs/runtime/archive, /utils)
- `Bun.Glob`, `Bun.spawn`/`Bun.spawnSync` (https://bun.com/docs/runtime/glob, /child-process)
- Built-in React Compiler v1.4.0; TC39 decorators supported
- `mock.module()` — module mocking in tests (not Node `jest.mock`)

## 1.4 breaking changes (upgrade checklist)

1. **Node 26:** `process.versions.modules` is now `147` — prebuilt native addons
   need a build for 147.
2. **`res.writeHeader()` is gone** — use `res.writeHead()`.
3. Paused-mode `readable.read()` returns **one chunk** (#31991).
4. **New monorepos default to the isolated linker** (`bun.lock` records
   `configVersion: 1`); existing lockfiles keep the hoisted linker; opt out with
   `linker = "hoisted"` in `bunfig.toml` (#24236).
5. **Bun invoked as node** (`bun --bun`, `bunx --bun`, node symlink) does **not**
   load `.env` — pass `--env-file` (#36610). `Bun.YAML` follows YAML 1.2
   (`yes`/`no`/`on`/`off` are no longer booleans).

Security: the release ships many security fixes (TLS hostname checks,
`checkServerIdentity` in fetch, `rediss://` cert validation) — upgrade.

## Agent-sandbox pitfall (from session traces)

Agent code sandboxes (e.g. the `run_code` tool) run **plain Node** — the
`Bun` global is **not defined** there. `Bun.zstdDecompressSync`, `Bun.file`,
`bun:sqlite`, `Bun.$`, etc. throw `ReferenceError: Bun is not defined`.
Top-level `import` also fails in those sandboxes — use dynamic
`await import("fs")`.

For anything Bun-native from an agent, shell out to the host CLI via bash:

```bash
# zstd traces (~/.dsh/sessions/*/session.jsonl.zstd) → plain JSONL:
bun -e 'const { readFileSync, writeFileSync } = require("fs");
  const out = Bun.zstdDecompressSync(readFileSync(process.argv[1]));
  writeFileSync(process.argv[2], out);' in.zstd out.jsonl

bun run check      # repo typecheck + test + artifact restore
bunx tsc --noEmit  # typecheck through the host CLI
```

## Config conventions

- `packageManager`: `bun@1.4.0` pin in `package.json`
- `bunfig.toml` — install/test/run defaults per repo
- Prefer Bun builtins over npm deps; zero-runtime-dep repos keep `drizzle-orm`
  + `zod` only
