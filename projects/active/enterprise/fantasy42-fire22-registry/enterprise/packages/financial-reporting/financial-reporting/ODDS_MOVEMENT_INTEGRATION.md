# Odds Movement Integration - Financial Reporting Domain

## Overview

The Financial Reporting Domain has been enhanced with comprehensive odds
movement analysis capabilities. This integration provides deep insights into how
betting odds changes affect financial performance, customer behavior, and
revenue optimization opportunities.

## 🎯 **Key Integration Points**

### **1. Enhanced Daily Transaction Reports (DTR)**

**Before:** Basic transaction listing with amounts and categories **After:**
Transaction analysis with odds movement context

```typescript
// Enhanced DTR with odds movement insights
const dtr = await reportGenerator.generateDailyTransactionReport(
  new Date('2024-01-15'),
  100, // threshold
  true // include odds analysis
);

// Result includes:
{
  reportDate: "2024-01-15",
  totalTransactions: 1250,
  totalAmount: 45000,
  transactions: [...],
  oddsMovementInsights: {
    totalMovements: 45,
    significantMovements: 12,
    avgMovementPercentage: 3.2,
    topMovingMarkets: [
      { marketId: "soccer_premier_league", movements: 8, avgChange: 4.5 },
      { marketId: "basketball_nba", movements: 6, avgChange: -2.1 }
    ]
  },
  betTimingAnalysis: {
    totalBets: 15,
    favorableTiming: 8,
    unfavorableTiming: 4,
    potentialSavings: 1250.00,
    riskDistribution: { low: 6, medium: 7, high: 2 }
  }
}
```

### **2. Odds Movement Tracking System**

#### **OddsMovement Entity**

- Tracks odds changes over time with full audit trail
- Supports multiple odds formats (decimal, American, fractional)
- Calculates movement percentages and significance
- Links to specific events, markets, and selections

#### **Database Schema**

```sql
-- Odds Movements Table
CREATE TABLE odds_movements (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    market_id TEXT NOT NULL,
    selection_id TEXT NOT NULL,
    odds_type TEXT NOT NULL CHECK (odds_type IN ('decimal', 'american', 'fractional')),
    previous_odds REAL NOT NULL,
    current_odds REAL NOT NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('increase', 'decrease', 'no_change')),
    movement_percentage REAL NOT NULL,
    timestamp DATETIME NOT NULL,
    source TEXT NOT NULL,
    metadata TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### **3. Bet Timing Analysis**

#### **Real-time Bet Assessment**

```typescript
const timingAnalysis = await oddsAnalysisService.analyzeBetTiming(
  betId: "bet_12345",
  customerId: "cust_789",
  eventId: "event_001",
  marketId: "market_001",
  selectionId: "selection_001",
  betAmount: 100.00,
  betOdds: 2.5,
  betTimestamp: new Date()
);

// Returns comprehensive timing analysis
{
  betId: "bet_12345",
  timingCategory: "early", // early/mid/late/peak
  oddsPosition: "favorable", // favorable/unfavorable/neutral
  potentialSavings: 25.00,
  riskAssessment: "low", // low/medium/high
  oddsMovements: [...] // Historical odds changes before bet
}
```

#### **Timing Categories:**

- **Early:** >24 hours before event
- **Mid:** 2-24 hours before event
- **Late:** 0-2 hours before event
- **Peak:** Very close to event start

## 📊 **Financial Impact Analysis**

### **Revenue Optimization Insights**

#### **Market Efficiency Scoring**

```typescript
const marketImpact = await oddsAnalysisService.analyzeMarketImpact(
  eventId: "event_001",
  marketId: "market_001",
  periodStart: startDate,
  periodEnd: endDate
);

// Returns market efficiency metrics
{
  financialImpact: {
    potentialRevenue: 125000.00,
    actualRevenue: 98000.00,
    opportunityCost: 27000.00, // Potential revenue lost to poor timing
    riskAdjustedRevenue: 94500.00
  },
  marketEfficiency: {
    score: 78.4, // 0-100 scale
    factors: {
      movementFrequency: 15,
      betTimingDistribution: { early: 30, mid: 45, late: 20, peak: 5 },
      oddsAccuracy: 92.3
    }
  }
}
```

### **Customer Behavior Insights**

#### **Bet Timing Patterns**

- Identify customers who consistently bet at optimal times
- Detect patterns of "chasing odds" (betting after unfavorable movements)
- Analyze customer segments by timing preferences

#### **Risk Assessment**

- **High Risk:** Peak betting with unfavorable odds movements
- **Medium Risk:** Late betting or significant odds changes
- **Low Risk:** Early betting with stable odds

## 🏗️ **System Architecture**

### **Integration Points**

```text
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Odds Feed      │───▶│ OddsMovement     │───▶│ Financial       │
│  System         │    │ Analysis Service │    │ Reporting       │
└─────────────────┘    └──────────────────┘    │ Domain          │
                                                └─────────────────┘
┌─────────────────┐    ┌──────────────────┐     │                 │
│  Betting        │───▶│ Bet Timing       │────▶│ DTR Enhanced    │
│  Transactions   │    │ Analysis         │     │ with Odds       │
└─────────────────┘    └──────────────────┘     │ Context         │
                                                 └─────────────────┘
