# venues

Market **venue brand identity** for tennis / cross-market desk (not status semantics).

| Export | Role |
|--------|------|
| `MarketVenue` | `kalshi` · `polymarket` · `pinnacle` · `betfair` · `unknown` |
| `VENUE_BRAND` | Label, short code, border/text/bg hex |
| `parseMarketVenue` | Wire / alias → venue |
| `fmtVenueBadge` / `fmtVenueLegend` | ANSI desk output via `Bun.color` |

**Status tones** stay on portal theme: `--green` / `--yellow` / `--red` (ok / warn / bad).

**Portal:** `public/portal/venues.css` · `public/portal/components/venue-badge.js` · demo `/portal/tennis/`  
**Kalshi desk:** `Kalshi-bot/src/institutions/venue-badge.ts`

```bash
bun test tests/venue-brand.test.ts
bun -e 'import { fmtVenueLegend } from "./lib/venues/venue-brand.ts"; console.log(fmtVenueLegend())'
```
