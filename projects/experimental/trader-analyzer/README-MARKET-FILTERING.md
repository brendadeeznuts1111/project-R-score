# Market Filtering & Pattern Integration

**Status**: ✅ **Implemented**

---

## Overview

Enhanced dashboard with multi-level filtering by team, market type, sub-market, and anomaly patterns, integrated with Telegram topics.

---

## Filter Hierarchy

```text
Team → Market Type → Sub-Market → Pattern → Confidence
```

### Filter Levels

1. **Team**: Sports Correlation, Market Analytics, Platform & Tools
2. **Market Type**: Moneyline, Spread, Over/Under, Props
3. **Sub-Market**: Premier League, NBA, Bundesliga, etc.
4. **Pattern**: Volume Spike, Odds Flip, Market Suspension, Correlation Chain
5. **Confidence**: Minimum confidence threshold (0.0 - 1.0)

---

## Quick Start

### Start Dashboard

```bash
cd apps/@registry-dashboard
bun run dev  # http://localhost:4000/dashboard
```

### Use Filters

1. **Select Team**: Click team tab
2. **Select Market Type**: Choose from dropdown
3. **Select Sub-Market**: Choose league/competition
4. **Select Pattern**: Choose anomaly pattern
5. **Set Confidence**: Adjust slider
6. **Apply**: Packages automatically filter

---

## Market Types

### Layer 2 Markets (`@graph/layer2`)

- **Moneyline**: Win/loss betting
- **Point Spread**: Point differential betting
- **Over/Under**: Total points/goals betting
- **Player Props**: Individual player statistics

### Layer 3 Sub-Markets (`@graph/layer3`)

**Soccer**:
- Premier League
- Bundesliga
- La Liga
- Champions League

**Basketball**:
- NBA
- EuroLeague

### Layer 4 Patterns (`@graph/layer4`)

- **Volume Spike**: Sudden increase in betting volume
- **Odds Flip**: Rapid odds reversal
- **Market Suspension**: Market temporarily closed
- **Correlation Chain**: Multi-sport correlation anomalies

---

## Package Metadata

Each package card includes filterable metadata:

```html
<div class="package-card" 
     data-package="@graph/layer4"
     data-market-types="moneyline,spread,over_under"
     data-sub-markets="soccer:premier_league,basketball:nba"
     data-patterns="volume_spike,correlation_chain">
```

---

## Telegram Integration

When filters are applied, notifications are sent to Telegram topics:

```text
🔍 Market Filters Applied

👥 Team: Sports
📊 Market: moneyline
🏆 Sub-Market: soccer:premier_league
📈 Pattern: volume_spike
🎯 Min Confidence: 70%

[View in Registry](https://registry.internal.yourcompany.com/dashboard)
```

---

## API Usage

```typescript
import { 
  getPackagesForMarketType,
  getPackagesForSubMarket,
  getPackagesForPattern,
  packageSupportsFilter 
} from '@graph/types/market';

// Filter by market type
const packages = getPackagesForMarketType('moneyline');
// Returns: ['@graph/layer2']

// Filter by sub-market
const packages = getPackagesForSubMarket('soccer', 'premier_league');
// Returns: ['@graph/layer3']

// Filter by pattern
const packages = getPackagesForPattern('volume_spike');
// Returns: ['@graph/layer4']

// Check if package supports filter
const supports = packageSupportsFilter('@graph/layer4', {
  marketType: 'moneyline',
  patternTypes: ['volume_spike'],
  minConfidence: 0.7
});
```

---

## Related Documentation

- [`docs/architecture/MARKET-FILTERING.md`](./docs/architecture/MARKET-FILTERING.md) - Complete filtering guide
- [`packages/@graph/types/src/market.ts`](./packages/@graph/types/src/market.ts) - Market type definitions
- [`apps/@registry-dashboard/src/components/market-filter.ts`](./apps/@registry-dashboard/src/components/market-filter.ts) - Filter component
- [`apps/@registry-dashboard/src/pages/dashboard.ts`](./apps/@registry-dashboard/src/pages/dashboard.ts) - Dashboard page

---

**Status**: ✅ **Market Filtering Ready** - Start dashboard with `cd apps/@registry-dashboard && bun run dev`
