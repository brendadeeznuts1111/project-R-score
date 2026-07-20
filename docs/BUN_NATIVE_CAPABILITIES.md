# Bun native capabilities (platform note)

Grounded map of **newer Bun runtime APIs** available on this machine’s toolchain, how they relate to FactoryWager **lib / tools / docs**, and where **not** to over-claim.

| | |
| --- | --- |
| **Verified runtime** | Bun **1.4.0** (`bun --version`) — `typeof Bun.WebView/cron/udpSocket === "function"`; `Bun.markdown` keys: `html`, `ansi`, `render`, `react` |
| **Canonical refs** | `tools/bun-doc-refs.ts` `CANONICAL_REFS` — use `bun tools/bun-doc-refs.ts suggest "…"` before coding |
| **Not SSOT for product desk** | Partner desk UI, Telegram alerts, balance-sheet product flows — map only if a concrete package owns them |

---

## Table of contents

1. [Bun.WebView](#bunwebview)
2. [Bun.markdown.ansi](#bunmarkdownansi)
3. [Bun.cron](#buncron)
4. [Bun.udpSocket](#bunudpsocket)
5. [Platform integration map](#platform-integration-map)
6. [References](#references)

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

## References

| Resource | URL |
|----------|-----|
| WebView | https://bun.com/docs/runtime/webview |
| Markdown | https://bun.com/docs/runtime/markdown |
| Cron | https://bun.com/docs/runtime/cron |
| UDP | https://bun.com/docs/runtime/networking/udp |
| bun-doc-refs | `bun tools/bun-doc-refs.ts suggest "Bun.WebView"` |
| Wire boundary | [WIRE_BOUNDARY.md](./WIRE_BOUNDARY.md) |
| Install policy | [UNIFIED.md](./UNIFIED.md) |
| Docs index | [README.md](./README.md) |

*Last verified: 2026-07-20 against local Bun 1.4.0 and bun.com/docs/llms.txt index.*
