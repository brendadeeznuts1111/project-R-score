# Phase 3: Recommendation Lifecycle & Feedback Loop - Complete Guide

## 🎯 Overview

Phase 3 provides complete lifecycle management for patch recommendations, from generation to effectiveness measurement.

---

## 📁 Recommendation Log Structure

**Location**: `~/.forge/mcp-recommendations-log.json`

### Example Entry

```json
{
  "recommendationId": "rec_1703123456789_abc123",
  "timestamp": 1703123456789,
  "package": "zod",
  "version": "4.1.12",
  "reason": "Found in Bun docs: Patching Dependencies",
  "urgency": "medium",
  "confidence": 0.85,
  "source": "docs",
  "isProjectDependency": true,
  "dependencyPath": ["my-app", "zod"],
  "status": "generated",
  "appliedTimestamp": null,
  "feedback": null,
  "effectivenessData": null,
  "dismissedUntil": null
}
```

---

## 🔄 Status Lifecycle

### Status Flow

```text
generated → applied → (effectiveness measured)
    ↓
dismissed → (expires) → generated
    ↓
ineffective (if degradation detected)
```

### Status Types

1. **`"generated"`** - Initial state when recommendation is created
2. **`"applied"`** - Patch has been committed to `package.json`
3. **`"dismissed"`** - User dismissed (temporary, expires after duration)
4. **`"ineffective"`** - Patch applied but caused degradation

---

## 🔍 Feature 1: Recommendation Log

### Storage

```typescript
// Location: ~/.forge/mcp-recommendations-log.json
// Format: Array of PatchRecommendationLogEntry
```

### Loading

```typescript
import { loadRecommendationsLog } from "./bun-patch-recommendations-log";

const log = loadRecommendationsLog();
console.log(`Total recommendations: ${log.length}`);
console.log(`Applied: ${log.filter(e => e.status === "applied").length}`);
```

### Creating Entries

```typescript
import { createRecommendationEntry } from "./bun-patch-recommendations-log";

const recommendationId = createRecommendationEntry({
  package: "zod",
  version: "4.1.12",
  reason: "Found in Bun docs",
  urgency: "medium",
  confidence: 0.85,
  source: "docs",
  isProjectDependency: true,
  dependencyPath: ["my-app", "zod"],
});

console.log(`Created recommendation: ${recommendationId}`);
```

---

## 🔍 Feature 2: Status Tracking

### Status Transitions

```typescript
import {
  updateRecommendationStatus,
  loadRecommendationsLog,
} from "./bun-patch-recommendations-log";

// Mark as applied
updateRecommendationStatus("rec_123", "applied", {
  appliedTimestamp: Date.now(),
});

// Mark as dismissed
updateRecommendationStatus("rec_123", "dismissed", {
  dismissedUntil: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
});

// Mark as ineffective
updateRecommendationStatus("rec_123", "ineffective", {
  feedback: "Patch caused performance degradation",
});
```

### Querying by Status

```typescript
const log = loadRecommendationsLog();

const generated = log.filter(e => e.status === "generated");
const applied = log.filter(e => e.status === "applied");
const dismissed = log.filter(e => e.status === "dismissed");
const ineffective = log.filter(e => e.status === "ineffective");

console.log(`Generated: ${generated.length}`);
console.log(`Applied: ${applied.length}`);
console.log(`Dismissed: ${dismissed.length}`);
console.log(`Ineffective: ${ineffective.length}`);
```

---

## 🔍 Feature 3: Implicit Feedback

### Auto-Detection

When `getPatchRecommendations()` is called, it automatically:

1. **Syncs statuses** - Checks `package.json` for applied patches
2. **Updates status** - Changes "generated" → "applied" if patch found
3. **Records timestamp** - Sets `appliedTimestamp`

### How It Works