```

### **Data Flow**

1. **Odds Feed** → Captures real-time odds changes
2. **OddsMovement Entity** → Stores historical odds data
3. **Bet Timing Analysis** → Correlates bets with odds movements
4. **Enhanced DTR** → Includes odds insights in daily reports
5. **Financial Impact** → Calculates revenue optimization opportunities

## 🎲 **Practical Use Cases**

### **1. Real-time Revenue Optimization**

```typescript
// Monitor live odds movements and suggest optimal betting windows
const liveAnalysis = await oddsAnalysisService.analyzeMarketImpact(
  'live_event_001',
  'live_market_001',
  new Date(Date.now() - 3600000), // Last hour
  new Date()
);

if (liveAnalysis.marketEfficiency.score < 70) {
  // Trigger revenue optimization alert
  console.log(
    `⚠️ Market efficiency low: ${liveAnalysis.marketEfficiency.score}`
  );
  console.log(
    `💡 Opportunity cost: $${liveAnalysis.financialImpact.opportunityCost}`
  );
}
```

### **2. Customer Segmentation by Timing**

```typescript
// Identify customers who bet early vs. late
const earlyBetters = await db.all(`
  SELECT customer_id, COUNT(*) as bet_count
  FROM bet_timing_analysis
  WHERE timing_category = 'early'
    AND odds_position = 'favorable'
  GROUP BY customer_id
  ORDER BY bet_count DESC
  LIMIT 10
`);

// These customers show better betting discipline
// Can be targeted with early-betting promotions
```

### **3. Risk Management**

```typescript
// Identify high-risk betting patterns
const highRiskBets = await db.all(`
  SELECT *
  FROM bet_timing_analysis
  WHERE risk_assessment = 'high'
    AND potential_savings > 50.00
    AND timing_category = 'peak'
`);

// Flag for additional review or customer support
```

## 📈 **Reporting Enhancements**

### **Enhanced Daily Transaction Report**

- **Odds Movement Summary:** Total movements, significant changes, top moving
  markets
- **Bet Timing Analysis:** Favorable vs. unfavorable timing, potential savings
- **Risk Distribution:** Breakdown of bet risk levels
- **Market Insights:** Which markets had the most volatility

### **Monthly P&L Integration**

- **Odds Impact on Revenue:** How odds movements affected monthly performance
- **Timing Efficiency:** Overall market timing effectiveness
- **Revenue Optimization:** Potential additional revenue from better timing

### **Comprehensive Odds Movement Report**

```typescript
const oddsReport = await oddsAnalysisService.generateOddsMovementReport(
  periodStart,
  periodEnd,
  2.0 // Minimum movement threshold
);

// Returns detailed analysis of odds impact on financial performance
{
  summary: {
    totalMovements: 1250,
    significantMovements: 180,
    affectedBets: 890,
    potentialRevenueImpact: 45000.00
  },
  movementsByType: { increase: 650, decrease: 520, no_change: 80 },
  timingAnalysis: { earlyBets: 45, midBets: 35, lateBets: 15, peakBets: 5 },
  recommendations: [
    "Increase early betting incentives",
    "Monitor peak betting activity",
    "Optimize odds adjustment timing"
  ]
}
```

## 🔧 **Technical Implementation**

### **Database Views for Analysis**

```sql
-- Odds Movement Summary View
CREATE VIEW odds_movement_summary AS
SELECT
    event_id, market_id, selection_id,
    COUNT(*) as total_movements,
    AVG(movement_percentage) as avg_movement,
    MAX(ABS(movement_percentage)) as max_movement
FROM odds_movements
GROUP BY event_id, market_id, selection_id;

-- Bet Timing Impact View
CREATE VIEW bet_timing_impact AS
SELECT
    bta.*,
    oms.total_movements,
    oms.avg_movement_percentage
FROM bet_timing_analysis bta
LEFT JOIN odds_movement_summary oms
    ON bta.event_id = oms.event_id
    AND bta.market_id = oms.market_id
    AND bta.selection_id = oms.selection_id;
```

### **Performance Optimizations**

- **Indexed Queries:** Optimized indexes on timestamp, event/market/selection
  IDs
- **Materialized Views:** Pre-calculated aggregations for common queries
- **Caching:** Redis caching for frequently accessed odds data
- **Async Processing:** Background processing for complex analyses

## 🚀 **Business Value**

### **Revenue Optimization**

- **Potential Savings:** Identify missed revenue from poor bet timing
- **Dynamic Pricing:** Adjust odds based on timing patterns
- **Customer Incentives:** Reward early betting behavior

### **Risk Management**

- **Pattern Detection:** Identify risky betting patterns before issues arise
- **Fraud Prevention:** Detect unusual odds movement correlations
- **Compliance:** Monitor for regulatory concerns

### **Customer Experience**

- **Better Odds:** Help customers get better odds through optimal timing
- **Education:** Provide insights on timing benefits
- **Personalization:** Tailor recommendations based on betting patterns

## 🎯 **Next Steps**

1. **Data Integration:** Connect with live odds feeds
2. **Real-time Processing:** Implement streaming odds analysis
3. **Machine Learning:** Predictive models for odds movement patterns
4. **Customer Dashboard:** Provide timing insights to customers
5. **Automated Alerts:** Set up monitoring for significant movements

The odds movement integration transforms your Financial Reporting Domain from
reactive transaction tracking to proactive revenue optimization, providing deep
insights into how timing affects financial performance.
