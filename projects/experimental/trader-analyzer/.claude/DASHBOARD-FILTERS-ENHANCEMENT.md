# Dashboard Filters Enhancement Plan

**Adding comprehensive filtering capabilities for all available data dimensions.**

---

## 📊 Current State vs Missing Filters

### ✅ Currently Available (API Level)
- **Sport**: `OrcaSport` enum - Available in ORCA streaming
- **Market Type**: `OrcaMarketType` - Available in ORCA
- **Region**: Country in sport definitions - Partial
- **Time**: Timestamps, date ranges - Available
- **Category**: `MarketCategory` - Available in API (`/arbitrage/opportunities?category=`)
- **Venue**: Venue types - Available in API
- **Spread**: Available in API (`/arbitrage/opportunities?minSpread=`)
- **Liquidity**: Available in scanner config
- **Bookmaker**: `OrcaBookmaker` - Available in ORCA
- **League**: League taxonomy - Available
- **Team**: Team aliases - Available
- **Event**: Event IDs - Available
- **Period**: Period tags - Available
- **Status**: Status tags - Available
- **Symbol**: Trading pairs - Available in streams

### ❌ Missing from Dashboard
1. **Bookmaker Filter** - Filter opportunities by bookmaker
2. **League Filter** - Filter by league
3. **Team Filter** - Filter by team
4. **Event Filter** - Filter by specific event
5. **Period Filter** - Filter by game period
6. **Status Filter** - Filter by market status
7. **Category Filter** - Filter by category (API supports, dashboard doesn't)
8. **Venue Filter** - Filter by venue type
9. **Liquidity Filter** - Filter by minimum liquidity
10. **Spread Range Filter** - Filter by spread range (API supports min, needs max)
11. **Confidence Filter** - Filter by match confidence
12. **Gender Filter** - Filter by gender
13. **Bet Type Filter** - Filter by bet type
14. **Exchange Filter** - Filter crypto trades by exchange
15. **Symbol Filter** - Filter streams by trading pair
16. **Time Range Selector** - Custom date/time range
17. **Profitability Filter** - Filter by P&L
18. **Execution Status Filter** - Filter by execution success/failure

---

## 🎯 Implementation Plan

### Phase 1: Core Filters (High Priority)

#### 1. Category Filter
**API**: Already supports `?category=crypto|politics|sports|economics`  
**Dashboard**: Add filter dropdown/buttons  
**Impact**: Filter prediction markets by category

#### 2. Venue Filter
**API**: Supports venue filtering in scanner config  
**Dashboard**: Add venue selector  
**Impact**: Compare opportunities across venues

#### 3. Spread Range Filter
**API**: Supports `?minSpread=0.02`  
**Dashboard**: Add min/max spread inputs  
**Impact**: Filter by profitability threshold

#### 4. Liquidity Filter
**API**: Supports `minLiquidity` in config  
**Dashboard**: Add liquidity threshold input  
**Impact**: Filter by tradeable size

#### 5. Time Range Selector
**API**: Supports date ranges in streams  
**Dashboard**: Add date picker  
**Impact**: Filter by custom time ranges

---

### Phase 2: Sports Betting Filters (Medium Priority)

#### 6. Sport Filter
**API**: ORCA supports sport filtering  
**Dashboard**: Add sport selector  
**Impact**: Filter by sport (NFL, NBA, etc.)

#### 7. Market Type Filter
**API**: ORCA supports market type filtering  
**Dashboard**: Add market type selector  
**Impact**: Filter by moneyline, spread, total, etc.

#### 8. Bookmaker Filter
**API**: ORCA supports bookmaker filtering  
**Dashboard**: Add bookmaker selector  
**Impact**: Compare odds across bookmakers

#### 9. League Filter
**API**: League taxonomy available  
**Dashboard**: Add league selector  
**Impact**: Filter by league (NBA, NFL, EPL, etc.)

#### 10. Status Filter
**API**: Status tags available  
**Dashboard**: Add status selector  
**Impact**: Filter live vs pregame vs final

---

### Phase 3: Advanced Filters (Lower Priority)

#### 11. Team Filter
**API**: Team aliases available  
**Dashboard**: Add team search/selector  
**Impact**: Track specific teams

#### 12. Event Filter
**API**: Event IDs available  
**Dashboard**: Add event search  
**Impact**: Track specific events

#### 13. Period Filter
**API**: Period tags available  
**Dashboard**: Add period selector  
**Impact**: Filter by game period

#### 14. Symbol Filter
**API**: Symbol available in streams  
**Dashboard**: Add symbol selector  
**Impact**: Filter crypto streams by pair

#### 15. Exchange Filter
**API**: Exchange names available  
**Dashboard**: Add exchange selector  
**Impact**: Filter crypto trades by exchange

---

## 🔧 Technical Implementation

### Filter State Management
```typescript
interface DashboardFilters {
  // Arbitrage filters
  category?: MarketCategory;
  venue?: Venue[];
  minSpread?: number;
  maxSpread?: number;
  minLiquidity?: number;
  isArbitrage?: boolean;
  
  // Sports betting filters
  sport?: OrcaSport[];
  marketType?: OrcaMarketType[];
  bookmaker?: OrcaBookmaker[];
  league?: string[];
  status?: string[];
  
  // Trade stream filters
  symbol?: string[];
  exchange?: string[];
  timeRange?: { from: Date; to: Date };
  
  // Execution filters
  executionStatus?: "success" | "failure" | "all";
  minProfit?: number;
  maxProfit?: number;
}
```

### API Integration
```typescript
// Enhanced API calls with filters
async function fetchFilteredOpportunities(filters: DashboardFilters) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.minSpread) params.set("minSpread", filters.minSpread.toString());
  if (filters.maxSpread) params.set("maxSpread", filters.maxSpread.toString());
  if (filters.isArbitrage) params.set("arbitrageOnly", "true");
  
  return fetchApi<ArbitrageOpportunity[]>(
    `/arbitrage/opportunities?${params}`,
    isValidOpportunitiesResponse
  );
}
```

---

## 📈 Dashboard UI Enhancements

### Filter Panel
- **Collapsible filter sidebar**
- **Quick filter buttons** (All, Crypto, Sports, Politics)
- **Range sliders** (Spread, Liquidity)
- **Multi-select dropdowns** (Sport, Venue, Bookmaker)
- **Time range picker**
- **Active filter badges** (show active filters)

### Enhanced Display
- **Grouped by dimension** (by sport, by venue, by category)
- **Sortable columns** (spread, liquidity, time)
- **Filtered counts** (showing X of Y opportunities)
- **Filter persistence** (save filter preferences)

---

## 🎯 Priority Matrix

| Filter | Priority | Impact | Effort | Status |
|--------|----------|--------|--------|--------|
| **Category** | High | High | Low | API ready |
| **Venue** | High | High | Medium | API ready |
| **Spread Range** | High | High | Low | API ready |
| **Liquidity** | High | High | Low | API ready |
| **Time Range** | High | High | Medium | Partial |
| **Sport** | Medium | High | Low | API ready |
| **Market Type** | Medium | Medium | Low | API ready |
| **Bookmaker** | Medium | Medium | Low | API ready |
| **League** | Medium | Medium | Medium | API ready |
| **Status** | Medium | Medium | Low | API ready |
| **Symbol** | Medium | Medium | Low | API ready |
| **Team** | Low | Low | High | API ready |
| **Event** | Low | Low | High | API ready |
| **Period** | Low | Low | Medium | API ready |
| **Gender** | Low | Low | Low | API ready |
| **Bet Type** | Low | Low | Low | API ready |

---

## 📝 Missing Dimensions Summary

### Critical Missing (Not Available Anywhere)
1. **Per Region** - Explicit region/geography filtering
2. **Per Timezone** - Timezone-aware filtering
3. **Per Currency** - Currency filtering
4. **Per Stake Size** - Filter by bet size ranges
5. **Per Risk Level** - Risk classification filtering

### Available but Not Exposed
- All ORCA dimensions (sport, market, bookmaker, league, team)
- All arbitrage dimensions (category, venue, spread, liquidity)
- All trade stream dimensions (symbol, exchange, time range)

---

**Status**: Enhancement plan created  
**Priority**: High-priority filters identified  
**Implementation**: Ready to implement (API support exists)
