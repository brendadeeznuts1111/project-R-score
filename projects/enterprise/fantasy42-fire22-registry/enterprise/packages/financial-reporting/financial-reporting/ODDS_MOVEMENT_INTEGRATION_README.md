# 🎲 Odds Movement Integration - Complete Implementation

## Overview

The **Enhanced Odds Movement Integration** transforms your Financial Reporting
Domain from basic transaction tracking to **proactive revenue optimization**
with deep insights into timing and odds dynamics. Built with **Bun.SQL**, this
system provides multi-database support, YAML configuration, and enhanced
regulatory compliance.

### 🚀 **Bun.SQL Integration Features**

- **Multi-Database Support** - SQLite, MySQL/MariaDB, PostgreSQL with unified
  API
- **YAML Configuration** - Environment-specific database and schema settings
- **Schema Auto-Initialization** - Adapter-specific table creation and indexing
- **Transaction Management** - Multi-connection transactions with rollback
  support
- **Regulatory Compliance** - L-key mapping and multi-format export
  (CSV/XML/JSON)
- **Audit Trails** - Comprehensive logging and monitoring capabilities

## 🚀 Key Features

### ✅ **What's Implemented**

- **🔹 Odds Movement Tracking System** - Complete audit trail of odds changes
- **🔹 Bet Timing Analysis Service** - Real-time assessment of bet timing
  relative to odds
- **🔹 Market Impact Analysis** - Revenue optimization insights
- **🔹 Enhanced Daily Transaction Reports** - DTR with odds context
- **🔹 Data Ingestion Service** - Multi-source odds data processing
- **🔹 Comprehensive Database Schema** - Optimized for analytical queries

### 📊 **Business Value**

- **Revenue Optimization:** Identify and capture missed revenue opportunities
  ($27K+ potential)
- **Risk Management:** Proactively identify high-risk betting patterns
- **Customer Insights:** Personalized timing recommendations
- **Operational Efficiency:** Automated monitoring and alerting

## 🏗️ Architecture

```text
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Odds Feed      │───▶│ OddsMovement     │───▶│ Financial       │
│  System         │    │ Analysis Service │    │ Reporting       │
└─────────────────┘    └──────────────────┘    │ Domain          │
┌─────────────────┐    ┌──────────────────┐     │                 │
│  Betting        │───▶│ Bet Timing       │────▶│ Enhanced DTR    │
│  Transactions   │    │ Analysis         │     │ with Odds       │
└─────────────────┘    └──────────────────┘     │ Context         │
                                                 └─────────────────┘
```

## 📁 File Structure

```text
src/domains/financial-reporting/
├── entities/
│   ├── odds-movement.ts                    # Core odds movement entity
│   └── financial-transaction.ts           # Enhanced transaction entity
├── services/
│   ├── odds-movement-analysis-service.ts  # Analysis engine
│   ├── odds-data-ingestion-service.ts     # Data ingestion
│   └── report-generator-service.ts        # Enhanced reporting
├── schema/
│   └── financial-reporting-schema.sql     # Complete database schema
└── examples/
    └── odds-movement-integration-demo.ts  # Complete demo
```

## 🚀 Quick Start

### 1. Run the Demo

```bash
# Run the complete odds movement integration demo
bun run scripts/run-odds-movement-demo.ts

# Or run with auto-confirmation
bun run scripts/run-odds-movement-demo.ts --yes
```

### 2. Database Setup

The system now uses **Bun.SQL** for unified database operations:

```typescript
import { SQL } from 'bun';

// SQLite with Bun.SQL
const db = new SQL({
  adapter: 'sqlite',
  filename: './odds-movement.db',
});

// PostgreSQL with Bun.SQL
const pgDb = new SQL({
  adapter: 'postgresql',
  hostname: 'localhost',
  username: 'user',
  password: 'password',
  database: 'odds_db',
});

// MySQL/MariaDB with Bun.SQL
const mysqlDb = new SQL({
  adapter: 'mysql',
  hostname: 'localhost',
  username: 'user',
  password: 'password',
  database: 'odds_db',
});
```

