# MCP Patch Recommendation Enhancements

## 🎯 Overview

Enhanced the `getPatchRecommendations()` function with sophisticated extraction logic, version pinning, configurable thresholds, and a learning system.

---

## ✨ Key Enhancements

### 1. **Context-Aware Extraction** ✅

**Problem**: Previous extraction was too simple - could extract packages mentioned anywhere in docs, not just in patch contexts.

**Solution**: Enhanced `extractPackageNamesWithContext()` with:

- **Patch Context Detection**: Only extracts packages when found in patch-related contexts:
  - `bun patch <package>`
  - `patches/<package>.patch`
  - `patchedDependencies` in package.json
  - `node_modules/<package>` in patch context

- **Confidence Scoring**: Each match gets a confidence score (0-1) based on:
  - Context quality (direct patch command = 1.0, generic mention = 0.2)
  - Category keyword matching (cache/performance boost)
  - Version specificity (version specified = +10% confidence)

- **False Positive Filtering**: 
  - Excludes common false positives: "bun", "node", "npm", "package", "json", "ts", "js"
  - Validates package name length (configurable)
  - Requires minimum confidence threshold (0.3)

**Example**:
```typescript
// High confidence (1.0) - direct patch command
"bun patch zod@4.1.12" → { package: "zod", version: "4.1.12", confidence: 1.0 }

// Medium confidence (0.6) - package mention in patch context
"package: zod" (in patch doc) → { package: "zod", confidence: 0.6 }

// Low confidence (0.2) - generic mention
"package: zod" (not in patch context) → filtered out (below threshold)
```

---

### 2. **Version Pinning** ✅

**Problem**: Recommendations defaulted to "latest", but patches are often version-specific.

**Solution**: Extracts versions from documentation:

- **Version Extraction Patterns**:
  - `bun patch zod@4.1.12` → extracts `4.1.12`
  - `patches/zod@4.1.12.patch` → extracts `4.1.12`
  - `"patchedDependencies": { "zod@4.1.12": "..." }` → extracts `4.1.12`

- **Version Confidence**: Versions boost confidence (+10%) because they're more specific

- **Fallback**: If no version found, defaults to "latest"

**Example**:
```typescript
{
  package: "zod",
  version: "4.1.12", // Extracted from docs, not "latest"
  confidence: 1.0,
  source: "docs"
}
```

---

### 3. **Configurable Thresholds** ✅

**Problem**: Hard-coded thresholds (0.7, 0.6) weren't tunable.

**Solution**: Configuration file at `~/.forge/mcp-patch-config.json`:

```json
{
  "thresholds": {
    "searchPressureLimit": 0.7,        // When to search docs
    "cacheSearchPressureLimit": 0.6,    // When to search cache docs
    "performanceSearchPressureLimit": 0.6 // When to search perf docs
  },
  "extraction": {
    "minPackageLength": 2,
    "maxPackageLength": 50,
    "requirePatchContext": true,        // Only extract in patch context
    "versionExtractionEnabled": true
  },
  "learning": {
    "enabled": true,
    "minOccurrences": 3,                // Min times seen to suggest
    "decayFactor": 0.95                 // Decay old entries (30 days)
  }
}
```

**Usage**:
```typescript
const config = loadMCPPatchConfig();
if (pressure < config.thresholds.searchPressureLimit) {
  // Search docs
}
```

---

### 4. **Learning System** ✅

**Problem**: Generic fallbacks ("cache-library", "performance-critical-package") weren't learning from history.

**Solution**: Persistent learning system:

- **Learned Packages Storage**: `~/.forge/learned-packages.json`
  - Tracks package occurrences
  - Stores average performance impact
  - Categorizes by type (cache/performance/general)

- **Automatic Updates**: 
  - When package found in docs → increment occurrence
  - When patch analyzed → update performance impact
  - Decay old entries (30 days, configurable)

- **Smart Fallbacks**: 
  - Uses learned packages instead of generic names
  - Sorts by occurrences (most seen = highest priority)
  - Includes confidence based on occurrence count

