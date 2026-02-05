# Shadow Graph System - Naming Conventions & Enhancement Guide

**Version**: 1.1.1.1.1.0.0  
**Last Updated**: 2025-01-XX

---

## 📋 Naming Standards

### File Names

**Pattern**: `kebab-case` with descriptive prefixes

**Prefixes**:
- `shadow-graph-*` - Core shadow graph system files
- `shadow-*` - Shadow-specific components (e.g., `shadow-arb-scanner.ts`)
- `*-detector.ts` - Detection components (e.g., `hidden-steam-detector.ts`)
- `*-correlator.ts` - Correlation components (e.g., `derivative-market-correlator.ts`)
- `*-orchestrator.ts` - Orchestration components (e.g., `advanced-research-orchestrator.ts`)
- `*-analyzer.ts` - Analysis components (e.g., `edge-reliability-analyzer.ts`)
- `*-predictor.ts` - Prediction components (e.g., `hidden-node-predictor.ts`)
- `*-engine.ts` - Engine components (e.g., `temporal-pattern-engine.ts`)
- `*-scanner.ts` - Scanning components (e.g., `shadow-arb-scanner.ts`)
- `*-classifier.ts` - Classification components (e.g., `behavioral-pattern-classifier.ts`)
- `*-reconstructor.ts` - Reconstruction components (e.g., `limit-order-book-reconstructor.ts`)
- `multi-layer-*` - Multi-layer correlation system files
- `dod-*` - DoD-grade components (e.g., `dod-multi-layer-engine.ts`)

**Examples**:
- ✅ `shadow-graph-builder.ts`
- ✅ `hidden-steam-detector.ts`
- ✅ `reverse-line-movement-detector.ts`
- ✅ `advanced-research-orchestrator.ts`
- ❌ `shadowGraphBuilder.ts` (PascalCase)
- ❌ `hidden_steam_detector.ts` (snake_case)

---

### Class Names

**Pattern**: `PascalCase` with descriptive suffixes

**Suffixes**:
- `*Detector` - Detection classes (e.g., `ShadowSteamDetector`)
- `*Correlator` - Correlation classes (e.g., `DerivativeMarketCorrelator`)
- `*Orchestrator` - Orchestration classes (e.g., `AdvancedResearchOrchestrator`)
- `*Analyzer` - Analysis classes (e.g., `EdgeReliabilityAnalyzer`)
- `*Predictor` - Prediction classes (e.g., `HiddenNodePredictor`)
- `*Engine` - Engine classes (e.g., `TemporalPatternEngine`)
- `*Scanner` - Scanning classes (e.g., `ShadowArbitrageScanner`)
- `*Classifier` - Classification classes (e.g., `BehavioralPatternClassifier`)
- `*Reconstructor` - Reconstruction classes (e.g., `LimitOrderBookReconstructor`)
- `*Prober` - Probing classes (e.g., `ShadowMarketProber`)
- `*Graph` - Graph classes (e.g., `SteamOriginationGraph`)
- `*System` - System classes (e.g., `ShadowGraphAlertSystem`)

**Examples**:
- ✅ `ShadowSteamDetector`
- ✅ `ReverseLineMovementDetector`
- ✅ `AdvancedResearchOrchestrator`
- ✅ `ShadowMarketProber`
- ❌ `shadowSteamDetector` (camelCase)
- ❌ `Shadow_Steam_Detector` (snake_case)

---

### Interface Names

**Pattern**: `PascalCase` with descriptive suffixes

**Suffixes**:
- `*Result` - Result interfaces (e.g., `RLMDetectionResult`)
- `*Data` - Data interfaces (e.g., `PublicBettingData`)
- `*Config` - Configuration interfaces (e.g., `CorrelationConfig`)
- `*Options` - Options interfaces (e.g., `CircuitBreakerOptions`)
- `*Report` - Report interfaces (e.g., `ResearchReport`)
- `*Analysis` - Analysis interfaces (e.g., `EdgeReliabilityAnalysis`)
- `*Score` - Score interfaces (e.g., `BehavioralEdgeScore`)
- `*Recommendation` - Recommendation interfaces (e.g., `HedgeRecommendation`)
- `*Opportunity` - Opportunity interfaces (e.g., `ShadowArbitrageOpportunity`)
- `*Event` - Event interfaces (e.g., `HiddenSteamEvent`)
- `*Edge` - Edge interfaces (e.g., `ShadowEdge`, `CrossSportEdge`)
- `*Node` - Node interfaces (e.g., `ShadowNode`)
- `*Graph` - Graph interfaces (e.g., `ShadowGraph`)

**Examples**:
- ✅ `ShadowNode`
- ✅ `RLMDetectionResult`
- ✅ `SteamOriginationResult`
- ✅ `DerivativeCorrelationResult`
- ❌ `shadowNode` (camelCase)
- ❌ `rlm_detection_result` (snake_case)

---

### Type Names

**Pattern**: `PascalCase` with descriptive suffixes

