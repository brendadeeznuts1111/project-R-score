# Shadow Graph System - Complete Hierarchical Component Reference

**Version**: 1.1.1.1.1.0.0  
**Status**: ✅ Complete Documentation  
**Last Updated**: 2025-01-XX

---

## Overview

This document provides a complete hierarchical reference for all Shadow Graph System components, organized by the 7-level versioning scheme (1.1.1.1.1.x.x.x).

---

## 1.1.1.1.1.1.X: Schema & Types  

### 1.1.1.1.1.1.1: Shadow-Graph Schema
**Location**: `src/arbitrage/shadow-graph/types.ts`  
**Description**: Complete graph representation of markets with visibility states

### 1.1.1.1.1.1.2: Node Visibility Enumeration
**Location**: `src/arbitrage/shadow-graph/types.ts:NodeVisibility`  
**Description**: Enumeration of visibility states (DISPLAY, API_ONLY, DARK)

### 1.1.1.1.1.1.3: Liquidity-Depth Tuple
**Location**: `src/arbitrage/shadow-graph/types.ts`  
**Description**: Tuple structure for liquidity depth tracking

### 1.1.1.1.1.1.4: Correlation-Deviation Metric
**Location**: `src/arbitrage/shadow-graph/types.ts`  
**Description**: Metric for tracking correlation deviations between nodes

### 1.1.1.1.1.1.5: Bait-Line Boolean
**Location**: `src/arbitrage/shadow-graph/types.ts:ShadowNode.isBaitLine`  
**Description**: Boolean flag indicating if a line is a bait line (displayed but not tradable)

### 1.1.1.1.1.1.6: Edge Latency & Propagation-Rate
**Location**: `src/arbitrage/shadow-graph/types.ts:ShadowEdge`  
**Description**: Latency and propagation rate metrics for edges

### 1.1.1.1.1.1.7: Hidden-Arbitrage Flag
**Location**: `src/arbitrage/shadow-graph/types.ts:ShadowEdge.hiddenArbitrage`  
**Description**: Boolean flag indicating hidden arbitrage opportunity

---

## 1.1.1.1.1.2.X: Algorithms

### 1.1.1.1.1.2.1: Probe-All-SubMarkets Algorithm
**Location**: `src/arbitrage/shadow-graph/shadow-graph-builder.ts:probeAllSubMarkets()`  
**Description**: Algorithm for probing all sub-markets to determine visibility state

### 1.1.1.1.1.2.2: UI-vs-API Visibility Check
**Location**: `src/arbitrage/shadow-graph/shadow-graph-builder.ts`  
**Description**: Checks visibility in both UI and API to identify dark nodes

### 1.1.1.1.1.2.3: Micro-Bet Liquidity Probe
**Location**: `src/arbitrage/shadow-graph/shadow-graph-builder.ts:probeLiquidity()`  
**Description**: Probes liquidity using micro-bets to detect actual vs displayed liquidity

### 1.1.1.1.1.2.4: Correlation-Deviation Engine
**Location**: `src/arbitrage/shadow-graph/shadow-graph-builder.ts`  
**Description**: Calculates correlation between nodes and detects deviations

### 1.1.1.1.1.2.5: Dark-Node Discovery Loop
**Location**: `src/arbitrage/shadow-graph/shadow-graph-builder.ts:probeAllSubMarkets()`  
**Description**: Iterative loop for discovering dark nodes through API probing

### 1.1.1.1.1.2.6: Shadow-Edge Creation Factory
**Location**: `src/arbitrage/shadow-graph/shadow-graph-builder.ts`  
**Description**: Factory method for creating shadow edges with correlation metrics

### 1.1.1.1.1.2.7: Graph Return Object
**Location**: `src/arbitrage/shadow-graph/types.ts:ShadowGraph`  
**Description**: Complete graph object returned from builder with nodes and edges

---

## 1.1.1.1.1.3.X: Hidden Steam Detection

### 1.1.1.1.1.3.1: Hidden-Steam Event Interface
**Location**: `src/arbitrage/shadow-graph/types.ts:HiddenSteamEvent`  
**Description**: Interface for hidden steam event data structure