### 2. Basic Usage Example

```typescript
import { OddsMovementAnalysisService } from './services/odds-movement-analysis-service';
import {
  OddsDataIngestionService,
  OddsDataIngestionFactory,
} from './services/odds-data-ingestion-service';

// Initialize services
const analysisService = new OddsMovementAnalysisService(db, events);
const ingestionService = OddsDataIngestionFactory.create(db, analysisService);

// Register an odds data source
ingestionService.registerDataSource({
  sourceId: 'sports_api',
  sourceType: 'api',
  endpoint: 'https://api.sportsdata.com/odds',
  pollingInterval: 30000, // 30 seconds
  isActive: true,
});

// Analyze bet timing
const timingAnalysis = await analysisService.analyzeBetTiming(
  'bet_123',
  'customer_456',
  'event_001',
  'market_01',
  'selection_01',
  100, // bet amount
  2.2, // bet odds
  new Date()
);

console.log(`Potential savings: $${timingAnalysis.potentialSavings}`);
console.log(`Risk assessment: ${timingAnalysis.riskAssessment}`);
```

### 3. Generate Enhanced Reports

```typescript
import { ReportGeneratorService } from './services/report-generator-service';

// Generate enhanced DTR with odds analysis
const dtr = await reportGenerator.generateDailyTransactionReport(
  new Date(),
  100, // threshold
  true // include odds analysis
);

console.log('Odds Movement Insights:');
console.log(`- Total movements: ${dtr.oddsMovementInsights.totalMovements}`);
console.log(
  `- Significant movements: ${dtr.oddsMovementInsights.significantMovements}`
);
console.log(
  `- Average movement: ${dtr.oddsMovementInsights.avgMovementPercentage}%`
);
```

## 📊 Core Components

### OddsMovement Entity

```typescript
// Create odds movement
const movement = OddsMovement.create({
  eventId: 'football_match_001',
  marketId: 'match_winner',
  selectionId: 'home_team',
  oddsType: OddsType.DECIMAL,
  previousOdds: 2.0,
  currentOdds: 2.1,
  timestamp: new Date(),
  source: 'sports_api',
  metadata: { sport: 'football', league: 'Premier League' },
});

// Business logic methods
if (movement.isSignificantMovement(5.0)) {
  console.log(`Significant movement: ${movement.getMovementPercentage()}%`);
}
```

### Bet Timing Analysis

```typescript
const timingAnalysis = await analysisService.analyzeBetTiming(
  betId, customerId, eventId, marketId, selectionId,
  betAmount, betOdds, betTimestamp
);

// Results
{
  timingCategory: 'early',        // early/mid/late/peak
  oddsPosition: 'favorable',      // favorable/unfavorable/neutral
  potentialSavings: 25.00,
  riskAssessment: 'low',          // low/medium/high
  oddsMovements: [...]           // Historical movements
}
```

### Market Impact Analysis

```typescript
const marketImpact = await analysisService.analyzeMarketImpact(
  eventId, marketId, startDate, endDate
);

// Financial impact
{
  financialImpact: {
    potentialRevenue: 125000.00,
    actualRevenue: 98000.00,
    opportunityCost: 27000.00,
    riskAdjustedRevenue: 94500.00
  },
  marketEfficiency: {
    score: 78.4,  // 0-100 efficiency scale
    factors: {
      movementFrequency: 15,
      betTimingDistribution: { early: 30, mid: 45, late: 20, peak: 5 },
      oddsAccuracy: 92.3
    }
  }
}
```

## 🔧 Configuration

### Data Source Configuration

```typescript
// API-based source
ingestionService.registerDataSource({
  sourceId: 'odds_api',
  sourceType: 'api',
  endpoint: 'https://api.oddsprovider.com/live',
  credentials: { apiKey: 'your-api-key' },
  pollingInterval: 15000, // 15 seconds
  isActive: true,
});

// Feed-based source
ingestionService.registerDataSource({
  sourceId: 'sports_feed',
  sourceType: 'feed',
  pollingInterval: 30000, // 30 seconds
  isActive: true,
});

// Fantasy402 integration
ingestionService.registerDataSource({
  sourceId: 'fantasy402',
  sourceType: 'fantasy402',
  pollingInterval: 60000, // 1 minute
  isActive: true,
});
```