**Suffixes**:
- `*Type` - Type aliases (e.g., `LayerType`, `SportType`, `MarketType`)
- `*State` - State types (e.g., `CircuitState`)
- `*Status` - Status types (e.g., `HealthStatus`)

**Examples**:
- ✅ `NodeVisibility` (enum)
- ✅ `LayerType` (type alias)
- ✅ `CircuitState` (type alias)
- ❌ `nodeVisibility` (camelCase)
- ❌ `layer_type` (snake_case)

---

### Property Names

**Pattern**: `camelCase` with descriptive prefixes/suffixes

**Prefixes**:
- `is*` - Boolean flags (e.g., `isBaitLine`, `isRLM`)
- `has*` - Boolean flags (e.g., `hasHiddenLiquidity`)
- `can*` - Boolean capabilities (e.g., `canExecute`)
- `should*` - Boolean conditions (e.g., `shouldAlert`)

**Suffixes**:
- `*Id` - Identifier properties (e.g., `nodeId`, `eventId`)
- `*At` - Timestamp properties (e.g., `detectedAt`, `lastUpdated`)
- `*Ms` - Millisecond properties (e.g., `latencyMs`)
- `*Count` - Count properties (e.g., `baitDetectionCount`)
- `*Score` - Score properties (e.g., `confidenceScore`, `severityScore`)
- `*Percent` - Percentage properties (e.g., `ticketPercent`, `moneyPercent`)
- `*Rate` - Rate properties (e.g., `propagationRate`)
- `*Size` - Size properties (e.g., `cascadeSize`)

**Examples**:
- ✅ `nodeId`
- ✅ `displayedLiquidity`
- ✅ `isBaitLine`
- ✅ `lastUpdated`
- ✅ `latencyMs`
- ✅ `confidenceScore`
- ❌ `node_id` (snake_case)
- ❌ `NodeId` (PascalCase)
- ❌ `is_bait_line` (snake_case)

---

### Function Names

**Pattern**: `camelCase` with verb prefixes

**Prefixes**:
- `generate*` - Generation functions (e.g., `generateShadowNodeId`)
- `create*` - Creation functions (e.g., `createResearchReportSender`)
- `build*` - Building functions (e.g., `buildOriginationGraph`)
- `detect*` - Detection functions (e.g., `detectRLM`)
- `scan*` - Scanning functions (e.g., `scanShadowArb`)
- `analyze*` - Analysis functions (e.g., `analyzeTemporalPatterns`)
- `calculate*` - Calculation functions (e.g., `calculateSeverityScore`)
- `classify*` - Classification functions (e.g., `classifySharpMoney`)
- `probe*` - Probing functions (e.g., `probeAllSubMarkets`)
- `monitor*` - Monitoring functions (e.g., `monitorHiddenSteam`)
- `reconstruct*` - Reconstruction functions (e.g., `reconstructLOB`)
- `find*` - Finding functions (e.g., `findCrossSportEdges`)
- `get*` - Getter functions (e.g., `getTelegramClient`)
- `set*` - Setter functions (e.g., `setAlertThreshold`)

**Examples**:
- ✅ `generateShadowNodeId`
- ✅ `detectRLM`
- ✅ `buildOriginationGraph`
- ✅ `monitorHiddenSteam`
- ❌ `GenerateShadowNodeId` (PascalCase)
- ❌ `generate_shadow_node_id` (snake_case)

---

### Constant Names

**Pattern**: `UPPER_SNAKE_CASE` for module-level constants

**Examples**:
- ✅ `LAG_THRESHOLD_MS`
- ✅ `DEVIATION_THRESHOLD`
- ✅ `RLM_THRESHOLD`
- ✅ `MIN_PUBLIC_PERCENT`
- ❌ `lagThresholdMs` (camelCase)
- ❌ `LagThresholdMs` (PascalCase)

---

### Enum Names

**Pattern**: `PascalCase` with `UPPER_SNAKE_CASE` values

**Examples**:
- ✅ `NodeVisibility.DISPLAY`
- ✅ `NodeVisibility.API_ONLY`
- ✅ `NodeVisibility.DARK`
- ❌ `nodeVisibility.display` (camelCase)
- ❌ `NodeVisibility.Display` (PascalCase values)

---

## 🔄 Proposed Enhancements

### File Name Enhancements

| Current | Enhanced | Reason |
|---------|----------|--------|
| `orchestrator.ts` | `shadow-graph-orchestrator.ts` | More descriptive, matches prefix pattern |
| `database.ts` | `shadow-graph-database.ts` | More descriptive, matches prefix pattern |
| `constants.ts` | `shadow-graph-constants.ts` | More descriptive, matches prefix pattern |
| `case-study.ts` | `shadow-graph-case-study.ts` | More descriptive, matches prefix pattern |
| `index.ts` | `shadow-graph-index.ts` | More descriptive, matches prefix pattern |

### Class Name Enhancements