**Example**:
```typescript
// After seeing "zod" 5 times in cache contexts:
{
  package: "zod",
  version: "latest",
  reason: "Low cache hit rate detected (learned from 5 occurrences)",
  urgency: "high",
  estimatedImpact: "Average 25.3% improvement",
  confidence: 0.5, // 5 occurrences / 10 = 0.5
  source: "learned"
}
```

---

### 5. **Enhanced Recommendation Structure** ✅

**Added Fields**:
- `confidence`: 0-1 score based on extraction quality
- `source`: "docs" | "learned" | "fallback"
- `version`: Can be specific version, range, or "latest"

**Example**:
```typescript
{
  package: "zod",
  version: "4.1.12",
  reason: "Found in Bun docs: Patching Dependencies",
  urgency: "medium",
  estimatedImpact: "Based on Bun documentation examples",
  confidence: 1.0,
  source: "docs"
}
```

---

## 📊 Comparison: Before vs After

| Feature | Before | After |
|---------|--------|-------|
| **Context Awareness** | ❌ Extracts any package mention | ✅ Only in patch contexts |
| **Version Pinning** | ❌ Always "latest" | ✅ Extracts from docs |
| **Confidence Scoring** | ❌ None | ✅ 0-1 based on context |
| **Thresholds** | ❌ Hard-coded | ✅ Configurable via JSON |
| **Learning** | ❌ Generic fallbacks | ✅ Learns from history |
| **False Positives** | ⚠️ Some | ✅ Filtered aggressively |
| **Category Matching** | ⚠️ Basic keyword match | ✅ Context-aware boost |

---

## 🔧 Configuration

### Default Config Location
`~/.forge/mcp-patch-config.json`

### Tuning Thresholds

**More Aggressive Search** (search even under higher pressure):
```json
{
  "thresholds": {
    "searchPressureLimit": 0.9,
    "cacheSearchPressureLimit": 0.8,
    "performanceSearchPressureLimit": 0.8
  }
}
```

**Stricter Extraction** (require patch context):
```json
{
  "extraction": {
    "requirePatchContext": true,
    "versionExtractionEnabled": true
  }
}
```

**Disable Learning**:
```json
{
  "learning": {
    "enabled": false
  }
}
```

---

## 📈 Learning System Details

### How It Works

1. **Discovery Phase**: When package found in docs → `updateLearnedPackage(pkg, category)`
2. **Analysis Phase**: When patch analyzed → `updateLearnedPackage(pkg, category, performanceImpact)`
3. **Recommendation Phase**: Uses learned packages for fallbacks

### Decay Mechanism

- Entries older than 30 days get decayed by `decayFactor` (default 0.95)
- Entries below `minOccurrences` (default 3) are removed
- Keeps learned packages relevant and up-to-date

### Performance Tracking

- Tracks average performance impact per package
- Used in `estimatedImpact` field
- Helps prioritize recommendations

---

## 🎯 Best Practices

1. **Tune Thresholds**: Adjust pressure limits based on your system's memory profile
2. **Enable Learning**: Let the system learn from your patch history
3. **Review Learned Packages**: Check `~/.forge/learned-packages.json` periodically
4. **Use Confidence Scores**: Filter recommendations by confidence (e.g., `confidence > 0.7`)
5. **Version Pinning**: Prefer recommendations with specific versions when available

---

## 📝 Example Usage

```typescript
// Get recommendations
const recs = await getPatchRecommendations();

// Filter by confidence
const highConfidence = recs.filter(r => (r.confidence || 0) > 0.7);

// Filter by source
const fromDocs = recs.filter(r => r.source === "docs");

// Filter by version specificity
const versionSpecific = recs.filter(r => r.version !== "latest");

// Use learned packages
const learned = recs.filter(r => r.source === "learned");
```

---

## ✅ Summary

The enhanced system now:

1. ✅ **Extracts intelligently** - Only packages in patch contexts
2. ✅ **Pins versions** - Extracts specific versions from docs
3. ✅ **Scores confidence** - 0-1 based on context quality
4. ✅ **Configures thresholds** - Tunable via JSON config
5. ✅ **Learns over time** - Improves recommendations from history
6. ✅ **Filters false positives** - Aggressive filtering of invalid packages
7. ✅ **Tracks performance** - Learns which patches work best

**Result**: Much more intelligent, precise, and self-improving patch recommendations! 🚀

