# Advanced Detection System for Shadow-Graph

**Status: 🔬 Advanced Detection Live | RLM Tracking Active | Derivative Analysis Running**

## Overview

The Advanced Detection System extends the shadow-graph system with sophisticated detection and analysis capabilities for identifying hidden edges, sharp money movements, and arbitrage opportunities across sports betting markets.

## Components

### 1. Reverse Line Movement Detection (1.1.1.1.2.1.x)

**Component**: `ReverseLineMovementDetector`

Detects sharp money disguised as public action when the line moves opposite to public betting.

- **1.1.1.1.2.1.1**: Reverse-Line-Movement Detector
- **1.1.1.1.2.1.2**: Public-Betting Data Schema
- **1.1.1.1.2.1.3**: RLM Correlation Score
- **1.1.1.1.2.1.4**: Sharp-Contrarian Indicator
- **1.1.1.1.2.1.5**: Execution-Time-Window Filter
- **1.1.1.1.2.1.6**: Multi-Bookmaker RLM Sync
- **1.1.1.1.2.1.7**: Research Alert YAML Config

**Usage**:
```typescript
const detector = new ReverseLineMovementDetector(db);
const rlm = await detector.detectRLM(eventId, nodeId);
if (rlm.isRLM) {
  console.log(`Sharp side: ${rlm.sharpSide}, Confidence: ${rlm.confidence}`);
}
```

### 2. Steam Origination Graph (1.1.1.1.2.2.x)

**Component**: `SteamOriginationGraph`

Tracks where steam moves originate and how they propagate across bookmakers.

- **1.1.1.1.2.2.1**: Steam-Move Origination Graph
- **1.1.1.1.2.2.2**: First-Mover Identification
- **1.1.1.1.2.2.3**: Propagation Cascade Timer
- **1.1.1.1.2.2.4**: Bookmaker Latency Ranking
- **1.1.1.1.2.2.5**: Aggressor Bookmaker Signature
- **1.1.1.1.2.2.6**: Cross-Event Steam Clustering
- **1.1.1.1.2.2.7**: Origination Confidence Score

**Usage**:
```typescript
const graph = new SteamOriginationGraph(db);
const origin = await graph.buildOriginationGraph(eventId);
console.log(`Aggressor: ${origin.aggressor}, Cascade: ${origin.cascade.size} nodes`);
```

### 3. Derivative Market Correlator (1.1.1.1.2.3.x)

**Component**: `DerivativeMarketCorrelator`

Detects correlations between derivative markets (e.g., player props → team totals).

- **1.1.1.1.2.3.1**: Derivative-Market Correlator
- **1.1.1.1.2.3.2**: Player-Prop → Team-Total Edge
- **1.1.1.1.2.3.3**: Quarter→Full-Game Propagation
- **1.1.1.1.2.3.4**: Injury News Impact Factor
- **1.1.1.1.2.3.5**: Correlation Break Detection
- **1.1.1.1.2.3.6**: Statistical Significance Test
- **1.1.1.1.2.3.7**: Auto-Hedge Recommendation

**Usage**:
```typescript
const correlator = new DerivativeMarketCorrelator(db);
const corr = await correlator.detectDerivativeCorrelation(playerPropNodeId, teamTotalNodeId);
if (corr.correlationBreak) {
  const hedge = await correlator.generateHedgeRecommendation(playerPropNodeId, teamTotalNodeId);
}
```

### 4. Temporal Pattern Engine (1.1.1.1.2.4.x)

**Component**: `TemporalPatternEngine`

Analyzes temporal patterns in hidden steam and market movements.

- **1.1.1.1.2.4.1**: Temporal-Pattern Recognition Engine
- **1.1.1.1.2.4.2**: Time-of-Day Steam Probability
- **1.1.1.1.2.4.3**: Day-of-Week Pattern Matrix
- **1.1.1.1.2.4.4**: Pre-Game Countdown Analysis
- **1.1.1.1.2.4.5**: Halftime Steam Cluster
- **1.1.1.1.2.4.6**: Circadian Rhythm Adjustor
- **1.1.1.1.2.4.7**: Pattern Deviation Alert

**Usage**:
```typescript
const engine = new TemporalPatternEngine(db);
const patterns = await engine.analyzeTemporalPatterns(eventId);
const adjustedThreshold = engine.adjustDetectionThreshold(baseThreshold, patterns);
```

### 5. Cross-Sport Arbitrage (1.1.1.1.2.5.x)

**Component**: `CrossSportArbitrage`

Finds hidden edges across sports (shared players, weather, futures).

