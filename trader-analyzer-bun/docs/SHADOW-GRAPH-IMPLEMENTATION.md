# **Shadow-Graph System Implementation Guide**

**Version:** 1.1.1.1.1.0.0  
**Status:** ✅ Complete & Operational

---

## **Overview**

Complete implementation guide for the Shadow-Graph system with class-based architecture and dependency injection patterns.

---

## **Architecture**

### **1. SubMarketProber Class** (1.1.1.1.1.2.1)

```typescript
import { SubMarketProber } from './src/arbitrage/shadow-graph/shadow-graph-builder';

const prober = new SubMarketProber(
  async (eventId) => {
    // Scrape UI nodes
    return uiNodes;
  },
  async (uiNode) => {
    // Probe API node
    return apiNode;
  },
  async (node, amount) => {
    // Place test bet
    return { success: true, amount };
  },
  async (node, amount) => {
    // Place API bet
    return { success: true, amount };
  },
  async (node, allNodes) => {
    // Calculate correlation deviation
    return deviation;
  },
  async (eventId) => {
    // Discover dark nodes
    return darkNodes;
  }
);

const graph = await prober.probeAllSubMarkets('event-123', 'live');
```

### **2. HiddenSteamMonitor Class** (1.1.1.1.1.3.4)

```typescript
import { HiddenSteamMonitor } from './src/arbitrage/shadow-graph/hidden-steam-detector';

const monitor = new HiddenSteamMonitor(
  async (eventId) => {
    // Build shadow graph
    return graph;
  },
  async (node) => {
    // Get recent movement
    return { size: 0.5, timestamp: Date.now() };
  },
  async (node, timestamp) => {
    // Get visible response
    return { lagMs: 45000, timestamp: Date.now() };
  },
  async (movement) => {
    // Classify sharp money
    return 'confirmed';
  },
  async (darkNode, visibleNode) => {
    // Check arbitrage
    return true;
  }
);

const events = await monitor.monitorHiddenSteam('event-123');
```

### **3. ShadowArbMatrix Class** (1.1.1.1.1.5.1)

```typescript
import { ShadowArbMatrix } from './src/arbitrage/shadow-graph/shadow-arb-scanner';

const scanner = new ShadowArbMatrix(
  async (eventId) => {
    // Build shadow graph
    return graph;
  },
  async (edge) => {
    // Estimate arb window
    return 45000; // ms
  }
);

const opportunities = await scanner.scanShadowArb('event-123');
```

---

## **Severity Score Formula** (1.1.1.1.1.3.7)

### **Scoring Breakdown**

| Component | Points | Criteria |
|-----------|--------|----------|
| **Move Size** | 0-4 | ≥1.0: 4pts, ≥0.5: 3pts, ≥0.25: 2pts, <0.25: 1pt |
| **Lag** | 0-3 | ≥60s: 3pts, ≥45s: 2pts, ≥30s: 1pt |
| **Deviation** | 0-2 | ≥0.4: 2pts, ≥0.3: 1pt |
| **Sharp Money** | 0-1 | confirmed: 1pt |
| **Total** | 0-10 | Minimum 5 for event creation |

---

## **True Arbitrage Profit** (1.1.1.1.1.5.3)

### **Weighted Calculation**

```typescript
const darkImplied = impliedProbability(dark.expectedCorrelation);
const visibleImplied = impliedProbability(visible.expectedCorrelation);

const darkWeight = dark.hiddenLiquidity;
const visibleWeight = visible.displayedLiquidity;
const totalWeight = darkWeight + visibleWeight;

const weightedProb = (darkImplied * darkWeight + visibleImplied * visibleWeight) / totalWeight;
const profit = Math.max(0, 1 - weightedProb);
```

---

## **Confidence Score Fusion** (1.1.1.1.1.5.6)

### **Weighted Factors**

| Factor | Weight | Calculation |
|--------|--------|-------------|
| **Propagation** | 40% | `propagationRate / 100` |
| **Correlation** | 30% | `actualCorrelation` |
| **Liquidity** | 20% | `min(hidden/100k, displayed/100k)` |
| **Stability** | 10% | `1 - latencyMs/60000` |

---

## **Case Study: Q1 Total** (1.1.1.1.1.4.X)

### **Key Metrics**

- **UI Lag**: 45 seconds
- **Arb Window**: 45 seconds
- **Profit**: 1.8%
- **Dark Liquidity**: $50,000
- **Correlation**: 92%
- **Detection Rate**: 87%
- **Annualized Return**: 24.7%

---

## **Usage Examples**

### **Example 1: Complete Workflow**

```typescript
import { SubMarketProber } from './src/arbitrage/shadow-graph/shadow-graph-builder';
import { HiddenSteamMonitor } from './src/arbitrage/shadow-graph/hidden-steam-detector';
import { ShadowArbMatrix } from './src/arbitrage/shadow-graph/shadow-arb-scanner';

// 1. Build shadow graph
const prober = new SubMarketProber(...);
const graph = await prober.probeAllSubMarkets('event-123');

// 2. Monitor hidden steam
const monitor = new HiddenSteamMonitor(...);
const steamEvents = await monitor.monitorHiddenSteam('event-123');

// 3. Scan for arbitrage
const scanner = new ShadowArbMatrix(...);
const arbOpportunities = await scanner.scanShadowArb('event-123');

// Filter high-confidence opportunities
const highConfidence = arbOpportunities.filter(arb => arb.confidence >= 0.7);
```

### **Example 2: Severity-Based Alerting**

```typescript
const events = await monitor.monitorHiddenSteam('event-123');

for (const event of events) {
  if (event.severity >= 8) {
    // Critical alert
    console.log(`🚨 CRITICAL: ${event.hiddenNodeId} - ${event.severity}/10`);
  } else if (event.severity >= 5) {
    // High priority
    console.log(`⚠️ HIGH: ${event.hiddenNodeId} - ${event.severity}/10`);
  }
}
```

---

## **Database Integration**

### **Saving Nodes**

```typescript
import { shadowNodeToRow, initializeShadowGraphDatabase } from './src/arbitrage/shadow-graph/shadow-graph-database';
import { Database } from 'bun:sqlite';

const db = new Database('./data/research.db');
initializeShadowGraphDatabase(db);

const nodeRow = shadowNodeToRow(node);
db.run(`
  INSERT INTO shadow_nodes (
    node_id, event_id, market_id, bookmaker, visibility,
    displayed_liquidity, hidden_liquidity, reserved_liquidity,
    expected_correlation, actual_correlation, is_bait_line,
    last_updated
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, [
  nodeRow.node_id, nodeRow.event_id, nodeRow.market_id, nodeRow.bookmaker,
  nodeRow.visibility, nodeRow.displayed_liquidity, nodeRow.hidden_liquidity,
  nodeRow.reserved_liquidity, nodeRow.expected_correlation,
  nodeRow.actual_correlation, nodeRow.is_bait_line, nodeRow.last_updated
]);
```

---

## **Cross-References**

- **1.1.1.1.1.1.0** → Types & Schema
- **1.1.1.1.1.2.0** → Shadow-Graph Builder
- **1.1.1.1.1.3.0** → Hidden Steam Detector
- **1.1.1.1.1.4.0** → Case Study
- **1.1.1.1.1.5.0** → Shadow Arbitrage Scanner
- **1.1.1.1.1.6.0** → Alert Definitions
- **1.1.1.1.1.7.0** → MCP Research Tools

---

**Last Updated:** 2024  
**Status:** ✅ Production Ready
