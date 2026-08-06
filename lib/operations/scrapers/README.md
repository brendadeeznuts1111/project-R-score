# Tier 4 book scrapers

CLI-owned limit scrape agents under `lib/operations/scrapers/`. Sink:
`artifacts/raw-limits/<bookId>.jsonl`.

## Commands (aliases unchanged)

```bash
bun run scrape:odds draftkings
bun run scrape:odds draftkings --html
bun run agent scrape odds --source draftkings --html
bun run baseline:scrape-draftkings
```

## DraftKings HTML / WebView gates

| Flag / env | Behavior |
| ---------- | -------- |
| `--html` (default) | Parse committed fixture `fixtures/draftkings-limits.html` → `mode: html_fixture` |
| `--html` + `--live` | Short-lived `Bun.WebView` → `evaluate` HTML → same parser (`html_live`); empty/error → fixture fallback |
| `--html` + `OPERATOR_WEBVIEW_SCRAPE=1` | Same as live WebView path |
| `agent serve` | Never starts HTML/WebView scrape by default |

Shared capture: [`webview-html.ts`](./webview-html.ts). Screenshot PNG evidence stays in
`lib/operator-research/screenshot.ts` (not used for parse).

Do **not** enable live WebView in CI; fixture path keeps `bun test` green offline.
