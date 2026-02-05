# Tier-1380 hardened RSS reader recommendations

## Checklist (implemented in `mcp-bun-docs/rss.ts`)

| Recommendation | Implementation |
|----------------|----------------|
| Always set User-Agent header | `headers: { "User-Agent": "Tier-1380 RSS Reader/1.0" }` |
| Use `signal: AbortSignal.timeout(10000)` on fetch | `ParseRSSOptions.timeoutMs` (default 10s) |
| Wrap parsing in try/catch + parsererror check | `PARSERERROR_RE` + `parseFeedFromText` in try/catch |
| Escape all displayed content with `Bun.escapeHTML` | Caller responsibility; example uses `escape()` helper |
| Enforce Col-89 on every rendered line | `Bun.stringWidth` + `Bun.wrapAnsi`; example uses `wrapToCol89()` |
| Consider caching (Bun.file or Redis) with ETag / If-Modified-Since | `parseRSS(url, { cacheDir })` — file cache with ETag, If-Modified-Since |
| Log feed fetch time + size + parse time for audit | `parseRSS(..., { onAudit })`; `RSSFeedResult.audit`: `fetchTimeMs`, `sizeBytes`, `parseTimeMs` |

## Usage

```ts
import { parseRSS } from "mcp-bun-docs/rss.ts";
import { COL89_MAX } from "mcp-bun-docs/lib.ts";

// Hardened parse with audit log
const { feed, audit } = await parseRSS("https://bun.com/rss.xml", {
  timeoutMs: 10_000,
  onAudit: (a) => console.error(`[audit] fetch ${a.fetchTimeMs}ms size ${a.sizeBytes} parse ${a.parseTimeMs}ms`),
});

// Optional file cache (ETag / If-Modified-Since)
const { feed, audit } = await parseRSS("https://bun.com/rss.xml", {
  cacheDir: "/tmp/rss-cache",
  cacheKey: "bun-changelog",
});

// Display: escape + Col-89
feed.items.slice(0, 3).forEach((item) => {
  const line = `${item.pubDate?.slice(0, 10) ?? ""}  ${Bun.escapeHTML(item.title)}`;
  const w = Bun.stringWidth(line, { countAnsiEscapeCodes: false });
  console.log(w <= COL89_MAX ? line : Bun.wrapAnsi(line, COL89_MAX));
});
```

## Legacy API

`parseRSSLegacy(url)` returns only `RSSFeed` (no audit). Uses the same hardened fetch + parse internally.
