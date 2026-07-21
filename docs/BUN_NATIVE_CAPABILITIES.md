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
| `Bun.markdown.ansi` | terminal markdown (`AnsiTheme`) | `bun ./docs/harness/README.md` · `bun run docs:harness` · `bun run harness:status` · `tests/bun-markdown-ansi.test.ts` · [ansi](https://bun.com/docs/runtime/markdown#ansi-terminal-output) · ship [1.3.12](https://bun.com/blog/bun-v1.3.12) · helper `ansiMarkdown` in `lib/console-depth.ts` |
| `Bun.cron` | OS-persistent primary + in-process complement | [`docs/harness/cron.md`](./harness/cron.md) · `bun run test:cron` · `bun run test:cron-os` · [cron](https://bun.com/docs/runtime/cron) |
| `Bun.udpSocket` | UDP + ICMP/truncation | re-read when editing `lib/udp` |
| WebCrypto SHA3 / X25519 | hashing / key exchange | `tests/bun-crypto-webcrypto.test.ts` · `crypto.sha3` / `crypto.x25519` |
| `URLPattern` | URL routing (no `$N` leak) | `tests/bun-urlpattern.test.ts` |
| `Bun.Glob.scan` | tree walk; `**/X/...` boundary | `tests/bun-glob-scan.test.ts` |
| `Bun.$` / shell | tagged templates, `.cwd()`, `.nothrow()`, `.quiet()` | `bun test tests/fixtures/bun-shell/` · claim `bun-shell-boundaries` · [shell](https://bun.com/docs/runtime/shell) |
| `Bun.stripANSI` / `stringWidth` | TTY width | `tests/bun-ansi-width.test.ts` — **no** npm `string-width` |

### `Bun.cron`

Claim / evidence / owner: **[`docs/harness/cron.md`](./harness/cron.md)**. OS-persistent is primary; in-process is the complement. Spine daemon: `bun tools/bun-doc-refs.ts schedule` / `bun spine/scheduler.ts`.

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
| Day-loop tests | `test:changed` · `test:parallel` · `test:isolate` · `test:shard` — [harness/README.md](./harness/README.md) |
| `bun run` CLI boundaries | claim `runtime-cli-boundaries` · `bun test tests/fixtures/runtime-cli/` · [runtime](https://bun.com/docs/runtime) |
| Harness spawn / orphans | this section · `bunfig.toml` `[run]` · `runFreshRerunCommand` |
| DX one-liners | `bun run dx:catalog` |
| Wire / brands | [WIRE_BOUNDARY.md](./WIRE_BOUNDARY.md) |

## Release maps

Upstream: [v1.3.12](https://bun.com/blog/bun-v1.3.12) · [v1.3.13](https://bun.com/blog/bun-v1.3.13) (`--changed`). Pin **1.4.0** is a superset — do not re-document every bugfix bullet.

## References

`bun run dx:catalog` · `bun tools/bun-doc-refs.ts suggest "<api>"` · `bun run docs:refresh` · https://bun.com/docs/llms.txt

*Verified 2026-07-21 on Bun 1.4.0.*
