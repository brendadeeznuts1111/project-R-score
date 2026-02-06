# Market Filtering & Pattern Integration

**Version**: 1.0.0  
**Last Updated**: 2025-01-27

---

## Overview

The enhanced dashboard provides multi-level filtering by team, market type, sub-market, and anomaly patterns, integrated with Telegram topics for real-time collaboration.

---

## Filter Hierarchy

```text
Team → Market Type → Sub-Market → Pattern → Confidence
```

### Filter Levels

1. **Team Filter**: Filter by team (Sports Correlation, Market Analytics, Platform & Tools)
2. **Market Type**: Moneyline, Spread, Over/Under, Props
3. **Sub-Market**: Premier League, NBA, Bundesliga, etc.
4. **Pattern**: Volume Spike, Odds Flip, Market Suspension, Correlation Chain
5. **Confidence**: Minimum confidence threshold (0.0 - 1.0)

---

## Market Types

### Layer 2 Markets

- **Moneyline**: Win/loss betting
- **Point Spread**: Point differential betting
- **Over/Under**: Total points/goals betting
- **Player Props**: Individual player statistics

**Packages**: `@graph/layer2`

### Layer 3 Sub-Markets

**Soccer**:
- Premier League
- Bundesliga
- La Liga
- Champions League

**Basketball**:
- NBA
- EuroLeague

**Packages**: `@graph/layer3`

### Layer 4 Patterns

- **Volume Spike**: Sudden increase in betting volume
- **Odds Flip**: Rapid odds reversal
- **Market Suspension**: Market temporarily closed
- **Correlation Chain**: Multi-sport correlation anomalies

**Packages**: `@graph/layer4`

---

## Usage

### Filtering Packages

```typescript
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

### Dashboard Filtering

1. **Select Team**: Click team tab (Sports, Markets, Platform)
2. **Select Market Type**: Choose from dropdown (Moneyline, Spread, etc.)
3. **Select Sub-Market**: Choose league/competition
4. **Select Pattern**: Choose anomaly pattern type
5. **Set Confidence**: Adjust minimum confidence threshold
6. **Apply**: Packages automatically filter based on selections

---

## Package Metadata

Each package card includes metadata:

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

## Related Documentation

- [`packages/@graph/types/src/market.ts`](../../packages/@graph/types/src/market.ts) - Market type definitions
- [`apps/@registry-dashboard/src/components/market-filter.ts`](../../apps/@registry-dashboard/src/components/market-filter.ts) - Filter component
- [`apps/@registry-dashboard/src/pages/dashboard.ts`](../../apps/@registry-dashboard/src/pages/dashboard.ts) - Dashboard page

---

**Status**: ✅ **Market Filtering Implemented** - Ready for use
