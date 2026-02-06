# Dashboard Integration Guide

**Version**: 1.0.0  
**Last Updated**: 2025-01-27

---

## Overview

Complete integration guide for the enhanced registry dashboard with market filtering, pattern detection, and Telegram topic integration.

---

## Components

### 1. Market Filter Component

**Location**: `apps/@registry-dashboard/src/components/market-filter.ts`

Provides filtering by:
- Market type (Moneyline, Spread, Over/Under, Props)
- Sub-market (Premier League, NBA, etc.)
- Pattern (Volume Spike, Odds Flip, etc.)
- Confidence threshold

### 2. Team Filter Component

**Location**: `apps/@registry-dashboard/src/components/team-filter.ts`

Provides filtering by team:
- Sports Correlation
- Market Analytics
- Platform & Tools

### 3. Dashboard Page

**Location**: `apps/@registry-dashboard/src/pages/dashboard.ts`

Main dashboard with:
- Team tabs
- Market filters
- Package cards with metadata
- Telegram integration
- Benchmark triggers

---

## Usage

### Start Dashboard

```bash
cd apps/@registry-dashboard
bun run dev  # http://localhost:4000/dashboard
```

### Filter Workflow

1. **Select Team**: Click team tab
2. **Apply Market Filters**: Select market type, sub-market, pattern
3. **Set Confidence**: Adjust minimum confidence
4. **View Results**: Packages automatically filter

---

## Package Metadata

Each package card includes:

```html
<div class="package-card" 
     data-package="@graph/layer4"
     data-market-types="moneyline,spread,over_under"
     data-sub-markets="soccer:premier_league,basketball:nba"
     data-patterns="volume_spike,correlation_chain">
```

---

## Telegram Integration

### Topic Mapping

- `@graph/layer4` → Topic #1 (Sports Correlation)
- `@graph/layer3` → Topic #2 (Sports Correlation)
- `@graph/layer2` → Topic #3 (Market Analytics)
- `@graph/layer1` → Topic #4 (Market Analytics)
- `@graph/algorithms` → Topic #5 (Platform & Tools)

### Filter Notifications

When filters are applied, notifications are sent to the "releases" topic (#12):

```text
🔍 Market Filters Applied

👥 Team: Sports
📊 Market: moneyline
🏆 Sub-Market: soccer:premier_league
📈 Pattern: volume_spike
🎯 Min Confidence: 70%
```

---

## API Endpoints

### Dashboard

- `GET /dashboard` - Main dashboard page
- `POST /api/benchmark/run` - Trigger benchmark job

### Benchmark API

```typescript
POST /api/benchmark/run
Content-Type: application/json

{
  "package": "@graph/layer4"
}

Response:
{
  "success": true,
  "jobId": "bench-1234567890",
  "message": "Benchmark queued for @graph/layer4"
}
```

---

## Related Documentation

- [`docs/architecture/MARKET-FILTERING.md`](./MARKET-FILTERING.md) - Market filtering guide
- [`packages/@graph/types/src/market.ts`](../../packages/@graph/types/src/market.ts) - Market types
- [`apps/@registry-dashboard/src/components/market-filter.ts`](../../apps/@registry-dashboard/src/components/market-filter.ts) - Filter component

---

**Status**: ✅ **Dashboard Integrated** - Ready for use
