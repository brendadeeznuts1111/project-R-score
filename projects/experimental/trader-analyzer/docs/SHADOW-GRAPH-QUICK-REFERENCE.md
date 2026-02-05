# Shadow Graph System - Quick Reference Guide

**Version**: 1.1.1.1.1.0.0  
**Last Updated**: 2025-01-XX

---

## 🚀 Quick Start

### Core Components

| Component | Version | File | Purpose |
|-----------|--------|------|---------|
| **Shadow Graph Builder** | 1.1.1.1.1.2.0 | `src/arbitrage/shadow-graph/shadow-graph-builder.ts` | Build shadow graphs from market data |
| **Hidden Steam Detector** | 1.1.1.1.1.3.0 | `src/arbitrage/shadow-graph/hidden-steam-detector.ts` | Detect sharp money movements |
| **Shadow Arbitrage Scanner** | 1.1.1.1.1.5.0 | `src/arbitrage/shadow-graph/shadow-arb-scanner.ts` | Find hidden arbitrage opportunities |
| **Alert System** | 1.1.1.1.1.6.0 | `src/arbitrage/shadow-graph/alert-system.ts` | Process alerts and notifications |
| **Advanced Research Orchestrator** | 1.1.1.1.2.0.0 | `src/arbitrage/shadow-graph/advanced-research-orchestrator.ts` | Coordinate all detection components |

---

## 📋 Research Scripts

### Nightly Covert Steam Scan (1.1.1.1.1.8.1)

```bash
bun run scripts/research-scan-covert-steam-events.ts \
  --sport_category=all \
  --minimum_severity_score=7 \
  --output=/var/log/hyper-bun/covert-steam-nightly.jsonl.zst \
  --enable_alerts=true
```

**Cron**: `0 2 * * *` (daily at 2 AM)

### Weekly Shadow Market Graph (1.1.1.1.1.8.2)

```bash
bun run scripts/research-generate-shadow-market-graph.ts \
  --event_identifier=all-nfl \
  --analyze=arbitrage,latency,comprehensive \
  --use_orchestrator=true \
  --enable_alerts=true
```

**Cron**: `0 4 * * 0` (weekly on Sunday at 4 AM)

### Deceptive Line Detection (1.1.1.1.1.8.3)

```bash
bun run scripts/research-identify-deceptive-lines.ts \
  --bookmaker_name=DraftKings \
  --event_identifier=nfl-2025-001 \
  --probe_activation=true
```

### Auto-Trader (1.1.1.1.1.8.4)

```bash
# Paper trading (simulation)
bun run scripts/research-auto-covert-arb-trader.ts \
  --minimum_profit_percentage=0.02 \
  --maximum_risk_usd=1000 \
  --trade_mode=paper \
  --enable_alerts=true

# Live trading (⚠️ executes real trades)
bun run scripts/research-auto-covert-arb-trader.ts \
  --minimum_profit_percentage=0.02 \
  --maximum_risk_usd=1000 \
  --trade_mode=live \
  --enable_alerts=true
```

---

## 🔍 Advanced Detection Components

### Reverse Line Movement (1.1.1.1.2.1.x)

```typescript
import { ReverseLineMovementDetector } from './src/arbitrage/shadow-graph/reverse-line-movement-detecto🆕r';

const detector = new ReverseLineMovementDetector(db);
// const rlm = await detector.detectRLM(eventId, nodeId);
if (rlm.isRLM) {
  console.log(`Sharp side: ${rlm.sharpSide}, Confidence: ${rlm.confidence}`);
}
```

### Steam Origination Graph (1.1.1.1.2.2.x)

```typescript
import { SteamOriginationGraph } from './src/arbitrage/shadow-graph/steam-origination-graph';

const graph = new SteamOriginationGraph(db);
const origin = await graph.buildOriginationGraph(eventId);
console.log(`Aggressor: ${origin.aggressor}, Cascade: ${origin.cascade.size} nodes`);
```

### Derivative Market Correlator (1.1.1.1.2.3.x)

