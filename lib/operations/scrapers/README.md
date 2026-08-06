# Tier 4 book scrapers

CLI-owned limit scrape agents under `lib/operations/scrapers/`. Sink:
`artifacts/raw-limits/<bookId>.jsonl`.

## TOML SSOT

| File | Role |
| ---- | ---- |
| [`config/scrape-agents.toml`](../../../config/scrape-agents.toml) | Fleet defaults: jurisdiction, JSON/HTML timeouts, WebView viewport, cron |
| [`config/operators/<bookId>.toml`](../../../config/operators/) `[scrape]` | Per-book `agent_id`, `live_url`, `html`, `html_url`, `html_fixture` |

Loader: [`scrape-agents-config.ts`](./scrape-agents-config.ts) (parse-once). Env still wins for
`BASELINE_SCRAPE_CRON_SCHEDULE`, `BASELINE_SCRAPE_LIVE`, `OPERATOR_WEBVIEW_SCRAPE`, and
`<BOOK>_HTML_URL`.

## Commands (aliases unchanged)

```bash
bun run scrape:odds draftkings
bun run scrape:odds draftkings --html
bun run scrape:odds fanduel --html
bun run agent scrape odds --source draftkings --html
bun run baseline:scrape-draftkings
bun run baseline:scrape-fanduel
```

## HTML / WebView gates (DraftKings · FanDuel)

| Flag / env | Behavior |
| ---------- | -------- |
| `--html` (default) | Parse committed fixture `fixtures/<bookId>-limits.html` → `mode: html_fixture` |
| `--html` + `--live` | Short-lived `Bun.WebView` → `evaluate` HTML → same parser (`html_live`); empty/error → fixture fallback |
| `--html` + `OPERATOR_WEBVIEW_SCRAPE=1` | Same as live WebView path |
| `agent serve` | Never starts HTML/WebView scrape by default |

Shared capture: [`webview-html.ts`](./webview-html.ts). Shared synthetic selector parse:
[`fw-limit-html-parse.ts`](./fw-limit-html-parse.ts) (`[data-fw-limit]`). Screenshot PNG
evidence stays in `lib/operator-research/screenshot.ts` (not used for parse).

Other Tier 4 books keep `html_stub` fail-closed (`html = false` in operator TOML) until a later lane.

Do **not** enable live WebView in CI; fixture path keeps `bun test` green offline.
