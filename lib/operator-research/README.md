# Operator research

Research-domain helpers for bookmaker discovery, live odds monitoring, and
portal agent-odds surfaces. HTTP ingress and static delivery remain under
`tools/` and `public/portal/`.

| Module                                                      | Role                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [`edge-engine.ts`](./edge-engine.ts)                        | Portal agent-odds uncovered edges: arb/value/steam, Kelly, latency (brands)    |
| [`odds/`](./odds/)                                          | Live odds pipeline + **depth**: multi-leg arb, value vs sharp, steam velocity, `edge-scan` |
| [`odds/scheduler.ts`](./odds/scheduler.ts)                  | In-process `Bun.cron` odds monitor (1.3.12+)                                   |
| [`desk-jobs.ts`](./desk-jobs.ts)                            | `GET /api/system/jobs` snapshot for `agent serve`                              |
| [`registry-desk.ts`](./registry-desk.ts)                    | Registry browse/publish (snapshot · optional live packument · CSRF publish)    |
| [`matching/`](./matching/)                                  | Cross-book matching, line movement, arbitrage, alerts                          |
| [`normalization/`](./normalization/)                        | Odds format conversion, team/market seed store                                 |
| [`doctor.ts`](./doctor.ts) · [`platform.ts`](./platform.ts) | Runtime/capability checks (`Bun.WebView` via `await using`)                    |

Event, edge, rule, sportsbook, and host identities use brands from
[`../types/branded.ts`](../types/branded.ts).

## Bun 1.3.12 map (desk)

| Feature                                | Owner here                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| In-process `Bun.cron`                  | `odds/scheduler.ts` · optional on `agent serve --monitor`                                              |
| `Bun.markdown.ansi` / `.html`          | CLI `registry-readme` · detail API `readmeHtml` via [`../factory/markdown.ts`](../factory/markdown.ts) |
| `Bun.WebView`                          | `doctor.ts` / `screenshot.ts` (PNG evidence) · Tier 4 HTML via [`../operations/scrapers/webview-html.ts`](../operations/scrapers/webview-html.ts) |
| TCP_DEFER_ACCEPT / async native stacks | Free at runtime — no desk code                                                                         |
| Publish `readme` metadata              | Bun **1.3.14** + ingest — not a 1.3.12 feature                                                         |

Do **not** wrap the odds SQLite singleton (`openOddsDb`) in `using` — it is
process-lived.

```bash
bun test tests/edge-engine.test.ts
bun test tests/operator-odds-pipeline.test.ts
bun test tests/operator-research-desk-jobs.test.ts
bun run agent detect-edges --host hardrock.bet --seed-fixtures
bun run agent monitor-odds --once --hosts hardrock.bet
bun run scrape:odds bet365
bun run agent scrape odds --source bet365
# DraftKings / FanDuel HTML: fixture parse by default (CI-safe)
bun run scrape:odds draftkings --html
bun run scrape:odds fanduel --html
# Opt-in live WebView HTML (never default on agent serve):
#   bun run scrape:odds fanduel --html --live
#   OPERATOR_WEBVIEW_SCRAPE=1 bun run scrape:odds draftkings --html
bun run agent serve --port 8790
# optional Bun.cron monitor (or OPERATOR_ODDS_MONITOR=1):
bun run agent serve --monitor
bun run agent registry-readme event-store --version 1.0.0
bun tools/branded-id-check.ts --strict lib/operator-research
```

**HTML / WebView scrape gates** (Tier 4 DraftKings · FanDuel): `--html` alone reads the
committed fixture under `lib/operations/scrapers/fixtures/` (`mode: html_fixture`).
Live capture requires `--html` **and** (`--live` or `OPERATOR_WEBVIEW_SCRAPE=1`) →
short-lived `await using Bun.WebView` in
[`lib/operations/scrapers/webview-html.ts`](../operations/scrapers/webview-html.ts).
`agent serve` does **not** start scrapes by default. Details:
[`lib/operations/scrapers/README.md`](../operations/scrapers/README.md).

CLI: [`tools/operator-agent.ts`](../../tools/operator-agent.ts)
(`bun run agent …`). Portal dashboard serve (separate):
`bun run agent:odds-dashboard`. Desk jobs:
`GET http://127.0.0.1:8790/api/system/jobs`.