### 1.1.1.1.1.3.2: Lag-Threshold Constant (30 s)
**Location**: `src/arbitrage/shadow-graph/hidden-steam-detector.ts:LAG_THRESHOLD_MS`  
**Description**: 30-second threshold for detecting visible lag behind dark moves

### 1.1.1.1.1.3.3: Deviation-Threshold Constant (0.3)
**Location**: `src/arbitrage/shadow-graph/hidden-steam-detector.ts:DEVIATION_THRESHOLD`  
**Description**: 30% correlation deviation threshold for sharp money detection

### 1.1.1.1.1.3.4: Monitor-Hidden-Steam Loop
**Location**: `src/arbitrage/shadow-graph/hidden-steam-detector.ts:monitorHiddenSteam()`  
**Description**: Main monitoring loop for detecting hidden steam events

### 1.1.1.1.1.3.5: Visible-Counterpart Resolver
**Location**: `src/arbitrage/shadow-graph/hidden-steam-detector.ts:findVisibleCounterpart()`  
**Description**: Resolves visible counterpart node for dark node comparison

### 1.1.1.1.1.3.6: Sharp-Money Classifier
**Location**: `src/arbitrage/shadow-graph/hidden-steam-detector.ts:classifySharpMoney()`  
**Description**: Classifies movement as confirmed/suspected/false sharp money

### 1.1.1.1.1.3.7: Severity-Score Formula
**Location**: `src/arbitrage/shadow-graph/hidden-steam-detector.ts:calculateSeverityScore()`  
**Description**: Calculates severity score (0-10) based on movement size, lag, and correlation

---

## 1.1.1.1.1.4.X: Case Study

### 1.1.1.1.1.4.1: Q1-Total Case-Study JSON
**Location**: `src/arbitrage/shadow-graph/shadow-graph-case-study.ts:Q1_TOTAL_CASE_STUDY`  
**Description**: JSON data structure for Q1 Total case study

### 1.1.1.1.1.4.2: 45-s UI-Lag Observation
**Description**: Observed 45-second lag between dark API move and UI display

### 1.1.1.1.1.4.3: 0.5-Point Arb Window
**Description**: 0.5-point arbitrage window detected in case study

### 1.1.1.1.1.4.4: Dark-Liquidity Explanation
**Description**: Explanation of dark liquidity concept and detection

### 1.1.1.1.1.4.5: 92% Predictive Correlation
**Description**: 92% predictive correlation achieved in case study validation

### 1.1.1.1.1.4.6: Research Implication Bullet
**Description**: Research implications and findings from case study

### 1.1.1.1.1.4.7: Resulting Trading Edge
**Description**: Trading edge derived from case study findings

---

## 1.1.1.1.1.5.X: Shadow Arbitrage Scanner

### 1.1.1.1.1.5.1: Shadow-Arb Matrix Class
**Location**: `src/arbitrage/shadow-graph/shadow-arb-scanner.ts:ShadowArbitrageScanner`  
**Description**: Main scanner class for shadow arbitrage opportunities

### 1.1.1.1.1.5.2: Scan-Shadow-Arb Method
**Location**: `src/arbitrage/shadow-graph/shadow-arb-scanner.ts:scanShadowArb()`  
**Description**: Main scanning method for finding arbitrage opportunities

### 1.1.1.1.1.5.3: True-Arb-Profit Weighting
**Location**: `src/arbitrage/shadow-graph/shadow-arb-scanner.ts:calculateTrueArbProfit()`  
**Description**: Calculates true arbitrage profit accounting for liquidity constraints

### 1.1.1.1.1.5.4: Liquidity-Capacity Clamp
**Location**: `src/arbitrage/shadow-graph/shadow-arb-scanner.ts`  
**Description**: Clamps position sizes to available liquidity capacity

### 1.1.1.1.1.5.5: Arb-Window Estimator
**Location**: `src/arbitrage/shadow-graph/shadow-arb-scanner.ts`  
**Description**: Estimates time window for arbitrage opportunity execution

