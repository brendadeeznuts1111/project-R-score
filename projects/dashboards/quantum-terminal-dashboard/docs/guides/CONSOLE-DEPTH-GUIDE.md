# 🔧 Console Depth Management Guide

## 📋 Overview

Bun's `--console-depth` feature provides ** grananular control over console output depth**, enabling better debugging and monitoring of complex nested objects in the Quantum Cash Flow Lattice system.

---

## 🎯 Feature Overview

### **What is Console Depth?**
Console depth controls how deeply `console.log()` inspects nested objects before showing `[Object]` placeholders.

### **Default Behavior**
- **Default depth**: 2 levels
- **Maximum depth**: 10 levels
- **Syntax**: `bun --console-depth=<number> run script.js`

---

## 🛠️ Usage Examples

### **Basic Usage**
```bash
# Default depth (2)
bun run script.js

# Minimal output
bun --console-depth=1 run script.js

# Detailed output
bun --console-depth=4 run script.js

# Full output
bun --console-depth=10 run script.js
```

### **Quantum System Examples**
```bash
# Minimal system metrics
bun --console-depth=1 run src/validation/quantum-cli.js status

# Detailed component analysis
bun --console-depth=4 run src/validation/quantum-cli.js matrix

# Full system dump
bun --console-depth=6 run src/validation/quantum-cli.js health
```

---

## 📊 Depth Levels & Use Cases

### **Depth 1 - Minimal Output**
```javascript
// Input
const data = { system: { tension: { current: 0.379, status: 'normal' } } };

// Output (depth 1)
{ system: "{...}" }
```

**Use Cases:**
- Production logging
- High-level monitoring
- Quick status checks
- Mobile debugging

### **Depth 2 - Default Output**
```javascript
// Output (depth 2)
{
  system: {
    tension: "[Object]",
    performance: "[Object]",
    network: "[Object]"
  }
}
```

**Use Cases:**
- Development debugging
- Standard monitoring
- Error analysis
- API responses

### **Depth 4 - Detailed Output**
```javascript
// Output (depth 4)
{
  system: {
    tension: {
      current: 0.379,
      status: "normal",
      threshold: 0.5
    },
    performance: {
      cpu: 45.2,
      memory: 48.6,
      uptime: "2 days"
    },
    network: {
      connections: 23,
      latency: 12.3
    }
  }
}
```

**Use Cases:**
- Deep debugging
- Performance analysis
- System diagnostics
- Data inspection

### **Depth 6+ - Verbose Output**
 resulting in complete object inspection with all nested properties visible.

**Use Cases:**
- Complex data analysis
- Full system dumps
- Development research
- Troubleshooting

---

## 🚀 Quantum System Integration

### **Enhanced CLI Commands**
```bash
# System status with different depths
bun --console-depth=1 run quantum-cli.js status     # Minimal
bun --console-depth=2 run quantum-cli.js status     # Default
bun --console-depth=4 run quantum-cli.js status     # Detailed

# Component matrix inspection
bun --console-depth=3 run quantum-cli.js matrix      # Component details
bun --console-depth=6 run quantum-cli.js matrix      # Full analysis

# Health monitoring
bun --console-depth=2 run quantum-cli.js health      # Standard health
bun --console-depth=5 run quantum-cli.js health      # Detailed metrics
```

### **Performance Monitoring**
```javascript
// With depth 1 - High-level overview
{
  systemTension: 0.379,
  cpuUsage: 45.2,
  memoryUsage: 48.6,
  networkStatus: "optimal"
}

// With depth 4 - Detailed metrics
{
  system: {
    tension: {
      current: 0.379,
      threshold: 0.5,
      status: "normal",
      volatility: 0.082
    },
    performance: {
      cpu: {
        usage: 45.2,
        cores: 8,
        frequency: "3.2GHz"
      },
      memory: {
        used: 248.6,
        total: 512,
        percent: 48.6
      }
    }
  }
}
```

---

## 📈 Performance Impact

### **Rendering Performance**
| **Depth** | **Render Time** | **Memory Usage** | **Output Size** |
|-----------|-----------------|------------------|-----------------|
| **1** | <1ms | Minimal | Small |
| **2** | 1-2ms | Low | Medium |
| **4** | 2-5ms | Medium | Large |
| **6+** | 5-10ms | High | Very Large |