```typescript
import { DerivativeMarketCorrelator } from './src/arbitrage/shadow-graph/derivative-market-correlator';

const correlator = new DerivativeMarketCorrelator(db);
const corr = await correlator.detectDerivativeCorrelation(playerPropNodeId, teamTotalNodeId);
if (corr.correlationBreak) {
  const hedge = await correlator.generateHedgeRecommendation(playerPropNodeId, teamTotalNodeId);
}
```

### Temporal Pattern Engine (1.1.1.1.2.4.x)

```typescript
import { TemporalPatternEngine } from './src/arbitrage/shadow-graph/temporal-pattern-engine';

const engine = new TemporalPatternEngine(db);
const patterns = await engine.analyzeTemporalPatterns(eventId);
const adjustedThreshold = engine.adjustDetectionThreshold(baseThreshold, patterns);
```

### Cross-Sport Arbitrage (1.1.1.1.2.5.x)

```typescript
import { CrossSportArbitrage } from './src/arbitrage/shadow-graph/cross-sport-arbitrage';

const crossSport = new CrossSportArbitrage(db);
const edges = await crossSport.findCrossSportEdges("LeBron James");
```

### Limit Order Book Reconstructor (1.1.1.1.2.6.x)

```typescript
import { LimitOrderBookReconstructor } from './src/arbitrage/shadow-graph/limit-order-book-reconstructor';

const lob = new LimitOrderBookReconstructor(db);
const orderBook = await lob.reconstructLOB(nodeId);
console.log(`Fair price: ${orderBook.fairPrice}, Imbalance: ${orderBook.imbalance}`);
```

### Behavioral Pattern Classifier (1.1.1.1.2.7.x)

```typescript
import { BehavioralPatternClassifier } from './src/arbitrage/shadow-graph/behavioral-pattern-classifier';

const classifier = new BehavioralPatternClassifier(db);
const signature = await classifier.classifyBehavior(nodeId);
console.log(`Is bot: ${signature.isBot}, Confidence: ${signature.confidence}`);
```

---

## 🎯 Comprehensive Analysis

### Using AdvancedResearchOrchestrator

```typescript
import { AdvancedResearchOrchestrator } from './src/arbitrage/shadow-graph/advanced-research-orchestrator';
import { Database } from 'bun:sqlite';

const db = new Database('./data/research.db');
const orchestrator = new AdvancedResearchOrchestrator(db);

const report = await orchestrator.analyzeEvent('nfl-2025-001');

console.log(`Hidden Steam Events: ${report.hiddenSteam.length}`);
console.log(`RLM Detections: ${report.reverseLineMoves.length}`);
console.log(`Steam Origin: ${report.steamOrigin?.aggressor}`);
console.log(`Derivative Edges: ${report.derivativeEdges.length}`);
```

---

## 📊 Alert Configuration

### YAML Alert Rules

**File**: `config/advanced-research-alerts.yaml`

```yaml
alert_system:
  alerts:
    - name: rlm_critical
      rule_type: reverse_line_movement
      priority: critical
      params:
        min_confidence: 0.8
        min_severity: 9
      evaluator: |
        (context) => {
          return context.confidence >= context.min_confidence && 
                 context.severity >= context.min_severity;
        }
      actions:
        - type: notify_trader
          params:
            message: "Critical RLM detected: {sharpSide} with {confidence} confidence"
```

---

## 🔗 API Endpoints

### Public API (500ms delay)

- `GET /api/public/markets/:eventId` - Public market data
- `GET /api/public/events` - Public event listings

### Dark API (Real-time <50ms)

- `GET /api/internal/shadow-graph/:eventId` - Real-time shadow graph
- `GET /api/internal/shadow-graph/nodes/:nodeId` - Real-time node data
- `WS /api/internal/shadow-graph/stream` - WebSocket stream

---

## 📚 Documentation Links