```typescript
// Called automatically in getPatchRecommendations()
syncRecommendationStatuses();

// Internally checks:
function checkPatchApplied(packageName: string): boolean {
  const packageJson = readFileSync("package.json");
  const patchedDeps = packageJson.patchedDependencies || {};
  
  // Check if package is in patchedDependencies
  return Object.keys(patchedDeps).some(key => 
    key.startsWith(packageName)
  );
}
```

### Example Flow

```bash
# 1. Recommendation generated
getPatchRecommendations()
# → Creates entry with status: "generated"

# 2. User applies patch
bun patch zod@4.1.12
# ... edit node_modules/zod ...
bun patch --commit zod@4.1.12
# → Updates package.json with patchedDependencies

# 3. Next call to getPatchRecommendations()
getPatchRecommendations()
# → syncRecommendationStatuses() detects patch
# → Updates status to "applied"
# → Sets appliedTimestamp
```

---

## 🔍 Feature 4: Effectiveness Measurement

### Recording Measurements

```typescript
import { recordEffectivenessMeasurement } from "./bun-patch-recommendations-log";

// Record before/after metrics
recordEffectivenessMeasurement("rec_123", {
  metric: "cpu",
  before: 45.2,
  after: 38.1,
  // improvementPercent calculated automatically: 15.7%
});

// Record cache hit rate improvement
recordEffectivenessMeasurement("rec_123", {
  metric: "cacheHitRate",
  before: 0.65,
  after: 0.82,
  // improvementPercent: 26.2%
});
```

### Auto-Status Update

If `improvementPercent < -5%`, status automatically changes to `"ineffective"`:

```typescript
// Degradation detected
recordEffectivenessMeasurement("rec_123", {
  metric: "cpu",
  before: 30.0,
  after: 35.0, // 16.7% worse
});
// → Status automatically set to "ineffective"
```

### Querying Effectiveness

```typescript
const log = loadRecommendationsLog();

const effective = log.filter(e => 
  e.effectivenessData?.improvementPercent && 
  e.effectivenessData.improvementPercent > 0
);

const ineffective = log.filter(e => 
  e.effectivenessData?.improvementPercent && 
  e.effectivenessData.improvementPercent < -5
);

console.log(`Effective patches: ${effective.length}`);
console.log(`Ineffective patches: ${ineffective.length}`);
```

---

## 🔍 Feature 5: Dismiss Mechanism

### Dismiss Single Recommendation

```typescript
import { dismissPatchRecommendation } from "./bun-patch-dismiss";

// Dismiss for 7 days (default)
dismissPatchRecommendation("rec_123");

// Dismiss for custom duration (24 hours)
dismissPatchRecommendation("rec_123", 24);
```

### Dismiss All for Package

```typescript
import { dismissPackageRecommendations } from "./bun-patch-dismiss";

// Dismiss all recommendations for "zod"
const dismissed = dismissPackageRecommendations("zod", 168); // 7 days
console.log(`Dismissed ${dismissed} recommendations`);
```

### Checking Active Status

```typescript
import { isRecommendationActive } from "./bun-patch-recommendations-log";

const entry = log.find(e => e.recommendationId === "rec_123");

if (isRecommendationActive(entry)) {
  console.log("Recommendation is active (not dismissed/applied)");
} else {
  console.log("Recommendation is inactive");
}
```

### Auto-Reactivation

When `dismissedUntil` expires, status automatically changes back to `"generated"`:

```typescript
// Entry with dismissedUntil in the past
{
  status: "dismissed",
  dismissedUntil: Date.now() - 1000, // Expired
}

// Next call to isRecommendationActive()
isRecommendationActive(entry)
// → Detects expiration
// → Changes status to "generated"
// → Removes dismissedUntil
// → Returns true
```

---

## 🔍 Feature 6: Auto-Sync

### When It Runs

`syncRecommendationStatuses()` is called automatically:

1. **At start of `getPatchRecommendations()`** - Syncs before generating new recommendations
2. **After patch commit** - Updates statuses when patch is committed

