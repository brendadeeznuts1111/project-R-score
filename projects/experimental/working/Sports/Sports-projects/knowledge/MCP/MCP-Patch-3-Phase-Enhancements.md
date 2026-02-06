# MCP Patch 3-Phase Enhancements

## 🎯 Overview

Complete implementation of 3-phase enhancements for intelligent patch recommendations:
- **Phase 1**: Predictive Patching & Trend Analysis
- **Phase 2**: Deep Project Context Integration  
- **Phase 3**: Recommendation Lifecycle & Feedback Loop

---

## 📋 Phase 1: Predictive Patching & Trend Analysis

### Features

✅ **Historical Trend Tracking**
- `ResourceAwareMCP.getHistoricalTrends()` - Analyzes metrics over time windows (24h/7d/30d)
- `ResourceAwareMCP.recordMetricSample()` - Records metric samples for trend analysis
- Tracks: CPU, Memory, I/O, Cache Hit Rate

✅ **Anomaly Detection**
- Identifies packages showing degrading performance trends
- Configurable thresholds in `mcp-patch-config.json`:
  - `cpuDegradationPct`: 15% (default)
  - `memoryIncreaseMb`: 50MB (default)
  - `ioDegradationPct`: 20% (default)
  - `cacheHitRateDegradationPct`: 10% (default)

✅ **Proactive Recommendations**
- Generates `urgency: "predictive"` recommendations
- Works even when current pressure is low
- Based on future risk prediction

### Implementation

```typescript
// Analyze trends for each package
const cpuTrend = ResourceAwareMCP.getHistoricalTrends(packageId, "cpu", "7d");
if (cpuTrend.trend === "degrading" && cpuTrend.changePercent > threshold) {
  recommendations.push({
    package: packageId,
    urgency: "predictive",
    source: "predictive_trend",
    reason: `CPU increased ${cpuTrend.changePercent.toFixed(1)}% in 7 days`,
  });
}
```

### Event Logging

- `mcp_predictive_patch_alert` - Logged when trend-based recommendation generated

---

## 📋 Phase 2: Deep Project Context Integration

### Features

✅ **package.json Priority**
- Prioritizes recommendations for direct dependencies
- Checks `dependencies`, `devDependencies`, `peerDependencies`
- Boosts confidence for project dependencies (+30% for direct, +10% for transitive)

✅ **Dependency Graph Traversal**
- `getDependencyPath()` - Returns dependency path (e.g., `["my-app", "my-lib", "react-dom"]`)
- `isProjectDependency()` - Checks if package is in project
- `isDirectDependency()` - Checks if package is direct dependency

✅ **Contextual Queries**
- `buildContextualSearchQuery()` - Tailors SearchBun queries with installed packages
- Includes top 5 project dependencies in search query
- Example: `"bun patch react-dom performance"` → `"bun patch react-dom performance react zod lodash"`

### Implementation

```typescript
// Boost confidence for project dependencies
const isProjectDep = isProjectDependency(match.package);
const dependencyBoost = isProjectDep ? getProjectDependencyBoost(match.package) : 0;
const boostedConfidence = Math.min((match.confidence || 0) + dependencyBoost, 1.0);

// Use contextual queries
const contextualQuery = buildContextualSearchQuery("bun patch command examples");
const bunDocs = await searchBunWithResources(contextualQuery, "low");
```

### Output Enhancement

- `PatchRecommendation.isProjectDependency`: boolean
- `PatchRecommendation.dependencyPath`: string[] (e.g., `["my-app", "react-dom"]`)

---

## 📋 Phase 3: Recommendation Lifecycle & Feedback Loop

### Features

✅ **Tracking Store**
- `~/.forge/mcp-recommendations-log.json` - Stores all recommendations
- Fields:
  - `recommendationId`: Unique ID
  - `timestamp`: When generated
  - `status`: "generated" | "applied" | "dismissed" | "ineffective"
  - `appliedTimestamp`: Date if applied
  - `effectivenessData`: Performance impact measurement

✅ **Implicit Feedback**
- Automatically detects when patch is applied (checks `package.json` → `patchedDependencies`)
- `syncRecommendationStatuses()` - Syncs statuses with actual patch state
- Updates status to "applied" when patch detected

✅ **Effectiveness Measurement**
- `recordEffectivenessMeasurement()` - Records before/after metrics
- Monitors impact over `postPatchObservationWindow` (default: 24h)
- Auto-updates status to "ineffective" if degradation detected

✅ **Dismiss Mechanism**
- `dismissPatchRecommendation()` - Dismiss single recommendation
- `dismissPackageRecommendations()` - Dismiss all for a package
- Configurable duration (default: 7 days)
- Prevents re-recommendation during dismissal period

### Implementation

