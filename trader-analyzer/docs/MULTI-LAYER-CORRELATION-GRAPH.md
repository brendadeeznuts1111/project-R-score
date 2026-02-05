# MultiLayerCorrelationGraph System

**Status**: 🌐 **Multi-Layer Live | Layer4 Detection Active | Cross-Sport Correlations Running**

**Cross-Reference**: For complete technical specification, see [1.1.1.1.4 Multi-Layer Correlation System Specification](./1.1.1.1.4-MULTI-LAYER-CORRELATION-SYSTEM-SPECIFICATION.md)

## Overview

The MultiLayerCorrelationGraph system provides a comprehensive multi-layer correlation detection framework for discovering hidden edges across different levels of market relationships.

**Note**: This document provides a high-level overview. For detailed technical specifications including interface definitions, algorithms, storage schemas, and research tools, refer to the [complete technical specification](./1.1.1.1.4-MULTI-LAYER-CORRELATION-SYSTEM-SPECIFICATION.md).

## Architecture

### Layer Structure

```
🌐 MULTI-LAYER CORRELATION GRAPH
├── Layer 1: Direct Correlations (Parent-Child Nodes)
├── Layer 2: Cross-Market Correlations (Within Same Event)
├── Layer 3: Cross-Event Correlations (Same Team/Player Across Events)
└── Layer 4: Cross-Sport Correlations (Shared Entities Across Sports)
```

### Component Structure

#### 1.1.1.1.4.1 Core Interfaces

- **1.1.1.1.4.1.1**: `MultiLayerGraph` - Main graph interface
- **1.1.1.1.4.1.2**: `Layer4CrossSportCorrelations` - Cross-sport schema
- **1.1.1.1.4.1.3**: `Layer3CrossEventCorrelations` - Cross-event schema
- **1.1.1.1.4.1.4**: `Layer2CrossMarketCorrelations` - Cross-market schema
- **1.1.1.1.4.1.5**: `Layer1DirectCorrelations` - Direct correlation schema
- **1.1.1.1.4.1.6**: `HiddenEdge` - Detection result type
- **1.1.1.1.4.1.7**: `PropagationPredictionEngine` - Propagation prediction

#### 1.1.1.1.4.2 Graph Builders

- **1.1.1.1.4.2.1**: `MultiLayerCorrelationGraph` constructor
- **1.1.1.1.4.2.2**: `buildCrossSportCorrelations()` - Cross-sport graph builder
- **1.1.1.1.4.2.3**: `buildCrossEventCorrelations()` - Cross-event graph builder
- **1.1.1.1.4.2.4**: `buildCrossMarketCorrelations()` - Cross-market graph builder
- **1.1.1.1.4.2.5**: `buildDirectCorrelations()` - Direct correlation builder
- **1.1.1.1.4.2.6**: Detection priority queue (high-to-low: Layer4 → Layer1)
- **1.1.1.1.4.2.7**: `buildMultiLayerGraph()` - Full assembly

#### 1.1.1.1.4.3 Anomaly Detection Algorithms

- **1.1.1.1.4.3.1**: `detectLayer4Anomalies()` - Cross-sport detection
- **1.1.1.1.4.3.2**: `detectLayer3Anomalies()` - Cross-event detection
- **1.1.1.1.4.3.3**: `detectLayer2Anomalies()` - Cross-market detection
- **1.1.1.1.4.3.4**: `detectLayer1Anomalies()` - Direct correlation detection
- **1.1.1.1.4.3.5**: Hidden edge confidence scoring
- **1.1.1.1.4.3.6**: Latency-weighted signal strength
- **1.1.1.1.4.3.7**: Multi-layer risk assessment

#### 1.1.1.1.4.4 Database Schema

- **1.1.1.1.4.4.1**: `multi_layer_correlations` - Main storage table
- **1.1.1.1.4.4.2**: `cross_event_edges` - Cross-event history
- **1.1.1.1.4.4.3**: `cross_sport_index` - Cross-sport correlation index
- **1.1.1.1.4.4.4**: `hidden_edge_verifications` - Verification log
- **1.1.1.1.4.4.5**: `anomaly_detection_metrics` - Performance metrics
- **1.1.1.1.4.4.6**: `multi_layer_snapshots` - Snapshot system
- **1.1.1.1.4.4.7**: `correlation_decay_tracking` - Decay tracking

#### 1.1.1.1.4.5 MCP Research Tools

- **1.1.1.1.4.5.1**: `research-build-multi-layer-graph` - Build complete graph
- **1.1.1.1.4.5.2**: `research-query-layer-anomalies` - Query layer-specific anomalies
- **1.1.1.1.4.5.3**: `research-predict-propagation` - Predict propagation paths
- **1.1.1.1.4.5.4**: `research-find-cross-sport-edges` - Find cross-sport edges
- **1.1.1.1.4.5.5**: Input Schema Definitions - Consistent schemas across all tools
- **1.1.1.1.4.5.6**: `research-stream-anomalies` - Real-time anomaly streaming
- **1.1.1.1.4.5.7**: `research-generate-visualization` - Generate visualization data

## Usage

### Basic Usage

