# Multi-Dimensional Sub-Market Correlation Subsystem

**Version**: 6.1.1.2.2.8.1.1.2.8  
**Status**: ✅ Implemented  
**Last Updated**: 2025-12-08

## Overview

This subsystem provides advanced capabilities for analyzing complex interdependencies between various market offerings within and across bookmakers. It moves beyond simple direct correlations to consider contextual factors, temporal lags, and non-linear relationships.

**Key Capabilities**:
- Multi-dimensional correlation analysis across market offerings
- Temporal lag detection (identifying which markets lead/follow)
- Statistical significance testing (p-values)
- Context-aware filtering (bookmaker, market type, period, exposure level)
- Integration with MLGS (Multi-Layer Graph System)

---

## 6.1.1.2.2.8.1.1.2.8.1 SubMarketCorrelationMatrix Interface & Data Structures

### 6.1.1.2.2.8.1.1.2.8.1.1 CorrelationPair Interface

Represents a single observed correlation between two market offerings.

```typescript
export interface CorrelationPair {
  sourceNodeId: string;
  targetNodeId: string;
  coefficient: number; // -1.0 to 1.0
  p_value: number;
  temporalLag_ms: number;
  observationCount: number;
  lastUpdated: number;
  calculationMethod?: 'pearson' | 'spearman' | 'kendall';
  sourceExposureLevel?: 'displayed' | 'api_exposed' | 'dark_pool';
  targetExposureLevel?: 'displayed' | 'api_exposed' | 'dark_pool';
}
```

