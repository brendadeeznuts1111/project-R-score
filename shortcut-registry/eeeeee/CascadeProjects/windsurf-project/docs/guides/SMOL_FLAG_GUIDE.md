# --smol Flag Comprehensive Guide

## Overview
The `--smol` flag in Bun optimizes memory usage by running garbage collection more frequently, making it ideal for memory-constrained environments, CI/CD pipelines, and testing scenarios.

## Syntax
```bash
bun --smol run <script.tsx>
bun --smol build <input.tsx>
bun --smol test
```

## Key Benefits

### 1. **Reduced Memory Footprint**
- More frequent garbage collection
- Lower peak memory usage
- Better performance on limited memory systems

### 2. **Optimized for CI/CD**
- Reduced resource consumption in pipelines
- Faster cleanup between test runs
- Better container performance

### 3. **Development & Testing**
- Memory-efficient development server
- Optimized test execution
- Reduced memory leaks during long-running processes

## Practical Examples

### 1. TypeScript/TSX Development
```bash
# Memory-optimized development
bun --smol run index.tsx

# Efficient development server
bun --smol --hot run dev-server.tsx

# Watch mode with memory optimization
bun --smol --watch run build.tsx
```

### 2. Building Projects
```bash
# Memory-efficient builds
bun --smol build index.tsx --outfile dist.js

# Optimized production builds
bun --smol --minify build app.tsx

# Large project builds
bun --smol build --target bun src/**/*.tsx
```

### 3. Testing
```bash
# Memory-optimized test runs
bun --smol test

# Test with coverage (memory efficient)
bun --smol test --coverage

# Watch mode testing
bun --smol test --watch
```

### 4. CLI Tools
```bash
# Memory-efficient CLI execution
bun --smol run cli/risk-hunter.ts matrix

# Optimized server startup
bun --smol run server.ts

# Batch processing with memory optimization
bun --smol run batch-processor.tsx
```

## Performance Comparison

### Memory Usage
```javascript
// Example: Large dataset processing
const largeData = new Array(100000).fill(0).map((_, i) => ({
  id: i,
  data: `item_${i}`,
  metadata: { /* complex object */ }
}));
```

| Execution Mode | Peak Memory | GC Frequency | Best Use Case |
|----------------|-------------|--------------|--------------|
| Normal | High | Standard | Development |
| --smol | Reduced | Frequent | CI/CD, Testing |
| --smol + --hot | Optimized | Very Frequent | Development Server |

## Package.json Integration

```json
{
  "scripts": {
    "dev": "bun run cli/risk-hunter.ts",
    "dev:smol": "bun --smol run cli/risk-hunter.ts",
    "build": "bun build cli/risk-hunter.ts --outfile dist/index.js",
    "build:smol": "bun --smol build cli/risk-hunter.ts --outfile dist/index.js",
    "test": "bun test",
    "test:smol": "bun --smol test",
    "server": "bun run ai/anomaly-predict.ts",
    "server:smol": "bun --smol run ai/anomaly-predict.ts"
  }
}
```

## Advanced Usage

### 1. Combined Flags
```bash
# Memory optimization with console depth control
bun --smol --console-depth 3 run complex-script.tsx

# Memory-efficient development with hot reload
bun --smol --hot --watch run dev-server.tsx

# Optimized testing with coverage
bun --smol test --coverage --watch
```

### 2. Environment Integration
```bash
# Docker containers
docker run --memory=512m bun --smol run app.tsx

# CI/CD pipelines
- name: Run tests
  run: bun --smol test --coverage

# GitHub Actions
- uses: oven-sh/setup-bun@v1
- run: bun --smol run build.tsx
```

### 3. Performance Monitoring
```javascript
// Monitor memory usage with --smol
const monitorMemory = () => {
  const used = process.memoryUsage();
  console.log(`Memory: ${Math.round(used.rss / 1024 / 1024)}MB`);
};

setInterval(monitorMemory, 1000);
```

## Fraud Detection System Integration

### 1. Model Training
```bash
# Memory-efficient model training
bun --smol run ai/model-trainer.tsx

# Large dataset processing
bun --smol run ai/data-processor.tsx --batch-size 1000
```

### 2. Real-time Analysis
```bash
# Optimized real-time fraud detection
bun --smol run ai/real-time-analyzer.tsx

# Network metrics processing
bun --smol run ai/network-processor.tsx
```

### 3. Batch Processing
```bash
# Large batch processing with memory optimization
bun --smol run cli/batch-analyzer.tsx --input large-dataset.json

# Report generation
bun --smol run cli/report-generator.tsx --format detailed
```

## Best Practices

### 1. When to Use --smol
- **CI/CD Pipelines**: Reduced resource consumption
- **Testing Environments**: Better memory management
- **Memory-Constrained Systems**: Limited RAM availability
- **Large Dataset Processing**: Prevents memory overflow
- **Long-Running Processes**: Reduces memory leaks

### 2. When NOT to Use --smol
- **Performance-Critical Applications**: GC overhead may impact speed
- **Production Servers**: Use standard mode for optimal performance
- **Memory-Abundant Environments**: No benefit when memory is plentiful
- **Real-Time Systems**: Frequent GC may cause pauses

### 3. Optimization Tips
```bash
# Combine with other optimization flags
bun --smol --production build app.tsx
bun --smol --minify --target bun build src/**/*.tsx

# Use with environment variables
NODE_OPTIONS="--max-old-space-size=512" bun --smol run app.tsx

# Monitor memory usage
bun --smol --expose-gc run memory-monitor.tsx
```

## Troubleshooting

### Common Issues
1. **Slower Execution**: --smol may be slower due to frequent GC
2. **Frequent Pauses**: Garbage collection causes brief pauses
3. **Development Experience**: Hot reload may be slightly slower

### Solutions
```bash
# Use standard mode for performance-critical tasks
bun run production-server.tsx

# Combine with --hot for better development experience
bun --smol --hot run dev-server.tsx

# Monitor and adjust memory limits
NODE_OPTIONS="--max-old-space-size=1024" bun --smol run app.tsx
```

## Performance Metrics

### Memory Usage Example
```javascript
// Test script for memory comparison
const createLargeData = () => {
  return new Array(50000).fill(0).map((_, i) => ({
    id: i,
    data: new Array(100).fill(0).map(j => `value_${i}_${j}`),
    timestamp: Date.now()
  }));
};

console.log("Creating large dataset...");
const data = createLargeData();
console.log(`Created ${data.length} items`);
```

### Expected Results
- **Normal Mode**: ~200-300MB peak memory
- **--smol Mode**: ~150-200MB peak memory
- **GC Frequency**: 2-3x more frequent with --smol

## Integration Examples

### 1. Docker Integration
```dockerfile
FROM oven/bun:latest
COPY . .
RUN bun --smol install
CMD ["bun", "--smol", "run", "index.tsx"]
```

### 2. GitHub Actions
```yaml
- name: Run Memory-Optimized Tests
  run: |
    bun --smol install
    bun --smol test --coverage
    bun --smol run build.tsx
```

### 3. CI/CD Pipeline
```bash
#!/bin/bash
# Memory-optimized CI script
bun --smol install
bun --smol run lint
bun --smol test
bun --smol run build
bun --smol run deploy
```

## Summary

The `--smol` flag is a powerful optimization for:
- ✅ **Memory-constrained environments**
- ✅ **CI/CD pipelines**
- ✅ **Testing scenarios**
- ✅ **Large dataset processing**
- ✅ **Development on limited resources**

Use it when memory efficiency is more important than raw execution speed, and combine it with other Bun flags for optimal performance in your specific use case.