### Database Schema

The system uses **Bun.SQL** with unified support for SQLite, PostgreSQL, and
MySQL/MariaDB:

```typescript
// Database initialization with Bun.SQL
const db = new SQL({
  adapter: 'sqlite', // or 'postgresql' or 'mysql'
  filename: './odds-movement.db',
});

// Schema creation using Bun.SQL tagged templates
await db`
  CREATE TABLE odds_movements (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    market_id TEXT NOT NULL,
    selection_id TEXT NOT NULL,
    odds_type TEXT NOT NULL,
    previous_odds REAL NOT NULL,
    current_odds REAL NOT NULL,
    movement_percentage REAL NOT NULL,
    timestamp DATETIME NOT NULL,
    source TEXT NOT NULL,
    metadata TEXT
  )
`;

await db`
  CREATE TABLE bet_timing_analysis (
    id TEXT PRIMARY KEY,
    bet_id TEXT NOT NULL,
    timing_category TEXT NOT NULL,
    odds_position TEXT NOT NULL,
    potential_savings REAL NOT NULL,
    risk_assessment TEXT NOT NULL
  )
`;

// Optimized views for analytics
await db`
  CREATE VIEW odds_movement_summary AS
  SELECT event_id, market_id, selection_id,
         COUNT(*) as total_movements,
         AVG(movement_percentage) as avg_movement
  FROM odds_movements
  GROUP BY event_id, market_id, selection_id
`;
```

## 🎯 Advanced Usage

### Custom Analysis Thresholds

```typescript
// Generate report with custom movement threshold
const report = await analysisService.generateOddsMovementReport(
  startDate,
  endDate,
  3.0 // 3% movement threshold (more sensitive)
);

// Analyze specific market segments
const marketImpact = await analysisService.analyzeMarketImpact(
  'football_premier_league',
  'match_winner',
  startDate,
  endDate
);
```

### Real-time Monitoring

```typescript
// Set up real-time odds monitoring
ingestionService.registerDataSource({
  sourceId: 'live_odds',
  sourceType: 'api',
  endpoint: 'https://api.liveodds.com/stream',
  pollingInterval: 5000, // 5 seconds for live updates
  isActive: true,
});

// Monitor significant movements
events.subscribe('OddsMovementRecorded', event => {
  if (Math.abs(event.movementPercentage) > 5.0) {
    console.log(`🚨 Significant movement: ${event.movementPercentage}%`);
    // Trigger alerts, notifications, etc.
  }
});
```

### Integration with Fantasy402

```typescript
// Extract odds from Fantasy402 interface
ingestionService.registerDataSource({
  sourceId: 'fantasy402_live',
  sourceType: 'fantasy402',
  pollingInterval: 30000,
  isActive: true,
});

// The system will automatically extract odds data from:
// /html/body/div[3]/div[5]/div/div[5]/section/section/div/div/div/div[2]/div/div
```

## 📈 Performance Optimization

### Database Indexes

The schema includes optimized indexes for:

- Timestamp-based queries (odds movements over time)
- Event/market/selection lookups
- Bet timing analysis queries
- Financial impact calculations

### Caching Strategies

- Materialized views for common analytical queries
- Background processing for complex timing analyses
- Efficient batch processing for bulk data ingestion

### Scalability Features

- Asynchronous processing for real-time updates
- Background jobs for heavy analytical computations
- Optimized queries with proper indexing
- Connection pooling for high-throughput scenarios

## 🔍 Monitoring & Alerting

### System Health

```typescript
// Check ingestion service status
const status = ingestionService.getStatus();
console.log(`Active sources: ${status.activeSources.length}`);
console.log(`Total sources: ${status.totalSources}`);

// Monitor database performance
const stats = db.get(`
  SELECT
    COUNT(*) as total_movements,
    AVG(movement_percentage) as avg_movement,
    MAX(timestamp) as latest_update
  FROM odds_movements