### 1.1.1.1.1.5.6: Confidence-Score Fusion
**Location**: `src/arbitrage/shadow-graph/shadow-arb-scanner.ts`  
**Description**: Fuses multiple confidence signals into single score

### 1.1.1.1.1.5.7: Descending-Profit Sort
**Location**: `src/arbitrage/shadow-graph/shadow-arb-scanner.ts:scanShadowArb()`  
**Description**: Sorts opportunities by profit in descending order

---

## 1.1.1.1.1.6.X: Alert System

### 1.1.1.1.1.6.1: YAML Alert Definition
**Location**: `config/shadow-graph-alerts.yaml`, `config/advanced-research-alerts.yaml`  
**Description**: YAML configuration for alert rules and actions

### 1.1.1.1.1.6.2: Critical Severity Gate
**Location**: `config/advanced-research-alerts.yaml:rlm_critical.params`  
**Description**: Severity threshold gates for critical alerts

### 1.1.1.1.1.6.3: Evaluator Lambda Body
**Location**: `config/advanced-research-alerts.yaml:*.evaluator`  
**Description**: Lambda function body for evaluating alert conditions

### 1.1.1.1.1.6.4: Log Action with Tags
**Location**: `src/arbitrage/shadow-graph/alert-system.ts:executeLogAction()`  
**Description**: Logging action with severity tags

### 1.1.1.1.1.6.5: Webhook POST Hook
**Location**: `src/arbitrage/shadow-graph/alert-system.ts:executeWebhookAction()`  
**Description**: Webhook POST action for external integrations

### 1.1.1.1.1.6.6: Visible-Market Pause
**Location**: `src/arbitrage/shadow-graph/alert-system.ts:executePauseMarketAction()`  
**Description**: Market pausing action for critical alerts

### 1.1.1.1.1.6.7: Trader Urgent Alert
**Location**: `src/arbitrage/shadow-graph/alert-system.ts:executeNotifyTraderAction()`  
**Description**: Urgent trader notification via Telegram

---

## 1.1.1.1.1.7.X: MCP Research Tools

### 1.1.1.1.1.7.1: research-scan-hidden-steam Tool
**Location**: `src/mcp/tools/shadow-graph-research.ts:research-scan-hidden-steam`  
**Description**: MCP tool for scanning hidden steam across events

### 1.1.1.1.1.7.2: research-build-shadow-graph Tool
**Location**: `src/mcp/tools/shadow-graph-research.ts`  
**Description**: MCP tool for building shadow graphs

### 1.1.1.1.1.7.3: research-measure-propagation-latency Tool
**Location**: `src/mcp/tools/shadow-graph-research.ts`  
**Description**: MCP tool for measuring propagation latency

### 1.1.1.1.1.7.4: research-detect-bait-lines Tool
**Location**: `src/mcp/tools/shadow-graph-research.ts:research-detect-bait-lines`  
**Description**: MCP tool for detecting bait lines

### 1.1.1.1.1.7.5: Input-Schema Definitions
**Location**: `src/mcp/tools/shadow-graph-research.ts:*.inputSchema`  
**Description**: JSON schema definitions for MCP tool inputs

### 1.1.1.1.1.7.6: Binary Export Buffer
**Location**: `src/mcp/tools/shadow-graph-research.ts`  
**Description**: Binary buffer export for graph data

### 1.1.1.1.1.7.7: Return Content Formatter
**Location**: `src/mcp/tools/shadow-graph-research.ts:*.execute()`  
**Description**: Content formatter for MCP tool return values

---

## 1.1.1.1.1.8.X: Automation & Scripts