| Current | Enhanced | Reason |
|---------|----------|--------|
| `ShadowMarketProber` | `ShadowGraphMarketProber` | More consistent with `ShadowGraph*` prefix |
| `ShadowSteamDetector` | `ShadowGraphSteamDetector` | More consistent with `ShadowGraph*` prefix |
| `ShadowArbitrageScanner` | `ShadowGraphArbitrageScanner` | More consistent with `ShadowGraph*` prefix |
| `ShadowGraphAlertSystem` | ✅ Already optimal | No change needed |
| `ShadowGraphOrchestrator` | ✅ Already optimal | No change needed |

### Interface Name Enhancements

| Current | Enhanced | Reason |
|---------|----------|--------|
| `ShadowNode` | ✅ Already optimal | No change needed |
| `ShadowEdge` | ✅ Already optimal | No change needed |
| `ShadowGraph` | ✅ Already optimal | No change needed |
| `HiddenSteamEvent` | `ShadowGraphHiddenSteamEvent` | More descriptive, matches domain |
| `ShadowArbEntry` | `ShadowGraphArbitrageEntry` | More descriptive, clearer abbreviation |
| `ShadowArbMatrix` | `ShadowGraphArbitrageMatrix` | More descriptive, clearer abbreviation |

### Property Name Enhancements

| Current | Enhanced | Reason |
|---------|----------|--------|
| `nodeId` | ✅ Already optimal | No change needed |
| `eventId` | ✅ Already optimal | No change needed |
| `marketId` | ✅ Already optimal | No change needed |
| `displayedLiquidity` | ✅ Already optimal | No change needed |
| `hiddenLiquidity` | ✅ Already optimal | No change needed |
| `reservedLiquidity` | ✅ Already optimal | No change needed |
| `lastOdds` | `lastOddsPrice` | More descriptive |
| `lastProbeSuccess` | `lastProbeSuccessStatus` | More descriptive |
| `baitDetectionCount` | ✅ Already optimal | No change needed |
| `parentNodeId` | ✅ Already optimal | No change needed |
| `lastUpdated` | `lastUpdatedTimestamp` | More descriptive |
| `latencyMs` | ✅ Already optimal | No change needed |
| `propagationRate` | ✅ Already optimal | No change needed |

---

## 📝 Implementation Priority

### High Priority (Breaking Changes)

1. **File Renames**:
   - `orchestrator.ts` → `shadow-graph-orchestrator.ts`
   - `database.ts` → `shadow-graph-database.ts`
   - `constants.ts` → `shadow-graph-constants.ts`
   - `case-study.ts` → `shadow-graph-case-study.ts`

2. **Class Renames**:
   - `ShadowMarketProber` → `ShadowGraphMarketProber`
   - `ShadowSteamDetector` → `ShadowGraphSteamDetector`
   - `ShadowArbitrageScanner` → `ShadowGraphArbitrageScanner`

### Medium Priority (Non-Breaking)

1. **Interface Renames**:
   - `HiddenSteamEvent` → `ShadowGraphHiddenSteamEvent`
   - `ShadowArbEntry` → `ShadowGraphArbitrageEntry`
   - `ShadowArbMatrix` → `ShadowGraphArbitrageMatrix`

2. **Property Enhancements**:
   - `lastOdds` → `lastOddsPrice`
   - `lastProbeSuccess` → `lastProbeSuccessStatus`
   - `lastUpdated` → `lastUpdatedTimestamp`

### Low Priority (Documentation Only)

1. Update documentation to reflect naming conventions
2. Add JSDoc comments with naming examples
3. Create linting rules to enforce conventions

---

## ✅ Current Best Practices

### Already Following Conventions

- ✅ File names use `kebab-case`
- ✅ Class names use `PascalCase`
- ✅ Interface names use `PascalCase`
- ✅ Property names use `camelCase`
- ✅ Function names use `camelCase`
- ✅ Constants use `UPPER_SNAKE_CASE`
- ✅ Enums use `PascalCase` with `UPPER_SNAKE_CASE` values

### Areas for Improvement

- 🔄 Some file names lack descriptive prefixes
- 🔄 Some class names could be more consistent
- 🔄 Some interface names could be more descriptive
- 🔄 Some property names could be more explicit

---

## 🎯 Naming Checklist

When creating new components, ensure:

- [ ] File name uses `kebab-case` with appropriate prefix
- [ ] Class name uses `PascalCase` with appropriate suffix
- [ ] Interface name uses `PascalCase` with appropriate suffix
- [ ] Property names use `camelCase` with appropriate prefixes/suffixes
- [ ] Function names use `camelCase` with verb prefix
- [ ] Constants use `UPPER_SNAKE_CASE`
- [ ] Enums use `PascalCase` with `UPPER_SNAKE_CASE` values
- [ ] Names are descriptive and self-documenting
- [ ] Names follow established patterns in the codebase
- [ ] Names avoid abbreviations unless widely understood

---

**Status**: ✅ Standards Documented  
**Last Updated**: 2025-01-XX

