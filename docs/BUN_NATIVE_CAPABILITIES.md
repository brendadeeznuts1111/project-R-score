# Bun native capabilities (platform note)

Grounded map of **newer Bun runtime APIs** available on this machine’s toolchain, how they relate to FactoryWager **lib / tools / docs**, and where **not** to over-claim.

| | |
| --- | --- |
| **Verified runtime** | Bun **1.4.0** (`bun --version`) — `typeof Bun.WebView/cron/udpSocket === "function"`; `Bun.markdown` keys: `html`, `ansi`, `render`, `react` |
| **Canonical refs** | `tools/bun-doc-refs.ts` `CANONICAL_REFS` + catalog — use `bun tools/bun-doc-refs.ts suggest "…"` (catalog-first) before coding · operate: [BUN_DOCS_OPERATE.md](BUN_DOCS_OPERATE.md) |
| **Not SSOT for product desk** | Partner desk UI, Telegram alerts, balance-sheet product flows — map only if a concrete package owns them |

---

## Table of contents

1. [Bun.WebView](#bunwebview)
2. [Bun.markdown.ansi](#bunmarkdownansi)
3. [Bun.cron](#buncron)
4. [Bun.udpSocket](#bunudpsocket)
5. [WebCrypto SHA3 + X25519](#webcrypto-sha3--x25519)
6. [Bun v1.3.12 release map](#bun-v1312-release-map)
7. [Bun v1.3.13 release map](#bun-v1313-release-map)
8. [Platform integration map](#platform-integration-map)
9. [References](#references)

---

## Bun.WebView

**What it is:** Built-in headless browser control for automation, testing, and scraping.

| Fact | Detail |
|------|--------|
| Canonical doc | [bun.com/docs/runtime/webview](https://bun.com/docs/runtime/webview) |
| Runtime | `Bun.WebView` constructor present (1.4.0) |
| Prototype (verified) | `navigate`, `evaluate`, `screenshot`, `cdp`, `click`, `type`, `press`, `scroll`, `scrollTo`, `resize`, `goBack`, `goForward`, `reload`, `close`, `url`, `title`, `loading`, … |
| Backends (docs) | WebKit on macOS (zero deps); Chrome via CDP elsewhere |

**Minimal pattern** (prefer `await using` when disposing):

```ts
// @see https://bun.com/docs/runtime/webview
await using view = new Bun.WebView({ width: 800, height: 600 });
await view.navigate("https://bun.sh");
await view.click("a[href='/docs']");
const title = await view.evaluate("document.title");
const png = await view.screenshot({ format: "jpeg", quality: 90 });
await Bun.write("page.jpg", png);
```

**Platform fit (lib / root — not product-specific):**

| Use | Where |
|-----|--------|
| Smoke public static UIs | `public/`, registry viewer, dashboard HTML under monorepo spine |
| Validate scrapers / HTMLRewriter | Scripts under `tools/` / `scripts/` that fetch live pages |
| CI screenshots | Optional job: compile a small script, no Playwright dep required **if** runner has a backend |

**Do not assume:** removing Puppeteer/Playwright from every nested `package.json` under `projects/active/**` — those trees are out of scope for this note.

---

## Bun.markdown.ansi

**What it is:** Markdown → ANSI for the terminal (GFM-oriented built-in parser). Related: `Bun.markdown.html`, `render`, `react`.

| Fact | Detail |
|------|--------|
| Canonical doc | [bun.com/docs/runtime/markdown](https://bun.com/docs/runtime/markdown) |
| Runtime | `typeof Bun.markdown.ansi === "function"` (verified) |
| CLI | `bun ./file.md` can print formatted Markdown without a full app bootstrap (docs) |

**Minimal pattern:**

```ts
// @see https://bun.com/docs/runtime/markdown
console.info(
  Bun.markdown.ansi(
    `# Harness report\n\n- **Hits:** ${n}\n\n[Wire boundary](./WIRE_BOUNDARY.md)`,
    { hyperlinks: true }
  )
);
```

**Platform fit:**

| Use | Where |
|-----|--------|
| CLI help / status | `tools/harness-violations.ts`, `tools/doc-map-check.ts`, brand catalog CLI |
| Install / audit summaries | Future polish for `install:verify` / `bverify` human output |
| Docs preview | Agent/operator viewing SSOT Markdown in terminal |

Prefer this over ad-hoc chalk string assembly for **tooling** output. Keep product CLIs free to choose their own TUI later.

---

## Bun.cron

**What it is:** In-process cron scheduler (UTC schedules, no-overlap after handler settles, `--hot` aware, disposable / ref-unref).

| Fact | Detail |
|------|--------|
| Canonical doc | [bun.com/docs/runtime/cron](https://bun.com/docs/runtime/cron) |
| Runtime | `typeof Bun.cron === "function"` (verified) |
| Already in tree | `lib/r2/*` lifecycle/sync/analytics/backup; `tools/bun-doc-refs.ts schedule` |

**Minimal pattern:**

```ts
// @see https://bun.com/docs/runtime/cron
const job = Bun.cron("*/10 * * * *", async () => {
  // work — next fire waits until this settles
});
// job.stop(); job.unref();
```

**Platform fit:**

| Use | Where |
|-----|--------|
| Weekly Bun docs integrity | `bun tools/bun-doc-refs.ts schedule` |
| R2 maintenance sweeps | Existing `lib/r2/*` (already gated with `typeof Bun.cron === "function"`) |
| Doc-map / hygiene on a schedule | Optional local daemon — not required in GHA (use workflow cron) |

**CI note:** GitHub Actions should keep **workflow** schedules for install/cache; use `Bun.cron` for **long-lived local/server processes**, not one-shot CI jobs.

---

## Bun.udpSocket

**What it is:** UDP API with improved error survival and truncation flags (docs: ICMP errors no longer tear down the socket; `data` callback can surface truncation).

| Fact | Detail |
|------|--------|
| Canonical doc | [bun.com/docs/runtime/networking/udp](https://bun.com/docs/runtime/networking/udp) |
| Runtime | `typeof Bun.udpSocket === "function"` (verified) |
| Lib surface | [`lib/udp/`](../lib/udp/) (`udp-realtime-service`, types, multicast helpers) |

**Platform fit:** realtime / probe paths under `lib/udp` — review handlers for `error` continuity and truncation when touching that code. No claim here about phone/gate products outside the monorepo spine.

---

## Platform integration map

| Bun API | Integrate into (platform) | Replaces / enhances |
|---------|---------------------------|---------------------|
| **WebView** | Optional smoke scripts for monorepo dashboards / static UIs | Heavy browser deps for simple headless checks |
| **markdown.ansi** | Root tooling CLI output (`tools/*`) | Manual ANSI string concat |
| **cron** | Long-lived servers, R2 jobs, `bun-doc-refs schedule` | External cron for in-process work only |
| **udpSocket** | `lib/udp/*` | More robust datagram error handling |

### Suggested next steps (docs / lib only)

1. **Refs:** keep `CANONICAL_REFS` current (`WebView`, `udpSocket`, `markdown.ansi` added).
2. **Tooling UX:** optionally render `harness-violations` / `doc-map-check` summaries with `Bun.markdown.ansi` (no product deps).
3. **WebView:** add a small **examples/** smoke under monorepo spine when needed — not nested product apps.
4. **cron:** prefer existing R2 + doc-refs patterns; document UTC + no-overlap before adding more jobs.
5. **UDP:** when editing `lib/udp`, re-read truncation / error docs and add `@see` refs.

---

## WebCrypto SHA3 + X25519

**Verified on Bun 1.4.0** (also `Bun.CryptoHasher('sha3-256')`).

| Surface | Algorithms / APIs |
|---------|-------------------|
| `node:crypto` | `createHash` / `createHmac` / `getHashes` — `sha3-224` … `sha3-512` |
| `crypto.subtle` | `digest("SHA3-256")`, HMAC sign/verify; `deriveBits` with **X25519** (32-byte secret; `null` length → full output) |
| Prefer for new crypto hashes | `new Bun.CryptoHasher("sha3-256")` over Node `createHash` when staying Bun-first |
| Non-crypto fingerprints | `Bun.hash` (wyhash) — **not** a SHA3 substitute |

Smoke: `bun test tests/bun-crypto-webcrypto.test.ts`. DX: `bun run dx:catalog crypto.sha3` · `bun run dx:catalog crypto.x25519`.

**Related (runtime, not spine-tested here):** `ws+unix://` / `wss+unix://` WebSocket URLs; BoringSSL ML-KEM/ML-DSA present for future PQ — do not claim app support until we call those APIs.

**Do not:** silently retarget existing `sha256` digests in `lib/security/**` — persisted hashes / HMACs break.

---

## Bun v1.3.12 release map

Upstream SSOT: [bun.com/blog/bun-v1.3.12](https://bun.com/blog/bun-v1.3.12) — page entry [title → `bun upgrade`](https://bun.com/blog/bun-v1.3.12#to-upgrade-bun) (before [WebView](https://bun.com/blog/bun-v1.3.12#bun-webview-headless-browser-automation)), through [Bugfixes](https://bun.com/blog/bun-v1.3.12#bugfixes) → [contributors](https://bun.com/blog/bun-v1.3.12#thanks-to-8-contributors). Runtime here: **1.4.0** (superset). Detailed API notes for WebView / markdown / cron / UDP are the sections above this map.

| Blog section | Homebase status |
|--------------|-----------------|
| [Install / `bun upgrade`](https://bun.com/blog/bun-v1.3.12#to-upgrade-bun) | Machine plane — [UNIFIED.md](./UNIFIED.md) · `bun upgrade` |
| [`Bun.WebView`](https://bun.com/blog/bun-v1.3.12#bun-webview-headless-browser-automation) | Documented above · runtime verified · optional spine smoke when needed |
| [`bun ./file.md` / markdown terminal](https://bun.com/blog/bun-v1.3.12#render-markdown-in-the-terminal-with-bun-file-md) | `Bun.markdown.ansi` section above · harness report UX candidate |
| [Async stack traces for native errors](https://bun.com/blog/bun-v1.3.12#async-stack-traces-for-native-errors) | Runtime inherit · no homebase script |
| [`Bun.cron()`](https://bun.com/blog/bun-v1.3.12#in-process-bun-cron-scheduler) | Documented above · used by docs operate / R2 patterns |
| [UDP ICMP / truncation](https://bun.com/blog/bun-v1.3.12#udp-socket-icmp-error-handling-and-truncation-detection) | Documented above · re-read when editing `lib/udp` |
| [Unix domain socket lifecycle ↔ Node](https://bun.com/blog/bun-v1.3.12#unix-domain-socket-lifecycle-now-matches-node-js) | Runtime inherit · prefer Bun.serve / native sockets in new code |
| JSC: `using` / `await using`, JIT, Wasm, spec, libpas | Prefer `await using` for WebView / resources · rest inherit |
| [Improved standalone Linux executables](https://bun.com/blog/bun-v1.3.12#improved-standalone-executables-on-linux) | Runtime inherit · `--compile` portability |
| [URLPattern up to 2.3× faster](https://bun.com/blog/bun-v1.3.12#urlpattern-is-up-to-2-3x-faster) | Runtime inherit · `test()` / `exec()`; **no longer** pollutes `RegExp.lastMatch` / `RegExp.$N` (was a leak from internal regex). Prefer for route match (`tools/server.ts`) |
| [Faster `Bun.stripANSI` / `Bun.stringWidth`](https://bun.com/blog/bun-v1.3.12#faster-bun-stripansi-and-bun-stringwidth) | Wired: [`lib/console-depth.ts`](../lib/console-depth.ts) · CANONICAL_REFS `Bun.stringWidth` / `Bun.stripANSI` |
| [Faster `bun build` on low-core machines](https://bun.com/blog/bun-v1.3.12#faster-bun-build-on-low-core-machines) | Runtime inherit (thread-pool fix) |
| [Faster `Bun.Glob.scan()`](https://bun.com/blog/bun-v1.3.12#faster-bun-glob-scan) | Runtime inherit · used by docs/search tooling (`**/…` boundary) |
| [Cgroup-aware `availableParallelism`](https://bun.com/blog/bun-v1.3.12#cgroup-aware-availableparallelism-hardwareconcurrency-on-linux) | Runtime inherit on Linux hosts / containers |
| [HTTPS proxy CONNECT keep-alive](https://bun.com/blog/bun-v1.3.12#keep-alive-for-https-proxy-connect-tunnels) | Runtime inherit · `fetch({ proxy })` tunnel reuse |
| [`TCP_DEFER_ACCEPT` for `Bun.serve()` (Linux)](https://bun.com/blog/bun-v1.3.12#tcp-defer-accept-for-bun-serve-on-linux) | Runtime inherit · `Bun.listen` / `net.createServer` unchanged |
| [Bugfixes](https://bun.com/blog/bun-v1.3.12#bugfixes) → [Node](https://bun.com/blog/bun-v1.3.12#node-js-compatibility-improvements) · [Bun APIs](https://bun.com/blog/bun-v1.3.12#bun-apis) · [Web](https://bun.com/blog/bun-v1.3.12#web-apis) · [bundler](https://bun.com/blog/bun-v1.3.12#javascript-bundler) · [test](https://bun.com/blog/bun-v1.3.12#bun-test) · [Shell](https://bun.com/blog/bun-v1.3.12#bun-shell) · [Windows](https://bun.com/blog/bun-v1.3.12#windows) → [contributors](https://bun.com/blog/bun-v1.3.12#thanks-to-8-contributors) | Inherit by running Bun ≥1.3.12 · **do not** re-document each bullet |

---

## Bun v1.3.13 release map

Upstream SSOT (full TOC → Internal / Runtime): [bun.com/blog/bun-v1.3.13](https://bun.com/blog/bun-v1.3.13) · deep link [bun-test-changed](https://bun.com/blog/bun-v1.3.13#bun-test-changed). Runtime here: **1.4.0** (superset).

| Blog section | Homebase status |
|--------------|-----------------|
| [`bun test --isolate` / `--parallel`](https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel) | Wired: `test:isolate`, `test:parallel` · day-loop in [harness README](./harness/README.md) |
| [`--shard=M/N`](https://bun.com/blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs) | Wired: `SHARD=M/N bun run test:shard` · **no** GHA matrix yet |
| [`--changed`](https://bun.com/blog/bun-v1.3.13#bun-test-changed) | Wired: [`scripts/bun-test-changed.ts`](../scripts/bun-test-changed.ts) → `test:changed` / `test:changed:watch` / `-- <ref>` |
| `bun install` stream / isolated linker / source maps / JSC / zlib-ng | Machine/install plane — [UNIFIED.md](./UNIFIED.md); no extra homebase scripts |
| SHA3 + X25519 | Wired: section above · `tests/bun-crypto-webcrypto.test.ts` · DX `crypto.sha3` / `crypto.x25519` |
| `ws+unix://` / `wss+unix://` | Available on runtime · **not** spine-tested |
| Standalone HTML file-loader inline | Available · use when `--compile --target browser` on HTML entry |
| `bunx claude` alias | Runtime install fix · no repo change |
| Bugfixes (Node / Bun APIs / Web / install / bundler / CSS / test / Windows / JSC / Internal) | Inherit by running Bun ≥1.3.13 · do not re-document each bullet |

Day-loop proof for the test flags: `bun run test:changed` · `bun run test:parallel`. Crypto: `bun test tests/bun-crypto-webcrypto.test.ts`.

---

## References

| Resource | URL |
|----------|-----|
| Bun v1.3.12 blog | https://bun.com/blog/bun-v1.3.12 |
| Bun v1.3.12 install | https://bun.com/blog/bun-v1.3.12#to-install-bun |
| Bun v1.3.12 upgrade | https://bun.com/blog/bun-v1.3.12#to-upgrade-bun |
| Bun v1.3.12 Bugfixes | https://bun.com/blog/bun-v1.3.12#bugfixes |
| Bun v1.3.13 blog | https://bun.com/blog/bun-v1.3.13 |
| WebView | https://bun.com/docs/runtime/webview |
| Markdown | https://bun.com/docs/runtime/markdown |
| Cron | https://bun.com/docs/runtime/cron |
| UDP | https://bun.com/docs/runtime/networking/udp |
| Hashing | https://bun.com/docs/runtime/hashing |
| Web Crypto | https://bun.com/docs/runtime/web-crypto |
| bun-doc-refs | `bun tools/bun-doc-refs.ts suggest "Bun.WebView"` (catalog-first) |
| docs:refresh | `bun run docs:refresh` — RSS → scrape → catalog → integrity ([BUN_DOCS_OPERATE.md](BUN_DOCS_OPERATE.md)) |
| Wire boundary | [WIRE_BOUNDARY.md](./WIRE_BOUNDARY.md) |
| Install policy | [UNIFIED.md](./UNIFIED.md) |
| Docs index | [README.md](./README.md) |

*Last verified: 2026-07-21 against local Bun 1.4.0 (SHA3 + X25519 smoke; v1.3.12 + v1.3.13 release maps).*
