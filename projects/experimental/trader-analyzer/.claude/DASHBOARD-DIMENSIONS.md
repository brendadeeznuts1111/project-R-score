# NEXUS Trading Dashboard - Data Dimensions & Filters

**Complete analysis of available and missing data dimensions for filtering and analysis.**

---

## ✅ Currently Available Dimensions

### 1. **Per Sport** ✅
**Available**: `OrcaSport` enum (NFL, NBA, MLB, NHL, EPL, etc.)  
**Usage**: Filter by sport in ORCA streaming  
**Dashboard**: Not prominently displayed

### 2. **Per Market Type** ✅
**Available**: `OrcaMarketType` (moneyline, spread, total, prop, future, live)  
**Usage**: Market type filtering in ORCA  
**Dashboard**: Not prominently displayed

### 3. **Per Region** ⚠️ Partial
**Available**: Country in sport definitions (USA, England, Spain, etc.)  
**Missing**: Explicit region filtering per market/opportunity  
**Usage**: Implicit via sport/league

### 4. **Per Time** ✅
**Available**: 
- `timestamp` - Market update time
- `startTime` - Event start time
- `lastScanTime` - Scanner last scan
- Time-based filtering in queries

**Dashboard**: Displayed but not filterable

---

## ❌ Missing Dimensions

### 1. **Per Bookmaker** ⚠️ Available but Not Filtered
**Available**: `OrcaBookmaker` (betfair, ps3838, polymarket, kalshi, deribit)  
**Missing**: Dashboard filtering by bookmaker  
**Impact**: Cannot see opportunities per bookmaker

### 2. **Per League** ⚠️ Available but Not Filtered
**Available**: League taxonomy (NBA, NFL, EPL, etc.)  
**Missing**: Dashboard filtering by league  
**Impact**: Cannot drill down by league

### 3. **Per Team** ⚠️ Available but Not Filtered
**Available**: Team aliases and canonical IDs  
**Missing**: Dashboard filtering by team  
**Impact**: Cannot track specific teams

### 4. **Per Event** ⚠️ Available but Not Filtered
**Available**: Event IDs and matching  
**Missing**: Dashboard filtering by event  
**Impact**: Cannot track specific events

### 5. **Per Period** ✅ Available
**Available**: Period tags (first_half, second_half, quarter, period, full)  
**Missing**: Dashboard filtering by period  
**Impact**: Cannot filter live vs pregame

### 6. **Per Status** ✅ Available
**Available**: Status tags (live, pregame, final, suspended, cancelled)  
**Missing**: Dashboard filtering by status  
**Impact**: Cannot filter active vs closed markets

### 7. **Per Category** ✅ Available
**Available**: Market categories (crypto, politics, economics, sports, entertainment)  
**Missing**: Dashboard filtering by category  
**Impact**: Cannot filter prediction markets by category

### 8. **Per Venue** ⚠️ Available but Not Filtered
**Available**: Venue types (polymarket, kalshi, deribit, betfair, ps3838)  
**Missing**: Dashboard filtering by venue  
**Impact**: Cannot compare venues

### 9. **Per Liquidity** ⚠️ Available but Not Filtered
**Available**: Liquidity values in opportunities  
**Missing**: Dashboard filtering by liquidity threshold  
**Impact**: Cannot filter by tradeable size

### 10. **Per Spread** ⚠️ Available but Not Filtered
**Available**: Spread percentages in opportunities  
**Missing**: Dashboard filtering by spread range  
**Impact**: Cannot filter by profitability

### 11. **Per Confidence** ⚠️ Available but Not Filtered
**Available**: Confidence scores in opportunities  
**Missing**: Dashboard filtering by confidence  
**Impact**: Cannot prioritize high-confidence opportunities

### 12. **Per Gender** ✅ Available
**Available**: Gender tags (mens, womens, mixed)  
**Missing**: Dashboard filtering by gender  
**Impact**: Cannot filter sports by gender

### 13. **Per Bet Type** ✅ Available
**Available**: Bet type tags (moneyline, spread, total, props, futures)  
**Missing**: Dashboard filtering by bet type  
**Impact**: Cannot filter by bet type

### 14. **Per Exchange** ⚠️ Available but Not Filtered
**Available**: Exchange names (binance, bitmex, deribit, etc.)  
**Missing**: Dashboard filtering by exchange  
**Impact**: Cannot filter crypto trades by exchange