`);
```

### Automated Alerts

```typescript
// Set up movement alerts
events.subscribe('OddsMovementRecorded', event => {
  if (Math.abs(event.movementPercentage) > 10.0) {
    // Send alert for extreme movements
    sendAlert(`Extreme odds movement: ${event.movementPercentage}%`);
  }
});

// Revenue opportunity alerts
events.subscribe('MarketImpactAnalyzed', event => {
  if (event.opportunityCost > 10000) {
    sendAlert(
      `Revenue opportunity: $${event.opportunityCost.toLocaleString()}`
    );
  }
});
```

## 🧪 Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'bun:test';
import { OddsMovement } from '../entities/odds-movement';

describe('OddsMovement Entity', () => {
  it('should calculate movement percentage correctly', () => {
    const movement = OddsMovement.create({
      eventId: 'test_event',
      marketId: 'test_market',
      selectionId: 'test_selection',
      oddsType: OddsType.DECIMAL,
      previousOdds: 2.0,
      currentOdds: 2.2,
      timestamp: new Date(),
      source: 'test',
    });

    expect(movement.getMovementPercentage()).toBe(10.0);
    expect(movement.getMovementType()).toBe('increase');
  });
});
```

### Integration Tests

```typescript
describe('Odds Movement Integration', () => {
  it('should process odds updates and generate movements', async () => {
    const updates = [
      {
        eventId: 'test_event',
        marketId: 'test_market',
        selectionId: 'test_selection',
        odds: 2.1,
        oddsType: OddsType.DECIMAL,
        timestamp: new Date(),
        source: 'test',
      },
    ];

    const result = await ingestionService.ingestManualOddsData(updates);
    expect(result.success).toBe(true);
    expect(result.movementsCreated).toBe(1);
  });
});
```

## 🚀 Production Deployment

### Environment Setup

```bash
# Install dependencies
bun install

# Set up environment variables
export DATABASE_URL="sqlite:./production.db"
export ODDS_API_KEY="your-api-key"
export ALERT_WEBHOOK_URL="https://your-alerts.com/webhook"

# Run database migrations
bun run scripts/migrate-database.ts

# Start the ingestion service
bun run scripts/start-odds-ingestion.ts
```

### Health Checks

```typescript
// Implement health check endpoint
app.get('/health/odds-movement', async (req, res) => {
  const status = ingestionService.getStatus();
  const dbHealth = await checkDatabaseHealth();

  res.json({
    status: status.isRunning && dbHealth ? 'healthy' : 'unhealthy',
    ingestion: status,
    database: dbHealth,
    timestamp: new Date().toISOString(),
  });
});
```

## 📚 API Reference

### OddsMovementAnalysisService

#### Methods

- `analyzeBetTiming()` - Analyze timing relative to odds movements
- `analyzeMarketImpact()` - Calculate market efficiency and financial impact
- `generateOddsMovementReport()` - Generate comprehensive movement reports

### OddsDataIngestionService

#### Methods

- `registerDataSource()` - Register new odds data source
- `startPolling()` - Start polling specific source
- `processOddsUpdates()` - Process batch of odds updates
- `generateSampleOddsData()` - Generate sample data for testing

### ReportGeneratorService

#### Methods

- `generateDailyTransactionReport()` - Enhanced DTR with odds analysis
- `generateMonthlyPLReport()` - Monthly P&L with timing insights
- `generateComprehensiveReport()` - Full financial report

## 🔗 Related Documentation

- [Financial Reporting Domain Overview](../README.md)
- [Domain-Driven Design Patterns](../../shared/README.md)
- [Database Schema Documentation](./schema/README.md)
- [API Integration Guide](../../external/fantasy402/README.md)

## 🤝 Contributing

1. Follow the existing domain-driven design patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure performance optimizations for database queries
5. Test integration with existing Fantasy402 system

## 📄 License

This implementation is part of the Financial Reporting Domain and follows the
project's licensing terms.

---

**🎯 Ready to capture those missed revenue opportunities?** Start with the demo
and integrate with your live odds feeds for immediate business impact!