**Fields**:
- `coefficient`: Statistical correlation coefficient (Pearson's r, Spearman's rho, or Kendall's tau)
- `p_value`: Statistical significance (typically < 0.05 for significance)
- `temporalLag_ms`: Time delay from source movement to target response (positive = source leads)
- `observationCount`: Number of data points used in calculation
- `exposureLevel`: Market visibility level (displayed, API-exposed, or dark pool)

### 6.1.1.2.2.8.1.1.2.8.1.2 ContextualCorrelationAttributes Interface

Defines attributes that qualify a correlation, enabling dynamic filtering and analysis.

```typescript
export interface ContextualCorrelationAttributes {
  sourceBookmaker?: string | 'ANY';
  targetBookmaker?: string | 'ANY';
  sourceMarketType?: string;
  targetMarketType?: string;
  sourcePeriod?: string;
  targetPeriod?: string;
  sourceExposureLevel?: 'displayed' | 'api_exposed' | 'dark_pool';
  targetExposureLevel?: 'displayed' | 'api_exposed' | 'dark_pool';
  externalEventType?: string;
  minCoefficient?: number;
  maxPValue?: number;
  minObservationCount?: number;
}
```

**Use Cases**:
- Filter correlations by bookmaker pairs
- Analyze correlations within specific market types (e.g., totals vs spreads)
- Compare correlations across periods (Q1 vs full game)
- Investigate dark pool → displayed market correlations

### 6.1.1.2.2.8.1.1.2.8.1.3 SubMarketCorrelationMatrix Interface

The main output structure representing multi-dimensional correlations.

```typescript
export interface SubMarketCorrelationMatrix {
  eventId: string;
  observationWindow_ms: number;
  correlations: CorrelationPair[];
  contextAttributes?: ContextualCorrelationAttributes;
  calculatedAt: number;
  totalNodesAnalyzed: number;
  totalPairsEvaluated: number;
}
```

---

## 6.1.1.2.2.8.1.1.2.8.2 CorrelationEngine17 Service

### Constructor & Dependencies

```typescript
constructor(
  db: Database,
  shadowGraphBuilder: SubMarketShadowGraphBuilder,
  metrics?: PrometheusClient
)
```

**Dependencies**:
- `db`: Bun-native SQLite for historical `line_movement_micro_v2` data
- `shadowGraphBuilder`: Access to `MarketOfferingNode` definitions (visibility, parentage, etc.)
- `metrics`: Optional PrometheusClient for performance monitoring

### calculateEventCorrelationMatrix

The primary method to calculate the correlation matrix for a given event.

**Signature**:
```typescript
async calculateEventCorrelationMatrix(
  eventId: string,
  config?: CorrelationConfig
): Promise<SubMarketCorrelationMatrix>
```

**Configuration Options**:
```typescript
interface CorrelationConfig {
  observationWindow_ms?: number; // Default: 3600000 (1 hour)
  minObservationCount?: number; // Default: 10
  includeDarkPools?: boolean; // Default: false
  temporalLagMax_ms?: number; // Default: 300000 (5 minutes)
  significanceThreshold?: number; // Default: 0.05 (p-value)
  correlationMethod?: 'pearson' | 'spearman' | 'kendall'; // Default: 'pearson'
  minCoefficient?: number; // Default: 0.3
  contextAttributes?: ContextualCorrelationAttributes;
}
```

**Algorithm**:
1. **Retrieve Market Nodes**: Get all `MarketOfferingNode`s for the `eventId` from `shadowGraphBuilder`
2. **Fetch Historical Data**: Retrieve `line_movement_micro_v2` data for each node within `observationWindow_ms`
3. **Calculate Correlations**: For each significant pair of nodes:
   - Apply statistical methods (Pearson, Spearman, Kendall) to line movement deltas
   - Perform **cross-correlation analysis** to determine `temporalLag_ms`
   - Filter by `p_value` for statistical significance
   - Enrich `CorrelationPair` with `observationCount`
4. **Filter Results**: Apply `minCoefficient` and `significanceThreshold` filters
5. **Store Results**: Persist correlation pairs to database for future queries

**Example**:
```typescript
const matrix = await correlationEngine.calculateEventCorrelationMatrix('nfl-2025-001', {
  observationWindow_ms: 3600000, // 1 hour
  includeDarkPools: true,
  minObservationCount: 10,
  minCoefficient: 0.7
});

// Expected Result:
// matrix.eventId === 'nfl-2025-001'
// matrix.correlations.some(c => 
//   c.sourceExposureLevel === 'dark_pool' && 
//   c.coefficient > 0.7 && 
//   c.temporalLag_ms > 0
// )
```

### queryCorrelations

Allows querying stored correlation data based on specific contextual attributes.

**Signature**:
```typescript
async queryCorrelations(
  attributes: ContextualCorrelationAttributes
): Promise<CorrelationPair[]>
```

**Example**:
```typescript
// Query all dark pool → displayed correlations for total points markets
const correlations = await correlationEngine.queryCorrelations({
  sourceExposureLevel: 'dark_pool',
  targetExposureLevel: 'displayed',
  sourceMarketType: 'TOTAL_POINTS',
  minCoefficient: 0.5,
  maxPValue: 0.05
});
```

**Use Cases**:
- Research specific correlation types
- Identify leading indicators (markets that lead others)
- Analyze bookmaker-specific patterns
- Investigate period-based correlations

### calculateFractionalSpreadDeviation

**6.1.1.2.2.8.1.1.2.8.2.4**: Calculates "index off mainline price" for spreads. Detects bait lines and subtle shifts by comparing historical/fractional spreads against a dynamically calculated mainline.

**Signature**:
```typescript
async calculateFractionalSpreadDeviation(
  marketId: string,
  options: FhSpreadDeviationOptions
): Promise<FhSpreadDeviationResult>
```

**Options Interface**:
```typescript
interface FhSpreadDeviationOptions {
  bookmakers?: string[]; // Bookmakers to include in mainline calculation
  timeRange: { start: number; end: number }; // Time range for historical data
  mainlineMethod: 'VWAP' | 'median' | 'consensus'; // Mainline calculation method
  deviationThreshold?: number; // Threshold for significant deviation (default: 0.25)
  spreadType?: string; // 'point_spread', 'alternate_spread'
  period?: string; // 'FULL_GAME', 'H1', 'Q1', etc.
}
```

**Result Interface**:
```typescript
interface FhSpreadDeviationResult {
  marketId: string;
  mainlinePrice: number; // e.g., -7.0 (consensus spread)
  mainlineSource: string; // "VWAP:DraftKings,FanDuel"
  deviationIndex: number; // +0.5 (off mainline)
  deviationPercentage: number; // 7.14%
  significantDeviationDetected: boolean;
  deviatingNodes: {
    nodeId: string;
    line: number;
    deviation: number; // Individual node deviation
    bookmaker: string;
    exposureLevel?: 'displayed' | 'api_exposed' | 'dark_pool';
  }[];
  calculationTimestamp: number;
}
```

**Example**:
```typescript
const deviation = await correlationEngine.calculateFractionalSpreadDeviation(
  'nba-game-2025001-spread',
  {
    bookmakers: ['DraftKings', 'FanDuel'],
    timeRange: {
      start: Date.now() - 3600000, // Last hour
      end: Date.now()
    },
    mainlineMethod: 'VWAP',
    deviationThreshold: 0.25,
    spreadType: 'point_spread'
  }
);

// Expected Result:
// deviation.marketId === 'nba-game-2025001-spread'
// deviation.mainlinePrice === -7.0 (consensus)
// deviation.significantDeviationDetected === true (if any line is -7.5 or -6.5)
// deviation.deviatingNodes.length >= 1
// deviation.deviationPercentage > 3.5% (threshold breach)
```

**Mainline Calculation Methods**:
- **VWAP**: Volume-Weighted Average Price (default)
- **median**: Median of all lines
- **consensus**: Average of most recent lines (last 10% of data points)

**Use Cases**:
- Detect bait lines (deviating significantly from mainline)
- Identify arbitrage opportunities
- Monitor bookmaker pricing consistency
- Alert on significant deviations (>5%)

---

## 6.1.1.2.2.8.1.1.2.8.3 MarketDataRouter17 API Endpoint Extension

### New URLPattern Definitions

```typescript
// Event correlation matrix calculation
this.patterns.set('event_correlations', new URLPattern({
  pathname: '/api/v17/events/:eventId/correlations',
  search: '?window=:windowMs&minObs=:minObs&darkPools=:includeDarkPools'
}));

// Query stored correlations
this.patterns.set('query_correlations', new URLPattern({
  pathname: '/api/v17/correlations/query',
  search: '?sourceBookmaker=:sbk&targetPeriod=:tperiod&minCoeff=:minC'
}));
```

### API Endpoints

#### GET `/api/v17/events/:eventId/correlations`

Calculate correlation matrix for a specific event.

**Query Parameters**:
- `window` (optional): Observation window in milliseconds (default: 3600000)
- `minObs` (optional): Minimum observation count (default: 10)
- `darkPools` (optional): Include dark pools (default: false)

**Example Request**:
```bash
GET /api/v17/events/nfl-2025-001/correlations?window=7200000&minObs=20&darkPools=true
```

**Example Response**:
```json
{
  "eventId": "nfl-2025-001",
  "observationWindow_ms": 7200000,
  "correlations": [
    {
      "sourceNodeId": "nfl-2025-001:DK:TOTAL_POINTS:displayed",
      "targetNodeId": "nfl-2025-001:FD:TOTAL_POINTS:displayed",
      "coefficient": 0.87,
      "p_value": 0.001,
      "temporalLag_ms": 1500,
      "observationCount": 45,
      "lastUpdated": 1733688000000,
      "calculationMethod": "pearson",
      "sourceExposureLevel": "displayed",
      "targetExposureLevel": "displayed"
    }
  ],
  "calculatedAt": 1733688000000,
  "totalNodesAnalyzed": 12,
  "totalPairsEvaluated": 66
}
```

#### GET `/api/v17/correlations/query`

Query stored correlations based on contextual attributes.

**Query Parameters**:
- `sourceBookmaker` (optional): Source bookmaker or 'ANY'
- `targetBookmaker` (optional): Target bookmaker or 'ANY'
- `sourcePeriod` (optional): Source period (e.g., 'Q1', 'FULL_GAME')
- `targetPeriod` (optional): Target period
- `sourceExposureLevel` (optional): 'displayed', 'api_exposed', or 'dark_pool'
- `targetExposureLevel` (optional): 'displayed', 'api_exposed', or 'dark_pool'
- `minCoeff` (optional): Minimum correlation coefficient
- `maxPValue` (optional): Maximum p-value threshold
- `minObs` (optional): Minimum observation count

**Example Request**:
```bash
GET /api/v17/correlations/query?sourceExposureLevel=dark_pool&targetExposureLevel=displayed&minCoeff=0.7
```

**Example Response**:
```json
{
  "correlations": [
    {
      "sourceNodeId": "nfl-2025-001:DK:TOTAL_POINTS:dark_pool",
      "targetNodeId": "nfl-2025-001:FD:TOTAL_POINTS:displayed",
      "coefficient": 0.82,
      "p_value": 0.003,
      "temporalLag_ms": -2000,
      "observationCount": 38,
      "lastUpdated": 1733688000000
    }
  ],
  "count": 1,
  "queryAttributes": {
    "sourceExposureLevel": "dark_pool",
    "targetExposureLevel": "displayed",
    "minCoefficient": 0.7
  }
}
```

#### GET `/api/v17/spreads/:marketId/deviation`

Calculate fractional/historical spread deviation against mainline price.

**Path Parameters**:
- `marketId`: The market identifier

**Query Parameters**:
- `type` (optional): Deviation type - 'point_spread', 'alternate_spread' (default: 'point_spread')
- `period` (optional): Period segment - 'FULL_GAME', 'H1', 'Q1', etc.
- `timeRange` (required): Time range - 'last-4h', 'last-1d', 'last-30m', or timestamp range 'start:end'
- `method` (optional): Mainline calculation method - 'VWAP', 'median', 'consensus' (default: 'VWAP')
- `threshold` (optional): Deviation threshold in points (default: 0.25)
- `bookmakers` (optional): Comma-separated list of bookmakers (default: all)

**Example Request**:
```bash
GET /api/v17/spreads/NBA-2025001/deviation?type=point_spread&period=FULL_GAME&timeRange=last-4h&method=VWAP&threshold=0.25&bookmakers=DraftKings,FanDuel
```

**Example Response**:
```json
{
  "marketId": "NBA-2025001",
  "mainlinePrice": -7.0,
  "mainlineSource": "VWAP:DraftKings,FanDuel",
  "deviationIndex": 0.5,
  "deviationPercentage": 7.14,
  "significantDeviationDetected": true,
  "deviatingNodes": [
    {
      "nodeId": "fd-alt-spread-nba-2025-001",
      "line": -7.5,
      "deviation": 0.5,
      "bookmaker": "FanDuel",
      "exposureLevel": "displayed"
    }
  ],
  "calculationTimestamp": 1704134400000
}
```

#### GET `/api/v17/correlations/query/:marketType`

Complex correlation query with market type parameter.

**Path Parameters**:
- `marketType`: Market type (e.g., 'alternate_spreads', 'point_spread', 'total_points')

**Query Parameters**:
- `bookmaker` (optional): Bookmaker filter
- `period` (optional): Period filter (e.g., 'H1', 'FULL_GAME')
- `minLag` (optional): Minimum temporal lag in milliseconds

**Example Request**:
```bash
GET /api/v17/correlations/query/alternate_spreads?bookmaker=DraftKings&period=H1&minLag=30000
```

**Example Response**:
```json
{
  "marketType": "alternate_spreads",
  "correlations": [
    {
      "sourceNodeId": "nfl-2025-001:DK:ALT_SPREAD:-6.5",
      "targetNodeId": "nfl-2025-001:DK:ALT_SPREAD:-7.5",
      "coefficient": 0.91,
      "p_value": 0.001,
      "temporalLag_ms": 45000,
      "observationCount": 52,
      "lastUpdated": 1733688000000
    }
  ],
  "count": 1,
  "queryAttributes": {
    "sourceMarketType": "alternate_spreads",
    "targetMarketType": "alternate_spreads",
    "sourceBookmaker": "DraftKings",
    "targetBookmaker": "DraftKings",
    "sourcePeriod": "H1",
    "targetPeriod": "H1"
  }
}
```

---

## 6.1.1.2.2.8.1.1.2.8.4 Impact on Existing MLGS Subsystems

### CovertSteamEventDetector

**Enhancement**: Can leverage `CorrelationEngine17` to dynamically update `expected_line_correlation_to_parent` for improved anomaly scoring instead of static heuristics.

**Before**: Static correlation values based on market type rules  
**After**: Dynamic correlations calculated from actual historical data

**Example**:
```typescript
// Old approach: Static heuristic
const expectedCorrelation = marketType === 'TOTAL_POINTS' ? 0.8 : 0.6;

// New approach: Dynamic from CorrelationEngine17
const matrix = await correlationEngine.calculateEventCorrelationMatrix(eventId);
const actualCorrelation = matrix.correlations.find(
  c => c.sourceNodeId === parentNodeId && c.targetNodeId === childNodeId
)?.coefficient || 0.7;
```

### ConcealedArbitrageScanner

**Enhancement**: Can use `temporalLag_ms` from `CorrelationPair` to more accurately predict `average_opportunity_window_ms`, refining arbitrage window estimations.

**Before**: Fixed window estimates (e.g., 5 seconds)  
**After**: Data-driven window estimates based on actual lag patterns

**Example**:
```typescript
// Old approach: Fixed window
const opportunityWindow = 5000; // 5 seconds

// New approach: Data-driven from correlations
const correlation = await correlationEngine.queryCorrelations({
  sourceNodeId: bookmakerA.nodeId,
  targetNodeId: bookmakerB.nodeId
});
const opportunityWindow = correlation[0]?.temporalLag_ms || 5000;
```

### ProductionCircuitBreaker

**Enhancement**: If correlations reveal that a particular bookmaker's API is consistently lagging (`temporalLag_ms` is high) or exhibiting erratic correlation (`coefficient` is volatile), this could be a factor in adjusting load shedding or failure thresholds for that bookmaker.

**Example**:
```typescript
// Analyze bookmaker performance via correlations
const bookmakerCorrelations = await correlationEngine.queryCorrelations({
  sourceBookmaker: 'BOOKMAKER_X'
});

const avgLag = bookmakerCorrelations.reduce((sum, c) => sum + c.temporalLag_ms, 0) / bookmakerCorrelations.length;
const lagVolatility = calculateStandardDeviation(bookmakerCorrelations.map(c => c.temporalLag_ms));

if (avgLag > 10000 || lagVolatility > 5000) {
  // Adjust circuit breaker thresholds
  circuitBreaker.adjustThresholds({ maxLatency: avgLag * 2 });
}
```

### Predictive Anomaly Pattern Modeling

**Enhancement**: `CorrelationPair`s become a rich feature set for machine learning models, allowing them to detect subtle shifts in market behavior patterns.

**Features**:
- Correlation coefficients as features
- Temporal lags as temporal features
- P-values as confidence indicators
- Observation counts as data quality metrics

**Example**:
```typescript
// ML model features from correlations
const features = {
  correlation_coefficient: pair.coefficient,
  temporal_lag: pair.temporalLag_ms,
  statistical_significance: 1 - pair.p_value,
  data_quality: Math.min(pair.observationCount / 100, 1.0),
  exposure_level_combo: `${pair.sourceExposureLevel}_${pair.targetExposureLevel}`
};

const anomalyScore = mlModel.predict(features);
```

---

## Statistical Methods

### Pearson Correlation

**Use Case**: Linear relationships between continuous variables  
**Formula**: `r = Σ(xi - x̄)(yi - ȳ) / √(Σ(xi - x̄)² × Σ(yi - ȳ)²)`  
**Range**: -1.0 to 1.0

### Spearman Correlation

**Use Case**: Monotonic relationships (non-linear but consistently increasing/decreasing)  
**Method**: Rank-based correlation  
**Range**: -1.0 to 1.0

### Kendall Correlation

**Use Case**: Ordinal relationships, robust to outliers  
**Method**: Concordance-based correlation  
**Range**: -1.0 to 1.0

### Temporal Lag Detection

**Method**: Cross-correlation analysis  
**Process**:
1. Calculate line movement deltas for source and target nodes
2. Try different temporal lags (from -maxLag to +maxLag)
3. Align movements with each lag value
4. Calculate correlation for each lag
5. Select lag with maximum absolute correlation

**Interpretation**:
- Positive `temporalLag_ms`: Source leads target (source moves first)
- Negative `temporalLag_ms`: Target leads source (target moves first)
- Zero `temporalLag_ms`: Simultaneous movement

---

## Performance Characteristics

### Calculation Complexity

- **Time Complexity**: O(n² × m × l) where:
  - n = number of nodes
  - m = average movements per node
  - l = number of lag steps tested
- **Space Complexity**: O(n × m) for movement storage

### Optimization Strategies

1. **Early Termination**: Skip pairs with insufficient data
2. **Parallel Processing**: Calculate correlations in parallel for independent pairs
3. **Caching**: Store calculated correlations to avoid recalculation
4. **Sampling**: Use statistical sampling for large node sets

---

## Database Schema

### correlation_pairs Table

```sql
CREATE TABLE correlation_pairs (
  pairId TEXT PRIMARY KEY,
  eventId TEXT NOT NULL,
  sourceNodeId TEXT NOT NULL,
  targetNodeId TEXT NOT NULL,
  coefficient REAL NOT NULL,
  p_value REAL NOT NULL,
  temporalLag_ms INTEGER NOT NULL,
  observationCount INTEGER NOT NULL,
  calculationMethod TEXT DEFAULT 'pearson',
  sourceExposureLevel TEXT,
  targetExposureLevel TEXT,
  lastUpdated INTEGER NOT NULL,
  createdAt INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_correlation_event ON correlation_pairs(eventId);
CREATE INDEX idx_correlation_source ON correlation_pairs(sourceNodeId);
CREATE INDEX idx_correlation_target ON correlation_pairs(targetNodeId);
CREATE INDEX idx_correlation_coeff ON correlation_pairs(coefficient);
CREATE INDEX idx_correlation_updated ON correlation_pairs(lastUpdated DESC);
```

---

## Related Documentation

- [MarketDataRouter17 Complete Documentation](./MARKET-DATA-ROUTER-17-COMPLETE.md)
- [Shadow Graph System](./SHADOW-GRAPH-SYSTEM.md)
- [MLGS Architecture](./docs/MLGS-ARCHITECTURE.md)

---

**Last Updated**: 2025-12-08  
**Status**: ✅ Implemented & Integrated