### 15. **Per Symbol** ⚠️ Available but Not Filtered
**Available**: Trading pairs (BTC/USDT, ETH/USD, etc.)  
**Missing**: Dashboard filtering by symbol  
**Impact**: Cannot filter streams by trading pair

### 16. **Per Time Range** ⚠️ Partial
**Available**: Date ranges in streams  
**Missing**: Dashboard time range selector  
**Impact**: Cannot filter by custom time ranges

### 17. **Per Profitability** ⚠️ Available but Not Filtered
**Available**: P&L values  
**Missing**: Dashboard filtering by profit/loss  
**Impact**: Cannot filter winning vs losing trades

### 18. **Per Execution Status** ⚠️ Available but Not Filtered
**Available**: Execution success/failure  
**Missing**: Dashboard filtering by execution status  
**Impact**: Cannot analyze execution performance

---

## 📊 Dimension Matrix

| Dimension | Available | Filterable | Displayed | Priority |
|-----------|-----------|------------|-----------|----------|
| **Sport** | ✅ | ⚠️ | ❌ | High |
| **Market Type** | ✅ | ⚠️ | ❌ | High |
| **Region** | ⚠️ | ❌ | ❌ | Medium |
| **Time** | ✅ | ⚠️ | ✅ | High |
| **Bookmaker** | ✅ | ❌ | ❌ | High |
| **League** | ✅ | ❌ | ❌ | High |
| **Team** | ✅ | ❌ | ❌ | Medium |
| **Event** | ✅ | ❌ | ❌ | Medium |
| **Period** | ✅ | ❌ | ❌ | Low |
| **Status** | ✅ | ❌ | ❌ | Medium |
| **Category** | ✅ | ❌ | ❌ | High |
| **Venue** | ✅ | ❌ | ❌ | High |
| **Liquidity** | ✅ | ❌ | ❌ | High |
| **Spread** | ✅ | ❌ | ✅ | High |
| **Confidence** | ✅ | ❌ | ❌ | Medium |
| **Gender** | ✅ | ❌ | ❌ | Low |
| **Bet Type** | ✅ | ❌ | ❌ | Medium |
| **Exchange** | ✅ | ❌ | ❌ | Medium |
| **Symbol** | ✅ | ❌ | ✅ | High |
| **Time Range** | ⚠️ | ❌ | ⚠️ | High |
| **Profitability** | ✅ | ❌ | ✅ | High |
| **Execution Status** | ✅ | ❌ | ❌ | Medium |

---

## 🎯 Recommended Enhancements

### High Priority (Core Filtering)
1. **Bookmaker Filter**: Filter opportunities by bookmaker
2. **Sport Filter**: Filter by sport in dashboard
3. **Market Type Filter**: Filter by market type
4. **Category Filter**: Filter prediction markets by category
5. **Venue Filter**: Filter by venue (polymarket, kalshi, etc.)
6. **Liquidity Filter**: Filter by minimum liquidity
7. **Spread Filter**: Filter by spread range
8. **Time Range Selector**: Custom date/time range filtering

### Medium Priority (Enhanced Analysis)
9. **League Filter**: Filter by league
10. **Team Filter**: Filter by team
11. **Status Filter**: Filter by market status (live, pregame, final)
12. **Symbol Filter**: Filter streams by trading pair
13. **Exchange Filter**: Filter crypto trades by exchange

### Low Priority (Nice to Have)
14. **Period Filter**: Filter by game period
15. **Gender Filter**: Filter by gender
16. **Bet Type Filter**: Filter by bet type
17. **Confidence Filter**: Filter by confidence score

---

## 🔧 Implementation Plan

### Phase 1: Core Filters
- Add filter UI to dashboard
- Implement bookmaker, sport, market type filters
- Add time range selector
- Display filtered counts

### Phase 2: Advanced Filters
- Add category, venue, liquidity filters
- Implement spread range filter
- Add league and team filters

### Phase 3: Analytics Filters
- Add profitability filters
- Implement execution status filters
- Add symbol and exchange filters

---

**Status**: Dimensions analyzed  
**Available**: 22 dimensions identified  
**Missing**: 18 filters not implemented  
**Priority**: High-priority filters identified