| Document | Description |
|----------|-------------|
| [SHADOW-GRAPH-SYSTEM.md](./SHADOW-GRAPH-SYSTEM.md) | Complete system architecture (63 components) |
| [ADVANCED-DETECTION-SYSTEM.md](./ADVANCED-DETECTION-SYSTEM.md) | Advanced detection components (49 components) |
| [RESEARCH-SCRIPTS-INTEGRATION.md](./RESEARCH-SCRIPTS-INTEGRATION.md) | Research scripts integration guide |
| [SHADOW-GRAPH-COMPLETE-HIERARCHY.md](./SHADOW-GRAPH-COMPLETE-HIERARCHY.md) | Complete hierarchical reference (112+ components) |
| [SHADOW-GRAPH-IMPLEMENTATION-VERIFICATION.md](./SHADOW-GRAPH-IMPLEMENTATION-VERIFICATION.md) | Implementation verification report |

---

## 🔍 Verification Commands

```bash
# Verify all components exist
rg "1\.1\.1\.1\.1\.(8|9)\." src/ scripts/ docs/
rg "1\.1\.1\.1\.2\." src/arbitrage/shadow-graph/

# Verify research scripts
rg "research-scan-covert-steam|research-generate-shadow-market|research-identify-deceptive|research-auto-covert-arb" scripts/

# Verify advanced detection components
rg "ReverseLineMovementDetector|SteamOriginationGraph|DerivativeMarketCorrelator|TemporalPatternEngine|CrossSportArbitrage|LimitOrderBookReconstructor|BehavioralPatternClassifier" src/arbitrage/shadow-graph/

# Verify orchestrator integration
rg "AdvancedResearchOrchestrator" src/arbitrage/shadow-graph/
```

---

## 📈 Component Statistics

- **Total Components**: 112+
  - Core Shadow Graph System: 63 components (1.1.1.1.1.x.x)
  - Advanced Detection System: 49 components (1.1.1.1.2.x.x)
- **Implementation Status**: ✅ 100% Complete
- **Documentation Status**: ✅ 100% Complete
- **Integration Status**: ✅ 100% Complete

---

## 🎓 Key Concepts

### Shadow Graph
A graph representation of markets where nodes represent markets and edges represent relationships with correlation and latency metrics. Nodes can have visibility states: DISPLAY, API_ONLY, or DARK.

### Hidden Steam
Sharp money movements that occur in dark/API-only markets before becoming visible in the UI. Detected by monitoring correlation deviations and latency gaps.

### Reverse Line Movement (RLM)
When public betting heavily favors one side but the line moves in the opposite direction, indicating sharp money on the contrarian side.

### Shadow Arbitrage
Arbitrage opportunities that exist between visible and hidden markets, requiring API access to detect and execute.

### Bait Lines
Fake odds displayed in the UI that are not actually tradable, designed to trap traders.

---

## 🚨 Common Tasks

### Build Shadow Graph for Event

```typescript
import { ShadowMarketProber } from './src/arbitrage/shadow-graph/shadow-graph-builder';

const prober = new ShadowMarketProber(db);
const graph = await prober.probeAllSubMarkets('nfl-2025-001');
console.log(`Nodes: ${graph.nodes.length}, Edges: ${graph.edges.length}`);
```

### Scan for Arbitrage

```typescript
import { ShadowArbitrageScanner } from './src/arbitrage/shadow-graph/shadow-arb-scanner';

const scanner = new ShadowArbitrageScanner(db);
const opportunities = await scanner.scanShadowArb(graph);
console.log(`Found ${opportunities.length} arbitrage opportunities`);
```

### Monitor Hidden Steam

```typescript
import { ShadowSteamDetector } from './src/arbitrage/shadow-graph/hidden-steam-detector';

const detector = new ShadowSteamDetector(db);
const events = await detector.monitorHiddenSteam(visibleNodes, hiddenNodes, historicalData);
console.log(`Detected ${events.length} hidden steam events`);
```

---

## 📞 Support

For detailed documentation, see:
- [SHADOW-GRAPH-SYSTEM.md](./SHADOW-GRAPH-SYSTEM.md) - Complete system documentation
- [SHADOW-GRAPH-COMPLETE-HIERARCHY.md](./SHADOW-GRAPH-COMPLETE-HIERARCHY.md) - Component reference
- [SHADOW-GRAPH-IMPLEMENTATION-VERIFICATION.md](./SHADOW-GRAPH-IMPLEMENTATION-VERIFICATION.md) - Verification report

---

**Status**: ✅ Production Ready  
**Last Updated**: 2025-01-XX