```typescript
import { MultiLayerCorrelationGraph } from "./arbitrage/shadow-graph/multi-layer-correlation-graph";
import { Database } from "bun:sqlite";

const db = new Database("./data/research.db");
const mlGraph = new MultiLayerCorrelationGraph(db);

// Build complete multi-layer graph
const graph = await mlGraph.buildMultiLayerGraph("nba-lakers-warriors-2024-01-15");

// Detect anomalies across all layers
const allAnomalies: HiddenEdge[] = [];
for (const detector of graph.detection_priority) {
  const anomalies = await detector(graph);
  allAnomalies.push(...anomalies);
}

console.log(`Found ${allAnomalies.length} hidden edges`);
```

### Propagation Prediction

```typescript
import { PropagationPredictionEngine } from "./arbitrage/shadow-graph/propagation-prediction-engine";

const predictor = new PropagationPredictionEngine(db);
const path = await predictor.predictPropagationPath(
  "source-node-id",
  "target-node-id",
  4 // max depth
);

const totalLatency = await predictor.predictPropagationTime(path);
const finalImpact = await predictor.predictFinalImpact(path);
```

### MCP Tools Usage

```bash
# Build multi-layer graph
mcp call research-build-multi-layer-graph --eventId "nba-lakers-warriors-2024-01-15"

# Query Layer 4 anomalies
mcp call research-query-layer-anomalies --eventId "nba-lakers-warriors-2024-01-15" --layer 4 --minConfidence 0.7

# Predict propagation
mcp call research-predict-propagation --sourceNodeId "node-1" --targetNodeId "node-2" --maxDepth 4

# Find cross-sport edges
mcp call research-find-cross-sport-edges --sport1 "nba" --sport2 "nfl" --minStrength 0.7
```

## Detection Thresholds

- **Layer 4 (Cross-Sport)**: 0.8 threshold
- **Layer 3 (Cross-Event)**: 0.7 threshold
- **Layer 2 (Cross-Market)**: 0.6 threshold
- **Layer 1 (Direct)**: 0.5 threshold

## Confidence Scoring

Confidence is calculated differently for each layer:

- **Layer 4**: `strength * (1000 - min(latency, 1000)) / 1000`
- **Layer 3**: `strength * exp(-temporal_distance / 24)`
- **Layer 2**: `break_magnitude * base_correlation`
- **Layer 1**: `deviation`

## Database Schema

### Multi-Layer Correlations Table

```sql
CREATE TABLE multi_layer_correlations (
  correlation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  layer INTEGER NOT NULL CHECK(layer IN (1, 2, 3, 4)),
  event_id TEXT NOT NULL,
  source_node TEXT NOT NULL,
  target_node TEXT NOT NULL,
  correlation_type TEXT NOT NULL,
  correlation_score REAL NOT NULL,
  latency_ms INTEGER NOT NULL,
  expected_propagation REAL NOT NULL,
  detected_at INTEGER NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  confidence REAL NOT NULL
);
```

## Integration

The multi-layer correlation graph integrates with:

- `ShadowGraphOrchestrator` - Main shadow graph system
- `HiddenSteamDetector` - Hidden steam detection
- `ShadowArbitrageScanner` - Arbitrage opportunity scanning
- `AdvancedResearchOrchestrator` - Advanced research components

## Real-Time Streaming

### 1.1.1.1.4.5.6: Real-Time Anomaly Streaming

The `RealTimeAnomalyStreamer` provides real-time streaming of anomalies as they are detected:

```typescript
import { RealTimeAnomalyStreamer } from "./arbitrage/shadow-graph/multi-layer-streaming";

const streamer = new RealTimeAnomalyStreamer(db);
await streamer.startStreaming(eventId, graph, {
  layers: [1, 2, 3, 4],
  minConfidence: 0.6,
  maxLatency: 60000
});

streamer.on("anomaly-detected", (event) => {
  console.log(`Anomaly detected: ${event.anomaly.source} → ${event.anomaly.target}`);
});

streamer.on("anomaly-updated", (event) => {
  console.log(`Anomaly updated: ${event.anomaly.confidence}`);
});
```

## Visualization

### 1.1.1.1.4.5.7: Multi-Layer Visualization Data

The `MultiLayerVisualizationGenerator` generates visualization data in multiple formats:

```typescript
import { MultiLayerVisualizationGenerator } from "./arbitrage/shadow-graph/multi-layer-visualization";

const generator = new MultiLayerVisualizationGenerator(db);
const visualization = await generator.generateVisualizationData(graph, eventId, "hierarchical");

// Export to JSON
const json = await generator.exportToJSON(visualization);

// Export to GraphML
const graphml = await generator.exportToGraphML(visualization);
```

## Status

✅ All 7 core interfaces implemented
✅ All 7 graph builders implemented
✅ All 7 anomaly detection algorithms implemented
✅ All 7 database tables created
✅ All 7 MCP tools registered (including streaming and visualization)
✅ Propagation prediction engine implemented
✅ Real-time anomaly streaming implemented
✅ Multi-layer visualization data generation implemented

**System Features**:
- ✅ Multi-layer correlation detection (4 layers)
- ✅ Real-time anomaly streaming
- ✅ Visualization data generation (JSON, GraphML)
- ✅ Propagation path prediction
- ✅ Database persistence with historical tracking
- ✅ MCP research tools for analysis

---

**Multi-layer correlation graph system is fully operational with all components implemented!**