### 1.1.1.1.1.8.1: Nightly Hidden-Steam Cron Job
**Location**: `scripts/research-scan-covert-steam-events.ts`  
**Description**: Automated nightly scan for covert steam events  
**Cron**: `0 2 * * *` (daily at 2 AM)  
**See**: [RESEARCH-SCRIPTS-INTEGRATION.md](./RESEARCH-SCRIPTS-INTEGRATION.md#421-researchscan_covert_steamrg-covert-steam-scan)

### 1.1.1.1.1.8.2: Weekly Shadow-Graph Cron Job
**Location**: `scripts/research-generate-shadow-market-graph.ts`  
**Description**: Automated weekly shadow market graph analysis  
**Cron**: `0 4 * * 0` (weekly on Sunday at 4 AM)  
**See**: [RESEARCH-SCRIPTS-INTEGRATION.md](./RESEARCH-SCRIPTS-INTEGRATION.md#422-researchshadow_market_graphrg-shadow-market-graph-analysis)

### 1.1.1.1.1.8.3: Pre-Game Bait-Line Detection Script
**Location**: `scripts/research-identify-deceptive-lines.ts`  
**Description**: Manual script for identifying deceptive lines before major games  
**See**: [RESEARCH-SCRIPTS-INTEGRATION.md](./RESEARCH-SCRIPTS-INTEGRATION.md#423-researchdeceptive_linesrg-deceptive-line-identification)

### 1.1.1.1.1.8.4: Hidden-Arb Auto-Trader CLI
**Location**: `scripts/research-auto-covert-arb-trader.ts`  
**Description**: Automated trading system for covert arbitrage opportunities  
**See**: [RESEARCH-SCRIPTS-INTEGRATION.md](./RESEARCH-SCRIPTS-INTEGRATION.md#424-researchauto_traderrg-automated-covert-arbitrage-trading)

### 1.1.1.1.1.8.5: Paper/Live Mode Toggle
**Location**: `scripts/research-auto-covert-arb-trader.ts:--trade_mode`  
**Description**: Configuration for switching between paper trading (simulation) and live trading  
**See**: [SHADOW-GRAPH-SYSTEM.md](./SHADOW-GRAPH-SYSTEM.md#85-paperlive-mode-toggle-111111185)

### 1.1.1.1.1.8.6: Zstandard Compressed Logging
**Location**: `scripts/research-scan-covert-steam-events.ts`, `src/utils/zstd-compression.ts`  
**Description**: Efficient storage using Zstandard compression for research scan results  
**See**: [SHADOW-GRAPH-SYSTEM.md](./SHADOW-GRAPH-SYSTEM.md#86-zstandard-compressed-logging-111111186)

### 1.1.1.1.1.8.7: Event Filter & Risk Parameters
**Location**: All research scripts (command-line arguments)  
**Description**: Configurable filtering and risk management parameters  
**See**: [SHADOW-GRAPH-SYSTEM.md](./SHADOW-GRAPH-SYSTEM.md#87-event-filter--risk-parameters-111111187)

---

## 1.1.1.1.1.9.X: UI & API Architecture

### 1.1.1.1.1.9.1: User-Facing UI Layer
**Location**: `dashboard/index.html`, `src/types/dashboard-correlation-graph.ts`  
**Description**: Interactive web-based dashboard for shadow graph visualization  
**See**: [SHADOW-GRAPH-SYSTEM.md](./SHADOW-GRAPH-SYSTEM.md#91-user-facing-ui-layer-111111191)

### 1.1.1.1.1.9.2: Public API (500 ms Delay)
**Location**: `src/api/routes.ts` (public endpoints)  
**Description**: Public-facing API with intentional 500ms delay for rate limiting  
**See**: [SHADOW-GRAPH-SYSTEM.md](./SHADOW-GRAPH-SYSTEM.md#92-public-api-500-ms-delay-111111192)

### 1.1.1.1.1.9.3: Dark API (Real-Time <50 ms)
**Location**: `src/api/routes.ts` (internal endpoints)  
**Description**: High-performance internal API with sub-50ms latency  
**See**: [SHADOW-GRAPH-SYSTEM.md](./SHADOW-GRAPH-SYSTEM.md#93-dark-api-real-time-50-ms-111111193)

### 1.1.1.1.1.9.4: ShadowMovementGraph Core
**Location**: `src/arbitrage/shadow-graph/shadow-graph-builder.ts`, `src/arbitrage/shadow-graph/types.ts`  
**Description**: Core graph data structure and algorithms  
**See**: [SHADOW-GRAPH-SYSTEM.md](./SHADOW-GRAPH-SYSTEM.md#94-shadowmovementgraph-core-111111194)

### 1.1.1.1.1.9.5: Research Engine Module
**Location**: `src/arbitrage/shadow-graph/advanced-research-orchestrator.ts`  
**Description**: Comprehensive research and analysis engine  
**See**: [SHADOW-GRAPH-SYSTEM.md](./SHADOW-GRAPH-SYSTEM.md#95-research-engine-module-111111195)

### 1.1.1.1.1.9.6: Bidirectional Data Flow Arrows
**Description**: Architecture diagram showing data flow between components  
**See**: [SHADOW-GRAPH-SYSTEM.md](./SHADOW-GRAPH-SYSTEM.md#96-bidirectional-data-flow-arrows-111111196)

### 1.1.1.1.1.9.7: Status Indicator Panel
**Location**: `dashboard/index.html` (status panel component)  
**Description**: Real-time status indicators for system health  
**See**: [SHADOW-GRAPH-SYSTEM.md](./SHADOW-GRAPH-SYSTEM.md#97-status-indicator-panel-111111197)

---

## 1.1.1.1.2.X.X: Advanced Detection System

### 1.1.1.1.2.1.X: Reverse Line Movement Detection
**Location**: `src/arbitrage/shadow-graph/reverse-line-movement-detector.ts`  
**See**: [ADVANCED-DETECTION-SYSTEM.md](./ADVANCED-DETECTION-SYSTEM.md#1-reverse-line-movement-detection-1111121x)

### 1.1.1.1.2.2.X: Steam Origination Graph
**Location**: `src/arbitrage/shadow-graph/steam-origination-graph.ts`  
**See**: [ADVANCED-DETECTION-SYSTEM.md](./ADVANCED-DETECTION-SYSTEM.md#2-steam-origination-graph-1111122x)

### 1.1.1.1.2.3.X: Derivative Market Correlator
**Location**: `src/arbitrage/shadow-graph/derivative-market-correlator.ts`  
**See**: [ADVANCED-DETECTION-SYSTEM.md](./ADVANCED-DETECTION-SYSTEM.md#3-derivative-market-correlator-1111123x)

### 1.1.1.1.2.4.X: Temporal Pattern Engine
**Location**: `src/arbitrage/shadow-graph/temporal-pattern-engine.ts`  
**See**: [ADVANCED-DETECTION-SYSTEM.md](./ADVANCED-DETECTION-SYSTEM.md#4-temporal-pattern-engine-1111124x)

### 1.1.1.1.2.5.X: Cross-Sport Arbitrage
**Location**: `src/arbitrage/shadow-graph/cross-sport-arbitrage.ts`  
**See**: [ADVANCED-DETECTION-SYSTEM.md](./ADVANCED-DETECTION-SYSTEM.md#5-cross-sport-arbitrage-1111125x)

### 1.1.1.1.2.6.X: Limit Order Book Reconstructor
**Location**: `src/arbitrage/shadow-graph/limit-order-book-reconstructor.ts`  
**See**: [ADVANCED-DETECTION-SYSTEM.md](./ADVANCED-DETECTION-SYSTEM.md#6-limit-order-book-lob-reconstructor-1111126x)

### 1.1.1.1.2.7.X: Behavioral Pattern Classifier
**Location**: `src/arbitrage/shadow-graph/behavioral-pattern-classifier.ts`  
**See**: [ADVANCED-DETECTION-SYSTEM.md](./ADVANCED-DETECTION-SYSTEM.md#7-behavioral-pattern-classifier-1111127x)

---

## Implementation Status

### ✅ Fully Implemented Components

**1.1.1.1.1.x.x (Shadow Graph Core)** - All 63 components implemented:
- ✅ Schema & Types (1.1.1.1.1.1.x) - `src/arbitrage/shadow-graph/types.ts`
- ✅ Algorithms (1.1.1.1.1.2.x) - `src/arbitrage/shadow-graph/shadow-graph-builder.ts`
- ✅ Hidden Steam Detection (1.1.1.1.1.3.x) - `src/arbitrage/shadow-graph/hidden-steam-detector.ts`
- ✅ Case Study (1.1.1.1.1.4.x) - `src/arbitrage/shadow-graph/shadow-graph-case-study.ts`
- ✅ Shadow Arbitrage Scanner (1.1.1.1.1.5.x) - `src/arbitrage/shadow-graph/shadow-arb-scanner.ts`
- ✅ Alert System (1.1.1.1.1.6.x) - `src/arbitrage/shadow-graph/alert-system.ts`
- ✅ MCP Research Tools (1.1.1.1.1.7.x) - `src/mcp/tools/shadow-graph-research.ts`
- ✅ Automation & Scripts (1.1.1.1.1.8.x) - `scripts/research-*.ts`
- ✅ UI & API Architecture (1.1.1.1.1.9.x) - `dashboard/index.html`, `src/api/routes.ts`

**1.1.1.1.2.x.x (Advanced Detection System)** - All 49 components implemented:
- ✅ Reverse Line Movement (1.1.1.1.2.1.x) - `src/arbitrage/shadow-graph/reverse-line-movement-detector.ts`
- ✅ Steam Origination Graph (1.1.1.1.2.2.x) - `src/arbitrage/shadow-graph/steam-origination-graph.ts`
- ✅ Derivative Market Correlator (1.1.1.1.2.3.x) - `src/arbitrage/shadow-graph/derivative-market-correlator.ts`
- ✅ Temporal Pattern Engine (1.1.1.1.2.4.x) - `src/arbitrage/shadow-graph/temporal-pattern-engine.ts`
- ✅ Cross-Sport Arbitrage (1.1.1.1.2.5.x) - `src/arbitrage/shadow-graph/cross-sport-arbitrage.ts`
- ✅ Limit Order Book Reconstructor (1.1.1.1.2.6.x) - `src/arbitrage/shadow-graph/limit-order-book-reconstructor.ts`
- ✅ Behavioral Pattern Classifier (1.1.1.1.2.7.x) - `src/arbitrage/shadow-graph/behavioral-pattern-classifier.ts`

**Orchestrator Integration**:
- ✅ `AdvancedResearchOrchestrator` - `src/arbitrage/shadow-graph/advanced-research-orchestrator.ts`
- ✅ Coordinates all 7 advanced detection components
- ✅ Generates comprehensive research reports

## Verification Commands

```bash
# Verify all components exist with version numbers
rg "1\.1\.1\.1\.1\.(8|9)\." src/ scripts/ docs/
rg "1\.1\.1\.1\.2\." src/arbitrage/shadow-graph/

# Verify research scripts
rg "research-scan-covert-steam|research-generate-shadow-market|research-identify-deceptive|research-auto-covert-arb" scripts/

# Verify UI/API components
rg "dashboard.*shadow|public.*api|dark.*api|status.*panel" dashboard/ src/api/

# Verify advanced detection components are imported in orchestrator
rg "ReverseLineMovementDetector|SteamOriginationGraph|DerivativeMarketCorrelator|TemporalPatternEngine|CrossSportArbitrage|LimitOrderBookReconstructor|BehavioralPatternClassifier" src/arbitrage/shadow-graph/advanced-research-orchestrator.ts

# Verify all file headers have version numbers
rg "@fileoverview.*1\.1\.1\.1\." src/arbitrage/shadow-graph/
```

---

## Related Documentation

- [SHADOW-GRAPH-SYSTEM.md](./SHADOW-GRAPH-SYSTEM.md) - Complete shadow graph system documentation
- [ADVANCED-DETECTION-SYSTEM.md](./ADVANCED-DETECTION-SYSTEM.md) - Advanced detection components (49 components)
- [RESEARCH-SCRIPTS-INTEGRATION.md](./RESEARCH-SCRIPTS-INTEGRATION.md) - Research scripts integration guide
- [1.1.1.1.4-MULTI-LAYER-CORRELATION-SYSTEM-SPECIFICATION.md](./1.1.1.1.4-MULTI-LAYER-CORRELATION-SYSTEM-SPECIFICATION.md) - Multi-layer correlation system

---

**Status**: ✅ Complete  
**Total Components Documented**: 63+ components across 1.1.1.1.1.x.x and 1.1.1.1.2.x.x hierarchies
