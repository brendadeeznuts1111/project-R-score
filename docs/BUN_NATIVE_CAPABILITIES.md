# Bun native capabilities (platform note)

> **JIT:** Feature notes. API lookup → `bun tools/bun-doc-refs.ts suggest "<api>"` · `bun run dx:catalog`.

| | |
| --- | --- |
| **Verified runtime** | Bun **1.4.0** — WebView / cron / udpSocket / `Bun.markdown` present |
| **Canonical refs** | `bun tools/bun-doc-refs.ts suggest "…"` · operate [BUN_DOCS_OPERATE.md](./BUN_DOCS_OPERATE.md) |
| **Not product desk SSOT** | Partner UI / Telegram / balance-sheet flows unless a package owns them |

## API map (homebase)

| API | Use when | Smoke / DX |
|-----|----------|------------|
| `using` / `await using` | deterministic dispose (`Symbol.dispose` / `asyncDispose`) | `tests/bun-explicit-resource.test.ts` · [TC39 ERM](https://github.com/tc39/proposal-explicit-resource-management) · [MDN using](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/using) |
| `Bun.WebView` | headless UI / automation (`await using view`) | `bun run test:install-verify` · `bun run test:search-governance` · [`install-verify.md`](./harness/install-verify.md) · [`search-governance.md`](./harness/search-governance.md) · [webview](https://bun.com/docs/runtime/webview#new-bun-webview-options) |
| `Bun.markdown` family | `.ansi` (`AnsiTheme`) · `.react` component overrides | `bun ./docs/harness/README.md` · `bun run docs:harness` · `bun run harness:status` · `tests/bun-markdown-ansi.test.ts` · helper `ansiMarkdown` in `lib/console-depth.ts` · [ansi](https://bun.com/docs/runtime/markdown#ansi-terminal-output) · [react](https://bun.com/docs/runtime/markdown#bun-markdown-react) · [available-overrides](https://bun.com/docs/runtime/markdown#available-overrides) · ship [1.3.12](https://bun.com/blog/bun-v1.3.12) |
| `Bun.inspect` family | `Bun.inspect()` string serialize · `.custom` symbol · `.table(tabularData, properties, options)` · `BunInspectOptions` `{colors,depth,sorted,compact}` | helpers in [`lib/console-depth.ts`](../lib/console-depth.ts) · claim `console-depth-boundaries` · `bun test tests/console-depth.test.ts` · `bun run harness:status -- --table` · Bun: [inspect](https://bun.com/docs/runtime/utils#bun-inspect) · [custom](https://bun.com/docs/runtime/utils#bun-inspect-custom) · [table](https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options) · Other: [BunInspectOptions](https://bun.com/reference/bun/BunInspectOptions) |
| `Worker` family | `new Worker` · `worker.ref` / `unref` · `terminate` · `Bun.isMainThread` · `Worker smol` (≠ bunfig) | [creating](https://bun.com/docs/runtime/workers#creating-a-worker) · [ref](https://bun.com/docs/runtime/workers#worker-ref) · [unref](https://bun.com/docs/runtime/workers#worker-unref) · [isMainThread](https://bun.com/docs/runtime/workers#bun-ismainthread) · compile entrypoints: [executables Worker](https://bun.com/docs/bundler/executables#worker) |
| `Bun.cron` | OS-persistent primary + in-process complement | [`docs/harness/cron.md`](./harness/cron.md) · `bun run test:cron` · `bun run test:cron-os` · [cron](https://bun.com/docs/runtime/cron) |
| `Bun.udpSocket` | UDP + ICMP/truncation | re-read when editing `lib/udp` |
| WebCrypto SHA3 / X25519 | hashing / key exchange | `tests/bun-crypto-webcrypto.test.ts` · `crypto.sha3` / `crypto.x25519` |
| `URLPattern` | Component-aware routing (`protocol` → `hash`; named groups; no `$N` leak) | `tests/bun-urlpattern.test.ts` · `tests/factory-production.test.ts` |
| `Bun.file` / `Bun.write` / `Bun.Glob` | file I/O, glob scanning | `bun test tests/fs-bun.test.ts tests/bun-glob-scan.test.ts` · claim `fs-native-boundaries` |
| `Bun.Terminal` / PTY | interactive **child** TTY (`new Bun.Terminal` · `Bun.spawn({ terminal })`) · not host `isTTY` · POSIX PTY + Windows ConPTY | helpers [`lib/terminal.ts`](../lib/terminal.ts) · `bun test tests/terminal.test.ts` · guide [terminal-pty-support](https://bun.com/docs/runtime/child-process#terminal-pty-support) · reference [`Terminal`](https://bun.com/reference/bun/Terminal) · types [bun-types](https://github.com/oven-sh/bun/tree/main/packages/bun-types) · ship [v1.3.5 PTY](https://bun.com/blog/bun-v1.3.5#bun-terminal-api-for-pseudo-terminal-pty-support) · [ConPTY 1.3.14](https://bun.com/blog/bun-v1.3.14#bunterminal-on-windows-via-conpty) |
| `Bun.deepEquals` | structural equality for evidence / cache skip · **strict** default (`true` = `toStrictEqual`) | helpers [`lib/deep-equals.ts`](../lib/deep-equals.ts) · enhancement report rows · `bun test tests/deep-equals.test.ts tests/show-enhancements.test.ts` · [bun-deepequals](https://bun.com/docs/runtime/utils#bun-deepequals) · [guide](https://bun.com/docs/guides/util/deep-equals) |
| `Bun.escapeHTML` | high-throughput HTML entity escape (`"&'<>`) for reports/portal | helpers [`lib/escape-html.ts`](../lib/escape-html.ts) · `bun run ops:enhancements:html` · [bun-escapehtml](https://bun.com/docs/runtime/utils#bun-escapehtml) |
| `Bun.peek` | settled-promise fast path (`awaitSettled` / `promiseStatus`) | helpers [`lib/peek-settle.ts`](../lib/peek-settle.ts) · wired into Image/TEST-003 · `bun test tests/peek-settle.test.ts` · [bun-peek](https://bun.com/docs/runtime/utils#bun-peek) |
| `Bun.nanoseconds` / `Bun.sleep` / `Bun.sleepSync` / `Bun.randomUUIDv7` / `Bun.version` / `Bun.revision` | high-res timing · sleep ms/`Date` · UUID v7 (+ timestamp decode) · runtime fingerprint | helpers [`lib/time.ts`](../lib/time.ts) · TEST-003 `evidenceId` / `elapsedMs` / `timing` / `runtime` · `bun test tests/time.test.ts` · [nanoseconds](https://bun.com/docs/runtime/utils#bun-nanoseconds) · [sleep](https://bun.com/docs/runtime/utils#bun-sleep) · [sleepSync](https://bun.com/docs/runtime/utils#bun-sleepsync) · [randomUUIDv7](https://bun.com/docs/runtime/utils#bun-randomuuidv7) · [version](https://bun.com/docs/runtime/utils#bun-version) · [revision](https://bun.com/docs/runtime/utils#bun-revision) |
| `Bun.Image` | decode / resize / encode · `metadata()` for evidence (dims, format, size, sha256) · TEST-003 remediation | helpers [`lib/image-metadata.ts`](../lib/image-metadata.ts) · [`lib/screenshot-remediation.ts`](../lib/screenshot-remediation.ts) · uses `awaitSettled` + `deepEquals` · `bun test tests/image-metadata.test.ts` · [input](https://bun.com/docs/runtime/image#input) · [metadata](https://bun.com/docs/runtime/image#metadata) · ship [1.3.14](https://bun.com/blog/bun-v1.3.14) |
| `Bun.$` / shell | tagged templates, `.cwd()`, `.nothrow()`, `.quiet()` | `bun test tests/fixtures/bun-shell/` · claim `bun-shell-boundaries` · [shell](https://bun.com/docs/runtime/shell) |
| `Bun.password` / `CryptoHasher` | password hash/verify · sha256/sha1 digests | `bun test tests/fixtures/security-hash/` · claim `security-hash-boundaries` · [hashing](https://bun.com/docs/runtime/hashing) |
| `Bun.stripANSI` / `stringWidth` | TTY width | `tests/bun-ansi-width.test.ts` — **no** npm `string-width` |
| `--console-depth` / `bun run -` | inspect depth for nested state · execute TS from stdin | [`lib/console-depth.ts`](../lib/console-depth.ts) · `ops:enhancements` · `ops:compliance:mock:pipe` · [console](https://bun.com/docs/runtime/console) · [bun run -](https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin) |
| `Bun.build` / macros / plugins | bundle-time code · inlined macros · `Bun.plugin` | Repo: [`lib/macros/`](../lib/macros/) · claim `macros-embed-boundaries` · `bun test tests/macros/embed-commit.test.ts` · [`bundler-nav.ts`](../lib/docs/bundler-nav.ts) · `bun tools/bun-doc-refs.ts bundler` · Bun: [bundler](https://bun.com/docs/bundler/index) · [macros](https://bun.com/docs/bundler/macros) · [plugins](https://bun.com/docs/bundler/plugins) |

### `Bun.cron`

Claim / evidence / owner: **[`docs/harness/cron.md`](./harness/cron.md)**. OS-persistent is primary; in-process is the complement. Spine daemon: `bun tools/bun-doc-refs.ts schedule` / `bun spine/scheduler.ts`.

## HTTP stacks (native vs Node compat)

Bun exposes **parallel** HTTP stacks. Prefer the native path in harness code; do not treat `fetch` as a wrapper around `node:http`.

| Stack | Role | Use | Docs |
|-------|------|-----|------|
| **Bun Native** | Client | `fetch()` / `Bun.fetch` | [networking/fetch](https://bun.com/docs/runtime/networking/fetch) |
| **Bun Native** | Server | `Bun.serve` | [http/server](https://bun.com/docs/runtime/http/server) |
| **Node Compat** | Client / Server | `node:http` / `node:https` | [node:http](https://nodejs.org/api/http.html) |

**Harness rule:** All code under `lib/`, `scripts/`, `tools/` must use the **Bun Native** stack. `node:http` / `node:https` is banned there ([`config/eslint/harness/bun-native.ts`](../config/eslint/harness/bun-native.ts); full `HARNESS_PATHS` also covers `packages/` · `server/` · `config/`). `projects/**` is exempt for intentional Node-compat demos.

Request logging: env `BUN_CONFIG_VERBOSE_FETCH` is the [debugger plane](https://bun.com/docs/runtime/debugger#print-fetch-nodehttp-requests-as-curl-commands) (`true` \| `curl` \| `false`; `1`/`0` aliases). Per-call `fetch(url, { verbose })` is the [fetch#debugging](https://bun.com/docs/runtime/networking/fetch#debugging) plane — see [`lib/bun-runtime-env.ts`](../lib/bun-runtime-env.ts) · `bun test tests/bun-runtime-env.test.ts`.

**Output shape:** Docs samples (UA Bun/1.3.3) prefix lines with `[fetch] $` / `[fetch] >` / `[fetch] <`. Bun 1.4 may omit the `[fetch]` tag (and the `$` before curl) while keeping the same substance (`curl --http…`, `HTTP/1.1…`, status). Harness smoke accepts both.

## Harness control plane

Workspace runtime knobs for gates / spawn chains (not install-machine SSOT). See [UNIFIED.md](./UNIFIED.md) matrix · [runtime CLI](https://bun.com/docs/runtime#cli-usage).

| Control | Where | Role |
|---------|--------|------|
| `[run] noOrphans = true` | root `bunfig.toml` | Kill descendants when Bun’s parent dies ([bunfig](https://bun.com/docs/runtime/bunfig#run-noorphans-dont-leave-orphan-processes-behind)); husky EXIT trap is belt-and-suspenders |
| `HARNESS_FRESH_RERUN_TIMEOUT_MS` | env (default `120000`) | Wall-clock kill in `runFreshRerunCommand` ([`lib/harness/maintenance.ts`](../lib/harness/maintenance.ts)) |
| `--smol` | `bun --smol run …` / `test:code-quality:smol` | Eager GC / slower heap growth in tight CI |
| `--console-depth` / `[console] depth` | CLI · bunfig · [`lib/console-depth.ts`](../lib/console-depth.ts) | Nested object inspect depth |
| `Bun.stdin` vs `bun run -` | complexity staged probe | Path lists use `Bun.stdin`; `bun run -` executes *code* from stdin |

### Three “lifecycle” concepts (do not conflate)

| Concept | Docs | Harness rule |
|---------|------|--------------|
| Process orphans | `run.noOrphans` | Enabled in workspace bunfig |
| Script `pre*` / `post*` | [runtime package.json scripts](https://bun.com/docs/runtime#run-a-package-json-script) | OK for `pretest`/`prelint`/`prebuild`; **never** on `check:harness-*` (steals stdin, inflates freshRerun) |
| Install lifecycle | [pm/lifecycle](https://bun.com/docs/pm/lifecycle) | `trustedDependencies` / root `postinstall` — separate trust boundary |

## Platform integration

| Concern | Owner |
|---------|--------|
| Install / pin | [UNIFIED.md](./UNIFIED.md) · `packageManager` bun@1.4.0 |
| Day-loop tests | `test:changed` · `test:parallel` · `test:isolate` · `test:shard` — [harness/day-loop.md](./harness/day-loop.md) · suggest `harness day-loop` |
| `bun run` CLI boundaries | claim `runtime-cli-boundaries` · `bun test tests/fixtures/runtime-cli/` · [runtime](https://bun.com/docs/runtime) |
| URLPattern routes + site URLs | claim `url-pattern-boundaries` · `bun test tests/bun-urlpattern.test.ts tests/bun-site-url.test.ts tests/factory-production.test.ts` · [URLPattern components](https://bun.com/blog/bun-v1.3.4#urlpattern-api) |
| Runtime environment controls | typed assessment [`lib/bun-runtime-env.ts`](../lib/bun-runtime-env.ts) → env hygiene + vault-autofill guard + value-free `portal-cli doctor --group runtime` · native `.env` / `env=false` / `[env].file=false` / explicit-file proof via `bun run portal:doctor:runtime:check` and the `--full` doctor gate · `--env-file` / `--no-env-file` in `config/runtime-flags.json` · [configuring Bun](https://bun.com/docs/runtime/environment-variables#configuring-bun) · [bunfig env](https://bun.com/docs/runtime/bunfig#env) |
| `HTMLRewriter` social metadata | claim `social-metadata-boundaries` · `bun test tests/fixtures/social-metadata/` · [extract-social-meta](https://bun.com/docs/guides/html-rewriter/extract-social-meta#extract-social-share-images-and-open-graph-tags) |
| Blog HTML extraction | claim `blog-extraction-boundaries` · `bun test tests/fixtures/blog-extraction/` · article body sans nav/footer |
| `fetch` / `Bun.fetch` | `fetchPage` helper ([`lib/docs/fetch-page.ts`](../lib/docs/fetch-page.ts)) · claim `fetch-page-boundaries` · `bun test tests/fixtures/fetch-page/` · call-site `dns.prefetch` OK; `fetch.preconnect` HTTPS still Invalid-port (use `bun --fetch-preconnect https://host:443` or [`lib/http/fetch-preconnect.ts`](../lib/http/fetch-preconnect.ts) for HTTP) · [fetch](https://bun.com/docs/runtime/networking/fetch#sending-an-http-request) · [preconnect at startup](https://bun.com/docs/runtime/networking/fetch#preconnect-at-startup) · [dns.prefetch](https://bun.com/docs/runtime/networking/dns#dns-prefetch) |
| `Bun.serve` | claim `bun-http-server-docs` · `bun test tests/bun-docs-catalog.test.ts` · `bun test tests/bun-serve-shape.test.ts` (docs/bun-types/runtime drift for port + protocol) · `bun test tests/bun-serve-lifecycle.test.ts` (methods + `idleTimeout` / TLS→protocol) · full page mapped (`routes` · port/hostname · unix · HTTP/3 · lifecycle · metrics) · [server](https://bun.com/docs/runtime/http/server#basic-setup) · [reference](https://bun.com/docs/runtime/http/server#reference) · [port](https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname) · shape [`lib/http/bun-serve-shape.ts`](../lib/http/bun-serve-shape.ts) · lifecycle [`lib/http/bun-serve-lifecycle.ts`](../lib/http/bun-serve-lifecycle.ts) · CLI `bun run brand:status:lifecycle` · bind tenant [`docs/harness/tenants/serve-public-bind.md`](harness/tenants/serve-public-bind.md) |
| Blog ingestion journey | claim `blog-extraction-journey` · `bun test tests/journey/blog-extraction.test.ts` · live `CANONICAL_SOURCES.blog` → URLPattern → `dns.prefetch` → fetchPage → SocialMetadata + streamed article |
| Harness spawn / orphans | this section · `bunfig.toml` `[run]` · `runFreshRerunCommand` |
| DX one-liners | `bun run dx:catalog` |
| Wire / brands | [WIRE_BOUNDARY.md](./WIRE_BOUNDARY.md) |

## Release maps

Upstream: [v1.3.12](https://bun.com/blog/bun-v1.3.12) · [v1.3.13](https://bun.com/blog/bun-v1.3.13) (`--isolate` · `--parallel` · `--shard` · `--changed` — curated TOC [bun-test-flags-1.3.13.md](./guides/bun-test-flags-1.3.13.md)). Day-loop wrappers: [harness/day-loop.md](./harness/day-loop.md). Pin **1.4.0** is a superset — do not re-document every bugfix bullet.

## References

`bun run dx:catalog` · `bun tools/bun-doc-refs.ts suggest "<api>"` · `bun run docs:refresh` · https://bun.com/docs/llms.txt

*Verified 2026-07-21 on Bun 1.4.0.*