- **1.1.1.1.2.5.1**: Cross-Sport Arbitrage Matrix
- **1.1.1.1.2.5.2**: Correlated Event Discovery
- **1.1.1.1.2.5.3**: Shared-Player Prop Link
- **1.1.1.1.2.5.4**: Weather-Derived Edges
- **1.1.1.1.2.5.5**: Championship Futures Hedge
- **1.1.1.1.2.5.6**: Cross-Sport Liquidity Weighting
- **1.1.1.1.2.5.7**: Simultaneous Execution Manager

**Usage**:
```typescript
const crossSport = new CrossSportArbitrage(db);
const edges = await crossSport.findCrossSportEdges("LeBron James");
const results = await crossSport.executeSimultaneous(edges.filter(e => e.arbOpportunity));
```

### 6. Limit Order Book Reconstructor (1.1.1.1.2.6.x)

**Component**: `LimitOrderBookReconstructor`

Reconstructs hidden order book from micro-movements and trade patterns.

- **1.1.1.1.2.6.1**: Limit-Order-Book Reconstructor
- **1.1.1.1.2.6.2**: Micro-Movement Sequence
- **1.1.1.1.2.6.3**: Bid-Ask Spread Analyzer
- **1.1.1.1.2.6.4**: Iceberg Order Detection
- **1.1.1.1.2.6.5**: Bookmaker Order-Fill Pattern
- **1.1.1.1.2.6.6**: Synthetic Order-Book Generation
- **1.1.1.1.2.6.7**: Depth-Weighted Fair Price

**Usage**:
```typescript
const reconstructor = new LimitOrderBookReconstructor(db);
const lob = await reconstructor.reconstructLOB(nodeId);
console.log(`Fair Price: ${lob.fairPrice}, Imbalance: ${lob.imbalance}`);
```

### 7. Behavioral Pattern Classifier (1.1.1.1.2.7.x)

**Component**: `BehavioralPatternClassifier`

Classifies betting patterns as bot vs human, detects evasion patterns.

- **1.1.1.1.2.7.1**: Behavioral Pattern Classifier
- **1.1.1.1.2.7.2**: Bot-vs-Human Signature
- **1.1.1.1.2.7.3**: Rate-Limit Trigger Pattern
- **1.1.1.1.2.7.4**: Bet Sizing Distribution
- **1.1.1.1.2.7.5**: Session Fingerprinting
- **1.1.1.1.2.7.6**: Bookmaker Bot-Detection Evasion
- **1.1.1.1.2.7.7**: Behavioral Edge Scoring

**Usage**:
```typescript
const classifier = new BehavioralPatternClassifier(db);
const classification = classifier.classifyBet({
  size: 5000,
  executionTime: 50,
  ipHash: "abc123",
  userAgent: "Mozilla/5.0..."
});
const recommendations = classifier.generateEvasionRecommendations(classification);
```

## MCP Tools

All components are accessible via MCP tools:

- `research-detect-rlm` - Detect reverse line movement
- `research-analyze-steam-origin` - Identify steam originator
- `research-calc-derivative-correlation` - Calculate derivative correlation
- `research-analyze-temporal-patterns` - Analyze temporal patterns
- `research-find-cross-sport-edges` - Find cross-sport edges
- `research-reconstruct-lob` - Reconstruct limit order book
- `research-classify-behavioral-pattern` - Classify behavioral patterns

## Database Schema

New tables added:

- `public_betting_data` - Public betting percentages for RLM detection
- `temporal_patterns` - Historical temporal pattern data
- `hidden_steam_events` - Hidden steam event tracking
- `cross_event_correlations` - Cross-event correlation data
- `behavioral_signatures` - Behavioral pattern signatures
- `bet_requests` - Bet request tracking for rate limiting

## Integration

The `AdvancedResearchOrchestrator` coordinates all components:

```typescript
const orchestrator = new AdvancedResearchOrchestrator(db);
const report = await orchestrator.analyzeEvent(eventId);
```

This generates a comprehensive research report including:
- Hidden steam events
- Reverse line movements
- Steam origination analysis
- Derivative market edges
- Temporal context
- LOB imbalance
- Behavioral signatures

## Alert System

Alert definitions are configured in `config/advanced-research-alerts.yaml`:

- `rlm_critical` - Critical RLM detection
- `steam_origin_detected` - Steam origination alerts
- `derivative_correlation_break` - Correlation break alerts
- `temporal_pattern_deviation` - Pattern deviation alerts
- `behavioral_bot_detected` - Bot detection alerts
- `cross_sport_arb_opportunity` - Cross-sport arbitrage alerts
- `lob_imbalance_extreme` - LOB imbalance alerts

## Status

✅ All 7 component categories implemented
✅ Database schema extended
✅ MCP tools integrated
✅ Alert system configured
✅ Research orchestrator created

**Next Steps**:
- Integrate with main shadow-graph orchestrator
- Add real-time monitoring loops
- Implement data collection pipelines
- Build visualization dashboard
