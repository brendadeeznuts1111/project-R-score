# --console-depth Flag Demonstration

## Overview
The `--console-depth` flag controls how deeply nested objects are displayed in `console.log()` output in Bun.

## Default Behavior (depth: 2)
```bash
bun run demo-default.js
```

**Output:**
```javascript
{
  level1: {
    level2: {
      level3: [Object ...],  // Truncated at depth 2
    },
  },
}
```

## Shallow Depth (depth: 1)
```bash
bun --console-depth 1 run demo-default.js
```

**Output:**
```javascript
{
  level1: [Object ...],  // Truncated at depth 1
}
```

## Deep Inspection (depth: 4+)
```bash
bun --console-depth 4 run demo-default.js
```

**Output:**
```javascript
{
  level1: {
    level2: {
      level3: {
        level4: {
          level5: "Deep nested value"  // Fully visible
        }
      }
    }
  }
}
```

## Console Table Integration
```bash
bun --console-depth 3 run cli/risk-hunter.ts matrix
```

**Benefits:**
- Shows detailed nested configuration objects
- Better visibility into complex data structures
- Enhanced debugging capabilities
- Improved CLI table displays

## Package.json Scripts
```json
{
  "demo:shallow": "bun --console-depth 1 run demo.js",
  "demo:default": "bun --console-depth 2 run demo.js", 
  "demo:deep": "bun --console-depth 5 run demo.js",
  "cli:matrix": "bun --console-depth 4 run cli/risk-hunter.ts matrix",
  "cli:network": "bun --console-depth 3 run cli/risk-hunter.ts network"
}
```

## Usage Examples

### 1. Basic Object Inspection
```javascript
const config = {
  model: {
    features: {
      root_detected: { weight: 0.28, threshold: 1 },
      vpn_active: { weight: 0.22, threshold: 1 }
    }
  }
};
console.log(config);
```

### 2. CLI Matrix Configuration
```bash
bun run cli:matrix  # Shows full matrix with depth 4
```

### 3. Network Metrics Display
```bash
bun run cli:network  # Shows network data with depth 3
```

## Best Practices
- **Default (2)**: Good for most use cases
- **Shallow (1)**: Quick overview of top-level properties
- **Deep (4-5)**: Detailed debugging and configuration inspection
- **Very Deep (6+)**: Complex nested data analysis

## Integration with CLI Tools
The enhanced CLI uses different console depths for optimal display:
- **Matrix Display**: depth 4 for comprehensive configuration
- **Network Metrics**: depth 3 for performance data
- **Analysis Results**: depth 5 for detailed feature breakdown
