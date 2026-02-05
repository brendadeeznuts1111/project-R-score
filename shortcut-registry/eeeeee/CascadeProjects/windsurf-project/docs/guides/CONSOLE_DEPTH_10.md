# Console Depth 10 Demonstration

## Maximum Depth Inspection

The `--console-depth 10` flag provides the deepest level of object inspection in Bun, allowing you to see deeply nested structures in their entirety.

## Example Usage

### Command
```bash
bun --console-depth 10 run deep-demo.js
```

### Expected Output Structure
```javascript
{
  level1: {
    level2: {
      level3: {
        level4: {
          level5: {
            level6: {
              level7: {
                level8: {
                  level9: {
                    level10: {
                      value: "Deep nested value at level 10",
                      metadata: {
                        created: "2024-01-21T17:00:00.000Z",
                        type: "deep_object_demo",
                        config: {
                          enabled: true,
                          priority: "high",
                          settings: {
                            threshold: 0.95,
                            timeout: 5000,
                            features: {
                              root_detected: { weight: 0.28, active: true },
                              vpn_active: { weight: 0.22, active: true },
                              thermal_spike: { weight: 0.15, active: false }
                            }
                          }
                        }
                      }
                    }
                  },
                  level9Sibling: "Level 9 sibling value"
                },
                level8Sibling: "Level 8 sibling value"
              },
              level7Sibling: "Level 7 sibling value"
            },
            level6Sibling: "Level 6 sibling value"
          },
          level5Sibling: "Level 5 sibling value"
        },
        level4Sibling: "Level 4 sibling value"
      },
      level3Sibling: "Level 3 sibling value"
    },
    level2Sibling: "Level 2 sibling value"
  },
  level1Sibling: "Level 1 sibling value"
}
```

## Comparison with Other Depths

### Depth 1 (Shallow)
```javascript
{
  level1: [Object ...]  // Everything truncated
}
```

### Depth 2 (Default)
```javascript
{
  level1: {
    level2: [Object ...]  // Truncated at level 2
  },
}
```

### Depth 4 (Medium)
```javascript
{
  level1: {
    level2: {
      level3: {
        level4: [Object ...]  // Truncated at level 4
      }
    }
  }
}
```

### Depth 10 (Maximum)
```javascript
{
  level1: {
    level2: {
      level3: {
        level4: {
          level5: {
            level6: {
              level7: {
                level8: {
                  level9: {
                    level10: {
                      value: "Deep nested value at level 10",  // Fully visible
                      metadata: { ... }  // All nested properties visible
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## Practical Applications

### 1. Complex Configuration Analysis
```bash
bun --console-depth 10 run cli/risk-hunter.ts matrix
```
- Full visibility into matrix configuration
- Complete feature property inspection
- Detailed ensemble model settings

### 2. Deep Debugging
```bash
bun --console-depth 10 run debug-complex-objects.js
```
- Inspect complex API responses
- Analyze nested error objects
- Debug deep data structures

### 3. Performance Analysis
```bash
bun --console-depth 10 run performance-metrics.js
```
- Complete performance breakdown
- Detailed timing information
- Full resource utilization data

## Package.json Scripts

```json
{
  "demo:depth-10": "bun --console-depth 10 run deep-demo.js",
  "demo:depth-comparison": "Complete comparison of all depth levels"
}
```

## Best Practices

### When to Use Depth 10
- **Complex Configuration**: Deep nested config objects
- **Detailed Debugging**: Complex data structure analysis
- **Performance Profiling**: Complete performance metrics
- **API Response Analysis**: Deeply nested API data

### Performance Considerations
- **Memory Usage**: Higher depth uses more memory
- **Output Size**: Can produce very verbose output
- **Processing Time**: Slightly slower processing
- **Terminal Buffer**: May require larger terminal buffer

### Recommendations
- Use depth 10 sparingly for specific debugging needs
- Consider redirecting output to file for very deep objects
- Use lower depths (3-5) for routine development
- Reserve depth 10 for complex configuration analysis

## Integration with CLI Tools

The enhanced fraud detection CLI uses depth 10 for:
- **Matrix Configuration**: Complete feature analysis
- **Network Metrics**: Detailed performance breakdown
- **External API Data**: Full intelligence integration
- **Model Configuration**: Comprehensive settings display

This maximum depth capability ensures complete visibility into even the most complex nested data structures in enterprise fraud detection systems.