```typescript
// Create log entry for new recommendation
const recommendationId = createRecommendationEntry({
  package: "zod",
  version: "4.1.12",
  reason: "Found in Bun docs",
  urgency: "medium",
  source: "docs",
});

// Mark as applied when patch committed
updateRecommendationStatus(recommendationId, "applied", {
  appliedTimestamp: Date.now(),
});

// Dismiss recommendation
dismissPatchRecommendation(recommendationId, 168); // 7 days
```

### Event Logging

- `mcp_patch_applied` - Logged when patch is applied
- `mcp_patch_effectiveness_measured` - Logged when effectiveness measured

---

## 🔧 Configuration

### Updated Config Schema

```json
{
  "thresholds": {
    "searchPressureLimit": 0.7,
    "cacheSearchPressureLimit": 0.6,
    "performanceSearchPressureLimit": 0.6,
    "cpuDegradationPct": 15,
    "memoryIncreaseMb": 50,
    "ioDegradationPct": 20,
    "cacheHitRateDegradationPct": 10
  },
  "lifecycle": {
    "postPatchObservationWindow": 86400,
    "effectivenessMeasurementEnabled": true
  }
}
```

---

## 📁 Files Created/Modified

### New Files

1. **`src/mcp/tools/bun-patch-recommendations-log.ts`**
   - Recommendation lifecycle tracking
   - Status management
   - Effectiveness measurement

2. **`src/mcp/tools/bun-patch-project-context.ts`**
   - Project dependency detection
   - Dependency path resolution
   - Contextual query building

3. **`src/mcp/tools/bun-patch-dismiss.ts`**
   - Dismiss mechanism
   - Package-level dismissal

### Modified Files

1. **`server/mcp-powerhouse.ts`**
   - Added `getHistoricalTrends()`
   - Added `recordMetricSample()`

2. **`src/mcp/tools/bun-patch-config.ts`**
   - Added trend thresholds
   - Added lifecycle config

3. **`src/mcp/tools/bun-patch-aware.ts`**
   - Integrated all 3 phases
   - Enhanced `getPatchRecommendations()`
   - Updated `commitPatchWithResources()`

---

## 🚀 Usage Examples

### Phase 1: Predictive Recommendations

```typescript
// Get predictive recommendations
const recs = await getPatchRecommendations();
const predictive = recs.filter(r => r.urgency === "predictive");

// Example output:
{
  package: "zod",
  urgency: "predictive",
  source: "predictive_trend",
  reason: "CPU increased 18.5% in 7 days (45.2% current)",
  confidence: 0.37
}
```

### Phase 2: Project Context

```typescript
// Recommendations prioritize project dependencies
const recs = await getPatchRecommendations();
const projectDeps = recs.filter(r => r.isProjectDependency);

// Example output:
{
  package: "react-dom",
  isProjectDependency: true,
  dependencyPath: ["my-app", "react-dom"],
  confidence: 0.85, // Boosted from 0.55
  reason: "Found in Bun docs: Patching Dependencies (via my-app → react-dom)"
}
```

### Phase 3: Lifecycle Tracking

```typescript
// Dismiss a recommendation
import { dismissPatchRecommendation } from "./bun-patch-dismiss";
dismissPatchRecommendation("rec_1234567890_abc123", 168); // 7 days

// Check recommendation status
import { loadRecommendationsLog } from "./bun-patch-recommendations-log";
const log = loadRecommendationsLog();
const applied = log.filter(e => e.status === "applied");

// Record effectiveness
import { recordEffectivenessMeasurement } from "./bun-patch-recommendations-log";
recordEffectivenessMeasurement("rec_1234567890_abc123", {
  metric: "cpu",
  before: 45.2,
  after: 38.1,
  improvementPercent: 15.7
});
```

---

## 📊 Data Flow

```text
Phase 1: Trend Analysis
  ↓
Historical Metrics → Anomaly Detection → Predictive Recommendations
  ↓
Phase 2: Project Context
  ↓
package.json → Dependency Detection → Confidence Boost → Contextual Queries
  ↓
Phase 3: Lifecycle
  ↓
Recommendation Generated → Logged → Applied → Effectiveness Measured → Learning
```

---

## ✅ Summary

All 3 phases are now fully implemented:

1. ✅ **Phase 1**: Predictive patching with trend analysis
2. ✅ **Phase 2**: Deep project context integration
3. ✅ **Phase 3**: Complete recommendation lifecycle tracking

The system now:
- **Predicts** future issues before they become critical
- **Prioritizes** project dependencies intelligently
- **Tracks** recommendation lifecycle end-to-end
- **Learns** from effectiveness measurements
- **Prevents** duplicate recommendations

🚀 **The patch recommendation system is now production-ready!**