### What It Does

```typescript
export function syncRecommendationStatuses(): void {
  const entries = loadRecommendationsLog();
  
  for (const entry of entries) {
    if (entry.status === "generated") {
      // Check if patch was applied
      if (checkPatchApplied(entry.package)) {
        entry.status = "applied";
        entry.appliedTimestamp = Date.now();
      }
    }
  }
  
  saveRecommendationsLog(entries);
}
```

### Manual Sync

```typescript
import { syncRecommendationStatuses } from "./bun-patch-recommendations-log";

// Manually sync (useful after external patch application)
syncRecommendationStatuses();
```

---

## 📊 Complete Example Workflow

### Step 1: Generate Recommendations

```typescript
const recs = await getPatchRecommendations();
// → Creates log entries with status: "generated"
// → Returns active recommendations
```

### Step 2: User Reviews

```typescript
// User sees recommendation
const rec = recs[0];
console.log(`${rec.package}@${rec.version}: ${rec.reason}`);

// User decides to dismiss
dismissPatchRecommendation(rec.recommendationId, 168);
// → Status: "dismissed"
// → dismissedUntil: Date.now() + 7 days
```

### Step 3: User Applies Patch

```bash
bun patch zod@4.1.12
# ... edit ...
bun patch --commit zod@4.1.12
```

### Step 4: Auto-Detection

```typescript
// Next call to getPatchRecommendations()
const recs = await getPatchRecommendations();
// → syncRecommendationStatuses() runs
// → Detects patch in package.json
// → Updates status: "applied"
// → Sets appliedTimestamp
```

### Step 5: Measure Effectiveness

```typescript
// After observation window (24h default)
const before = 45.2; // CPU before patch
const after = 38.1;  // CPU after patch

recordEffectivenessMeasurement(rec.recommendationId, {
  metric: "cpu",
  before,
  after,
  // improvementPercent: 15.7% (calculated)
});

// If improvementPercent < -5%, status → "ineffective"
```

---

## 🛠️ CLI Integration (Future)

### Proposed Commands

```bash
# List recommendations
bun mcp list-recommendations [--status generated|applied|dismissed]

# Dismiss recommendation
bun mcp dismiss-patch <recommendationId> [--duration <hours>]

# Dismiss package
bun mcp dismiss-package <packageName> [--duration <hours>]

# Show effectiveness
bun mcp patch-effectiveness <recommendationId>

# Sync statuses manually
bun mcp sync-patch-statuses
```

---

## 📈 Metrics & Analytics

### Querying Log Data

```typescript
const log = loadRecommendationsLog();

// Success rate
const applied = log.filter(e => e.status === "applied");
const total = log.length;
const successRate = (applied.length / total) * 100;

// Average improvement
const effective = log.filter(e => 
  e.effectivenessData?.improvementPercent && 
  e.effectivenessData.improvementPercent > 0
);
const avgImprovement = effective.reduce((sum, e) => 
  sum + (e.effectivenessData?.improvementPercent || 0), 0
) / effective.length;

// Most recommended packages
const packageCounts = new Map<string, number>();
log.forEach(e => {
  packageCounts.set(e.package, (packageCounts.get(e.package) || 0) + 1);
});
const topPackages = Array.from(packageCounts.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);
```

---

## ✅ Summary

Phase 3 provides:

1. ✅ **Complete lifecycle tracking** - From generation to effectiveness
2. ✅ **Automatic status sync** - Detects applied patches automatically
3. ✅ **Effectiveness measurement** - Tracks before/after metrics
4. ✅ **Dismiss mechanism** - Temporary dismissal with auto-reactivation
5. ✅ **Persistent storage** - All data saved to `~/.forge/mcp-recommendations-log.json`
6. ✅ **Learning integration** - Feeds back into learned packages system

**The recommendation system is now fully self-managing and learning-enabled!** 🚀