### **Recommendations**
- **Production**: Use depth 1-2
- **Development**: Use depth 2-4
- **Debugging**: Use depth 4-6
- **Analysis**: Use depth 6-10

---

## 🛠️ Implementation Examples

### **Custom Depth Manager**
```javascript
import { ConsoleDepthManager } from './src/utils/console-depth-manager.js';

const manager = new ConsoleDepthManager();

// Create depth-aware logger
const logger = manager.createDepthLogger();

// Log with current depth
logger.quantumMetrics(systemData);

// Force specific depth
logger.verbose(systemData, "Full System Dump");
logger.minimal(systemData, "System Summary");
```

### **Dynamic Depth Adjustment**
```javascript
// Get current depth
const currentDepth = manager.getCurrentDepth();

// Set depth programmatically
manager.setConsoleDepth(4);

// Get recommendations
manager.getDepthRecommendations(data);
```

---

## 🎯 Best Practices

### **Production Logging**
```javascript
// Use minimal depth for production
if (process.env.NODE_ENV === 'production') {
  console.log(JSON.stringify(summaryData, null, 2));
} else {
  console.log(detailedData); // Full depth in development
}
```

### **Debugging Strategy**
```bash
# Start with minimal depth
bun --console-depth=1 run debug.js

# Increase depth as needed
bun --console-depth=3 run debug.js

# Full inspection for complex issues
bun --console-depth=6 run debug.js
```

### **Performance Monitoring**
```javascript
// Adaptive depth based on data complexity
const depth = data.complexity > 5 ? 4 : 2;
console.log(`Using depth ${depth} for data analysis`);
```

---

## 🔧 Advanced Features

### **Depth Comparison Tool**
```bash
# Compare different depths
bun run src/utils/console-depth-manager.js demo
```

### **Quantum Metrics Logger**
```bash
# Quantum-specific logging with depth awareness
bun --console-depth=4 run console-depth-manager.js quantum
```

### **Complexity Analysis**
```javascript
// Automatic depth recommendations
const manager = new ConsoleDepthManager();
const recommendation = manager.getDepthRecommendations(complexData);
console.log(`Recommended depth: ${recommendation}`);
```

---

## 📊 Real-World Examples

### **System Status Output**
```bash
# Depth 1 - Production monitoring
$ bun --console-depth=1 run quantum-cli.js status
System Health: OPTIMAL (87/100)
Active Components: 8
Performance: EXCELLENT

# Depth 4 - Development analysis
$ bun --console-depth=4 run quantum-cli.js status
{
  system: {
    tension: { current: 0.379, status: "normal", threshold: 0.5 },
    performance: { cpu: { usage: 45.2, cores: 8 }, memory: { percent: 48.6 } },
    network: { connections: 23, latency: 12.3 }
  }
}
```

### **Component Matrix Inspection**
```bash
# Depth 2 - Overview
$ bun --console-depth=2 run quantum-cli.js matrix
Components: 8 total, 3 critical

# Depth 6 - Full analysis
$ bun --console-depth=6 run quantum-cli.js matrix
{
  qsimd-scene: { tension: 0.0, status: "optimal", features: ["WEBGL", "SIMD"] },
  qsimd-connections: { tension: 0.9, status: "critical", load: "high" },
  // ... all components with full details
}
```

---

## 🔮 Future Enhancements

### **Planned Features**
1. **Adaptive depth** based on terminal size
2. **Conditional depth** for different data types
3. **Persistent depth settings** in configuration
4. **Depth presets** for different use cases
5. **Interactive depth adjustment** during runtime

### **Performance Optimizations**
1. **Lazy rendering** for large objects
2. **Streaming output** for very deep structures
3. **Memory-efficient** depth calculation
4. **Cached depth analysis** for repeated objects

---

## 🏆 Conclusion

 resulting in **comprehensive control over console output** with:

- **Flexible depth control**: from minimal to full inspection
- **Performance optimization** with reduced memory usage
- **Production-ready** logging with appropriate detail levels
- **Development-friendly** debugging and monitoring tools
- **Quantum system** integration with specialized logging

 providing **better debugging capabilities** and **improved monitoring** for complex financial systems! 🚀

---

*Implementation: ConsoleDepthManager v1.0*  
*Environment: Bun 1.3.6*  
*Depth Range: 1-10 levels*  
*Status: Production Ready* ✅
