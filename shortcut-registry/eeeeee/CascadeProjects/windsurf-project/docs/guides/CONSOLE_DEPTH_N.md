# --console-depth <N> Comprehensive Guide

## Overview
The `--console-depth <N>` flag in Bun controls how deeply nested objects are displayed in `console.log()` output, where `<N>` is the maximum depth level to display.

## Syntax
```bash
bun --console-depth <N> run <script.js>
```

## Depth Levels (N Values)

### N = 0: No Expansion
```bash
bun --console-depth 0 run script.js
```
- **Behavior**: Objects show as `[Object]` with no expansion
- **Use Case**: Minimal output, quick summaries
- **Output**: `{ key: [Object], another: [Object] }`

### N = 1: Shallow View
```bash
bun --console-depth 1 run script.js
```
- **Behavior**: Only top-level properties visible
- **Use Case**: Quick structure overview
- **Output**: 
```javascript
{
  level1: [Object ...],
  topLevel: "visible value"
}
```

### N = 2: Default Behavior
```bash
bun --console-depth 2 run script.js
```
- **Behavior**: Bun's default depth setting
- **Use Case**: Standard debugging and development
- **Output**:
```javascript
{
  level1: {
    level2: [Object ...],
    sibling: "visible"
  },
  topLevel: "visible value"
}
```

### N = 3-4: Complex Configurations
```bash
bun --console-depth 4 run script.js
```
- **Behavior**: Good for complex configuration objects
- **Use Case**: Matrix configuration, network metrics
- **Output**:
```javascript
{
  level1: {
    level2: {
      level3: {
        level4: "deep value",
        config: { detailed: true }
      }
    }
  }
}
```

### N = 5-7: Deep Debugging
```bash
bun --console-depth 7 run script.js
```
- **Behavior**: Deep inspection for complex debugging
- **Use Case**: API responses, error objects, performance data
- **Output**: Shows deeply nested structures with full detail

### N = 8-10: Maximum Inspection
```bash
bun --console-depth 10 run script.js
```
- **Behavior**: Maximum depth, very verbose output
- **Use Case**: Complete analysis, complex configuration inspection
- **Output**: All levels fully visible, no truncation

## Practical Examples

### 1. Fraud Detection Configuration
```bash
# Matrix configuration (depth 4)
bun --console-depth 4 run cli/risk-hunter.ts matrix

# Network metrics (depth 3)
bun --console-depth 3 run cli/risk-hunter.ts network

# Analysis results (depth 5)
bun --console-depth 5 run cli/risk-hunter.ts analyze
```

### 2. Complex Object Inspection
```javascript
const fraudConfig = {
  models: {
    ensemble: {
      gradientBoosting: {
        hyperparameters: {
          learningRate: {
            adaptive: {
              scheduler: {
                decay: {
                  exponential: {
                    rate: 0.95,
                    metadata: { /* deep config */ }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
```

### 3. Depth Comparison
```bash
# Different depths of same object:
bun --console-depth 1 run config-demo.js    # Shallow
bun --console-depth 4 run config-demo.js    # Detailed
bun --console-depth 10 run config-demo.js   # Complete
```

## Package.json Scripts

```json
{
  "demo:depth-0": "bun --console-depth 0 run console-depth-demo.js",
  "demo:depth-1": "bun --console-depth 1 run console-depth-demo.js",
  "demo:depth-2": "bun --console-depth 2 run console-depth-demo.js",
  "demo:depth-3": "bun --console-depth 3 run console-depth-demo.js",
  "demo:depth-4": "bun --console-depth 4 run console-depth-demo.js",
  "demo:depth-5": "bun --console-depth 5 run console-depth-demo.js",
  "demo:depth-7": "bun --console-depth 7 run console-depth-demo.js",
  "demo:depth-10": "bun --console-depth 10 run console-depth-demo.js",
  "demo:depth-all": "./test-depths.sh"
}
```

## Performance Considerations

### Memory Usage
- **Lower depths (0-2)**: Minimal memory usage
- **Medium depths (3-5)**: Moderate memory usage
- **High depths (6-10)**: Higher memory usage

### Output Size
- **Depth 0-2**: Compact output
- **Depth 3-5**: Moderate output size
- **Depth 6-10**: Very verbose output

### Processing Time
- **All depths**: Minimal impact on processing time
- **Higher depths**: Slightly slower due to more data processing

## Best Practices

### Choose Depth Based on Use Case:
1. **Quick Overview**: Depth 1-2
2. **Development**: Depth 2-3 (default)
3. **Configuration**: Depth 3-4
4. **Debugging**: Depth 5-7
5. **Analysis**: Depth 8-10

### CLI Integration:
```bash
# Standard operations
bun run cli:analyze      # Uses optimized depth 5
bun run cli:matrix       # Uses optimized depth 4
bun run cli:network      # Uses optimized depth 3

# Custom depth
bun --console-depth 6 run custom-script.js
```

### File Output:
```bash
# Redirect verbose output to file
bun --console-depth 10 run deep-analysis.js > output.txt
```

## Advanced Usage

### Environment Variables:
```bash
# Set default depth
export BUN_CONSOLE_DEPTH=4
bun run script.js
```

### Combined Flags:
```bash
# Multiple flags together
bun --console-depth 5 --smol run complex-script.js
```

### Table Integration:
```javascript
// console.table() respects console-depth settings
console.table(complexData); // Shows data at current depth
```

## Troubleshooting

### Common Issues:
1. **Too much output**: Use lower depth values
2. **Not enough detail**: Increase depth value
3. **Performance issues**: Use moderate depths (3-5)

### Solutions:
```bash
# For too much output
bun --console-depth 2 run script.js | head -20

# For more detail
bun --console-depth 7 run script.js

# For file analysis
bun --console-depth 10 run script.js > analysis.txt
```

## Summary Table

| N Value | Description | Use Case | Output Size |
|---------|-------------|----------|-------------|
| 0 | No expansion | Quick summaries | Minimal |
| 1 | Shallow | Structure overview | Small |
| 2 | Default | Standard development | Medium |
| 3-4 | Complex | Configuration analysis | Large |
| 5-7 | Deep | Debugging complex objects | Very Large |
| 8-10 | Maximum | Complete inspection | Extremely Large |

The `--console-depth <N>` flag provides flexible control over object inspection, making it ideal for everything from quick debugging to deep analysis of complex fraud detection systems.
